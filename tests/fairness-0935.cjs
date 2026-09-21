const assert=require('assert/strict'),make=require('./game-harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
for(const size of [1,4,5,6,19,24,72]){
 const h=make();h.run(`garbage=makeGarbageWave(${size});garbage.row=garbage.y=garbage.targetY=R-garbage.h;cpuGarbage=JSON.parse(JSON.stringify(garbage));startConversion();cpuStartConversion();`);
 const expected=(220+(size-1)*185+7*30)/1.5;
 const samples=[0,100,220/1.5,expected-.01,expected+.01];
 for(let n=0;n<size;n++){const t=(220+n*185+210)/1.5;samples.push(t-.01,t+.01);}
 for(const delta of [...new Set(samples)].sort((a,b)=>a-b)){
  h.time(1000+delta);h.run('updateConversion(performance.now());updateCpuConversion(performance.now())');
  assert.deepEqual(plain(h.run('garbage?.cells??null')),plain(h.run('cpuGarbage?.cells??null')),`stages ${size}/${delta}`);
  assert.equal(h.run('grid.flat().filter(Boolean).length'),h.run('cpuGrid.flat().filter(Boolean).length'),`converted ${size}/${delta}`);
  if(delta<expected)assert(h.run('!!conversion&&!!cpuConversion'));
 }
 assert.equal(h.run('grid.flat().filter(Boolean).length'),size);assert.equal(h.run('conversion'),null);assert.equal(h.run('cpuConversion'),null);
}
console.log('PASS 1–72 cells: player/CPU crack stages, cell counts and completion agree at every boundary; total duration is exactly 2/3');
{
 const h=make();h.run('garbage=makeGarbageWave(24);garbage.row=garbage.y=garbage.targetY=8;cpuGarbage=JSON.parse(JSON.stringify(garbage));startConversion();cpuStartConversion();shiftPauseTimers(5000)');
 h.time(6200);h.run('updateConversion(6200);updateCpuConversion(6200)');assert.equal(h.run('grid.flat().filter(Boolean).length+cpuGrid.flat().filter(Boolean).length'),0);
 h.time(20000);h.run('updateConversion(20000);updateCpuConversion(20000)');assert.equal(h.run('grid.flat().filter(Boolean).length'),24);assert.equal(h.run('cpuGrid.flat().filter(Boolean).length'),24);
}
console.log('PASS pause shifts both clocks equally; skipped frames catch up all due cells without loss');
for(const size of [3,4,5,6])for(const side of ['player','cpu']){
 const h=make(),board=side==='player'?'grid':'cpuGrid',panel=side==='player'?'panel':'cpuPanel',target=side==='player'?'cpuIncoming':'playerIncoming';
 h.run(`vsActive=true;for(let c=0;c<${size};c++){const p=${panel}(7);p.x=p.targetX=c;p.y=p.targetY=11;${board}[11][c]=p;}${side==='player'?'clearMatches':'cpuClearMatches'}()`);
 assert.equal(h.run(`queuePower(${target})`),size===3?0:size);
}
{
 const h=make();h.run(`onlineMatchActive=true;lobbyRoomCode='123456';netClientId='a';onlineMatchId=1;vsActive=true;globalThis.sent=[];sendNetGameEvent=(kind,payload)=>sent.push({kind,payload});processVsAttack('player',4,1);processVsAttack('player',5,2);`);
 assert.equal(h.run('sent[0].payload.packets.reduce((n,p)=>n+p.cells,0)'),4);
 assert.equal(h.run('sent[1].payload.packets.reduce((n,p)=>n+p.cells,0)'),11);
 h.run(`enqueuePackets(playerIncoming,packetsFromPower(3),performance.now());processVsAttack('player',5,1)`);
 assert.equal(h.run('sent[2].payload.packets.reduce((n,p)=>n+p.cells,0)'),2);assert.equal(h.run('queuePower(playerIncoming)'),0);
}
console.log('PASS actual 4/5/6 matches attack symmetrically; online 4/5 attacks send, combine with chain attack and retain fair cancellation');
