'use strict';
// Follow real boss part contacts through resolution and collect the resulting
// capsule with a second shared-physics shot. This catches authored/world unit
// mistakes that initial-map tests cannot see.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/engine.js'),G=E.geometry;
let checks=0;const rows=[];
const check=(value,label)=>{assert(value,label);checks++;};
function partShot(s){
 let best=null;
 for(let angle=-8;angle<=84;angle+=4)for(let power=24;power<=100;power+=4){
  const shot=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});
  const part=Object.entries(shot.partDamage).reduce((sum,[i,n])=>sum+Math.min(n,s.units[1].parts[i]?.hp||0),0);
  if(part>0&&(!best||part>best.part))best={shot,part};
 }
 return best?.shot;
}
function pickupShot(s,id){
 for(let angle=-8;angle<=84;angle+=4)for(let power=20;power<=100;power+=4){
  const shot=E.trajectory(s,0,angle,power,{weaponId:'W01',skill:null});
  if(shot.events.some(event=>event.type==='pickup'&&event.id===id))return shot;
 }
 return null;
}
function checkPosition(s,p,label){
 check(Number.isFinite(p.x+p.y)&&p.x>=p.radius&&p.x<=1000-p.radius&&p.y>=p.radius&&p.y<=500-p.radius,label+': finite capsule within arena');
 check(!s.world.solids.some(solid=>G.inside(p,solid.poly)),label+': capsule is outside solid terrain');
}
for(let level=10;level<=100;level+=10){
 const s=E.campaign(level),skill=s.spec.bossSpec.reward,originalStock=s.skills[skill];
 let shots=0,last=null;
 while(!s.rewardGiven&&shots<4){
  const shot=partShot(s);check(!!shot,'L'+level+': actual part contact is reachable');
  s.phase='aim';s.turn=0;
  check(E.launch(s,shot.angle,shot.power,shot)===shot,'L'+level+': launch actual part shot');
  E.resolve(s,shot);last=shot;shots++;
 }
 check(s.rewardGiven&&s.effects.broken>0,'L'+level+': physical part break awards capsule');
 const rewards=s.pickups.filter(p=>p.id==='R-boss');
 check(rewards.length===1,'L'+level+': exactly one part-break reward');
 const capsule=rewards[0];checkPosition(s,capsule,'L'+level);
 check(capsule.x===650&&capsule.y===220,'L'+level+': boss reward uses authored65/28 coordinates');
 const snapshot=JSON.stringify(s.pickups);E.resolve(s,last);
 check(JSON.stringify(s.pickups)===snapshot,'L'+level+': repeat resolution cannot duplicate reward');
 s.phase='aim';s.turn=0;
 const collectShot=pickupShot(s,capsule.id);check(!!collectShot,'L'+level+': basic shot reaches capsule from current rover position');
 let acquired=0;
 E.launch(s,collectShot.angle,collectShot.power,collectShot);
 E.applyEvents(s,collectShot,Infinity,item=>{acquired++;check(item.id===capsule.id&&item.taken===1,'L'+level+': collection identifies one skill refill');});
 check(acquired===1&&capsule.collected&&s.skills[skill]===originalStock+1,'L'+level+': collection increases the matching stock once');
 E.applyEvents(s,collectShot,Infinity,()=>{acquired++;});
 check(acquired===1&&s.skills[skill]<=s.skillCaps[skill],'L'+level+': event replay cannot exceed skill cap');
 rows.push({level,partBreakShots:shots,reward:{x:capsule.x,y:capsule.y,skill},collection:{angle:collectShot.angle,power:collectShot.power,stock:s.skills[skill]}});
}
// Choosing a teleport while another input is held cannot turn it into a shot.
{
 const s=E.campaign(13),skillStock=s.skills.BLINK;
 check(skillStock>0&&E.selectSkill(s,'BLINK'),'BLINK can be selected');
 const before=JSON.stringify({skills:s.skills,phase:s.phase,shots:s.shotCount,ammo:s.ammo,position:s.units[0]});
 check(E.launch(s,40,70)===null,'selected BLINK does not launch an ordinary projectile');
 check(JSON.stringify({skills:s.skills,phase:s.phase,shots:s.shotCount,ammo:s.ammo,position:s.units[0]})===before,'rejected BLINK launch preserves stock, position and turn');
 const destination=s.blink.findIndex((p,index)=>{const copy=E.campaign(13);E.selectSkill(copy,'BLINK');return E.blink(copy,index);});
 check(destination>=0&&E.blink(s,destination),'BLINK still commits through a valid destination');
 check(s.skills.BLINK===skillStock-1&&s.shotCount===0&&s.skillUsed,'confirmed teleport spends one skill and no shot');
}
// The final boss's separate boundary rewards use authored55/23 and63/29.
{
 const s=E.campaign(100);s.pendingChanges.push({type:'phase',value:1});E.boundary(s);
 const first=s.pickups.find(p=>p.id==='R-phase-1');check(!!first&&first.skill==='BLINK','phase1 grants BLINK');checkPosition(s,first,'phase1');
 check(first.x===550&&first.y===270,'phase1 coordinates convert once');
 s.pendingChanges.push({type:'phase',value:2});E.boundary(s);
 const second=s.pickups.find(p=>p.id==='R-phase-2');check(!!second&&second.skill==='PHASE','phase2 grants PHASE');checkPosition(s,second,'phase2');
 check(second.x===630&&second.y===210,'phase2 coordinates convert once');
 const count=s.pickups.length;E.boundary(s);check(s.pickups.length===count,'a later boundary does not repeat phase rewards');
 const stock=s.skills.PHASE;s.skills.PHASE=s.skillCaps.PHASE;
 check(E.collect(s,null,{id:second.id})===null&&!second.collected,'a full skill stock leaves its capsule available');
 s.skills.PHASE=stock;check(E.collect(s,null,{id:second.id})?.taken===1&&second.collected,'a spare capacity accepts the remaining refill');
 check(E.collect(s,null,{id:second.id})===null,'collected capsule cannot be taken twice');
}
const report={status:'PASS',checks,bosses:rows,scope:'Actual shared-physics boss-part contacts, reward coordinate conversion and ballistic pickup paths on all ten authored bosses; final-phase spawn positions and capped/idempotent refill semantics. Not human campaign completion.'};
if(process.env.ARCLINE_EVIDENCE_DIR){fs.mkdirSync(process.env.ARCLINE_EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.ARCLINE_EVIDENCE_DIR,'REWARDS.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
