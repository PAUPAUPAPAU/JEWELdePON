const assert=require('assert/strict'),make=require('./game-harness.cjs');
{
 const h=make();h.run('audioUnlocked=true;sfxUserOn=true;beginVsCountdown()');
 assert.equal(h.run('sfxPool.count3.src'),'/audio/321.mp3');assert(h.run('sfxPool.count3===sfxPool.count2&&sfxPool.count2===sfxPool.count1'));
 for(const t of [1000,2000]){h.time(1000+t);h.run(`updateStartCountdown(${1000+t})`);}
 assert.equal(h.run('sfxPool.count3.plays'),3);
 h.time(4000);h.run('updateStartCountdown(4000)');
 assert.equal(h.run('sfxPool.start.src'),'/audio/go.mp3');assert.equal(h.run('sfxPool.start.plays'),1);assert.equal(h.run('vsActive'),true);assert.equal(h.run('goDisplayUntil'),4800);
 h.run('updateStartCountdown(4010)');assert.equal(h.run('sfxPool.start.plays'),1);
 h.run("globalThis.labels=[];ctx.fillText=(s)=>labels.push(s);cpuCtx.fillText=(s)=>labels.push(s);drawStartCountdown(4050)");assert.equal(h.run("labels.filter(x=>x==='GO！！').length"),2);
 h.run('labels=[];drawStartCountdown(4801)');assert.equal(h.run('labels.length'),0);
 h.run('setupVsBoardForStart()');assert.equal(h.run('goDisplayUntil'),0);
}
{
 const h=make();h.run('audioUnlocked=true;sfxUserOn=true');
 h.run("beginSpecialPause('player','flip',0,0,1000)");assert.equal(h.run('sfxPool.banmen.plays'),1);assert.equal(h.run('sfxPool.special.plays'),0);
 h.time(2000);h.run("beginSpecialPause('player','bomb',0,0,2000)");assert.equal(h.run('sfxPool.special.plays'),1);
 h.time(3000);h.run("beginSpecialPause('player','change',0,0,3000)");assert.equal(h.run('sfxPool.special.plays'),1);assert.equal(h.run('sfxPool.banmen.plays'),1);
 h.run("vsActive=true;requestBoardChange();playerSpecialPauseUntil=0;cpuSpecialPauseUntil=0;updateBoardChange(3000)");assert.equal(h.run('sfxPool.banmen.plays'),2);
}
{
 const h=make();h.run("audioUnlocked=true;sfxUserOn=true;finishMatch('lose',1000);finishMatch('lose',1001)");assert.equal(h.run('sfxPool.gameover.src'),'/audio/gameover.mp3');assert.equal(h.run('sfxPool.gameover.plays'),1);assert.equal(h.run('sfxPool.lose.plays'),1);
 h.run("setupVsBoardForStart();finishMatch('win',2000)");assert.equal(h.run('sfxPool.gameover.plays'),1);
 const n=h.audios.length;for(let i=0;i<1000;i++){h.time(4000+i*100);h.run("playSfx('banmen');playSfx('count1')");}assert.equal(h.audios.length,n);
}
console.log('PASS countdown shared audio, GO sound/overlay without delaying play, item distinction, one-shot death and fixed allocation');
