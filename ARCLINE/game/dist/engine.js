(function(root){
'use strict';
const node=typeof module!=='undefined';
const G=node?require('./geometry.js'):root.ArcGeometry,L=node?require('./levels.js'):root.ArcLevels,W=node?require('./weapons.js'):root.ArcWeapons,P=node?require('./physics.js'):root.ArcPhysics;
const clamp=G.clamp;
const biomes=[
{name:'Tidal Coast',sky:['#153d59','#a2d1c6'],land:'#3b797d',edge:'#d6e7b0'},
{name:'Canal Ruins',sky:['#283b52','#d3c49c'],land:'#717763',edge:'#ebdda9'},
{name:'Cloud Gardens',sky:['#364464','#d5d2eb'],land:'#747c9f',edge:'#e3e5fa'},
{name:'Crystal Railway',sky:['#282e55','#a0d7dc'],land:'#476f83',edge:'#b3ffeb'},
{name:'Amber Engines',sky:['#593d4a','#e5b880'],land:'#a07758',edge:'#ffdda1'},
{name:'Polar Station',sky:['#153b61','#c7dfed'],land:'#7197b4',edge:'#efffff'},
{name:'Forge Valley',sky:['#3f2844','#df9674'],land:'#825b64',edge:'#ffc18e'},
{name:'Magnetic Mine',sky:['#292a53','#9eafd7'],land:'#5c6187',edge:'#cdceff'},
{name:'Sky Ruins',sky:['#2d496a','#d0dcd2'],land:'#728e9a',edge:'#e4fbd8'},
{name:'Archeart Keep',sky:['#28203e','#b998b1'],land:'#706080',edge:'#f6c6dd'}];
function chargePower(seconds){const t=(Math.max(0,seconds)/.72)%2;return 20+80*(t<=1?t:2-t);}
function seeded(seed=1){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function campaign(stage=1,save={}){
 const spec=L[clamp(Math.floor(stage)||1,1,100)-1],world=G.world(spec);
 const units=spec.spawn.map(([x,h],side)=>{
  const raw=G.point(x,h),safe=G.safePosition(world,raw.x,raw.y);
  if(!safe)throw Error('No safe spawn at level '+spec.id+' side '+side);
  return {...safe,hp:side?(spec.boss?10:3):5,maxHp:side?(spec.boss?10:3):5,range:side?[Math.max(320,raw.x-110),965]:[35,Math.min(650,spec.spawn[1][0]*10-110)],exposed:0,parts:[]};
 });
 if(spec.boss){
  units[1].slope=0;
  units[1].parts=spec.bossSpec.parts.map((p,i)=>({...p,maxHp:p.hp,dx:i===0?-58:i===1?45:0,dy:i===0?-22:i===1?-62:-86,radius:24}));
  if([30,90].includes(spec.id)){units[1].y=500-spec.spawn[1][1]*10;units[1].floating=true;}
 }
 const skills={...spec.skills},skillCaps=Object.fromEntries(Object.entries(skills).map(([k,v])=>[k,v+1]));
 const collected=[...(save.unlockedWeaponIds||['W01']),...(save.collectedCosmeticIds||[])];
 const pickups=spec.pickups.filter(p=>!collected.includes(p.id)).map(p=>({...p,...G.point(p.x,p.h),radius:22,collected:false,skill:p.id[0]==='R'?(spec.id===67?'PHASE':spec.id===87?'BOUNCE':'BLINK'):null}));
 const s={spec,world,stage:spec.id,map:spec.id-1,bossPhase:0,round:1,turn:0,phase:'aim',units,skills,skillCaps,pickups,selectedSkill:null,skillUsed:false,shotCount:0,shotLimit:spec.boss?18:10,angle:48,power:20,result:null,reason:null,ammo:2,weaponId:save.equippedWeaponId||'W01',mode:'W01',trial:null,last:[null,null],effects:{broken:0,polarity:0},pendingChanges:[],boundaryLog:[],rewardGiven:false,telegraph:null,random:seeded(spec.id*997),preview:null};
 s.blink=spec.blink.map(([x,h])=>G.safePosition(world,x*10,500-h*10,units[1],units[0].range)).filter(Boolean);
 bossGeometry(s);telegraph(s);return s;
}
function telegraph(s){
 if(!s.spec.boss){s.telegraph=null;return;}
 const attacks=s.spec.bossSpec.attacks,kind=attacks[(s.round-1)%attacks.length];
 const targetX=s.units[0].x;
 s.telegraph={kind,targetX,radius:kind==='DROP'||kind==='MARK'||kind==='PREPARE'?55:35,next:attacks[s.round%attacks.length],frozen:true};
}
function selectSkill(s,id){if(s.phase!=='aim'||s.skillUsed||!s.skills[id])return false;s.selectedSkill=s.selectedSkill===id?null:id;return true;}
function blink(s,index){
 if(s.phase!=='aim'||s.skillUsed||!s.skills.BLINK||s.selectedSkill!=='BLINK')return false;
 const b=s.blink[index];if(!b)return false;const dest=G.safePosition(s.world,b.x,b.y,s.units[1],s.units[0].range);if(!dest)return false;
 Object.assign(s.units[0],dest);s.skills.BLINK--;s.skillUsed=true;s.selectedSkill=null;return true;
}
function trajectory(s,side,angle,power,opts={}){return P.simulate(s,side,angle,power,{weaponId:side?'W01':s.mode,skill:side?null:s.selectedSkill,...opts});}
function collect(s,shot,event){
 const item=s.pickups.find(c=>c.id===event.id);if(!item||item.collected)return null;
 if(item.id[0]==='R'){
  if(!item.skill||!(item.skill in s.skills)||s.skills[item.skill]>=s.skillCaps[item.skill])return null;
  const taken=Math.min(item.amount||1,s.skillCaps[item.skill]-s.skills[item.skill]);s.skills[item.skill]+=taken;item.amount=(item.amount||1)-taken;item.collected=item.amount===0;return {...item,taken};
 }else item.collected=true;
 return item;
}
function applyEvents(s,shot,time,onCollect=()=>{}){
 while(shot.appliedEvents<shot.events.length&&shot.events[shot.appliedEvents].t<=time){
  const e=shot.events[shot.appliedEvents++];
  if(e.type==='pickup'){const c=collect(s,shot,e);if(c)onCollect(c);}
  if(e.type==='terminal')s.effects.pendingPolarity=-(s.effects.polarity||s.world.regions.find(r=>r.kind==='M')?.direction||1);
 }
}
function launch(s,angle=s.angle,power=s.power,plan=null){
 if(s.result||!['aim','cpu','cpuMove'].includes(s.phase))return null;
 const side=s.turn;if(!side){
  if(s.shotCount>=s.shotLimit)return null;
  if(s.mode!=='W01'&&!(s.trial?.id===s.mode&&s.trial.ammo>0)&&!(s.mode===s.weaponId&&s.ammo>0))return null;
 }
 const shot=plan||trajectory(s,side,angle,power);
 if(!side){s.shotCount++;if(s.mode!=='W01'){if(s.trial?.id===s.mode&&s.trial.ammo>0)s.trial.ammo--;else s.ammo--;}
  if(s.selectedSkill){s.skills[s.selectedSkill]--;s.skillUsed=true;}
 }
 s.phase='flight';s.activeShot=shot;return shot;
}
function addReward(s,skill,x=650,h=28,id='R-boss'){
 if(!(skill in s.skills))return;
 const old=s.pickups.find(p=>p.id[0]==='R'&&p.skill===skill&&!p.collected);if(old){old.amount=(old.amount||1)+1;return;}
 if(s.pickups.filter(p=>!p.collected).length>=3)return;
 s.pickups.push({id,skill,amount:1,name:skill,...G.point(x,h),radius:22,collected:false});
}
function displace(s,side,shot){
 const w=W.get(shot.weaponId),u=s.units[1-side],hit=shot.impacts.find(x=>x.hit?.unit===1-side);
 if(!shot.damage[1-side]||!(w.push||w.pull||w.lift||['PUSH','PULL','SWAP'].includes(shot.skill)))return;
 if(s.spec.boss&&side===0){u.exposed=2;u.facingCore=s.units[0].x<u.x?-1:1;return;}
 if(shot.skill==='SWAP'&&hit&&shot.bullets.find(b=>b.id===hit.bullet)?.primary){
  const a=s.units[0],b=s.units[1],pa={x:a.x,y:a.y,slope:a.slope,surface:a.surface,range:a.range},pb={x:b.x,y:b.y,slope:b.slope,surface:b.surface,range:b.range};Object.assign(a,pb);Object.assign(b,pa);a.animation={from:pa,age:0,duration:.6,lift:0};b.animation={from:pb,age:0,duration:.6,lift:0};a.displaced=1;b.displaced=1;
 }else{
  const before={x:u.x,y:u.y},from=shot.end,sign=Math.sign(u.x-from.x)||1,dx=(w.pull||shot.skill==='PULL'?-sign:sign)*(w.lift?48:72),old=u.x;
  G.move(s,1-side,dx);u.animation={from:before,age:0,duration:.6,lift:w.lift?60:0};u.displaced=1;u.previousX=old;
 }
}
function resolve(s,shot,onCollect=()=>{}){
 if(shot.resolved)return [0,0];applyEvents(s,shot,Infinity,onCollect);shot.resolved=true;
 s.units.forEach((u,i)=>u.hp=Math.max(0,u.hp-shot.damage[i]));
 const boss=s.units[1];
 if(s.spec.boss&&shot.side===0){
  for(const [i,damage] of Object.entries(shot.partDamage)){const p=boss.parts[i];if(p)p.hp=Math.max(0,p.hp-damage);}
  const broken=boss.parts.filter(p=>p.hp<=0).length;
  if(broken>s.effects.broken){
   s.effects.broken=broken;
   if(!s.rewardGiven){s.rewardGiven=true;addReward(s,s.spec.bossSpec.reward);}
   s.pendingChanges.push({type:'parts',broken});
  }
  if(s.stage===100){const target=boss.hp<=4?2:boss.hp<=7?1:0;if(target>s.bossPhase)s.pendingChanges.push({type:'phase',value:target});}
  if(s.stage===90&&boss.hp<=5&&!s.effects.stageTwo){s.effects.stageTwo=true;s.pendingChanges.push({type:'altitude'},{type:'cloud'});}
 }
 displace(s,shot.side,shot);
 if(boss.exposed>0&&shot.side===0)boss.exposed--;
 s.last[shot.side]=shot;s.selectedSkill=null;s.activeShot=null;
 if(s.mode!=='W01'&&!(s.trial?.id===s.mode&&s.trial.ammo>0)&&!(s.mode===s.weaponId&&s.ammo>0))s.mode='W01';
 check(s);return shot.damage;
}
function check(s){
 const [p,e]=s.units;
 if(p.hp<=0||e.hp<=0){s.result=p.hp<=0?(e.hp<=0?'draw':'lose'):'win';s.reason=s.result==='lose'?'durability':s.result==='draw'?'mutual':'defeated';}
 else if(s.turn===0&&s.shotCount>=s.shotLimit){s.result='lose';s.reason='shots';}
 if(s.result){s.phase='over';return true;}return false;
}
function bossGeometry(s){
 if(s.stage===40){
  const u=s.units[1];u.parts.forEach((p,i)=>{if(p.hp<=0)return;const x=u.x+p.dx,y=u.y-64,d=i===0?-1:1;s.world.solids.push({id:'shoulder'+i,kind:'crystal',poly:[{x:x-17,y:y-12*d},{x:x+17,y:y+12*d},{x:x+17,y:y+12*d+5},{x:x-17,y:y-12*d+5}]});});
 }
 if(s.stage===60&&s.effects.broken===0){const u=s.units[1];s.world.solids.push(G.rectangle('front-armor',(u.x-92)/10,(u.x-62)/10,(500-u.y+3)/10,(500-u.y+58)/10));}
}
function rebuildWorld(s){
 const oldWorld=s.world;
 s.world=G.world(s.spec,s.effects.environmentRound||s.round,s.bossPhase,s.effects);
 s.units.forEach((u,side)=>{if(u.floating)return;
 const bridge=oldWorld?.solids.find(o=>o.kind==='bridge'&&!o.open&&u.surface===o.id&&s.world.solids.find(n=>n.id===o.id)?.open);
 if(bridge){const choices=[bridge.hinge.x-36,bridge.poly[1].x+36].sort((a,b)=>Math.abs(a-u.x)-Math.abs(b-u.x));for(const x of choices){if(x<u.range[0]||x>u.range[1])continue;const pad=G.safePosition(s.world,x,bridge.hinge.y,s.units[1-side],u.range);if(pad){Object.assign(u,pad);break;}}}
 const p=G.safePosition(s.world,u.x,u.y,s.units[1-side],u.range);if(p)Object.assign(u,p);else{
  const [x,h]=s.spec.spawn[side],fallback=G.safePosition(s.world,x*10,500-h*10,s.units[1-side],u.range);if(!fallback)throw Error('Unsafe boundary '+s.stage);Object.assign(u,fallback);
 }});
 s.blink=s.spec.blink.map(([x,h])=>G.safePosition(s.world,x*10,500-h*10,s.units[1],s.units[0].range)).filter(Boolean);
 if(s.spec.boss)s.units[1].slope=0;
 bossGeometry(s);
}
function boundary(s){
 s.round++;
 // Each queued major change gets a separate visual transition; Lv90 defers cloud to next boundary.
 let changes=[];
 if(s.stage===90&&s.pendingChanges.length){changes=[s.pendingChanges.shift()];s.effects.deferEnvironment=true;s.effects.environmentRound=s.effects.environmentRound||s.round-1;}
 else{changes=s.pendingChanges.splice(0);s.effects.deferEnvironment=false;s.effects.environmentRound=s.round;}
 for(const c of changes){
  if(c.type==='phase'){
   const old=s.bossPhase;s.bossPhase=c.value;
   for(let phase=old+1;phase<=c.value;phase++)addReward(s,phase===1?'BLINK':'PHASE',phase===1?55:63,phase===1?23:29,'R-phase-'+phase);
   if(s.bossPhase===1)s.units[1].parts=[{name:'LEFT SHELL',hp:2,maxHp:2,dx:-58,dy:-22,radius:24},{name:'RIGHT SHELL',hp:2,maxHp:2,dx:45,dy:-62,radius:24}];
   if(s.bossPhase===2)s.units[1].parts=[];
  }
  if(c.type==='altitude')s.units[1].y+=20;
  if(c.type==='parts'&&s.stage===30){s.units[1].y+=20;s.effects.cloudPending=true;}
  if(c.type==='cloud')s.effects.thinCloud=true;
 }
 // Floating boss motion never changes on the same boundary as cloud motion / part geometry.
 if(!changes.length&&s.spec.boss){const u=s.units[1];
  if(s.stage===10&&s.round===2&&s.effects.broken===0)u.x+=30;
  if(s.stage===30&&s.effects.cloudPending){s.effects.cloudOffset=s.effects.cloudOffset?0:80;s.effects.cloudPending=false;}
  else if(s.stage===30&&s.effects.broken<2&&s.round%2===0){u.x+=s.round%4===0?-30:30;u.y+=s.round%4===0?-15:15;}
  if(s.stage===50&&s.round%2===1){const high=s.round%4===3;u.x=high?850:790;u.y=high?280:420;u.floating=true;}
  if(s.stage===90&&s.effects.broken<3&&s.round%2===1)u.x=s.round%4===1?790:830;
 }
 s.boundaryLog.push({round:s.round,changes:changes.map(c=>c.type)});
 rebuildWorld(s);telegraph(s);return changes;
}
function next(s){
 if(check(s))return;
 if(s.turn===0){s.turn=1;s.phase='cpu';s.time=.6;}
 else{s.turn=0;boundary(s);s.skillUsed=false;s.selectedSkill=null;s.last=[null,null];s.phase='transition';s.time=.6;}
}
function move(s,side,amount){if(s.result||side!==s.turn||!['aim','cpu','cpuMove'].includes(s.phase))return 0;return G.move(s,side,amount);}
const solveCache=new Map();
function solve(s,side,opts={}){
 const weaponId=opts.weaponId||'W01',skill=opts.skill||null;
 const key=JSON.stringify([s.stage,s.round,s.bossPhase,s.units.map(u=>[Math.round(u.x),Math.round(u.y),u.parts.map(p=>p.hp>0),u.exposed]),s.effects,side,weaponId,skill]);
 if(solveCache.has(key))return solveCache.get(key);
 let best={score:-Infinity,angle:48,power:70};
 const score=shot=>shot.damage[1-side]-shot.damage[side]*2- Math.min(2000,Math.hypot(shot.end.x-s.units[1-side].x,shot.end.y-s.units[1-side].y))*.00001;
 for(let a=-8;a<=84;a+=6)for(let power=20;power<=100;power+=5){const shot=trajectory(s,side,a,power,{weaponId,skill}),v=score(shot);if(v>best.score)best={angle:a,power,score:v};}
 const coarse={...best};for(let a=Math.max(-12,coarse.angle-5);a<=Math.min(85,coarse.angle+5);a+=2)for(let power=Math.max(20,coarse.power-5);power<=Math.min(100,coarse.power+5);power+=2){const shot=trajectory(s,side,a,power,{weaponId,skill}),v=score(shot);if(v>best.score)best={angle:a,power,score:v};}
 if(solveCache.size>512)solveCache.clear();solveCache.set(key,best);return best;
}
function cpuPlan(s,random=s.random){
 const profile=s.spec.enemyProfile,errA=[5,4.5,4,3,2.5,2][profile],errP=[8,7,6,5,4,3.5][profile],best=solve(s,1),u=s.units[1];
 let angle=best.angle+(random()*2-1)*errA,power=best.power+(random()*2-1)*errP;
 if(s.stage<=3)power-=8;
 let plan=trajectory(s,1,angle,clamp(power,20,100));
 const kind=s.telegraph?.kind;
 if(s.spec.boss&&['DROP','MARK','TWIN','TRIPLE','PREPARE'].includes(kind)){
  const targetX=s.telegraph.targetX,cent={x:targetX,y:s.units[0].y-22};
  const count=kind==='TRIPLE'?3:kind==='TWIN'?2:1,damage=s.effects.broken? .5:1;
  const bullets=[],events=[],impacts=[];let hit=false;
  for(let i=0;i<count;i++){
   const x=targetX+(i-(count-1)/2)*24,start=i*.16,end=1+start;
   const path=Array.from({length:91},(_,j)=>({x,y:cent.y-280+280*j/90,t:start+j/90}));
   bullets.push({id:i,path,start,t:end,budget:1/count,primary:i===0,bounces:0});impacts.push({x,y:cent.y,t:end});events.push({type:'impact',x,y:cent.y,t:end,bullet:i});
   if(Math.abs(s.units[0].x-x)<s.telegraph.radius)hit=true;
  }
  plan={...plan,bullets,events,impacts,damage:[hit?damage:0,0],partDamage:{},duration:Math.max(...bullets.map(b=>b.t)),appliedEvents:0,resolved:false,end:impacts.at(-1),side:1,angle,power};
 }
 return plan;
}
function enemyMoveTarget(s){
 const u=s.units[1],profile=s.spec.enemyProfile;if(s.spec.boss||profile===0||u.floating)return u.x;
 if(u.displaced){u.displaced--;return u.x;}
 if(profile===1&&s.round!==2||profile===2&&s.round%2===1)return u.x;
 const distance=[0,30,60,60,90,90][profile],sign=s.last[0]?.end.x<u.x?1:-1;
 const original={...u};let target=u.x;
 // Candidate movement must retain a shared-physics attack route; no current charge input is read.
 for(const dx of [distance*sign,-distance*sign]){G.move(s,1,dx);if(solve(s,1).score>.1){target=u.x;Object.assign(u,original);break;}Object.assign(u,original);}
 return target;
}
const api={campaign,create:()=>campaign(1),chargePower,seeded,biomes,clamp,trajectory,launch,resolve,applyEvents,collect,check,next,move,solve,cpu:cpuPlan,cpuPlan,enemyMoveTarget,selectSkill,blink,rebuildWorld,boundary,telegraph,geometry:G,weapons:W.weapons,skills:W.skills,levels:L};
if(node)module.exports=api;else root.ArcEngine=api;
})(globalThis);
