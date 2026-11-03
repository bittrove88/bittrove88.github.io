'use strict';
// Exactly the three Normal matches required by the minimal verification request.
// This is an automated mechanic check, never a human win-rate estimate.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../dist/engine.js'),Q=require('./route-planner.cjs'),Final=require('./final100-planner.cjs');
const rows=[],out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-difficulty';fs.mkdirSync(out,{recursive:true});
function match(stage){const s=E.campaign(stage,{difficulty:'normal',matchSeed:4697}),actions=[],enemies=[];let loops=0;
 while(!s.result&&loops++<s.shotLimit*2+4){
  if(!s.turn){s.phase='aim';const original={...s.units[0]},used=s.walkUsed||0,candidates=[];
   for(const input of[0,-10000,10000]){Object.assign(s.units[0],original);s.walkUsed=used;E.move(s,0,input);const a=Q.firing(s,'W01',p=>p.damage[0]<.2);if(a)candidates.push({...a,input});}
   Object.assign(s.units[0],original);s.walkUsed=used;candidates.sort((a,b)=>b.score-a.score||Math.abs(a.input)-Math.abs(b.input));const a=candidates[0];assert(a,'legal player plan');E.move(s,0,a.input);s.mode='W01';const shot=E.launch(s,a.angle,a.power);assert(shot,'player launch');E.resolve(s,shot);while(s.pendingLoot.length)E.resolveLoot(s,null,true);actions.push({angle:a.angle,power:a.power,damage:shot.damage,walkUsed:s.walkUsed||0});
  }else{s.phase='cpu';const rng=E.seeded((s.matchSeed+s.round*1009)>>>0),target=E.enemyMoveTarget(s);E.geometry.move(s,1,target-s.units[1].x);const p=E.cpuPlan(s,rng),hp=s.units[0].hp;E.resolve(s,E.launch(s,p.angle,p.power,p));assert(Math.abs(s.units[0].hp-Math.max(0,hp-p.damage[0]))<1e-8,'enemy prediction/resolution');enemies.push({round:s.round,kind:p.attackKind,angle:p.angle,power:p.power,damage:p.damage[0]});}
  if(!s.result)E.next(s);
 }
 assert(['win','lose'].includes(s.result),'match terminates');assert(actions.length&&enemies.length,'both sides attack');assert(actions.every(a=>a.walkUsed<=140+1e-7),'bounded movement');return {stage,difficulty:s.difficulty,result:s.result,reason:s.reason,shots:s.shotCount,actions,enemies};
}
for(const stage of[60,90]){const row=match(stage);rows.push(row);console.log('Normal',stage,row.result,row.shots,'actions',row.enemies.length,'enemy attacks');}
const final=Final.match(4697,false);assert(['win','lose'].includes(final.result),'100 terminates');assert(final.actions.length&&final.enemies.length&&final.entries.length>1,'100 both sides attack and handoff');assert(final.entries.every(e=>e.hp===3.5),'fixed HP70');rows.push({stage:100,difficulty:'normal',...final});
const report={status:'PASS',matches:3,rows,scope:'Normal stages60,90,100 once each with real trajectories,enemy attacks,win/loss resolution,movement budget and final relay handoffs. Outcomes are not used to estimate the 90/80/70% design targets.'};fs.writeFileSync(path.join(out,'DIFFICULTY_MATCHES.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS three Normal matches',rows.map(r=>[r.stage,r.result]));
