// Additive HTML interface and adapters; deliberately retains the HTML renderer and media.
const portStyle=document.createElement('style');portStyle.textContent=`
.portScreen{position:fixed;inset:0;z-index:110;background:#0a1020f7;overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 24px) 18px calc(env(safe-area-inset-bottom,0px) + 24px);box-sizing:border-box;color:#fff}
.portScreen.hidden{display:none}.portPanel{max-width:480px;margin:auto}.portPanel h2{color:#ffe173}.portPanel label{display:block;margin:14px 0}.portPanel input,.portPanel select,.portPanel button{font:inherit;font-size:16px;min-height:44px;max-width:100%;box-sizing:border-box}.portPanel input:not([type=checkbox]):not([type=range]),.portPanel select{display:block;width:100%;margin-top:6px}.portPanel button{margin:6px 4px 6px 0}.portPanel input[type=range]{width:65%;vertical-align:middle}.portRow{display:flex;gap:8px;flex-wrap:wrap}.portStats{font-size:13px;line-height:1.6;white-space:pre-line;margin:12px 0;text-align:left}.portSeries{font-weight:900;font-size:12px;line-height:1.3;overflow-wrap:anywhere;text-align:center;min-height:20px;color:#ffe173}.portFlash{opacity:0;position:fixed;inset:0;z-index:100;pointer-events:none;background:transparent}.portLobby{white-space:pre-line;font-size:16px;line-height:1.8;margin:12px 0}.port-training .pvpOpponentBoard,.port-training .opponentState,.port-training .miniScorePanel,.port-training .miniStatusPanel,.port-training .opponentLabel{display:none}.portTrainingTools{display:flex;gap:8px;justify-content:center}.portTrainingTools button{min-height:44px}.portPanel .hidden,.portTrainingTools.hidden{display:none}.pvpStage{padding-top:1em}.riseWide{width:100%}
@keyframes portFlash{0%,40%,80%{opacity:0}20%,60%{opacity:.16}100%{opacity:0}}
@keyframes portShake{0%,100%{transform:translate(0,0)}20%,60%{transform:translate(-2px,1px)}40%,80%{transform:translate(2px,-1px)}}
@supports(height:100svh){@media(max-width:600px) and (orientation:portrait){.pvpApp{max-width:min(560px,calc((100svh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 190px)/2 + 100px))}}}
@media(prefers-reduced-motion:reduce){.portFlash{opacity:.04}}
`;
document.body.appendChild(portStyle);
const portSetup=document.createElement('section');portSetup.id='portSetup';portSetup.className='portScreen hidden';
portSetup.innerHTML=`<div class="portPanel"><h2 id="portHeading">対戦設定</h2>
<label>あなたの名前<input id="portName" maxlength="12" autocomplete="nickname"></label>
<div id="portCpuOptions"><label>CPUの強さ<select id="portLevel"><option>NORMAL</option><option>HARD</option><option>VERYHARD</option><option>GOD</option></select></label><label>先取本数<select id="portCpuTarget"><option value="1">1本勝負</option><option value="3">3本先取</option></select></label><label>ハンデ<select id="portHandicap"><option value="none">なし</option><option value="player">自分を有利にする</option><option value="cpu">CPUを有利にする</option></select></label></div>
<div id="portOnlineOptions"><label>作成する部屋番号（4桁・空欄なら従来の6桁）<input id="portRoom" inputmode="numeric" maxlength="4" placeholder="例：0072"></label><label>先取本数（部屋主が選択）<select id="portOnlineTarget"><option value="1">1本勝負</option><option value="2">2本先取</option><option value="3">3本先取</option></select></label><div class="portRow"><button id="portCreate">部屋を作る</button><button id="portJoin">部屋に参加する</button></div></div>
<div id="portTrainingOptions"><label>ジュエルの色数<select id="portColors"><option value="5">5色</option><option value="6">6色</option><option value="7">7色</option></select></label><label>せり上がり<select id="portInterval"><option value="0">手動</option><option value="8300">8.3秒</option><option value="4800">4.8秒</option><option value="2900">2.9秒</option></select></label><p>天井による終了なし。同じ配置からやり直せます。</p></div>
<label>画質<select id="portQuality"><option value="high">高画質</option><option value="low">軽量</option></select></label><label><input id="portReduced" type="checkbox"> 演出控えめ</label>
<label>BGM <input id="portBgm" type="range" min="0" max="100"><span id="portBgmValue"></span></label><label>効果音 <input id="portSfx" type="range" min="0" max="100"><span id="portSfxValue"></span></label>
<p id="portRecords"></p><div class="portRow"><button id="portStart">開始する</button><button id="portBack">タイトルへ</button></div><p id="portSetupStatus" role="status"></p></div>`;
document.body.appendChild(portSetup);
const portTrainingButton=document.createElement('button');portTrainingButton.textContent='トレーニング';portTrainingButton.addEventListener('click',()=>portOpenSetup('training'));
(titleStart.parentNode||titleScreen).appendChild(portTrainingButton);
const portSeriesLabel=document.createElement('div');portSeriesLabel.className='portSeries';if(wrap.parentNode?.insertBefore)wrap.parentNode.insertBefore(portSeriesLabel,portEl('incomingPreview'));else (wrap.parentNode||document.body).appendChild(portSeriesLabel);
const portResultStats=document.createElement('div');portResultStats.className='portStats';(resultSub.parentNode||resultScreen).appendChild(portResultStats);
const portLobbyText=document.createElement('div');portLobbyText.className='portLobby';(roomCodeText.parentNode||lobbyScreen).appendChild(portLobbyText);
const portFlashLayer=document.createElement('div');portFlashLayer.className='portFlash';document.body.appendChild(portFlashLayer);
const portTrainingTools=document.createElement('div');portTrainingTools.className='portTrainingTools hidden';
const portSameButton=document.createElement('button');portSameButton.textContent='同じ配置からやり直す';portSameButton.addEventListener('click',()=>startWithAudio());
const portExitButton=document.createElement('button');portExitButton.textContent='練習を終了';portExitButton.addEventListener('click',()=>showTitleScreen());portTrainingTools.appendChild(portSameButton);portTrainingTools.appendChild(portExitButton);(wrap.parentNode||document.body).appendChild(portTrainingTools);
function portApplySettings(){
  playerCustomName=sanitizePlayerName(portEl('portName').value);try{localStorage.setItem('jdp_player_name',playerCustomName);}catch(_){}
  portConfig.level=portEl('portLevel').value||'NORMAL';portConfig.cpuTarget=Number(portEl('portCpuTarget').value)||1;portConfig.handicap=portEl('portHandicap').value||'none';
  portConfig.quality=portEl('portQuality').value||'high';portConfig.reduced=!!portEl('portReduced').checked;
  portConfig.bgm=Number(portEl('portBgm').value)/100;portConfig.sfx=Number(portEl('portSfx').value)/100;
  portSave();renderScale=portConfig.quality==='low'?1:Math.min(window.devicePixelRatio||1,1.5);resize();updatePlayerNameUi();
}
function portOpenSetup(mode){
  portMode=mode;portInSetup=true;stopBattleBgm();titleScreen.classList.add('hidden');portSetup.classList.remove('hidden');
  portEl('portHeading').textContent=mode==='training'?'トレーニング':mode==='online'?'通信対戦の設定':'CPU対戦の設定';
  for(const [id,m] of [['portCpuOptions','cpu'],['portOnlineOptions','online'],['portTrainingOptions','training']])portEl(id).classList.toggle('hidden',m!==mode);
  portEl('portStart').classList.toggle('hidden',mode==='online');
  portEl('portName').value=playerCustomName;portEl('portLevel').value=portConfig.level;portEl('portCpuTarget').value=String(portConfig.cpuTarget);portEl('portHandicap').value=portConfig.handicap;
  portEl('portOnlineTarget').value=String(portSeries.target||1);portEl('portQuality').value=portConfig.quality;portEl('portReduced').checked=portConfig.reduced;
  portEl('portColors').value=String(portTraining.colors);portEl('portInterval').value=String(portTraining.interval);
  for(const k of ['Bgm','Sfx']){portEl('port'+k).value=String(Math.round(portConfig[k.toLowerCase()]*100));portEl('port'+k+'Value').textContent=portEl('port'+k).value+'％';}
  const b=portRecords.battle||{};portEl('portRecords').textContent='自己ベスト：対戦 '+Math.floor(Number(b.time)||0)+'秒 ／ '+(Number(b.chain)||0)+'連鎖（記録開始後の通常対戦）';
}
function portCloseSetup(){portSetup.classList.add('hidden');portInSetup=false;}
portEl('portStart').addEventListener('click',()=>{
  portApplySettings();portSeries.wins=portSeries.losses=0;portSeries.over=false;portSeries.target=portConfig.cpuTarget;
  portTraining.colors=Number(portEl('portColors').value)||5;portTraining.interval=Number(portEl('portInterval').value)||0;portTraining.seed=Math.floor(portNativeRandom()*4294967296);
  portCloseSetup();startWithAudio();
});
portEl('portCreate').addEventListener('click',()=>{portApplySettings();portCloseSetup();createRoom();});
portEl('portJoin').addEventListener('click',()=>{portApplySettings();portCloseSetup();portSeries.wins=portSeries.losses=0;portSeries.over=false;openJoinRoom();});
portEl('portBack').addEventListener('click',()=>{portApplySettings();portCloseSetup();showTitleScreen();});
for(const key of ['Bgm','Sfx'])portEl('port'+key).addEventListener('input',()=>{portEl('port'+key+'Value').textContent=portEl('port'+key).value+'％';});
bgmUserOn=portConfig.bgmOn!==false;sfxUserOn=portConfig.sfxOn!==false;
const portOldAudioUi=updateAudioUi;updateAudioUi=function(){portOldAudioUi();portConfig.bgmOn=bgmUserOn;portConfig.sfxOn=sfxUserOn;portSave();};
const portOldTitle=showTitleScreen;showTitleScreen=function(){document.body.classList.remove('port-training');portCloseSetup();portMode='cpu';onlineMatchActive=false;onlineMatchId=0;portOutbox=null;portOldTitle();portTrainingTools.classList.add('hidden');portInSetup=true;};
const portOldStart=startWithAudio;startWithAudio=function(){document.body.classList.toggle('port-training',portMode==='training');portInSetup=false;portOldStart();autoRiseEnabled=portMode!=='training'||portTraining.interval>0;portTrainingTools.classList.toggle('hidden',portMode!=='training');};
const portOldActivate=activateVsMode;activateVsMode=function(){portOldActivate();portStartedAt=performance.now();if(portMode==='training')autoRiseEnabled=portTraining.interval>0;};
const portOldOpponentName=opponentDisplayName;opponentDisplayName=function(){return portMode==='cpu'?'CPU '+portConfig.level:portOldOpponentName();};
const portOldUpdateVs=updateVs;updateVs=function(dt,now){if(portMode==='training'){drawCpu(now);return;}portOldUpdateVs(dt,now);};
const portOldLobby=updateLobbyUi;updateLobbyUi=function(){portOldLobby();portLobbyText.textContent='部屋番号：'+(lobbyRoomCode||'未作成')+'\nあなた（'+(playerCustomName||'PLAYER')+'）：'+(lobbyYouReady?'準備OK':'準備待ち')+'\n対戦相手（'+(opponentCustomName||'未入室')+'）：'+(!lobbyHadOpponent?'入室待ち':lobbyOppReady?'準備OK':'準備待ち');};
// The three-line room summary supersedes the older duplicate status display.
for(const el of [roomCodeText,lobbyYouState,lobbyOppState])if(el.parentNode)el.parentNode.style.display='none';
// Keep the new summary outside the hidden old room-number container.
(lobbyHint.parentNode||lobbyScreen).appendChild(portLobbyText);
function portRenderResults(){
  const p=portOwnFinal||portStats.player,c=(!isOnlineMatch()&&portCpuFinal)||portStats.cpu;
  const text=(name,s)=>name+'\n消したジュエル：'+s.cleared+' ／ お邪魔変換：'+s.converted+' ／ 最大連鎖：'+s.chain;
  const other=isOnlineMatch()?(opponentCustomName||'対戦相手'):'CPU '+portConfig.level;
  const body=text(playerCustomName||'PLAYER',p)+'\n\n'+(isOnlineMatch()&&!portRemoteFinal?other+'\n最終成績を受信中…':text(other,c))+'\n\n'+portSeries.wins+' − '+portSeries.losses+'（'+portSeries.target+'本先取'+(portSeries.over?'・決着':'')+'）';
  setHudText(portResultStats,body);
}
let portFlashAnimations=[];
function portFlash(kind){
  for(const a of portFlashAnimations)a.cancel();portFlashAnimations=[];
  portFlashLayer.style.background=kind==='flip'?'#b24bff':'#49e3ff';
  const reduced=portConfig.reduced||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(portFlashLayer.animate)portFlashAnimations.push(portFlashLayer.animate([{opacity:0},{opacity:reduced?.035:.13},{opacity:0},{opacity:reduced?.035:.10},{opacity:0}],{duration:800}));
  if(!reduced&&document.body.animate)portFlashAnimations.push(document.body.animate([{transform:'translate(0,0)'},{transform:'translate(-2px,1px)'},{transform:'translate(2px,-1px)'},{transform:'translate(0,0)'}],{duration:350}));
}
function portDrawMagic(g,w,h,side,now){
  const n=portMagic[side];if(!n||matchFinished)return;
  const pending=n.kind==='change'?boardChange.pending:side==='player'?playerFlipPending:cpuFlipPending;
  if(pending)n.born=now;if(now-n.born>1500){portMagic[side]=null;return;}
  const lines=n.kind==='flip'?(n.role==='caster'?['反転マジック','発動！！']:['上下が','反転する！！']):(n.role==='caster'?['盤面チェンジ','発動！！']:['盤面を','チェンジされた！']);
  g.save();g.textAlign='center';g.textBaseline='middle';let size=w*.12;g.font='900 '+size+'px sans-serif';const width=Math.max(...lines.map(s=>g.measureText(s).width));if(width>w*.90)size*=w*.90/width;
  g.font='900 '+size+'px sans-serif';g.globalAlpha=portConfig.reduced?1:.78+.22*Math.cos(now/80);g.lineWidth=Math.max(3,w*.014);g.strokeStyle='#141027';g.fillStyle=n.kind==='flip'?'#e3a9ff':'#9bffff';
  lines.forEach((line,i)=>{const y=h*.45+i*size*1.3;g.strokeText(line,w/2,y,w*.94);g.fillText(line,w/2,y,w*.94);});g.restore();
}
function portDrawOverlays(now){
  portNetworkTick(now);
  if(!matchFinished&&portMode!=='training'&&dangerElapsed>0){
    const left=Math.max(0,TOP_GRACE-dangerElapsed);ctx.save();ctx.fillStyle='#200a12cc';ctx.fillRect(0,0,W,Math.max(20,CH*.65));ctx.fillStyle='#ff4d64';ctx.fillRect(0,0,W*left/TOP_GRACE,4*renderScale);ctx.fillStyle='#fff';ctx.font='bold '+Math.max(12,CH*.32)+'px sans-serif';ctx.textAlign='center';ctx.fillText('残り '+(left/1000).toFixed(1)+' 秒',W/2,Math.max(15,CH*.47));ctx.restore();
  }
  portDrawMagic(ctx,W,H,'player',now);portDrawMagic(cpuCtx,cpuW,cpuH,'cpu',now);
  setHudText(portSeriesLabel,portMode==='training'?'トレーニング':(playerCustomName||'PLAYER')+' '+portSeries.wins+' − '+portSeries.losses+' '+(isOnlineMatch()?(opponentCustomName||'対戦相手'):'CPU')+' ／ '+(portSeries.target||'…')+'本先取');
}
drawCombo=function(now){const n=portComboNotice;if(!n||now>=n.until||n.level<2)return;ctx.save();ctx.font='900 '+Math.min(28*renderScale,W*.105)+'px sans-serif';const text=n.level+'COMBO!!',width=Math.min(W*.94,ctx.measureText(text).width);const x=Math.max(width/2+3,Math.min(W-width/2-3,n.x*CW)),y=Math.max(28*renderScale,Math.min(H-12,(n.y-riseOffset)*CH));ctx.textAlign='center';ctx.lineWidth=4*renderScale;ctx.strokeStyle='#111';ctx.fillStyle='#ffe662';ctx.strokeText(text,x,y,W*.94);ctx.fillText(text,x,y,W*.94);ctx.restore();};
const portOldBackground=drawBoardBackground;drawBoardBackground=function(g,side,w,h,cw,ch,inset,line){
  const danger=side==='player'&&portMode!=='training'&&!matchFinished&&dangerElapsed>0,shake=danger&&TOP_GRACE-dangerElapsed<=2000&&!portConfig.reduced;
  g.save();if(shake)g.translate(Math.sin(performance.now()*.08)*1.5*renderScale,0);portOldBackground(g,side,w,h,cw,ch,inset,line);
  if(danger){g.fillStyle='rgba(255,25,45,'+(portConfig.reduced?.05:.08+.055*(1+Math.sin(performance.now()*.013)))+')';g.fillRect(0,0,w,h);}g.restore();
};
// Plan outside the rendering/input thread; stale board and round results are rejected.
let portWorker=null,portPlanPending=null,portPlanResult=null;
try{if(typeof Worker!=='undefined'){
  const source="__JDP_CPU_PLANNER_SOURCE__";
  const url=URL.createObjectURL(new Blob([source+'\nonmessage=e=>{const d=e.data;postMessage({id:d.id,key:d.key,result:JewelPlanner.plan(d.grid,d.level,d.specials)});};'],{type:'text/javascript'}));
  portWorker=new Worker(url);URL.revokeObjectURL(url);
  portWorker.onmessage=e=>{if(portPlanPending?.id===e.data.id){portPlanResult=e.data;portPlanPending=null;}};
  portWorker.onerror=()=>{portWorker.terminate();portWorker=null;portPlanPending=null;portEl('portSetupStatus').textContent='CPU先読みを利用できないため通常の思考処理で続行します';};
}}catch(_){portWorker=null;}
const portOldCpuAi=cpuAiStep;
cpuScheduleNextAi=function(now){cpuNextAiAt=now+({NORMAL:500,HARD:260,VERYHARD:140,GOD:80}[portConfig.level]||500);};
cpuAiStep=function(now){
  if(!portWorker){portOldCpuAi(now);return;}
  if(boardChange.pending||!vsActive||cpuGameOver||cpuSpecialPaused(now)||cpuFlipHoldUntil||cpuConversion||cpuAnyMotion()||cpuClearJobs.length||now<cpuNextAiAt)return;
  const board=cpuGrid.map((row,r)=>row.map((p,c)=>cpuGarbageAt(r,c)?6:p?(p.c>=6?p.c+1:p.c):0));const key=JSON.stringify(board)+'/'+portRound;
  if(portPlanResult){const answer=portPlanResult;portPlanResult=null;if(answer.key===key){if(answer.result?.move){const [r,c]=answer.result.move;cpuDoSwap(r,c,1);cpuScheduleNextAi(now);return;}portOldCpuAi(now);return;}}
  if(!portPlanPending){const id=portRound+':'+now;portPlanPending={id};portWorker.postMessage({id,key,grid:board,level:portConfig.level,specials:cpuGrid.flatMap((row,r)=>row.flatMap((p,c)=>p?.special?[{r,c}]:[]))});}
};
// Preload outside gesture/input processing. An uncached effect never starts a request from play().
if(mobileAudio?.preload)mobileAudio.preload();
if(portConfig.quality==='low'){renderScale=1;resize();}
updateAudioUi();
// Two bounded sprite sheets (one per board); rebuild only on size/atlas changes.
var portGemCaches={player:null,cpu:null};
function portDrawGemImage(g,side,frame,color,x,y,w,h){
 const atlas=jewelAtlas();if(atlas.complete===false)return;
 const cw=Math.max(1,Math.ceil(side==='player'?CW:cpuCW)),ch=Math.max(1,Math.ceil(side==='player'?CH:cpuCH));
 let cache=portGemCaches[side];
 if(!cache||cache.atlas!==atlas||cache.cw!==cw||cache.ch!==ch){
   const sheet=document.createElement('canvas');sheet.width=18*cw;sheet.height=7*ch;const c=sheet.getContext('2d');c.imageSmoothingEnabled=false;
   c.drawImage(atlas,0,0,18*JEWEL_S,7*JEWEL_S,0,0,sheet.width,sheet.height);cache=portGemCaches[side]={atlas,cw,ch,sheet};
 }
 g.drawImage(cache.sheet,frame*cw,(color-1)*ch,cw,ch,x,y,w,h);
}
// Store at most the two current boards. Compare occupancy in place; no per-frame signature strings.
var portGroupCache={player:null,cpu:null};
function portCachedGroup(side,seed,original){
 if(!seed)return [];
 const list=side==='player'?allGarbageObjects():allCpuGarbageObjects();let cache=portGroupCache[side];
 let changed=!cache||cache.rows.length!==list.length;
 if(!changed)for(let i=0;i<list.length&&!changed;i++){
  const g=list[i],old=cache.rows[i];changed=old.g!==g||old.row!==g.row||old.col!==g.col||old.w!==g.w||old.h!==g.h||old.y!==g.y||old.targetY!==g.targetY||old.cells.length!==(g.cells?.length||0);
  if(!changed)for(let j=0;j<old.cells.length;j++)if(old.cells[j]!==g.cells[j]){changed=true;break;}
 }
 if(changed){cache=portGroupCache[side]={rows:list.map(g=>({g,row:g.row,col:g.col,w:g.w,h:g.h,y:g.y,targetY:g.targetY,cells:g.cells?g.cells.slice():[]})),groups:new Map()};}
 if(!cache.groups.has(seed)){const group=original(seed);for(const g of group)cache.groups.set(g,group);}
 return cache.groups.get(seed);
}
const portOldPlayerGroup=connectedPlayerGarbageGroup,portOldCpuGroup=connectedCpuGarbageGroup;
connectedPlayerGarbageGroup=seed=>portCachedGroup('player',seed,portOldPlayerGroup);
connectedCpuGarbageGroup=seed=>portCachedGroup('cpu',seed,portOldCpuGroup);

