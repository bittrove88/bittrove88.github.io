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

// MOGU always has three time-separated explosions, advancing deeper in the fired
// horizontal direction. Charge increases spacing and does not multiply per-pulse damage.
const mogu=C.get('mogu').special;
const origin={x:700,y:415,theta:0,dir:1,dx:1,dy:0};
const low=E.trajectory(flat('mogu'),0,0,20,{weaponId:mogu.id,origin});
const high=E.trajectory(flat('mogu'),0,0,100,{weaponId:mogu.id,origin});
for(const [name,plan] of [['low',low],['high',high]]){
 ok(plan.impacts.length===3,name+' power: three explosions');
 ok(plan.events.filter(e=>e.type==='breach-pulse').length===2,name+' power: two delayed pulses');
 ok(plan.impacts[1].x>plan.impacts[0].x&&plan.impacts[2].x>plan.impacts[1].x,name+' power: blasts advance');
 near(plan.impacts[1].t-plan.impacts[0].t,mogu.pulseDelay,name+' power: delay to second');
 near(plan.impacts[2].t-plan.impacts[1].t,mogu.pulseDelay,name+' power: delay to third');
 ok(plan.damage[1]<=mogu.damageCap+1e-7,name+' power: damage cap');
}
const lowStep=low.impacts[1].x-low.impacts[0].x,highStep=high.impacts[1].x-high.impacts[0].x;
ok(highStep>lowStep+10,'higher charge moves the second explosion farther');
near(lowStep,mogu.pulseAdvance*.4,'minimum charge spacing');
near(highStep,mogu.pulseAdvance,'maximum charge spacing');

// SORA: the projected carrier line finishes at the real eight-way split,
// even if the global difficulty would hide or shorten the ordinary trajectory.
const sora=C.get('sora').special,scene=flat('sora');
near(sora.minAngle,50,'Sora special can aim as low as 50 degrees');
near(sora.maxAngle,125,'Sora special upper aim bound stays 125 degrees');
scene.playerTurn=2;E.chargeSpecial(scene);E.selectWeapon(scene,sora.id);
near(E.minimumAngle(scene),50,'Sora UI selection exposes 50 degrees');
near(E.maximumAngle(scene),125,'Sora UI selection keeps 125 degrees');
E.selectWeapon(scene,'W01');
near(E.minimumAngle(scene),-15,'Sora normal weapon retains full low-angle aiming');
const plan=E.trajectory(scene,0,80,90,{weaponId:sora.id});
const before=JSON.stringify(plan),event=plan.events.find(e=>e.type==='split');
ok(!!event,'Sora splits at the apex');
ok(plan.bullets.length===9,'Sora one carrier and eight descending bullets');
const projected=A.splitProjection(plan);
ok(!!projected,'Sora split guide exists');
near(projected.point.x,event.x,'Sora marker X matches actual split');
near(projected.point.y,event.y,'Sora marker Y matches actual split');
near(projected.path.at(-1).x,event.x,'Sora carrier guide ends at actual split X');
near(projected.path.at(-1).y,event.y,'Sora carrier guide ends at actual split Y');
ok(!A.paths(plan,'hard').length,'hard still hides ordinary future trajectories');
ok(A.splitProjection({...plan,weaponId:'W01'})===null,'only Sora gains full carrier guide');
ok(JSON.stringify(plan)===before,'preview does not change projectile, world or damage');
console.log(JSON.stringify({status:'PASS',checks,scope:'BAN cone/FX, MOGU power-scaled progression, SORA exact split guide. Not a browser rendering test.'}));
