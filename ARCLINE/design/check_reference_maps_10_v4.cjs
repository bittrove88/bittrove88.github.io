'use strict';
// Design-only geometry and first-shot regression. Run at repository root:
// node ARCLINE/design/check_reference_maps_10_v4.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const G=require('../game/dist/geometry.js');
const P=require('../game/dist/physics.js');
const N=require('../game/dist/encounters.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'reference_maps_10_v4.json'),'utf8'));
const hit=o=>o.damage[1]+Object.values(o.partDamage||{}).reduce((s,v)=>s+v,0);
function init(m){
 const spec={id:m.stage,boss:m.stage%10===0,midboss:m.stage%10===5,hold:2,worldWidth:m.worldWidth,contentRevision:'5.0'};
 const enc=N.forSpec(spec),world=G.world({...spec,floors:m.floorSegments||[m.floor],features:m.features,components:m.parts.map(p=>({id:p.id,poly:p.poly,destructible:!!p.breakable||p.kind==='wall'}))});
 const units=['player','enemy'].map((side,i)=>{
  const q=m.spawns[side],u=G.safePosition(world,q.x*10,500-q.baseH*10);
  assert(u,'unreachable spawn '+m.stage+' '+side);
  assert(Math.abs(u.x-q.x*10)<=1,'spawn x relocated '+m.stage+' '+side);
  assert(Math.abs(u.y-(500-q.baseH*10))<=6,'spawn y relocated '+m.stage+' '+side);
  assert(G.clearBody(world,u),'spawn body overlaps geometry '+m.stage+' '+side);
  if(q.kind==='island')assert(u.surface.startsWith(q.surface),'spawn not on intended island '+m.stage+' '+side);
  if(q.kind==='air'){u.y=500-q.h*10;u.floating=true;}
  return {...u,facing:i?-1:1,parts:[],hp:100,maxHp:100,exposed:0,range:[35,m.worldWidth-35]};
 });
 const enemy=units[1];
 enemy.hitShape={...enc.body};enemy.core=enc.core;enemy.weaponPivot=enc.muzzle;enemy.muzzleLength=enc.muzzle.length;
 if(spec.boss||spec.midboss){enemy.slope=0;enemy.parts=(enc.parts||[]).map(p=>({...p,localX:p.dx,dx:p.dx,maxHp:p.hp}));}
 return{spec,world,units,characterId:'gun',pickups:[],skills:{},skillCaps:{},bossPhase:0};
}
function hits(s){
 const out=[];
 for(let a=-10;a<=85;a+=5)for(let power=20;power<=100;power+=10){
  const shot=P.simulate(s,0,a,power,{weaponId:'W01'});
  if(hit(shot)>0)out.push({angle:a,power,effects:shot.events.map(e=>e.type),ids:shot.events.filter(e=>e.type==='bounce').map(e=>e.solidId)});
 }
 return out;
}
const report=[];
for(const m of data.maps){
 const expected=data.audits.find(x=>x.stage===m.stage);
 assert(expected,'missing stage audit '+m.stage);
 assert(m.worldWidth>=1100&&m.worldWidth<=2000,'width out of planned range');
 assert.equal(m.floor.at(-1)[0]*10,m.worldWidth,'floor does not reach world end');
 const s=init(m),initial=hits(s);
 assert.equal(initial.length,expected.initialHitCount,'initial hits drift '+m.stage);
 assert(Math.abs(s.units[0].slope*180/Math.PI)<=4.001,'initial shooting platform is too steep '+m.stage);
 if(m.stage<=30)assert(initial.length>=2,'early level has no initial shot '+m.stage);
 let testedTeleport=0,behind=0;
 for(const t of expected.teleports){
  const shot=P.simulate(s,0,t.teleAngle,t.telePower,{weaponId:'TELEPORT'});
  const landing=G.teleportLanding(s.world,shot.teleportContact,s.units[1]);
  assert(landing,'teleport cannot land '+m.stage);
  assert.equal(landing.surface,t.surface,'teleport landing changed '+m.stage);
  let player={...s.units[0],...landing,facing:1};
  if(t.behindEnemy){
   assert(player.x>s.units[1].x+100,'teleport is not behind the enemy '+m.stage);
   const attempt={world:s.world,units:[player,{...s.units[1]}],result:null};
   assert(Math.abs(G.move(attempt,0,-2)+2)<.01,'cannot face enemy from behind '+m.stage);
   player=attempt.units[0];behind++;
  }
  const alt={...s,units:[player,s.units[1]]};
  const follow=P.simulate(alt,0,t.firstHit.angle,t.firstHit.power,{weaponId:'W01'});
  assert(hit(follow)>0,'follow-up from teleport cannot hit '+m.stage);
  testedTeleport++;
 }
 if(m.stage===40){
  const mv={world:s.world,units:[{...s.units[0]},{...s.units[1]}],result:null};
  assert.equal(G.move(mv,0,40),40);
  const r=hits({...s,units:[{...mv.units[0],facing:1},s.units[1]]});
  assert(r.some(q=>q.ids.some(id=>id.startsWith('K'))),'crystal should help stage40');
 }
 if(m.stage===50){
  assert.equal(initial.length,0);
  const mv={world:s.world,units:[{...s.units[0]},{...s.units[1]}],result:null};
  assert.equal(G.move(mv,0,-80),-80);
  assert.equal(G.move(mv,0,2),2);
  const r=hits({...s,units:[mv.units[0],s.units[1]]});
  assert(r.some(q=>q.effects.includes('updraft')&&q.ids.some(id=>id.startsWith('K'))),'stage50 combined terrain route gone');
 }
 if(m.stage===80)assert(testedTeleport>0,'stage80 needs teleport-first route');
 report.push({stage:m.stage,width:m.worldWidth,enemy:m.design.enemySpace,terrainRelief:expected.terrainRelief,initialHits:initial.length,teleportSamplesTested:testedTeleport,behindSamplesTested:behind,status:'PASS'});
}
assert.equal(report.length,10);
assert(report.find(x=>x.stage===14).behindSamplesTested>0);
assert(report.find(x=>x.stage===40).behindSamplesTested>0);
console.log(JSON.stringify({status:'PASS',scope:'geometry / W01 / teleport / slope; NOT turn-by-turn battle, AI or victory',report},null,2));
