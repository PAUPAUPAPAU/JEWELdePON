const assert=require('assert/strict'),make=require('./game-harness.cjs');
// Faithful Canvas arc validation is active in the harness. In a busy frame the
// rAF timestamp precedes performance.now(), which effect creation uses.
for(const lag of [0,16,70,100,250,1000]){
 const h=make();h.time(1000+lag);
 h.run(`last=967;matchRiseStart=-240000;garbage={row:11,y:10.99,targetY:11,col:0,w:6,h:1,cells:Array(6).fill(0),landT:0};`);
 const frames=h.frames();h.run('loop(1000)');assert.equal(h.frames(),frames+1);
 assert.equal(h.run('activeColorCount()'),7);
 h.run(`spawnBreakFx(11,2);specialFx.push({type:'burst',row:11,col:2,start:performance.now()});cpuSpecialFx.push({type:'burst',row:11,col:2,start:performance.now()});drawFx(1000);drawSpecialFx(1000);drawCpuSpecialFx(1000);`);
 h.tick(3000+lag);assert.equal(h.run('playerImpactFx.length+specialFx.length+flashes.length'),0);
}
console.log('PASS delayed frames up to 1 second: landing, conversion and special effects keep scheduling frames and expire');
function dragHarness(){const h=make();h.run(`const p=panel(7);p.x=p.targetX=2;p.y=p.targetY=11;grid[11][2]=p;globalThis.swapSounds=0;playSfx=()=>swapSounds++;`);const cv=h.element('game');const event=x=>({clientX:x*60,clientY:690,pointerId:1});cv.dispatch('pointerdown',event(2.5));return {h,cv,event};}
{
 const {h,cv,event}=dragHarness();cv.dispatch('pointermove',event(2.75));
 assert.equal(h.run('findLogical(drag.id).c'),3);assert.equal(h.run('swapSounds'),1);
 for(let n=0;n<100;n++)cv.dispatch('pointermove',event(2.75));
 assert.equal(h.run('swapSounds'),1);
 cv.dispatch('pointermove',event(2.9));assert.equal(h.run('swapSounds'),1);
 cv.dispatch('pointermove',event(3.75));assert.equal(h.run('findLogical(drag.id).c'),4);
 cv.dispatch('pointermove',event(3.70));assert.equal(h.run('findLogical(drag.id).c'),4);
 cv.dispatch('pointermove',event(3.45));assert.equal(h.run('findLogical(drag.id).c'),3);
 cv.dispatch('pointerup',event(3.45));assert.equal(h.run('swapSounds'),3);
}
{
 const {h,cv,event}=dragHarness();cv.dispatch('pointerup',event(2.5));assert.equal(h.run('grid[11][3].c'),7);assert.equal(h.run('swapSounds'),1);
}
{
 const {h,cv,event}=dragHarness();cv.dispatch('pointermove',event(20));assert.equal(h.run('findLogical(drag.id).c'),5);assert.equal(h.run('swapSounds'),3);cv.dispatch('pointercancel',event(20));assert.equal(h.run('drag'),null);
}
console.log('PASS short flick, stationary repeats, continued drag, intentional reverse, edge, cancel and unchanged tap');
{
 const h=make(),initial=h.audios.length;h.run('audioUnlocked=true;sfxUserOn=true');
 h.run(`for(let i=0;i<1000;i++)playSfx('swap')`);
 assert.equal(h.run('sfxPool.swap.plays'),1);assert.equal(h.run('sfxPool.swap.volume'),.24);
 for(let n=1;n<=10000;n++){h.time(1000+n*60);h.run(`playSfx('swap');playSfx('clear');playSfx('garbage');`);}
 assert.equal(h.audios.length,initial);assert.equal(h.run('sfxPool.swap.plays'),10001);
 assert.equal(h.run('sfxPool.swap.pauses'),10001);
 h.run('sfxUserOn=false');h.time(700000);h.run("playSfx('swap')");assert.equal(h.run('sfxPool.swap.plays'),10001);
 h.run("sfxUserOn=true;sfxPool.swap.play=()=>{throw Error('audio failure')};playSfx('swap')");
}
console.log('PASS 30,000 repeated sounds reuse fixed audio instances, throttle duplicates, retain tap volume and tolerate playback failure');
