'use strict';
const E=require('../dist/engine.js'),G=E.geometry,fs=require('node:fs'),path=require('node:path');let failures=[],rows=[];
function partPlan(s){let best=null;for(let angle=-8;angle<=84;angle+=4)for(let power=25;power<=100;power+=4){const shot=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});const part=Object.values(shot.partDamage).reduce((a,b)=>a+b,0);const score=part*3+shot.damage[1];if(!best||score>best.score)best={shot,score};}return best.shot;}
for(let n=10;n<=100;n+=10){
 for(const broken of [0,1,2,3])for(const phase of n===100?[0,1,2]:[0]){
  const s=E.campaign(n);s.effects.broken=Math.min(broken,s.units[1].parts.length);s.units[1].parts.forEach((p,i)=>{if(i<broken)p.hp=0;});s.bossPhase=phase;
  for(const round of [1,2,3,4]){s.round=round;E.rebuildWorld(s);const p=E.solve(s,0),c=E.solve(s,1);if(p.score<=.1||c.score<=.1)failures.push(`${n}/broken${broken}/phase${phase}/R${round}`);}
 }
 for(const strategy of ['core','parts']){
  const s=E.campaign(n);let count=0,partsHit=0;
  while(!s.result&&count<18){s.turn=0;s.phase='aim';let shot;
   if(strategy==='parts'&&s.units[1].parts.some(p=>p.hp>0)){shot=partPlan(s);partsHit+=Object.keys(shot.partDamage).length;}
   else{const b=E.solve(s,0);shot=E.trajectory(s,0,b.angle,b.power,{weaponId:'W01',skill:null});}
   E.launch(s,shot.angle,shot.power,shot);E.resolve(s,shot);count++;
   if(!s.result){s.turn=1;E.boundary(s);s.turn=0;}
  }
  rows.push({level:n,strategy,result:s.result,shots:count,partsHit,remainingHP:s.units[1].hp});if(s.result!=='win')failures.push(`L${n}/${strategy} strategy`);
 }
}
const report={status:failures.length?'FAIL':'PASS',bosses:10,routeStates:192,strategies:rows,failures,scope:'Geometry/damage strategy isolation: basic cannon only, no enemy damage during strategy count; full combat including seeded CPU is covered by campaign.test.cjs.'};
if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'BOSSES.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
