'use strict';
// The lesson must perform the action it claims to teach. These assertions use
// returned trajectories, contacts and before/after states, not proof.valid alone.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),Preview=require('../dist/preview.js'),G=E.geometry;
let checks=0;const rows=[];
const check=(condition,message)=>{assert(condition,message);checks++;};
const near=(a,b,tolerance=1e-6)=>Math.abs(a-b)<=tolerance;
const copy=value=>JSON.parse(JSON.stringify(value));
const at=(plan,time,bullet=0)=>{const p=plan.bullets[bullet].path;return p.find(q=>q.t>=time)||p.at(-1);};
const angleOf=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
function featureEvent(id){return {pickup:'pickup',reflection:'bounce',C:'cloud',K:'bounce',U:'updraft',F:'wind',V:'vent',M:'magnet',terminal:'terminal'}[id];}
function lesson(stage,id){
 const s=E.campaign(stage),unchanged=JSON.stringify(s),random=s.random,start=performance.now(),preview=Preview.create(s,id),elapsed=performance.now()-start;
 check(JSON.stringify(s)===unchanged&&s.random===random,`L${stage}/${id}: preparing a lesson leaves the live duel untouched`);
 check(!!preview,`L${stage}/${id}: a designed example exists`);
 check(preview.proof?.valid===true,`L${stage}/${id}: example passed its own preparation guard`);
 check(preview.state!==s&&preview.before.units!==s.units&&preview.after.units!==s.units,`L${stage}/${id}: demonstration actors are isolated`);
 check(preview.state.world!==s.world,`L${stage}/${id}: demonstration geometry is isolated`);
 check(Number.isFinite(preview.duration)&&preview.duration>0&&preview.duration<16,`L${stage}/${id}: a finite short loop`);
 check(preview.state.world.waters.length===0&&preview.after.world.waters.length===0,`L${stage}/${id}: no water mechanics remain`);
 const variants=preview.variants||[preview];
 for(const p of variants){
  check(p.flightStart>=0&&p.flightEnd>=p.flightStart&&p.flightEnd<p.duration,`L${stage}/${id}: visible action precedes aftermath`);
  if(!p.plan)continue;
  check(p.pose.angle===p.plan.angle&&p.pose.power===p.plan.power&&p.pose.mode===p.plan.weaponId,`L${stage}/${id}: visible barrel, gauge and weapon match the demonstrated shot`);
  const muzzle=G.muzzle(p.before,0,p.pose.angle);
  check(p.plan.bullets.every(b=>{const split=p.plan.events.find(e=>e.type==='split'&&near(e.t,b.start));const origin=split||muzzle;return near(b.path[0].x,origin.x)&&near(b.path[0].y,origin.y);}),`L${stage}/${id}: shots start at the visible muzzle and children at the shown split`);
  check(p.plan.bullets.every(b=>b.path.every(q=>Number.isFinite(q.x+q.y+q.t))),`L${stage}/${id}: finite demonstration paths`);
  check(p.plan.events.every(e=>e.t<=p.plan.duration+1e-6),`L${stage}/${id}: no hidden future event supplies the teaching claim`);
 }
 const event=featureEvent(preview.id);
 if(event){
  const shown=preview.plan.events.find(e=>e.type===event);
  check(!!shown,`L${stage}/${id}: the claimed ${event} is in the displayed trajectory`);
  if(preview.id==='reflection')check(shown.surface==='reflector'&&preview.before.world.solids.some(o=>o.id===shown.solidId&&o.kind==='reflector'),`L${stage}: reflection occurs on an actual reflective ground slab`);
  if(preview.id==='K')check(shown.surface==='crystal',`L${stage}: mirror lesson actually strikes the mirror`);
  if(preview.id==='pickup')check(preview.after.pickups.some(p=>p.id===shown.id&&p.collected)&&preview.before.pickups.some(p=>p.id===shown.id&&!p.collected),`L${stage}: a capsule is really collected`);
  if(['C','U','F','V','M'].includes(preview.id)){
   const baseline=copy(preview.before);baseline.world.regions=baseline.world.regions.filter(r=>r.kind!==preview.id);
   const normal=E.trajectory(baseline,0,preview.pose.angle,preview.pose.power),time=Math.min(preview.plan.duration,shown.t+.4),a=at(preview.plan,time),b=at(normal,time);
   check(time-shown.t>=.15&&Math.hypot(a.x-b.x,a.y-b.y)>6,`L${stage}/${id}: the displayed force visibly changes the shot, not only an event label`);
  }
  if(preview.id==='terminal')check(preview.after.world.regions.some(r=>r.kind==='M'&&r.direction!==preview.before.world.regions.find(v=>v.id===r.id)?.direction),`L${stage}: terminal changes the next field state`);
 }
 if(preview.id==='slope'||preview.id==='height')check(Math.abs(preview.after.units[0].x-preview.before.units[0].x)>30&&Math.abs(preview.after.units[0].y-preview.before.units[0].y)>8,`L${stage}: moving demonstrates an actual elevation change`);
 if(preview.id==='roof'){
  const roof=preview.before.world.solids.find(o=>o.kind==='roof');
  check(!!roof&&preview.plan.bullets.some(b=>b.path.some(q=>q.x>roof.poly[0].x+10&&q.x<roof.poly[1].x-10&&q.y>roof.poly[2].y+6)),`L${stage}: the shown shot reaches below the roof`);
 }
 if(preview.id==='B'){
  check(variants.length===2,'bridge lesson compares two states');
  const bridges=variants.map(p=>p.before.world.solids.find(o=>o.kind==='bridge'));
  check(bridges.every(Boolean)&&JSON.stringify(bridges[0].poly)!==JSON.stringify(bridges[1].poly),'bridge actually opens/closes despite two-turn holds');
  check(near(variants[0].pose.angle,variants[1].pose.angle)&&near(variants[0].pose.power,variants[1].pose.power),'bridge comparison keeps the same shot input');
  check(Math.hypot(variants[0].plan.end.x-variants[1].plan.end.x,variants[0].plan.end.y-variants[1].plan.end.y)>35,'bridge state causes a visibly different result');
 }
 if(preview.id==='V'){
  check(variants.length===2&&variants[0].before.world.regions.some(r=>r.kind==='V'&&r.on)&&variants[1].before.world.regions.every(r=>r.kind!=='V'||!r.on),'vent lesson genuinely compares ON/OFF');
  check(!variants[1].plan.events.some(e=>e.type==='vent'),'OFF example receives no vent force');
 }
 if(preview.id==='controls')check(near(preview.releaseAt,E.chargeDuration*(65-20)/80)&&preview.plan.path.length>=4&&Math.hypot(preview.plan.path.at(-1).x-preview.plan.path[0].x,preview.plan.path.at(-1).y-preview.plan.path[0].y)>90,'hold/release loop uses the live charge speed and visibly launches');
 rows.push({stage,id,source:preview.source,elapsedMs:Math.round(elapsed*100)/100,duration:Math.round(preview.duration*100)/100});return preview;
}

