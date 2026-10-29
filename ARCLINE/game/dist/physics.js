(function(root){
'use strict';
const G=typeof module!=='undefined'?require('./geometry.js'):root.ArcGeometry;
const W=typeof module!=='undefined'?require('./weapons.js'):root.ArcWeapons;
const DT=1/90,GRAVITY=300;
function inRegion(p,r){return r.kind==='M'?Math.hypot(p.x-r.x,p.y-r.y)<r.radius:p.x>=r.x1&&p.x<=r.x2&&p.y>=r.y1&&p.y<=r.y2;}
function hitTargets(s,side,a,b,age,weapon){
 let best=null;
 function test(c,r,kind,unit,part=-1){const t=G.circle(a,b,c,r);if(t!==null&&(!best||t<best.t))best={t,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,kind,unit,part};}
 for(let j=0;j<2;j++){
  if(j===side&&age<.22)continue;const u=s.units[j];if(j===1&&s.spec.boss){
   const exposed=u.exposed>0||s.spec.id===100&&s.bossPhase===2;
   const broken=u.parts.filter(p=>p.hp<=0).length,wide=exposed?44:broken?38:26;
   test({x:u.x+(u.facingCore||0)*20,y:u.y-77},wide,'weak',j);
   if(broken>0||exposed)test({x:u.x-35,y:u.y-42},wide,'weak',j);
   u.parts.forEach((p,i)=>{if(p.hp>0)test({x:u.x+p.dx,y:u.y+p.dy},p.radius,'part',j,i);});
   test({x:u.x,y:u.y-38},58,'body',j);
  }else {const before=best;test({x:u.x,y:u.y-22},weapon.needle?25:31,'body',j);if(best!==before&&best?.unit===j&&side===0&&j===1&&!weapon.teleport){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),cx=u.x-a.x,cy=u.y-22-a.y;best.critical=len>0&&Math.abs(cx*dy-cy*dx)/len<=15&&(cx*dx+cy*dy)>=0;}}

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
function simulate(s,side,angle,power,options={}){
 const weapon=W.get(options.weaponId||'W01'),skill=options.skill||null;
 const provided=options.origin,origin=provided&&[provided.x,provided.y,provided.theta].every(Number.isFinite)?provided:G.muzzle(s,side,Math.max(weapon.minAngle||-15,angle));
 const startDelay=G.clamp(Number(options.startDelay)||0,0,2),curve=G.clamp(Number(options.curve)||0,-1.5,1.5);
 let simWorld=s.world;const destroyed=new Set();
 const events=[],bullets=[],impacts=[],damage=[0,0],partDamage={},seenPickups=new Set(),seenTerminals=new Set();let iterations=0,bulletId=0;
 const damageBudget=weapon.damage;
 const newBullet=(offset=0,delay=0,budget=damageBudget,primary=true,source=origin,powerValue=power)=>{
  delay+=startDelay;const a=source.theta+offset*Math.PI/180,v=G.clamp(powerValue,20,100)*6.7*weapon.speed;
  return {id:bulletId++,x:source.x,y:source.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:delay,start:delay,age:0,budget,primary,path:[{x:source.x,y:source.y,t:delay}],forceEntries:new Set(),initialBounces:0,clouds:new Set(),magnetTime:{},bounces:0,solidBounces:0,phaseRemaining:Math.max(weapon.phase||0,skill==='PHASE'?60:0),phaseUsed:false,phaseSolid:null,phaseExit:false,solidSkip:null,splitDone:false,archerDone:false,roll:0,rollDistance:0};
 };
 const queue=[];
 if(options.volley?.length){for(const v of options.volley)queue.push(newBullet(v.offset||0,v.delay||0,damageBudget,true,v.origin||origin,v.power??power));}
 else if(weapon.fan){for(const o of (skill==='SPLIT'?[-15,0,15]:[-13,0,13])){const bullet=newBullet(o,0,damageBudget/3,o===0);bullet.splitDone=true;queue.push(bullet);}}
 else if(weapon.twin){queue.push(newBullet(-3,0,damageBudget/2));queue.push(newBullet(3,.25,damageBudget/2,false));}
 else queue.push(newBullet());
 if(curve)events.push({type:'curve',x:origin.x,y:origin.y,t:startDelay,bullet:0});
 function explode(p,hit=null,contact=null){
  const end={x:p.x,y:p.y,t:p.t};impacts.push({...end,hit,contact,bullet:p.id});
  if(weapon.teleport){events.push({...end,type:'teleport-contact',bullet:p.id,contact});return;}
  events.push({...end,type:hit?.critical?'critical':hit?.kind==='weak'?'weak':hit?.kind==='part'?'part':hit?.kind==='airburst'?'airburst':'impact',bullet:p.id});
  const broken=simWorld.solids.filter(o=>o.destructible&&(o.id===contact?.solidId||o.poly.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<weapon.blast*(skill==='BURST'?1.5:1)*.65)));
  if(broken.length){for(const o of broken){destroyed.add(o.id);events.push({...end,type:'break',solidId:o.id,bullet:p.id});}simWorld=G.without(simWorld,broken.map(o=>o.id));}
  const blast=weapon.blast*(skill==='BURST'?1.5:1);
  const waves=[];
  if(weapon.wave){for(const dir of [-1,1]){let current=G.surfaceAt(simWorld,p.x,p.y,30);const path=[];if(current)for(let distance=0;distance<=(weapon.waveDistance||180);distance+=5){const x=p.x+dir*distance,next=G.surfaceAt(simWorld,x,current.y,12);if(!next||!G.lineClear(simWorld,{x:current.x,y:current.y-4},{x,y:next.y-4}))break;current=next;path.push({x,y:next.y-4});}if(path.length){waves.push(path);events.push({type:'wave',x:p.x,y:p.y,t:p.t,path,bullet:p.id});}}}
  for(let j=0;j<2;j++){
   const u=s.units[j],center={x:u.x,y:u.y-(j===1&&s.spec.boss?38:22)},d=Math.hypot(p.x-center.x,p.y-center.y);
   let value=0;
   if(hit?.unit===j)value=p.budget*(hit.kind==='weak'?2:hit.critical?1.5:1);
   else if(d<blast+ (j===1&&s.spec.boss?35:12)&&G.lineClear(simWorld,{x:p.x,y:p.y-2},center))value=p.budget*(skill==='BURST'&&d<blast*.7?1:.5);
   if(weapon.wave&&waves.some(path=>path.some(q=>Math.abs(q.x-u.x)<28&&Math.abs(q.y-u.y)<25)))value=Math.max(value,p.budget);
   damage[j]+=value;
  }
  if(hit?.kind==='part')partDamage[hit.part]=(partDamage[hit.part]||0)+p.budget;
 }
 const seenBullets=new Set();
 // Advance the earliest projectile by one fixed step. Every projectile sees
 // the same world at contact time, including delayed shots and split children.
 while(queue.length){
  queue.sort((a,b)=>a.t-b.t||a.id-b.id);const p=queue.shift();if(!seenBullets.has(p.id)){seenBullets.add(p.id);bullets.push(p);}let ended=false;
  for(let steps=0;steps<1;steps++){
   iterations++;
   if(p.age>=8-1e-9||p.x< -40||p.x>1040||p.y>560||p.y< -1600){events.push({x:p.x,y:p.y,t:p.t,type:'expired',bullet:p.id});ended=true;break;}
   const old={x:p.x,y:p.y};let next={x:p.x+p.vx*DT,y:p.y+p.vy*DT};
   if(p.roll){
    const f=G.surfaceAt(simWorld,next.x,p.y+3,15);
    if(!f||p.rollDistance>=(weapon.rollDistance||220)||p.roll>=1.6){explode(p);ended=true;break;}
    next.y=f.y-3;p.roll+=DT;p.rollDistance+=Math.abs(next.x-old.x);
   }
   const target=hitTargets(s,side,old,next,p.age,weapon);
   let solid=G.sweep(simWorld,old,next,p.solidSkip||p.phaseSolid);
   let stop=target&&(!solid||target.t<=solid.t)?target:solid;
   const travelEnd=stop?{x:stop.x,y:stop.y}:next;
   // Transparent contacts are sorted along this swept step and processed before impact.
   const contacts=[];
   if(side===0&&!weapon.teleport){
    for(const c of s.pickups){if(c.collected||seenPickups.has(c.id))continue;const t=G.circle(old,travelEnd,c,c.radius||22);if(t!==null)contacts.push({t,c,type:'pickup'});}
    for(const c of simWorld.terminals){if(seenTerminals.has(c.id))continue;const t=G.circle(old,travelEnd,c,c.radius);if(t!==null)contacts.push({t,c,type:'terminal'});}
   }
   contacts.sort((a,b)=>a.t-b.t).forEach(({t,c,type})=>{
    if(type==='pickup'){
     if(c.id[0]==='R'&&s.skills[c.skill]>=s.skillCaps[c.skill])return;
     seenPickups.add(c.id);
    }else seenTerminals.add(c.id);
    events.push({type,id:c.id,x:c.x,y:c.y,t:p.t+DT*t*(stop?.t??1),bullet:p.id});
   });
   p.t+=DT;p.age+=DT;
   if(solid&&stop===solid&&!weapon.teleport){
    const material=solid.solid.kind,reflective=material==='reflector'||material==='crystal';
    const canPhase=material!=='floor'&&material!=='reflector'&&(skill==='PHASE'||['solid','roof','bridge','fragile'].includes(material));
    if(!p.phaseUsed&&p.phaseRemaining>0&&canPhase){p.phaseUsed=true;p.phaseSolid=solid.solid.id;p.phaseExit=true;events.push({type:'phase',x:solid.x,y:solid.y,t:p.t,bullet:p.id});stop=null;}
    else if(p.bounces<3&&(reflective||p.solidBounces<weapon.bounces||skill==='BOUNCE'&&p.solidBounces<1)){
     const restitution=weapon.restitution||.9,dot=p.vx*solid.nx+p.vy*solid.ny;p.vx=(p.vx-2*dot*solid.nx)*restitution;p.vy=(p.vy-2*dot*solid.ny)*restitution;
     if(weapon.hop&&solid.ny<-.5)p.vy=-Math.max(150,Math.abs(p.vy)*1.1);
     if(weapon.skipper&&solid.ny<-.5){p.vx*=.98;p.vy=-Math.max(55,Math.min(95,Math.abs(p.vy)*.3));}
     p.x=solid.x+solid.nx*1.5;p.y=solid.y+solid.ny*1.5;p.bounces++;p.solidBounces++;p.solidSkip=solid.solid.id;
     events.push({type:'bounce',x:p.x,y:p.y,t:p.t,count:p.bounces,surface:material,solidId:solid.solid.id,bullet:p.id});p.path.push({x:p.x,y:p.y,t:p.t});continue;
    }else if(weapon.roller&&!p.roll&&solid.ny<-.5){p.roll=.001;p.vx=Math.sign(p.vx)*(weapon.rollSpeed||180);p.vy=0;p.y=solid.y-3;p.x=solid.x;p.solidSkip=solid.solid.id;p.path.push({x:p.x,y:p.y,t:p.t});events.push({type:'roll',x:p.x,y:p.y,t:p.t,bullet:p.id});continue;}
   }
   p.x=stop?stop.x:next.x;p.y=stop?stop.y:next.y;
   p.path.push({x:p.x,y:p.y,t:p.t});
   if(p.solidSkip&&!G.inside(p,simWorld.solids.find(o=>o.id===p.solidSkip)?.poly||[]))p.solidSkip=null;
   if(p.phaseSolid){
    const o=simWorld.solids.find(o=>o.id===p.phaseSolid);if(!o){p.phaseSolid=null;p.phaseExit=false;}else{const travel=phaseTravel(old,p,o.poly,p.phaseRemaining);p.phaseRemaining-=travel.used;
    if(travel.stop){p.x=travel.stop.x;p.y=travel.stop.y;p.path[p.path.length-1]={x:p.x,y:p.y,t:p.t};explode(p);ended=true;break;}
    if(!G.inside(p,o.poly)&&p.phaseExit){p.phaseSolid=null;p.phaseExit=false;}}
   }
   if(stop){const contact=stop.solid?{x:stop.x,y:stop.y,nx:stop.nx,ny:stop.ny,solidId:stop.solid.id}: {x:stop.x,y:stop.y,nx:Math.sign(stop.x-s.units[stop.unit].x)||-Math.sign(p.vx),ny:0,unit:stop.unit};explode(p,target===stop?target:null,contact);ended=true;break;}
   let ax=0,ay=GRAVITY*weapon.gravity*(p.archerDone?2.8:1);
   if(curve&&p.age<=1.2){const a=curve*DT,c=Math.cos(a),sn=Math.sin(a),vx=p.vx;p.vx=vx*c-p.vy*sn;p.vy=vx*sn+p.vy*c;}
   for(const r of simWorld.regions){
    if(!r.on||!inRegion(p,r))continue;
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
   if(!p.roll){const oldVy=p.vy;p.vx=G.clamp(p.vx+G.clamp(ax,-300,300)*DT,-900,900);p.vy=G.clamp(p.vy+G.clamp(ay,-400,600)*DT,-700,900);
    if(oldVy<0&&p.vy>=0){
     if(weapon.archer&&!p.archerDone){p.vx*=.25;p.vy=Math.max(110,p.vy);p.archerDone=true;events.push({type:'dive',x:p.x,y:p.y,t:p.t,bullet:p.id});}
     if(!p.splitDone&&(weapon.split||skill==='SPLIT'&&p.primary)){
      p.splitDone=true;events.push({type:'split',x:p.x,y:p.y,t:p.t,bullet:p.id});
      for(const off of [-16,0,16]){const a=off*Math.PI/180,c={...p,id:bulletId++,vx:p.vx*Math.cos(a)-p.vy*Math.sin(a),vy:p.vx*Math.sin(a)+p.vy*Math.cos(a),budget:p.budget/3,primary:false,start:p.t,path:[{x:p.x,y:p.y,t:p.t}],forceEntries:new Set(p.forceEntries),initialBounces:p.bounces,clouds:new Set(p.clouds),magnetTime:{...p.magnetTime}};queue.push(c);}
      ended=true;break;
     }
    }
   }
   if(weapon.airburst){const u=s.units[1-side];if(Math.hypot(p.x-u.x,p.y-(u.y-22))<(weapon.proximity||80)&&G.lineClear(simWorld,p,{x:u.x,y:u.y-22})){explode(p,{unit:1-side,kind:'airburst'});ended=true;break;}}
  }
  if(!ended)queue.push(p);
 }
 // Aggregate once per attack; no part/body double counting, no multi-bullet overkill bonus.
 const cap=s.spec.boss?2:events.some(e=>e.type==='critical')?1.875:1.25;
 damage[1]=Math.min(side===1?1:cap,damage[1]);damage[0]=Math.min(1,damage[0]);
 const duration=Math.max(...bullets.map(b=>b.t),.01);
 events.sort((a,b)=>a.t-b.t);
 return {destroyed:[...destroyed],teleport:!!weapon.teleport,teleportContact:weapon.teleport?impacts[0]?.contact:null,side,angle,power,weaponId:weapon.id,skill,bullets,events,impacts,damage,partDamage,duration,iterations,appliedEvents:0,resolved:false,path:bullets[0].path,end:impacts.at(-1)||bullets.at(-1).path.at(-1),hit:impacts.find(i=>i.hit)?.hit?.unit??-1};
}
const api={simulate,inRegion,DT,GRAVITY};if(typeof module!=='undefined')module.exports=api;else root.ArcPhysics=api;
})(globalThis);
