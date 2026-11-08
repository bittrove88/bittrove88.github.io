'use strict';
// Agreed ARCLINE v2 balancing. Displayed HP uses twenty points per combat unit.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js'),G=E.geometry,C=E.combat,P=require('../dist/preview.js');
let checks=0;
function ok(value,message){checks++;assert.ok(value,message);}
function near(value,expected,message){checks++;assert.ok(Math.abs(value-expected)<1e-6,message+' '+value+' vs '+expected);}
const configured={
 gun:{base:10,cap:35},ban:{base:35/3,cap:35},hibari:{base:11,cap:35},
 hana:{base:6,cap:36},rin:{base:40,cap:50},mogu:{base:13,cap:39},
 koro:{base:30,cap:30},sora:{base:10,cap:38},rico:{base:24,cap:40},yui:{base:42,cap:42}
};
function arena(id,boss=false){
 const s=E.campaign(4,{equippedCharacterId:id,matchSeed:20261101,battleInventory:{}});
 s.spec={...s.spec,boss,floors:[[[0,10],[100,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};
 s.world=G.world(s.spec);
 s.units=[160,700].map((x,i)=>({...G.safePosition(s.world,x,400),hp:100,maxHp:100,range:[35,965],parts:[],exposed:boss&&i?2:0}));
 return s;
}
function direct(id,dy=0,other={}){
 const s=arena(id),u=s.units[1];
 return E.trajectory(s,0,0,100,{weaponId:'S_'+id.toUpperCase(),
  origin:{x:u.x-48,y:u.y-22+dy,theta:0,dx:1,dy:0,dir:1},...other});
}
for(const p of C.profiles){
 const expected=configured[p.id];
 near(C.points(p.special.damage),Math.round(expected.base*100)/100,'base direct damage '+p.id);
 near(C.points(p.special.damageCap),expected.cap,'one-action damage cap '+p.id);
 const demo=P.create(E.campaign(1,{equippedCharacterId:p.id,matchSeed:7,battleInventory:{}}),p.special.id);
 ok(!!demo?.proof.valid,'all ten special tutorials still simulate '+p.id);
 ok(demo.plan.damage[1]<=p.special.damageCap+1e-6,'preview stays under cap '+p.id);
}
for(const [id,expected] of [['gun',35],['ban',35],['hibari',35],['koro',30],['rico',24],['yui',42]]){
 near(C.points(direct(id).damage[1]),expected,'actual synthetic center direct '+id);
}
ok(direct('rin',18).damage[1]>0&&direct('rin',18).damage[1]<=2.5,'Rin pre-convergence branches share a bounded budget');
near(C.points(C.get('rin').special.damage*C.get('rin').special.criticalMultiplier),50,'Rin precision multiplier');
const hana=direct('hana',0,{volley:Array.from({length:9},(_,i)=>({offset:0,delay:i*.1}))});
ok(hana.impacts.length===9&&hana.impacts.every(hit=>hit.hit?.unit===1),'nine Hana shots actually hit');
near(C.points(hana.damage[1]),36,'nine Hana hits capped at 36');
const mogu=C.get('mogu').special;
near(C.points(mogu.damage*3),39,'Mogu three direct pulses total');
ok(direct('mogu').impacts.length===3,'Mogu has three advancing detonations');
const sora=C.get('sora').special;
near(C.points(sora.splitChildDamage),10,'Sora each of twelve child shells');
near(C.points(sora.damageCap),38,'Sora all-child aggregate cap');
const source=arena('sora'),realSora=E.trajectory(source,0,80,90,{weaponId:'S_SORA'});
ok(realSora.bullets.length===13&&realSora.events.some(e=>e.type==='split'),'Sora apex splits twelve shells');
ok(realSora.bullets.filter(b=>!b.primary).every(b=>Math.abs(b.budget-.5)<1e-8),'each Sora child inherits ten points');
const rico=C.get('rico').special;
for(let bounces=0;bounces<=3;bounces++)
 near(C.points(Math.min(rico.damageCap,rico.damage+bounces*rico.bounceDamage)),Math.round((24+bounces*16/3)*100)/100,'Rico reflection '+bounces);
near(C.points(C.get('yui').special.damage+C.get('yui').special.compressionBonus),42,'Yui 30 plus 12 compression');
for(const id of Object.keys(configured)){
 const p=C.get(id).special;
 const scenario=direct(id);
 ok(scenario.damage[1]<=p.damageCap+1e-7,'aggregate cap cannot be bypassed '+id);
 // Chapter boss cores multiply weak-spot hits, but must respect each machine's
 // agreed per-action cap. The separate boss-only cap proposal was not adopted.
 const boss=arena(id,true),u=boss.units[1];
 boss.units[1].core={x:0,y:-77,radius:23,exposedRadius:33,multiplier:2};
 const core=E.trajectory(boss,0,0,100,{weaponId:p.id,
  origin:{x:u.x-48,y:u.y-77,theta:0,dx:1,dy:0,dir:1}});
 ok(core.damage[1]<=p.bossDamageCap+1e-7,'boss core respects the separate boss cap '+id);
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Ten special damage profiles, real single-hit and volley contacts, Ricochet scaling, Sora split, tutorial previews and per-action caps. Synthetic origins are damage fixtures, not playable aim scenarios.'}));
