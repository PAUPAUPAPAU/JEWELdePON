const assert=require('assert/strict'),harness=require('./game-harness.cjs');
let count=0;
function test(name,fn){fn();console.log('PASS '+name);count++;}
test('A falling jewel pauses 400ms remaining without refilling on either side',()=>{
  for(const side of ['player','cpu']){
    const h=harness(),cpu=side==='cpu',level=cpu?'cpuCombo':'comboLevel',expire=cpu?'cpuComboExpire':'comboExpireAt',board=cpu?'cpuGrid':'grid',panel=cpu?'cpuPanel':'panel',maintain=cpu?'maintainCpuComboWindow':'maintainComboWindow';
    h.run(`${level}=4;${expire}=1400;${board}[11][0]=${panel}(1);${board}[11][0].y=9;${board}[11][0].targetY=11;${maintain}(1000);`);
    h.time(1200);h.run(`${maintain}(1200);${maintain}(1200)`);
    assert.equal(h.run(`${expire}-1200`),400);
    h.run(`${board}[11][0].y=11;${maintain}(1200)`);
    h.time(1500);h.run(`${maintain}(1500)`);assert.equal(h.run(`${expire}-1500`),100);
    h.time(1601);h.run(`${maintain}(1601)`);assert.equal(h.run(level),0);
  }
});
test('Expired combo cannot be revived by starting a drop or special effect',()=>{
  const h=harness();h.run('comboLevel=5;comboExpireAt=900;manualRise={start:1000};maintainComboWindow(1000)');assert.equal(h.run('comboLevel'),0);
});
test('Real clear refreshes grace; multi-second conversion freezes remaining time',()=>{
  const h=harness();h.run('for(let c=0;c<3;c++){const p=panel(1);p.x=p.targetX=c;p.y=p.targetY=11;grid[11][c]=p;}comboLevel=2;comboExpireAt=1100;clearMatches();');
  assert.equal(h.run('comboLevel'),3);assert.equal(h.run('comboExpireAt'),2500);
  h.time(6000);h.run('maintainComboWindow(6000)');assert.equal(h.run('comboExpireAt-6000'),1500);
});
test('Pause shifts the combo observation clock once, without double-crediting',()=>{
  const h=harness();h.run('comboLevel=3;comboExpireAt=1400;manualRise={start:1000};maintainComboWindow(1000);shiftPauseTimers(10000)');
  h.time(11000);h.run('maintainComboWindow(11000)');assert.equal(h.run('comboExpireAt-11000'),400);
});
test('Warning can be countered before 2.4s, but locks at the exact boundary',()=>{
  const h=harness();h.run('enqueuePackets(playerIncoming,packetsFromPower(24),1000)');
  h.time(3399);assert.equal(h.run('cancelIncoming(playerIncoming,6).cancelled'),6);
  h.time(3400);assert.equal(h.run('cancelIncoming(playerIncoming,99).cancelled'),0);
  h.run('enqueuePackets(playerIncoming,packetsFromPower(12),3400)');
  assert.equal(h.run('cancelIncoming(playerIncoming,99).cancelled'),12);assert.equal(h.run('queuePower(playerIncoming)'),18);
});
test('Each combo attacks, growing from 6 to 24 cells; 50-combo delivers 1002 cells',()=>{
  const h=harness();for(const [combo,cells] of [[1,0],[2,6],[4,6],[5,12],[9,12],[10,18],[19,18],[20,24],[50,24]])assert.equal(h.run(`pulsePacketForCombo(${combo})?.cells||0`),cells);
  h.run('for(let n=1;n<=50;n++)processVsAttack("player",3,n)');assert.equal(h.run('queuePower(cpuIncoming)'),1002);
  h.run('processVsAttack("player",3,50)');assert.equal(h.run('queuePower(cpuIncoming)'),1002);
});
test('Pink begins at 120 seconds and generation stays within the active palette',()=>{
  const h=harness();h.run('resetStepRiseClocks(1000)');
  h.time(120999);assert.equal(h.run('activeColorCount()'),5);assert(h.run('Array.from({length:1000},rnd).every(c=>c>=1&&c<=5)'));
  h.time(121000);assert.equal(h.run('activeColorCount()'),6);assert(h.run('Array.from({length:1000},rnd).includes(6)'));
  assert(h.run('Array.from({length:100},makeRow).flat().some(p=>p.c===6)'));
  h.run('resetStepRiseClocks(121000)');assert.equal(h.run('activeColorCount()'),5);
});
test('Rise accelerates to 1.2 sec; resolution holds insertion but not countdown or accumulated debt',()=>{
  const h=harness();h.run('resetStepRiseClocks(1000);autoRiseEnabled=true;vsActive=true');
  assert.equal(h.run('riseStage(1000).sec'),8.3);assert.equal(h.run('riseStage(421000).sec'),1.2);
  h.run('clearJobs=[{}];cpuClearJobs=[{}];playerRiseRemain=100;cpuRiseRemain=100;updateRiseSystem(1,2000);updateCpuRise(1,2000)');
  assert.equal(h.run('playerRiseRemain'),0);assert.equal(h.run('cpuRiseRemain'),0);assert.equal(h.run('playerAutoStep'),null);assert.equal(h.run('cpuAutoStep'),null);
  h.run('clearJobs=[];cpuClearJobs=[];updateRiseSystem(.016,2100);updateCpuRise(.016,2100)');assert(h.run('!!playerAutoStep&&!!cpuAutoStep'));
});
console.log('ALL '+count+' BALANCE TESTS PASSED');
