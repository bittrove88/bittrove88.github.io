'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const D=require('../dist/ending-roll-data.js'),Ending=require('../dist/ending-credits.js'),C=require('../dist/cinematic-data.js');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-v300';fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{assert(v,m);checks++;};
const close=(a,b,m)=>ok(Math.abs(a-b)<1e-8,m);
const langs=[];
for(const lang of ['ja','en']){
 const frames=C.movie('epilogue',lang,{cleared:100}),plan=Ending.timeline(frames),scenes=plan.filter(c=>c.kind==='scene');
 ok(scenes.length===11,'eleven unmodified scene references');ok(scenes.every((c,i)=>c.shot===frames[i]),'original shots/cues/camera definitions retained');
 const rate=scenes[0].rate;ok(rate>=1.1&&rate<=1.2,'localized speed range');close(scenes.at(-1).end,98.2/1.15,'common story end');
 for(const cue of scenes){close((cue.end-cue.start)*rate,cue.shot.durationMs/1000,'one rate scales all scene/cue/camera time');for(const line of cue.shot.cues)ok(line.endMs<=cue.shot.durationMs,'no localized subtitle clipped');}
 for(let i=1;i<plan.length;i++){close(plan[i].start,plan[i-1].end,'gapless half-open timeline');ok(Ending.locate(plan,plan[i].start)===plan[i],'boundary belongs only to new cue');ok(Ending.locate(plan,plan[i].start-1e-6)===plan[i-1],'before boundary retains previous cue');}
 const roll=plan.find(c=>c.kind==='players_roll'),players=Ending.entries(roll);ok(players.length===10&&new Set(players.map(e=>e.id)).size===10,'ten unique player roll entries');ok(players.every(e=>e.end<=98),'all ten pass within fixed interval');
 const enemies=plan.filter(c=>['enemies','midbosses','bosses','archeart'].includes(c.kind)).flatMap(Ending.entries);
 ok(enemies.length===32&&new Set(enemies.map(e=>e.id)).size===32,'each concept enemy appears once');ok(!Ending.entries(plan.find(c=>c.kind==='bosses')).some(e=>e.id==='boss:archeart'),'Archeart excluded from three boss groups');
 for(const cue of plan.filter(c=>['enemies','midbosses','bosses'].includes(c.kind))){const entries=Ending.entries(cue).filter(e=>e.index===0);for(let t=cue.start;t<cue.end;t+=.05)ok(entries.filter(e=>t>=e.start&&t<e.end&&Ending.pose(cue,e,t,true).opacity>.01).length<=1,'reduced-motion groups never superimpose labels');}
 const heart=plan.find(c=>c.kind==='archeart');close(heart.start,145,'Archeart absolute start');close(heart.end-heart.start,4.5,'Archeart exact duration');
 const gather=plan.find(c=>c.kind==='players_gather');ok(JSON.stringify(Ending.entries(gather).map(e=>e.id))===JSON.stringify(D.players),'all ten gather once');close(gather.end,D.audio.duration-6,'fixed gather end');close(plan.at(-1).end,D.audio.duration+2.5,'full music and silence');
 for(const cue of plan.filter(c=>c.groups||c.kind==='players_roll'))for(const e of Ending.entries(cue)){
  const a=Ending.pose(cue,e,(e.start+e.end)/2),b=Ending.pose(cue,e,(e.start+e.end)/2+.1);ok(a.y>b.y||cue.kind==='archeart','continuous upward passage or singular focal shot');ok(a.opacity>.9,'individual visible midway');
 }
 langs.push({lang,originalSeconds:frames.reduce((n,f)=>n+f.durationMs/1000,0),rate,storyEnd:scenes.at(-1).end});
}
ok(D.actors.length===42,'complete runtime roster');for(const a of D.actors){const b=fs.readFileSync(path.resolve(__dirname,'../..',a.src));ok(crypto.createHash('sha256').update(b).digest('hex')===a.sha256,'adopted cutout hash '+a.id);ok(a.rgbPixelsUnchanged&&a.sourceSha256.length===64,'auditable original pixels '+a.id);}
ok(D.players.indexOf('player:rico')<D.players.indexOf('player:hibari'),'current joining order preserved');
fs.writeFileSync(path.join(out,'ENDING_300_UNIT.json'),JSON.stringify({status:'PASS',checks,langs,boundaries:D.segments,roster:D.actors.map(a=>a.id)},null,2)+'\n');console.log({status:'PASS',checks,langs});
