'use strict';
const specials=new Set(['row','col','bomb','burst','cut','flip','change']);
function sanitizeBoard(s){
  if(!s||!Array.isArray(s.grid)||s.grid.length!==12||!Array.isArray(s.overflow)||s.overflow.length!==6||!Array.isArray(s.garbage)||s.garbage.length>78)throw Error('BAD_CHANGE_BOARD');
  const panel=p=>{if(p===null)return null;if(!p||!Number.isInteger(p.c)||p.c<1||p.c>6)throw Error('BAD_CHANGE_BOARD');return {c:p.c,special:specials.has(p.special)?p.special:null};};
  const grid=s.grid.map(row=>{if(!Array.isArray(row)||row.length!==6)throw Error('BAD_CHANGE_BOARD');return row.map(panel);});
  const garbage=s.garbage.map(g=>{
    if(!g||![g.row,g.col,g.w,g.h].every(Number.isInteger)||g.w<1||g.w>6||g.h<1||g.h>13||g.row< -1||g.row+g.h>12||g.col<0||g.col+g.w>6||!Array.isArray(g.cells)||g.cells.length!==g.w*g.h)throw Error('BAD_CHANGE_BOARD');
    return {row:g.row,col:g.col,w:g.w,h:g.h,cells:g.cells.map(x=>x<0?-1:0)};
  });
  return {grid,overflow:s.overflow.map(panel),garbage};
}
function handle(room,b,emit,now=Date.now()){
  let tx=room.boardChange;
  const publish=()=>emit(room,{type:'board_change',change:tx});
  if(tx?.matchId!==room.matchId)tx=room.boardChange=null;
  if(tx?.status==='pending'&&(now>=tx.deadline||room.matchEnded)){tx.status='cancelled';publish();}
  if(tx?.status==='committed'&&b.ack===tx.id){room.changeAcks.add(b.clientId);}
  if(b.action==='request'&&!room.matchEnded&&room.players.size===2&&
      (!tx||tx.status==='cancelled'||(tx.status==='committed'&&room.changeAcks.size===2))){
    tx=room.boardChange={id:(room.changeSerial||0)+1,matchId:room.matchId,status:'pending',deadline:now+30000,boards:Object.create(null)};
    room.changeSerial=tx.id;room.changeAcks=new Set();publish();
  }
  if(b.action==='ready'&&tx?.status==='pending'&&b.id===tx.id){
    if(!Object.hasOwn(tx.boards,b.clientId))tx.boards[b.clientId]=sanitizeBoard(b.board);
    if([...room.players.keys()].every(id=>Object.hasOwn(tx.boards,id))){tx.status='committed';room.changeEpoch=tx.id;publish();}
  }
  return {change:tx||null};
}
module.exports={handle,sanitizeBoard};
