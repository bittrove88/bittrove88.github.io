'use strict';
// Curriculum eligibility and actual teaching causality are checked separately
// from browser layout and the existing weapon/contact regression fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),P=require('../dist/preview.js'),L=require('../dist/lessons.js'),S=require('../dist/save.js');
const authored=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../design/preview_curriculum.json'),'utf8'));
const output=process.env.ARCLINE_EVIDENCE_DIR||'/workspace/work/arcline-clarity/curriculum';fs.mkdirSync(output,{recursive:true});
let checks=0;const rows=[],demonstrations=[];
const ok=(v,m)=>{checks++;assert(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,m);
const fresh=()=>({unlockedWeaponIds:['W01'],equippedWeaponId:'W01',seenPreviewIds:[]});
eq(L.stages,authored.stages,'runtime curriculum exactly matches the explicit design source');
eq(L.ids.slice().sort(),Object.keys(authored.descriptions).sort(),'every authored description is available to the game');
eq(L.stages.map(r=>r.stage),Array.from({length:100},(_,i)=>i+1),'all100 stages have an explicit ordered curriculum record');
const expectedFirst=new Map([[1,'controls'],[2,'aim'],[3,'pickup'],[4,'slope'],[6,'reflection'],[10,'boss-core']]);
const featureFor={reflection:'W',B:'B',roof:'R',C:'C',K:'K',U:'U',F:'F',V:'V',M:'M',terminal:'T'};
const firstSkills=new Set();
for(const spec of E.levels){
 const save=fresh(),state=E.campaign(spec.id,save),record=L.stages[spec.id-1],before=JSON.stringify(state),random=state.random;
 eq(record.name,spec.name,'stage name belongs to the actual level '+spec.id);
 eq(record.theme,spec.themeName,'theme belongs to the actual level '+spec.id);
 eq(record.skillChoices,Object.keys(spec.skills),'offered skills match actual stock at level '+spec.id);
 const introduced=Object.keys(spec.skills).filter(id=>!firstSkills.has(id));
 eq(record.firstSkillChoices,introduced,'first-use skill introduction is recorded at its actual first stage '+spec.id);
 for(const id of introduced)firstSkills.add(id);
 eq(record.weaponCapsules,spec.pickups.filter(p=>/^W\d\d$/.test(p.id)).map(p=>p.id),'weapon introduction capsules match actual map '+spec.id);
 ok(record.entry===null||typeof record.entry==='string','a stage defines at most one primary entry concept');
 const eligible=L.forStage(state,save);
 ok(eligible.length<=1,'Standard loadout never starts a cascade of unrelated lessons at level '+spec.id);
 eq(eligible.map(x=>x.id),record.entry?[record.entry]:[],'application stages stay quiet; introduction stages teach their own concept '+spec.id);
 if(expectedFirst.has(spec.id))eq(record.entry,expectedFirst.get(spec.id),'early lessons follow FIRE → AIM → capsule → MOVE → reflection → boss armor');
 if(record.entry){
  const info=L.describe(record.entry);ok(info&&info.instruction.length>8&&info.outcome.length>8,'a named action and a named result exist for '+record.entry);
  const type=featureFor[record.entry];if(type)ok(spec.features.some(f=>f.type===type),'feature instruction is relevant to the authored map '+spec.id);
  if(record.entry==='pickup')ok(state.pickups.some(p=>!p.collected),'collection is introduced while a real capsule exists');
  if(record.entry==='boss-core')ok(spec.boss&&state.units[1].parts.some(p=>p.hp>0),'armor is introduced on an actual intact boss');
  if(record.entry==='boss-swap')ok(spec.boss&&state.skills.SWAP>0,'core rotation is introduced only with an available SWAP skill');
  const acknowledged={...save,seenPreviewIds:[info.key]};eq(L.forStage(state,acknowledged),[],'an acknowledged entry concept does not replay on stage retry '+spec.id);
 }
 eq(JSON.stringify(state),before,'planning first-use guidance cannot change live gameplay '+spec.id);ok(state.random===random,'planning does not replace the live random source '+spec.id);
 rows.push({stage:spec.id,entry:record.entry,firstSkillChoices:introduced,weaponCapsules:record.weaponCapsules});
}
eq([...firstSkills].sort(),E.skills.slice().sort(),'all8 skills have a first actual opportunity');
{
 const pickup=E.campaign(3);for(const item of pickup.pickups)item.collected=true;
 eq(L.forStage(pickup,fresh()),[],'a replay with every capsule already collected does not teach an absent pickup');
 const boss=E.campaign(10);for(const part of boss.units[1].parts)part.hp=0;
 eq(L.forStage(boss,fresh()),[],'broken armor is not presented as an intact outer-part lesson');
 const rotation=E.campaign(80);rotation.skills.SWAP=0;
 eq(L.forStage(rotation,fresh()),[],'a core-rotation lesson is not offered without SWAP stock');
}

// Owning an unlock, carrying stock, selecting it, and acknowledging its teaching
// are distinct states. A pickup never teaches an unselected new weapon.
for(const weapon of E.weapons.filter(w=>w.id!=='W01')){
 const save={...fresh(),unlockedWeaponIds:['W01',weapon.id],equippedWeaponId:weapon.id},state=E.campaign(5,save);
 ok(L.forWeapon(state,weapon.id,save)?.id===weapon.id,'equipped stocked weapon is eligible '+weapon.id);
 eq(L.forStage(state,save).map(x=>x.id),[weapon.id],'a quiet practice stage can introduce the selected special '+weapon.id);
 ok(E.selectWeapon(state,'W01'),'Standard remains selectable');eq(L.forWeapon(state,weapon.id,save),null,'owning/carrying an unselected weapon is not a reason to interrupt '+weapon.id);
 state.trial={id:weapon.id,ammo:1};eq(L.forWeapon(state,weapon.id,save),null,'new pickup does not automatically open a weapon demonstration '+weapon.id);
 ok(E.selectWeapon(state,weapon.id),'actual selection accepts available stock '+weapon.id);ok(L.forWeapon(state,weapon.id,save),'selection makes the same weapon teachable '+weapon.id);
 eq(L.forWeapon(state,weapon.id,{...save,seenPreviewIds:['v3:'+weapon.id]}),null,'revised acknowledgement suppresses repeat '+weapon.id);
 state.ammo=0;state.trial.ammo=0;eq(L.forWeapon(state,weapon.id,save),null,'empty stock is not presented as an available tool '+weapon.id);
}
for(const id of E.skills){
 const stage=E.levels.find(s=>s.skills[id]>0).id,state=E.campaign(stage),save=fresh();
 eq(L.forSkill(state,id,save),null,'unselected skill does not interrupt entry '+id);ok(E.selectSkill(state,id),'the granted skill can be selected '+id);ok(L.forSkill(state,id,save)?.id===id,'selected skill with real stock is eligible '+id);
 eq(L.forSkill(state,id,{...save,seenPreviewIds:['v3:'+id]}),null,'acknowledged skill does not replay '+id);
 state.skillUsed=true;eq(L.forSkill(state,id,save),null,'used-this-turn skill cannot advertise an actionable preview '+id);state.skillUsed=false;state.skills[id]=0;eq(L.forSkill(state,id,save),null,'empty skill cannot advertise availability '+id);
}

// New acknowledgements survive the same decoding path as a real save/reload,
// while existing progression, equipment and historical acknowledgements remain.
const prior={schemaVersion:2,contentRevision:S.revision,cleared:79,unlockedWeaponIds:['W01','W14'],collectedCosmeticIds:['S01','B01'],equippedWeaponId:'W14',equippedCosmeticId:'S01',seenPreviewIds:['v2:controls',...L.keys]};
const restored=S.decode(JSON.stringify(prior));eq(restored.seenPreviewIds,prior.seenPreviewIds,'all50 v3 lesson keys survive save decoding');eq(restored.cleared,79);eq(restored.unlockedWeaponIds,prior.unlockedWeaponIds);eq(restored.collectedCosmeticIds,prior.collectedCosmeticIds);eq(restored.equippedWeaponId,'W14');eq(restored.equippedCosmeticId,'S01');
ok(!L.seen('controls',{seenPreviewIds:['v2:controls']}),'old content acknowledgement does not skip the revised explanation');ok(L.seen('controls',restored),'new explanation is acknowledged after reload');

function verifyPreview(stage,id){
 const state=E.campaign(stage),before=JSON.stringify(state),random=state.random,preview=P.create(state,id);
 ok(preview&&preview.proof.valid,'a real causal example exists for '+stage+'/'+id);
 ok(preview.before!==state&&preview.before.world!==state.world&&preview.after.units!==state.units,'preview uses isolated geometry and actors '+id);
 ok(preview.instruction.length>8&&preview.outcome.length>8&&preview.context.length>3,'preview explains one action and its result '+id);
 const variants=preview.variants||[preview];let offset=0;
 for(const v of variants){
  ok(v.flightStart>=.8,'readable setup pause precedes the action '+id);ok(v.duration-v.flightEnd>=1.65-1e-8,'the outcome remains visible long enough '+id);
  const watch=P.at(preview,offset+v.flightStart*.5),result=P.at(preview,offset+v.flightEnd+.8);
  eq(watch.phase,'WATCH','setup and action have separate phases '+id);eq(result.phase,'RESULT','outcome has an explicit phase '+id);near(result.effectProgress,1,'the settled before/after change is visible '+id);eq(result.description,v.outcome,'outcome text describes the visible result '+id);
  if(v.plan){
   const mid=P.at(preview,offset+(v.flightStart+v.flightEnd)*.5);
   eq(mid.phase,'SHOT','physics action has an explicit phase '+id);near(mid.flight,v.plan.duration/2,'displayed time is the actual midpoint of the physics trajectory '+id);near(v.playbackRate,.65,'the action is slowed consistently '+id);near(v.flightEnd-v.flightStart,v.plan.duration/.65,'the whole physics path is shown at the declared rate '+id);near(result.flight,v.plan.duration,'result does not advance the projectile past its physics endpoint '+id);
   eq(mid.pose.angle,v.plan.angle,'barrel agrees with the shown shot during action '+id);eq(mid.pose.power,v.plan.power,'gauge agrees with the shown shot '+id);eq(mid.pose.mode,v.plan.weaponId,'weapon agrees with the shown shot '+id);
  }
  offset+=v.duration;
 }
 const first=P.at(preview,.1),loop=P.at(preview,preview.duration+.1);eq(loop.phase,first.phase,'loop returns to setup '+id);near(loop.age,first.age,'loop uses the same local clock '+id);
 eq(JSON.stringify(state),before,'preparation and complete timeline leave live duel unchanged '+id);ok(state.random===random,'preview leaves random state unchanged '+id);
 demonstrations.push({stage,id,variants:variants.length,duration:preview.duration});return preview;
}
for(const r of L.stages.filter(r=>r.entry))verifyPreview(r.stage,r.entry);
for(const w of E.weapons){const stage=E.levels.find(s=>s.pickups.some(p=>p.id===w.id))?.id||1;verifyPreview(stage,w.id);}
for(const id of E.skills)verifyPreview(E.levels.find(s=>s.skills[id]>0).id,id);
const controls=verifyPreview(1,'controls');ok(controls.plan.damage[1]>0&&controls.after.units[1].hp<controls.before.units[1].hp,'FIRE visibly launches and hits the demonstration target');near(controls.releaseAt,.9,'65% release uses the unchanged1.6s charge speed');near(P.at(controls,0).displayPower,20,'control demonstration starts at minimum power');near(P.at(controls,.45).displayPower,42.5,'visible mini gauge follows actual charge timing');near(P.at(controls,.9).displayPower,65,'the demonstrated shot releases at the shown power');
const aim=verifyPreview(2,'aim'),[low,high]=aim.variants;eq([low.pose.angle,high.pose.angle],[24,64],'aiming compares two clearly different real angles');near(low.pose.power,high.pose.power,'the comparison changes angle while keeping power fixed');ok(Math.min(...high.plan.path.map(p=>p.y))<Math.min(...low.plan.path.map(p=>p.y))-40,'higher aim produces a visibly higher real arc');ok(Math.abs(P.at(aim,.1).pose.angle-P.at(aim,low.flightStart-.1).pose.angle)>20,'the barrel visibly rotates while the aim input is shown');
const moved=verifyPreview(4,'move');ok(Math.abs(moved.after.units[0].x-moved.before.units[0].x)>30,'movement actually changes world position');ok(E.geometry.clearBody(moved.after.world,moved.after.units[0]),'movement leaves the rover on a real safe surface');
eq(moved.cue.control,'stick','movement demonstrates the movement control');eq(moved.cue.axis,Math.sign(moved.after.units[0].x-moved.before.units[0].x),'shown stick deflection agrees with the actual travel direction');ok(P.at(moved,moved.flightStart*.5).cue.active,'the movement input is shown during setup');
// A label may describe a result only once the physics interaction has happened.
// These trigger times come from actual hit/contact events, independently of the
// presentation's annotationAt value, so an early claim cannot satisfy the test.
for(const [stage,id,label,event] of [[1,'controls','HIT','hit'],[3,'pickup','COLLECTED','pickup'],[6,'reflection','BOUNCE','reflection']]){
 const p=P.create(E.campaign(stage),id),trigger=event==='hit'?p.plan.impacts.find(i=>i.hit?.unit===1):p.plan.events.find(e=>event==='reflection'?e.type==='bounce'&&e.surface==='reflector':e.type==='pickup');
 ok(!!trigger,'the displayed '+label+' has a real causal interaction');near(p.annotationAt,trigger.t,label+' timing comes from the actual interaction');eq(P.at(p,p.flightStart*.5).annotation,null,label+' is not claimed during setup');
 const before=P.at(p,p.flightStart+(trigger.t-.02)/p.playbackRate),after=P.at(p,p.flightStart+(trigger.t+.002)/p.playbackRate);
 eq(before.annotation,null,label+' is not shown while the projectile is still approaching');eq(after.annotation?.label,label,label+' appears when the physical interaction occurs');eq(P.at(p,p.flightEnd+.8).annotation?.label,label,label+' remains readable during the aftermath');
}
{
 let offset=0;
 for(const [index,v] of aim.variants.entries()){
  const apex=v.plan.path.reduce((a,b)=>b.y<a.y?b:a),label=index?'HIGH ARC':'LOW ARC';eq(v.annotation.label,label,'each aiming comparison names its own arc');near(v.annotation.x,apex.x,'aim annotation points to its own real apex x');near(v.annotation.y,apex.y,'aim annotation points to its own real apex y');near(v.focus.x,apex.x,'aim framing includes the apex being taught');near(v.focus.y,apex.y,'aim framing includes the apex height');near(v.annotationAt,apex.t,'aim label appears at its actual apex');
  eq(P.at(aim,offset+v.flightStart+(apex.t-.02)/v.playbackRate).annotation,null,'the arc label waits for its own apex');eq(P.at(aim,offset+v.flightStart+(apex.t+.002)/v.playbackRate).annotation?.label,label,'the reached apex receives the correct label');offset+=v.duration;
 }
}
const boss=verifyPreview(10,'boss-core'),[armor,core]=boss.variants;ok(armor.after.units[1].parts.some((p,i)=>p.hp<=0&&armor.before.units[1].parts[i].hp>0),'boss demonstration breaks an actual outer part');eq(core.before.units[1].parts.map(p=>p.hp),armor.after.units[1].parts.map(p=>p.hp),'the exposed-core shot follows the broken armor state');ok(core.plan.events.some(e=>e.type==='weak')&&core.plan.damage[1]>1,'the follow-up really hits the vulnerable core');ok(core.after.units[1].hp<core.before.units[1].hp,'the vulnerable-core hit has a visible result');
const report={status:'PASS',recordedAt:new Date().toISOString(),checks,stages:rows,demonstrations,method:'Deterministic explicit100-stage curriculum eligibility, selected/stocked tool conditions and save decode roundtrip; actual shared-physics trajectories and isolated before/after states verify slower setup/action/result playback, real aiming, movement and boss armor/core causality. No browser layout, human comprehension, physical-device or campaign-completion claim.'};
fs.writeFileSync(path.join(output,'PREVIEW_CURRICULUM.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks,stages:rows.length,demonstrations:demonstrations.length},null,2));
