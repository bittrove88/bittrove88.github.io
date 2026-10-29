(function(root){
'use strict';
const node=typeof module!=='undefined';
const G=node?require('./geometry.js'):root.ArcGeometry,L=node?require('./levels.js'):root.ArcLevels,W=node?require('./weapons.js'):root.ArcWeapons,P=node?require('./physics.js'):root.ArcPhysics;
const clamp=G.clamp;
const biomes=[
{name:'First Shore',sky:['#153d59','#a2d1c6'],land:'#3b797d',edge:'#d6e7b0',material:'sand',accent:'#f4dfac'},
{name:'Mirror Flats',sky:['#234454','#bbd5ce'],land:'#527f83',edge:'#c3fff1',material:'mirror',accent:'#9affdf'},
{name:'Canal Gates',sky:['#283b52','#d3c49c'],land:'#717763',edge:'#ebdda9',material:'stone',accent:'#eac38f'},
{name:'Sunken Ruins',sky:['#243f4c','#9eb9ac'],land:'#55776c',edge:'#c3d8ad',material:'masonry',accent:'#b9e4b9'},
{name:'Mist Gardens',sky:['#364464','#d5d2eb'],land:'#747c9f',edge:'#e3e5fa',material:'garden',accent:'#e0c5f4'},
{name:'Cloud Terraces',sky:['#42547d','#d3e0ee'],land:'#7c91ab',edge:'#f1f0dc',material:'terrace',accent:'#c9f2f2'},
{name:'Crystal Road',sky:['#282e55','#a0d7dc'],land:'#476f83',edge:'#b3ffeb',material:'crystal',accent:'#a4ffea'},
{name:'Prism Station',sky:['#403251','#c8b5dd'],land:'#736785',edge:'#e8d3ff',material:'rail',accent:'#d6adff'},
{name:'Rising Cavern',sky:['#514049','#d6ab82'],land:'#8b6c55',edge:'#f1d59c',material:'cavern',accent:'#f5d99f'},
{name:'Amber Engines',sky:['#593d4a','#e5b880'],land:'#a07758',edge:'#ffdda1',material:'engine',accent:'#ffc485'},
{name:'Wind Observatory',sky:['#153b61','#c7dfed'],land:'#7197b4',edge:'#efffff',material:'ice',accent:'#b4eaff'},
{name:'Frozen Causeway',sky:['#263c60','#b4d3df'],land:'#587e9b',edge:'#dbffff',material:'frost',accent:'#a8ffee'},
{name:'Volcanic Rim',sky:['#3f2844','#df9674'],land:'#825b64',edge:'#ffc18e',material:'basalt',accent:'#ffb173'},
{name:'Forge Pass',sky:['#492f3b','#d88f6e'],land:'#76545c',edge:'#ffe0a5',material:'forge',accent:'#ffce7e'},
{name:'Magnetic Mine',sky:['#292a53','#9eafd7'],land:'#5c6187',edge:'#cdceff',material:'ore',accent:'#c5b6ff'},
{name:'Polarity Lab',sky:['#263849','#a5cad0'],land:'#53767f',edge:'#d8fff2',material:'lab',accent:'#b9ffe6'},
{name:'Sky Garden',sky:['#2d496a','#d0dcd2'],land:'#728e9a',edge:'#e4fbd8',material:'island',accent:'#defac3'},
{name:'Storm Carrier',sky:['#293e5c','#99b3bf'],land:'#536f84',edge:'#d8eced',material:'deck',accent:'#b5d8f4'},
{name:'Fortress Gates',sky:['#28203e','#b998b1'],land:'#706080',edge:'#f6c6dd',material:'fortress',accent:'#f4b9d2'},
{name:'Dawn Keep',sky:['#433044','#e7beaa'],land:'#826d81',edge:'#ffebbe',material:'keep',accent:'#ffe3a1'}];
const chargeDuration=1.6;
function chargePower(seconds){const t=(Math.max(0,seconds)/chargeDuration)%2;return 20+80*(t<=1?t:2-t);}
function seeded(seed=1){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296;};}
function campaign(stage=1,save={}){
 const spec=L[clamp(Math.floor(stage)||1,1,100)-1],world=G.world(spec);
 const units=spec.spawn.map(([x,h],side)=>{
  const raw=G.point(x,h),safe=G.safePosition(world,raw.x,raw.y);
  if(!safe)throw Error('No safe spawn at level '+spec.id+' side '+side);
  return {...safe,hp:side?(spec.boss?10:3):5,maxHp:side?(spec.boss?10:3):5,range:spec.contentRevision==='4.1'?[35,965]:side?[Math.max(320,raw.x-110),965]:[35,Math.min(650,spec.spawn[1][0]*10-110)],exposed:0,parts:[]};
 });
 if(spec.boss){
  units[1].slope=0;
  units[1].parts=spec.bossSpec.parts.map((p,i)=>({...p,maxHp:p.hp,dx:i===0?-58:i===1?45:0,dy:i===0?-22:i===1?-62:-86,radius:24}));
  if([30,90].includes(spec.id)){units[1].y=500-spec.spawn[1][1]*10;units[1].floating=true;}
 }
 const skills={...spec.skills},skillCaps=Object.fromEntries(Object.entries(skills).map(([k,v])=>[k,v+1]));
 const collected=[...(save.unlockedWeaponIds||['W01']),...(save.collectedCosmeticIds||[])];
 const pickups=spec.pickups.filter(p=>!collected.includes(p.id)).map(p=>({...p,...G.point(p.x,p.h),radius:22,collected:false,skill:p.id[0]==='R'?(p.skill||(spec.id===67?'PHASE':spec.id===87?'BOUNCE':'BLINK')):null}));
 const requested=save.equippedWeaponId||'W01',equipped=W.weapons.some(w=>w.id===requested)&&(!Array.isArray(save.unlockedWeaponIds)||save.unlockedWeaponIds.includes(requested))?requested:'W01';
 const s={spec,world,stage:spec.id,map:spec.id-1,bossPhase:0,round:1,turn:0,phase:'aim',units,skills,skillCaps,pickups:pickups.filter(p=>p.kind!=='ammo'||equipped!=='W01'),selectedSkill:null,skillUsed:false,shotCount:0,shotLimit:spec.actionLimit||(spec.boss?18:10),angle:Math.max(48,W.get(equipped).minAngle||-12),power:20,result:null,reason:null,ammo:2,weaponId:equipped,mode:equipped,trial:null,last:[null,null],effects:{broken:0,polarity:0,destroyed:[]},pendingChanges:[],boundaryLog:[],rewardGiven:false,telegraph:null,matchSeed:Number.isInteger(save.matchSeed)?save.matchSeed:Math.floor(Math.random()*4294967296),random:null,teleportMode:false,preview:null};
 s.random=seeded(s.matchSeed);
 s.blink=spec.blink.map(([x,h])=>G.safePosition(world,x*10,500-h*10,units[1],units[0].range)).filter(Boolean);
 bossGeometry(s);telegraph(s);return s;
}
function telegraph(s){
 if(!s.spec.boss){s.telegraph=null;return;}
 const attacks=s.spec.bossSpec.attacks,kind=attacks[(s.round-1)%attacks.length];
 const targetX=s.units[0].x;
 const columns=kind==='MARK'?[-64,0,64]:kind==='TRIPLE'?[-42,0,42]:kind==='TWIN'?[-28,28]:[0];
 s.telegraph={kind,targetX,targetY:s.units[0].y-22,radius:kind==='MARK'?145:kind==='PREPARE'?120:kind==='DROP'?85:35,columns,windup:kind==='PREPARE'?.8:kind==='MARK'?.25:0,next:attacks[s.round%attacks.length],frozen:true};
}
function availableWeapons(s){
 const options=[{id:'W01',ammo:Infinity,trial:false}];
 if(s.weaponId!=='W01'&&W.weapons.some(w=>w.id===s.weaponId)&&s.ammo>0)options.push({id:s.weaponId,ammo:s.ammo,trial:false});
 if(s.trial?.ammo>0&&s.trial.id!=='W01'&&W.weapons.some(w=>w.id===s.trial.id)){
  const owned=options.find(w=>w.id===s.trial.id);if(owned){owned.ammo+=s.trial.ammo;owned.trial=true;}else options.push({id:s.trial.id,ammo:s.trial.ammo,trial:true});
 }return options;
}
function selectWeapon(s,id){
 if(s.result||s.phase!=='aim'||s.turn!==0||!availableWeapons(s).some(w=>w.id===id))return false;
 s.teleportMode=false;s.mode=id;s.angle=Math.max(s.angle,W.get(id).minAngle||-12);return true;
}
function selectSkill(s,id){if(s.phase!=='aim'||s.skillUsed||!s.skills[id]||id==='SWAP'&&s.spec.boss)return false;s.teleportMode=false;s.selectedSkill=s.selectedSkill===id?null:id;return true;}
function blink(s,index){
 if(s.phase!=='aim'||s.skillUsed||!s.skills.BLINK||s.selectedSkill!=='BLINK')return false;
 const b=s.blink[index];if(!b)return false;const dest=G.safePosition(s.world,b.x,b.y,s.units[1],s.units[0].range);if(!dest)return false;
 Object.assign(s.units[0],dest);s.skills.BLINK--;s.skillUsed=true;s.selectedSkill=null;return true;
}
function selectTeleport(s){if(s.result||s.turn||s.phase!=='aim'||!s.spec.teleport)return false;s.teleportMode=!s.teleportMode;s.selectedSkill=null;return true;}
function trajectory(s,side,angle,power,opts={}){return P.simulate(s,side,angle,power,{weaponId:side?'W01':s.teleportMode?'TELEPORT':s.mode,skill:side||s.teleportMode?null:s.selectedSkill,...opts});}
function settleUnits(s){for(let side=0;side<2;side++){const u=s.units[side];if(u.floating)continue;const current=G.support(s.world,u.x,u.y);if(current&&Math.abs(current.y-u.y)<2&&G.clearBody(s.world,current))continue;const pad=G.fallLanding(s.world,u.x,u.y,s.units[1-side],u.range);if(pad){const from={x:u.x,y:u.y,slope:u.slope};Object.assign(u,pad);u.animation={from,age:0,duration:Math.min(1,Math.max(.25,Math.sqrt(Math.max(0,pad.y-from.y)/400))),lift:0,fall:true};}}}

function collect(s,shot,event){
 const item=s.pickups.find(c=>c.id===event.id);if(!item||item.collected)return null;
 if(item.kind==='trial'){item.collected=true;s.trial={id:item.weaponId,ammo:2};return item;}
 if(item.kind==='ammo'){if(s.weaponId==='W01')return null;item.collected=true;s.ammo++;return {...item,taken:1};}
 if(item.id[0]==='R'){
  if(!item.skill||!(item.skill in s.skills)||s.skills[item.skill]>=s.skillCaps[item.skill])return null;
  const taken=Math.min(item.amount||1,s.skillCaps[item.skill]-s.skills[item.skill]);s.skills[item.skill]+=taken;item.amount=(item.amount||1)-taken;item.collected=item.amount===0;return {...item,taken};
 }else item.collected=true;
 return item;
}
function applyEvents(s,shot,time,onCollect=()=>{}){
 s.effects.destroyed=s.effects.destroyed||[];
 while(shot.appliedEvents<shot.events.length&&shot.events[shot.appliedEvents].t<=time){
  const e=shot.events[shot.appliedEvents++];
  if(e.type==='pickup'){const c=collect(s,shot,e);if(c)onCollect(c);}
  if(e.type==='break'&&!s.effects.destroyed.includes(e.solidId)){s.effects.destroyed.push(e.solidId);s.world=G.without(s.world,[e.solidId]);}
  if(e.type==='terminal')s.effects.pendingPolarity=-(s.effects.polarity||s.world.regions.find(r=>r.kind==='M')?.direction||1);
 }
}
function launch(s,angle=s.angle,power=s.power,plan=null){
 if(s.result||!['aim','cpu','cpuMove'].includes(s.phase))return null;
 const side=s.turn;if(!side){
  if(s.shotCount>=s.shotLimit)return null;
  // BLINK commits through its landing confirmation, never through a shot.
  if(s.selectedSkill==='BLINK')return null;
  if(!s.teleportMode&&s.mode!=='W01'&&!(s.trial?.id===s.mode&&s.trial.ammo>0)&&!(s.mode===s.weaponId&&s.ammo>0))return null;
 }
 const shot=plan||trajectory(s,side,angle,power);
 if(!side){s.shotCount++;if(!s.teleportMode&&s.mode!=='W01'){if(s.trial?.id===s.mode&&s.trial.ammo>0)s.trial.ammo--;else s.ammo--;}
  if(!s.teleportMode&&s.selectedSkill){s.skills[s.selectedSkill]--;s.skillUsed=true;}
 }
 s.phase='flight';s.activeShot=shot;return shot;
}
function addReward(s,skill,authoredX=65,authoredHeight=28,id='R-boss'){
 if(!(skill in s.skills))return;
 const position=G.point(authoredX,authoredHeight);
 // All reward callers use the same 0..100 authoring coordinates as the maps.
 // Reject an invalid position instead of creating an off-board camera target.
 if(!Number.isFinite(position.x+position.y)||position.x<22||position.x>978||position.y<22||position.y>478)return;
 const old=s.pickups.find(p=>p.id[0]==='R'&&p.skill===skill&&!p.collected);if(old){old.amount=(old.amount||1)+1;return;}
 if(s.pickups.filter(p=>!p.collected).length>=3)return;
 s.pickups.push({id,skill,amount:1,name:skill,...position,radius:22,collected:false});
}
function liftLanding(s,side,height,distance){
 const u=s.units[side],other=s.units[1-side],candidates=[];
 for(const surface of s.world.surfaces)for(let dx=-distance;dx<=distance;dx+=10){
  const x=clamp(u.x+dx,u.range[0],u.range[1]),y=G.floorY(surface.points,x);
  if(y===null||y>u.y-12||y<u.y-height)continue;
  const p=G.safePosition(s.world,x,y,other,u.range);
  if(!p||p.y>u.y-12||p.y<u.y-height||Math.abs(p.x-u.x)>distance+1)continue;
  const apex={x:(u.x+p.x)/2,y:Math.min(u.y,p.y)-48};
  if(!G.lineClear(s.world,{x:u.x,y:u.y-24},apex)||!G.lineClear(s.world,apex,{x:p.x,y:p.y-24}))continue;
  candidates.push(p);
 }return candidates.sort((a,b)=>(u.y-b.y)-(u.y-a.y)||Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0]||null;
}
function displace(s,side,shot){
 const w=W.get(shot.weaponId),u=s.units[1-side],hit=shot.impacts.find(x=>x.hit?.unit===1-side);
 if(!shot.damage[1-side]||!(w.push||w.pull||w.lift||['PUSH','PULL','SWAP'].includes(shot.skill)))return;
 const away=Math.sign(u.x-s.units[side].x)||1,before={x:u.x,y:u.y,slope:u.slope,surface:u.surface,floating:u.floating};
 if(s.spec.boss&&side===0&&shot.skill==='SWAP'){u.exposed=2;u.facingCore=s.units[0].x<u.x?-1:1;u.reactionKind='rotate';return;}
 if(shot.skill==='SWAP'&&hit&&shot.bullets.find(b=>b.id===hit.bullet)?.primary){
  const a=s.units[0],b=s.units[1],pa={x:a.x,y:a.y,slope:a.slope,surface:a.surface,range:a.range},pb={x:b.x,y:b.y,slope:b.slope,surface:b.surface,range:b.range};Object.assign(a,pb);Object.assign(b,pa);a.animation={from:pa,age:0,duration:.6,lift:0};b.animation={from:pb,age:0,duration:.6,lift:0};a.displaced=1;b.displaced=1;
 }else{
  const pulling=w.pull||shot.skill==='PULL',distance=w.lift?(w.liftDistance||60):pulling?(w.pullDistance||100):(w.pushDistance||110),boss=s.spec.boss&&side===0;
  const dx=(pulling?-away:away)*Math.min(distance,boss?(pulling?48:36):distance);
  const landing=w.lift?liftLanding(s,1-side,w.liftHeight||110,boss?80:120):null;
  if(landing)Object.assign(u,landing);
  else if(u.floating){const x=clamp(u.x+dx,u.range[0],u.range[1]);if(Math.abs(x-s.units[side].x)>110)u.x=x;}
  else if(w.lift){
   // A carry can clear a short gap, but may not pass through a wall or roof.
   const p=G.safePosition(s.world,u.x+dx,u.y,s.units[side],u.range),apex=p&&{x:(u.x+p.x)/2,y:Math.min(u.y,p.y)-(w.liftHeight||110)};
   if(p&&G.lineClear(s.world,{x:u.x,y:u.y-24},apex)&&G.lineClear(s.world,apex,{x:p.x,y:p.y-24}))Object.assign(u,p);else G.move(s,1-side,dx);
  }else G.move(s,1-side,dx);
  if(boss){
   // Do not trade a useful hit for a boss position without a basic-cannon route.
   if((Math.abs(u.x-before.x)>1||Math.abs(u.y-before.y)>1)&&(solve(s,0).score<=.1||solve(s,1).score<=.1))Object.assign(u,before);
   u.slope=0;u.exposed=Math.max(u.exposed,pulling||w.lift?2:1);u.facingCore=s.units[0].x<u.x?-1:1;
  }
  u.reactionKind=w.lift?'lift':pulling?'pull':'push';u.animation={from:before,age:0,duration:.5,lift:w.lift?Math.min(45,Math.max(18,(before.y-u.y)*.3)):0};u.displaced=1;u.previousX=before.x;
 }
}
function resolve(s,shot,onCollect=()=>{}){
 if(shot.resolved)return [0,0];applyEvents(s,shot,Infinity,onCollect);shot.resolved=true;
 if(shot.teleport){const u=s.units[0],landing=G.teleportLanding(s.world,shot.teleportContact,s.units[1],u.range);shot.teleportSuccess=!!landing;if(landing){const entry=landing.entry;Object.assign(u,landing);delete u.entry;u.animation={from:{...entry,slope:u.slope},age:0,duration:Math.min(1,Math.max(.3,Math.sqrt(Math.max(0,landing.y-entry.y)/400))),lift:0,fall:true};u.teleportFlash={age:0};}s.teleportMode=false;}
 settleUnits(s);
 if(shot.side===1)s.lastCpuFamily=shot.attackKind;

 s.units.forEach((u,i)=>u.hp=Math.max(0,u.hp-shot.damage[i]));
 const boss=s.units[1];
 if(s.spec.boss&&shot.side===0){
  for(const [i,damage] of Object.entries(shot.partDamage)){const p=boss.parts[i];if(p)p.hp=Math.max(0,p.hp-damage);}
  const broken=boss.parts.filter(p=>p.hp<=0).length;
  if(broken>s.effects.broken){
   s.effects.broken=broken;
   if(!s.rewardGiven){s.rewardGiven=true;if(s.spec.contentRevision!=='4.1')addReward(s,s.spec.bossSpec.reward);}
   s.pendingChanges.push({type:'parts',broken});
  }
  if(s.stage===100){const target=boss.hp<=4?2:boss.hp<=7?1:0;if(target>s.bossPhase)s.pendingChanges.push({type:'phase',value:target});}
  if(s.stage===90&&boss.hp<=5&&!s.effects.stageTwo){s.effects.stageTwo=true;s.pendingChanges.push({type:'altitude'},{type:'cloud'});}
 }
 if(boss.exposed>0&&shot.side===0)boss.exposed--;
 displace(s,shot.side,shot);
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
 if(s.effects.pendingPolarity!==undefined){s.pendingChanges.push({type:'polarity',value:s.effects.pendingPolarity});delete s.effects.pendingPolarity;}
 // Each queued major change gets a separate visual transition; Lv90 defers cloud to next boundary.
 let changes=[];
 if(s.stage===90&&s.pendingChanges.length){changes=[s.pendingChanges.shift()];s.effects.deferEnvironment=true;s.effects.environmentRound=s.effects.environmentRound||s.round-1;}
 else{changes=s.pendingChanges.splice(0);s.effects.deferEnvironment=false;s.effects.environmentRound=s.round;}
 for(const c of changes){
  if(c.type==='phase'){
   const old=s.bossPhase;s.bossPhase=c.value;
   for(let phase=old+1;s.spec.contentRevision!=='4.1'&&phase<=c.value;phase++)addReward(s,phase===1?'BLINK':'PHASE',phase===1?55:63,phase===1?23:29,'R-phase-'+phase);
   if(s.bossPhase===1)s.units[1].parts=[{name:'LEFT SHELL',hp:2,maxHp:2,dx:-58,dy:-22,radius:24},{name:'RIGHT SHELL',hp:2,maxHp:2,dx:45,dy:-62,radius:24}];
   if(s.bossPhase===2)s.units[1].parts=[];
  }
  if(c.type==='altitude')s.units[1].y+=20;
  if(c.type==='parts'&&s.stage===30){s.units[1].y+=20;s.effects.cloudPending=true;}
  if(c.type==='cloud')s.effects.thinCloud=true;
  if(c.type==='polarity')s.effects.polarity=c.value;
 }
 // Floating boss motion never changes on the same boundary as cloud motion / part geometry.
 if(!changes.length&&s.spec.boss){const u=s.units[1];
  if(s.stage===10&&s.round===2&&s.effects.broken===0)u.x+=30;
  if(s.stage===30&&s.effects.cloudPending){s.effects.cloudOffset=s.effects.cloudOffset?0:80;s.effects.cloudPending=false;}
  else if(s.stage===30&&s.effects.broken<2&&s.round%2===0){u.x+=s.round%4===0?-30:30;u.y+=s.round%4===0?-15:15;}
  if(s.stage===50&&s.round%2===1){if(s.spec.contentRevision==='4.1'){u.exposed=Math.max(1,u.exposed);u.facingCore=s.units[0].x<u.x?-1:1;}else{const high=s.round%4===3;u.x=high?850:790;u.y=high?280:420;u.floating=true;}}
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
 const weaponId=opts.weaponId||'W01',skill=opts.skill||null,minAngle=Math.max(opts.minAngle??-8,W.get(weaponId).minAngle||-12),maxAngle=opts.maxAngle??84;
 const physics={weaponId,skill,...(opts.curve?{curve:opts.curve}:{})};
 const key=JSON.stringify([s.stage,s.round,s.bossPhase,s.units.map(u=>[Math.round(u.x),Math.round(u.y),u.parts.map(p=>p.hp>0),u.exposed]),s.effects,s.world.solids.map(o=>[o.id,o.kind,o.poly]),s.world.regions,side,physics,minAngle,maxAngle,opts.requireEvent]);
 if(solveCache.has(key))return solveCache.get(key);
 let best={score:-Infinity,angle:48,power:70};
 const score=shot=>shot.damage[1-side]-shot.damage[side]*2-(opts.requireEvent&&!shot.events.some(e=>e.type===opts.requireEvent)?.3:0)-Math.min(2000,Math.hypot(shot.end.x-s.units[1-side].x,shot.end.y-s.units[1-side].y))*.00001;
 for(let a=minAngle;a<=maxAngle;a+=6)for(let power=20;power<=100;power+=5){const shot=trajectory(s,side,a,power,physics),v=score(shot);if(v>best.score)best={angle:a,power,score:v};}
 const coarse={...best};for(let a=Math.max(minAngle,coarse.angle-5);a<=Math.min(maxAngle,coarse.angle+5);a+=2)for(let power=Math.max(20,coarse.power-5);power<=Math.min(100,coarse.power+5);power+=2){const shot=trajectory(s,side,a,power,physics),v=score(shot);if(v>best.score)best={angle:a,power,score:v};}
 if(solveCache.size>512)solveCache.clear();solveCache.set(key,best);return best;
}
function cpuPlan(s,random=s.random){
 if(typeof random!=='function')random=seeded(s.stage*1000+s.round);
 const kind=s.telegraph?.kind;let family='STANDARD';const families=[{minAngle:-8,maxAngle:38},{minAngle:24,maxAngle:64},{minAngle:52,maxAngle:84}];let familyIndex=(s.round+Math.floor(random()*3))%3;if('FAMILY'+familyIndex===s.lastCpuFamily)familyIndex=(familyIndex+1)%3;family='FAMILY'+familyIndex;
 let settings=s.spec.boss?({LOW:{minAngle:-8,maxAngle:32},ARC:{minAngle:54,maxAngle:84},REFLECT:{weaponId:'W06',minAngle:-8,maxAngle:60,requireEvent:'bounce'},FAN:{weaponId:'W09',minAngle:12,maxAngle:68},CURVE:{curve:-.65,minAngle:12,maxAngle:66},TWIN:{weaponId:'W11',minAngle:18,maxAngle:76}}[kind]||{}):families[familyIndex];
 const profile=s.spec.enemyProfile,errA=[12,10,8,7,6,5][profile],errP=[20,18,16,14,12,10][profile];let best=solve(s,1,settings);if(best.score<=0&&!s.spec.boss){settings={};best=solve(s,1);}
 let angle=best.angle+(random()*2-1)*errA,power=best.power+(random()*2-1)*errP;
 if(s.stage<=3)power-=8;
 angle=clamp(angle,settings.minAngle??-12,settings.maxAngle??85);power=clamp(power,20,100);
 const options={weaponId:settings.weaponId||'W01',...(settings.curve?{curve:settings.curve}:{})};
 let plan=trajectory(s,1,angle,power,options);
 if(s.spec.boss&&['DROP','MARK','TRIPLE','PREPARE'].includes(kind)){
  const volley=[];
  if(kind==='TRIPLE')for(let i=0;i<3;i++)volley.push({offset:(i-1)*7,delay:i*.22});
  else{const offsets=kind==='MARK'?[-64,0,64]:[0],target=s.telegraph;offsets.forEach((offset,i)=>volley.push({origin:{x:clamp(target.targetX+offset,25,975),y:Math.min(target.targetY-300,s.units[0].y-300),theta:Math.PI/2+(kind==='MARK'?(i-1)*.035:0)},power:20,delay:kind==='PREPARE'?.8:kind==='MARK'?.25+i*.12:0}));}
  plan=P.simulate(s,1,angle,power,{weaponId:kind==='PREPARE'?'W02':'W01',volley});

 }
 if(s.spec.boss&&s.effects.broken){plan.damage=plan.damage.map(d=>d*.5);plan.partDamage=Object.fromEntries(Object.entries(plan.partDamage).map(([k,d])=>[k,d*.5]));}
 plan.attackKind=kind||family;
 return plan;
}
function combineShots(shots){
 const bullets=[],events=[],impacts=[],damage=[0,0],partDamage={};let nextId=0;
 for(const shot of shots){const ids=new Map(shot.bullets.map(b=>[b.id,nextId++]));
  for(const b of shot.bullets)bullets.push({...b,id:ids.get(b.id)});
  for(const e of shot.events)events.push({...e,...(e.bullet!==undefined?{bullet:ids.get(e.bullet)}:{})});
  for(const e of shot.impacts)impacts.push({...e,bullet:ids.get(e.bullet)});
  for(let i=0;i<2;i++)damage[i]+=shot.damage[i];
  for(const [i,d]of Object.entries(shot.partDamage))partDamage[i]=(partDamage[i]||0)+d;
 }events.sort((a,b)=>a.t-b.t);impacts.sort((a,b)=>a.t-b.t);
 const duration=Math.max(...bullets.map(b=>b.t)),end=impacts.at(-1)||bullets.at(-1).path.at(-1);
 return {...shots[0],bullets,events,impacts,damage:damage.map(d=>Math.min(1,d)),partDamage,duration,appliedEvents:0,resolved:false,path:bullets[0].path,end,hit:impacts.find(i=>i.hit)?.hit?.unit??-1};
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
const api={campaign,create:()=>campaign(1),chargeDuration,chargePower,seeded,biomes,clamp,trajectory,launch,resolve,applyEvents,collect,check,next,move,solve,cpu:cpuPlan,cpuPlan,enemyMoveTarget,availableWeapons,selectWeapon,selectSkill,selectTeleport,settleUnits,blink,rebuildWorld,boundary,telegraph,geometry:G,weapons:W.weapons,skills:W.skills,levels:L};
if(node)module.exports=api;else root.ArcEngine=api;
})(globalThis);
