'use strict';
// Agreed ARCLINE v2 balancing. Displayed HP uses twenty points per combat unit.
const assert=require('node:assert/strict');
const E=require('../dist/engine.js'),G=E.geometry,C=E.combat,P=require('../dist/preview.js');
let checks=0;
function ok(value,message){checks++;assert.ok(value,message);}
function near(value,expected,message){checks++;assert.ok(Math.abs(value-expected)<1e-6,message+' '+value+' vs '+expected);}
const configured={
 gun:{base:35,cap:35},ban:{base:35,cap:35},hibari:{base:30,cap:30},
 hana:{base:18,cap:48},rin:{base:40,cap:50},mogu:{base:13,cap:39},
 koro:{base:30,cap:30},sora:{base:18,cap:45},rico:{base:24,cap:40},yui:{base:30,cap:42}
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
 near(C.points(p.special.damage),expected.base,'base direct damage '+p.id);
 near(C.points(p.special.damageCap),expected.cap,'one-action damage cap '+p.id);
 const demo=P.create(E.campaign(1,{equippedCharacterId:p.id,matchSeed:7,battleInventory:{}}),p.special.id);
 ok(!!demo?.proof.valid,'all ten special tutorials still simulate '+p.id);
 ok(demo.plan.damage[1]<=p.special.damageCap+1e-6,'preview stays under cap '+p.id);
}
for(const [id,expected] of [['gun',35],['ban',35],['hibari',30],['koro',30],['rico',24],['yui',42],['rin',50]]){
 near(C.points(direct(id).damage[1]),expected,'actual synthetic center direct '+id);
}
near(C.points(direct('rin',18).damage[1]),40,'Rin noncritical body shot');
near(C.points(C.get('rin').special.damage*C.get('rin').special.criticalMultiplier),50,'Rin precision multiplier');
const hana=direct('hana',0,{volley:[{offset:0,delay:0},{offset:0,delay:.18},{offset:0,delay:.36}]});
ok(hana.impacts.length===3&&hana.impacts.every(hit=>hit.hit?.unit===1),'three Hana shots actually hit');
near(C.points(hana.damage[1]),48,'three Hana hits capped at 48');
const mogu=C.get('mogu').special;
near(C.points(mogu.damage*3),39,'Mogu three direct pulses total');
ok(direct('mogu').impacts.length===3,'Mogu has three advancing detonations');
const sora=C.get('sora').special;
near(C.points(sora.splitChildDamage),18,'Sora each of eight child shells');
near(C.points(sora.damageCap),45,'Sora all-child aggregate cap');
const source=arena('sora'),realSora=E.trajectory(source,0,80,90,{weaponId:'S_SORA'});
ok(realSora.bullets.length===9&&realSora.events.some(e=>e.type==='split'),'Sora apex splits eight shells');
ok(realSora.bullets.filter(b=>!b.primary).every(b=>Math.abs(b.budget-.9)<1e-8),'each Sora child inherits eighteen points');
const rico=C.get('rico').special;
for(let bounces=0;bounces<=4;bounces++)
 near(C.points(Math.min(rico.damageCap,rico.damage+bounces*rico.bounceDamage)),24+bounces*4,'Rico reflection '+bounces);
near(C.points(C.get('yui').special.damage+C.get('yui').special.compressionBonus),42,'Yui 30 plus 12 compression');
for(const id of Object.keys(configured)){
 const p=C.get(id).special;
 const scenario=direct(id);
 ok(scenario.damage[1]<=p.damageCap+1e-7,'aggregate cap cannot be bypassed '+id);
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Ten special damage profiles, real single-hit and volley contacts, Ricochet scaling, Sora split, tutorial previews and per-action caps. Synthetic origins are damage fixtures, not playable aim scenarios.'}));
