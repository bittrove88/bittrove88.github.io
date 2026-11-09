'use strict';
const fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),P=require('../dist/physics.js'),{copy,state}=require('./probe_boss_ballistics.cjs');
const pose=u=>({x:u.x,y:u.y,slope:u.slope||0});
function aim(s){s.turn=0;s.phase='aim';s.walkUsed=0;return s;}
function teleportOptions(s){
 const t=aim(copy(s));if(!E.selectTeleport(t))return [];
 const rows=[];for(const angle of [-10,0,10,30,50,60,70,85])for(let power=20;power<=100;power+=10){
  const p=E.trajectory(t,0,angle,power),pad=E.geometry.teleportLanding(t.world,p.teleportContact,t.units[1],t.units[0].range);
  rows.push({angle,power,pad});
 }return rows;
}
function fixtures(stage){
 const base=state(stage).s,cases=[],referencePose=pose(base.units[0]);
 function add(label,s,details={},reference=referencePose){if(!s.result&&!details.skipped){s.turn=1;s.phase='cpu';}cases.push({stage,label,s,reference,details});}
 add('stay',copy(base));
 for(const command of [-10000,-90,-40,40,90,10000]){const s=aim(copy(base)),walked=E.move(s,0,command);add('walk:'+command,s,{walked});}
 {const s=aim(copy(base)),first=E.move(s,0,10000),second=E.move(s,0,-10000);add('walk-budget',s,{first,second,used:s.walkUsed,remaining:E.movementRemaining(s)});}
 for(const dir of [-1,1]){const s=aim(copy(base));s.skills.S_FREE_MOVE=1;E.useSkill(s,'S_FREE_MOVE');const walked=E.move(s,0,dir*10000);add('free-walk:'+dir,s,{walked});}
 {const s=aim(copy(base)),changed=E.changeCharacter(s,'rico',E.combat.profiles.map(p=>p.id)),walked=E.move(s,0,10000);add('character-and-walk',s,{changed,walked});}
 for(const id of ['S_LOW_GRAVITY','S_HIGH_GRAVITY','S_BARRIER','S_ENEMY_WEAKEN','S_INVINCIBLE']){const s=aim(copy(base));s.skills[id]=1;const used=!!E.useSkill(s,id),walked=E.move(s,0,10000);add(id+':walk',s,{used,walked});}
 {const s=aim(copy(base));s.skills.S_GUARD=1;const walked=E.move(s,0,-10000);E.selectSkill(s,'S_GUARD');const shot=E.launch(s,85,20);E.resolve(s,shot);E.next(s);add('guard-and-walk',s,{walked});}
 {const s=aim(copy(base));s.weaponStock.W02=1;E.selectWeapon(s,'W02');const a=E.solve(s,0,{weaponId:'W02'}),shot=E.launch(s,a.angle,a.power);E.resolve(s,shot);E.next(s);add('break-cover',s,{destroyed:shot.destroyed,parts:shot.partDamage});}
 {const s=aim(copy(base));s.units[1].parts[0].hp=.25;s.skills.S_ALL_ATTACK=1;E.useSkill(s,'S_ALL_ATTACK');E.next(s);add('break-part',s,{broken:s.effects.broken});}
 {const s=aim(copy(base));s.skills.S_ENEMY_SKIP=1;E.useSkill(s,'S_ENEMY_SKIP');const p=E.launch(s,85,20);E.resolve(s,p);E.next(s);add('skip-enemy-turn',s,{skipped:true});}
 {const s=aim(copy(base));s.units[1].hp=.05;s.units[1].parts.forEach(p=>p.hp=0);s.effects.broken=s.units[1].parts.length;s.skills.S_ALL_ATTACK=1;E.useSkill(s,'S_ALL_ATTACK');E.next(s);add('boss-defeated-before-counter',s);}
 {const s=aim(copy(base));s.units[0].hp=.05;s.weaponStock.W02=1;E.selectWeapon(s,'W02');let chosen;for(const angle of [-8,0,85]){const p=E.trajectory(s,0,angle,20);if(p.damage[0]>0)chosen={angle,p};}if(chosen){E.launch(s,chosen.angle,20,chosen.p);E.resolve(s,chosen.p);E.next(s);add('self-defeated-before-counter',s);}}
 for(const hp of [.05,.25]){const s=copy(base);s.units[0].hp=hp;add('low-hp:'+hp,s);}
 const options=teleportOptions(base),valid=options.filter(p=>p.pad),selected=[];
 const select=(label,option)=>{if(option&&!selected.some(p=>p.angle===option.angle&&p.power===option.power))selected.push({...option,label});};
 select('teleport-far',[...valid].sort((a,b)=>Math.abs(b.pad.x-referencePose.x)-Math.abs(a.pad.x-referencePose.x))[0]);
 select('teleport-high',[...valid].sort((a,b)=>a.pad.y-b.pad.y)[0]);
 select('teleport-steep',[...valid].sort((a,b)=>Math.abs(b.pad.slope)-Math.abs(a.pad.slope))[0]);
 select('teleport-cross',valid.find(p=>(p.pad.x-base.units[1].x)*(referencePose.x-base.units[1].x)<0));
 select('teleport-failed',options.find(p=>!p.pad));
 for(const option of selected){
  const s=aim(copy(base));E.selectTeleport(s);const shot=E.launch(s,option.angle,option.power);E.resolve(s,shot);E.next(s);
  add(option.label,s,{angle:option.angle,power:option.power,success:shot.teleportSuccess,crossed:(s.units[0].x-s.units[1].x)*(referencePose.x-base.units[1].x)<0,landed:pose(s.units[0])});
 }
 // A safe pad reached by an actual teleport trajectory can be the starting
 // pose of a later warning. Break that support with a real Heavy Shell.
 const fragile=valid.find(option=>base.world.solids.some(o=>o.destructible&&(option.pad.surface===o.id||option.pad.surface?.startsWith(o.id+':e'))));
 if(fragile){
  const s=aim(copy(base));Object.assign(s.units[0],fragile.pad);E.telegraph(s);const frozen=pose(s.units[0]),support=s.units[0].surface;s.weaponStock.W02=1;E.selectWeapon(s,'W02');let chosen;
  for(const angle of [-12,-4,0,30,85])for(const power of [20,40]){const shot=E.trajectory(s,0,angle,power);if(shot.destroyed.some(id=>support===id||support.startsWith(id+':e')))chosen={angle,power,shot};}
  if(chosen){E.launch(s,chosen.angle,chosen.power,chosen.shot);E.resolve(s,chosen.shot);E.next(s);add('support-destroyed',s,{start:frozen,end:pose(s.units[0]),support,destroyed:chosen.shot.destroyed},frozen);}
 }
 if(selected.length){const s=aim(copy(base)),walked=E.move(s,0,90);E.selectTeleport(s);const option=selected[0],shot=E.launch(s,option.angle,option.power);E.resolve(s,shot);E.next(s);add('walk-then-teleport',s,{walked,success:shot.teleportSuccess});}
 for(const round of [6,9]){const s=copy(base);while(s.round<round)E.boundary(s);const frozen=pose(s.units[0]);aim(s);const walked=E.move(s,0,10000);add('round:'+round,s,{walked},frozen);}
 return cases;
}
const signature=p=>[p.angle,p.power,p.facing,p.bullets.filter(b=>b.primary&&!b.effect).map(b=>b.path[0])];
function audit(c,seeds=[0,1,7,19,47,113]){
 const rows=[],failures=[],diagnostics=[];
 if(c.details.skipped){if(c.s.turn!==0||c.s.round!==4||c.s.telegraph?.technique||c.s.skillEffects.skip)failures.push('skip-keeps-old-technique');return {stage:c.stage,label:c.label,details:c.details,rows,failures,diagnostics};}
 for(const seed of seeds){
  const s=copy(c.s);if(s.result){if(E.launch(s,0,20)!==null)failures.push('attack-after-result');continue;}
  const original=copy(s);Object.assign(original.units[0],c.reference);
  const random=()=>seed===0?()=>.5:E.seeded(Math.imul(seed,2654435761)>>>0);
  const expected=E.cpuPlan(original,random()),p=E.cpuPlan(s,random());
  if(JSON.stringify(signature(expected))!==JSON.stringify(signature(p)))failures.push('retarget:'+seed);
  if(Math.abs(p.events.filter(e=>e.type==='damage'&&e.unit===0).reduce((n,e)=>n+e.value,0)-p.damage[0])>1e-7)failures.push('damage-events:'+seed);
  if(p.damage[0]>s.units[0].hp+1e-7)failures.push('overkill-label:'+seed);
  if(!Number.isFinite(p.duration)||p.duration>=12||p.bullets.some(b=>b.path.some(q=>!Number.isFinite(q.x+q.y+q.t))))failures.push('invalid-flight:'+seed);
  const timelines=[];
  for(const fps of [30,120]){
   const t=copy(s),shot=copy(p),hp=t.units[0].hp;if(!E.launch(t,p.angle,p.power,shot)){failures.push('cannot-launch:'+seed);continue;}
   const illegalMove=E.move(t,0,1000);if(illegalMove!==0)failures.push('player-moves-during-flight:'+seed);
   for(let time=0;time<=shot.duration+1/fps;time+=1/fps)E.applyEvents(t,shot,time);E.resolve(t,shot);
   if(Math.abs(hp-t.units[0].hp-shot.damage[0])>1e-7)failures.push('hp:'+seed+'/'+fps);
   const settled=JSON.stringify(t);E.resolve(t,shot);if(JSON.stringify(t)!==settled)failures.push('double-resolve:'+seed);
   E.next(t);if(!t.result&&(t.turn!==0||t.round!==s.round+1))failures.push('next-turn:'+seed);
   if(t.units.some(u=>!Number.isFinite(u.x+u.y+u.slope+u.hp)))failures.push('invalid-landing:'+seed);
   if(!t.result&&!E.geometry.clearBody(t.world,t.units[0]))failures.push('body-inside-terrain:'+seed);
   timelines.push(t.units.map(u=>[u.hp,u.x,u.y,u.slope,u.parts.map(p=>p.hp)]));
  }
  if(JSON.stringify(timelines[0])!==JSON.stringify(timelines[1]))failures.push('fps:'+seed);
  if(c.stage===80&&p.damage[0]>0){const center=P.bodyCenter(s,0),credited=new Set(p.events.filter(e=>e.type==='damage'&&e.unit===0&&e.value>0).map(e=>e.bullet));for(const h of p.impacts)if(Math.hypot(h.x-center.x,h.y-center.y)<85&&!credited.has(h.bullet)&&h.hit?.unit!==0)diagnostics.push({kind:'uncredited-polarity-impact',seed,impact:{x:h.x,y:h.y,bullet:h.bullet,solid:h.contact?.solidId},blocked:!E.geometry.lineClear(s.world,{x:h.x,y:h.y-2},center)});}
  rows.push({seed,damage:E.combat.points(p.damage[0]),pose:pose(s.units[0]),facing:p.facing});
 }
 return {stage:c.stage,label:c.label,details:c.details,rows,failures:[...new Set(failures)],diagnostics};
}
if(require.main===module){
 const stages=process.argv.slice(2).map(Number);if(!stages.length)throw Error('Select stages10..90');const report={scope:'Native nine-boss movement/teleport/action matrix; six deterministic aim seeds;30/120fps HP and next-turn checks. Not a proof over all continuous positions.',rows:[]};
 for(const stage of stages){const cases=fixtures(stage);for(const c of cases)report.rows.push(audit(c));console.log(JSON.stringify({stage,cases:cases.length,failures:report.rows.filter(r=>r.stage===stage&&r.failures.length).map(r=>({label:r.label,failures:r.failures})),diagnostics:report.rows.filter(r=>r.stage===stage).flatMap(r=>r.diagnostics)}));if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'MOVEMENT.json'),JSON.stringify(report,null,2)+'\n');}}
 if(report.rows.some(r=>r.failures.length))process.exitCode=1;
}
module.exports={fixtures,audit,copy,pose,signature};
