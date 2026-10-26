const assert=require('assert/strict'),harness=require('./game-harness.cjs'),{sanitizeBoard}=require('../board-change-0931.cjs');
const h=harness();h.run('resetStepRiseClocks(1000)');
for(const [time,colors] of [[1000,5],[120999,5],[121000,6],[240999,6],[241000,7]]){
 h.time(time);assert.equal(h.run('activeColorCount()'),colors);
 assert(h.run(`Array.from({length:2000},rnd).every(c=>c>=1&&c<=${colors})`));
}
assert(h.run('Array.from({length:2000},rnd).includes(7)'));
assert(h.run('Array.from({length:100},makeIncomingRow).flat().some(p=>p.c===7)'));
assert(h.run('Array.from({length:100},cpuMakeRow).flat().some(p=>p.c===7)'));
h.run('for(let c=0;c<3;c++){const p=panel(7);p.x=p.targetX=c;p.y=p.targetY=11;grid[11][c]=p;}clearMatches()');
assert.equal(h.run('clearJobs[0].ids.length'),3);
const board=JSON.parse(JSON.stringify(h.run('exportChangeBoard("player")')));
assert.equal(sanitizeBoard(board).grid[11][0].c,7);
board.grid[11][0].c=8;assert.throws(()=>sanitizeBoard(board),/BAD_CHANGE_BOARD/);
h.run('setupVsBoardForStart()');assert.equal(h.run('activeColorCount()'),5);
assert(h.run('grid.flat().filter(Boolean).every(p=>p.c<=5)'));
console.log('PASS seventh-color timing, generators, match clearing, CHANGE transport, invalid color and rematch reset');
