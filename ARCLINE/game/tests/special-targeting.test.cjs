'use strict';
// Focused regression checks for the 2026-11-01 special targeting changes.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js'),G=E.geometry,A=require('../dist/aim-guide.js');
const F=require('../dist/effects.js'),C=E.combat;
let checks=0;
function ok(value,message){checks++;assert.ok(value,message);}
function near(actual,expected,message){checks++;assert.ok(Math.abs(actual-expected)<1e-6,message+': '+actual+' vs '+expected);}
function flat(id){
 const s=E.campaign(1,{equippedCharacterId:id,matchSeed:20261101,battleInventory:{}});
 s.spec={...s.spec,boss:false,midboss:false,components:[],features:[],staticFeatures:[],phaseFeatures:null,floors:[[[0,5],[100,5]]]};
 s.world=G.world(s.spec);
 s.units[0]={...s.units[0],...G.safePosition(s.world,150,450),range:[35,965]};
 s.units[1]={...s.units[1],...G.safePosition(s.world,760,450),hp:10,maxHp:10,range:[35,965]};
 s.pickups=[];return s;
}
// BAN's gameplay cone and the visible cone must agree after reducing both dimensions by 30%.
const ban=C.get('ban').special;
near(ban.coneLength,140,'Ban cone length');
near(ban.coneAngle,28,'Ban half angle');
near(F.metrics.banWaveLength,ban.coneLength,'Ban rendered length');
near(F.metrics.banWaveHalfAngle,ban.coneAngle,'Ban rendered half angle');
const banShot=E.trajectory(flat('ban'),0,90,25,{weaponId:ban.id,origin:{x:480,y:430,theta:Math.PI/2,dir:1,dx:0,dy:1}});
const wave=banShot.events.find(e=>e.type==='shockwave');
ok(!!wave,'Ban emits shockwave');
near(wave.length,140,'Ban event length');
near(wave.halfAngle,28,'Ban event half angle');

// Mogu launches three physical rounds. Earlier contacts can open the path for later rounds.
const mogu=C.get('mogu').special;
for(const power of [20,100]){
 const p=E.trajectory(flat('mogu'),0,0,power,{weaponId:mogu.id,origin:{x:700,y:415,theta:0,dir:1,dx:1,dy:0}});
 ok(p.bullets.filter(b=>!b.effect).length===3,'three real Mogu projectiles');
 ok(p.impacts.length===3,'three Mogu impacts');
 ok(!p.events.some(e=>e.type==='breach-pulse'),'no synthetic post-impact shots');
 ok(p.bullets.filter(b=>!b.effect).map(b=>b.start).join(',')==='0,0.22,0.44','three timed starts');
 ok(p.impacts.map(h=>h.blast).sort((a,b)=>a-b).join(',')==='32,50,75','growing three-stage blasts');
 ok(p.damage[1]<=mogu.damageCap+1e-7,'one action aggregate cap');
}

// SORA: the projected carrier line finishes at the real twelve-way split,
// even when Hard hides ordinary future trajectories.
const sora=C.get('sora').special,scene=flat('sora');
near(sora.minAngle,40,'Sora special can aim as low as 40 degrees');
near(sora.maxAngle,125,'Sora special upper aim bound stays 125 degrees');
scene.playerTurn=2;E.chargeSpecial(scene);E.selectWeapon(scene,sora.id);
near(E.minimumAngle(scene),40,'Sora UI selection exposes 40 degrees');
near(E.maximumAngle(scene),125,'Sora UI selection keeps 125 degrees');
E.selectWeapon(scene,'W01');
near(E.minimumAngle(scene),-15,'Sora normal weapon retains full low-angle aiming');
const plan=E.trajectory(scene,0,80,90,{weaponId:sora.id});
const before=JSON.stringify(plan),event=plan.events.find(e=>e.type==='split');
ok(!!event,'Sora splits at the apex');
ok(plan.bullets.length===13,'Sora one carrier and twelve descending bullets');
const projected=A.splitProjection(plan);
ok(!!projected,'Sora split guide exists');
near(projected.point.x,event.x,'Sora marker X matches actual split');
near(projected.point.y,event.y,'Sora marker Y matches actual split');
near(projected.path.at(-1).x,event.x,'Sora carrier guide ends at actual split X');
near(projected.path.at(-1).y,event.y,'Sora carrier guide ends at actual split Y');
ok(A.paths(plan,'hard').length===0&&A.splitProjection(plan).path.length>1,'Hard hides falling branches while the Sora split carrier is retained');
ok(A.splitProjection({...plan,weaponId:'W01'})===null,'only Sora gains full carrier guide');
ok(JSON.stringify(plan)===before,'preview does not change projectile, world or damage');
console.log(JSON.stringify({status:'PASS',checks,scope:'BAN cone/FX, MOGU power-scaled progression, SORA exact split guide. Not a browser rendering test.'}));
