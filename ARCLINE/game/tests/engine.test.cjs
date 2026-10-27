'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),G=E.geometry,P=require('../dist/physics.js'),W=require('../dist/weapons.js'),Save=require('../dist/save.js');
const fs=require('node:fs'),path=require('node:path');
const review=JSON.parse(fs.readFileSync(path.join(__dirname,'../../design/player_review_rows.json')));
let checks=0;const check=(v,msg)=>{assert(v,msg);checks++;};
check(E.levels.length===100,'100 authored levels');check(E.levels.filter(x=>x.boss).length===10,'10 bosses');
check(E.levels.every((x,i)=>x.id===i+1&&x.review===review[i].fix),'all 100 review notes retain provenance');
check(E.levels.every((x,i)=>x.theme===Math.floor(i/5)&&x.stageInTheme===i%5+1),'100 levels form 20 five-stage themes');
check(E.levels.every(x=>Object.keys(x.skills).length<=2),'at most two supplied skills');
check(new Set(E.levels.map(x=>x.spawn[0][0])).size>=10,'starting positions vary across the campaign');
check(new Set(E.levels.map(x=>JSON.stringify([x.floors,x.features]))).size===100,'all 100 actual blockouts differ');
check(E.levels.every(x=>G.world(x).waters.length===0),'the campaign contains no water volumes');
check(E.levels.filter(x=>/^W\d\d$/.test(x.lesson||'')).every(x=>x.pickups.some(p=>p.id===x.lesson)),'weapon lessons use the weapon actually introduced there');
check(W.weapons.length===20&&W.skills.length===8,'full arsenal');
check(new Set(E.levels.flatMap(x=>x.pickups).filter(p=>p.id[0]==='W').map(p=>p.id)).size===19,'19 weapon capsules');
check(new Set(E.levels.flatMap(x=>x.pickups).filter(p=>p.id[0]==='S').map(p=>p.id)).size===27,'27 normal cosmetics');
check(new Set(E.levels.flatMap(x=>x.pickups).filter(p=>p.id[0]==='B').map(p=>p.id)).size===10,'10 boss cosmetics');
check(E.chargePower(0)===20&&E.chargePower(1.6)===100&&E.chargePower(3.2)===20,'1.6-second triangular charge');
check(Math.max(...E.levels.filter(x=>x.pickups.some(p=>p.id[0]==='W')).map(x=>x.id))<=85,'the last weapon has room to be used before the final theme');
const state=E.campaign(1);check(state.units[0].hp===5&&state.units[1].hp===3&&state.shotLimit===10,'3/10/5');const boss=E.campaign(100);check(boss.units[1].hp===10&&boss.shotLimit===18,'10/18');
// Weapon mechanics share the exact same trajectory engine, not a second prediction model.
function flat(){const s=E.campaign(1);s.spec={...s.spec,id:1,features:[],floors:[[[0,8],[100,8]]],pickups:[]};s.world=G.world(s.spec);s.units[0].x=150;s.units[1].x=850;s.units.forEach(u=>{u.y=420;u.slope=0;});s.pickups=[];return s;}
let s=flat();s.pickups=[{id:'W02',x:400,y:250,radius:22,collected:false}];const a=E.trajectory(s,0,40,70);check(a.bullets.every(b=>b.path.every(p=>Number.isFinite(p.x+p.y+p.t))),'finite path');
const hit=E.solve(s,0),base=E.trajectory(s,0,hit.angle,hit.power,{weaponId:'W01'});check(base.damage[1]>=.5,'base route');
s.pickups=[{id:'W02',...base.path[Math.floor(base.path.length*.45)],radius:22,collected:false}];const same=E.trajectory(s,0,hit.angle,hit.power);check(same.events.some(e=>e.type==='pickup')&&same.damage[1]===base.damage[1],'capsule passes projectile');check(!s.pickups[0].collected,'simulation is pure');let collected=0;E.applyEvents(s,same,Infinity,()=>collected++);E.applyEvents(s,same,Infinity,()=>collected++);check(collected===1,'idempotent capsule');
s=flat();s.pickups=[{id:'S01',...base.path[50],radius:22,collected:false}];check(!E.trajectory(s,1,45,80).events.some(e=>e.type==='pickup'),'enemy cannot collect');
const fan=E.trajectory(flat(),0,50,70,{weaponId:'W09',skill:'SPLIT'});check(fan.bullets.length===3,'fan + split changes spread without multiplying bullets');const cluster=E.trajectory(flat(),0,50,70,{weaponId:'W10',skill:'SPLIT'});check(cluster.bullets.length===4,'cluster never recursively splits');const twin=E.trajectory(flat(),0,45,70,{weaponId:'W11',skill:'SPLIT'});check(twin.bullets.length===5&&twin.duration>=.16,'delayed twin + primary split');
const archer=E.trajectory(flat(),0,55,70,{weaponId:'W15'});check(archer.events.some(e=>e.type==='dive'),'Archer apex dive');
// Reflection, thin/thick phase, cloud history and magnetic timeout.
s=flat();s.spec.features=[{type:'K',v:[50,30,70]}];s.world=G.world(s.spec);let reflected=false;for(const angle of [20,30,40,50])for(const power of [40,60,80,100])reflected ||= E.trajectory(s,0,angle,power).events.some(e=>e.type==='bounce');check(reflected,'ordinary projectile crystal reflection');
s=flat();s.spec.features=[{type:'S',v:[30,32,0,45]}];s.world=G.world(s.spec);let thin=E.trajectory(s,0,10,90,{skill:'PHASE'});check(thin.events.some(e=>e.type==='phase')&&thin.path.some(p=>p.x>330),'thin PHASE');s.spec.features=[{type:'S',v:[30,45,0,45]}];s.world=G.world(s.spec);let thick=E.trajectory(s,0,10,90,{skill:'PHASE'});check(thick.end.x<400,'thick wall stops phase');
s=flat();s.spec.features=[{type:'C',v:[25,70,10,45]}];s.world=G.world(s.spec);let cloud=E.trajectory(s,0,35,80,{skill:'SPLIT'});check(cloud.events.filter(e=>e.type==='cloud').length<=1,'cloud once; inherited by children');
s=flat();s.spec.features=[{type:'W',v:[20,80,8]}];s.world=G.world(s.spec);for(const theta of [.05,.6,Math.PI/2]){const reflected=E.trajectory(s,0,48,70,{origin:{x:400,y:300,theta}});check(reflected.events.some(e=>e.type==='bounce'&&e.surface==='reflector'),'reflective ground reacts to shallow and steep shots');}
s=flat();s.spec.features=[{type:'M',v:[50,25,40,1]}];s.world=G.world(s.spec);let magnetic=E.trajectory(s,0,35,65,{skill:'SPLIT'});check(magnetic.bullets.every(b=>b.age<=8.02),'bounded magnetic residence/flight');
s=flat();s.spec.features=[{type:'W',v:[20,80,8]}];s.world=G.world(s.spec);check(G.clearBody(s.world,{x:400,y:420}),'reflective ground supports a rover instead of excluding it as water');
// Per-attack budgets, parts full transmission, last shot, simultaneous KO, final capsule.
s=E.campaign(10);let synthetic={side:0,damage:[0,1],partDamage:{0:1},events:[],appliedEvents:0,impacts:[],end:{x:500,y:200},weaponId:'W01'};E.resolve(s,synthetic);check(s.units[1].hp===9&&s.units[1].parts[0].hp===0,'part fully transmitted once');const hp=s.units[1].hp;E.resolve(s,synthetic);check(s.units[1].hp===hp,'resolution idempotent');
s=E.campaign(100);s.units[1].hp=7.5;E.resolve(s,{...synthetic,resolved:false,damage:[0,2],partDamage:{}});s.turn=1;E.boundary(s);check(s.units[1].hp===5.5&&s.bossPhase===1&&s.shotCount===0,'phase overflow retained, no extra shots');
s=flat();s.shotCount=10;E.resolve(s,{...synthetic,resolved:false,damage:[0,0],partDamage:{}});check(s.reason==='shots'&&s.units[0].hp===5,'shot limit separated from durability');
s=flat();s.units[1].hp=1;s.shotCount=10;s.pickups=[{id:'S01',x:700,y:200,collected:false}];let finalCollect=0;E.resolve(s,{...synthetic,resolved:false,damage:[0,1],events:[{type:'pickup',id:'S01',t:9}],partDamage:{}},()=>finalCollect++);check(s.result==='win'&&finalCollect===1,'last shot collects before win');
s=flat();s.units[0].hp=1;s.units[1].hp=1;E.resolve(s,{...synthetic,resolved:false,damage:[1,1],partDamage:{}});check(s.result==='draw','mutual KO');
s=flat();s.skills={BLINK:2,PUSH:2};s.skillCaps={BLINK:3,PUSH:3};s.blink=[{x:400,y:420}];E.selectSkill(s,'BLINK');check(E.blink(s,0)&&s.skills.BLINK===1&&!E.selectSkill(s,'PUSH')&&s.shotCount===0,'blink consumes skill only, one skill/turn');
s=flat();s.units[0].x=300;s.units[1].x=700;E.resolve(s,{...synthetic,resolved:false,skill:'SWAP',damage:[0,1],partDamage:{},bullets:[{id:0,primary:true}],impacts:[{bullet:0,hit:{unit:1,kind:'body'}}]});check(s.units[0].x===700&&s.units[1].x===300&&G.muzzle(s,0,45).dx<0,'SWAP direction follows positions');
// Safe movement: slope-relative angle and no walking across gaps or through ceilings.
s=flat();s.spec.floors=[[[0,8],[20,8],[60,20],[100,20]]];s.world=G.world(s.spec);const relative=s.angle,worldAngle=G.muzzle(s,0,s.angle).worldAngle;E.move(s,0,180);check(s.angle===relative&&Math.abs(s.units[0].slope)>0&&G.muzzle(s,0,s.angle).worldAngle!==worldAngle,'relative turret angle persists while terrain changes the actual barrel direction');
function bridgeFixture(){const s=flat();s.spec={...s.spec,id:11,hold:2,floors:[[[0,8],[35,8]],[[65,8],[100,8]]],features:[{type:'B',v:[35,8,30,0]}]};s.world=G.world(s.spec);return s;}
s=bridgeFixture();s.round=3;E.rebuildWorld(s);E.move(s,0,900);check(s.units[0].x<350,'gap-edge stop');
s=bridgeFixture();E.move(s,0,330);const bridgeX=s.units[0].x;s.round=3;E.rebuildWorld(s);check(bridgeX>350&&s.units[0].x<350&&s.units[0].x>250,'bridge retreat uses fixed hinge-side pad');
s=E.campaign(3);s.trial={id:'W02',ammo:0};s.mode='W02';check(E.launch(s)===null,'exhausted trial cannot bypass ammo');
s=E.campaign(100);s.units[1].hp=7.5;E.resolve(s,{...synthetic,resolved:false,damage:[0,2],partDamage:{0:2}});s.turn=1;E.boundary(s);const refills=s.pickups.filter(p=>p.id[0]==='R'&&p.skill==='BLINK'&&!p.collected);check(refills.length===1&&refills[0].amount===2,'same-skill final refills merge');
const fixedIds=[0,1,2].map(phase=>G.world(s.spec,1,phase).solids.filter(o=>o.id.startsWith('fixed')).map(o=>o.id));check(fixedIds.every(ids=>JSON.stringify(ids)===JSON.stringify(fixedIds[0])),'fixed platforms keep stable identities between phases');
check([1,2,3,4].map(r=>G.world(bridgeFixture().spec,r).solids.find(o=>o.kind==='bridge').open).join(',')==='false,false,true,false','first bridge holds twice then alternates');
s=flat();s.spec.floors=[[[0,8],[49,8]],[[51,8],[100,8]]];s.world=G.world(s.spec);s.units[1].x=600;const wave=E.trajectory(s,0,0,100,{weaponId:'W16'});check(wave.events.filter(e=>e.type==='wave').every(e=>e.path.every(p=>p.x<=490)),'ground wave stops at a gap');
// Save IDs, legacy backup, malformed/future save, load and save failure semantics.
const old='{"version":1,"cleared":99}',m=Save.decode(old);check(m.cleared===99&&m.legacyBackup===old&&m.unlockedWeaponIds.length===1,'legacy migration preserves progress separately from collection');
const clean=Save.decode(JSON.stringify({schemaVersion:2,cleared:300,unlockedWeaponIds:['W02','BAD','W02'],collectedCosmeticIds:['B01','S99'],equippedWeaponId:'W99',equippedCosmeticId:'S99'}));check(clean.cleared===100&&clean.equippedWeaponId==='W01'&&clean.collectedCosmeticIds.length===1,'save validation');assert.throws(()=>Save.decode('{broken'));assert.throws(()=>Save.decode('{"schemaVersion":3}'));
(async()=>{
 let writes=0;const failed=Save.create({load:async()=>{throw Error('network');},save:async()=>writes++});await failed.load();await failed.save();check(writes===0&&!failed.ready,'never overwrite failed load');
 let fail=true;const store=Save.create({load:async()=>null,save:async()=>{writes++;if(fail)throw Error('quota');}});await store.load();await store.save();check(store.dirty,'failed save retained');fail=false;await store.save();check(!store.dirty,'save retry');
 console.log(JSON.stringify({status:'PASS',checks,method:'deterministic invariants and independent fixtures'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