// Suppress superseded English notices without changing simulation hold times.
const portOldFlipOverlay=drawFlipOverlay;drawFlipOverlay=function(g,w,h,until,now,label){if(!/^(FLIP|CHANGE)/.test(label||''))portOldFlipOverlay(g,w,h,until,now,label);};

titleStart.textContent="CPU対戦";

const portOldSpecialOverlay=drawSpecialPauseOverlay;drawSpecialPauseOverlay=function(now){if(['flip','change'].includes(playerSpecialBanner?.type)){if(now>playerSpecialBanner.until+180)playerSpecialBanner=null;return;}portOldSpecialOverlay(now);};
const portOldCpuSpecialOverlay=drawCpuSpecialPauseOverlay;drawCpuSpecialPauseOverlay=function(now){if(['flip','change'].includes(cpuSpecialBanner?.type)){if(now>cpuSpecialBanner.until+180)cpuSpecialBanner=null;return;}portOldCpuSpecialOverlay(now);};
// Retry countdown cues briefly, without fetching audio or delaying any game clock.
var portRetrying=null,portRetryAt=0;
const portOldRepairAudio=portRepairAudio;portRepairAudio=function(){
 const now=performance.now();if(portAudioRetry&&now>=portAudioRetry.until)portAudioRetry=null;
 if(portAudioRetry&&!document.hidden&&now>=portRetryAt){const cue=portAudioRetry;portAudioRetry=null;portRetrying=cue;portRetryAt=now+100;playSfx(cue.name);portRetrying=null;}
 portOldRepairAudio();
};

// Preserve invitation URLs (four or six digits), without adding a copy-link button.
function portOpenInvitation(){try{const code=new URL(location.href).searchParams.get('room')||new URL(location.href).searchParams.get('code');if(code&&/^\d{4}(?:\d{2})?$/.test(code)){portMode='online';portInSetup=false;openJoinRoom();joinCodeInput.value=code;}}catch(_){}}

const portOldShake=triggerShake;triggerShake=function(side,power,duration){if(portConfig.reduced)return;portOldShake(side,power,duration);};
const portOldShift=shiftPauseTimers;shiftPauseTimers=function(duration){portOldShift(duration);if(portStartedAt)portStartedAt+=duration;};
