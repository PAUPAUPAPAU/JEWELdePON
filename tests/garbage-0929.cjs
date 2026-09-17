const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const harness=require('./game-harness.cjs');
const results=[];
function test(name,fn){fn();results.push(name);console.log('PASS '+name);}
function support(h,top=4,side='player'){
  const b=side==='player'?'grid':'cpuGrid',p=side==='player'?'panel':'cpuPanel';
  h.run(`${b}=Array.from({length:R},()=>Array(C).fill(null));for(let r=${top};r<R;r++)for(let c=0;c<C;c++){const p=${p}(1+(r+c)%5);p.x=p.targetX=c;p.y=p.targetY=r;${b}[r][c]=p;}`);
}
function incoming(h,power=100,side='player'){
  h.run(`enqueuePackets(${side}Incoming,packetsFromPower(${power}),1000)`);
  h.time(3400);h.run(`updateIncoming(${side}Incoming,'${side}',3400)`);
}
const cells=side=>`all${side==='cpu'?'Cpu':''}GarbageObjects().reduce((n,g)=>n+g.cells.filter(x=>x>=0).length,0)`;
test('100 incoming, 4 empty rows: exactly 24 on board and 76 in warning',()=>{
  const h=harness();support(h);incoming(h);
  assert.equal(h.run(cells('player')),24);assert.equal(h.run('queuePower(playerIncoming)'),76);
  assert.equal(h.run('garbage.row'),0);assert.equal(h.run('playerGarbageDelivery.phase'),'resolving');
});
test('One wave never exceeds empty rows or loses cells across capacities and attack sizes',()=>{
  const h=harness();let cases=0;
  for(let rows=0;rows<=12;rows++)for(const power of [1,5,6,7,19,24,25,72,100]){
    h.run('garbage=null;extraGarbages=[];playerIncoming=[];resetGarbageDelivery("player");');support(h,rows);incoming(h,power);
    const count=Math.min(rows*6,power);
    assert.equal(h.run(cells('player')),count,`${rows}/${power}`);
    assert.equal(h.run('queuePower(playerIncoming)'),power-count);
    assert(h.run('allGarbageObjects().every(g=>g.row>=0&&g.row+g.h<=R)'));
    cases++;
  }
  console.log('  '+cases+' capacity/size cases');
});
test('No extra wave after 8 seconds, even with available room; next clear is required',()=>{
  const h=harness();support(h);incoming(h);
  h.run('garbage.y=garbage.targetY;updateIncoming(playerIncoming,"player",3500)');
  assert.equal(h.run('playerGarbageDelivery.phase'),'awaitClear');
  h.run('garbage=null;extraGarbages=[];');
  h.time(20000);h.run('updateIncoming(playerIncoming,"player",20000)');
  assert.equal(h.run(cells('player')),0);assert.equal(h.run('queuePower(playerIncoming)'),76);
});
test('Next real clear unlocks committed delivery and blocks it during clearing',()=>{
  const h=harness();support(h);incoming(h);
  h.run('garbage.y=garbage.targetY;updateIncoming(playerIncoming,"player",3500);garbage=null;extraGarbages=[];');
  h.time(3600);
  h.run('for(let c=0;c<4;c++)grid[11][c].c=5;vsActive=true;clearMatches();');
  assert.equal(h.run('playerGarbageDelivery.phase'),'ready');assert(h.run('clearJobs.length>0'));
  assert.equal(h.run('queuePower(playerIncoming)'),76);assert.equal(h.run('playerCancelledTotal'),0);
  h.run('updateIncoming(playerIncoming,"player",3600)');assert.equal(h.run(cells('player')),0);
  h.time(4300);h.run('updateClear(4300);updateMotion(1,4300);gravity();updateMotion(1,4300);updateIncoming(playerIncoming,"player",4300)');
  assert(h.run(cells('player'))>0);assert.equal(h.run('playerGarbageDelivery.phase'),'resolving');
  assert.equal(h.run(cells('player')+'+queuePower(playerIncoming)'),76);
});
test('No forced drop interrupts a conversion older than 8 seconds',()=>{
  const h=harness();support(h,8);h.run('garbage=makeGarbageWave(12);garbage.row=garbage.y=garbage.targetY=6;startConversion();');
  incoming(h,100);h.time(20000);h.run('updateIncoming(playerIncoming,"player",20000)');
  assert.equal(h.run('queuePower(playerIncoming)'),100);assert.equal(h.run('allGarbageObjects().length'),1);
});
test('Unmatured warning packets do not join an earlier wave',()=>{
  const h=harness();support(h,8);h.run('enqueuePackets(playerIncoming,packetsFromPower(12),1000);enqueuePackets(playerIncoming,packetsFromPower(30),3000);');
  h.time(3400);h.run('updateIncoming(playerIncoming,"player",3400)');
  assert.equal(h.run(cells('player')),12);assert.equal(h.run('queuePower(playerIncoming)'),30);
});
test('Committed remainder survives counterattacks until the next wave',()=>{
  const h=harness();support(h);incoming(h);h.run('commitVsPackets("player",[{w:6,h:13,cells:78}]);');
  assert.equal(h.run('queuePower(playerIncoming)'),76);assert.equal(h.run(cells('player')),24);
  assert.equal(h.run('playerCancelledTotal'),0);assert.equal(h.run('queuePower(cpuIncoming)'),78);
});
test('CPU receives the same capacity-limited wave and waits for next clear',()=>{
  const h=harness();support(h,4,'cpu');incoming(h,100,'cpu');
  assert.equal(h.run(cells('cpu')),24);assert.equal(h.run('queuePower(cpuIncoming)'),76);
  h.run('cpuGarbage.y=cpuGarbage.targetY;updateIncoming(cpuIncoming,"cpu",3500);cpuGarbage=null;');
  h.time(20000);h.run('updateIncoming(cpuIncoming,"cpu",20000)');assert.equal(h.run(cells('cpu')),0);
  h.run('for(let c=0;c<4;c++)cpuGrid[11][c].c=5;vsActive=true;cpuClearMatches();');
  assert.equal(h.run('cpuGarbageDelivery.phase'),'ready');assert.equal(h.run('queuePower(cpuIncoming)'),76);
});
test('Sparse 19-cell wave converts to exactly 19 jewels on player and CPU',()=>{
  for(const side of ['player','cpu']){
    const h=harness(),g=side==='player'?'garbage':'cpuGarbage';
    h.run(`${g}=makeGarbageWave(19);${g}.row=${g}.y=${g}.targetY=8;${side==='player'?'startConversion()':'cpuStartConversion()'};`);
    for(let t=1000;t<10000;t+=185){h.time(t);h.run(side==='player'?`updateConversion(${t})`:`updateCpuConversion(${t})`);}
    assert.equal(h.run(`${side==='player'?'grid':'cpuGrid'}.flat().filter(Boolean).length`),19);
    assert.equal(h.run(side==='player'?'conversion':'cpuConversion'),null);
  }
});
test('Original 72-cell overflow freeze completes with hidden-row jewels preserved and animation alive',()=>{
  const h=harness();
  h.run('garbage=makeGarbageWave(72);garbage.row=garbage.y=garbage.targetY=-1;startConversion();comboLevel=3;comboExpireAt=2500;');
  for(let t=1000;t<=15000;t+=16){h.time(t);h.run(`updateConversion(${t});updateMotion(.016,${t});maintainComboWindow(${t});`);}
  assert.equal(h.run('conversion'),null);
  assert.equal(h.run('grid.flat().filter(Boolean).length+overflow.filter(Boolean).length'),72);
  const before=h.frames();h.tick(15020);assert(h.frames()>before);
});
test('Long frame on conversion completion preserves combo on both sides',()=>{
  for(const cpu of [false,true]){
    const h=harness();const g=cpu?'cpuGarbage':'garbage';
    h.run(`${g}=makeGarbageWave(1);${g}.row=${g}.y=${g}.targetY=11;${cpu?'cpuCombo=3;cpuComboExpire=2500;cpuStartConversion();':'comboLevel=3;comboExpireAt=2500;startConversion();'}`);
    h.time(1020);h.run(cpu?'updateCpuConversion(1020);maintainCpuComboWindow(1020)':'updateConversion(1020);maintainComboWindow(1020)');
    h.time(4000);h.run(cpu?'updateCpuConversion(4000);maintainCpuComboWindow(4000)':'updateConversion(4000);maintainComboWindow(4000)');
    assert.equal(h.run(cpu?'cpuCombo':'comboLevel'),3);
  }
});
test('Garbage falling and FLIP protect combo; ordinary horizontal swaps do not',()=>{
  const h=harness();support(h);incoming(h);h.run('comboLevel=3;comboExpireAt=4400;maintainComboWindow(4000)');
  assert.equal(h.run('comboLevel'),3);
  h.run('garbage.y=garbage.targetY;playerFlipHoldUntil=9000;maintainComboWindow(5000)');assert.equal(h.run('comboLevel'),3);
  h.run('playerFlipHoldUntil=0;garbage=null;grid[11][0].x=1;comboExpireAt=1;maintainComboWindow(5000)');assert.equal(h.run('comboLevel'),0);
});
test('Idle combo expires normally and rematch resets delivery gates',()=>{
  const h=harness();support(h);h.run('comboLevel=3;comboExpireAt=2500;maintainComboWindow(2501)');assert.equal(h.run('comboLevel'),0);
  h.run('playerGarbageDelivery.phase="awaitClear";cpuGarbageDelivery.phase="resolving";setupVsBoardForStart();');
  assert.equal(h.run('playerGarbageDelivery.phase'), 'ready');assert.equal(h.run('cpuGarbageDelivery.phase'),'ready');
});
test('Fully removed garbage cannot enter an infinite gravity loop',()=>{
  const h=harness();h.run('garbage=makeGarbageWave(6);garbage.cells.fill(-1);settleGarbage();cpuGarbage=makeGarbageWave(6);cpuGarbage.cells.fill(-1);cpuSettleGarbage();');
  assert.equal(h.run('canGarbageMoveDown()'),false);assert.equal(h.run('cpuCanGarbageDown()'),false);
});

console.log('ALL '+results.length+' TESTS PASSED');
