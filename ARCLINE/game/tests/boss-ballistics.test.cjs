'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),W=require('../dist/weapons.js'),{copy,state,observe}=require('../tools/probe_boss_ballistics.cjs');
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);},near=(a,b,message)=>ok(Math.abs(a-b)<1e-7,message);
const rows=[];
// Reproduce real opening shots and test the first technique from reachable poses.
// A broad lower bound detects the former zero/5% routes without fixing one seed's result.
for(const stage of [10,20,30,40,50,60,80])for(const direction of [-1,0,1]){
 const row=observe(stage,direction);rows.push({...row,samples:undefined});
 ok(row.precise>0,'a real zero-error trajectory reaches L'+stage+'/'+direction);
 ok(row.hits/row.total>=.35,'stationary hit frequency on L'+stage+'/'+direction);
 const {s}=state(stage,direction),p=E.cpuPlan(s,()=>.5);let draws=0;E.cpuPlan(s,()=>{draws++;return .5;});ok(draws===3,'same three AI draws');
 const weakened=copy(s);weakened.effects.broken=1;near(E.cpuPlan(weakened,()=>.5).damage[0],p.damage[0]/2,'part breaking halves damage');
 for(const fps of [30,120]){
  const t=copy(s),shot=copy(p),hp=t.units[0].hp;for(let time=0;time<=shot.duration+1/fps;time+=1/fps)E.applyEvents(t,shot,time);E.resolve(t,shot);
  near(hp-t.units[0].hp,p.damage[0],'actual HP follows contact damage');const saved=JSON.stringify(t);E.resolve(t,shot);ok(JSON.stringify(t)===saved,'damage applies only once');
 }
}
// The same declared two-barrel volley is used by aiming and by the final shot.
const {s:gate}=state(20),aim=E.solve(gate,1,{weaponId:'E_20',targetPoint:{x:gate.telegraph.targetX,y:gate.telegraph.targetY}}),p=E.cpuPlan(gate,()=>.5),primaries=p.bullets.filter(b=>b.primary&&!b.effect);
ok(primaries.length===2,'two actual pincer projectiles');near(Math.abs(primaries[0].path[0].y-primaries[1].path[0].y),44,'upper/lower muzzle separation');
near(E.trajectory(gate,1,p.angle,p.power,{weaponId:'E_20'}).damage[0],p.damage[0],'solver and execution share the actual volley');ok(Number.isFinite(aim.score),'actual volley can be solved');
// Moving after the frozen warning avoids the newly reachable cloud attack.
const {s:cloud}=state(30,1),warning=copy(cloud.telegraph),still=E.cpuPlan(cloud,()=>.5);cloud.turn=0;cloud.phase='aim';const walked=E.move(cloud,0,10000);const dodge=E.cpuPlan(cloud,()=>.5);
ok(walked>100&&still.damage[0]>0&&dodge.damage[0]<still.damage[0],'movement can dodge the fixed cloud warning');assert.deepEqual(cloud.telegraph,warning);
// Bedrock remains solid even for a boss technique: accuracy never grants a hit through it.
const {s:blocked}=state(50);blocked.world.solids.push({id:'test-bedrock',kind:'bedrock',destructible:false,poly:[{x:700,y:-1600},{x:720,y:-1600},{x:720,y:560},{x:700,y:560}]});near(E.cpuPlan(blocked,()=>.5).damage[0],0,'fixed cover remains effective');
ok(W.getEnemy('W01').aimErrorScale===undefined,'ordinary weapons do not opt into technique tuning');
for(const n of [1,2,3,4])ok(W.getEnemy('E_FINAL_'+n).aimErrorScale===undefined,'final techniques retain their rules');
console.log(JSON.stringify({status:'PASS',checks,scope:'Real first boss technique, stationary reachable poses, original random draws, shared pincer volley, fixed warning/dodge, cover, weakened damage and contact HP.',rows}));
