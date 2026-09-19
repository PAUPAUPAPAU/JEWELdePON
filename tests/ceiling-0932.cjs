const assert=require('assert/strict'),harness=require('./game-harness.cjs');let passed=0;
function test(name,fn){fn();console.log('PASS '+name);passed++;}
function fill(h,side,top){const b=side==='player'?'grid':'cpuGrid',make=side==='player'?'panel':'cpuPanel';h.run(`${b}=Array.from({length:R},()=>Array(C).fill(null));for(let r=${top};r<R;r++)for(let c=0;c<C;c++){const p=${make}(1+(r+c)%5);p.x=p.targetX=c;p.y=p.targetY=r;${b}[r][c]=p;}`);}
test('Full top row blocks 100 repeated rise attempts without creating any hidden jewels',()=>{
  for(const side of ['player','cpu']){const h=harness();fill(h,side,0);const fn=side==='player'?'commitRiseRow':'cpuCommitRise',b=side==='player'?'grid':'cpuGrid',o=side==='player'?'overflow':'cpuOverflow';
    assert(h.run(`Array.from({length:100},()=>${fn}()).every(x=>x===false)`));assert.equal(h.run(`${o}.filter(Boolean).length`),0);assert.equal(h.run(`${b}.flat().filter(Boolean).length`),72);
  }
});
test('Garbage at the ceiling blocks both players even when their top jewel row is empty',()=>{
  for(const side of ['player','cpu']){const h=harness(),g=side==='player'?'garbage':'cpuGarbage',fn=side==='player'?'commitRiseRow':'cpuCommitRise';fill(h,side,3);
    h.run(`${g}=makeGarbageWave(18);${g}.row=${g}.y=${g}.targetY=0;`);
    assert(h.run(`Array.from({length:100},()=>${fn}()).every(x=>x===false)`));assert.equal(h.run(`${g}.row`),0);assert.equal(h.run(`${g}.cells.filter(x=>x>=0).length`),18);
  }
});
test('A nearly full board rises exactly once and then stops, for manual and automatic paths',()=>{
  for(const side of ['player','cpu']){const h=harness();fill(h,side,1);const fn=side==='player'?'commitRiseRow':'cpuCommitRise';assert.equal(h.run(`${fn}()`),true);assert.equal(h.run(`${fn}()`),false);
    h.run('vsActive=true;autoRiseEnabled=true;playerRiseRemain=0;cpuRiseRemain=0;startManualRise();updateRiseSystem(1,3000);updateCpuRise(1,3000)');
    assert.equal(h.run(side==='player'?'manualRise':'cpuAutoStep'),null);assert.equal(h.run(side==='player'?'playerAutoStep':'cpuAutoStep'),null);
  }
});
test('An in-flight rise is cancelled before it can push newly occupied top cells outside',()=>{
  const h=harness();fill(h,'player',0);fill(h,'cpu',0);h.run('vsActive=true;autoRiseEnabled=true;manualRise={start:1000,from:0};manualRiseQueue=4;playerAutoStep={start:1000};cpuAutoStep={start:1000};riseOffset=.5;cpuRiseOffset=.5;updateRiseSystem(1,3000);updateCpuRise(1,3000)');
  assert.equal(h.run('riseOffset+cpuRiseOffset+manualRiseQueue'),0);assert(h.run('manualRise===null&&playerAutoStep===null&&cpuAutoStep===null'));assert.equal(h.run('overflow.filter(Boolean).length+cpuOverflow.filter(Boolean).length'),0);
});
test('100-cell attack with one free row inserts 6, queues 94, and cannot be lifted outside',()=>{
  for(const side of ['player','cpu']){const h=harness();fill(h,side,1);const g=side==='player'?'garbage':'cpuGarbage',rise=side==='player'?'commitRiseRow':'cpuCommitRise';h.run(`enqueuePackets(${side}Incoming,packetsFromPower(100),1000);updateIncoming(${side}Incoming,'${side}',3400)`);
    assert.equal(h.run(`${g}.cells.filter(x=>x>=0).length`),6);assert.equal(h.run(`${g}.row`),0);assert.equal(h.run(`queuePower(${side}Incoming)`),94);assert.equal(h.run(`${rise}()`),false);
  }
});
test('Visible-top danger clears when top is emptied, and rescue processing pauses its timer',()=>{
  for(const side of ['player','cpu']){const h=harness();fill(h,side,0);const update=side==='player'?'updateTopDanger':'updateCpuDanger',timer=side==='player'?'dangerElapsed':'cpuDanger',jobs=side==='player'?'clearJobs':'cpuClearJobs',b=side==='player'?'grid':'cpuGrid';
    h.run(`${update}(2)`);assert.equal(h.run(timer),2000);h.run(`${jobs}=[{}];${update}(3)`);assert.equal(h.run(timer),2000);
    h.run(`${jobs}=[];${b}[0]=Array(C).fill(null);${update}(.016)`);assert.equal(h.run(timer),0);
    h.run(`const q=${side==='player'?'panel':'cpuPanel'}(1);q.y=q.targetY=0;${b}[0][0]=q;${update}(7)`);assert.equal(h.run(side==='player'?'gameOver':'cpuGameOver'),true);
  }
});
test('Garbage conversion frees the visible ceiling and resets danger with surplus still queued',()=>{
  const h=harness();fill(h,'player',1);h.run('enqueuePackets(playerIncoming,packetsFromPower(100),1000);updateIncoming(playerIncoming,"player",3400);garbage.y=garbage.targetY;dangerElapsed=6000;startConversion();updateTopDanger(2)');assert.equal(h.run('dangerElapsed'),6000);
  for(let t=1000;t<5000;t+=185){h.time(t);h.run(`updateConversion(${t})`);}
  h.run('grid[0]=Array(C).fill(null);updateTopDanger(.016)');assert.equal(h.run('dangerElapsed'),0);assert.equal(h.run('queuePower(playerIncoming)'),94);assert.equal(h.run('overflow.filter(Boolean).length'),0);
});
test('Sparse garbage bounds do not falsely stop rise when their top row has no occupied cells',()=>{
  const h=harness();fill(h,'player',3);h.run('garbage=makeGarbageWave(12);garbage.row=garbage.y=garbage.targetY=1;garbage.cells.splice(0,6,...Array(6).fill(-1));');
  assert.equal(h.run('emptyTopRows("player")'),2);assert.equal(h.run('commitRiseRow()'),true);assert.equal(h.run('commitRiseRow()'),true);assert.equal(h.run('commitRiseRow()'),false);
  assert.equal(h.run('emptyTopRows("player")'),0);
  assert.equal(h.run('garbage.row'),0);assert.equal(h.run('garbage.h'),1);
  h.run('flipPlayerBoard(2000)');assert(h.run('garbage.row>=0&&garbage.row+garbage.h<=R'));
});
console.log('ALL '+passed+' CEILING TESTS PASSED');
