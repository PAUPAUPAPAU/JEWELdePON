// iOS needs gesture-unlocked Web Audio for effects and dependable gain control.
function createMobileAudioEngine(){
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!isIOS||!Ctx)return null;
  let context;try{context=new Ctx();}catch(_){return null;}
  const cache=new Map(),pending=new Map(),queue=[],voices=[];let loading=0,warmed=false;
  function pump(){
    while(loading<2&&queue.length){
      const job=queue.shift();loading++;
      fetch(job.src).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();})
        .then(b=>context.decodeAudioData(b)).then(b=>{cache.set(job.src,b);job.resolve(b);},job.reject)
        .finally(()=>{loading--;pending.delete(job.src);pump();});
    }
  }
  function load(src){
    if(cache.has(src))return Promise.resolve(cache.get(src));
    if(pending.has(src))return pending.get(src);
    const p=new Promise((resolve,reject)=>queue.push({src,resolve,reject}));pending.set(src,p);pump();return p;
  }
  function effect(src){
    const gain=context.createGain();gain.connect(context.destination);
    let volume=1,position=0,node=null,token=0;
    const voice={src,preload:'auto',loop:false,paused:true,
      get volume(){return volume;},set volume(v){volume=v;gain.gain.value=v;},
      get currentTime(){return position;},set currentTime(v){position=v;},
      pause(){token++;this.paused=true;if(node){const old=node;node=null;old.onended=null;try{old.stop();}catch(_){}old.disconnect();}},
      play(){
        this.pause();this.paused=false;const requested=token;
        const start=buffer=>{
          if(requested!==token||this.paused||context.state!=='running')return;
          const source=context.createBufferSource();source.buffer=buffer;source.loop=this.loop;source.connect(gain);node=source;
          source.onended=()=>{source.disconnect();if(node===source){node=null;this.paused=true;}};
          source.start(0,Math.max(0,Math.min(position,buffer.duration)));
        };
        if(cache.has(src)){try{start(cache.get(src));return Promise.resolve();}catch(e){return Promise.reject(e);}}
        return load(src).then(start);
      }
    };voices.push(voice);return voice;
  }
  function music(src){
    const media=new Audio(src),gain=context.createGain();gain.gain.value=0;
    const source=context.createMediaElementSource(media);source.connect(gain);gain.connect(context.destination);
    let volume=0;
    // Only volume is virtualized; streaming keeps long BGM out of decoded buffers.
    Object.defineProperty(media,'volume',{get:()=>volume,set:v=>{volume=v;gain.gain.value=v;}});
    return media;
  }
  return {effect,music,
    unlock(){try{if(context.state!=='running')context.resume().catch(()=>{});}catch(_){}if(!warmed){warmed=true;for(const v of voices)load(v.src).catch(()=>{warmed=false;});}},
    suspend(){for(const v of voices)v.pause();try{context.suspend().catch(()=>{});}catch(_){}},
    context
  };
}
