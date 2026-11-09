'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../dist/engine.js'),F=require('../dist/final-team.js'),A=require('../dist/attack-catalog.js'),M=require('../dist/attack-review-model.js'),P=require('../dist/physics.js');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,`${m}: ${a} / ${b}`),copy=v=>JSON.parse(JSON.stringify(v));
function native(index,mode='normal'){
 const s=E.campaign(100,{matchSeed:20261109,difficulty:mode});for(let i=0;i<index;i++){const credited=F.credit(s,s.characterId,s.spec.finalBattle.requiredDamage);s.units[1].hp-=credited;F.advance(s);}E.telegraph(s);return s;
}
function force(s,id){s.telegraph={kind:id,technique:id,targetX:s.units[0].x,targetY:s.units[0].y-22,columns:[0],radius:65,frozen:true};return E.cpuPlan(s,()=>.5);}
function timeline(before,shot,label){
 for(const fps of [30,120]){const s=copy(before),p=copy(shot),hp=s.units[0].hp;for(let t=0;t<=p.duration+1/fps;t+=1/fps)E.applyEvents(s,p,t);E.resolve(s,p);near(hp-s.units[0].hp,p.damage[0],label+' exact HP '+fps);const snapshot=JSON.stringify(s);E.resolve(s,p);ok(snapshot===JSON.stringify(s),label+' no repeated damage');}
 near(shot.events.filter(e=>e.type==='damage'&&e.unit===0).reduce((sum,e)=>sum+e.value,0),shot.damage[0],label+' labels equal actual damage');
}
// Actual frozen targets on all three authored phase-two starting platforms.
const nativeRows=[];
for(const index of [3,4,5]){
 const s=native(index),before=copy(s),p=force(s,'E_FINAL_2'),turns=p.events.filter(e=>e.type==='redirect');
 near(E.combat.points(p.damage[0]),34,'transfer hits the real '+s.characterId+' platform');ok(turns.length===3,'one turn per real projectile');
 ok(turns.every(e=>e.y<s.units[0].y-300&&e.y<s.units[1].y-300),'turn above both actors');
 for(const b of p.bullets.filter(b=>!b.effect)){
  const turn=turns.find(e=>e.bullet===b.id),tail=b.path.filter(q=>q.t>=turn.t+P.DT/2),dx=before.telegraph?.targetX??before.units[0].x;
  ok(tail.length>2,'visible descending path');const a=tail[0],z=tail.at(-1);for(const q of tail)ok(Math.abs((q.x-a.x)*(z.y-a.y)-(q.y-a.y)*(z.x-a.x))<1e-5,'straight after a single turn');
 }
 ok(p.events.filter(e=>e.type==='damage'&&e.unit===0).map(e=>E.combat.points(e.value)).join(',')==='10,14,10','three authored transfer hits');timeline(before,p,'native '+s.characterId);
 const moved=copy(s);moved.units[0].x+=180;const dodge=E.cpuPlan(moved,()=>.5);
 near(dodge.damage[0],0,'moving after warning dodges '+s.characterId);ok(JSON.stringify(dodge.bullets.map(b=>b.path.slice(0,5)))===JSON.stringify(p.bullets.map(b=>b.path.slice(0,5))),'fixed launch route after movement');
 const cover=copy(s),x=s.units[0].x;cover.spec={...cover.spec,components:[...cover.spec.components,{id:'transfer-fixed-cover',destructible:false,poly:[[x/10-30,(500-s.units[0].y+110)/10],[x/10+30,(500-s.units[0].y+110)/10],[x/10+30,(500-s.units[0].y+90)/10],[x/10-30,(500-s.units[0].y+90)/10]]}]};cover.world=E.geometry.world(cover.spec,cover.round,cover.bossPhase,cover.effects);
 const blocked=E.cpuPlan(cover,()=>.5);near(blocked.damage[0],0,'fixed roof protects '+s.characterId);ok(blocked.impacts.every(h=>h.contact?.solidId==='transfer-fixed-cover'),'projectiles actually strike the cover');
 nativeRows.push({character:s.characterId,damage:E.combat.points(p.damage[0]),turns:turns.map(e=>({x:e.x,y:e.y,t:e.t})),duration:p.duration,dodge:E.combat.points(dodge.damage[0]),cover:E.combat.points(blocked.damage[0])});
}
// Point-blank contacts isolate authored payloads from map geometry.
for(const [i,cap]of [32,34,36,38].entries()){
 const id='E_FINAL_'+(i+1),row=M.rows.find(r=>r.weaponId===id),s=M.state(row,'arena');s.units[0].hp=s.units[0].maxHp=5;
 const w=E.weapons.find(w=>w.id===id)||require('../dist/weapons.js').getEnemy(id),params=A.enemyTechniques[id].params;
 let volley=params.volley?.map(v=>({...v,offset:0,origin:{x:s.units[0].x,y:s.units[0].y-22,theta:0}}));
 const p=P.simulate(s,1,0,100,{weaponId:id,origin:{x:s.units[0].x,y:s.units[0].y-22,theta:0},...(volley?{volley}:{})});
 require('../dist/enemy-attacks.js').finalizeDamage(s,p);near(E.combat.points(p.damage[0]),cap,'authored payload '+id);timeline(s,p,id);
 const record=M.create('technique:'+id),weak=copy(record.before);weak.effects.broken=1;const full=E.cpuPlan(copy(record.before),()=>.5),part=E.cpuPlan(weak,()=>.5);near(full.damage[0],part.damage[0],'part break preserves unique '+id);
 const guard=copy(record.before);guard.guardActive=true;near(E.cpuPlan(guard,()=>.5).damage[0],full.damage[0]/2,'Guard halves unique '+id);
 const immune=copy(record.before);immune.skillEffects={invincible:true};near(E.cpuPlan(immune,()=>.5).damage[0],0,'invincibility still protects '+id);
 const low=copy(record.before);low.units[0].hp=.25;const last=E.cpuPlan(low,()=>.5);near(E.combat.points(last.damage[0]),5,'do not display overkill '+id);timeline(low,last,'remaining HP '+id);
}
// All phases include their ordinary moves and two unique attacks per six turns.
for(let phase=0;phase<4;phase++){
 const s=native(phase*3),sequence=A.finalEncounter.patterns[phase];s.units[0].hp=s.units[0].maxHp=100;
 for(const kind of sequence){E.telegraph(s);ok(s.telegraph.kind===kind,'explicit six-step pattern '+phase+'/'+kind);const frozen=copy(s.telegraph);E.telegraph(s);ok(JSON.stringify(s.telegraph)===JSON.stringify(frozen),'preview does not advance pattern');const p=E.cpuPlan(s,()=>.5);E.resolve(s,p);}
 E.telegraph(s);ok(s.telegraph.kind===sequence[0],'six-step pattern repeats');
 const entry=F.snapshot(s),stored=copy(entry);s.finalAttackPattern.step+=2;ok(F.restore(s,entry),'retry accepts pattern snapshot');ok(JSON.stringify(s.finalAttackPattern)===JSON.stringify(stored.finalAttackPattern),'retry restores pattern cursor');
}
const hand=native(0);hand.finalAttackPattern.step=2;hand.finalTeam.pending=true;F.advance(hand);E.telegraph(hand);ok(hand.finalAttackPattern.step===2&&hand.telegraph.kind==='E_FINAL_1','same-arena handoff carries pending unique');ok(hand.telegraph.targetX===hand.units[0].x,'handoff warning uses the incoming pilot');
for(let i=1;i<3;i++){hand.finalTeam.pending=true;F.advance(hand);}E.telegraph(hand);ok(hand.finalAttackPattern.phase===1&&hand.finalAttackPattern.step===0&&hand.telegraph.kind==='REFLECT','new arena restarts its explicit pattern');
const basic=M.state(M.rows.find(r=>r.weaponId==='E_FINAL_1'),'arena');basic.units[0].hp=basic.units[0].maxHp=5;basic.telegraph={kind:'LOW',targetX:basic.units[0].x,targetY:basic.units[0].y-22};const normal=E.cpuPlan(copy(basic),()=>.5);near(E.combat.points(normal.damage[0]),25,'normal maximum25');timeline(basic,normal,'normal25');basic.effects.broken=1;near(E.combat.points(E.cpuPlan(basic,()=>.5).damage[0]),18.75,'normal alone gets25% part weakening');
for(const mode of ['easy','normal','hard']){const s=native(3,mode);near(E.combat.points(s.units[0].hp),100,'player HP100 retained');near(E.combat.points(s.spec.finalBattle.requiredDamage),mode==='easy'?80:150,'prior quota retained');ok(s.shotLimit===20,'prior20 actions retained');}
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-final-attacks';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'FINAL_ATTACKS.json'),JSON.stringify({status:'PASS',checks,nativeRows,scope:'Authored final damage and defensive factors, exact contact HP, all3 native transfer platforms, frozen aim and fixed cover, six-step patterns, handoff/retry and preceding HP/action balance.'},null,2));console.log('PASS final attacks '+checks+' checks');
