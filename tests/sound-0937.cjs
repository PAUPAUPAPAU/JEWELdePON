const assert=require('assert/strict'),make=require('./game-harness.cjs');
const h=make();h.run('audioUnlocked=true;sfxUserOn=true;bgmUserOn=true');
for(const [key,name] of Object.entries({swap:'ugokasu',convert:'ojamahenkan',rise:'seriagari',garbage:'ojamaochiru',special:'item',win:'katta',lose:'maketa',danger:'danger'}))assert.equal(h.run(`sfxPool.${key}.src`),'/audio/'+name+'.mp3');
for(let n=1;n<=12;n++){h.time(n*1000);h.run(`playClearSound(${n})`);assert.equal(h.run('lastComboSound'),'combo'+Math.min(10,n));assert.equal(h.run('sfxPool[lastComboSound].src'),'/audio/combo'+Math.min(10,n)+'.mp3');}
assert.equal(h.run('sfxPool.combo10.plays'),3);
assert(h.run('sfxPool.combo1.pauses>0&&sfxPool.combo9.pauses>0'));
for(const side of ['player','cpu'])for(const chain of [1,2,9,10,50]){
 const x=make(),b=side==='player'?'grid':'cpuGrid',p=side==='player'?'panel':'cpuPanel';
 x.run(`audioUnlocked=true;sfxUserOn=true;${side==='player'?'comboLevel':'cpuCombo'}=${chain-1};${side==='player'?'comboExpireAt':'cpuComboExpire'}=5000;for(let c=0;c<3;c++){const p=${p}(7);p.x=p.targetX=c;p.y=p.targetY=11;${b}[11][c]=p;}${side==='player'?'clearMatches':'cpuClearMatches'}()`);
 assert.equal(x.run('lastComboSound'),'combo'+Math.min(chain,10));
}
console.log('PASS all supplied mappings and real player/CPU clears select combo1..10, capped after ten');
{
 const x=make();x.run(`audioUnlocked=true;sfxUserOn=true;grid[0][0]=panel(1);dangerElapsed=4990;updateTopDanger(.02)`);assert.equal(x.run('sfxPool.danger.plays'),1);
 for(let i=0;i<30;i++){x.time(1100+i*33);x.run('updateTopDanger(.033)');}assert.equal(x.run('sfxPool.danger.plays'),1);
 x.run('grid[0][0]=null;updateTopDanger(.033);grid[0][0]=panel(1);dangerElapsed=4990;conversion={};updateTopDanger(.1)');assert.equal(x.run('sfxPool.danger.plays'),1);
 x.time(3000);x.run('conversion=null;updateTopDanger(.02)');assert.equal(x.run('sfxPool.danger.plays'),2);
}
console.log('PASS remaining-two-second warning fires once per danger episode and waits during rescue');
{
 const x=make();x.run("audioUnlocked=true;bgmUserOn=true;finishMatch('win',1000)");assert.equal(x.run('resultMusic.src'),'/audio/katta.mp3');assert.equal(x.run('resultMusic.plays'),1);assert.equal(x.run('resultMusic.loop'),false);assert.equal(x.run('bgmNormalAudio.volume+bgmDangerAudio.volume'),0);
 x.run("finishMatch('win',1100)");assert.equal(x.run('resultMusic.plays'),1);
 x.run('bgmUserOn=false;updateAudioUi()');assert.equal(x.run('resultMusic.volume'),0);
 x.run('setupVsBoardForStart()');assert.equal(x.run('resultMusic'),null);
 x.run("bgmUserOn=true;finishMatch('lose',3000)");assert.equal(x.run('resultMusic.src'),'/audio/maketa.mp3');
 x.run("sfxUserOn=false;updateAudioUi();playClearSound(3)");assert.equal(x.run('sfxPool.combo3.plays'),0);
}
console.log('PASS distinct one-shot win/loss music, BGM mute, SFX mute, restart cleanup and no duplicate result playback');
{
 const count=h.audios.length;
 for(let n=0;n<2000;n++){h.time(20000+n*61);h.run('playClearSound(1+Math.floor(Math.random()*50));playSfx("swap")');}
 assert.equal(h.audios.length,count);h.run("sfxPool.combo10.play=()=>Promise.reject(Error('decoder'));playClearSound(10)");
}
console.log('PASS repeated actions allocate no new audio elements; playback stays independent from game state');
