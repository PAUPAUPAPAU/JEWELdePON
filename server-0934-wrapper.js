const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const zlib=require('zlib');
const Module=require('module');

const ROOT=__dirname;
const chunks=path.join(ROOT,'chunks');
const read=n=>fs.readFileSync(path.join(chunks,n),'utf8').trim();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

const old0=read('webapp-00.b64').slice(0,20000);
const c0='H4sIAAAAAAAC'+old0.slice(12);
const parts=[
  c0,
  read('webapp-01.b64').slice(0,20000),
  read('webapp-02.b64').slice(0,20000),
  read('webapp-03.b64').slice(0,20000),
  read('webapp-04.b64').slice(0,20000),
  read('webapp-05a.b64').slice(0,10000)+read('fix05b.b64').slice(0,10000),
  read('webapp-06.b64').slice(0,20000),
  read('webapp-07.b64').slice(0,14004)
];
const b64=parts.join('');
if(b64.length!==154004)throw new Error('Unexpected base payload length');
if(sha(b64)!=='8b9423dfa9f70cd3a9d081a7d75b44d9555ae867224cee39b542b6b534431fd8')throw new Error('Base payload SHA mismatch');
const base=zlib.gunzipSync(Buffer.from(b64,'base64')).toString('utf8');
if(Buffer.byteLength(base)!==264301)throw new Error('Unexpected base HTML length');

function applyPatch(text,file,label){
  const edits=JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8'));
  const lines=text.match(/[^\n]*\n|[^\n]+$/g)||[];
  const out=[];let cursor=0;
  for(const [i1,i2,repl] of edits){
    if(i1<cursor)throw new Error('Overlapping '+label+' patch');
    out.push(lines.slice(cursor,i1).join(''));out.push(repl);cursor=i2;
  }
  out.push(lines.slice(cursor).join(''));
  return out.join('');
}

let html=applyPatch(base,'patch-0923.json','v0.9.23');
html=applyPatch(html,'patch-0925-from-0923.json','v0.9.25');
html=applyPatch(html,'patch-0926-from-0925.json','v0.9.26');
html=applyPatch(html,'patch-0927-from-0926.json','v0.9.27');
html=applyPatch(html,'patch-0928c-from-0927.json','v0.9.28c');
if(Buffer.byteLength(html)!==276815)throw new Error('Unexpected v0.9.28c HTML length: '+Buffer.byteLength(html));
if(sha(html)!=='ec6be90293fa8ef3236cae834e73062a7f6048d4d5bcc1e66d8c4702a862894b')throw new Error('v0.9.28c HTML SHA mismatch');

html=applyPatch(html,'patch-0929-from-0928c.json','v0.9.29');
if(Buffer.byteLength(html)!==280610||sha(html)!=='399135dd264eeb5ff31fc7cfdfcb7031281f5412d3f842a9ba2a4279266a7223')throw new Error('v0.9.29 HTML integrity mismatch');

html=applyPatch(html,'patch-0930-from-0929.json','v0.9.30');
if(Buffer.byteLength(html)!==281975||sha(html)!=='64da4768bd770d68ee5ac86d30830ce403eed655aebee7f120ea8b7a3106adcb')throw new Error('v0.9.30 HTML integrity mismatch');

html=applyPatch(html,'patch-0931-from-0930.json','v0.9.31');
if(Buffer.byteLength(html)!==288860||sha(html)!=='1205d57a5856e24fbe84ea01649aea5772b226f6be665f9744307d27fea53c72')throw Error('v0.9.31 HTML integrity mismatch');

html=applyPatch(html,'patch-0932-from-0931.json','v0.9.32');
if(Buffer.byteLength(html)!==289592||sha(html)!=='feebd9dd8f50ec14b30827df4382febe2ad481aad09520271f7b0a3c9ea078ab')throw Error('v0.9.32 HTML integrity mismatch');

html=applyPatch(html,'patch-0933-from-0932.json','v0.9.33');
if(Buffer.byteLength(html)!==290172||sha(html)!=='468fc8475c9079a02c716efa39d0e1112a33acce65aa061086587f21cb5d73f0')throw Error('v0.9.33 HTML integrity mismatch');

html=applyPatch(html,'patch-0934-from-0933.json','v0.9.34');
if(Buffer.byteLength(html)!==291232||sha(html)!=='331cf5f88f5e2c4d325cc014d63af86a778058b163bde09f0415840ab1a9f916')throw Error('v0.9.34 HTML integrity mismatch');

global.__JDP_HTML_BUFFER=Buffer.from(html,'utf8');
let source=fs.readFileSync(path.join(ROOT,'server-0923.js'),'utf8');
source=source.replace('const HTML_BUFFER=loadHtmlBuffer();','const HTML_BUFFER=global.__JDP_HTML_BUFFER;');
source=source.replace("version:'0.9.23'","version:'0.9.34'");
source=source.replace('JEWEL de PON v0.9.23 server:','JEWEL de PON v0.9.34 server:');

source=source.replace("const server=http.createServer", "const boardChangeService=require('./board-change-0931.cjs');\nconst server=http.createServer");
source=source.replace("  room.matchId=(room.matchId||0)+1;", "  room.boardChange=null;room.changeSerial=0;room.changeEpoch=0;room.changeAcks=new Set();\n  room.matchId=(room.matchId||0)+1;");
source=source.replace("    if(req.method==='POST'&&u.pathname==='/api/create'){", "    if(req.method==='POST'&&u.pathname==='/api/board-change'){\n      const room=getRoom(b.code);getPlayer(room,b.clientId);ensureMatch(room,b.matchId);touch(room);\n      return json(res,200,boardChangeService.handle(room,b,emit));\n    }\n    if(req.method==='POST'&&u.pathname==='/api/create'){");
source=source.replace("      emitExcept(room,b.clientId,{type:'game_state'", "      if((Number(b.state.changeEpoch)||0)<(room.changeEpoch||0))return json(res,200,{ok:true,stale:true});\n      emitExcept(room,b.clientId,{type:'game_state'");

const runtimeFile=path.join(ROOT,'server-0934-runtime.js');
const m=new Module(runtimeFile,module);
m.filename=runtimeFile;m.paths=module.paths;
m._compile(source,runtimeFile);
