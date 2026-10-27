'use strict';
// Gameplay contracts: selected weapons, real displacement, shared-physics boss
// attacks and non-destructive save migration. No browser or production dependency.
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),S=require('../dist/save.js'),G=E.geometry;
let checks=0;const check=(value,label)=>{assert(value,label);checks++;},near=(a,b)=>Math.abs(a-b)<1e-7;
function flat(boss=false){
 const s=E.campaign(boss?10:1);
 s.spec={...s.spec,features:[],staticFeatures:[],phaseFeatures:null,floors:[[[0,8],[100,8]]],pickups:[],blink:[],boss};
 s.world=G.world(s.spec);s.pickups=[];
 s.units.forEach((u,i)=>Object.assign(u,{x:i?800:150,y:420,slope:0,surface:'floor0',floating:false,range:i?[320,965]:[35,650]}));
 return s;
}
function impact(s,weaponId,skill=null){return {side:0,weaponId,skill,damage:[0,1],partDamage:{},events:[],appliedEvents:0,impacts:[{x:s.units[1].x,y:s.units[1].y-22,t:0,bullet:0,hit:{unit:1,kind:'body'}}],bullets:[{id:0,primary:true}],end:{x:s.units[1].x,y:s.units[1].y-22}};}

for(const [t,value]of [[0,20],[.4,40],[.8,60],[1.2,80],[1.6,100],[2.4,60],[3.2,20]])check(near(E.chargePower(t),value),'one global 1.6-second charge sweep');
check(E.biomes.length===20&&new Set(E.biomes.map(b=>b.name)).size===20,'twenty named destinations');
for(const w of E.weapons){
 const s=E.campaign(1,{equippedWeaponId:w.id,unlockedWeaponIds:['W01',w.id]});
 check(s.mode===w.id&&s.weaponId===w.id,'explicitly equipped weapon is active at entry: '+w.id);
 check(s.angle>=(w.minAngle||-12),'entry angle is legal for '+w.id);
 const shot=E.launch(s,s.angle,65);check(shot?.weaponId===w.id,'the selected weapon actually leaves the barrel: '+w.id);
 check(s.shotCount===1&&(w.id==='W01'?s.ammo===2:s.ammo===1),'one attack spends the right stock: '+w.id);
}
check(E.campaign(1,{equippedWeaponId:'BAD'}).mode==='W01','invalid equipment falls back safely');
check(E.campaign(1,{equippedWeaponId:'W02',unlockedWeaponIds:['W01']}).mode==='W01','a malformed save cannot equip locked weapons');
{
 const s=flat();s.weaponId='W14';s.mode='W14';s.trial={id:'W02',ammo:1};
 check(E.availableWeapons(s).map(x=>x.id).join(',')==='W01,W14,W02','a trial never hides the explicitly equipped special');
 check(E.selectWeapon(s,'W14')&&E.selectWeapon(s,'W01')&&E.selectWeapon(s,'W02'),'all three choices are reachable');
 const shot=E.launch(s,30,50);check(s.trial.ammo===0&&s.ammo===2,'the new-weapon trial does not spend equipped ammunition');
 check(!E.selectWeapon(s,'W14'),'weapon cannot change during flight');E.resolve(s,shot);s.result=null;s.phase='aim';
 check(E.selectWeapon(s,'W14')&&s.ammo===2,'the equipped weapon is available after a trial');
 check(!E.selectWeapon(s,'W02'),'spent trial does not bypass the stock limit');
 s.phase='aim';s.turn=1;check(!E.selectWeapon(s,'W01'),'rival turn cannot select a player weapon');
}
{
 const s=flat();s.weaponId='W02';s.mode='W02';s.trial={id:'W02',ammo:1};
 check(E.availableWeapons(s).filter(x=>x.id==='W02').length===1&&E.availableWeapons(s)[1].ammo===3,'matching trial and equipment are one choice with all available stock');
 E.launch(s,25,50);check(s.trial.ammo===0&&s.ammo===2,'matching weapon uses its free trial first');
}
{
 const s=flat();s.weaponId='W04';check(E.selectWeapon(s,'W04')&&s.angle===55,'switching to Mortar visibly raises the legal angle');
}
{
 const push=flat(),pull=flat();E.resolve(push,impact(push,'W17'));E.resolve(pull,impact(pull,'W18'));
 check(push.units[1].x>=900&&pull.units[1].x<=705,'push and pull leave different real target positions');
 check(push.units[1].hp===2&&pull.units[1].hp===2,'utility comes with a full direct-shot equivalent');
 const before=push.units[1].x,hp=push.units[1].hp;E.resolve(push,push.last[0]);check(push.units[1].x===before&&push.units[1].hp===hp,'repeat resolution cannot apply displacement twice');
 const lift=flat();lift.spec.features=[{type:'S',v:[85,98,14,16]}];lift.world=G.world(lift.spec);
 E.resolve(lift,impact(lift,'W19'));
 check(lift.units[1].y<=350&&lift.units[1].x>=850,'Lifter lands on an actual higher supported surface');
 const landed={x:lift.units[1].x,y:lift.units[1].y};E.rebuildWorld(lift);
 check(near(lift.units[1].x,landed.x)&&near(lift.units[1].y,landed.y),'the higher landing persists beyond its animation');
 check(G.clearBody(lift.world,lift.units[1]),'a lifted target has a collision-safe body');
 const carry=flat();E.resolve(carry,impact(carry,'W19'));check(Math.abs(carry.units[1].x-800)>=40,'Lifter carries the target when no higher landing exists');
}
{
 const s=flat(true),signatures=[];
 for(const kind of ['LOW','ARC','REFLECT','FAN','CURVE','DROP','MARK','PREPARE','TWIN','TRIPLE']){
  s.spec.bossSpec={...s.spec.bossSpec,attacks:[kind]};E.telegraph(s);const before=JSON.stringify(s.units),shot=E.cpuPlan(s,E.seeded(42));
  check(JSON.stringify(s.units)===before,'planning does not move or hurt units: '+kind);
  check(shot.damage[0]<=1&&shot.damage[1]<=1,'one attack sequence has one-durability damage cap: '+kind);
  check(shot.bullets.length<=6&&shot.bullets.every(b=>b.path.every(p=>Number.isFinite(p.x+p.y+p.t))),'finite shared-physics attack: '+kind);
  signatures.push(JSON.stringify([shot.weaponId,shot.bullets.map(b=>[b.start,b.path.slice(0,4)]),shot.duration]));
  if(kind==='LOW')check(shot.angle<=32,'LOW has a genuinely low firing band');
  if(kind==='ARC')check(shot.angle>=54,'ARC has a genuinely high firing band');
  if(kind==='REFLECT')check(shot.events.some(e=>e.type==='bounce'),'REFLECT makes a real collision reflection');
  if(kind==='FAN')check(shot.bullets.length===3,'FAN launches a spread');
  if(kind==='CURVE')check(shot.events.some(e=>e.type==='curve'),'CURVE changes velocity in the physics engine');
  if(kind==='PREPARE')check(shot.bullets[0].start>=.8,'PREPARE has a visible wind-up before flight');
  if(kind==='TWIN')check(shot.bullets.length===2&&shot.bullets[1].start>=.25,'TWIN is a two-shot sequence');
  if(kind==='TRIPLE')check(shot.bullets.length===3&&shot.bullets[2].start>=.4,'TRIPLE has three staggered arcs');
 }
 check(new Set(signatures).size===signatures.length,'attack names do not alias the same flight');
 s.spec.bossSpec={...s.spec.bossSpec,attacks:['DROP']};E.telegraph(s);const marked=s.telegraph.targetX;s.units[0].x=350;
 const drop=E.cpuPlan(s,E.seeded(9));check(drop.path[0].x===marked&&drop.damage[0]===0,'DROP follows the frozen warning, not the current player position');
 const covered=flat(true);covered.spec.features=[{type:'R',v:[10,22,18]}];covered.world=G.world(covered.spec);covered.spec.bossSpec={...covered.spec.bossSpec,attacks:['DROP']};E.telegraph(covered);
 const blocked=E.cpuPlan(covered,E.seeded(9));check(blocked.end.y<=320.001&&blocked.damage[0]===0,'overhead attacks collide with real cover');
}
{
 const s=flat();s.spec.features=[{type:'M',v:[50,25,20,1]},{type:'T',v:[35,20]}];s.world=G.world(s.spec);
 const initial=s.world.regions[0].direction;
 E.applyEvents(s,{events:[{type:'terminal',t:0}],appliedEvents:0},Infinity);
 check(s.world.regions[0].direction===initial&&s.effects.pendingPolarity===-initial,'a terminal schedules the change without altering the flying shot');
 E.boundary(s);check(s.world.regions[0].direction===-initial&&s.effects.pendingPolarity===undefined,'the scheduled polarity applies once at the boundary');
 E.boundary(s);check(s.world.regions[0].direction===-initial,'a terminal toggle is not repeated every round');
}
{
 const raw=JSON.stringify({schemaVersion:2,contentRevision:'1.1.0',cleared:87,unlockedWeaponIds:['W01','W14'],collectedCosmeticIds:['S01','B03'],equippedWeaponId:'W14',equippedCosmeticId:'B03',seenPreviewIds:['controls','v2:reflection','v2:W14','v2:PHASE','unknown']});
 const s=S.decode(raw);check(s.cleared===87&&s.equippedWeaponId==='W14'&&s.equippedCosmeticId==='B03','content update preserves progress and explicit equipment');
 check(s.collectedCosmeticIds.length===2&&s.unlockedWeaponIds.length===2,'content update preserves collection');
 check(s.contentRevision==='2.0.0'&&s.legacyBackup===raw,'the previous content save has a recoverable backup');
 check(s.seenPreviewIds.includes('controls')&&s.seenPreviewIds.includes('v2:reflection')&&s.seenPreviewIds.includes('v2:W14')&&s.seenPreviewIds.includes('v2:PHASE')&&!s.seenPreviewIds.includes('unknown'),'corrected previews have separate, validated acknowledgement IDs');
 const old=S.decode('{"version":1,"cleared":99}');check(old.cleared===99&&old.unlockedWeaponIds.join(',')==='W01'&&!!old.legacyBackup,'v1 migration remains independent from new collection');
}
(async()=>{
 let writes=0;const failed=S.create({load:async()=>{throw Error('offline');},save:async()=>writes++});await failed.load();await failed.save();check(writes===0&&!failed.ready,'failed load can never overwrite progress');
 let shouldFail=true;const store=S.create({load:async()=>null,save:async()=>{writes++;if(shouldFail)throw Error('quota');}});await store.load();await store.save();check(store.dirty,'failed save remains retryable');shouldFail=false;await store.save();check(!store.dirty,'retry persists the latest state');
 console.log(JSON.stringify({status:'PASS',checks,scope:'Selected weapon/stock, real displacement, shared-physics attack signatures, charge timing and preserving legacy saves; deterministic fixtures, not a human playtest.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
