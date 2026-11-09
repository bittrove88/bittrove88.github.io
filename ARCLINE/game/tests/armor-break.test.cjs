'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),P=require('../dist/physics.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function arena(stage){
 const s=E.campaign(stage,{matchSeed:42});
 s.spec={...s.spec,floors:[[[0,10],[300,10]]],features:[],staticFeatures:[],components:[],phaseFeatures:undefined,worldWidth:3000};s.world=E.geometry.world(s.spec);
 for(const [i,u]of s.units.entries())Object.assign(u,{x:i?1200:880,y:400,slope:0,floating:false,range:[35,2965]});E.bossActions.refresh(s);return s;
}
function aim(s){
 const q=E.geometry.actorParts(s,1)[0],target=s.stage===60?{x:1110,y:373}:{x:1200+q.dx,y:400+q.dy},dir=s.stage!==60&&q.dx>0?-1:1;
 return {weaponId:'W01',origin:{x:target.x-dir*90,y:target.y-3,theta:dir>0?0:Math.PI,dir},weaponOverrides:{blast:0}};
}
for(const stage of [40,60,70,80,90]){
 const required=stage<70?1:2;
 for(const difficulty of ['easy','normal','hard']){
  const s=E.campaign(stage,{difficulty});for(const p of s.units[1].parts){assert.equal(p.breakHits,required);assert.equal(p.hitsRemaining,required);assert.equal(p.maxHp,1,'HP is only the legacy live/broken flag');}
 }
 const s=arena(stage),options=aim(s),before=JSON.stringify(s),one=P.simulate(s,0,0,100,options),hit=one.events.find(e=>e.type==='part-hit');
 assert.equal(JSON.stringify(s),before,'planning is read-only');assert.ok(hit,'actual part/armor contact');assert.deepEqual(one.partHits,{0:1});assert.deepEqual(one.partDamage,{});assert.equal(one.damage[1],0,'isolated armor has no body damage');
 for(const damage of [.000001,100]){
  const plan=P.simulate(s,0,0,100,{...options,weaponOverrides:{blast:0,damage,damageCap:damage}});assert.deepEqual(plan.partHits,one.partHits,'damage does not scale hit count');
 }
 for(const fps of [30,120]){
  const state=clone(s),plan=clone(one);E.applyEvents(state,plan,hit.t-.00001);assert.equal(state.units[1].parts[0].hitsRemaining,required,'no early count');
  for(let t=hit.t;t<=plan.duration+1/fps;t+=1/fps)E.applyEvents(state,plan,t);
  E.resolve(state,plan);E.resolve(state,plan);assert.equal(state.units[1].parts[0].hitsRemaining,required-1,'one contact once across frames/resolve');
  assert.equal(state.units[1].parts[0].hp,required===1?0:1);E.bossActions.refresh(state);assert.equal(state.units[1].parts[0].hitsRemaining,required-1,'geometry refresh retains count');
  if(required===1)assert.ok(!state.world.solids.some(o=>o.armorPart===0),'broken armor removed at contact');
 }
 const many=P.simulate(s,0,0,100,{...options,volley:[{delay:0},{delay:.2},{delay:.4}]});
 assert.equal(many.partHits[0],required,'separate projectiles in one attack count separately, capped at destruction');
 const events=many.events.filter(e=>e.type==='part-hit'&&e.part===0);assert.equal(new Set(events.map(e=>e.bullet)).size,required,'same projectile cannot double count one armor plate');
 const state=clone(s);E.applyEvents(state,many,events.at(-1).t+.000001);assert.equal(state.units[1].parts[0].hitsRemaining,0);assert.ok(!state.world.solids.some(o=>o.armorPart===0),'removed during multi-shot, not next turn');
}
for(const stage of [10,20,30,50,100])assert.ok(E.campaign(stage).units[1].parts.every(p=>!p.breakHits),'other bosses retain part HP');
console.log('PASS armor break counts: five bosses, three difficulties, distinct projectiles, contact timing, damage independence,30/120fps and removal');
