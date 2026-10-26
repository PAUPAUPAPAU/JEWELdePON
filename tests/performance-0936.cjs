const assert=require('assert/strict'),make=require('./game-harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
for(const size of [100,1000,10000]){
 const results=[];
 for(const version of ['0935','0936']){
  const h=make(version);h.run(`globalThis.reads=0;const original=packetCells;packetCells=p=>{reads++;return original(p);};globalThis.q=Array.from({length:${size}},()=>({cells:6,createdAt:0,readyAt:2400}));`);
  assert.equal(h.run('Math.min(72,readyGarbagePower(q,3000,72))'),72);results.push(h.run('reads'));
 }
 assert.equal(results[0],size);assert.equal(results[1],12);console.log(`PASS ${size} queued attacks: readiness reads ${results[0]} -> ${results[1]} with identical deliverable amount`);
}
for(const top of [0,1,4,12])for(const size of [4,19,100,1000]){
 const states=[];
 for(const version of ['0935','0936']){
  const h=make(version);h.run(`for(let r=${top};r<R;r++)for(let c=0;c<C;c++){const p=panel(1+(r+c)%7);p.x=p.targetX=c;p.y=p.targetY=r;grid[r][c]=p;}enqueuePackets(playerIncoming,packetsFromPower(${size}),0);`);
  h.time(3000);h.run('updateIncoming(playerIncoming,"player",3000)');states.push(plain(h.run('({garbage,playerIncoming,playerGarbageDelivery})')));
 }
 assert.deepEqual(states[0],states[1]);
}
console.log('PASS unchanged wave contents, warning ages, remainder and delivery phase across 16 capacity/attack scenarios');
{
 const h=make();h.run(`globalThis.referenceTouch=(a,b)=>{const bs=new Set(garbageObjectCells(b).map(x=>x[0]+','+x[1]));return garbageObjectCells(a).some(([r,c])=>bs.has((r+1)+','+c)||bs.has((r-1)+','+c)||bs.has(r+','+(c+1))||bs.has(r+','+(c-1)));};`);
 assert(h.run(`(()=>{for(let i=0;i<3000;i++){const a=makeGarbageWave(1+Math.floor(Math.random()*72)),b=makeGarbageWave(1+Math.floor(Math.random()*72));for(const g of [a,b]){g.row=Math.floor(Math.random()*15)-3;g.col=Math.floor(Math.random()*6);g.cells=g.cells.map(v=>Math.random()<.35?-1:v);}if(garbageObjectsTouch(a,b)!==referenceTouch(a,b))return false;}return true;})()`));
}
console.log('PASS allocation-free touching test matches previous behavior for 3,000 sparse/offset slab pairs');
{
 const writes=[];
 for(const version of ['0935','0936']){
  const h=make(version);h.run(`globalThis.writes=0;for(const el of [riseLevelEl,riseYouEl,riseCpuEl,remain]){let value=el.textContent;Object.defineProperty(el,'textContent',{get:()=>value,set:v=>{writes++;value=v;},configurable:true});}for(let n=0;n<600;n++){updateRiseHud(1000);updateMeter();}`);writes.push(h.run('writes'));
 }
 assert.equal(writes[0],2400);assert(writes[1]<=4);console.log(`PASS unchanged HUD over 600 frames: text writes ${writes[0]} -> ${writes[1]}`);
 const h=make();h.run(`globalThis.strokes=0;ctx.strokeRect=()=>strokes++;drawBoard(1000);drawCpu(1000);globalThis.firstPlayer=boardBackgrounds.player.sheet;strokes=0;for(let n=0;n<600;n++){drawBoard(1000);drawCpu(1000);}`);
 assert.equal(h.run('strokes'),0);assert(h.run('boardBackgrounds.player.sheet===firstPlayer'));
 h.run('W+=6;CW=W/C;drawBoard(1000)');assert(h.run('boardBackgrounds.player.sheet!==firstPlayer'));assert.equal(h.run('strokes'),72);
}
console.log('PASS cached board frames eliminate 86,400 repeated grid strokes over 600 frames; resize rebuilds the cache');
