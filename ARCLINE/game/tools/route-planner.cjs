'use strict';
// Offline QA planner. Uses production trajectories; never supplies synthetic impacts.
const E=require('../dist/engine.js'),G=E.geometry;
function firing(s,id='W01',predicate=()=>true){
 let best=null;const w=E.weapons.find(w=>w.id===id)||E.combat.weapons.find(w=>w.id===id),min=Math.max(-12,w?.minAngle??-12),max=Math.min(170,w?.maxAngle??170);
 for(let angle=min;angle<=max;angle+=6)for(let power=25;power<=100;power+=5){
  const plan=E.trajectory(s,0,angle,power,{weaponId:id,skill:null});if(!predicate(plan))continue;
  const score=plan.damage[1]-plan.damage[0]*3+(plan.destroyed?.length||0)*.025;
  if(!best||score>best.score)best={angle,power,plan,score};
 }
 return best;
}
function position(s){const u=s.units[0],original={...u},target=s.units[1],rows=[];
 for(const dx of [0,180,-120,360,-260,600]){Object.assign(u,original);const moved=G.move(s,0,dx),shot=firing(s);rows.push({dx:moved,shot,unit:{...u}});}
 Object.assign(u,original);rows.sort((a,b)=>(b.shot?.score||-1)-(a.shot?.score||-1)||Math.abs(a.dx)-Math.abs(b.dx));return rows[0];
}
function choose(s){
 const selected=position(s);if(selected?.shot?.plan.damage[1]>.25&&selected.shot.plan.damage[0]<.4){G.move(s,0,selected.dx);return {kind:'attack',angle:selected.shot.angle,power:selected.shot.power,walk:selected.dx};}
 const breaks=firing(s,'W01',p=>p.destroyed?.length>0&&p.damage[0]<.25);if(breaks)return {kind:'break',angle:breaks.angle,power:breaks.power,walk:0};
 const warp=teleport(s);if(warp)return warp;
 if(selected){G.move(s,0,selected.dx);return {kind:'attack',angle:selected.shot?.angle||48,power:selected.shot?.power||70,walk:selected.dx};}
 return null;
}
function teleport(s){if(!s.spec.teleport)return null;{const original={...s.units[0]},candidates=[],seen=new Set();
  for(let angle=0;angle<=170;angle+=8)for(let power=25;power<=100;power+=10){const p=E.trajectory(s,0,angle,power,{weaponId:'TELEPORT',skill:null}),land=G.teleportLanding(s.world,p.teleportContact,s.units[1],s.units[0].range);if(!land||Math.hypot(land.x-original.x,land.y-original.y)<75)continue;const key=Math.round(land.x/70)+':'+Math.round(land.y/60);if(seen.has(key))continue;seen.add(key);candidates.push({angle,power,land,distance:Math.hypot(land.x-s.units[1].x,land.y-s.units[1].y)});}
  candidates.sort((a,b)=>a.distance-b.distance);let best=null;
  for(const c of candidates.slice(0,12)){const {entry,...pad}=c.land;Object.assign(s.units[0],original,pad);const p=position(s);if(!best||(p.shot?.score||-1)>best.score)best={...c,score:p.shot?.score||-1};}Object.assign(s.units[0],original);
  if(best)return {kind:'teleport',angle:best.angle,power:best.power,walk:0};
 }
return null;}
module.exports={firing,position,choose,teleport};
