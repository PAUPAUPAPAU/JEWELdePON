const assert=require('node:assert/strict'),make=require('./game-harness.cjs'),core=require('../port-core-0940.js');
let total=0;const tests=[];function test(name,fn){tests.push({name,fn});}const plain=x=>JSON.parse(JSON.stringify(x));
function h(){const x=make('0940');x.run('for(let i=0;i<6;i++)incomingPreviewCells[i]=document.createElement("div");');return x;}
function online(x,host=true){x.run(`onlineMatchActive=true;lobbyRoomCode='0072';netClientId='self';onlineMatchId=1;localIsHost=${host};portMode='online';portSeries.target=2;portSeries.syncing=true;`);}
test('40% per row, cap three, one initial item and exact item weights',()=>{
 const x=h();assert.equal(x.run('SPECIAL_INCOMING_CHANCE'),.4);
 const counts={};for(let i=0;i<148000;i++){const t=core.special((i+.5)/148000);counts[t]=(counts[t]||0)+1;}
 assert.deepEqual(counts,{flip:22200,change:11100,row:27900,col:27900,bomb:24800,burst:15500,cut:18600});
 x.run('portNativeRandom=()=>.399;globalThis.row=Array.from({length:6},(_,i)=>panel(1+i%5));maybeAssignSpecialToRow(row);');assert.equal(x.run('row.filter(p=>p.special).length'),1);
 x.run('portNativeRandom=()=>.4;row=Array.from({length:6},(_,i)=>panel(1+i%5));maybeAssignSpecialToRow(row);');assert.equal(x.run('row.filter(p=>p.special).length'),0);
 x.run('for(let c=0;c<3;c++){grid[11][c]=panel(c+1);grid[11][c].special="bomb";}portNativeRandom=()=>0;row=Array.from({length:6},(_,i)=>panel(1+i%5));maybeAssignSpecialToRow(row);');assert.equal(x.run('row.filter(p=>p.special).length'),0);
 x.run('portNativeRandom=Math.random;setupVsBoardForStart()');assert.equal(x.run('countPlayerSpecials()'),1);assert.equal(x.run('countCpuSpecials()'),1);
});
test('Uncapped simultaneous/chain attacks add on every clear',()=>{
 const x=h();for(const n of [3,4,5,6,7,12,36])assert.equal(core.attackPower(n,1),n>=4?n:0);
 for(const [n,p] of [[1,0],[2,6],[4,6],[5,12],[9,12],[10,18],[19,18],[20,24],[21,24],[22,30],[23,30],[24,36],[50,114],[100,264]])assert.equal(x.run(`pulsePacketForCombo(${n})?.cells||0`),p);
 x.run('processVsAttack("player",8,22)');assert.equal(x.run('queuePower(cpuIncoming)'),38);x.run('processVsAttack("player",3,1);processVsAttack("player",3,2)');assert.equal(x.run('queuePower(cpuIncoming)'),44);
});
test('Normal cancellation excludes exactly matured and committed garbage',()=>{
 const x=h();x.run('enqueuePackets(playerIncoming,packetsFromPower(24),1000)');x.time(3399);assert.equal(x.run('cancelIncoming(playerIncoming,6).cancelled'),6);x.time(3400);assert.equal(x.run('cancelIncoming(playerIncoming,999).cancelled'),0);
 x.run('enqueuePackets(playerIncoming,packetsFromPower(12),3400);commitVsPackets("player",packetsFromPower(20))');assert.equal(x.run('queuePower(playerIncoming)'),18);assert.equal(x.run('queuePower(cpuIncoming)'),8);
 x.run('commitVsPackets("cpu",packetsFromPower(20))');assert.equal(x.run('queuePower(cpuIncoming)'),0);assert.equal(x.run('queuePower(playerIncoming)'),30);
});
test('Large attacks send every cell in batches of 8 x 24 and never leak into a new round',async()=>{
 const x=h();online(x);x.run('globalThis.sent=[];netPost=async(path,data)=>{sent.push(data);return {ok:true};};');await x.run('portSendAttack(10001)');assert.equal(x.run('sent.reduce((s,d)=>s+d.payload.packets.reduce((n,p)=>n+p.cells,0),0)'),10001);assert(x.run('sent.every(d=>d.payload.packets.length<=8&&d.payload.packets.every(p=>p.cells<=24))'));
 x.run('globalThis.release=null;sent=[];netPost=(path,data)=>{sent.push(data);return new Promise(r=>release=r);};');const p=x.run('portSendAttack(999)');x.run('portResetRound();onlineMatchId=2;release({ok:true});');await p;assert.equal(x.run('sent.length'),1);
});
test('2/3-win series continue, deduplicate results and reset only after decision',()=>{
 for(const target of [2,3]){const x=h();x.run(`portSeries.target=${target};portStartedAt=1000;`);
 for(let n=1;n<=target;n++){x.run('setupVsBoardForStart();finishMatch("win",6000);finishMatch("win",6000)');assert.equal(x.run('portSeries.wins'),n);assert.equal(x.run('portSeries.over'),n===target);}
 x.run('setupVsBoardForStart()');assert.equal(x.run('portSeries.wins'),0);assert.equal(x.run('portSeries.over'),false);}
});
test('v2 host/guest handshake agrees on target/start before countdown',()=>{
 const a=h(),b=h();online(a);online(b,false);b.run('portSeries.target=null;');b.run('portReceiveState({state:'+JSON.stringify(plain(a.run('serializePlayerState()')))+'})');assert.equal(b.run('portSeries.target'),2);assert.equal(b.run('portSeries.ready'),false);
 a.run('portReceiveState({state:'+JSON.stringify(plain(b.run('serializePlayerState()')))+'})');assert.equal(a.run('portSeries.ready'),true);
 b.run('portReceiveState({state:'+JSON.stringify(plain(a.run('serializePlayerState()')))+'})');assert.equal(b.run('portSeries.ready'),true);assert.equal(a.run('onlineStartAtWall'),b.run('onlineStartAtWall'));
});
test('Final stats synchronize after finish; old periodic values are never presented as final',()=>{
 const x=h();online(x);x.run('portStats.player={cleared:100,converted:24,chain:22};portStats.cpu={cleared:1,converted:0,chain:1};finishMatch("win",2000);portRenderResults()');assert(x.run('portResultStats.textContent.includes("受信中")'));
 x.run('applyRemoteGameState({clientId:"other",matchId:1,seq:9,state:{final:true,stats:{cleared:95,converted:32,chain:24}}});');assert.equal(x.run('portRemoteFinal'),true);assert.equal(x.run('portStats.cpu.converted'),32);assert(!x.run('portResultStats.textContent.includes("受信中")'));
 x.run('applyRemoteGameState({clientId:"other",matchId:1,seq:10,state:{final:false,stats:{cleared:1,converted:1,chain:1}}});');assert.equal(x.run('portStats.cpu.converted'),32);
 x.run('portResetRound()');assert.equal(x.run('portStats.player.cleared'),0);assert.equal(x.run('portRemoteFinal'),false);
});
test('Actual clear and conversion count cells separately; board swap keeps personal stats',()=>{
 const x=h();x.run('for(let c=0;c<3;c++){const p=panel(1);p.x=p.targetX=c;p.y=p.targetY=11;grid[11][c]=p;}clearMatches();');assert.equal(x.run('portStats.player.cleared'),3);assert.equal(x.run('portStats.player.chain'),1);assert.equal(x.run('portStats.player.converted'),0);
 x.run('portStats.player.converted=12;portStats.cpu.converted=7;requestBoardChange();');assert.equal(x.run('portStats.player.converted'),12);
});
test('Training fixed palette/manual ceiling and deterministic retry; no records',()=>{
 const x=h();x.run('portMode="training";portTraining.colors=7;portTraining.seed=123;setupVsBoardForStart();globalThis.initial=JSON.stringify(grid.map(r=>r.map(p=>p&&[p.c,p.special])));setupVsBoardForStart();');assert(x.run('initial===JSON.stringify(grid.map(r=>r.map(p=>p&&[p.c,p.special])))'));assert.equal(x.run('activeColorCount(1)'),7);
 x.run('grid[0][0]=panel(1);updateTopDanger(100);');assert.equal(x.run('gameOver'),false);x.run('finishMatch("win",5000)');assert.equal(x.run('portRecords.games'),0);
});
test('Records preserve old fields, reject handicap/aborted/training, keep valid personal best',()=>{
 const x=h();x.run('portRecords={legacy:42,battle:{time:15,chain:5}};portStats.player.chain=22;portStartedAt=1000;finishMatch("win",21000)');assert.equal(x.run('portRecords.legacy'),42);assert.equal(x.run('portRecords.battle.time'),20);assert.equal(x.run('portRecords.battle.chain'),22);
 x.run('setupVsBoardForStart();portConfig.handicap="player";portStats.player.chain=100;finishMatch("win",100000)');assert.equal(x.run('portRecords.battle.chain'),22);
});
test('Own top three rows drive pinch music; opponent danger does not',()=>{
 const x=h();x.run('vsActive=true;cpuGrid[0][0]=cpuPanel(1)');assert.equal(x.run('eitherPlayerDanger()'),false);x.run('grid[2][0]=panel(1)');assert.equal(x.run('eitherPlayerDanger()'),true);
});
test('Touch micro-jitter, continued travel, stop, reversal, release and vanished jewel',()=>{
 const x=h();x.run('grid[11][0]=panel(1);grid[11][0].x=grid[11][0].targetX=0;grid[11][0].y=grid[11][0].targetY=11;drag={id:grid[11][0].id,gx:.5,moved:false};moveDraggedJewel(.6);');assert.equal(x.run('drag.moved'),false);
 x.run('moveDraggedJewel(.71)');assert.equal(x.run('findLogical(drag.id).c'),1);x.run('moveDraggedJewel(1.71)');assert.equal(x.run('findLogical(drag.id).c'),2);x.run('moveDraggedJewel(1.71)');assert.equal(x.run('findLogical(drag.id).c'),2);x.run('moveDraggedJewel(1.49)');assert.equal(x.run('findLogical(drag.id).c'),1);
 x.run('globalThis.id=drag.id;grid=findLogical(id)?grid.map(row=>row.map(p=>p?.id===id?null:p)):grid;moveDraggedJewel(4)');assert.equal(x.run('findLogical(id)'),null);
});
test('Garbage component cache invalidates occupancy, movement and replacement',()=>{
 const x=h();x.run('garbage=makeGarbageWave(6);garbage.row=garbage.y=garbage.targetY=10;extraGarbages=[makeGarbageWave(6)];extraGarbages[0].row=extraGarbages[0].y=extraGarbages[0].targetY=9;globalThis.a=connectedPlayerGarbageGroup(garbage);');assert.equal(x.run('a.length'),2);assert(x.run('a===connectedPlayerGarbageGroup(garbage)'));
 x.run('extraGarbages[0].row=5');assert.equal(x.run('connectedPlayerGarbageGroup(garbage).length'),1);x.run('garbage.cells.fill(-1)');assert.equal(x.run('connectedPlayerGarbageGroup(garbage).length'),1);
});
test('Ten minutes of seven-color drawing and audio retain bounded state',()=>{
 const x=h();x.run('portInSetup=false;portMode="training";portTraining.colors=7;portTraining.interval=0;startVsMode();autoRiseEnabled=false;audioUnlocked=true;');
 const start=performance.now();for(let t=1000;t<=601000;t+=16){x.tick(t);if(t%160===40)x.run('playSfx("swap")');}
 assert.equal(x.run('activeColorCount()'),7);assert(x.run('portVoices.length<=8'));assert(x.run('particles.length<1000'));assert.equal(x.run('gameOver'),false);console.log('  simulation ms:',Math.round(performance.now()-start));
});
test('Saved names, mute, volume, quality and legacy record fields survive initialization',()=>{
 const x=make('0940',{storage:{jdp_player_name:'保存した名前',jdp_html_settings_v1:JSON.stringify({bgm:.17,sfx:0,quality:'low',bgmOn:false,sfxOn:false,custom:77}),jdp_html_records_v1:JSON.stringify({games:9,battle:{time:120,chain:30},legacy:'keep'})}});
 assert.equal(x.run('playerCustomName'),'保存した名前');assert.equal(x.run('portConfig.bgm'),.17);assert.equal(x.run('portConfig.sfx'),0);assert.equal(x.run('bgmUserOn'),false);assert.equal(x.run('sfxUserOn'),false);assert.equal(x.run('renderScale'),1);assert.equal(x.run('portConfig.custom'),77);assert.equal(x.run('portRecords.legacy'),'keep');
});
test('CPU CHANGE notices use the correct owner, and reduced effects add no shake or wait',()=>{
 const x=h();x.run('portConfig.reduced=true;beginSpecialPause("cpu","change",11,1,1000);globalThis.hold=cpuSpecialPauseUntil;requestBoardChange("cpu")');assert.equal(x.run('portMagic.cpu.role'),'caster');assert.equal(x.run('portMagic.player.role'),'receiver');assert.equal(x.run('cpuSpecialPauseUntil'),x.run('hold'));x.run('triggerShake("player",9,500)');assert.equal(x.run('playerShakeUntil'),0);
});
test('Final snapshots remain frozen even if a late callback tries to clear',()=>{
 const x=h();online(x);x.run('portStats.player={cleared:21,converted:12,chain:5};finishMatch("win",2000);portStats.player.cleared=99;clearMatches()');assert.equal(x.run('serializePlayerState().stats.cleared'),21);assert.equal(x.run('portOwnFinal.cleared'),21);
});
test('Falling jewels are selected at their drawn position; input neither repaints nor transfers a deleted ID',()=>{
 const x=h();x.run('globalThis.p=panel(2);p.x=p.targetX=2;p.y=8.4;p.targetY=11;grid[11][2]=p;globalThis.draws=0;drawBoard=()=>draws++;drawCpu=()=>draws++;canvas.dispatch("pointerdown",{pointerId:31,clientX:150,clientY:528})');assert.equal(x.run('drag.id'),x.run('p.id'));
 x.run('canvas.dispatch("pointermove",{pointerId:31,clientX:166,clientY:528})');assert.equal(x.run('findLogical(p.id).c'),3);assert.equal(x.run('draws'),0);
 x.run('grid[11][3]=panel(4);globalThis.other=grid[11][3];canvas.dispatch("pointerup",{pointerId:31,clientX:166,clientY:528})');assert.equal(x.run('grid[11][3]===other'),true);assert.equal(x.run('draws'),0);
 const y=h();y.run('grid[11][0]=panel(1);grid[11][0].x=grid[11][0].targetX=0;grid[11][0].y=grid[11][0].targetY=11;canvas.dispatch("pointerdown",{pointerId:1,clientX:30,clientY:690});canvas.dispatch("pointermove",{pointerId:1,clientX:36,clientY:690});canvas.dispatch("pointerup",{pointerId:1,clientX:36,clientY:690});');assert.equal(y.run('grid[11][1].c'),1);
});
(async()=>{for(const t of tests){await t.fn();total++;console.log('PASS '+t.name);}console.log('ALL '+total+' PORT TESTS PASSED');})().catch(e=>{console.error(e);process.exitCode=1});
