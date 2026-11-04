'use strict';
// ARCLINE reference design v2: one-shot ballistic sampler, not full campaign validation.
// Run from repository root: node ARCLINE/design/check_reference_maps_10_v2.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../game/dist/geometry.js');
const P = require('../game/dist/physics.js');
const N = require('../game/dist/encounters.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'reference_maps_10_v2.json'),'utf8'));
const important = new Set(['updraft','cloud','wind','magnet','terminal','bounce','break']);
function snapshot(m){
 const spec = {id:m.stage,boss:m.stage%10===0,midboss:m.stage%10===5,hold:2,worldWidth:1000};
 const enc = N.forSpec(spec);
 const world = G.world({...spec,floors:m.floorSegments||[m.floor],features:m.features,components:m.parts.map(v=>({id:v.id,poly:v.poly,destructible:!!v.breakable||v.kind==='wall'}))});
 const units = ['player','enemy'].map((side,i)=>{
  const q=m.spawns[side];
  const a=G.safePosition(world,q.x*10,500-(q.h-(i?m.enemyAirHeight||0:0))*10);
  assert(a,'unsafe spawn '+m.stage+'/'+side);
  assert(Math.abs(a.x/10-q.x)<.1,'spawn relocated horizontally '+m.stage+'/'+side);
  assert(Math.abs((500-a.y)/10-(q.h-(i?m.enemyAirHeight||0:0)))<.6,'spawn relocated vertically '+m.stage+'/'+side);
  assert(G.clearBody(world,a),'spawn overlaps a solid '+m.stage+'/'+side);
  return {...a,facing:i?-1:1,parts:[],exposed:0,hp:100,maxHp:100,range:[35,965]};
 });
 const e=units[1];e.hitShape={...enc.body};e.core=enc.core;e.weaponPivot=enc.muzzle;e.muzzleLength=enc.muzzle.length;
 if(spec.boss||spec.midboss){e.slope=0;e.parts=(enc.parts||[]).map(p=>({...p,localX:p.dx,dx:p.dx,maxHp:p.hp}));}
 if(m.stage===90){e.y=500-m.spawns.enemy.h*10;e.floating=true;}
 return {spec,world,units,characterId:'gun',pickups:[],skills:{},skillCaps:{},bossPhase:0};
}
function damage(out){return out.damage[1]+Object.values(out.partDamage||{}).reduce((sum,n)=>sum+n,0);}
function sweep(state){
 const hits=[];
 for(let a=10;a<=85;a+=5)for(let power=20;power<=100;power+=10){
  const out=P.simulate(state,0,a,power,{weaponId:'W01'});
  if(damage(out)>0)hits.push({a,power,events:out.events.filter(e=>important.has(e.type)),bounceIds:out.events.filter(e=>e.type==='bounce').map(e=>e.solidId)});
 }
 return hits;
}
const report=[];
for(const m of data.maps){
 const ref=data.verification.find(v=>v.stage===m.stage);assert(ref,'missing reference '+m.stage);
 const s=snapshot(m),p=s.units[0],measuredAngle=p.slope*180/Math.PI;
 assert(Math.abs(measuredAngle)<=4.001,'initial slope too steep '+m.stage);
 for(const dx of [-40,40]){
  const st={world:s.world,units:[{...p,range:[35,965]},{...s.units[1]}],result:null};
  const moved=G.move(st,0,dx);
  assert(Math.abs(moved-dx)<.01,'failed +/-40px move '+m.stage+' at '+dx);
  assert(Math.abs((st.units[0].slope-p.slope)*180/Math.PI)<=3.001,'steep local aiming change '+m.stage);
 }
 const hits=sweep(s);
 assert(hits.length>=2,'no initial shot variety '+m.stage);
 assert.equal(hits.length,ref.initialHitCount,'ballistic reference drift '+m.stage);
 if(m.features.length){
  for(const fx of m.features){
   const eventType={C:'cloud',U:'updraft',F:'wind',M:'magnet',T:'terminal',V:'vent',K:'bounce',W:'bounce'}[fx.type];
   const matches=hits.filter(h=>fx.type==='K'?h.bounceIds.some(id=>id.startsWith('K')):fx.type==='W'?h.bounceIds.some(id=>id.startsWith('W')):h.events.some(e=>e.type===eventType));
   assert(matches.length,'orphan feature '+m.stage+'/'+fx.type);
  }
 }
 let teleportValid=0;
 if([40,50,80,90].includes(m.stage)){
  for(const t of ref.teleportSamples){
   const out=P.simulate(s,0,t.teleportAngle,t.teleportPower,{weaponId:'TELEPORT'});
   const land=G.teleportLanding(s.world,out.teleportContact,s.units[1]);
   assert(land,'teleport landing invalid '+m.stage);
   assert(land.surface===t.surface,'teleport did not land on recorded surface '+m.stage);
   assert(Math.abs(land.x/10-t.landingX)<.6,'teleport landing x changed '+m.stage);
   const alt={...s,units:[{...s.units[0],...land,facing:1},s.units[1]]};
   assert(sweep(alt).length,'teleport position has no valid follow-up shot '+m.stage);
   teleportValid++;
  }
  assert(teleportValid>0,'no teleport alternative '+m.stage);
 }
 report.push({stage:m.stage,initialHits:hits.length,featureHits:ref.gimmickHitCount,validatedTeleportSamples:teleportValid,playerSlope:+measuredAngle.toFixed(3),status:'PASS'});
}
assert.equal(report.length,10);
console.log(JSON.stringify({status:'PASS',test:'geometry, initial W01 shot and teleport follow-up using game code; no campaign AI',report},null,2));
