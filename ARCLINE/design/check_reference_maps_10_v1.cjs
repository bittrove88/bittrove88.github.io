'use strict';
// Design-only reference audit. Run from repository root:
// node ARCLINE/design/check_reference_maps_10_v1.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Geometry=require('../game/dist/geometry.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'reference_maps_10_v1.json'),'utf8'));
const round=(n,d=2)=>+n.toFixed(d);
const rad2deg=180/Math.PI;
const results=[];
function asSpec(m){
 return {
  id:m.stage,
  hold:2,
  worldWidth:1000,
  floors:m.floorSegments||[m.floor],
  components:m.parts.map(p=>({id:p.id,poly:p.poly,destructible:p.kind==='wall'||!!p.breakable})),
  features:m.features
 };
}
function safe(w,a,airHeight=0){
 const baseHeight=a.h-airHeight;
 const candidate=Geometry.safePosition(w,a.x*10,500-baseHeight*10);
 assert(candidate,'missing safe spawn at x='+a.x);
 assert(Math.abs(candidate.x-a.x*10)<=1,'spawn was relocated horizontally');
 assert(Math.abs(candidate.y-(500-baseHeight*10))<6,'spawn was relocated vertically');
 return candidate;
}
for(const m of data.maps){
 const world=Geometry.world(asSpec(m));
 const player=safe(world,m.spawns.player),enemy=safe(world,m.spawns.enemy,m.enemyAirHeight||0);
 if(m.spawns.player.surface.startsWith('component:')){
  const id=m.spawns.player.surface.split(':')[1];
  assert(player.surface.startsWith(id+':'),'player spawned on wrong island '+m.stage);
 }
 const angle=round(player.slope*rad2deg,3);
 assert(Math.abs(angle)<=4.001,'start slope exceeds 4 degrees: '+m.stage);
 const startMuzzle=Geometry.muzzle({units:[{...player,facing:1},{...enemy,facing:-1}]},0,48).theta*rad2deg;
 const movements=[];
 for(const dx of [-40,40]){
  const u={...player,facing:1,range:[35,965]},e={...enemy,facing:-1,range:[35,965]};
  const state={world,units:[u,e],result:null};
  const moved=Geometry.move(state,0,dx);
  assert(Math.abs(moved-dx)<.01,'short movement blocked at stage '+m.stage+' offset '+dx+' moved '+moved);
  const newSlope=round(u.slope*rad2deg,3);
  assert(Math.abs(newSlope-angle)<=3.001,'slope changed too much at stage '+m.stage);
  const actualFacing=u.facing;
  u.facing=1; // isolate chassis angle from the distinct facing-flip UX issue
  const newMuzzle=Geometry.muzzle(state,0,48).theta*rad2deg;
  assert(Math.abs(newMuzzle-startMuzzle)<=3.001,'muzzle changed by slope over 3 degrees');
  movements.push({distancePx:dx,movedPx:round(moved,2),slopeDeg:newSlope,faceAfterMove:actualFacing,muzzleAngleDiffDeg:round(newMuzzle-startMuzzle,3)});
 }
 assert(Geometry.clearBody(world,player),'player body overlaps geometry at '+m.stage);
 assert(Geometry.clearBody(world,enemy),'enemy body overlaps geometry at '+m.stage);
 results.push({stage:m.stage,playerSlopeDeg:angle,enemyBaseSlopeDeg:round(enemy.slope*rad2deg,3),movement:movements,playerSurface:player.surface,enemySurface:enemy.surface,status:'PASS'});
}
assert.equal(results.length,10);
console.log(JSON.stringify({status:'PASS',scope:'Geometry.world/safePosition/clearBody/move/muzzle; no physics.combat or AI',count:results.length,results},null,2));