for(const level of E.levels){
 if(level.lesson)lesson(level.id,level.lesson);
 else{const s=E.campaign(level.id);check(Preview.create(s,level.lesson)===null,`L${level.id}: a rest/application stage never invents a generic lesson`);}
}
for(const weapon of E.weapons){
 const stage=E.levels.find(s=>s.pickups.some(p=>p.id===weapon.id))?.id||1,p=lesson(stage,weapon.id),plan=p.plan;
 check(plan.weaponId===weapon.id&&plan.damage[1]>0,`${weapon.id}: that weapon performs a useful attack`);
 const events=plan.events;
 if(['W05','W06','W08','W20'].includes(weapon.id)){
  const bounces=events.filter(e=>e.type==='bounce');check(bounces.length>=({'W05':1,'W06':2,'W08':2,'W20':1}[weapon.id]),`${weapon.id}: its reflection pattern is visible`);
  if(weapon.id==='W08')check(bounces.some(e=>e.surface==='reflector'),'Skipper demonstrates its low ground skips');
 }
 if(weapon.id==='W07'){
  const roll=events.find(e=>e.type==='roll');check(!!roll&&plan.path.some(q=>q.t>roll.t&&q.x>roll.x+60&&Math.abs(q.y-roll.y)<4),'Roller travels along the ground before hitting');
 }
 if(weapon.id==='W09')check(plan.bullets.length===3&&new Set(plan.bullets.map(b=>angleOf(b.path[0],b.path[1]).toFixed(3))).size===3,'Fan shows three different initial directions');
 if(weapon.id==='W10')check(events.some(e=>e.type==='split')&&plan.bullets.length===4&&plan.bullets.slice(1).every(b=>b.start>0),'Cluster visibly splits after the parent reaches its apex');
 if(weapon.id==='W11')check(plan.bullets.length===2&&plan.bullets[1].start-plan.bullets[0].start>=.25&&plan.impacts.filter(i=>i.hit?.unit===1).length===2,'Twin actually lands both staggered shots');
 if(weapon.id==='W12'){
  const burst=events.find(e=>e.type==='airburst');check(!!burst&&burst.y<p.before.units[1].y-5,'Airburst detonates in air before ground contact');
 }
 if(weapon.id==='W13'){
  const phase=events.find(e=>e.type==='phase'),wall=phase&&p.before.world.solids.find(o=>o.kind==='solid'&&phase.x>=o.poly[0].x-1&&phase.x<=o.poly[1].x+1);
  check(!!wall&&plan.path.some(q=>q.t>phase.t&&q.x>wall.poly[1].x+8),'Drill visibly exits the actual thin wall');
 }
 if(weapon.id==='W15')check(events.some(e=>e.type==='dive')&&plan.impacts.some(i=>i.t>events.find(e=>e.type==='dive').t),'Archer dives and then lands the useful hit');
 if(weapon.id==='W16')check(events.some(e=>e.type==='wave'&&e.path.some(q=>Math.abs(q.x-p.before.units[1].x)<28)),'Undercut ground wave reaches the target');
 if(['W17','W18','W19','W20'].includes(weapon.id)){
  const before=p.before.units[1],after=p.after.units[1];
  if(weapon.id==='W18')check(after.x<before.x-30,'Magnet leaves the target pulled closer');
  else if(weapon.id==='W19')check(after.y<before.y-30&&G.clearBody(p.after.world,after),'Lifter leaves the target on a real higher safe landing');
  else check(after.x>before.x+30,`${weapon.id}: impact changes the real target position`);
 }
}
for(const skill of E.skills){
 const stage=E.levels.find(s=>skill in s.skills)?.id||1,p=lesson(stage,skill);
 if(skill==='BLINK')check(Math.hypot(p.after.units[0].x-p.before.units[0].x,p.after.units[0].y-p.before.units[0].y)>30&&G.clearBody(p.after.world,p.after.units[0]),'BLINK visibly lands at a different safe position');
 if(skill==='BURST')check(p.plan.damage[1]>E.trajectory(p.before,0,p.pose.angle,p.pose.power,{skill:null}).damage[1],'BURST reaches a target outside the ordinary attack result');
 if(skill==='SWAP')check(near(p.after.units[0].x,p.before.units[1].x)&&near(p.after.units[1].x,p.before.units[0].x),'SWAP actually exchanges both actors');
 if(skill==='PUSH'||skill==='PULL')check((p.after.units[1].x-p.before.units[1].x)*(skill==='PUSH'?1:-1)>30,`${skill} moves the real target in the stated direction`);
 if(skill==='BOUNCE')check(p.plan.events.some(e=>e.type==='bounce'),'BOUNCE actually reflects the shot');
 if(skill==='SPLIT')check(p.plan.events.some(e=>e.type==='split')&&p.plan.bullets.length===4,'SPLIT actually creates children at the apex');
 if(skill==='PHASE'){
  const event=p.plan.events.find(e=>e.type==='phase'),wall=p.before.world.solids.find(o=>o.kind==='solid');
  check(!!event&&p.plan.path.some(q=>q.x>wall.poly[1].x+8),'PHASE exits its wider wall rather than stopping inside');
 }
}
const boss=lesson(80,'boss-swap');check(boss.after.units[1].exposed>boss.before.units[1].exposed&&boss.after.units[1].facingCore!==boss.before.units[1].facingCore,'large-boss SWAP turns its real exposed core');
const s=E.campaign(1),before=JSON.stringify(s);check(Preview.create(s,'unknown')===null&&Preview.create(s,null)===null,'unknown/missing lessons do not replay a generic ordinary shot');check(JSON.stringify(s)===before,'invalid lesson preparation is inert');
const report={status:'PASS',checks,demonstrations:rows.length,maxPreparationMs:Math.max(...rows.map(r=>r.elapsedMs)),rows,scope:'Shared-physics causal lesson tests, including every declared campaign lesson, all20weapons and8skills. Checks shown contacts and resulting states; no claim of human comprehension or physical-device QA.'};
const output=process.env.ARCLINE_EVIDENCE_DIR;if(output){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'PREVIEWS.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,rows:undefined},null,2));
