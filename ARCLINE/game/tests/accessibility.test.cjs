'use strict';
const E=require('../dist/engine.js'),fs=require('node:fs'),path=require('node:path');
const bands=[],capsules=[],failures=[];
function findBand(s){
 let best={width:0};
 for(let a=-8;a<=84;a+=2){let start=null;
  for(let p=20;p<=101;p++){
   const ok=p<=100&&E.trajectory(s,0,a,p,{weaponId:'W01',skill:null}).damage[1]>=.5;
   if(ok&&start===null)start=p;
   if(!ok&&start!==null){if(p-start>best.width)best={width:p-start,angle:a,min:start,max:p-1,x:s.units[0].x};start=null;}
  }
  if(best.width>=13)return best;
 }return best;
}
for(let n=1;n<=100;n++){
 let best={width:0};
 for(const dx of [0,100,200,300,400,500,-60]){
  const s=E.campaign(n);E.move(s,0,dx);const candidate=findBand(s);if(candidate.width>best.width)best=candidate;if(best.width>=13)break;
 }
 bands.push({level:n,...best});if(best.width<13)failures.push(`L${n} power band ${best.width}<13`);
 const original=E.campaign(n);
 for(const item of original.pickups){let result=null;
  outer:for(const dx of [0,150,300,500]){
   const s=E.campaign(n);E.move(s,0,dx);
   for(let angle=-8;angle<=84;angle+=3)for(let power=20;power<=100;power+=3){const shot=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});if(shot.events.some(e=>e.type==='pickup'&&e.id===item.id)){
    const c={x:s.units[0].x,angle,power,damage:shot.damage[1]};if(!result||c.damage>result.damage)result=c;
    if(item.id[0]==='S'||shot.damage[1]>.1)break outer;
   }}
  }
  capsules.push({level:n,id:item.id,route:result});if(!result)failures.push(`L${n}/${item.id} no collection route`);if(['W','R'].includes(item.id[0])&&result?.damage<.1)failures.push(`L${n}/${item.id} no simultaneous attack route`);
 }
}
const report={status:failures.length?'FAIL':'PASS',levels:100,minimumBand:Math.min(...bands.map(b=>b.width)),capsuleCount:capsules.length,failures,bands,capsules,scope:'Each level initial environment; at least one reachable walking position, fixed angle and 13 consecutive integer power values causing >=0.5 damage. Optional cosmetics require collection only; weapons/refills require collection plus damage. Other environment states and sampled poses are covered separately, not an exhaustive continuous-space proof.'};
if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'ACCESSIBILITY.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,bands:undefined,capsules:undefined},null,2));if(failures.length)process.exitCode=1;
