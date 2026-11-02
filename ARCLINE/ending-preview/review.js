'use strict';
const $=id=>document.getElementById(id),frames=ArcCinematicData.movie('epilogue','ja',{spoilers:true}),music=ArcAudio.create();
let running=false,credits=null,shot=null;
const player=ArcCinematicPlayer.create($('plate'),{assetBase:'../',onStatus:state=>{if(state==='missing')showEndingError('画像を取得できませんでした。');}});
function sync(){const portrait=innerWidth<=innerHeight;music.sync({paused:document.hidden||portrait});$('rotate').hidden=!running||!portrait;if(!running)$('play').disabled=portrait;}
function start(){
 if(running)return;
 $('play').disabled=true;$('error').hidden=true;
 try{
  music.unlock();
  credits?.destroy();credits=ArcEnding.create($('storyCinema'),frames,ArcMediaData.tracks.ENDING.duration,'ja');shot=null;
  $('start').hidden=true;$('storyCinema').hidden=false;running=true;sync();music.request('ENDING',{restart:true});
 }catch(e){showEndingError(String(e));}
 finally{if(!running)sync();}
}
function tick(){
 if(running){
  const state=music.state();credits.setDuration(state.duration);const located=credits.update(state.position),cue=located.cue;
  $('caption').hidden=$('plate').hidden=cue.kind!=='scene';
  if(cue.kind==='scene'){
   const frame=cue.shot,age=Math.max(0,state.position-cue.start);
   if(shot!==frame.id){shot=frame.id;player.show(frame,frames[frames.indexOf(frame)+1]);$('title').textContent=frame.title;}
   player.update(age);const line=ArcCinematicData.clock(frame,age*1000).cue;
   if(line){const elapsed=Math.max(0,age-line.startMs/1000),letters=Array.from(line.text);$('text').textContent=line.mode==='full'?line.text:letters.slice(0,Math.floor(elapsed*32)).join('');}else $('text').textContent='';
  }
  if(located.done){running=false;music.sync({paused:true});$('storyCinema').hidden=true;$('rotate').hidden=true;$('start').hidden=false;$('play').textContent='もう一度エンディングを再生';$('play').disabled=false;}
 }
 requestAnimationFrame(tick);
}
ArcAssetLoader.load(frames[0].src,{assetBase:'../',timeout:5000,retries:1}).catch(()=>{});sync();
$('play').onclick=start;addEventListener('resize',sync);document.addEventListener('visibilitychange',sync);requestAnimationFrame(tick);
globalThis.EndingReview={get state(){const state=music.state();return {running,time:state.position,shot,kind:credits?ArcEnding.locate(credits.plan,state.position).kind:null,frames:frames.length};}};
