'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),W=require('../dist/weapons.js'),M=require('../dist/attack-review-model.js'),SFX=require('../dist/sfx-manager.js');
const C=E.combat,G=E.geometry;let checks=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);},near=(a,b,m)=>ok(Math.abs(a-b)<1e-7,m+' '+a+' / '+b);
function arena(id='gun',boss=false){
 const s=E.campaign(boss?10:4,{equippedCharacterId:id,matchSeed:20261109,battleInventory:{}});
 s.spec={...s.spec,worldWidth:1200,boss,midboss:false,floors:[[[0,10],[120,10]]],components:[],features:[],staticFeatures:[],phaseFeatures:null};s.world=G.world(s.spec);s.pickups=[];
 s.units=[160,800].map(x=>({...G.safePosition(s.world,x,400),hp:100,maxHp:100,parts:[],range:[35,1165],exposed:2}));
 if(boss)Object.assign(s.units[1],{facing:1,hitShape:{x:0,y:-22,rx:60,ry:35},core:{x:0,y:-22,radius:20,exposedRadius:25,multiplier:2}});
 return s;
}
function shot(s,id,extra={}){return E.trajectory(s,0,0,100,{weaponId:id,origin:{x:600,y:378,theta:0,dx:1,dy:0,dir:1},...extra});}
function events(p){return p.events.filter(e=>e.type==='damage'&&e.unit===1);}
function verifyTimeline(before,plan,label){
 const s=JSON.parse(JSON.stringify(before)),p=JSON.parse(JSON.stringify(plan)),hp=s.units[1].hp,partHp=s.units[1].parts.map(q=>q.hp);
 p.appliedEvents=0;p.resolved=false;delete p.appliedDamage;delete p.sourceAppliedDamage;delete p.appliedPartDamage;
 for(const e of p.events.filter(e=>e.type==='damage'||e.type==='part-damage')){
  E.applyEvents(s,p,e.t-1e-8);
  E.applyEvents(s,p,e.t+1e-8);
  const body=p.events.filter(x=>x.type==='damage'&&x.unit===1&&x.t<=e.t+1e-8).reduce((n,x)=>n+x.value,0);
  near(hp-s.units[1].hp,body,label+' body HP at every contact');
  partHp.forEach((h,i)=>near(h-s.units[1].parts[i].hp,p.events.filter(x=>x.type==='part-damage'&&x.part===i&&x.t<=e.t+1e-8).reduce((n,x)=>n+x.value,0),label+' part HP at every contact'));
 }
 E.resolve(s,p);near(hp-s.units[1].hp,p.damage[1],label+' no hidden end damage');
 const result=JSON.stringify(s);E.resolve(s,p);ok(JSON.stringify(s)===result,label+' no repeated damage');
 near(events(p).reduce((n,e)=>n+e.value,0),p.damage[1],label+' labels sum to actual body damage');
 for(const [i,value]of Object.entries(p.partDamage))near(p.events.filter(e=>e.type==='part-damage'&&e.part===+i).reduce((n,e)=>n+e.value,0),value,label+' labels sum to part damage');
}
// Real authored attacks: every visible contact, HP reduction and final sum agree.
for(const row of M.rows.filter(r=>['通常弾','補助武器','必殺技'].includes(r.category))){const r=M.create(row.id);verifyTimeline(r.before,r.plan,row.id);}
const hana=arena('hana'),nine=shot(hana,'S_HANA',{volley:Array.from({length:9},(_,i)=>({offset:0,delay:i*.1}))});
near(C.points(nine.damage[1]),36,'Hana total36');ok(events(nine).length===6&&events(nine).every(e=>Math.abs(e.value-.3)<1e-8),'Hana first six hits retain six points');verifyTimeline(hana,nine,'Hana all hit');
ok(events(nine).at(-1).capped,'an exact six-hit cap is represented in event metadata');
const sora=arena('sora'),twelve=shot(sora,'S_SORA',{volley:Array.from({length:12},(_,i)=>({offset:0,delay:i*.1}))});
near(C.points(twelve.damage[1]),38,'Sora total38');ok(events(twelve).map(e=>C.points(e.value)).join(',')==='10,10,10,8','Sora chronological10/10/10/8');
const hibari=arena('hibari'),rings=shot(hibari,'S_HIBARI');
ok(rings.events.filter(e=>e.type==='ring').length===2,'two independent Hibari rings');
ok(events(rings).map(e=>C.points(e.value)).join(',')==='11,12,12','Hibari11+12+12');ok(events(rings).at(-1).t>events(rings)[1].t+.19,'second ring arrives later');verifyTimeline(hibari,rings,'Hibari two rings');
const gun=arena('gun'),two=shot(gun,'S_GUN');ok(events(two).map(e=>C.points(e.value)).join(',')==='10,25','Gun10+25');verifyTimeline(gun,two,'Gun two blasts');
const dying=arena('hana');dying.units[1].hp=.5;const finalHits=shot(dying,'S_HANA',{volley:Array.from({length:9},(_,i)=>({offset:0,delay:i*.1}))});ok(events(finalHits).map(e=>C.points(e.value)).join(',')==='6,4','final hits display only the remaining ten HP');verifyTimeline(dying,finalHits,'no overkill damage labels');
const fractional=arena('rico');fractional.units[1].hp=5;
for(const damage of [1.5,1.9999999999999998,1.5])E.resolve(fractional,shot(fractional,'S_RICO',{volley:[{damage,offset:0,delay:0}]}));
near(fractional.units[1].hp,0,'floating point residue cannot leave a defeated enemy alive');ok(fractional.result==='win','fractional final hit completes the battle');
const mogu=arena('mogu'),pulse=shot(mogu,'S_MOGU');ok(pulse.bullets.filter(b=>!b.effect).length===1&&pulse.impacts.length===3,'one Mogu shell, three blasts');
for(let i=1;i<3;i++){near(pulse.impacts[i].x-pulse.impacts[i-1].x,42,'Mogu advances42px');near(pulse.impacts[i].t-pulse.impacts[i-1].t,.22,'Mogu advancing cadence');}
for(const range of [[35,1165],[800,800]]){const yui=arena('yui');yui.units[1].range=range;const p=shot(yui,'S_YUI');near(C.points(p.damage[1]),42,'Yui capture always42 independent of movement');ok(events(p).length===1&&events(p)[0].source==='compression','Yui hits once at compression');verifyTimeline(yui,p,'Yui capture');}
const blocked=arena('yui');blocked.spec.components=[{id:'fixed',destructible:false,poly:[[65,5],[67,5],[67,45],[65,45]]}];blocked.world=G.world(blocked.spec);near(shot(blocked,'S_YUI').damage[1],0,'fixed wall blocks capture');
// A broken armor piece disappears during the action, before later projectiles arrive.
const armored=arena('hana',true);armored.units[1].parts=[{hp:.5,maxHp:.5,dx:-60,dy:-22,radius:20}];
const through=shot(armored,'S_HANA',{volley:Array.from({length:9},(_,i)=>({offset:0,delay:i*.1}))});
near(through.partDamage[0],.5,'only actual armor HP is spent');near(through.damage[1],1.75,'remaining budget reaches core');ok(events(through).some(e=>e.weak),'later projectile hits newly exposed core');verifyTimeline(armored,through,'armor opens during volley');
const normal=shot(armored,'W01');near(normal.damage[1],0,'normal impact does not also damage body through armor');near(normal.partDamage[0],.5,'normal damages armor');
// Every boss ceiling is reachable through genuine core contact, rather than an unconditional species multiplier.
for(const id of C.profiles.map(p=>p.id)){
 const s=arena(id,true),w=C.get(id).special,plan=shot(s,w.id,{volley:Array.from({length:18},(_,i)=>({offset:0,delay:i*.05}))});
 const expected={rin:55,yui:50}[id]||45;
 near(C.points(w.bossDamageCap),expected,id+' authored boss ceiling');
 near(C.points(plan.damage[1]),expected,id+' reaches boss ceiling with enough core hits');verifyTimeline(s,plan,id+' core');
}
for(const id of W.activeIds){const s=arena('gun',true),w=W.get(id),p=shot(s,id,{volley:Array.from({length:20},(_,i)=>({offset:0,delay:i*.05}))});near(C.points(p.damage[1]),id==='W22'?33:40,id+' boss weapon ceiling');verifyTimeline(s,p,id+' core');}
// A cone touching the edge of a body must hit even while the body's center is outside it.
const edge=arena('ban');edge.units[1].x=700;edge.units[1].y=360;
const cone=shot(edge,'S_BAN',{origin:{x:640,y:399,theta:Math.PI/2,dir:1,dx:0,dy:1}});ok(cone.damage[1]>0,'Ban cone catches a real body edge');verifyTimeline(edge,cone,'Ban edge');
const relay=E.campaign(100,{matchSeed:20261109,battleInventory:{}});relay.units[1].parts=[];relay.finalTeam.damage[relay.characterId]=relay.spec.finalBattle.requiredDamage-.5;
const core=G.actorPoint(relay,1,relay.units[1].core.x,relay.units[1].core.y),quota=E.trajectory(relay,0,0,100,{weaponId:'W01',origin:{x:core.x-100,y:core.y,theta:0,dx:1,dy:0,dir:1}});
near(C.points(quota.damage[1]),10,'final relay labels stop at the remaining ten-point quota');verifyTimeline(relay,quota,'relay quota');
console.log(JSON.stringify({status:'PASS',checks,scope:'Contact-by-contact HP/labels for all32 player attacks, chronological caps, two rings, advancing pulses, capture42, armor break during volley, real core ceilings and cone edge contacts.'}));
