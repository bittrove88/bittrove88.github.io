'use strict';
const assert=require('node:assert/strict'),M=require('../dist/attack-review-model.js'),T=require('../dist/attack-motion.js'),E=require('../dist/engine.js'),A=require('../dist/attack-catalog.js');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)},near=(a,b,m)=>ok(Math.abs(a-b)<1e-6,m+' '+a+' '+b);
for(const key of Object.keys(A.specials)){
 const r=M.create('special:'+key),before=JSON.stringify(r.plan),t=T.create(r.plan);ok(before===JSON.stringify(r.plan),'clock never mutates physical plan '+key);near(t.at(0),0,'start '+key);near(t.at(t.duration+1),r.plan.duration,'end '+key);
 let last=-1;for(let i=0;i<=300;i++){const physical=t.at(t.duration*i/300);ok(physical>=last-1e-8,'monotonic '+key);last=physical;}
 for(const h of t.segments.filter(s=>s.rate===0))near(t.at((h.start+h.end)/2),h.from,'intentional physical freeze '+key);
 const reduced=T.create(r.plan,{reducedMotion:true});near(reduced.duration,r.plan.duration,'reduced motion linear '+key);
 const results=[];for(const fps of [30,120]){const s=JSON.parse(JSON.stringify(r.before)),p=E.trajectory(s,0,r.plan.angle,r.plan.power,{weaponId:r.row.weaponId}),clock=T.create(p);for(let age=0;age<=clock.duration+1/fps;age+=1/fps)E.applyEvents(s,p,clock.at(age));E.resolve(s,p);results.push({hp:s.units.map(u=>u.hp),damage:p.damage});}assert.deepEqual(results[0],results[1]);checks++;
}
const normal=M.create('normal:gun'),linear=T.create(normal.plan);near(linear.duration,normal.plan.duration,'normal retains timing');near(linear.at(.3),.3,'normal retains constant speed');
const sora=M.create('special:sora'),slow=T.create(sora.plan),split=sora.plan.events.find(e=>e.type==='split');ok(slow.segments.some(s=>s.rate===0&&Math.abs(s.from-split.t)<1e-8),'Sora split pause');ok(slow.segments.some(s=>s.rate>1.5&&s.from>=split.t),'Sora falling acceleration');
for(const id of ['hana','mogu'])ok(T.create(M.create('special:'+id).plan).segments.length===0,'natural salvo cadence, no added stops '+id);
for(const row of M.rows.filter(r=>r.category==='補助武器'))ok(T.create(M.create(row.id).plan).segments.length===0,'auxiliary timing stays natural '+row.weaponId);
const rico=M.create('special:rico'),stops=T.create(rico.plan).segments.filter(s=>s.rate===0);ok(stops.length===1&&Math.abs(stops[0].from-rico.plan.events.filter(e=>e.type==='bounce').at(-1).t)<1e-8,'only rainbow growth pauses, no repeated bounce stutter');
for(const id of ['E_10','E_20','E_50','E_60','E_70','E_80','E_90','E_FINAL_3'])ok(T.create(M.create('technique:'+id).plan).segments.length===0,'no generic boss motion '+id);
console.log(JSON.stringify({status:'PASS',checks,scope:'Nonlinear presentation, exact freezes, monotonic audio/physics clock, reduced motion, 30/120fps hit parity.'}));
