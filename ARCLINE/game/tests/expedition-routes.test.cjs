'use strict';
const fs=require('node:fs'),path=require('node:path'),E=require('../dist/engine.js'),G=E.geometry,Q=require('../tools/route-planner.cjs');
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-expedition-013';fs.mkdirSync(out,{recursive:true});const rows=[],failed=[];
for(const variant of [1,2,3])for(let stage=1;stage<=100;stage++){
 if(process.env.ARCLINE_STAGES&&!process.env.ARCLINE_STAGES.split(',').map(Number).includes(stage))continue;
 const s=E.campaign(stage,{equippedCharacterId:'gun',matchSeed:stage*37+variant*997,battleInventory:{}}),actions=[];let safety=0;
 try{while(!s.result&&safety++<s.shotLimit*2+4){
  if(s.turn===0){s.phase='aim';if(['DROP','MARK','PREPARE'].includes(s.telegraph?.kind)){const u=s.units[0];G.move(s,0,u.x<500?170:-170);}
   const before={x:s.units[0].x,y:s.units[0].y},a=Q.choose(s);if(!a)throw Error('No candidate');s.teleportMode=a.kind==='teleport';s.mode='W01';const p=E.launch(s,a.angle,a.power);if(!p)throw Error('Launch rejected');E.resolve(s,p);while(s.pendingLoot.length)E.resolveLoot(s,null,true);actions.push({...a,before,damage:p.damage,destroyed:p.destroyed,teleportSuccess:p.teleportSuccess,after:{x:s.units[0].x,y:s.units[0].y},hp:s.units.map(u=>u.hp),ammo:s.specialAmmo});
  }else{s.phase='cpu';const x=E.enemyMoveTarget(s);G.move(s,1,x-s.units[1].x);const p=E.cpuPlan(s,E.seeded((s.matchSeed+s.round*1009)>>>0)),shot=E.launch(s,p.angle,p.power,p);E.resolve(s,shot);}
  if(!s.result)E.next(s);
 }
 }catch(e){s.testError=e.stack;}
 const row={stage,seedVariant:variant,result:s.result,reason:s.reason,error:s.testError,actions,remainingHp:s.units[0].hp,actionLimit:s.shotLimit};rows.push(row);if(s.result!=='win')failed.push({stage,variant});console.log((s.result==='win'?'PASS':'FAIL')+' '+stage+'/'+variant+' '+actions.length+' actions '+(s.testError||s.reason));
 fs.writeFileSync(path.join(out,'ROUTES_PROGRESS.json'),JSON.stringify({completed:stage,failed,rows},null,2)+'\n');
}
require('./report.cjs')(path.join(out,process.env.ARCLINE_STAGES?'AIRBORNE_MATCHES.json':'CAMPAIGN_MATCHES.json'),{status:failed.length?'FAIL':'PASS',matches:rows.length,character:'gun',specialsUsed:0,seedRule:'stage*37+variant*997',seedVariants:[1,2,3],scope:'Native full matches with actual enemy turns, original HP and damage, normal fire, free walking, breaking and teleport. Search-based aim is not a human difficulty measurement.',failed,rows});if(failed.length)process.exitCode=1;
