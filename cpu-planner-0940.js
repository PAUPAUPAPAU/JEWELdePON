(function(root){
'use strict';
const settings={NORMAL:[1,4],HARD:[2,6],VERYHARD:[3,8],GOD:[4,10]};
function key(grid){return grid.map(row=>row.join(',')).join(';')}
function options(grid){const moves=[];for(let r=0;r<12;r++)for(let c=0;c<5;c++){const a=grid[r][c],b=grid[r][c+1];if((a||b)&&a!==b&&a!==6&&b!==6)moves.push([r,c])}return moves}
function resolve(input,move){const g=input.map(row=>row.slice());const [r,c]=move;[g[r][c],g[r][c+1]]=[g[r][c+1],g[r][c]];let gain=0,chains=0,seals=0;
 for(let turn=0;turn<12;turn++){
  // Seals are treated as fixed barriers in the bounded planning approximation.
  for(let row=10;row>=0;row--)for(let col=0;col<6;col++)if(g[row][col]&&g[row][col]!==6){let to=row;while(to<11&&!g[to+1][col])to++;if(to!==row){g[to][col]=g[row][col];g[row][col]=0}}
  const hits=new Set();for(let row=0;row<12;row++)for(let col=0;col<6;col++){const t=g[row][col];if(!t||t===6)continue;for(const [dr,dc] of [[0,1],[1,0]]){const cells=[];let y=row,x=col;while(y<12&&x<6&&g[y][x]===t){cells.push(y*6+x);y+=dr;x+=dc}if(cells.length>=3)cells.forEach(i=>hits.add(i))}}
  if(!hits.size)break;chains++;gain+=hits.size*10+chains*chains*14;
  const adjacent=new Set();for(const i of hits){const row=Math.floor(i/6),col=i%6;for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){const y=row+dr,x=col+dc;if(g[y]?.[x]===6)adjacent.add(y*6+x)}}seals+=adjacent.size;
  for(const i of hits)g[Math.floor(i/6)][i%6]=0;
 }
 let danger=0,potential=0;for(let row=0;row<12;row++)for(let col=0;col<6;col++){const t=g[row][col];if(!t)continue;danger+=(12-row)*(row<4?3:1);if(t!==6){if(g[row][col+1]===t)potential+=3;if(g[row+1]?.[col]===t)potential+=3;if(g[row][col+2]===t)potential+=2}}
 return {grid:g,gain,chains,score:gain+seals*30+potential-danger*.7};
}
function plan(grid,level='NORMAL',specials=[]){const [depth,width]=settings[level]||settings.NORMAL;let beam=[{grid,score:0,gain:0,first:null,path:[]}],best=null,nodes=0;const seen=new Set([key(grid)]);
 for(let d=0;d<depth;d++){const candidates=[];for(const state of beam)for(const move of options(state.grid)){const next=resolve(state.grid,move);nodes++;const signature=key(next.grid);if(seen.has(signature))continue;seen.add(signature);const first=state.first||move;const bonus=d===0?specials.reduce((sum,p)=>sum+(next.grid[p.r]?.[p.c]===0?12:0),0):0;const gain=state.gain+next.gain;const score=next.score+state.gain+bonus-d*5;const entry={...next,score,gain,first,path:state.path.concat([move])};candidates.push(entry);if(!best||score>best.score)best=entry}candidates.sort((a,b)=>b.score-a.score);beam=candidates.slice(0,width);if(!beam.length)break}
 if(!best||best.gain<=0)return null;let planned=grid;const steps=best.path.map(move=>{const step={move,before:key(planned)};planned=resolve(planned,move).grid;return step});return {move:best.first,score:best.score,nodes,depth,path:best.path,steps};
}
const api={plan,resolve,key};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JewelPlanner=api;
})(typeof self!=='undefined'?self:globalThis);
