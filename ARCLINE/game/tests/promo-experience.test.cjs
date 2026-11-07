'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const X=require('../ui/experience.js'),A=require('../ui/audio-manager.js'),E=require('../dist/engine.js'),D=require('../dist/media-data.js');
let checks=0;const ok=(value,message)=>{checks++;assert(value,message);};
const normal={x:13,y:29,scale:.8},frame={width:844,top:50,bottom:260};
for(const stage of [10,20,30,40,50,60,70,80,90,100]){
 const state=E.campaign(stage),before=JSON.stringify(state);for(const age of [0,.65,1,1.35,2.1,2.7,3.2,9]){const v=X.bossView(normal,state,age,frame);ok(Object.values(v).every(Number.isFinite)&&v.scale>0,'finite intro transform '+stage+'/'+age);}
 assert.deepEqual(X.bossView(normal,state,3.2,frame),normal);checks++;ok(JSON.stringify(state)===before,'camera cannot mutate combat '+stage);
 state.result='win';ok(A.victoryFor(state)===(stage<100),'victory target '+stage);ok(!A.victoryFor(state,{practice:true}),'no simulation victory '+stage);
}
for(const stage of [1,5,15,27,95]){const state=E.campaign(stage);state.result='win';ok(!A.victoryFor(state),'normal/midboss excluded '+stage);}
const state=E.campaign(10);state.result='lose';ok(!A.victoryFor(state),'defeat excluded');state.result='win';state.spec={...state.spec,midboss:true};ok(!A.victoryFor(state),'midboss attribute wins over number');
ok(Object.keys(D.tracks).length===8&&D.tracks.VICTORY.loopStart===null,'eight tracks; victory whole-file loop');ok(D.tracks.VICTORY.sha256==='22d68d43ad3c6f7832b3c0232815ec17d63c68a80727775fd8c9d7e58e66b740','approved take 2');

// Victory preparation must not interrupt the battle or allocate a second copy.
{
 const media=[];const audio=A.create({tracks:D.tracks,resolve:t=>t.src,mediaFactory:()=>{const m=new EventTarget();Object.assign(m,{currentTime:0,paused:true,plays:0,loads:0,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){this.loads++;},removeAttribute(){}});media.push(m);return m;}});
 audio.unlock();audio.request('BOSS',{restart:true});const boss=media[0];audio.prepare('VICTORY');audio.prepare('VICTORY');
 ok(media.length===2&&media[1].loads===1&&media[1].plays===0&&!boss.paused,'preload is silent, deduplicated and preserves boss playback');
 const ready=media[1];audio.request('VICTORY',{restart:true});ok(media.length===2&&ready.plays===1&&boss.paused,'victory uses the prepared media immediately');
 ok(ready.currentTime===.21&&D.tracks.VICTORY.startOffset===.21,'skip the independently measured 0.21s opening silence');
 ok(ready.loop,'approved original still loops');const generation=audio.state().generation;audio.request('VICTORY');ok(audio.state().generation===generation,'reentering results cannot restart the cue');
 audio.sync({paused:true});const position=ready.currentTime;audio.sync({paused:false});ok(ready.currentTime===position,'pause resumes at the same victory position');
}

console.log('PASS promo experience and victory '+checks+' checks');
