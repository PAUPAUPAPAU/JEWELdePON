const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function makeHarness(version='0937'){
  const root=path.resolve(__dirname,'..');
  const wrapper=fs.readFileSync(path.join(root,'server-'+version+'-wrapper.js'),'utf8');
  const html=vm.runInNewContext(wrapper.slice(0,wrapper.indexOf('global.__JDP_HTML_BUFFER'))+'\nhtml;', {require,Buffer,__dirname:root});
  const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const noop=()=>{};let clock=1000,id=0,seed=12345;
  const timers=new Map(),elements=new Map(),storage=new Map(),audios=[];
  const context=new Proxy({arc:(x,y,r)=>{if(r<0)throw new Error('IndexSizeError: negative Canvas arc radius');},measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop,set:(o,k,v)=>(o[k]=v,true)});
  function element(key=''){
    const classes=new Set(),listeners=new Map();
    return {id:key,style:{},dataset:{},textContent:'',innerHTML:'',value:'',children:[],width:360,height:720,
      classList:{add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:x=>classes.has(x)?classes.delete(x):classes.add(x)},
      getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:360,height:720}),
      addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},dispatch:(type,event)=>{for(const fn of listeners.get(type)||[])fn(event);},removeEventListener:noop,setAttribute:noop,appendChild:noop,replaceChildren:noop,focus:noop,setPointerCapture:noop,
      querySelector:()=>element(),querySelectorAll:()=>[],toDataURL:()=>''};
  }
  const document={getElementById:k=>{if(!elements.has(k))elements.set(k,element(k));return elements.get(k);},querySelectorAll:()=>[],createElement:()=>element(),addEventListener:noop,body:element(),documentElement:element(),hidden:false};
  const math=Object.create(Math);math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const sandbox={console,document,Math:math,performance:{now:()=>clock},URL,Uint8Array,ArrayBuffer,
    navigator:{userAgent:'test'},location:{protocol:'http:',origin:'http://localhost',href:'http://localhost/'},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    Image:class{constructor(){this.complete=false;}},ResizeObserver:class{observe(){}},
    Audio:class{constructor(src){this.src=src;this.volume=0;this.currentTime=0;this.plays=0;this.pauses=0;audios.push(this);}addEventListener(){}load(){}play(){this.plays++;return Promise.resolve();}pause(){this.pauses++;}cloneNode(){return new this.constructor(this.src);}},
    setTimeout:(fn,d=0)=>{const key=++id;timers.set(key,{fn,due:clock+d});return key;},clearTimeout:key=>timers.delete(key),
    setInterval:()=>++id,clearInterval:noop,requestAnimationFrame:()=>{sandbox.frames++;return ++id;},cancelAnimationFrame:noop,frames:0,
    fetch:()=>Promise.reject(new Error('Network disabled in simulation')),addEventListener:noop};
  sandbox.window=sandbox;sandbox.devicePixelRatio=1;
  vm.createContext(sandbox);
  for(let code of scripts){code=code.replace(/\}\)\(\);\s*$/, 'globalThis.__evaluate = code => eval(code);\n})();');vm.runInContext(code,sandbox,{timeout:3000});}
  function run(code){sandbox.__code=code;return vm.runInContext('__evaluate(__code)',sandbox,{timeout:3000});}
  function flush(){let count=0;while(true){const entry=[...timers].find(([,v])=>v.due<=clock);if(!entry)break;if(count++>1000)throw new Error('Timer loop');timers.delete(entry[0]);entry[1].fn();}}
  function time(t){clock=t;}
  function tick(t){clock=t;run('loop(performance.now())');flush();}
  run(`grid=emptyGrid();cpuGrid=cpuEmptyGrid();overflow=Array(C).fill(null);cpuOverflow=Array(C).fill(null);
    garbage=null;extraGarbages=[];cpuGarbage=null;cpuExtraGarbages=[];
    waitingForStart=false;startCountdownActive=false;matchFinished=false;autoRiseEnabled=false;vsActive=false;`);
  return {run,time,tick,flush,frames:()=>sandbox.frames,element:k=>elements.get(k),audios};
};
