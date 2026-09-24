const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),make=require('./game-harness.cjs');
const code=fs.readFileSync(__dirname+'/../mobile-audio-0939.js','utf8');
function engine(){
 let inflight=0,max=0,requests=0,active=0,peak=0,created=0;
 const gains=[],sources=[];
 class Context{
  constructor(){this.state='suspended';this.destination={};}
  resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
  createGain(){const g={gain:{value:1},connect(){},disconnect(){}};gains.push(g);return g;}
  createMediaElementSource(){return {connect(){}};}
  decodeAudioData(){return Promise.resolve({duration:2});}
  createBufferSource(){created++;const s={connect(){},disconnect(){},start(){active++;peak=Math.max(peak,active);},stop(){active--;}};sources.push(s);return s;}
 }
 const env={navigator:{userAgent:'iPhone'},window:{AudioContext:Context},Audio:class {constructor(src){this.src=src;this.volume=1;}},fetch:async()=>{requests++;inflight++;max=Math.max(max,inflight);await new Promise(r=>setImmediate(r));inflight--;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}};
 const e=vm.runInNewContext(code+';createMobileAudioEngine()',env);
 return {e,gains,sources,stats:()=>({requests,max,active,peak,created})};
}
(async()=>{
 const x=engine(),voices=Array.from({length:22},(_,i)=>x.e.effect('/audio/'+i+'.mp3'));x.e.unlock();
 await Promise.all(voices.map(v=>v.play()));assert(x.stats().max<=2);assert.equal(x.stats().requests,22);
 voices.forEach(v=>v.pause());assert.equal(x.stats().active,0);
 const v=voices[0];v.volume=.24;assert.equal(x.gains[0].gain.value,.24);
 for(let i=0;i<3000;i++){await v.play();assert.equal(x.stats().active,1);}
 v.pause();assert.equal(x.stats().active,0);assert.equal(x.stats().requests,22);
 const music=x.e.music('/audio/battle.mp3');music.volume=.14;assert.equal(x.gains.at(-1).gain.value,.14);
 const late=x.e.effect('/audio/late.mp3');const pending=late.play();late.pause();await pending;assert.equal(x.stats().active,0);
 x.e.suspend();assert.equal(x.e.context.state,'suspended');x.e.unlock();assert.equal(x.e.context.state,'running');
 const h=make();h.run('grid[11][0]=panel(1);grid[11][0].x=0;grid[11][0].y=11;');
 const canvas=h.element('game');
 // Use the actual canvas binding; one touch may not overwrite or release another.
 h.run("canvas.dispatch('pointerdown',{pointerId:11,clientX:25,clientY:690});canvas.dispatch('pointerdown',{pointerId:12,clientX:80,clientY:690})");assert.equal(h.run('drag.pointerId'),11);
 h.run("canvas.dispatch('pointerup',{pointerId:12,clientX:80,clientY:690})");assert.equal(h.run('drag.pointerId'),11);
 h.run("canvas.dispatch('pointercancel',{pointerId:11})");assert.equal(h.run('drag'),null);
 console.log('PASS iOS: two concurrent decodes maximum, cached buffers, 3000 plays with one active voice, gain control, stale playback cancellation, resume and touch ownership');
})().catch(e=>{console.error(e);process.exitCode=1;});
