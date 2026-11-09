'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),C=E.combat,G=E.geometry;
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,`${m}: ${a} / ${b}`);
function arena(cover='open',boss=false){
 const s=E.campaign(boss?10:4,{equippedCharacterId:'hibari',matchSeed:20261109,battleInventory:{}});
 s.spec={...s.spec,boss,midboss:false,worldWidth:1200,floors:[[[0,10],[120,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};
 if(cover!=='open')s.spec.components=[{id:cover,destructible:false,poly:cover==='post'?[[73,10.5],[74,10.5],[74,12],[73,12]]:[[73,0],[74,0],[74,30],[73,30]]}];
 s.world=G.world(s.spec);s.pickups=[];s.units=[160,800].map(x=>({...G.safePosition(s.world,x,400),hp:100,maxHp:100,parts:[],range:[35,1165],exposed:0}));
 if(boss)Object.assign(s.units[1],{facing:1,hitShape:{x:0,y:-22,rx:60,ry:35},core:{x:0,y:-22,radius:20,exposedRadius:25,multiplier:2},exposed:2});
 return s;
}
const shot=(s,y=399)=>E.trajectory(s,0,0,100,{weaponId:'S_HIBARI',origin:{x:600,y,theta:0,dx:1,dy:0,dir:1}});
const hits=p=>p.events.filter(e=>e.type==='damage'&&e.unit===1);
// A post hides the center-directed ray, while the upper arc of the target is visible.
const partial=arena('post'),p=shot(partial);
near(C.points(p.damage[1]),24,'two full twelve-point rings reach the visible body around partial cover');
ok(hits(p).length===2&&hits(p).every(e=>e.source==='ring'),'no center explosion reaches this target');
for(const cover of ['open','post','wall']){
 const s=arena(cover),p=shot(s),rings=p.events.filter(e=>e.type==='ring');
 ok(rings.length===2,'exactly two independent rings '+cover);near(rings[1].t-rings[0].t,.2,'ring cadence '+cover);
 near(C.points(p.damage[1]),cover==='wall'?0:24,'ring-only damage '+cover);
 for(const e of hits(p)){
  const ring=rings.find(r=>r.bullet===e.bullet),radius=ring.radius*Math.min(1,(e.t-ring.t)/ring.duration),distance=Math.hypot(e.x-ring.x,e.y-ring.y),step=ring.radius/ ring.duration/90;
  ok(distance<=radius+1e-6&&distance>=Math.max(0,radius-step)-1e-6,'hit is on the swept visible ring front '+cover);
  ok(G.lineClear(s.world,{x:ring.x,y:ring.y-2},{x:e.x,y:e.y}),'contact has a clear radial path '+cover);
  near(C.points(e.value),12,'each ring contributes twelve '+cover);
 }
 const bodyHits=hits(p);if(bodyHits.length===2)near(bodyHits[1].t-bodyHits[0].t,.2,'same body reached at two distinct instants '+cover);
 for(const fps of [30,120]){const state=JSON.parse(JSON.stringify(s)),plan=JSON.parse(JSON.stringify(p)),hp=state.units[1].hp;for(let t=0;t<plan.duration+1/fps;t+=1/fps)E.applyEvents(state,plan,t);E.resolve(state,plan);near(hp-state.units[1].hp,p.damage[1],'HP matches events '+cover+'/'+fps);}
}
const center=shot(arena(),378);ok(hits(center).map(e=>C.points(e.value)).join(',')==='11,12,12','normal burst and rings remain11/12/12');near(C.points(center.damage[1]),35,'normal ceiling remains35');
const core=shot(arena('open',true),378);near(C.points(core.damage[1]),45,'boss weak ceiling remains45');
const outside=arena();outside.units[1].x=900;near(shot(outside).damage[1],0,'an enemy outside the maximum ring receives no damage');
const low=arena();low.units[1].hp=.3;near(C.points(shot(low).damage[1]),6,'ring cannot exceed actual remaining body HP');
// User video: stage10, Hibari,48 degrees, charge shown as61%. The claw
// has20 HP; the second ring must keep the damage left after breaking it.
for(const power of [60.5,60.67620434,61]){
 const s=E.campaign(10,{equippedCharacterId:'hibari',matchSeed:20261109,battleInventory:{}}),p=E.trajectory(s,0,48,power,{weaponId:'S_HIBARI'});
 near(C.points(p.partDamage[0]),20,'recorded Tideclaw claw is destroyed');
 ok(p.damage[1]>0,'remaining second-ring energy reaches the body after claw destruction');
 if(power===60.67620434){ok(p.events.filter(e=>['damage','part-damage'].includes(e.type)&&e.unit===1).map(e=>C.points(e.value)).join(',')==='5.1,12,2.9,9.1','native recreation of the uploaded clip and restored9.1 body damage');const state=JSON.parse(JSON.stringify(s)),initialHp=C.points(s.units[1].hp);E.applyEvents(state,p,Infinity);E.resolve(state,p);near(C.points(state.units[1].hp),initialHp-9.1,'uploaded-video ring retains9.1 body damage at current boss HP');}
 for(const ring of p.events.filter(e=>e.type==='ring')){
  const contacts=p.events.filter(e=>['damage','part-damage'].includes(e.type)&&e.unit===1&&e.bullet===ring.bullet);
  ok(contacts.reduce((sum,e)=>sum+e.value/(e.weak?s.units[1].core.multiplier:1),0)<=.6+1e-7,'one twelve-point wave budget, shared by armor and body');
 }
}
// Both body/armor accounting and transformed boss silhouettes remain native.
for(const slope of [0,Math.PI/4])for(const facing of [-1,1]){
 const s=arena('open',true);Object.assign(s.units[1],{slope,facing,parts:[{hp:.2,maxHp:.2,dx:-60,dy:-22,radius:20}]});
 const p=shot(s,378),state=JSON.parse(JSON.stringify(s)),hp=state.units[1].hp,armor=state.units[1].parts[0].hp;
 E.applyEvents(state,p,Infinity);E.resolve(state,p);
 near(hp-state.units[1].hp,p.damage[1],'transformed boss body HP');near(armor-state.units[1].parts[0].hp,p.partDamage[0]||0,'transformed boss armor HP');
 ok(C.points(p.damage[1]+Object.values(p.partDamage).reduce((sum,v)=>sum+v,0))<=45+1e-7,'shared boss budget');
 const rings=p.events.filter(e=>e.type==='ring');for(const ring of rings){const contacts=p.events.filter(e=>['damage','part-damage'].includes(e.type)&&e.unit===1&&e.bullet===ring.bullet);ok(contacts.reduce((sum,e)=>sum+e.value/(e.weak?s.units[1].core.multiplier:1),0)<=.6+1e-7,'one wave budget across transformed armor/body');}
}
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),guard=require('./damage-display-preservation.cjs');
for(const file of Object.keys(guard.manifest.sourcePatches))ok(guard.source(file,fs.readFileSync(path.join(__dirname,'../dist',file))).equals(cp.execFileSync('git',['show',guard.manifest.base+':ARCLINE/game/dist/'+file])),'bounded source preservation '+file);
console.log(JSON.stringify({status:'PASS',checks,scope:'Hibari two swept ring fronts, exposed arcs around partial cover, fixed cover, 12+12 and11+12+12, boss45, HP and30/120fps.'}));
