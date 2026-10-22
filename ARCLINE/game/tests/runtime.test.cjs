(async()=>{
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),E=require('../dist/engine.js');
const els={},callbacks={},calls=[],frames=new Map();let seq=0;
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{})});
const classList=()=>({toggle(){},add(){},remove(){}});
function el(id){return els[id]??={id,hidden:false,value:0,style:{},dataset:{},classList:classList(),setAttribute(k,v){this[k]=v;},setPointerCapture(){},focus(){},getContext:()=>context,getBoundingClientRect:()=>id==='stick'?{left:18,top:650,width:106,height:106}:id==='fire'?{left:270,top:650,width:98,height:98}:{left:0,top:0,width:390,height:844},click(){this.onclick?.({detail:0});}};}
const groups={'[data-rig]':[0,1].map(i=>Object.assign(el('rig'+i),{dataset:{rig:i}})),'[data-level]':[0,1,2].map(i=>Object.assign(el('level'+i),{dataset:{level:i}}))};
const param=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
class Audio{constructor(){this.currentTime=0;this.sampleRate=1000;this.destination={};this.state='suspended';}createGain(){return {gain:param(),connect(){return this;}};}createOscillator(){return {frequency:param(),connect(){return this;},start(){},stop(){this.stopped=true;}};}createBuffer(a,n){return {getChannelData:()=>new Float32Array(n)};}createBufferSource(){return {connect(){return this;},start(){}};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}}
const sandbox={setTimeout:()=>0,ArcEngine:E,document:{getElementById:el,querySelectorAll:q=>groups[q]||[],documentElement:{},addEventListener:(k,f)=>callbacks[k]=f},requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:i=>frames.delete(i),console,ytgame:{IN_PLAYABLES_ENV:true,game:{loadData:async()=>JSON.stringify({version:1,cleared:99}),saveData:async data=>calls.push(JSON.parse(data)),firstFrameReady:()=>calls.push('first'),gameReady:()=>calls.push('ready')},system:{isAudioEnabled:()=>true,onPause:f=>callbacks.pause=f,onResume:f=>callbacks.resume=f,onAudioEnabledChange:f=>callbacks.audio=f}},window:{devicePixelRatio:1,AudioContext:Audio}};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'),sandbox);await new Promise(setImmediate);assert.deepEqual(calls,['first','ready']);
const read=x=>vm.runInContext(x,sandbox),state=()=>read('s');let now=1000;
function tick(n=1){for(let i=0;i<n;i++){now+=50;const q=[...frames.values()];frames.clear();q.forEach(f=>f(now));}}
const pointer=(x=319,y=699,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){}}),key=(k,repeat=false)=>({key:k,repeat,preventDefault(){}});
// Arena swipe, selection, sound starts from an action.
assert.equal(read('selectedMap'),99);el('prevMap').click();assert.equal(read('selectedMap'),98);el('nextMap').click();assert.equal(read('selectedMap'),99);assert.equal(read('audio.state'),'running');
let flowCount=0;
for(let rig=0;rig<2;rig++)for(const stage of [1,10,50,51,80,81,100]){
 groups['[data-rig]'][rig].click();vm.runInContext(`selectedMap=${stage-1}`,sandbox);el('play').click();assert.equal(state().rig,rig);assert.equal(state().stage,stage);assert.equal(state().phase,'aim');
 tick(610);assert.equal(state().phase,'aim'); // no countdown shot
 const angle=state().angle;el('world').onpointerdown(pointer(120,220));el('world').onpointermove(pointer(120,180));el('world').onpointerup(pointer(120,180));assert(state().angle>angle);assert.equal(state().phase,'aim');
 // Joystick neutral/deadzone/proportional movement and recenter on cancel.
 const x=state().units[0].x;el('stick').onpointerdown(pointer(71,703));tick(4);assert.equal(state().units[0].x,x);el('stick').onpointermove(pointer(88,703));tick(4);assert(state().units[0].x>x);el('stick').onpointercancel(pointer(88,703));const after=state().units[0].x;tick(4);assert.equal(state().units[0].x,after);assert.equal(el('stickKnob').style.transform,'translate(0px,0px)');
 // Charge duration; wrong pointer cannot release; cancellation never fires.
 el('fire').onpointerdown(pointer());tick(8);assert(state().power>60&&state().power<70);el('fire').onpointerup(pointer(319,699,2));assert(read('charge'));el('fire').onpointercancel(pointer());assert.equal(state().phase,'aim');assert.equal(read('charge'),null);
 el('fire').onpointerdown(pointer());tick(50);assert(state().power<100);el('fire').onpointermove(pointer(10,10));assert.equal(read('charge.cancel'),true);el('fire').onpointerup(pointer(10,10));assert.equal(state().phase,'aim');
 const mx=state().units[0].x;el('fire').onpointerdown(pointer());el('stick').onpointerdown(pointer(100,703,4));tick(3);assert(state().units[0].x>mx);el('stick').onpointerup(pointer(100,703,4));el('fire').onpointercancel(pointer());
 // SDK pause cancels an active charge; lifting after resume does not fire.
 el('fire').onpointerdown(pointer());tick(6);callbacks.pause();assert.equal(frames.size,0);assert.equal(read('charge'),null);assert.equal(read('audio.state'),'suspended');callbacks.resume();el('fire').onpointerup(pointer());assert.equal(state().phase,'aim');
 callbacks.audio(false);assert.equal(read('master.gain.value'),0);assert.equal(read('audio.state'),'suspended');el('fire').onpointerdown(pointer());tick(3);assert.equal(read('master.gain.value'),0);el('fire').onpointercancel(pointer());callbacks.audio(true);assert.equal(read('audio.state'),'running');
 callbacks.keydown(key(' '));tick(6);callbacks.keydown(key(' ',true));assert(read('charge'));el('pause').click();assert.equal(read('charge'),null);el('resume').click();callbacks.keyup(key(' '));assert.equal(state().phase,'aim');
 let guard=0,pausedFlight=false;
 while(state().phase!=='over'&&guard++<20000){if(state().phase==='aim'){const b=E.solve(state(),0);vm.runInContext(`s.angle=${b.angle}`,sandbox);el('fire').onpointerdown(pointer());vm.runInContext(`update(0,${(b.power-20)/80*.72})`,sandbox);el('fire').onpointerup(pointer());assert.equal(state().phase,'flight');if(!pausedFlight){const f=read('flight');callbacks.pause();tick(5);assert.equal(read('flight'),f);callbacks.resume();pausedFlight=true;}}tick();}
 assert.equal(state().phase,'over');assert(state().result);assert(!el('overlay').hidden);assert.equal(read('dialog'),'result');const nextStage=state().result==='win'?Math.min(100,stage+1):stage;el('resume').click();assert.equal(state().stage,nextStage);assert.equal(state().round,1);assert.equal(state().result,null);
 el('pause').click();el('returnLobby').click();assert(state());assert.equal(read('dialog'),'confirm');el('resume').click();assert.equal(read('manualPaused'),false);el('pause').click();el('returnLobby').click();el('returnLobby').click();assert.equal(state(),null);assert(!el('lobby').hidden);flowCount++;
}
await read('saveChain');assert(calls.some(x=>typeof x==='object'&&x.cleared===100));
console.log(JSON.stringify({status:'PASS',flows:flowCount,checks:['arena swipe','rig selection and campaign stages','no shot timer','drag angle','joystick neutral/proportional/recenter','fast bouncing charge','release fires','wrong pointer ignored','cancel/outside release does not fire','pause cancels charge','muted master stays silent','keyboard repeat/pause safety','pause during flight','all outcomes-to-rematch/lobby flows'],method:'Mock DOM and Web Audio; not real-browser/device QA'},null,2));

})().catch(e=>{console.error(e);process.exitCode=1;});
