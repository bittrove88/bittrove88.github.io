'use strict';
const E=require('../dist/engine.js'),G=E.geometry,Q=require('../tools/route-planner.cjs'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-expedition-013';fs.mkdirSync(out,{recursive:true});const rows=[];
for(let stage=1;stage<=30;stage++){
 if(stage%5===0)continue;
 const s=E.campaign(stage,{equippedCharacterId:'gun',matchSeed:stage*89}),preparation=[];let best={hits:0};
 for(let turn=0;turn<4&&!s.result;turn++){
  s.phase='aim';const pos=Q.position(s);G.move(s,0,pos.dx);
  outer:for(let angle=6;angle<=162;angle+=6)for(let power=30;power<=95;power+=5){const center=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});if(center.damage[1]<.4||center.damage[0]>0)continue;let hits=0;
   for(const da of[-3,0,3])for(const dp of[-5,0,5]){const p=E.trajectory(s,0,angle+da,power+dp,{weaponId:'W01',skill:null});if(p.damage[1]>.1&&p.damage[0]===0)hits++;}
   if(hits>best.hits)best={hits,angle,power,at:{x:s.units[0].x,y:s.units[0].y},turn:s.playerTurn};if(hits===9)break outer;
  }
  if(best.hits>=5)break;
  const a=Q.teleport(s)||Q.choose(s);s.teleportMode=a.kind==='teleport';const p=E.launch(s,a.angle,a.power);E.resolve(s,p);while(s.pendingLoot.length)E.resolveLoot(s,null,true);preparation.push(a);if(s.result)break;E.next(s);s.phase='cpu';const x=E.enemyMoveTarget(s);G.move(s,1,x-s.units[1].x);const cpu=E.cpuPlan(s,E.seeded(s.matchSeed+s.round));E.resolve(s,E.launch(s,cpu.angle,cpu.power,cpu));if(!s.result)E.next(s);
 }
 console.log((best.hits>=5?'PASS':'FAIL')+' '+stage+' '+best.hits+'/9 '+JSON.stringify(preparation));rows.push({stage,...best,preparation});
}
const failed=rows.filter(r=>r.hits<5).map(r=>r.stage);fs.writeFileSync(path.join(out,'EARLY_TOLERANCE.json'),JSON.stringify({status:failed.length?'FAIL':'PASS',stages:24,angleOffsets:[-3,0,3],powerOffsets:[-5,0,5],minimumSafeHits:5,failed,rows,scope:'24 early normal stages. At least5/9 neighboring aim inputs damage the real enemy without self-damage from a reachable position, after up to3 legal setup actions with actual enemy responses. A local tolerance witness, not measured human completion or a guarantee for every input.'},null,2)+'\n');assert.equal(failed.length,0,'early stages must admit broad nearby solutions: '+failed);
