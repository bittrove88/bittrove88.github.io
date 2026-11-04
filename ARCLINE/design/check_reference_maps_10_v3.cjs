'use strict';
// Design-only test for reference_maps_10_v3.json.
// node ARCLINE/design/check_reference_maps_10_v3.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../game/dist/geometry.js');
const P=require('../game/dist/physics.js');
const N=require('../game/dist/encounters.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'reference_maps_10_v3.json'),'utf8'));

function setup(map){
 const spec={id:map.stage,boss:map.stage%10===0,midboss:map.stage%10===5,hold:2,worldWidth:1000};
 const enc=N.forSpec(spec);
 const world=G.world({...spec,floors:map.floorSegments||[map.floor],features:map.features,components:map.parts.map(p=>({id:p.id,poly:p.poly,destructible:!!p.breakable||p.kind==='wall'}))});
 const units=['player','enemy'].map((side,i)=>{
  const q=map.spawns[side],targetY=500-(q.h-(i?map.enemyAirHeight||0:0))*10;
  const u=G.safePosition(world,q.x*10,targetY);
  assert(u,'missing spawn '+map.stage+'/'+side);
  assert(Math.abs(u.x-q.x*10)<1,'spawn x moved '+map.stage+'/'+side);
  assert(Math.abs(u.y-targetY)<6,'spawn y moved '+map.stage+'/'+side);
  assert(G.clearBody(world,u),'body overlaps obstacle '+map.stage+'/'+side);
  return {...u,facing:i?-1:1,parts:[],hp:100,maxHp:100,exposed:0,range:[35,965]};
 });
 const e=units[1];e.hitShape={...enc.body};e.core=enc.core;e.weaponPivot=enc.muzzle;e.muzzleLength=enc.muzzle.length;
 if(spec.boss||spec.midboss){e.slope=0;e.parts=(enc.parts||[]).map(p=>({...p,localX:p.dx,dx:p.dx,maxHp:p.hp}));}
 if(map.stage===90){e.y=500-map.spawns.enemy.h*10;e.floating=true;}
 return {spec,world,units,characterId:'gun',pickups:[],skills:{},skillCaps:{},bossPhase:0};
}
function shotDamage(o){return o.damage[1]+Object.values(o.partDamage||{}).reduce((s,v)=>s+v,0);}
function sweep(state,fine=false){
 let hits=[];
 for(let a=10;a<=85;a+=fine?2:5)for(let power=20;power<=100;power+=fine?5:10){
  const shot=P.simulate(state,0,a,power,{weaponId:'W01'});
  if(shotDamage(shot)>0)hits.push({a,power,events:shot.events.map(e=>e.type)});
 }
 return hits;
}
function moveState(s,deltas){
 const t={world:s.world,units:[{...s.units[0]},{...s.units[1]}],result:null};
 let total=0;
 for(const dx of deltas){const moved=G.move(t,0,dx);assert(Math.abs(moved-dx)<.01,'blocked movement '+dx);total+=Math.abs(moved);}
 assert(total<=140,'movement exceeds 140px');
 assert(Math.abs((t.units[0].slope-s.units[0].slope)*180/Math.PI)<=3.001,'unstable aim surface after walk');
 return {...s,units:[{...t.units[0]},s.units[1]]};
}
const report=[];
for(const map of data.maps){
 const expected=data.verification.find(v=>v.stage===map.stage);
 assert(expected,'missing verification '+map.stage);
 const s=setup(map),initial=sweep(s);
 assert.equal(initial.length,expected.initialHitCount,'initial shot count drift stage '+map.stage);
 assert(Math.abs(s.units[0].slope*180/Math.PI)<=4.001,'start slope '+map.stage);
 for(const d of [-40,40]){
  const x=moveState(s,[d]);
  assert(Math.abs((x.units[0].slope-s.units[0].slope)*180/Math.PI)<=3.001,'short step angle '+map.stage);
 }
 if(map.stage<=30)assert(initial.length>=2,'early stage must shoot from start '+map.stage);
 if(map.engagementMode==='movement-first'){
  assert(map.stage>=50&&map.stage<=99,'movement-first too early');
  assert.equal(initial.length,0,'movement-first should have no coarse initial hits in this reference');
  assert.equal(sweep(s,true).length,0,'movement-first has fine-grid initial hit');
  assert(expected.teleportSuccessCount>0,'must have nonwalk route');
 }
 for(const test of expected.movementTests){
  const st=moveState(s,test.sequencePx);
  assert.equal(st.units[0].facing,test.endFacing,'facing handling drift stage '+map.stage);
  const hits=sweep(st);assert.equal(hits.length,test.postHitCount,'post-move hits drift stage '+map.stage);
  assert(hits.length>initial.length,'movement should improve shot count stage '+map.stage);
  if(map.stage===50)assert(hits.some(q=>q.events.includes('updraft')),'stage 50 lacks updraft in winning shot');
  if(map.stage===80)assert(hits.some(q=>q.events.includes('magnet')),'stage 80 lacks magnet in winning shot');
 }
 if([40,50,80,90].includes(map.stage)){
  const tp=expected.teleportTrajectory;assert(tp,'no teleport trajectory stage '+map.stage);
  const shot=P.simulate(s,0,tp.teleportAngle,tp.teleportPower,{weaponId:'TELEPORT'});
  const land=G.teleportLanding(s.world,shot.teleportContact,s.units[1]);
  assert(land&&land.surface===tp.landingSurface,'teleport surface drift stage '+map.stage);
  const alt={...s,units:[{...s.units[0],...land,facing:1},s.units[1]]};
  const after=P.simulate(alt,0,tp.followupAngle,tp.followupPower,{weaponId:'W01'});
  assert(shotDamage(after)>0,'teleport followup cannot hit stage '+map.stage);
 }
 report.push({stage:map.stage,type:map.engagementMode,initial:initial.length,moveTests:expected.movementTests.map(v=>({px:v.totalWalkedPx,hits:v.postHitCount})),teleportTested:[40,50,80,90].includes(map.stage)});
}
assert.equal(report.length,10);
console.log(JSON.stringify({status:'PASS',scope:'Geometry+Physics proof of initial versus post-position shots; no game-turn/CPU playtest',report},null,2));
