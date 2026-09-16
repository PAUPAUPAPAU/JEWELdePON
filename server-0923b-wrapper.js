const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const zlib=require('zlib');
const Module=require('module');

const ROOT=__dirname;
const chunks=path.join(ROOT,'chunks');
const read=n=>fs.readFileSync(path.join(chunks,n),'utf8').trim();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

// Reconstruct the verified v0.9.22 base used by v0.9.23.
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

// Apply the already-approved v0.9.23 Japanese UI / lobby patch.
const edits=JSON.parse(fs.readFileSync(path.join(ROOT,'patch-0923.json'),'utf8'));
const lines=base.match(/[^\n]*\n|[^\n]+$/g)||[];
const out=[];let cursor=0;
for(const [i1,i2,repl] of edits){
  if(i1<cursor)throw new Error('Overlapping v0.9.23 patch');
  out.push(lines.slice(cursor,i1).join(''));out.push(repl);cursor=i2;
}
out.push(lines.slice(cursor).join(''));
let html=out.join('');

// Build the adopted title image from small text chunks.
const logo64=['00','01','02'].map(n=>fs.readFileSync(path.join(ROOT,'assets','title-logo',`title-logo-${n}.b64`),'utf8').trim()).join('');
const logo=Buffer.from(logo64,'base64');
if(!logo.length||logo.slice(1,4).toString()!=='PNG')throw new Error('Title logo PNG reconstruction failed');
const logoUri='data:image/png;base64,'+logo64;

// Replace the old text logo with the adopted image title and remove the obsolete jewel row.
html=html.replace(/<div class="logoFrame"><div class="gameLogoText" aria-label="JEWEL de PON">JEWEL de PON<\/div><\/div>\s*<div class="logoSub">PUZZLE BATTLE<\/div>/,
  `<div class="titleLogoWrap"><img class="titleLogoImage" src="${logoUri}" alt="JEWEL de PON"></div>`);
html=html.replace(/\s*<div class="titleGemRow" aria-hidden="true">[\s\S]*?<\/div>\s*(?=<div class="titleLead">)/,'\n    ');
html=html.replace('/* v0.9.23 title/lobby polish */',`/* v0.9.23b adopted image title */\n.titlePanel{display:flex;flex-direction:column;align-items:center}\n.titleLogoWrap{width:min(92vw,560px);margin:0 auto 16px;display:flex;justify-content:center;align-items:center;position:relative;left:-8px}\n.titleLogoImage{display:block;width:100%;height:auto;image-rendering:pixelated}\n.titleLead,.titleMenu,.titleFoot{width:100%}\n/* v0.9.23 title/lobby polish */`);
html=html.replace(/function renderTitleJewels\(\)\{[\s\S]*?\n\}/,'function renderTitleJewels(){}');
html=html.replace('Prototype Ver.0.9.23 / ONLINE PvP','Prototype Ver.0.9.23b / IMAGE TITLE FIX');
html=html.replace('<title>JEWEL de PON - Prototype Ver.0.9.23</title>','<title>JEWEL de PON - Prototype Ver.0.9.23b</title>');

// Reuse the tested v0.9.23 networking server while supplying the final HTML buffer.
global.__JDP_HTML_BUFFER=Buffer.from(html,'utf8');
let source=fs.readFileSync(path.join(ROOT,'server-0923.js'),'utf8');
source=source.replace('const HTML_BUFFER=loadHtmlBuffer();','const HTML_BUFFER=global.__JDP_HTML_BUFFER;');
source=source.replace("version:'0.9.23'","version:'0.9.23b'");
source=source.replace('JEWEL de PON v0.9.23 server:','JEWEL de PON v0.9.23b server:');
const runtimeFile=path.join(ROOT,'server-0923b-runtime.js');
const m=new Module(runtimeFile,module);
m.filename=runtimeFile;m.paths=module.paths;
m._compile(source,runtimeFile);
