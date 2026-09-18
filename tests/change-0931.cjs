const assert=require('assert/strict'),harness=require('./game-harness.cjs');
const service=require('../board-change-0931.cjs');let count=0;
function test(name,fn){fn();console.log('PASS '+name);count++;}
const plain=x=>JSON.parse(JSON.stringify(x));
function board(h,side,color){const b=side==='cpu'?'cpuGrid':'grid',p=side==='cpu'?'cpuPanel':'panel';h.run(`for(let c=0;c<C;c++){const p=${p}(${color});p.x=p.targetX=c;p.y=p.targetY=11;${b}[11][c]=p;}`);}
const room=()=>({matchId:1,players:new Map([['a',{}],['b',{}]]),matchEnded:false});
test('Item rows rise slightly to 28%; FLIP and CHANGE have equal 7.5% bands',()=>{
  const h=harness();assert.equal(h.run('SPECIAL_INCOMING_CHANCE'),.28);
  const rates=plain(h.run(`(()=>{const old=Math.random,out={};for(let n=0;n<10000;n++){Math.random=()=>(n+.5)/10000;const t=randomSpecialType();out[t]=(out[t]||0)+1;}Math.random=old;return out;})()`));
  assert.equal(rates.flip,750);assert.equal(rates.change,750);assert.equal(Object.values(rates).reduce((a,b)=>a+b),10000);
});
test('Local exchange swaps jewels, pink, special items and garbage, keeping scores, queues and next rows',()=>{
  const h=harness();board(h,'player',1);board(h,'cpu',6);
  h.run(`vsActive=true;grid[11][0].special='bomb';cpuGrid[11][0].special='change';garbage=makeGarbageWave(6);garbage.row=garbage.y=garbage.targetY=10;score=900;cpuScore=700;enqueuePackets(playerIncoming,packetsFromPower(12),1000);nextRow=makeIncomingRow();cpuNextRow=makeIncomingRow();`);
  const next=h.run('nextRow');h.run('comboLevel=5;cpuCombo=7;requestBoardChange();updateBoardChange(1000)');
  assert.equal(h.run('grid[11][0].c'),6);assert.equal(h.run('cpuGrid[11][0].c'),1);assert.equal(h.run('grid[11][0].special'),'change');assert.equal(h.run('cpuGrid[11][0].special'),'bomb');assert.equal(h.run('garbage'),null);assert.equal(h.run('cpuGarbage.cells.length'),6);
  assert.equal(h.run('score'),900);assert.equal(h.run('cpuScore'),700);assert.equal(h.run('queuePower(playerIncoming)'),12);assert.equal(h.run('nextRow'),next);assert.equal(h.run('comboLevel+cpuCombo'),0);assert.equal(h.run('boardChange.pending'),false);
});
test('A cleared CHANGE triggers one exchange, waits for clearing, and cannot resurrect itself',()=>{
  const h=harness();board(h,'player',1);board(h,'cpu',2);h.run("vsActive=true;grid[11][0].special='change';clearMatches();updateBoardChange(1000)");
  assert.equal(h.run('boardChange.pending'),true);assert.equal(h.run('grid[11][0].c'),1);
  h.time(2000);h.run('updateClear(2000);updateBoardChange(2000)');assert.equal(h.run('boardChange.pending'),false);assert.equal(h.run('grid[11][0].c'),2);assert.equal(h.run('cpuGrid.flat().filter(Boolean).length'),0);
});
test('Conversion and motion must finish; warning delivery and new manual input wait',()=>{
  const h=harness();board(h,'player',1);board(h,'cpu',2);h.run('vsActive=true;requestBoardChange();conversion={};updateBoardChange(1000);startManualRise();');
  assert.equal(h.run('boardChange.pending'),true);assert.equal(h.run('manualRise'),null);
  h.run('enqueuePackets(playerIncoming,packetsFromPower(12),0);updateIncoming(playerIncoming,"player",5000)');assert.equal(h.run('garbage'),null);
  h.run('conversion=null;updateBoardChange(5000)');assert.equal(h.run('grid[11][0].c'),2);
});
test('Server exchange waits for both boards, coalesces simultaneous requests and preserves first ready snapshot',()=>{
  const r=room(),h=harness(),events=[];board(h,'player',1);const a=plain(h.run('exportChangeBoard("player")'));board(h,'cpu',6);const b=plain(h.run('exportChangeBoard("cpu")'));
  const go=(clientId,action,extra={})=>service.handle(r,{clientId,action,...extra},(_,m)=>events.push(plain(m)),1000).change;
  assert.equal(go('a','request').id,1);assert.equal(go('b','request').id,1);
  assert.equal(go('a','ready',{id:1,board:a}).status,'pending');go('a','ready',{id:1,board:b});
  const done=go('b','ready',{id:1,board:b});assert.equal(done.status,'committed');assert.equal(done.boards.a.grid[11][0].c,1);assert.equal(events.filter(e=>e.change.status==='committed').length,1);
  go('a','ready',{id:1,board:a});assert.equal(events.length,2);
  assert.equal(go('a','request').id,1);go('a','status',{ack:1});go('b','status',{ack:1});assert.equal(go('a','request').id,2);
});
test('Two online clients exchange exactly once and reject stale remote snapshots',()=>{
  const r=room(),a=harness(),b=harness();board(a,'player',1);board(b,'player',6);
  for(const [h,id] of [[a,'a'],[b,'b']])h.run(`onlineMatchActive=true;lobbyRoomCode='123456';netClientId='${id}';onlineMatchId=1;vsActive=true;changeNetwork=async()=>{};`);
  const prep=service.handle(r,{clientId:'a',action:'request'},()=>{},1000).change;
  for(const h of [a,b]){h.run(`receiveBoardChange(${JSON.stringify(prep)});updateBoardChange(1000)`);assert.equal(h.run('boardChange.lockedAt'),1000);}
  service.handle(r,{clientId:'a',action:'ready',id:1,board:plain(a.run('boardChange.board'))},()=>{},1000);
  const done=service.handle(r,{clientId:'b',action:'ready',id:1,board:plain(b.run('boardChange.board'))},()=>{},1000).change;
  for(const h of [a,b])h.run(`receiveBoardChange(${JSON.stringify(done)});receiveBoardChange(${JSON.stringify(done)})`);
  assert.equal(a.run('grid[11][0].c'),6);assert.equal(b.run('grid[11][0].c'),1);assert.equal(a.run('changeApplied'),1);assert.equal(a.run('boardChange.lockedAt'),null);
  a.run('cpuGrid=cpuEmptyGrid();applyRemoteGameState({clientId:"b",matchId:1,seq:100,state:{changeEpoch:0,grid:[]}})');assert.equal(a.run('cpuGrid.flat().filter(Boolean).length'),0);
});
test('Timeout cancels without swapping; malformed boards are rejected',()=>{
  const r=room();service.handle(r,{clientId:'a',action:'request'},()=>{},1000);
  assert.throws(()=>service.handle(r,{clientId:'a',action:'ready',id:1,board:{}},()=>{},1000),/BAD_CHANGE_BOARD/);
  assert.equal(service.handle(r,{clientId:'a',action:'status'},()=>{},31000).change.status,'cancelled');
  const h=harness();board(h,'player',1);h.run('onlineMatchActive=true;lobbyRoomCode="123456";netClientId="a";onlineMatchId=1;vsActive=true;changeNetwork=async()=>{};receiveBoardChange({id:1,matchId:1,status:"pending"});updateBoardChange(1000);');
  h.time(31000);h.run('receiveBoardChange({id:1,matchId:1,status:"cancelled"})');assert.equal(h.run('boardChange.pending'),false);assert.equal(h.run('grid[11][0].c'),1);
});
test('Hidden row blocks transfer, IDs regenerate, and a rematch clears exchange state',()=>{
  const h=harness();board(h,'player',1);board(h,'cpu',2);h.run('for(let r=0;r<11;r++){const p=cpuPanel(2);p.x=p.targetX=0;p.y=p.targetY=r;cpuGrid[r][0]=p;}cpuOverflow[0]=cpuPanel(6);cpuOverflow[0].x=cpuOverflow[0].targetX=0;cpuOverflow[0].y=cpuOverflow[0].targetY=-1;vsActive=true;requestBoardChange();updateBoardChange(1000)');
  assert.equal(h.run('overflow[0].c'),6);assert(h.run('new Set(grid.flat().filter(Boolean).concat(overflow.filter(Boolean)).map(p=>p.id)).size===grid.flat().filter(Boolean).length+1'));
  h.run('changeApplied=7;setupVsBoardForStart()');assert.equal(h.run('changeApplied'),0);assert.equal(h.run('boardChange.pending'),false);
});
console.log('ALL '+count+' CHANGE TESTS PASSED');
