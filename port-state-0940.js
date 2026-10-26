// HTML-only state: Android sources and browser-specific audio/input remain separate.
var portMode='cpu',portInSetup=false,portRound=0,portStartedAt=0;
var portConfig=portRead('jdp_html_settings_v1',{bgm:.9,sfx:.3,quality:'high',reduced:false,level:'NORMAL',handicap:'none',cpuTarget:1,bgmOn:true,sfxOn:true});
var portRecords=portRead('jdp_html_records_v1',{games:0,wins:0,losses:0,battle:{time:0,chain:0}});
var portStats={player:{cleared:0,converted:0,chain:0},cpu:{cleared:0,converted:0,chain:0}};
var portSeries={target:1,wins:0,losses:0,completed:null,over:false,ready:false,syncing:false,aborted:false};
var portTraining={colors:5,interval:0,seed:12345},portSeed=12345,portNativeRandom=Math.random;
var portMagic={player:null,cpu:null},portComboNotice=null,portAudioRetry=null,portBgmRepairAt=0,portVoices=[];
var portRemoteFinal=false,portOwnFinal=null,portCpuFinal=null,portFinalSends=0,portSyncAt=0,portSyncDeadline=0,portOutbox=null;
function portRead(key,defaults){try{const s=JSON.parse(localStorage.getItem(key));return s&&typeof s==='object'?Object.assign({},defaults,s):defaults;}catch(_){return defaults;}}
function portSave(){try{localStorage.setItem('jdp_html_settings_v1',JSON.stringify(portConfig));}catch(_){}}
function portRandom(){if(portMode!=='training')return portNativeRandom();portSeed=(Math.imul(1664525,portSeed)+1013904223)>>>0;return portSeed/4294967296;}
function portEl(id){return document.getElementById(id);}
function portResetRound(){
  JdpPort.nextSeries(portSeries);portSeries.completed=null;portSeries.aborted=false;portSeries.ready=false;portSeries.syncing=false;
  portRound++;portStats={player:{cleared:0,converted:0,chain:0},cpu:{cleared:0,converted:0,chain:0}};
  portRemoteFinal=false;portOwnFinal=null;portCpuFinal=null;portFinalSends=0;portMagic={player:null,cpu:null};portComboNotice=null;portOutbox=null;portAudioRetry=null;
  portSeed=portTraining.seed;portStartedAt=0;portSyncAt=0;portSyncDeadline=0;
}
function portFinish(result,now){
  portOwnFinal=Object.freeze({...portStats.player});portCpuFinal={...portStats.cpu};
  if(portMode!=='training'&&!portSeries.aborted){
    JdpPort.advanceSeries(portSeries,result,portRound);
    if(portStartedAt>0&&(isOnlineMatch()||portConfig.handicap==='none')){
      portRecords.games=(Number(portRecords.games)||0)+1;
      const key=result==='win'?'wins':'losses';portRecords[key]=(Number(portRecords[key])||0)+1;
      portRecords.battle=Object.assign({},portRecords.battle,{time:Math.max(Number(portRecords.battle?.time)||0,Math.max(0,now-portStartedAt)/1000),chain:Math.max(Number(portRecords.battle?.chain)||0,portStats.player.chain)});
      try{localStorage.setItem('jdp_html_records_v1',JSON.stringify(portRecords));}catch(_){}
    }
  }
  portMagic={player:null,cpu:null};portComboNotice=null;portOutbox=null;
  portSyncDeadline=now+60000;portSyncAt=0;
  if(isOnlineMatch()){const round=portRound;for(const delay of [0,250,750,1750])setTimeout(()=>{if(round===portRound&&isOnlineMatch()&&matchFinished)maybeSendNetSnapshot(performance.now(),true);},delay);}
}
function portBeginOnline(){
  portMode='online';portInSetup=false;portSeries.syncing=true;portSeries.ready=false;
  if(!localIsHost)portSeries.target=null;
  portSyncDeadline=performance.now()+20000;
  say('先取本数と開始時刻を同期中…');
}
function portStartOnlineClock(){
  startCountdownActive=true;waitingForStart=true;startCountdownAt=performance.now();
  startCountdownValue=0; // First successful clock update announces 3.
  portSyncDeadline=0;
}
function portReceiveState(msg){
  const s=msg.state;if(!s)return;
  const stats=JdpPort.cleanStats(s.stats);
  if(stats&&(!portRemoteFinal||s.final===true)){portStats.cpu=stats;if(s.final===true)portRemoteFinal=true;}
  if(matchFinished)portRenderResults();
  if(portSeries.ready)return;
  const series=s.appSeries;
  if(!series||series.version!==2){say('相手のゲームを最新版へ更新してください（対戦設定の同期待ち）');return;}
  if(![1,2,3].includes(Number(series.target)))return;
  if(!localIsHost){
    portSeries.target=Number(series.target);
    if(series.ready&&Number.isFinite(series.startAt)&&series.startAt>0){onlineStartAtWall=series.startAt;portSeries.ready=true;portStartOnlineClock();}
  }else if(Number(series.target)===portSeries.target){
    onlineStartAtWall=Date.now()+3400;portSeries.ready=true;portStartOnlineClock();
  }
}
function portNetworkTick(now){
  if(!isOnlineMatch()||document.hidden)return;
  if(!portSeries.ready&&portSyncDeadline&&now>portSyncDeadline){say('設定を同期できません。両者を最新版に更新して部屋へ入り直してください');return;}
  if(matchFinished){
    if(now>portSyncDeadline||portRemoteFinal&&portFinalSends>=4)return;
    if(now-portSyncAt<500)return;portSyncAt=now;portFinalSends++;maybeSendNetSnapshot(now,true);
  }else if(!vsActive&&portSeries.syncing&&now-portSyncAt>=120){portSyncAt=now;maybeSendNetSnapshot(now,true);}
}
function portSendAttack(cells){
  if(!Number.isSafeInteger(cells)||cells<=0||!isOnlineMatch()||matchFinished)return Promise.resolve(false);
  let q=portOutbox;
  if(!q||q.round!==portRound){q=portOutbox={round:portRound,code:lobbyRoomCode,clientId:netClientId,matchId:onlineMatchId,cells:0,running:false};}
  q.cells+=cells;if(q.running)return q.promise;
  q.running=true;
  q.promise=(async()=>{
    while(q.cells>0&&portOutbox===q&&q.round===portRound&&onlineMatchId===q.matchId&&!matchFinished){
      const amount=Math.min(192,q.cells);q.cells-=amount;
      try{await netPost('/api/game-event',{clientId:q.clientId,code:q.code,matchId:q.matchId,kind:'attack',payload:{packets:JdpPort.packetBatches(amount)[0]}});}
      catch(err){if(portOutbox===q){portSeries.aborted=true;say('攻撃の送信を確認できません。対戦を中断して入り直してください');setPause(true,false);}q.cells=0;return false;}
    }
    return true;
  })().finally(()=>{q.running=false;});return q.promise;
}
function portLimitSound(a){
  const now=performance.now();portVoices=portVoices.filter(v=>v.a!==a&&(v.a.paused===false||now-v.at<1800));
  while(portVoices.length>=8){const old=portVoices.shift();try{old.a.pause();}catch(_){}}
  portVoices.push({a,at:now});
}
function portRepairAudio(){
  const now=performance.now();if(document.hidden||!audioUnlocked||!bgmActive||!bgmUserOn||gamePaused||now-portBgmRepairAt<1500)return;
  portBgmRepairAt=now;
  for(const a of [bgmNormalAudio,bgmDangerAudio])if(a.paused||a.ended){try{if(a.error)a.load();a.play().catch(()=>{});}catch(_){}}
}
function portMagicStart(side,kind,role){
  if(side!=='player'&&side!=='cpu')return;
  portMagic[side]={kind,role,born:performance.now()};
  if(typeof portFlash==='function')portFlash(kind);
}

function portGarbageStep(g,dt,dy){if(Math.abs(dy)<.003){g._fallSpeed=0;return 0;}g._fallSpeed=Math.min(28,(g._fallSpeed||4)+36*dt);return g._fallSpeed*dt;}

// App v2 wire palette: red, green, blue, yellow, purple, pink, gray.
function portWireColor(c){return c===2?3:c===3?2:c;}
