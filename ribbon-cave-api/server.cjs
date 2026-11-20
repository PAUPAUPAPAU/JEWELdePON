'use strict';
const http=require('node:http'),crypto=require('node:crypto');
const ORIGIN=process.env.ALLOWED_ORIGIN||'https://ribbon-cave.onrender.com';
const MODES=new Set(['easy','normal','hard']);
const SCHEMA=`CREATE TABLE IF NOT EXISTS rc_runs (
 id uuid PRIMARY KEY, token_hash text NOT NULL, difficulty text NOT NULL,
 seed bigint NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), submitted boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS rc_scores (
 id bigserial PRIMARY KEY, run_id uuid UNIQUE NOT NULL REFERENCES rc_runs(id),
 player_name varchar(24) NOT NULL, difficulty text NOT NULL CHECK(difficulty IN ('easy','normal','hard')),
 score bigint NOT NULL CHECK(score>=0), area integer NOT NULL CHECK(area>=1), area_name varchar(48) NOT NULL,
 is_auto boolean NOT NULL DEFAULT false CHECK(is_auto=false), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rc_scores_top ON rc_scores(difficulty,score DESC,area DESC);`;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function json(res,status,value,origin){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'}:{})});res.end(JSON.stringify(value))}
async function body(req){let n=0,chunks=[];for await(const part of req){n+=part.length;if(n>4096)throw Error('BODY_LIMIT');chunks.push(part)}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}
function createHandler(pool){
 let ready;
 const initialize=()=>ready||(ready=pool.query(SCHEMA).catch(e=>{ready=null;throw e}));
 const rates=new Map();
 return async(req,res)=>{
  const origin=req.headers.origin,url=new URL(req.url,'http://local');
  if(req.method==='OPTIONS'){if(origin!==ORIGIN)return json(res,403,{error:'ORIGIN'},origin);res.writeHead(204,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});res.end();return}
  if(req.method==='GET'&&url.pathname==='/health'){try{if(!pool)throw Error('DATABASE');await initialize();return json(res,200,{ok:true},origin)}catch{return json(res,503,{ok:false,error:'DATABASE_NOT_READY'},origin)}}
  if(!pool)return json(res,503,{error:'DATABASE_NOT_READY'},origin);
  try{
   await initialize();
   if(req.method==='GET'&&url.pathname==='/rankings'){
    const difficulty=url.searchParams.get('difficulty')||'normal';if(!MODES.has(difficulty))return json(res,400,{error:'DIFFICULTY'},origin);
    const r=await pool.query('SELECT player_name,score,area,area_name,created_at FROM rc_scores WHERE difficulty=$1 AND is_auto=false ORDER BY score DESC,area DESC,created_at ASC LIMIT 50',[difficulty]);
    return json(res,200,{difficulty,entries:r.rows.map(row=>({...row,score:Number(row.score)}))},origin);
   }
   if(req.method!=='POST'||!['/runs','/scores'].includes(url.pathname))return json(res,404,{error:'NOT_FOUND'},origin);
   if(origin!==ORIGIN)return json(res,403,{error:'ORIGIN'},origin);
   const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',')[0],minute=Math.floor(Date.now()/60000),key=ip+minute;
   rates.set(key,(rates.get(key)||0)+1);if(rates.size>1000)for(const k of rates.keys())if(!k.endsWith(String(minute)))rates.delete(k);
   if(rates.get(key)>30)return json(res,429,{error:'RATE_LIMIT'},origin);
   const b=await body(req);
   if(b.auto===true||b.custom===true)return json(res,400,{error:'MANUAL_DEFAULT_ONLY'},origin);
   if(url.pathname==='/runs'){
    if(!MODES.has(b.difficulty)||!Number.isInteger(b.seed)||b.seed<0||b.seed>4294967295)return json(res,400,{error:'RUN_DATA'},origin);
    const id=crypto.randomUUID(),token=crypto.randomBytes(24).toString('hex');
    const now=Date.now(),startedAt=Number.isFinite(b.startedAt)?new Date(Math.max(now-120000,Math.min(now,b.startedAt))):new Date(now);
    await pool.query('INSERT INTO rc_runs(id,token_hash,difficulty,seed,started_at) VALUES($1,$2,$3,$4,$5)',[id,hash(token),b.difficulty,b.seed,startedAt]);
    return json(res,201,{id,token},origin);
   }
   if(typeof b.id!=='string'||! /^[0-9a-f-]{36}$/i.test(b.id)||typeof b.token!=='string'||b.token.length!==48||!Number.isSafeInteger(b.distance)||b.distance<0||b.distance>1e9)return json(res,400,{error:'SCORE_DATA'},origin);
   const player=String(b.name||'PLAYER').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24)||'PLAYER';
   const area=Math.floor((b.distance+140)/2400)+1,score=Math.floor(b.distance/10);
   if(typeof b.areaName!=='string'||b.areaName.length<1||b.areaName.length>48)return json(res,400,{error:'AREA_DATA'},origin);
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    const r=await client.query('SELECT * FROM rc_runs WHERE id=$1 FOR UPDATE',[b.id]),run=r.rows[0];
    if(!run||run.token_hash!==hash(b.token)){await client.query('ROLLBACK');return json(res,403,{error:'RUN_TOKEN'},origin)}
    if(run.submitted){await client.query('ROLLBACK');return json(res,409,{error:'ALREADY_SAVED'},origin)}
    const seconds=Math.max(1,(Date.now()-new Date(run.started_at).getTime())/1000),rate=run.difficulty==='hard'?.05:.03,base=run.difficulty==='hard'?260:run.difficulty==='normal'?200:170;
    // Validate a conservative travel-time bound; scores and area numbers are computed here.
    const currentSpeed=base*(run.difficulty==='easy'?1:Math.pow(1+rate,Math.floor((area-1)/5)));
    if(b.distance>seconds*currentSpeed+currentSpeed*3+640){await client.query('ROLLBACK');return json(res,400,{error:'TRAVEL_TIME'},origin)}
    await client.query('INSERT INTO rc_scores(run_id,player_name,difficulty,score,area,area_name,is_auto) VALUES($1,$2,$3,$4,$5,$6,false)',[b.id,player,run.difficulty,score,area,b.areaName]);
    await client.query('UPDATE rc_runs SET submitted=true WHERE id=$1',[b.id]);await client.query('COMMIT');
    return json(res,201,{ok:true,score,area},origin);
   }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release()}
  }catch(e){if(e instanceof SyntaxError||e.message==='BODY_LIMIT')return json(res,400,{error:'INVALID_REQUEST'},origin);console.error('Ranking request failed:',e.code||e.name);return json(res,503,{error:'TEMPORARILY_UNAVAILABLE'},origin)}
 };
}
if(require.main===module){let pool=null;if(process.env.DATABASE_URL){const {Pool}=require('pg');pool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000,idleTimeoutMillis:10000})}const server=http.createServer(createHandler(pool));server.listen(Number(process.env.PORT||8080),'0.0.0.0');process.on('SIGTERM',()=>server.close(()=>{pool?.end().finally(()=>process.exit(0))||process.exit(0)}))}
module.exports={createHandler,SCHEMA};
