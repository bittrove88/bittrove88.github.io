(function(root){
'use strict';
const G=typeof module!=='undefined'?require('./geometry.js'):root.ArcGeometry;
const W=typeof module!=='undefined'?require('./weapons.js'):root.ArcWeapons;
const DT=1/90,GRAVITY=300;
function launchSpeed(power,weapon){return G.clamp(power,20,100)*6.7*weapon.speed;}
function inRegion(p,r){return r.kind==='C'?r.on!==false&&(r.strength??1)>0&&G.cloudContains(p,r):r.kind==='M'?Math.hypot(p.x-r.x,p.y-r.y)<r.radius:p.x>=r.x1&&p.x<=r.x2&&p.y>=r.y1&&p.y<=r.y2;}
// Keep established gentle-ground targeting, and rotate the contact center with
// the chassis on the newly supported steep faces.
function bodyCenter(s,j,useShape=false){const u=s.units[j],h=j===1&&useShape?u.hitShape:null;return Math.abs(u.slope||0)>35*Math.PI/180?G.actorPoint(s,j,h?.x||0,h?.y??-22):{x:u.x,y:u.y+(h?.y??-22)};}
function hitTargets(s,side,a,b,age,weapon){
 let best=null;
 function test(c,r,kind,unit,part=-1){const t=G.circle(a,b,c,r);if(t!==null&&(!best||t<best.t))best={t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,kind,unit,part};}
 for(let j=0;j<2;j++){
  if(j===side&&age<.22)continue;const u=s.units[j];if(j===1&&(s.spec.boss||s.spec.midboss)){
   const exposed=u.exposed>0||s.spec.id===100&&s.bossPhase===2,dir=s.units[0].x>=u.x?1:-1,core=u.core||{x:0,y:-77,radius:26,exposedRadius:38},parts=G.actorParts(s,j),broken=parts.some(p=>p.hp<=0);
   parts.forEach((p,i)=>{if(p.hp>0)test({x:u.x+p.dx,y:u.y+p.dy},p.radius,'part',j,i);});
   if(!s.spec.midboss||broken||exposed)test(G.actorPoint(s,j,core.x,core.y),exposed?core.exposedRadius:core.radius+(broken?3:0),'weak',j);
   const h=u.hitShape||{x:0,y:-38,rx:58,ry:58},center=G.actorPoint(s,j,h.x,h.y),slope=u.slope||0,local=p=>({x:((p.x-center.x)*Math.cos(slope)+(p.y-center.y)*Math.sin(slope))/h.rx,y:(-(p.x-center.x)*Math.sin(slope)+(p.y-center.y)*Math.cos(slope))/h.ry}),t=G.circle(local(a),local(b),{x:0,y:0},1);
   // Visible internal parts and the core remain hittable through the broad chassis
   // envelope. The projectile still reaches the exact circular target; external
   // terrain and intact outer parts retain their earlier swept contacts.
   const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,reach=Math.max(h.rx,h.ry)*4,ray={x:a.x+dx/length*reach,y:a.y+dy/length*reach};
   const aperture=parts.some(p=>p.hp>0&&G.circle(a,ray,{x:u.x+p.dx,y:u.y+p.dy},p.radius)!==null)||(!s.spec.midboss||broken||exposed)&&G.circle(a,ray,G.actorPoint(s,j,core.x,core.y),exposed?core.exposedRadius:core.radius+(broken?3:0))!==null;
   if(t!==null&&!aperture&&(!best||t<best.t))best={t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,kind:'body',unit:j,part:-1};
  }else {const before=best,center=bodyCenter(s,j);test(center,weapon.needle?25:31,'body',j);if(best!==before&&best?.unit===j&&side===0&&j===1&&!weapon.teleport&&(weapon.criticalMultiplier??1.5)>1){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),cx=center.x-a.x,cy=center.y-a.y;best.critical=len>0&&Math.abs(cx*dy-cy*dx)/len<=15&&(cx*dx+cy*dy)>=0;}}

 }
 return best;
}
function phaseTravel(a,b,poly,budget){
 const distance=Math.hypot(b.x-a.x,b.y-a.y),cuts=[0,1];
 for(let i=0;i<poly.length;i++){const hit=G.segment(a,b,poly[i],poly[(i+1)%poly.length]);if(hit)cuts.push(hit.t);}
 cuts.sort((x,y)=>x-y);let used=0;
 for(let i=1;i<cuts.length;i++){
  const from=cuts[i-1],to=cuts[i];if(to-from<1e-8)continue;
  const mid=(from+to)/2;if(!G.inside({x:a.x+(b.x-a.x)*mid,y:a.y+(b.y-a.y)*mid},poly))continue;
  const length=(to-from)*distance;
  if(used+length>budget+1e-7){const t=from+Math.max(0,budget-used)/Math.max(distance,1e-9);return {used:budget,stop:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}};}
  used+=length;
 }
 return {used,stop:null};
}
function beamGeometry(s,weapon,options={}){
 const t=options.targetPoint||(s.telegraph?.technique===weapon.id?s.telegraph:null),targetX=t?.x??t?.targetX??s.units[0].x,targetY=t?.y??t?.targetY??s.units[0].y-22;
 const core=G.actorPoint(s,1,s.units[1].weaponPivot?.x||0,s.units[1].weaponPivot?.y??-64),aim={x:targetX,y:targetY+(weapon.beamAimOffsetY||0)},distance=Math.hypot(aim.x-core.x,aim.y-core.y)||1,dx=(aim.x-core.x)/distance,dy=(aim.y-core.y)/distance,length=Math.hypot(s.spec.worldWidth||1000,2500)*2;
 return {from:{x:core.x+dx*24,y:core.y+dy*24},to:{x:core.x+dx*length,y:core.y+dy*length},width:weapon.beamWidth,targetX,targetY};
}
function forecastBeam(s,angle,power,weapon,options){
 const t=s.telegraph,line=t?.technique===weapon.id&&t.beamFrom&&t.beamTo?{from:t.beamFrom,to:t.beamTo,width:t.beamWidth,targetX:t.targetX,targetY:t.targetY}:beamGeometry(s,weapon,options),{from,to,width}=line,x=line.targetX,y=line.targetY,dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),center=bodyCenter(s,0),along=((center.x-from.x)*dx+(center.y-from.y)*dy)/length,distance=Math.abs((center.x-from.x)*dy-(center.y-from.y)*dx)/length;
 // A single world-space front drives rendering, contact HP and sound timing.
 const delay=weapon.beamDelay,fadeDuration=weapon.beamFadeDuration,hit=along>=-31&&along<=length+31&&distance<=width/2+31;
 const targetAlong=Math.max(0,((x-from.x)*dx+(y-from.y)*dy)/length),speed=Math.max(1,targetAlong)/weapon.beamTravelDuration,contactAlong=Math.max(0,along),arrival=delay+(hit?contactAlong:targetAlong)/speed,beamDuration=Math.max(targetAlong,hit?contactAlong:0)/speed+weapon.beamDuration,duration=delay+beamDuration+fadeDuration;
 const defense=s.skillEffects||{},guarded=!!s.guardActive,factor=(defense.invincible?0:(defense.barrier?.factor??1)*(defense.weaken?.factor??1))*(guarded?.5:1);
 const value=hit?Math.min(Math.max(0,s.units[0].hp),Math.min(weapon.damage,weapon.enemyDamageCap)*factor):0;
 const events=[{type:'final-beam',x,y,t:delay,duration:beamDuration,speed,chargeDuration:delay,fadeDuration,width,from:{...from},to:{...to},bullet:0}];
 if(value>0)events.push({type:'damage',unit:0,value,x:center.x,y:center.y,t:arrival,bullet:0,source:'beam'});
 const point={x:hit?center.x:x,y:hit?center.y:y,t:arrival},path=[{x,y,t:0},{x,y,t:duration}];
 return {playerTarget:{...center,radius:31},destroyed:[],teleport:false,side:1,angle,power,weaponId:weapon.id,skill:null,bullets:[{id:0,effect:'beam',primary:true,start:0,t:duration,path}],events,impacts:[{...point,bullet:0,beam:true,blast:0,hit:hit?{unit:0,kind:'body'}:null}],damage:[value,0],partDamage:{},duration,iterations:0,appliedEvents:0,resolved:false,path,end:point,hit:hit?0:-1,...(guarded?{guarded:true}:{})};
}
function simulate(s,side,angle,power,options={}){
 const finalEnemy=side===1&&s.stage===100;
 const weapon=side===1?W.getEnemy(options.weaponId||'W01'):W.get(options.weaponId||'W01',s.characterId),skill=weapon.special&&options.skill!=='S_GUARD'?null:options.skill||null;
 if(finalEnemy&&weapon.forecastBeam)return forecastBeam(s,angle,power,weapon,options);
 if(weapon.machineId)angle=G.clamp(angle,weapon.minAngle,weapon.maxAngle);
 const units=s.units.map(u=>({...u,parts:u.parts.map(p=>({...p}))})),simState={...s,units};
 const provided=options.origin,origin=provided&&[provided.x,provided.y,provided.theta].every(Number.isFinite)?provided:G.muzzle({...s,mode:weapon.id},side,Math.max(weapon.minAngle||-15,angle));
 const startDelay=G.clamp(Number(options.startDelay)||0,0,2),curve=G.clamp(Number(options.curve)||0,-1.5,1.5);
 let simWorld=s.world,breachUsed=false;const destroyed=new Set();
 const events=[],bullets=[],impacts=[],damage=[0,0],partDamage={},seenPickups=new Set(),seenTerminals=new Set();let iterations=0,bulletId=0;
 const timed=side===0&&!weapon.teleport,boost=side===0?(s.skillEffects?.power?.factor||1):1;
 let spent=0,bossWeak=false;
 let relayRemaining=s.stage===100&&s.spec.finalBattle&&s.finalTeam?Math.max(0,s.spec.finalBattle.requiredDamage-(s.finalTeam.damage[s.characterId]||0)):Infinity;
 // Damage is credited in contact order. The same ledger drives HP, labels and
 // part destruction; later hits never rescale an earlier hit.
 function credit(p,hit,value,source){
  if(!hit||value<=0)return 0;
  const j=hit.unit,part=j===1&&hit.kind==='part'?units[j].parts[hit.part]:null;
  if(part&&part.hp<=0)return 0;
  if(j===1&&hit.kind==='weak'&&s.spec.boss)bossWeak=true;
  // Reduce the self-hit payload and its attack cap before clipping to remaining HP.
  const selfFactor=side===0&&j===0&&weapon.special?0.5:1;
  const cap=j===0?selfFactor:bossWeak?(weapon.bossDamageCap??weapon.damageCap??2):(weapon.damageCap??(hit.critical?1.875:1.25));
  const raw=value*(j===1?boost:selfFactor),available=j===1?Math.max(0,cap-spent):Math.max(0,cap-damage[j]);
  const amount=Math.min(raw,available,part?part.hp:units[j].hp,j===1&&!part?relayRemaining:Infinity);
  if(amount<=1e-10)return 0;
  if(part){part.hp=Math.max(0,part.hp-amount);if(part.hp<1e-9)part.hp=0;partDamage[hit.part]=(partDamage[hit.part]||0)+amount;}
  else{damage[j]+=amount;units[j].hp=Math.max(0,units[j].hp-amount);if(units[j].hp<1e-9)units[j].hp=0;if(j===1)relayRemaining=Math.max(0,relayRemaining-amount);}
  if(j===1)spent+=amount;
  events.push({type:part?'part-damage':'damage',unit:j,...(part?{part:hit.part}:{}),value:amount,rawValue:raw,weak:hit.kind==='weak',critical:!!hit.critical,capped:j===1&&amount+1e-9>=available,cap,x:hit.point?.x??hit.x??p.x,y:hit.point?.y??hit.y??p.y,t:p.t,bullet:p.id,source});
  return amount;
 }
 const damageBudget=weapon.damage;
 const newBullet=(offset=0,delay=0,budget=damageBudget,primary=true,source=origin,powerValue=power)=>{
  delay+=startDelay;let a=source.theta+offset*Math.PI/180;const v=launchSpeed(powerValue,weapon);
  if(weapon.enemyBounce==='all')a=Math.atan2(Math.sin(a),(units[1-side].x>=source.x?1:-1)*Math.abs(Math.cos(a)));
  return {id:bulletId++,x:source.x,y:source.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:delay,start:delay,age:0,budget,primary,path:[{x:source.x,y:source.y,t:delay}],forceEntries:new Set(),initialBounces:0,clouds:new Set(),magnetTime:{},bounces:0,solidBounces:0,phaseRemaining:Math.max(weapon.phase||0,skill==='PHASE'?60:0),phaseUsed:false,phaseSolid:null,phaseExit:false,solidSkip:null,splitDone:false,archerDone:false,roll:0,rollDistance:0,...(weapon.resumeRoll?{rollElapsed:0}:{})};
 };
 const queue=[];
 if(options.volley?.length){for(const v of options.volley){const b=newBullet(v.offset||0,v.delay||0,v.damage??damageBudget,true,v.origin||origin,v.power??power);if(v.appearance)b.appearance=v.appearance;if(v.blast!==undefined)b.blast=v.blast;b.stage=queue.length;queue.push(b);}}
 else if(weapon.converge){for(let i=-1;i<=1;i++){const p=newBullet(0,0,damageBudget/3,i===0);p.convergeBranch=true;p.branchIndex=i;queue.push(p);}}
 else if(weapon.scatter){let seed=((s.matchSeed||1)^Math.imul((s.shotCount||0)+1,2654435761)^Math.imul(s.round||1,2246822519))>>>0;for(let i=0;i<weapon.scatter;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const offset=((i+seed/4294967296)/weapon.scatter*2-1)*weapon.scatterAngle;queue.push(newBullet(offset,0,damageBudget,i===0));}}
 else if(weapon.volley){for(const v of weapon.volley){const offset=(v.barrel||0)*4.84*(origin.dir||1),back=v.barrel?6.16:0,source={...origin,x:origin.x-(origin.dx??Math.cos(origin.theta))*back-Math.sin(origin.theta)*offset,y:origin.y-(origin.dy??Math.sin(origin.theta))*back+Math.cos(origin.theta)*offset},bullet=newBullet(v.offset,v.delay,v.damage??damageBudget,true,source);bullet.stage=queue.length;if(v.blast!==undefined)bullet.blast=v.blast;if(v.appearance)bullet.appearance=v.appearance;if(weapon.weave)bullet.weavePhase=queue.length*Math.PI*2/weapon.volley.length;queue.push(bullet);}}
 else if(weapon.fan){for(const o of (skill==='SPLIT'?[-15,0,15]:[-13,0,13])){const bullet=newBullet(o,0,weapon.childDamage??damageBudget/3,o===0);bullet.splitDone=true;queue.push(bullet);}}
 else if(weapon.twin){queue.push(newBullet(-3,0,weapon.childDamage??damageBudget/2));queue.push(newBullet(3,.25,weapon.childDamage??damageBudget/2,false));}
 else queue.push(newBullet());
 const convergence={finished:new Set(),arrived:[],done:false};
 function finishConvergence(p,arrived=false){
  if(!p.convergeBranch||convergence.finished.has(p.id))return;convergence.finished.add(p.id);if(arrived)convergence.arrived.push(p);
  if(convergence.finished.size<3||convergence.done)return;convergence.done=true;if(!convergence.arrived.length)return;
  const center=convergence.arrived.find(b=>b.branchIndex===0)||convergence.arrived[0],eligible=convergence.arrived.filter(b=>Math.hypot(b.x-center.x,b.y-center.y)<40&&G.lineClear(simWorld,b,center));
  for(const b of convergence.arrived)if(!eligible.includes(b)){b.convergeBranch=false;queue.push(b);}
  if(!eligible.length)return;const time=Math.max(...eligible.map(b=>b.t)),merged={...center,id:bulletId++,convergeBranch:false,converged:true,primary:true,budget:eligible.reduce((n,b)=>n+b.budget,0),age:0,t:time,start:time,path:[{x:center.x,y:center.y,t:time}]};
  events.push({type:'converge',x:center.x,y:center.y,t:time,bullet:merged.id,branches:eligible.length});queue.push(merged);
 }
 if(curve)events.push({type:'curve',x:origin.x,y:origin.y,t:startDelay,bullet:0});
 const centerOf=j=>bodyCenter({...s,units},j,true);
 function clearTo(point,target,solidId=null){const h=G.sweep(simWorld,point,target);return !h||h.t>.98||solidId&&h.solid.id===solidId;}
 function multiplier(hit){return hit.kind==='weak'?(units[hit.unit].core?.multiplier||2):hit.critical?(weapon.criticalMultiplier??1.5):1;}
 // Intersect the growing effect with the actual body/part/core shapes, rather
 // than requiring the effect to reach a single arbitrary chassis center.
 function areaContact(p,j,radius,kind='ring',innerRadius=0){
  const u=units[j],boss=j===1&&(s.spec.boss||s.spec.midboss),targets=[];
  if(boss){
   const parts=G.actorParts(simState,j),core=u.core||{x:0,y:-77,radius:26,exposedRadius:38},exposed=u.exposed>0||s.spec.id===100&&s.bossPhase===2,broken=parts.some(q=>q.hp<=0);
   for(const [i,q]of parts.entries())if(q.hp>0)targets.push({x:u.x+q.dx,y:u.y+q.dy,rx:q.radius,ry:q.radius,kind:'part',part:i});
   if(!s.spec.midboss||broken||exposed)targets.push({...G.actorPoint(simState,j,core.x,core.y),rx:exposed?core.exposedRadius:core.radius+(broken?3:0),ry:exposed?core.exposedRadius:core.radius+(broken?3:0),kind:'weak'});
   const h=u.hitShape||{x:0,y:-38,rx:58,ry:58};targets.push({...G.actorPoint(simState,j,h.x,h.y),rx:h.rx,ry:h.ry,slope:u.slope||0,kind:'body'});
  }else targets.push({...bodyCenter(simState,j),rx:weapon.needle?25:31,ry:weapon.needle?25:31,kind:'body'});
  const hits=[],axis=(origin.dir||1)<0?Math.PI:0,half=(weapon.coneAngle||28)*Math.PI/180;
  for(const q of targets){
   // A circular wave can touch any exposed arc of the target. Sweep only the
   // newly drawn front, so later terrain/armor changes cannot hit its old interior.
   if(p.effect==='area'&&kind==='ring'){
    const theta=Math.atan2(q.y-p.y,q.x-p.x),distanceToCenter=Math.hypot(q.x-p.x,q.y-p.y),span=distanceToCenter<=Math.max(q.rx,q.ry)?Math.PI:Math.asin(Math.min(1,Math.max(q.rx,q.ry)/distanceToCenter)),slope=q.slope||0,c=Math.cos(slope),sn=Math.sin(slope);
    for(const fraction of [0,-.2,.2,-.4,.4,-.6,.6,-.8,.8,-.98,.98]){
     const angle=theta+fraction*span,dx=Math.cos(angle),dy=Math.sin(angle),x=((p.x-q.x)*c+(p.y-q.y)*sn)/q.rx,y=(-(p.x-q.x)*sn+(p.y-q.y)*c)/q.ry,vx=(dx*c+dy*sn)/q.rx,vy=(-dx*sn+dy*c)/q.ry,A=vx*vx+vy*vy,B=2*(x*vx+y*vy),D=B*B-4*A*(x*x+y*y-1);
     if(D<0)continue;const entry=Math.max(0,(-B-Math.sqrt(D))/(2*A)),exit=(-B+Math.sqrt(D))/(2*A),distance=Math.max(entry,innerRadius);
     if(exit<distance-1e-7||distance>radius+1e-7)continue;
     const point={x:p.x+dx*distance,y:p.y+dy*distance};if(!clearTo({x:p.x,y:p.y-2},point))continue;
     const blocked=boss?hitTargets(simState,side,p,point,1,weapon):null;
     if(blocked?.kind==='part'&&(q.kind!=='part'||blocked.part!==q.part)&&blocked.t<1-1e-6)continue;
     hits.push({...q,unit:j,distance,point});
    }
    continue;
   }
   const theta=Math.atan2(q.y-p.y,q.x-p.x),delta=Math.atan2(Math.sin(theta-axis),Math.cos(theta-axis)),a=kind==='cone'?axis+G.clamp(delta,-half,half):theta;
   const reach=Math.max(1,Math.hypot(q.x-p.x,q.y-p.y)+Math.max(q.rx,q.ry)*2),end={x:p.x+Math.cos(a)*reach,y:p.y+Math.sin(a)*reach},slope=q.slope||0;
   const local=v=>({x:((v.x-q.x)*Math.cos(slope)+(v.y-q.y)*Math.sin(slope))/q.rx,y:(-(v.x-q.x)*Math.sin(slope)+(v.y-q.y)*Math.cos(slope))/q.ry});
   const t=G.circle(local(p),local(end),{x:0,y:0},1);if(t===null)continue;
   const point={x:p.x+(end.x-p.x)*t,y:p.y+(end.y-p.y)*t},distance=Math.hypot(point.x-p.x,point.y-p.y);
   if(distance>radius+1e-7||!clearTo({x:p.x,y:p.y-2},point))continue;
   const blocked=boss?hitTargets(simState,side,p,point,1,weapon):null;
   if(blocked?.kind==='part'&&(q.kind!=='part'||blocked.part!==q.part)&&blocked.t<1-1e-6)continue;
   hits.push({...q,unit:j,distance,point});
  }
  // A clear aperture to a core keeps the same priority as a real projectile.
  return hits.find(q=>q.kind==='weak')||hits.sort((a,b)=>a.distance-b.distance||(a.kind==='part'?-1:1))[0]||null;
 }
 function forward(point,target){const dx=(target.x-point.x)*(origin.dir||Math.sign(Math.cos(origin.theta))||1),dy=target.y-point.y;return dx>=-1e-7&&Math.hypot(dx,dy)<=weapon.coneLength&&Math.abs(Math.atan2(dy,Math.max(0,dx)))<=weapon.coneAngle*Math.PI/180;}
 function breakPieces(p,contact,blast){
  const contacted=simWorld.solids.find(o=>o.id===contact?.solidId),breach=skill==='S_BREACH'&&!breachUsed&&contacted?.destructible;if(breach)breachUsed=true;
  const candidates=simWorld.solids.filter(o=>o.destructible&&(weapon.coneLength?o.id===contact?.solidId||o.poly.some(q=>forward(p,q)&&clearTo({x:p.x,y:p.y-2},q,o.id)):o.id===contact?.solidId||o.poly.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<blast*.65&&(!weapon.special||clearTo({x:p.x,y:p.y-2},q,o.id)))));
  for(const o of candidates){destroyed.add(o.id);events.push({x:p.x,y:p.y,t:p.t,type:'break',solidId:o.id,bullet:p.id});}if(candidates.length)simWorld=G.without(simWorld,candidates.map(o=>o.id));
  if(breach){
   const nearest=o=>{let best={distance:Infinity};for(let i=0;i<o.poly.length;i++){const a=o.poly[i],b=o.poly[(i+1)%o.poly.length],dx=b.x-a.x,dy=b.y-a.y,t=G.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),q={x:a.x+dx*t,y:a.y+dy*t},distance=Math.hypot(q.x-p.x,q.y-p.y);if(distance<best.distance)best={...q,distance};}return best;};
   const from={x:p.x+(contact.nx||0)*.6,y:p.y+(contact.ny||0)*.6},extra=simWorld.solids.filter(o=>o.destructible).map(o=>({o,q:nearest(o)})).filter(({o,q})=>q.distance<=48&&clearTo(from,q,o.id)).sort((a,b)=>a.q.distance-b.q.distance||a.o.id.localeCompare(b.o.id))[0];
   if(extra){destroyed.add(extra.o.id);events.push({x:p.x,y:p.y,t:p.t,type:'breach',solidId:extra.o.id,bullet:p.id},{x:p.x,y:p.y,t:p.t,type:'break',solidId:extra.o.id,bullet:p.id});simWorld=G.without(simWorld,[extra.o.id]);}
  }
 }
 function explode(p,hit=null,contact=null){
  finishConvergence(p);
  const end={x:p.x,y:p.y,t:p.t},blast=(p.blast??weapon.blast)*(skill==='BURST'?1.5:1);impacts.push({...end,hit,contact,bullet:p.id,...(timed||weapon.special||weapon.enemyTechnique?{blast}:{} )});
  if(weapon.teleport){events.push({...end,type:'teleport-contact',bullet:p.id,contact});return;}
  events.push({...end,type:hit?.critical?'critical':hit?.kind==='weak'?'weak':hit?.kind==='part'?'part':hit?.kind==='airburst'?'airburst':'impact',bullet:p.id});
  breakPieces(p,contact,blast);
  if(timed&&blast>0&&!weapon.captureDamage)events.push({type:'blast-zone',...end,radius:blast,fade:.28,bullet:p.id});
  if(!p.secondary&&weapon.afterBursts)for(const [i,b]of weapon.afterBursts.entries()){const time=p.t+b.delay;queue.push({...p,id:bulletId++,effect:'burst',secondary:true,budget:b.damage,blast:b.blast,t:time,start:time,stage:i+1,path:[{x:p.x,y:p.y,t:time}]});}
  if(!p.secondary&&(weapon.expandingRing||weapon.progressiveCone)){const duration=weapon.areaSeconds||.6;for(let index=0;index<(weapon.ringCount||1);index++){const time=p.t+index*(weapon.ringInterval||0);queue.push({...p,id:bulletId++,effect:'area',secondary:true,areaKind:weapon.progressiveCone?'cone':'ring',areaRadius:weapon.progressiveCone?weapon.coneLength:weapon.expandingRing,areaDuration:duration,areaSeen:new Set(),areaParts:new Set(),budget:weapon.areaDamage??p.budget,t:time,start:time,ringIndex:index,path:[{x:p.x,y:p.y,t:time}]});}}
  if(!p.secondary&&weapon.afterRings)for(const [i,r]of weapon.afterRings.entries()){const t=p.t+r.delay;queue.push({...p,id:bulletId++,effect:'area',secondary:true,areaKind:'ring',areaRadius:r.radius,areaDuration:r.duration,areaSeen:new Set(),areaParts:new Set(),budget:r.damage,t,start:t,stage:i+1,path:[{x:p.x,y:p.y,t}]});}
  if(weapon.coneLength&&!weapon.progressiveCone)events.push({...end,type:'shockwave',bullet:p.id,direction:origin.dir||1,length:weapon.coneLength,halfAngle:weapon.coneAngle});
  const waves=[];
  if(weapon.wave){for(const dir of [-1,1]){let current=G.surfaceAt(simWorld,p.x,p.y,30);const path=[];if(current)for(let distance=0;distance<=(weapon.waveDistance||180);distance=Math.min(weapon.waveDistance||180,distance+5)){const x=p.x+dir*distance,next=G.surfaceAt(simWorld,x,current.y,12);if(!next||!G.lineClear(simWorld,{x:current.x,y:current.y-4},{x,y:next.y-4}))break;current=next;path.push({x,y:next.y-4,...(weapon.progressiveWave?{t:p.t+distance/(weapon.waveSpeed||300)}:{})});if(distance===(weapon.waveDistance||180))break;}if(path.length){waves.push(path);events.push({type:'wave',x:p.x,y:p.y,t:p.t,path,bullet:p.id,...(weapon.progressiveWave?{duration:path.at(-1).t-p.t}:{})});}}}
  if(weapon.progressiveWave){for(let j=0;j<2;j++){const u=units[j],q=timed?waves.flat().filter(q=>areaContact(q,j,7)).sort((a,b)=>a.t-b.t)[0]:waves.flat().filter(q=>Math.abs(q.x-u.x)<28&&Math.abs(q.y-u.y)<25).sort((a,b)=>a.t-b.t)[0];if(q)queue.push({...p,id:bulletId++,effect:'wave-hit',target:j,t:q.t,start:q.t,x:q.x,y:q.y,path:[{x:q.x,y:q.y,t:q.t}],budget:p.budget});}}
  for(let j=0;j<2;j++){
   if(timed){
    if(weapon.progressiveCone)continue;
    if(weapon.captureDamage){if(j===1&&p.captureHit)credit(p,p.captureHit,p.budget*multiplier(p.captureHit),'compression');continue;}
    const direct=hit?.unit===j&&hit.kind!=='airburst',target=direct?hit:areaContact(p,j,blast);
    if(!target)continue;
    const falloff=direct||hit?.unit===j&&hit.kind==='airburst'?1:Math.max(0,1-(target.distance||0)/Math.max(1,blast));
    let value=p.budget*falloff*multiplier(target);
    if(!direct&&hit?.kind!=='airburst'&&!weapon.special&&skill!=='BURST')value=p.budget*.5*multiplier(target);
    credit(p,target,value,p.effect||'impact');continue;
   }
   const u=units[j],center=centerOf(j),d=Math.hypot(p.x-center.x,p.y-center.y);
   let value=0;
   if(weapon.progressiveCone)value=0;
   else if(hit?.unit===j)value=weapon.progressiveDamage&&hit.kind==='part'?0:p.budget*(hit.kind==='weak'?(u.core?.multiplier||2):hit.critical?(weapon.criticalMultiplier??1.5):1);
   else if(weapon.coneLength){if(forward(p,center)&&clearTo({x:p.x,y:p.y-2},center))value=p.budget*(.35+.65*Math.max(0,1-d/weapon.coneLength));}
   else if(d<blast+(j===1&&s.spec.boss?35:12)&&G.lineClear(simWorld,{x:p.x,y:p.y-2},center))value=p.budget*(weapon.apexBurst?Math.max(0,1-d/blast):weapon.special?Math.max(.2,1-d/Math.max(1,blast+12))*.85:skill==='BURST'&&d<blast*.7?1:.5);
   if(weapon.pullToImpact&&d<=weapon.compressionRadius&&value>0)value+=weapon.compressionBonus;
   if(weapon.wave&&!weapon.progressiveWave&&waves.some(path=>path.some(q=>Math.abs(q.x-u.x)<28&&Math.abs(q.y-u.y)<25)))value=Math.max(value,p.budget);
   damage[j]+=value;
   if((weapon.progressiveDamage||finalEnemy)&&value>0)events.push({type:'damage',unit:j,value,x:p.x,y:p.y,t:p.t,bullet:p.id,source:p.effect||'impact'});
  }
  if(!timed&&hit?.kind==='part'&&!weapon.progressiveCone)partDamage[hit.part]=(partDamage[hit.part]||0)+p.budget;
  if(weapon.breachPulses&&(p.pulseIndex||0)<weapon.breachPulses-1){
   // Each of the three blast positions advances in the firing direction. Charge controls spacing, never damage.
   const distance=weapon.pulseBlasts?weapon.pulseAdvance:(weapon.pulseAdvance||22)*(.4+.6*G.clamp((power-20)/80,0,1)),direction=origin.dir||Math.sign(p.vx)||1;
   const next={x:p.x+direction*distance,y:p.y-2},blocked=G.sweep(simWorld,{x:p.x,y:p.y-2},next),point=blocked?{x:blocked.x+blocked.nx*.6,y:blocked.y+blocked.ny*.6}:{x:next.x,y:p.y},time=p.t+weapon.pulseDelay,index=(p.pulseIndex||0)+1;
   if(!blocked||blocked.solid.destructible)queue.push({...p,...point,id:bulletId++,t:time,start:time,effect:'pulse',pulseIndex:index,blast:weapon.pulseBlasts?.[index]??p.blast,path:[{...point,t:time}],pulseContact:blocked?{solidId:blocked.solid.id}:null});
  }
 }
 function redirectAt(p){
  const target=options.targetPoint||{x:s.units[1-side].x,y:s.units[1-side].y-22},theta=Math.atan2(target.y-p.y,target.x-p.x),speed=weapon.redirectSpeed||Math.hypot(p.vx,p.vy);
  p.redirected=true;p.vx=Math.cos(theta)*speed;p.vy=Math.sin(theta)*speed;
  events.push({type:'redirect',x:p.x,y:p.y,t:p.t,bullet:p.id,targetX:target.x,targetY:target.y});
 }
 const seenBullets=new Set();
 // Advance the earliest projectile by one fixed step. Every projectile sees
 // the same world at contact time, including delayed shots and split children.
 while(queue.length){
  queue.sort((a,b)=>a.t-b.t||a.id-b.id);const p=queue.shift();if(!seenBullets.has(p.id)){seenBullets.add(p.id);bullets.push(p);if(!p.primary&&(weapon.twoWave||weapon.spiral)){const solid=simWorld.solids.find(o=>G.inside(p,o.poly));if(solid){explode(p,null,{solidId:solid.id});continue;}}}let ended=false;
  if(p.effect==='area'){
   const age=p.t-p.start,radius=p.areaRadius*Math.min(1,age/p.areaDuration);
   if(!p.announced){p.announced=true;events.push({type:p.areaKind==='ring'?'ring':'shockwave',x:p.x,y:p.y,t:p.start,duration:p.areaDuration,radius:p.areaRadius,length:p.areaRadius,halfAngle:weapon.coneAngle||28,direction:origin.dir||1,bullet:p.id,ringIndex:p.ringIndex});}
   if(timed){
    for(let j=0;j<2;j++)if(!p.areaSeen.has(j)){
     const hit=areaContact(p,j,radius,p.areaKind,p.areaPreviousRadius||0);
     if(hit){
      const budget=p.areaBudgets?.[j]??p.budget,m=multiplier(hit),amount=credit(p,hit,budget*m,p.areaKind);
      // Breaking a part spends only its remaining HP. The same ring carries
      // its unused energy onward, while intact armor consumes the whole wave.
      if(p.areaKind==='ring'&&hit.kind==='part'&&units[j].parts[hit.part].hp<=0){
       const remaining=Math.max(0,budget-amount/(m*(j===1?boost:1)));p.areaBudgets=p.areaBudgets||{};p.areaBudgets[j]=remaining;
       if(remaining>1e-10)continue;
      }
      p.areaSeen.add(j);
     }
    }
    p.areaPreviousRadius=radius;
    if(age<p.areaDuration-1e-8){p.t=Math.min(p.start+p.areaDuration,p.t+DT);queue.push(p);}continue;
   }
   const reached=point=>{const dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy);return d<=radius+12&&(p.areaKind!=='cone'||dx*(origin.dir||1)>=0&&Math.abs(Math.atan2(dy,Math.abs(dx)))<=(weapon.coneAngle||28)*Math.PI/180)&&clearTo({x:p.x,y:p.y-2},point);};
   for(let j=0;j<2;j++){
    const parts=j===1?G.actorParts(simState,j).filter(q=>q.hp>0):[];
    if(parts.length){for(const [i,part]of units[j].parts.entries()){const q=G.actorParts(simState,j)[i];if(part.hp>0&&!p.areaParts.has(i)&&reached({x:units[j].x+q.dx,y:units[j].y+q.dy})){p.areaParts.add(i);partDamage[i]=(partDamage[i]||0)+p.budget;events.push({type:'area-part',part:i,value:p.budget,x:p.x,y:p.y,t:p.t,bullet:p.id});}}}
    else if(!p.areaSeen.has(j)&&reached(centerOf(j))){p.areaSeen.add(j);damage[j]+=p.budget;events.push({type:'damage',unit:j,value:p.budget,x:p.x,y:p.y,t:p.t,bullet:p.id,source:p.areaKind});}
   }
   if(age<p.areaDuration-1e-8){p.t=Math.min(p.start+p.areaDuration,p.t+DT);queue.push(p);}continue;
  }
  if(p.effect==='wave-hit'){if(timed){const hit=areaContact(p,p.target,7);if(hit)credit(p,hit,p.budget*multiplier(hit),'wave');}else{damage[p.target]+=p.budget;events.push({type:'damage',unit:p.target,value:p.budget,x:p.path[0].x,y:p.path[0].y,t:p.t,bullet:p.id,source:'wave'});}continue;}
  if(p.effect==='burst'){events.push({type:'secondary-burst',x:p.x,y:p.y,t:p.t,bullet:p.id,stage:p.stage});explode(p,null,p.pulseContact);continue;}
  if(p.effect){events.push({type:p.effect==='pulse'?'breach-pulse':'compression',x:p.x,y:p.y,t:p.t,bullet:p.id});explode(p,p.effect==='pulse'?hitTargets(simState,side,{x:p.x-.01,y:p.y},{x:p.x+.01,y:p.y},p.age,weapon):p.effectHit,p.pulseContact||p.effectContact);continue;}
  for(let steps=0;steps<1;steps++){
   iterations++;
   if(p.age>=8-1e-9||p.x< -40||p.x>(s.spec.worldWidth||1000)+40||p.y>560||p.y< -1600){finishConvergence(p);events.push({x:p.x,y:p.y,t:p.t,type:'expired',bullet:p.id});ended=true;break;}
   const old={x:p.x,y:p.y};let next={x:p.x+p.vx*DT,y:p.y+p.vy*DT};
   if(p.convergeBranch){const seconds=weapon.convergeSeconds||.14,r=t=>(weapon.convergeRadius||24)*Math.sin(Math.PI*Math.min(1,t/seconds))*p.branchIndex,delta=r(p.age+DT)-r(p.age);next.x-=Math.sin(origin.theta)*delta;next.y+=Math.cos(origin.theta)*delta;}
   if(p.weavePhase!==undefined){const a=p.age,b=a+DT,r=t=>(weapon.weaveRadius||13)*Math.min(1,t/.12),phase=p.weavePhase,omega=weapon.weaveSpeed||15;next.x+=r(b)*Math.cos(b*omega+phase)-r(a)*Math.cos(a*omega+phase);next.y+=r(b)*Math.sin(b*omega+phase)-r(a)*Math.sin(a*omega+phase);}
   if(weapon.satellites&&p.stage>0&&p.age<.45){const a=p.age,b=Math.min(.45,a+DT),phase=p.stage*Math.PI*2/3,r=t=>22*Math.sin(Math.PI*t/.45);next.x+=Math.cos(b*11+phase)*r(b)-Math.cos(a*11+phase)*r(a);next.y+=Math.sin(b*11+phase)*r(b)-Math.sin(a*11+phase)*r(a);}
   if(p.spiralPhase!==undefined){const limit=weapon.continuousSpiral?Infinity:.85,t=Math.min(limit,p.age-p.spiralStart),n=Math.min(limit,p.age-p.spiralStart+DT),r=t=>32*Math.min(1,t/.2),phase=p.spiralPhase;next.x+=r(n)*Math.cos(n*10+phase)-r(t)*Math.cos(t*10+phase);next.y+=r(n)*Math.sin(n*10+phase)-r(t)*Math.sin(t*10+phase);}
   if(p.roll){
    const f=G.surfaceAt(simWorld,next.x,p.y+3,15);
    if(p.rollDistance>=(weapon.rollDistance||220)||(weapon.resumeRoll?p.rollElapsed:p.roll)>=(weapon.rollSeconds||1.6)){explode(p);ended=true;break;}
    if(!f){if(!weapon.resumeRoll){explode(p);ended=true;break;}p.roll=0;p.vy=0;events.push({type:'roll-fall',x:p.x,y:p.y,t:p.t,bullet:p.id});}
    else{next.y=f.y-3;p.roll+=DT;if(weapon.resumeRoll)p.rollElapsed+=DT;p.rollDistance+=Math.abs(next.x-old.x);}
    if(weapon.rollBursts&&p.rollDistance-(p.lastBurst||0)>=(weapon.burstEvery||80)){p.lastBurst=p.rollDistance;const stage=Math.min(6,Math.floor(p.rollDistance/(weapon.burstEvery||80))),time=p.t;queue.push({...p,id:bulletId++,effect:'burst',secondary:true,budget:weapon.burstDamage||.15,blast:22+stage*5,t:time,start:time,stage,path:[{x:p.x,y:p.y,t:time}]});}
   }
   const target=hitTargets(simState,side,old,next,p.age,weapon);
   let solid=G.sweep(simWorld,old,next,p.solidSkip||p.phaseSolid);
   if(solid&&weapon.contactBreak&&p.roll&&solid.solid.destructible){const pieces=simWorld.solids.filter(o=>o.destructible&&(o.id===solid.solid.id||o.poly.some(q=>Math.hypot(q.x-solid.x,q.y-solid.y)<=weapon.contactBreak)));for(const o of pieces){destroyed.add(o.id);events.push({type:'break',x:solid.x,y:solid.y,t:p.t+DT,solidId:o.id,bullet:p.id});}simWorld=G.without(simWorld,pieces.map(o=>o.id));solid=G.sweep(simWorld,old,next,p.solidSkip);}
   let stop=target&&(!solid||target.t<=solid.t)?target:solid;
   const travelEnd=stop?{x:stop.x,y:stop.y}:next;
   // Transparent contacts are sorted along this swept step and processed before impact.
   const contacts=[];
   if(side===0&&!weapon.teleport){
    for(const c of s.pickups){if(c.collected||c.hidden||seenPickups.has(c.id))continue;const t=G.circle(old,travelEnd,c,c.radius||22);if(t!==null)contacts.push({t,c,type:'pickup'});}
    for(const c of simWorld.terminals){if(seenTerminals.has(c.id))continue;const t=G.circle(old,travelEnd,c,c.radius);if(t!==null)contacts.push({t,c,type:'terminal'});}
   }
   contacts.sort((a,b)=>a.t-b.t).forEach(({t,c,type})=>{
    if(type==='pickup'){
     seenPickups.add(c.id);
    }else seenTerminals.add(c.id);
    events.push({type,id:c.id,x:c.x,y:c.y,t:p.t+DT*t*(stop?.t??1),bullet:p.id});
   });
   p.t+=DT;p.age+=DT;
   if(solid&&stop===solid&&!weapon.teleport){
    const material=solid.solid.kind,reflective=material==='reflector'||material==='crystal',enemyDir=units[1-side].x>=solid.x?1:-1;
    const enemySideBlocked=weapon.enemyBounce==='all'&&Math.abs(solid.ny)<1e-7&&enemyDir*solid.nx<0;
    const canPhase=material!=='floor'&&material!=='reflector'&&(weapon.penetrating?!!solid.solid.destructible:skill==='PHASE'||(weapon.id==='W13'?!!solid.solid.destructible:['solid','roof','bridge','fragile'].includes(material)));
    if(!p.phaseUsed&&p.phaseRemaining>0&&canPhase){p.phaseUsed=true;p.phaseSolid=solid.solid.id;p.phaseExit=true;events.push({type:'phase',x:solid.x,y:solid.y,t:p.t,bullet:p.id});stop=null;}
    else if(!enemySideBlocked&&p.bounces<(weapon.maxBounces||3)&&(reflective||p.solidBounces<weapon.bounces||skill==='BOUNCE'&&p.solidBounces<1)){
     const restitution=weapon.restitution||.9,dot=p.vx*solid.nx+p.vy*solid.ny;p.vx=(p.vx-2*dot*solid.nx)*restitution;p.vy=(p.vy-2*dot*solid.ny)*restitution;
     if(weapon.hop&&solid.ny<-.5)p.vy=-Math.max(150,Math.abs(p.vy)*1.1);
     if(weapon.skipper&&solid.ny<-.5){p.vx*=.98;p.vy=-Math.max(55,Math.min(95,Math.abs(p.vy)*.3));}
     p.x=solid.x+solid.nx*1.5;p.y=solid.y+solid.ny*1.5;p.bounces++;p.solidBounces++;p.solidSkip=solid.solid.id;
     if(weapon.enemyBounce==='all'){
      const speed=Math.hypot(p.vx,p.vy);p.vx=enemyDir*Math.max(Math.abs(p.vx),speed*.05);
      if(p.vx*solid.nx+p.vy*solid.ny<0)p.vy=-p.vx*solid.nx/solid.ny+Math.sign(solid.ny)*speed*.05;
      const scale=speed/Math.hypot(p.vx,p.vy);p.vx*=scale;p.vy*=scale;
     }else if(weapon.enemyBounce===p.bounces){const wanted=Math.sign(units[1-side].x-p.x)||1,vx=wanted*Math.abs(p.vx);if(vx*solid.nx+p.vy*solid.ny>=0)p.vx=vx;}
     if(weapon.bounceDamage){p.budget=Math.min(weapon.damageCap,p.budget+weapon.bounceDamage);p.blast=Math.min(weapon.maxBlast,weapon.blast+p.bounces*weapon.bounceBlast);}
     events.push({type:'bounce',x:p.x,y:p.y,t:p.t,count:p.bounces,surface:material,solidId:solid.solid.id,bullet:p.id});p.path.push({x:p.x,y:p.y,t:p.t});
     if(weapon.reflectSplit&&reflective&&!p.reflectedSplit){events.push({type:'reflect-split',x:p.x,y:p.y,t:p.t,bullet:p.id});for(let i=-1;i<=1;i++){const a=i*.19,c=Math.cos(a),sn=Math.sin(a);queue.push({...p,id:bulletId++,vx:p.vx*c-p.vy*sn,vy:p.vx*sn+p.vy*c,budget:p.budget/3,reflectedSplit:true,primary:false,start:p.t,path:[{x:p.x,y:p.y,t:p.t}],appearance:{color:['#ff8faa','#94e3f3','#c4b2ff'][i+1]},forceEntries:new Set(p.forceEntries),clouds:new Set(p.clouds),magnetTime:{...p.magnetTime}});}ended=true;break;}continue;
    }else if(weapon.roller&&!p.roll&&solid.ny<-.5){p.roll=.001;p.vx=Math.sign(p.vx)*(weapon.rollSpeed||180);p.vy=0;p.y=solid.y-3;p.x=solid.x;p.solidSkip=solid.solid.id;p.path.push({x:p.x,y:p.y,t:p.t});events.push({type:'roll',x:p.x,y:p.y,t:p.t,bullet:p.id});continue;}
   }
   p.x=stop?stop.x:next.x;p.y=stop?stop.y:next.y;
   p.path.push({x:p.x,y:p.y,t:p.t});
   if(p.solidSkip&&!G.inside(p,simWorld.solids.find(o=>o.id===p.solidSkip)?.poly||[]))p.solidSkip=null;
   if(p.phaseSolid){
    const o=simWorld.solids.find(o=>o.id===p.phaseSolid);if(!o){p.phaseSolid=null;p.phaseExit=false;if(weapon.penetrating)p.phaseUsed=false;}else{const travel=phaseTravel(old,p,o.poly,p.phaseRemaining);p.phaseRemaining-=travel.used;
    if(travel.stop){p.x=travel.stop.x;p.y=travel.stop.y;p.path[p.path.length-1]={x:p.x,y:p.y,t:p.t};explode(p);ended=true;break;}
    if(!G.inside(p,o.poly)&&p.phaseExit){if(weapon.penetrating){p.phaseUsed=false;if(o.destructible){destroyed.add(o.id);events.push({type:'break',solidId:o.id,x:p.x,y:p.y,t:p.t,bullet:p.id});simWorld=G.without(simWorld,[o.id]);}}p.phaseSolid=null;p.phaseExit=false;}}
   }
   if(stop){const contact=stop.solid?{x:stop.x,y:stop.y,nx:stop.nx,ny:stop.ny,solidId:stop.solid.id}: {x:stop.x,y:stop.y,nx:Math.sign(stop.x-units[stop.unit].x)||-Math.sign(p.vx),ny:0,unit:stop.unit};
    if(weapon.pullToImpact){const j=1-side,u=units[j],center=centerOf(j),from={x:u.x,y:u.y,slope:u.slope,surface:u.surface},point={x:p.x,y:p.y-2};
     const capture=timed&&weapon.captureDamage?areaContact(p,j,weapon.pullRadius):null;
     if(weapon.gravityWell)events.push({type:'gravity-well',x:p.x,y:p.y,t:p.t,duration:weapon.pullSeconds,radius:weapon.pullRadius,bullet:p.id});
     if(weapon.captureDamage?!!capture:Math.hypot(p.x-center.x,p.y-center.y)<=weapon.pullRadius&&clearTo(point,center)){
      const dx=G.clamp(p.x-u.x,-weapon.pullDistance,weapon.pullDistance)*(s.spec.boss&&j===1?.25:1);
      if(u.floating){const x=G.clamp(u.x+dx,u.range[0],u.range[1]);if(Math.abs(x-units[side].x)>100&&G.lineClear(simWorld,center,{x,y:center.y}))u.x=x;}
      else G.move({...simState,world:simWorld},j,dx);
      if(Math.abs(u.x-from.x)>.01||Math.abs(u.y-from.y)>.01)events.push({type:'pull',x:p.x,y:p.y,t:p.t,unit:j,from,to:{x:u.x,y:u.y,slope:u.slope,surface:u.surface},duration:weapon.pullSeconds,bullet:p.id});
     }
     const time=p.t+weapon.pullSeconds;queue.push({...p,id:bulletId++,effect:'compression',captureHit:capture,effectHit:capture|| (target===stop?target:null),effectContact:contact,t:time,start:time,path:[{x:p.x,y:p.y,t:time}]});
    }else explode(p,target===stop?target:null,contact);ended=true;break;}
   if(p.convergeBranch&&p.age>=(weapon.convergeSeconds||.14)-1e-8){finishConvergence(p,true);ended=true;break;}
   if(p.redirected&&weapon.redirectLinear)continue;
   let ax=0,ay=GRAVITY*weapon.gravity*(s.skillEffects?.gravity?.factor||1)*(p.archerDone?2.8:1);
   if(weapon.redirectOnce&&!p.redirected&&p.age>=weapon.redirectOnce)redirectAt(p);
   const field=s.effects?.gravityField;if(field&&field.charges?.[side]>0&&Math.hypot(p.x-field.x,p.y-field.y)<field.radius){const theta=Math.atan2(field.y-p.y,field.x-p.x),a=G.clamp(Math.atan2(Math.sin(theta-Math.atan2(p.vy,p.vx)),Math.cos(theta-Math.atan2(p.vy,p.vx))),-1,1)*DT*.9,c=Math.cos(a),sn=Math.sin(a),vx=p.vx;p.vx=vx*c-p.vy*sn;p.vy=vx*sn+p.vy*c;if(!p.fieldEntered){p.fieldEntered=true;events.push({type:'gravity-bend',x:p.x,y:p.y,t:p.t,bullet:p.id});}}
   if(curve&&p.age<=1.2){const a=curve*DT,c=Math.cos(a),sn=Math.sin(a),vx=p.vx;p.vx=vx*c-p.vy*sn;p.vy=vx*sn+p.vy*c;}
   for(const r of simWorld.regions){
    if(!r.on||(r.kind==='C'&&p.clouds.has(r.id))||!inRegion(p,r))continue;
    if(r.kind!=='C'&&!p.forceEntries.has(r.id)){p.forceEntries.add(r.id);events.push({type:{U:'updraft',F:'wind',V:'vent',M:'magnet'}[r.kind],x:p.x,y:p.y,t:p.t,bullet:p.id});}
    if(r.kind==='C'&&!p.clouds.has(r.id)){p.clouds.add(r.id);p.vx*=r.slow;p.vy*=r.slow;events.push({type:'cloud',x:p.x,y:p.y,t:p.t,bullet:p.id});}
    if(r.kind==='U')ay-=GRAVITY*1.15;
    if(r.kind==='V')ay-=GRAVITY*1.6;
    if(r.kind==='F')ax+=GRAVITY*r.strength*r.direction;
    if(r.kind==='M'){
     const time=p.magnetTime[r.id]||0;p.magnetTime[r.id]=time+DT;
     if(time<1.2){const a=DT*Math.PI/3*r.direction*r.strength,cos=Math.cos(a),sin=Math.sin(a),vx=p.vx;p.vx=vx*cos-p.vy*sin;p.vy=vx*sin+p.vy*cos;}
    }
   }
   if(!p.roll){const oldVy=p.vy;p.vx=G.clamp(p.vx+G.clamp(ax,-300,300)*DT,-(weapon.maxVelocity||900),weapon.maxVelocity||900);p.vy=G.clamp(p.vy+G.clamp(ay,-400,600)*DT,-(weapon.maxVelocity||700),weapon.maxVelocity||900);
    if(oldVy<0&&p.vy>=0){
     if(weapon.redirectAtApex&&!p.redirected){redirectAt(p);continue;}
     if(weapon.apexBurst){events.push({type:'apex-burst',x:p.x,y:p.y,t:p.t,bullet:p.id});explode(p);ended=true;break;}
     if(weapon.archer&&!p.archerDone){p.vx*=.25;p.vy=Math.max(110,p.vy);p.archerDone=true;events.push({type:'dive',x:p.x,y:p.y,t:p.t,bullet:p.id});}
     if(!p.splitDone&&(weapon.split||skill==='SPLIT'&&p.primary)){
      p.splitDone=true;events.push({type:'split',x:p.x,y:p.y,t:p.t,bullet:p.id});
      if(weapon.twoWave){
       for(let wave=0;wave<2;wave++)for(let i=0;i<3;i++){
        const x=p.x+(i-1)*48+wave*24,y=p.y,time=p.t+wave*.42;
        queue.push({...p,id:bulletId++,x,y,vx:p.vx*.12,vy:130,budget:weapon.damage,primary:false,start:time,t:time,age:0,splitDone:true,path:[{x,y,t:time}],forceEntries:new Set(p.forceEntries),clouds:new Set(p.clouds),magnetTime:{}});
       }
       ended=true;break;
      }
      const offsets=weapon.splitCount?Array.from({length:weapon.splitCount},(_,i)=>-weapon.splitSpread+2*weapon.splitSpread*i/(weapon.splitCount-1)):[-16,0,16];
      for(const off of offsets){const a=off*Math.PI/180,v=Math.max(110,Math.hypot(p.vx,p.vy)*.85),c={...p,id:bulletId++,vx:weapon.fallingChildren?Math.sin(a)*v:p.vx*Math.cos(a)-p.vy*Math.sin(a),vy:weapon.fallingChildren?Math.cos(a)*v:p.vx*Math.sin(a)+p.vy*Math.cos(a),budget:weapon.splitChildDamage??p.budget/3,primary:false,...(weapon.spiral?{spiralPhase:offsets.indexOf(off)*Math.PI*2/3,spiralStart:p.age}:{}),start:p.t,path:[{x:p.x,y:p.y,t:p.t}],forceEntries:new Set(p.forceEntries),initialBounces:p.bounces,clouds:new Set(p.clouds),magnetTime:{...p.magnetTime}};queue.push(c);}
      ended=true;break;
     }
    }
   }
   if(weapon.airburst){const u=units[1-side],center=weapon.special?centerOf(1-side):bodyCenter({...s,units},1-side);if(Math.hypot(p.x-center.x,p.y-center.y)<(weapon.proximity||80)&&G.lineClear(simWorld,p,center)){explode(p,{unit:1-side,kind:'airburst'});ended=true;break;}}
  }
  if(!ended)queue.push(p);
 }
 // Aggregate once per attack; no part/body double counting, no multi-bullet overkill bonus.
 const rawDamage=damage.slice();if(!timed){damage[1]*=boost;for(const id of Object.keys(partDamage))partDamage[id]*=boost;}
 const cap=weapon.damageCap?(s.spec.boss?weapon.bossDamageCap||weapon.damageCap:weapon.damageCap):s.spec.boss?2:events.some(e=>e.type==='critical')?1.875:1.25;
 if(!timed){damage[1]=Math.min(side===1?1:cap,damage[1]);damage[0]=Math.min(finalEnemy?(weapon.enemyDamageCap??1):1,damage[0]);}
 if(side===1&&s.skillEffects){const f=s.skillEffects;damage[0]*=f.invincible?0:(f.barrier?.factor??1)*(f.weaken?.factor??1);}
 const guarded=side===1&&!!s.guardActive;if(guarded)damage[0]*=.5;
 if(!timed&&side===0&&(W.activeIds.includes(weapon.id)||weapon.special&&weapon.progressiveDamage)){
  const total=Object.values(partDamage).reduce((sum,n)=>sum+n,0),scale=total>cap?cap/total:1;
  for(const id of Object.keys(partDamage))partDamage[id]*=scale;
 }else if(!timed&&weapon.damageCap)for(const id of Object.keys(partDamage))partDamage[id]=Math.min(cap,partDamage[id]);
 if(!timed)for(const e of events)if(e.type==='damage')e.value*=rawDamage[e.unit]?damage[e.unit]/rawDamage[e.unit]:0;
 const duration=Math.max(...bullets.map(b=>b.t),...events.map(e=>e.t+(e.duration||0)),.01);
 events.sort((a,b)=>a.t-b.t);
 return {playerTarget:{...bodyCenter(s,0),radius:weapon.needle?25:31},destroyed:[...destroyed],teleport:!!weapon.teleport,teleportContact:weapon.teleport?impacts[0]?.contact:null,side,angle,power,weaponId:weapon.id,skill,bullets,events,impacts,damage,partDamage,duration,iterations,appliedEvents:0,resolved:false,path:bullets[0].path,end:impacts.at(-1)||bullets.at(-1).path.at(-1),hit:impacts.find(i=>i.hit)?.hit?.unit??-1,...(guarded?{guarded:true}:{})};
}
const api={simulate,beamGeometry,inRegion,launchSpeed,DT,GRAVITY};if(typeof module!=='undefined')module.exports=api;else root.ArcPhysics=api;
})(globalThis);
