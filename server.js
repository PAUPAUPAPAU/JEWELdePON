const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const HTML_FILE = path.join(ROOT, 'jewel_de_pon_v0.9.22_render_ready.html');
const AUDIO_STORE = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio_base64.json'), 'utf8'));

const rooms = new Map();
const clients = new Map();
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS || 6 * 60 * 60 * 1000);

function id(){ return crypto.randomBytes(8).toString('hex'); }
function roomCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s='';
  do{
    s='';
    for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];
  }while(rooms.has(s));
  return s;
}
function json(res,status,obj){
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'SAMEORIGIN',
    'Referrer-Policy':'same-origin'
  });
  res.end(JSON.stringify(obj));
}
function body(req){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',c=>{
      data+=c;
      if(data.length>1_000_000){
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
      }
    });
    req.on('end',()=>{
      try{resolve(data?JSON.parse(data):{});}
      catch(e){reject(new Error('BAD_JSON'));}
    });
    req.on('error',reject);
  });
}
function snapshot(room){
  return {
    code:room.code,
    hostId:room.hostId,
    status:room.status,
    version:room.version,
    matchId:room.matchId,
    startAt:room.startAt||0,
    players:[...room.players.values()].map(p=>({id:p.id,ready:p.ready}))
  };
}
function emitToPlayer(player,msg){
  const data=`data: ${JSON.stringify(msg)}\n\n`;
  for(const res of player.streams){
    try{res.write(data);}catch(_){}
  }
}
function emit(room,msg){
  for(const p of room.players.values())emitToPlayer(p,msg);
}
function emitExcept(room,clientId,msg){
  for(const p of room.players.values()){
    if(p.id!==clientId)emitToPlayer(p,msg);
  }
}
function touch(room){
  room.updatedAt=Date.now();
}
function emitRoom(room){
  touch(room);
  room.version++;
  emit(room,{type:'room',room:snapshot(room)});
}
function getRoom(c){
  const room=rooms.get(String(c||'').toUpperCase());
  if(!room)throw new Error('ROOM_NOT_FOUND');
  return room;
}
function getPlayer(room,clientId){
  const p=room.players.get(clientId);
  if(!p)throw new Error('NOT_IN_ROOM');
  return p;
}
function ensureMatch(room,matchId){
  if(!matchId || Number(matchId)!==room.matchId)throw new Error('STALE_MATCH');
  if(!['starting','started','finished'].includes(room.status))throw new Error('MATCH_NOT_ACTIVE');
}
function sanitizePackets(packets){
  if(!Array.isArray(packets))return [];
  return packets.slice(0,8).map(p=>{
    const w=Math.max(1,Math.min(6,Number(p.w)||1));
    const h=Math.max(1,Math.min(4,Number(p.h)||1));
    const max=w*h;
    const cells=Math.max(1,Math.min(max,Number(p.cells)||max));
    return {w,h,cells};
  });
}
function startMatch(room,delay=3400){
  room.matchId=(room.matchId||0)+1;
  room.status='starting';
  room.startAt=Date.now()+delay;
  room.matchEnded=false;
  room.winnerId='';
  room.loserId='';
  room.rematchVotes.clear();

  const seed=crypto.randomBytes(4).readUInt32LE(0);
  room.seed=seed;

  emitRoom(room);
  emit(room,{
    type:'match_start',
    matchId:room.matchId,
    startAt:room.startAt,
    seed
  });

  const mid=room.matchId;
  setTimeout(()=>{
    if(rooms.get(room.code)!==room)return;
    if(room.matchId!==mid||room.matchEnded)return;
    room.status='started';
    emitRoom(room);
  },delay+80);
}
function resolveKo(room,loserId){
  if(room.matchEnded)return;
  const loser=getPlayer(room,loserId);
  const winner=[...room.players.values()].find(p=>p.id!==loser.id);
  if(!winner)return;

  room.matchEnded=true;
  room.status='finished';
  room.loserId=loser.id;
  room.winnerId=winner.id;
  emit(room,{
    type:'match_end',
    matchId:room.matchId,
    loserId:room.loserId,
    winnerId:room.winnerId
  });
  emitRoom(room);
}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);

    if(req.method==='GET' && u.pathname.startsWith('/audio/') && u.pathname.endsWith('.mp3')){
      const key=path.basename(u.pathname,'.mp3');
      const b64=AUDIO_STORE[key];
      if(!b64)return json(res,404,{error:'AUDIO_NOT_FOUND'});
      const buf=Buffer.from(b64,'base64');
      res.writeHead(200,{
        'Content-Type':'audio/mpeg',
        'Content-Length':buf.length,
        'Cache-Control':'public, max-age=31536000, immutable',
        'X-Content-Type-Options':'nosniff'
      });
      res.end(buf);
      return;
    }

    if(req.method==='GET' && u.pathname==='/health'){
      return json(res,200,{
        ok:true,
        service:'jewel-de-pon',
        version:'0.9.22',
        rooms:rooms.size,
        uptime:Math.floor(process.uptime())
      });
    }

    if(req.method==='GET' && u.pathname==='/'){
      const html=fs.readFileSync(HTML_FILE);
      res.writeHead(200,{
        'Content-Type':'text/html; charset=utf-8',
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff',
        'X-Frame-Options':'SAMEORIGIN',
        'Referrer-Policy':'same-origin'
      });
      res.end(html);
      return;
    }

    if(req.method==='GET' && u.pathname==='/api/events'){
      const c=(u.searchParams.get('code')||'').toUpperCase();
      const clientId=u.searchParams.get('clientId')||'';
      const room=getRoom(c);
      const p=getPlayer(room,clientId);

      res.writeHead(200,{
        'Content-Type':'text/event-stream; charset=utf-8',
        'Cache-Control':'no-cache, no-transform',
        'Connection':'keep-alive',
        'X-Accel-Buffering':'no'
      });
      res.write(`data: ${JSON.stringify({type:'room',room:snapshot(room)})}\n\n`);
      p.streams.add(res);
      const ping=setInterval(()=>{
        try{res.write(': ping\n\n');}catch(_){}
      },15000);
      req.on('close',()=>{
        clearInterval(ping);
        p.streams.delete(res);
      });
      return;
    }

    if(req.method==='POST' && u.pathname==='/api/client'){
      const clientId=id();
      clients.set(clientId,{id:clientId,created:Date.now()});
      return json(res,200,{clientId});
    }

    const b=req.method==='POST'?await body(req):{};

    if(req.method==='POST' && u.pathname==='/api/create'){
      if(!b.clientId)return json(res,400,{error:'clientId required'});
      const c=roomCode();
      const room={
        code:c,
        hostId:b.clientId,
        status:'lobby',
        version:1,
        matchId:0,
        startAt:0,
        matchEnded:false,
        winnerId:'',
        loserId:'',
        updatedAt:Date.now(),
        players:new Map(),
        rematchVotes:new Map()
      };
      room.players.set(b.clientId,{
        id:b.clientId,ready:false,streams:new Set()
      });
      rooms.set(c,room);
      return json(res,200,{room:snapshot(room)});
    }

    if(req.method==='POST' && u.pathname==='/api/join'){
      const room=getRoom(b.code);
      if(room.players.size>=2&&!room.players.has(b.clientId)){
        return json(res,409,{error:'ROOM_FULL'});
      }
      if(!room.players.has(b.clientId)){
        room.players.set(b.clientId,{
          id:b.clientId,ready:false,streams:new Set()
        });
      }
      emitRoom(room);
      return json(res,200,{room:snapshot(room)});
    }

    if(req.method==='POST' && u.pathname==='/api/ready'){
      const room=getRoom(b.code);
      const p=getPlayer(room,b.clientId);
      if(room.status!=='lobby'&&room.status!=='finished'){
        return json(res,409,{error:'MATCH_ACTIVE'});
      }
      p.ready=!!b.ready;
      emitRoom(room);
      return json(res,200,{room:snapshot(room)});
    }

    if(req.method==='POST' && u.pathname==='/api/start'){
      const room=getRoom(b.code);
      if(room.hostId!==b.clientId)return json(res,403,{error:'HOST_ONLY'});
      if(room.players.size!==2)return json(res,409,{error:'NEED_2_PLAYERS'});
      if(![...room.players.values()].every(p=>p.ready)){
        return json(res,409,{error:'NOT_READY'});
      }
      startMatch(room,3400);
      return json(res,200,{
        room:snapshot(room),
        matchId:room.matchId,
        startAt:room.startAt
      });
    }

    if(req.method==='POST' && u.pathname==='/api/game-state'){
      const room=getRoom(b.code);
      getPlayer(room,b.clientId);
      ensureMatch(room,b.matchId);
      if(!b.state||typeof b.state!=='object'){
        return json(res,400,{error:'STATE_REQUIRED'});
      }
      emitExcept(room,b.clientId,{
        type:'game_state',
        clientId:b.clientId,
        matchId:room.matchId,
        seq:Number(b.seq)||0,
        state:b.state
      });
      return json(res,200,{ok:true});
    }

    if(req.method==='POST' && u.pathname==='/api/game-event'){
      const room=getRoom(b.code);
      getPlayer(room,b.clientId);
      ensureMatch(room,b.matchId);

      const allowed=new Set(['attack','flip','pause']);
      const kind=String(b.kind||'');
      if(!allowed.has(kind))return json(res,400,{error:'BAD_EVENT'});

      let payload=b.payload||{};
      if(kind==='attack')payload={packets:sanitizePackets(payload.packets)};
      if(kind==='pause')payload={paused:!!payload.paused};
      if(kind==='flip')payload={};

      emit(room,{
        type:'game_event',
        clientId:b.clientId,
        matchId:room.matchId,
        kind,
        payload
      });
      return json(res,200,{ok:true});
    }

    if(req.method==='POST' && u.pathname==='/api/ko'){
      const room=getRoom(b.code);
      getPlayer(room,b.clientId);
      ensureMatch(room,b.matchId);
      resolveKo(room,b.clientId);
      return json(res,200,{
        ok:true,
        winnerId:room.winnerId,
        loserId:room.loserId
      });
    }

    if(req.method==='POST' && u.pathname==='/api/rematch-vote'){
      const room=getRoom(b.code);
      getPlayer(room,b.clientId);
      if(room.status!=='finished')return json(res,409,{error:'MATCH_NOT_FINISHED'});

      room.rematchVotes.set(b.clientId,!!b.vote);
      emit(room,{
        type:'rematch_vote',
        clientId:b.clientId,
        vote:!!b.vote
      });

      if(room.rematchVotes.size===2){
        const ids=[...room.players.keys()];
        const a=room.rematchVotes.get(ids[0]);
        const bb=room.rematchVotes.get(ids[1]);
        const split=a!==bb;
        const rematch=split?room.rematchVotes.get(room.hostId):a;

        emit(room,{type:'rematch_resolution',rematch,split});

        if(rematch){
          room.rematchVotes.clear();
          for(const p of room.players.values())p.ready=true;
          setTimeout(()=>{
            if(rooms.get(room.code)===room&&room.players.size===2){
              startMatch(room,3000);
            }
          },1200);
        }else{
          room.status='lobby';
          room.rematchVotes.clear();
          for(const p of room.players.values())p.ready=false;
          emitRoom(room);
        }
      }
      return json(res,200,{ok:true});
    }

    if(req.method==='POST' && u.pathname==='/api/leave'){
      const room=getRoom(b.code);
      const leaving=room.players.get(b.clientId);
      if(leaving){
        for(const s of leaving.streams){try{s.end();}catch(_){} }
        room.players.delete(b.clientId);
      }

      if(room.players.size){
        if((room.status==='starting'||room.status==='started')&&!room.matchEnded){
          const survivor=[...room.players.values()][0];
          room.matchEnded=true;
          room.status='finished';
          room.winnerId=survivor.id;
          room.loserId=b.clientId;
          emit(room,{
            type:'opponent_left',
            winnerId:survivor.id,
            loserId:b.clientId
          });
        }else{
          emit(room,{type:'opponent_left'});
        }

        if(room.hostId===b.clientId){
          room.hostId=[...room.players.keys()][0];
        }
        emitRoom(room);
      }else{
        rooms.delete(room.code);
      }
      return json(res,200,{ok:true});
    }

    return json(res,404,{error:'NOT_FOUND'});
  }catch(err){
    const map={
      ROOM_NOT_FOUND:404,
      NOT_IN_ROOM:403,
      STALE_MATCH:409,
      MATCH_NOT_ACTIVE:409,
      BAD_JSON:400,
      BODY_TOO_LARGE:413
    };
    return json(res,map[err.message]||500,{error:err.message||'SERVER_ERROR'});
  }
});

const cleanupTimer=setInterval(()=>{
  const now=Date.now();
  for(const [c,room] of rooms){
    if(now-(room.updatedAt||now)>ROOM_TTL_MS){
      emit(room,{type:'room_closed',reason:'expired'});
      for(const p of room.players.values()){
        for(const s of p.streams){try{s.end();}catch(_){} }
      }
      rooms.delete(c);
    }
  }
},10*60*1000);
cleanupTimer.unref?.();

function shutdown(signal){
  console.log(`${signal}: graceful shutdown`);
  clearInterval(cleanupTimer);
  for(const room of rooms.values()){
    emit(room,{type:'room_closed',reason:'server_restart'});
    for(const p of room.players.values()){
      for(const s of p.streams){try{s.end();}catch(_){} }
    }
  }
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(0),25000).unref?.();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));

server.listen(PORT,HOST,()=>{
  console.log(`JEWEL de PON v0.9.22 server: http://localhost:${PORT}`);
  console.log(`LAN test: http://<this-PC-IP>:${PORT}`);
});
