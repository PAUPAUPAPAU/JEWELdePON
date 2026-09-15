const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const zlib=require('zlib');
const d=path.join(__dirname,'chunks');
const read=n=>fs.readFileSync(path.join(d,n),'utf8').trim();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

// Chunk 00 differs only in the gzip timestamp header. Normalize it to the
// deterministic gzip header used by the verified local build.
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
const expected=[
'a0ec4f7ea966c992e15af698561b02603dd933b175863e856066320db0a4313a',
'2f911c432f33a8adfbc0f0ac783b2e58e5023d06bb6679929592f19fe26d41a7',
'927f502ac328e198d752edd91143b9634ef732e5bbc587d1d2da2b986a3aec71',
'7164c4a669cc29310e5080a9c66c4ff813dfc3e3fb7ec94aeea2557e77d4d134',
'ed2e321ae1d50d554a20020f9d7f0176103dc51597669902ee9cb688534ceaab',
'225d6f7f2e8b3696e3f10b4110bebb8163dfde17ac4529ad49d7009ebd4e9a31',
'05cdde0b3ad4eb48794b0ed824216f13e02595350d8504a63384b84a492962a4',
'f44738b3e23eaf32af0377b7f783452d217d9b709102fcaeacb8d500780496f5'
];
let bad=[];
parts.forEach((p,i)=>{
  const h=sha(p);
  console.log(`payload part ${i}: len=${p.length} sha256=${h} ${h===expected[i]?'OK':'BAD'}`);
  if(h!==expected[i])bad.push(i);
});
if(bad.length)throw new Error('Payload part mismatch: '+bad.join(','));
const b64=parts.join('');
if(b64.length!==154004)throw new Error('Unexpected reconstructed payload length: '+b64.length);
if(sha(b64)!=='8b9423dfa9f70cd3a9d081a7d75b44d9555ae867224cee39b542b6b534431fd8')throw new Error('Full payload SHA mismatch');
const html=zlib.gunzipSync(Buffer.from(b64,'base64'));
if(html.length!==264301)throw new Error('Unexpected HTML length: '+html.length);
fs.writeFileSync(path.join(d,'livefix.b64'),b64);
console.log('Verified web payload:',b64.length,'chars / HTML:',html.length,'bytes');
require('./server-livefix.js');
