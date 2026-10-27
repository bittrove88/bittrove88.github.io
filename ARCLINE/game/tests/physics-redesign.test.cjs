'use strict';
const assert=require('node:assert/strict'),G=require('../dist/geometry.js'),P=require('../dist/physics.js'),W=require('../dist/weapons.js');
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
function scene(features=[],floors=[[[0,8],[100,8]]]){
 const spec={id:1,boss:false,floors,features,hold:1};
 return {spec,world:G.world(spec),units:[{x:100,y:420,slope:0,hp:5,parts:[]},{x:900,y:420,slope:0,hp:3,parts:[]}],pickups:[],skills:{},skillCaps:{},effects:{},bossPhase:0};
}
const fire=(s,id,origin={x:400,y:300,theta:.5},power=70,opts={})=>P.simulate(s,0,48,power,{weaponId:id,origin,...opts});
const bounce=p=>p.events.filter(e=>e.type==='bounce');
const sample=(p,time)=>p.bullets[0].path.find(q=>q.t>=time)||p.bullets[0].path.at(-1);

// W authoring becomes terrain material, including slopes and disjoint floors.
{
 const s=scene([{type:'W',v:[20,80,49]}],[[[0,8],[40,12]],[[60,12],[100,8]]]);
 check(s.world.waters.length===0,'no water collision volumes remain');
 const patches=s.world.solids.filter(o=>o.kind==='reflector');check(patches.length===2,'patch clips to real floor segments without bridging a void');
 for(const patch of patches){for(const p of patch.poly.slice(0,2)){const floor=s.world.surfaces.find(f=>f.id===patch.floorId);check(Math.abs(p.y-G.floorY(floor.points,p.x))<1e-7,'visible reflector top is the exact floor collision edge');}}
 check(patches.every(o=>o.poly.every(p=>p.x<=400||p.x>=600)),'no floating reflector over a gap');
 check(G.clearBody(s.world,{x:300,y:G.floorY(s.world.surfaces[0].points,300)}),'reflective floor supports the rover without water exclusion');
}
// Shallow, steep and vertical incoming shots reflect on the same contact rule.
{
 const s=scene([{type:'W',v:[0,100,0]}]);
 for(const theta of [.02,.5,1,Math.PI/2]){
  const plan=fire(s,'W01',{x:400,y:300,theta});const hit=bounce(plan)[0];
  check(hit?.surface==='reflector','all incidence angles reflect, theta='+theta);
  check(plan.path.some(p=>p.t>hit.t+.1&&p.y<hit.y-4),'reflection actually changes the outgoing path');
  check(!plan.events.some(e=>e.type==='water'||e.type==='skip'),'no water entry/drag/angle-cutoff branch');
 }
 const many=fire(s,'W01',{x:400,y:300,theta:Math.PI/2});check(bounce(many).length===3,'innate ground reflection uses the shared three-bounce cap');
 check(many.duration<=8.01&&many.path.every(p=>Number.isFinite(p.x+p.y+p.t)),'vertical repeated bounce is finite');
 for(const weapon of W.weapons){const p=fire(s,weapon.id);check(bounce(p).some(e=>e.surface==='reflector'),'every weapon reflects on ground: '+weapon.id);}
}
// Co-located floor edges and other bodies resolve by earliest swept contact.
{
 const s=scene([{type:'W',v:[20,80,0]}]);
 const hit=G.sweep(s.world,{x:400,y:410},{x:400,y:430});check(hit?.solid.kind==='reflector'&&Math.abs(hit.y-420)<1e-7,'reflector wins tie against its underlying floor');
 check(fire(s,'W01',{x:199,y:419,theta:Math.PI/2}).events[0].type==='impact','outside patch stays ordinary ground');
 check(bounce(fire(s,'W01',{x:201,y:419,theta:Math.PI/2}))[0]?.surface==='reflector','inside patch reflects even next to the edge');
 s.spec.features.push({type:'S',v:[40,42,8,40]});s.world=G.world(s.spec);
 const wall=fire(s,'W01',{x:300,y:380,theta:0},100);check(wall.impacts[0]?.x<=400.01&&!bounce(wall).length,'a solid wall in front of the patch blocks before reflection');
 const p=scene([{type:'W',v:[0,100,0]}]);p.units[1].x=400;p.units[1].y=420;
 const body=fire(p,'W01',{x:400,y:300,theta:Math.PI/2});check(body.impacts[0]?.hit?.unit===1&&!bounce(body).length,'target above ground is hit before the reflector');
}
// Weapon distinctions are tested by actual paths and contact effects.
{
 const s=scene();s.units[1].x=370;
 for(const weapon of W.weapons){const p=fire(s,weapon.id,{x:300,y:398,theta:0},80);check(p.damage[1]>=.99,'a full close attack is at least one shot equivalent: '+weapon.id);check(p.damage[0]<=1&&p.damage[1]<=1.25,'shared damage cap: '+weapon.id);}
 const t=scene();const standard=fire(t,'W01',{x:300,y:150,theta:0});
 const needle=fire(t,'W03',{x:300,y:150,theta:0});check(sample(needle,.2).x>sample(standard,.2).x+25,'Needle is visibly faster than Standard');
 const rail=fire(t,'W14',{x:300,y:150,theta:0});check(sample(rail,.3).y-150<(sample(standard,.3).y-150)*.2,'Rail stays much flatter than Standard');
 const mortar=P.simulate(t,0,10,70,{weaponId:'W04'});const start=mortar.path[0],next=mortar.path[1];check(Math.atan2(start.y-next.y,next.x-start.x)*180/Math.PI>=54.9,'Mortar enforces a high launch angle');
 for(const id of ['W05','W06','W08','W20'])check(bounce(fire(t,id,{x:300,y:400,theta:.15})).length>0,'bounce weapon reacts on ordinary terrain: '+id);
 const hopper=fire(t,'W05',{x:300,y:400,theta:.15}),skipper=fire(t,'W08',{x:300,y:400,theta:.15});
 const apexAfter=p=>{const h=bounce(p)[0];return Math.min(...p.path.filter(q=>q.t>h.t&&q.t<h.t+.35).map(q=>q.y));};
 check(apexAfter(hopper)<apexAfter(skipper)-15,'Hopper has a tall hop while Skipper stays low');
 const roll=fire(t,'W07',{x:300,y:400,theta:.3});const r=roll.events.find(e=>e.type==='roll');check(!!r&&roll.path.some(p=>p.x>r.x+150&&Math.abs(p.y-r.y)<1),'Roller actually follows the ground over useful distance');
 const fan=fire(t,'W09',{x:300,y:300,theta:-.5});check(fan.bullets.length===3&&fan.bullets.every(b=>b.start===0),'Fan spreads immediately');
 const cluster=fire(t,'W10',{x:300,y:300,theta:-1});check(cluster.events.some(e=>e.type==='split')&&cluster.bullets.length===4&&cluster.bullets.slice(1).every(b=>b.start>0),'Cluster creates children at its apex');
 const twin=fire(t,'W11',{x:300,y:300,theta:-.5});check(twin.bullets.length===2&&twin.bullets[1].start===.25,'Twin has a visible second pulse');check(Math.abs(twin.bullets[0].vy-twin.bullets[1].vy)>10,'Twin uses two distinct narrow launch paths');
 t.units[1].x=700;const air=fire(t,'W12',{x:590,y:398,theta:0});const burst=air.events.find(e=>e.type==='airburst');check(!!burst&&Math.hypot(burst.x-700,burst.y-398)>31,'Airburst detonates before direct body collision');
 const archer=fire(t,'W15',{x:300,y:300,theta:-1.1});const dive=archer.events.find(e=>e.type==='dive');check(!!dive&&sample(archer,dive.t+.5).y-dive.y>100,'Archer really dives after the apex');
 t.units[1].x=760;const wave=fire(t,'W16',{x:600,y:419,theta:Math.PI/2});check(wave.events.some(e=>e.type==='wave'&&e.path.length>30)&&wave.damage[1]>=1,'Undercut carries damage along the ground beyond ordinary blast reach');
 const heavy=fire(t,'W02',{x:680,y:419,theta:Math.PI/2}),plain=fire(t,'W01',{x:680,y:419,theta:Math.PI/2});check(heavy.damage[1]>plain.damage[1],'Heavy wider blast changes a real near-miss outcome');
 for(const id of ['W17','W18','W19'])check(W.get(id).damage>=1,'position weapons keep one-shot-equivalent full damage: '+id);
}
// Drill measures the wall thickness actually travelled, never the ground.
{
 const thin=scene([{type:'S',v:[40,42.5,8,40]}]);const p=fire(thin,'W13',{x:350,y:200,theta:0},100);check(p.events.some(e=>e.type==='phase')&&p.path.some(q=>q.x>425),'Drill passes through a thin wall');
 const thick=scene([{type:'S',v:[40,46,8,40]}]);const q=fire(thick,'W13',{x:350,y:200,theta:0},100);check(q.end.x<=436.01&&!q.path.some(p=>p.x>460),'Drill cannot tunnel through a wall thicker than its actual budget');
 const floor=fire(scene(),'W13',{x:400,y:419,theta:Math.PI/2});check(!floor.events.some(e=>e.type==='phase')&&floor.end.y===420,'Drill does not bury itself into the ordinary floor');
}
// New boss origins, delays and curve options retain shared collision rules.
{
 const s=scene([{type:'R',v:[35,65,25]}]);const drop=P.simulate(s,1,0,50,{origin:{x:500,y:80,theta:Math.PI/2},startDelay:.4});check(drop.bullets[0].start===.4&&drop.impacts[0].y<=250,'delayed falling attacks hit a roof rather than passing through it');
 const base=fire(scene(),'W01',{x:400,y:200,theta:0}),curve=fire(scene(),'W01',{x:400,y:200,theta:0},70,{curve:.7});check(Math.abs(sample(base,.5).y-sample(curve,.5).y)>15,'curve option changes the actual path');
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Deterministic geometry/contact and weapon-effect fixtures; not human difficulty or enjoyment.'},null,2));
