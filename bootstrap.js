const fs=require('fs');
const path=require('path');
const d=path.join(__dirname,'chunks');
const read=n=>fs.readFileSync(path.join(d,n),'utf8').trim();
const b64=[
  read('webapp-00.b64').slice(0,20000),
  read('webapp-01.b64'),
  read('webapp-02.b64'),
  read('webapp-03.b64'),
  read('webapp-04.b64'),
  read('webapp-05a.b64').slice(0,10000)+read('webapp-05b.b64').slice(0,10000),
  read('webapp-06.b64').slice(0,20000),
  read('webapp-07.b64').slice(0,14004)
].join('');
if(b64.length!==154004)throw new Error('Unexpected reconstructed payload length: '+b64.length);
fs.writeFileSync(path.join(d,'livefix.b64'),b64);
console.log('Reconstructed web payload:',b64.length,'chars');
require('./server-livefix.js');
