'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),B=E.bossActions,{state,copy}=require('../tools/probe_boss_ballistics.cjs');
const rows=[];
for(const stage of [10,20,30,40,50,60,70,80,90])for(const direction of [-1,0,1]){
 const {s}=state(stage,direction),warning=copy(s.telegraph),decision=E.planEnemyAction(s,()=>.5),from=copy(s.units[1]);
 if(decision.action){assert(E.commitEnemyAction(s,decision.action),'actual action accepted');if(decision.action.kind!=='teleport')E.move(s,1,decision.target-s.units[1].x);}
 assert.deepEqual(s.telegraph,warning,'boss motion keeps warning snapshot');
 const after=copy(s.units[1]);
 if(decision.action?.kind==='teleport'){
  assert(s.bossEcho,'actual major boss transfer leaves echo');E.next(s);s.turn=1;s.phase='cpu';
  const echo=E.planEnemyAction(s,()=>.5).plan;assert(echo?.echo,'echo fires before boss');
  E.resolve(s,E.launch(s,0,0,echo));E.next(s);
  const normal=E.planEnemyAction(s,()=>.5);assert(normal.plan?.deferBossAttack&&!normal.plan.specialTechnique,'echo hand defers unique');
  E.commitEnemyAction(s,normal.action);E.move(s,1,normal.target-s.units[1].x);E.resolve(s,E.launch(s,0,0,normal.plan));E.next(s);
  assert.deepEqual(s.telegraph,warning,'deferred warning remains frozen');s.turn=1;s.phase='cpu';
 }
 // Re-evaluate the actual firing position against the same current world.
 const before=copy(s),plan=E.cpuPlan(s,()=>.5);assert(plan.specialTechnique,'ordinary unique retained');
 const crossed=copy(before);crossed.units[0].x=s.units[1].x+500;
 const other=E.cpuPlan(crossed,()=>.5);assert.equal(other.angle,plan.angle);assert.equal(other.power,plan.power);assert.equal(other.facing,plan.facing);
 const still=copy(s);Object.assign(still.units[0],warning.targetPose);const p=E.cpuPlan(still,()=>.5);
 let hits=0;for(let i=1;i<=128;i++){const seed=(Math.imul(i,2654435761)^0xa53c9e71)>>>0;if(E.cpuPlan(still,E.seeded(seed)).damage[0]>0)hits++;}
 assert(hits>=Math.ceil(128*.35),'reachable stationary aim after actual boss action '+stage+'/'+direction);
 rows.push({stage,direction,action:decision.action?.kind||'legacy',from:{x:from.x,y:from.y},after:{x:after.x,y:after.y},damage:p.damage[0]*20,hits,total:128});
}
// Crossing behind an armoured boss must keep both attachment geometry and
// the firing direction at the warning, including when no walk is available.
for(const stage of [40,60]){
 const {s}=state(stage),warning=copy(s.telegraph);s.units[0].x=s.units[1].x+400;
 s.enemyTactics={teleports:2,cooldown:2};s.enemyWalkRound=s.round;s.enemyWalkUsed=140;
 const d=E.planEnemyAction(s,()=>.5);assert.equal(d.action.kind,'shoot');assert(E.commitEnemyAction(s,d.action));
 assert.equal(s.units[1].facing,warning.targetX>=s.units[1].x?1:-1);
 const expected=copy(s);B.refresh(expected);assert.deepEqual(s.world.solids,expected.world.solids,'committed attachments follow frozen firing direction');
 assert.equal(d.plan.facing,s.units[1].facing,'committed body and planned muzzle agree');
 s.bossEchoFiredRound=s.round;assert.equal(B.facing(s),1,'echo deferral restores live-player facing');
}
const out=process.env.ARCLINE_EVIDENCE_DIR||'/tmp/arcline-boss-motion-tuning';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'BOSS_BALLISTICS_MOTION.json'),JSON.stringify({status:'PASS',scope:'Actual enemy decisions, commit and walk; real boss transfers, echo and unique deferral; frozen aim after crossing; 128 stationary errors at the resulting firing position per native pose.',rows},null,2)+'\n');console.log('PASS boss-ballistics-motion '+rows.length+' native scenarios');
