'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),C=E.combat,G=E.geometry,W=require('../dist/weapons.js'),P=require('../dist/preview.js'),S=require('../dist/save.js'),R=require('../dist/campaign-run.js'),I=require('../dist/inventory.js'),A=require('../dist/aim-guide.js');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-machine-combat';fs.mkdirSync(out,{recursive:true});let checks=0;const ok=(v,m)=>{checks++;assert(v,m);},equal=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m+' '+a+' vs '+b);
function arena(id,boss=false){const s=E.campaign(4,{equippedCharacterId:id,matchSeed:20261031,battleInventory:{weapons:{W06:2},skills:{BURST:2}}});s.spec={...s.spec,boss,floors:[[[0,10],[100,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};s.world=G.world(s.spec);s.units=[160,700].map((x,i)=>({...G.safePosition(s.world,x,400),hp:i?100:C.get(id).hp/20,maxHp:i?100:C.get(id).hp/20,range:[35,965],parts:[],exposed:boss&&i?2:0}));return s;}
function aimed(s,weaponId,offset=0,power=100,boss=false){const u=s.units[1],origin={x:u.x-(offset?10:48),y:u.y-(boss?77:22)+offset,theta:0,dx:1,dy:0,dir:1};return E.trajectory(s,0,0,power,{weaponId,origin});}
function nextPlayer(s){E.next(s);if(s.turn){const shot=E.launch(s,85,20);E.resolve(s,shot);if(!s.result)E.next(s);}s.phase='aim';}
equal(C.profiles.map(p=>p.id),S.characterIds,'ten combat profiles match saved machine ids');equal(W.weapons.map(w=>w.id),S.weaponIds,'all twenty legacy ownership ids remain');ok(C.weapons.length===20,'two unique machine weapons per profile');
const previews=[],damageRows=[];
for(const p of C.profiles){
 const s=arena(p.id);near(s.units[0].hp,p.hp/20,'authored durability '+p.id);ok(s.specialAmmo===3,'three special uses at entry '+p.id);
 const selection=E.availableWeapons(s);ok(selection.some(w=>w.id==='W01'&&w.ammo===Infinity)&&selection.some(w=>w.id===p.special.id&&w.ammo===3),'normal and special are separate from auxiliary '+p.id);
 for(const power of[20,60,100])near(aimed(s,'W01',-30,power).damage[1],1,'normal body damage remains twenty '+p.id+' '+power);
 near(aimed(s,'W01').damage[1],1.5,'center normal hit is thirty '+p.id);
 near(aimed(arena(p.id,true),'W01',0,100,true).damage[1],2,'normal weak core hit is forty '+p.id);
 near(E.chargePower(p.charge.rise,s),100,'character charge reaches max '+p.id);near(E.chargePower(p.charge.rise+.125,s),100,'maximum hold window '+p.id);near(E.chargePower(p.charge.rise+.25+p.charge.fall/2,s),60,'falling half charge '+p.id);
 const tele=arena(p.id);E.selectTeleport(tele);near(E.chargePower(1.3,tele),60,'teleport charge is common '+p.id);
 const before=JSON.stringify(s),demo=P.create(s,p.special.id);ok(demo?.proof.valid,'causal special preview '+p.id);equal(JSON.stringify(s),before,'preview and virtual movement never mutate live combat '+p.id);ok(demo.before.specialAmmo===3&&demo.after.specialAmmo===2,'preview demonstrates a single use '+p.id);
 const plan=demo.plan;ok(plan.damage[1]<=p.special.damageCap+1e-6,'special per-target aggregate cap '+p.id);ok(Object.values(plan.partDamage).every(d=>d<=p.special.damageCap+1e-6),'part cap cannot bypass attack cap '+p.id);
 const clone=JSON.parse(JSON.stringify(demo.before)),launched=E.launch(clone,plan.angle,plan.power);ok(clone.shotCount===1&&clone.specialAmmo===2,'multi-projectile special costs one action and use '+p.id);const inventory=I.fromState(clone);E.resolve(clone,launched);equal(I.fromState(clone),inventory,'special never spends auxiliary or skill '+p.id);const settled=JSON.stringify(clone);E.resolve(clone,launched);equal(JSON.stringify(clone),settled,'resolve cannot apply special twice '+p.id);
 if(p.id==='hana')ok(plan.bullets.length===3&&plan.bullets[1].start===.18&&plan.bullets[2].start===.36,'three delayed barrels');
 if(p.id==='sora')ok(plan.bullets.length===9&&plan.events.filter(e=>e.type==='split').length===1&&plan.bullets.filter(b=>!b.primary).every(b=>b.vy>0),'one carrier and eight descending children');
 if(p.id==='mogu')ok(plan.impacts.length===3&&plan.events.filter(e=>e.type==='breach-pulse').length===2&&plan.destroyed.length>=2,'three advancing blasts open multiple pieces');
 if(p.id==='koro')ok(plan.events.some(e=>e.type==='roll-fall')&&plan.events.filter(e=>e.type==='roll').length>=2,'rolling resumes after a real gap and fall');
 if(p.id==='rico')ok(plan.events.filter(e=>e.type==='bounce').length===4&&Math.abs(plan.damage[1]-4.1)<1e-6,'four bounces grow damage to the limit');
 if(p.id==='yui'){const pull=plan.events.find(e=>e.type==='pull'),boom=plan.events.find(e=>e.type==='compression');ok(pull&&boom&&boom.t-pull.t>=.5999,'pull happens before compression');const actual=JSON.parse(JSON.stringify(demo.before)),copy=E.launch(actual,plan.angle,plan.power);E.applyEvents(actual,copy,pull.t-.0001);near(actual.units[1].x,pull.from.x,'no premature pull');E.applyEvents(actual,copy,pull.t+.001);near(actual.units[1].x,pull.to.x,'timed event commits the simulated destination');E.resolve(actual,copy);near(actual.units[1].x,pull.to.x,'resolve cannot pull twice');}
 if(p.id==='ban')ok(plan.events.some(e=>e.type==='shockwave'&&e.direction===1)&&!plan.impacts.some(i=>i.hit?.unit===1)&&plan.damage[1]===3.2,'forward cone hits beyond impact without a body contact');
 if(p.id==='hibari')ok(plan.events.some(e=>e.type==='airburst'),'proximity detonation is an actual simulation contact');
 if(p.id==='rin')near(plan.damage[1],4.8,'Rin center hit uses96 comparison proposal');
 for(const mode of A.modes){const full=A.paths(plan,mode);ok(mode!=='hard'||full.length===0,'hard never exposes special future trajectories '+p.id);}
 ok(P.create(s,'controls')?.proof.valid,'intro uses the chosen normal projectile '+p.id);
 E.selectWeapon(s,p.special.id);ok(!E.selectSkill(s,'BURST')&&!s.selectedSkill,'legacy skill cannot stack with special '+p.id);const stock=I.fromState(s);
 for(let n=0;n<3;n++){const shot=E.launch(s,40,40);ok(!!shot&&s.specialAmmo===2-n,'use decrements exactly once '+p.id+' '+n);E.resolve(s,shot);nextPlayer(s);}
 equal(I.fromState(s),stock,'three uses leave chapter resources intact '+p.id);ok(!E.selectWeapon(s,p.special.id),'empty special cannot be selected '+p.id);ok(E.availableWeapons(s).find(w=>w.id===p.special.id).disabled,'empty special stays visible '+p.id);
 const moved=arena(p.id),x=moved.units[0].x;E.move(moved,0,100);near(moved.units[0].x-x,100*p.walk,'walk multiplier '+p.id);
 const charging=arena(p.id),cx=charging.units[0].x;E.move(charging,0,100,true);near(charging.units[0].x-cx,100*p.walk*p.chargeWalk,'charge walking multiplier '+p.id);
 previews.push({id:p.id,event:demo.proof.event,damage:C.points(plan.damage[1]),projectiles:plan.bullets.length,impacts:plan.impacts.length,destroyed:plan.destroyed.length});damageRows.push({id:p.id,hp:p.hp,charge:p.charge,normal:20,center:30,core:40,specialCap:C.points(p.special.damageCap)});
}

for(const id of ['hibari','yui']){const s=arena(id),p=C.get(id);s.spec.features=[{type:'S',v:[64,66,5,45]}];s.world=G.world(s.spec);const origin={x:630,y:378,theta:0,dx:1,dy:0,dir:1},shot=E.trajectory(s,0,0,20,{weaponId:p.special.id,origin});ok(!shot.events.some(e=>e.type=== (id==='hibari'?'airburst':'pull')),'fixed wall blocks special detection '+id);ok(!shot.destroyed.length,'fixed wall cannot be destroyed '+id);}
const refills=arena('gun');refills.specialAmmo=1;E.selectWeapon(refills,'S_GUN');refills.pickups=[{id:'ammo-test',kind:'ammo',x:200,y:300,collected:false,placementId:'L004:ammo-test'}];E.collect(refills,null,{id:'ammo-test'});ok(refills.specialAmmo===1&&refills.weaponStock.W06===3,'ammo boxes replenish auxiliary, never special');
const single=arena('sora');E.selectWeapon(single,'S_SORA');ok(single.angle>=55&&E.minimumAngle(single)===55,'only Sora special has high-angle restriction');E.selectWeapon(single,'W01');ok(E.minimumAngle(single)===-15&&E.maximumAngle(single)===80,'normal shot retains full usable elevation');
E.selectTeleport(single);single.angle=85;E.selectTeleport(single);ok(single.angle===80,'returning from teleport keeps barrel within the actual normal forecast bounds');
// Vertically separated machines can share an x corridor. A boundary must not
// move an otherwise supported teleport destination merely to separate x values.
const high=E.campaign(13,{equippedCharacterId:'gun',matchSeed:1244,battleInventory:{}});E.selectTeleport(high);E.resolve(high,E.launch(high,64,85));
const upper={...high.units[0]},pad=G.safePosition(high.world,upper.x,upper.y,high.units[1],upper.range);
ok(Math.abs(upper.x-high.units[1].x)<100&&Math.hypot(upper.x-high.units[1].x,upper.y-high.units[1].y)>100,'stacked terrain regression fixture');near(pad.x,upper.x,'safe upper platform retains horizontal position');near(pad.y,upper.y,'safe upper platform retains height');
const flat=arena('gun');ok(Math.abs(G.safePosition(flat.world,flat.units[1].x-30,400,flat.units[1],flat.units[0].range).x-flat.units[1].x)>100,'same-floor overlap protection remains');

let safeStates=0,physicalPlans=0;
for(const p of C.profiles)for(let n=1;n<=100;n++){
 const s=E.campaign(n,{equippedCharacterId:p.id,matchSeed:42,battleInventory:{}});ok(s.units.every(u=>G.clearBody(s.world,u)&&G.support(s.world,u.x,u.y)),'safe supported spawn '+p.id+' '+n);ok(s.specialAmmo===3&&s.units[0].maxHp===p.hp/20,'fresh stage restores HP and special '+p.id+' '+n);safeStates++;
 if(n%5===0||[1,4,7,13,23,33,53,62].includes(n))for(const id of['W01',p.special.id]){const before=JSON.stringify(s),shot=E.trajectory(s,0,60,70,{weaponId:id});ok(JSON.stringify(s)===before,'aim simulation is immutable '+p.id+' '+n+' '+id);ok(shot.bullets.every(b=>b.path.every(q=>Number.isFinite(q.x+q.y+q.t)))&&shot.iterations<20000,'finite bounded projectile work '+p.id+' '+n+' '+id);ok(shot.damage[1]<=(s.spec.boss?(W.get(id,p.id).bossDamageCap||W.get(id,p.id).damageCap):W.get(id,p.id).damageCap)+1e-6,'bounded aggregate in real map '+p.id+' '+n+' '+id);physicalPlans++;}
}

for(const id of ['gun','rin','rico','yui']){const data=S.decode(JSON.stringify({schemaVersion:3,cleared:6,equippedCharacterId:id,unlockedWeaponIds:S.weaponIds,collectedCosmeticIds:S.cosmeticIds}));data.chapterRun=R.checkpoint(7,{weapons:{W06:2},skills:{BURST:1}},[],'carry-'+id,123);const context=R.begin(data,7),s=E.campaign(7,{...data,battleInventory:context.entry.inventory});s.specialAmmo=0;s.units[0].hp=1;s.result='win';R.finish(data,context,s);const next=E.campaign(8,{...data,battleInventory:data.chapterRun.inventory});ok(next.specialAmmo===3&&next.units[0].hp===C.get(id).hp/20,'next level refills machine only '+id);equal(data.chapterRun.inventory,{weapons:{W06:2},skills:{BURST:1}},'chapter auxiliary and skill carry unchanged '+id);ok(S.decode(JSON.stringify(data)).collectedCosmeticIds.length===37,'all legacy finishes preserved '+id);}

const rin=arena('rin'),current=aimed(rin,'S_RIN'),originalGet=W.get;
let oldRin;try{W.get=(id,character)=>{const w=originalGet(id,character);return id==='S_RIN'?{...w,criticalMultiplier:2,damageCap:6.4}:w;};oldRin=aimed(rin,'S_RIN');}finally{W.get=originalGet;}
near(C.points(current.damage[1]),96,'chosen Rin cap');near(C.points(oldRin.damage[1]),128,'old Rin proposal remains measurable');
const comparison={normalEnemyHP:60,bossHP:200,newCenter:96,oldCenter:128,bossAfterTwoNew:8,bossAfterTwoOld:0,scope:'Upper-bound damage comparison using the same actual center-hit trajectory; not a win-rate or human balance claim.'};
const baseline=process.env.ARCLINE_PREVIOUS_DIST;let cpuParity=null;
if(baseline){const previous=require(path.resolve(baseline,'engine.js')),oldWeapons=require(path.resolve(baseline,'weapons.js'));equal(W.weapons,oldWeapons.weapons,'legacy auxiliary definitions unchanged');let cases=0;for(const n of[1,4,7,13,23,33,53,62,80,100])for(const p of C.profiles){const current=E.campaign(n,{equippedCharacterId:p.id,matchSeed:123}),old=previous.campaign(n,{matchSeed:123});equal(E.cpuPlan(current,E.seeded(129)),previous.cpuPlan(old,previous.seeded(129)),'enemy planning unchanged '+n+' '+p.id);cases++;}cpuParity={cases,stages:10,machines:10};}
const report={status:'PASS',checks,safeStates,physicalPlans,damageRows,previews,rinComparison:comparison,cpuParity,scope:'Actual ten machine profiles, center/core caps, charge/walk, all100 safe map entries, bounded immutable trajectories, all ten causal special previews, single-use multi-shot accounting, fixed-wall protection, chapter separation, legacy preservation and optional seeded CPU parity. Full character campaign wins are recorded separately; physical phones and human difficulty are unverified.'};fs.writeFileSync(path.join(out,'MACHINE_COMBAT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks,safeStates,physicalPlans,cpuParity,previews,rinComparison:comparison},null,2));
