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

function loadAudioB64(prefix){
  const dir=path.join(ROOT,'assets','audio-b64');
  const files=fs.readdirSync(dir).filter(n=>n.startsWith(prefix+'-')&&n.endsWith('.b64')).sort();
  if(!files.length)throw new Error('Missing audio chunks: '+prefix);
  return Buffer.from(files.map(n=>fs.readFileSync(path.join(dir,n),'utf8').trim()).join(''),'base64');
}
const battleMp3=loadAudioB64('battle');
const pinchMp3=loadAudioB64('PINCH');
if(battleMp3.length!==700792)throw new Error('Unexpected battle.mp3 length: '+battleMp3.length);
if(pinchMp3.length!==620879)throw new Error('Unexpected PINCH.mp3 length: '+pinchMp3.length);
if(sha(battleMp3)!=='09cd86b9e8cc2e1be6a7e2fe1caa77964d8a0525109d31241a21cbe49695822a')throw new Error('battle.mp3 SHA mismatch');
if(sha(pinchMp3)!=='8142491e3f7e9015a7de635b54567917dad0cc00485475a688451681bd2cda8f')throw new Error('PINCH.mp3 SHA mismatch');

global.__JDP_HTML_BUFFER=Buffer.from(html,'utf8');
global.__JDP_BGM_NORMAL=battleMp3;
global.__JDP_BGM_DANGER=pinchMp3;
let source=fs.readFileSync(path.join(ROOT,'server-0923.js'),'utf8');
source=source.replace('const HTML_BUFFER=loadHtmlBuffer();','const HTML_BUFFER=global.__JDP_HTML_BUFFER;');
source=source.replace('bgmNormal:melody(false),bgmDanger:melody(true),','bgmNormal:global.__JDP_BGM_NORMAL,bgmDanger:global.__JDP_BGM_DANGER,');
source=source.replace("res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':buf.length,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.end(buf);return;","const audioType=(key==='bgmNormal'||key==='bgmDanger')?'audio/mpeg':'audio/wav';res.writeHead(200,{'Content-Type':audioType,'Content-Length':buf.length,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.end(buf);return;");
source=source.replace("version:'0.9.23'","version:'0.9.28c'");
source=source.replace('JEWEL de PON v0.9.23 server:','JEWEL de PON v0.9.28c server:');
const runtimeFile=path.join(ROOT,'server-0928c-runtime.js');
const m=new Module(runtimeFile,module);
m.filename=runtimeFile;m.paths=module.paths;
m._compile(source,runtimeFile);
