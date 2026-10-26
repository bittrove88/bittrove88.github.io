'use strict';
const assert=require('node:assert/strict'),E=require('../dist/engine.js'),G=E.geometry,fs=require('node:fs'),path=require('node:path');
const rows=[],failures=[];let combos=0,states=0,maxFlight=0,damageMax=0;const repositioned=[];
const check=(v,label)=>{if(!v)failures.push(label);};
for(let n=1;n<=100;n++){
 const samples=[];
 for(const round of [1,2,3,4])for(const phase of n===100?[0,1,2]:[0]){
  const s=E.campaign(n);s.round=round;s.bossPhase=phase;E.rebuildWorld(s);samples.push({s,label:`L${n}/R${round}/P${phase}`});
 }
 // All walking extrema, each BLINK candidate, push/pull offsets and exchanged positions.
 for(const delta of [-1000,1000,-72,72]){const s=E.campaign(n);E.move(s,0,delta);samples.push({s,label:`L${n}/move${delta}`});}
 for(let i=0;i<E.campaign(n).blink.length;i++){const s=E.campaign(n);s.selectedSkill='BLINK';E.blink(s,i);samples.push({s,label:`L${n}/blink${i}`});}
 if(!E.levels[n-1].boss){const s=E.campaign(n),a={...s.units[0]},b={...s.units[1]};Object.assign(s.units[0],b,{hp:5,maxHp:5});Object.assign(s.units[1],a,{hp:3,maxHp:3});samples.push({s,label:`L${n}/swapped`});}
 for(const {s,label} of samples){
  states++;check(s.units.every(u=>Number.isFinite(u.x+u.y+u.slope)),label+' finite pose');
  let b=E.solve(s,0);
  if(b.score<=.2){for(const dx of [-60,60,-120,120,-240,240]){const original={...s.units[0]};E.move(s,0,dx);const r=E.solve(s,0);Object.assign(s.units[0],original);if(r.score>.2){b=r;repositioned.push({state:label,walk:dx});break;}}}
  check(b.score>.2,label+' reachable basic route');
  const enemy=E.solve(s,1);check(enemy.score>.1,label+' enemy route');
 }
 const s=E.campaign(n);
 for(const weapon of E.weapons)for(const skill of [null,...Object.keys(s.skills)]){
  const shot=E.trajectory(s,0,48,75,{weaponId:weapon.id,skill});combos++;
  check(shot.duration<=8.2,`L${n}/${weapon.id}/${skill} bounded flight`);check(shot.bullets.length<=6,`L${n} bounded children`);
  check(shot.bullets.every(b=>b.bounces<=3&&b.path.every(p=>Number.isFinite(p.x+p.y+p.t))),`L${n} finite trajectories`);
  check(shot.damage[0]<=1&&shot.damage[1]<=(s.spec.boss?2:1.25),`L${n} damage budgets`);
  const ids=shot.events.filter(e=>e.type==='pickup').map(e=>e.id);check(new Set(ids).size===ids.length,'capsule deduplication');
  maxFlight=Math.max(maxFlight,shot.duration);damageMax=Math.max(damageMax,shot.damage[1]);
 }
 // Headless full duel: fixed seed, standard only, optional movement toward a valid route.
 const game=E.campaign(n);let playerShots=0,cpuShots=0;
 while(!game.result&&playerShots<19){
  game.phase='aim';game.turn=0;const a=E.solve(game,0);const plan=E.launch(game,a.angle,a.power);assert(plan);E.resolve(game,plan);playerShots++;if(game.result)break;E.next(game);
  const target=E.enemyMoveTarget(game);G.move(game,1,target-game.units[1].x);const c=E.cpuPlan(game,E.seeded(n*100+game.round));game.phase='cpu';const cs=E.launch(game,0,0,c);E.resolve(game,cs);cpuShots++;if(game.result)break;E.next(game);
 }
 check(!!game.result,`L${n} finite campaign`);check(playerShots<=game.shotLimit,`L${n} shot cap`);
 rows.push({level:n,result:game.result,reason:game.reason,playerShots,cpuShots,remainingHP:game.units.map(u=>u.hp)});
}
const report={status:failures.length?'FAIL':'PASS',seed:'level*100+round',sampledStates:states,weaponSkillCombinations:combos,maxFlight,damageMax,repositioned,matches:rows.length,outcomes:Object.fromEntries(['win','lose','draw'].map(k=>[k,rows.filter(r=>r.result===k).length])),failures,rows,scope:'Finite sampled legal states, including free walking before a shot when a barrel is next to a wall/ceiling; not an exhaustive proof over continuous position/aim space or a human playtest.'};
const target=process.env.ARCLINE_EVIDENCE_DIR;
if(target){fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'CAMPAIGN.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({...report,rows:undefined},null,2));if(failures.length)process.exitCode=1;
