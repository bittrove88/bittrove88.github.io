(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.ArcEngine,G=E.geometry;
const L=typeof module!=='undefined'?require('./lessons.js'):root.ArcLessons;
const clone=value=>JSON.parse(JSON.stringify(value));
const titles={controls:'HOLD · RELEASE',slope:'MOVE · AIM',height:'CHANGE YOUR POSITION',pickup:'SHOOT THE CAPSULE',reflection:'REFLECTIVE GROUND',W:'REFLECTIVE GROUND',B:'OPEN · CLOSED',C:'CLOUD SLOWS THE SHOT',K:'BOUNCE OFF THE MIRROR',U:'RIDE THE UPDRAFT',F:'LET THE WIND CARRY',V:'VENT ON · OFF',M:'FOLLOW THE CURVE',terminal:'SWITCH THE FIELD',roof:'SHOOT UNDER THE ROOF',BURST:'A WIDER BLAST',BLINK:'CHOOSE A LANDING',PUSH:'PUSH THE RIVAL',PULL:'PULL THE RIVAL',BOUNCE:'ADD ONE BOUNCE',SPLIT:'SPLIT AT THE TOP',PHASE:'THROUGH A THIN WALL',SWAP:'EXCHANGE POSITIONS','boss-swap':'TURN THE CORE','ceiling-lift':'STAY BELOW THE ROOF','gate-choices':'CHOOSE YOUR ENTRANCE'};
for(const id of L.ids)titles[id]=L.describe(id).title;
const eventFor={'boss-core':'part',reflection:'bounce',W:'bounce',B:'impact',C:'cloud',K:'bounce',U:'updraft',F:'wind',V:'vent',M:'magnet',terminal:'terminal',pickup:'pickup',BOUNCE:'bounce',SPLIT:'split',PHASE:'phase',BURST:'impact',W05:'bounce',W06:'bounce',W07:'roll',W08:'bounce',W09:'impact',W10:'split',W11:'impact',W12:'airburst',W13:'phase',W15:'dive',W16:'wave',W20:'bounce'};
function snapshot(s){const copy=clone(s);copy.random=E.seeded(s.stage*997);copy.phase='aim';copy.turn=0;copy.result=null;copy.reason=null;return copy;}
function fixture(source,id){
 const s=snapshot(source),skills=E.skills.includes(id)?{[id]:3}:{};
 const spec={...clone(source.spec),boss:false,midboss:false,encounterKind:'normal',encounterId:'enemy:pebble',midbossSpec:null,bossSpec:null,components:[],teleport:false,floors:[[[0,12],[100,12]]],features:[],staticFeatures:[],phaseFeatures:null,blink:[[33,12],[47,12]],skills,ventStartsOn:true};
 if(['reflection','W','W08','W20'].includes(id))spec.features=[{type:'W',v:[28,68,12]}];
 if(id==='K')spec.features=[{type:'K',v:[54,22,38]}];
 if(id==='PHASE')spec.features=[{type:'S',v:[43,48,0,32]}];
 if(id==='W13')spec.components=[{id:'demo-drill',destructible:true,poly:[[43,32],[45,32],[45,0],[43,0]]}];
 if(['W04','roof','ceiling-lift'].includes(id))spec.features=[{type:'R',v:[40,63,25]}];
 if(['B','gate-choices'].includes(id))spec.features=[{type:'B',v:[44,12,20,1]}];
 if(['C','U','F','V'].includes(id))spec.features=[{type:id,v:[36,56,4,34]}];
 if(id==='M'||id==='terminal')spec.features=[{type:'M',v:[48,24,13,1]},...(id==='terminal'?[{type:'T',v:[34,22]}]:[])];
 if(id==='W19')spec.floors=[[[0,12],[60,12]],[[62,21],[100,21]]];
 if(id==='height'||id==='slope')spec.floors=[[[0,12],[22,12],[42,22],[100,22]]];
 s.spec=spec;s.world=G.world(spec);s.stage=source.stage;s.skills=skills;s.skillCaps=Object.fromEntries(Object.entries(skills).map(([k])=>[k,4]));s.selectedSkill=E.skills.includes(id)&&id!=='BLINK'?id:null;s.skillUsed=false;s.bossPhase=0;s.effects={broken:0,polarity:0,destroyed:[]};s.teleportMode=false;s.pendingChanges=[];s.last=[null,null];s.telegraph=null;
 const profile=s.characterId?E.combat.get(s.characterId):null,near=profile?Math.max(300,Math.min(720,160+360*profile.normal.speed**2/profile.normal.gravity)):720;
 const targetX=({W07:500,W11:420,W13:560,PHASE:620,W16:520})[id]||(id==='W19'?575:/^W\d\d$/.test(id)&&id!=='W01'?720:near),hp=profile?profile.hp/E.combat.pointsPerUnit:5;
 s.units=[{...G.safePosition(s.world,160,380),hp,maxHp:hp,parts:[],range:[35,650],exposed:0},{...G.safePosition(s.world,targetX,380),hp:3,maxHp:3,parts:[],range:[250,965],exposed:0}];
 s.blink=spec.blink.map(([x,h])=>G.safePosition(s.world,x*10,500-h*10,s.units[1],s.units[0].range)).filter(Boolean);
 s.pickups=id==='pickup'?[{id:'S-demo',name:'Capsule',x:380,y:280,radius:24,collected:false}]:[];
 s.mode=/^W\d\d$/.test(id)?id:'W01';s.weaponId=s.mode;s.weaponStock=s.mode==='W01'?{}:{[s.mode]:3};s.pendingLoot=[];s.shotCount=0;s.guardActive=false;delete s.repair;s.angle=48;s.power=65;s._preview=true;
 return s;
}
function useful(s,id,plan){
 if(id==='boss-core')return plan.events.some(e=>e.type==='part'||e.type==='weak')&&plan.damage[1]>0;
 if(id==='reflection'||id==='W')return plan.events.some(e=>e.type==='bounce'&&e.surface==='reflector');
 if(id==='K')return plan.events.some(e=>e.type==='bounce'&&e.surface==='crystal');
 if(['C','U','F','V','M'].includes(id)){
  const event=plan.events.find(e=>e.type===eventFor[id]);if(!event)return false;
  const time=Math.min(plan.duration,event.t+.4);if(time-event.t<.15)return false;
  const unchanged=snapshot(s);unchanged.world.regions=unchanged.world.regions.filter(r=>r.kind!==id);
  const baseline=E.trajectory(unchanged,0,plan.angle,plan.power),at=(p,t)=>p.path.find(q=>q.t>=t)||p.path.at(-1),a=at(plan,time),b=at(baseline,time);
  return Math.hypot(a.x-b.x,a.y-b.y)>6;
 }
 if(id==='terminal'){
  if(!plan.events.some(e=>e.type==='terminal'))return false;
  const after=snapshot(s);E.applyEvents(after,clone(plan),Infinity);E.boundary(after);
  return after.world.regions.some(r=>r.kind==='M'&&r.direction!==s.world.regions.find(v=>v.id===r.id)?.direction);
 }
 if(id==='W09')return plan.bullets.length===3&&plan.damage[1]>.1;
 if(id==='W11')return plan.bullets.length===2&&plan.impacts.filter(i=>i.hit?.unit===1).length===2;
 if(id==='W02')return plan.damage[1]>=1.2;
 if(id==='BURST'){const plain=E.trajectory(s,0,plan.angle,plan.power,{skill:null});return plan.damage[1]>plain.damage[1]+.1;}
 if(['PHASE','W13'].includes(id)){
  const event=plan.events.find(e=>e.type==='phase'),wall=event&&s.world.solids.find(o=>(id==='W13'?o.destructible:o.kind==='solid')&&event.x>=Math.min(...o.poly.map(p=>p.x))-1&&event.x<=Math.max(...o.poly.map(p=>p.x))+1);
  return !!wall&&plan.bullets.some(b=>b.path.some(p=>p.t>event.t&&p.x>Math.max(...wall.poly.map(q=>q.x))+8))&&plan.damage[1]>.1;
 }
 if(['W05','W06','W07','W08','W15','W16','W20'].includes(id)){
  const event=plan.events.find(e=>e.type===eventFor[id]);
  if(!event||plan.damage[1]<=0)return false;
  if(id==='W06'&&plan.events.filter(e=>e.type==='bounce').length<2)return false;
  if(id==='W08'&&plan.events.filter(e=>e.type==='bounce').length<2)return false;
  if(id==='W07'&&!plan.path.some(p=>p.t>event.t&&p.x>event.x+60&&Math.abs(p.y-event.y)<4))return false;
  if(id==='W16'&&!plan.events.some(e=>e.type==='wave'&&e.path.some(p=>Math.abs(p.x-s.units[1].x)<28)))return false;
  return true;
 }
 if(['PUSH','PULL','SWAP','W17','W18','W19','boss-swap'].includes(id)){
  if(plan.damage[1]<=0)return false;const after=snapshot(s);E.resolve(after,clone(plan));return after.units.some((u,i)=>Math.hypot(u.x-s.units[i].x,u.y-s.units[i].y)>8)||after.units[1].exposed>s.units[1].exposed;
 }
 if(id==='roof'||id==='ceiling-lift'){const roof=s.world.solids.find(o=>o.kind==='roof');return !!roof&&plan.bullets.some(b=>b.path.some(p=>p.x>roof.poly[0].x+10&&p.x<roof.poly[1].x-10&&p.y>roof.poly[2].y+6&&p.y<460));}
 const event=eventFor[id];return event?plan.events.some(e=>e.type===event):plan.damage[1]>.1;
}
function find(s,id){
 const angles=['W04'].includes(id)?[65,75,85,55,60,70,80]:[0,8,16,24,32,40,48,56,64,72,80,-12,-8,-4,4,12,20,28,36,44,52,60,68,76,84,85];
 for(const angle of angles)for(const power of [75,85,95,65,55,45,35,100,25,20]){const plan=E.trajectory(s,0,angle,power);if(useful(s,id,plan))return {plan,angle,power};}
 return null;
}
function bridgeState(s){
 const original=s.world.solids.find(o=>o.kind==='bridge');if(!original)return null;
 for(let round=s.round+1;round<=s.round+Math.max(6,(s.spec.hold||1)*3);round++){
  const second=snapshot(s);second.round=round;second.world=G.world(second.spec,round,second.bossPhase,second.effects);
  const next=second.world.solids.find(o=>o.id===original.id);
  if(next&&JSON.stringify(next.poly)!==JSON.stringify(original.poly))return second;
 }return null;
}
function bridgeHit(s,plan){
 return plan.bullets.some(b=>{if(b.path.length<2)return false;const end=b.path.at(-1),before=b.path.at(-2);return G.sweep(s.world,before,end)?.solid.kind==='bridge';});
}
function bridgeDemo(original){
 for(const state of [snapshot(original),fixture(original,'B')]){
  state.mode='W01';state.selectedSkill=null;const second=bridgeState(state);if(!second)continue;
  for(const angle of [0,8,16,24,32,40,48,56,64,-8])for(const power of [75,85,95,65,55,45,100,35]){
   const first=E.trajectory(state,0,angle,power),next=E.trajectory(second,0,angle,power);
   if(!(bridgeHit(state,first)||bridgeHit(second,next))||Math.hypot(first.end.x-next.end.x,first.end.y-next.end.y)<35)continue;
   const source=state._preview?'vignette':'stage',a=make(state,'B',{plan:first,angle,power},source),b=make(second,'B',{plan:next,angle,power},source),bridge=state.world.solids.find(o=>o.kind==='bridge');
   const focus={x:(bridge.poly[0].x+bridge.poly[1].x)/2,y:bridge.hinge.y-25,radius:150};
   for(const item of [a,b]){item.proof={event:'bridge-state',valid:true};item.focus={...focus,radius:170};const gate=item.before.world.solids.find(o=>o.kind==='bridge');item.label=gate.open?'GATE OPEN':'GATE CLOSED';item.annotation={x:focus.x,y:focus.y,label:item.label};}
   a.variants=[{...a,variants:undefined},b];a.duration=a.variants.reduce((n,v)=>n+v.duration,0);return a;
  }
 }return null;
}
function truncate(plan,time){
 const p=clone(plan);for(const b of p.bullets){b.path=b.path.filter(q=>q.t<=time);b.t=Math.min(b.t,time);}p.bullets=p.bullets.filter(b=>b.path.length);p.events=p.events.filter(e=>e.t<=time);p.impacts=p.impacts.filter(i=>i.t<=time);p.duration=Math.min(p.duration,time);p.damage=[0,0];p.partDamage={};p.end=p.impacts.at(-1)||p.bullets[0].path.at(-1);p.path=p.bullets[0].path;return p;
}
const playbackRate=.65,resultHold=1.65;
const annotations={controls:'HIT',aim:'HIGHER ARC',move:'MOVE',slope:'NEW POSITION',height:'HIGH GROUND',pickup:'COLLECTED',reflection:'BOUNCE',B:'GATE',C:'SLOWER',K:'REFLECT',U:'LIFT',F:'DRIFT',V:'LIFT',M:'BEND',terminal:'REVERSED',roof:'CLEAR',BURST:'WIDER BLAST',BLINK:'LAND',PUSH:'PUSH',PULL:'PULL',BOUNCE:'EXTRA BOUNCE',SPLIT:'SPLIT',PHASE:'THROUGH',SWAP:'SWAP','boss-core':'CORE','boss-swap':'CORE EXPOSED',W02:'WIDE BLAST',W03:'FAST',W04:'HIGH ARC',W05:'HOP',W06:'REBOUND',W07:'ROLL',W08:'SKIP',W09:'THREE SHOTS',W10:'SPLIT',W11:'TWO HITS',W12:'AIR BLAST',W13:'THROUGH',W14:'STRAIGHT',W15:'DIVE',W16:'GROUND WAVE',W17:'PUSH',W18:'PULL',W19:'LIFT',W20:'REBOUND'};
function decorate(result,id,source){
 const description=L.describe(id)||{title:titles[id],instruction:'Watch the action.',outcome:'Watch what changes.',context:'DEMO'};
 Object.assign(result,description,{id,title:description.title,source});
 if(source==='stage'&&!E.skills.includes(id)&&!/^W\d\d$/.test(id))result.context='THIS LEVEL';
 if(source==='boss-demo')result.context='BOSS DEMO';
 result.focus={...result.focus,radius:170};result.annotation={x:result.focus.x,y:result.focus.y,label:annotations[id]||description.title};
 result.cue={control:id==='controls'?'fire':id==='aim'?'aimStick':['move','slope','height'].includes(id)?'stick':E.skills.includes(id)?'skill':/^W\d\d$/.test(id)?'weapon':'feature',axis:id==='aim'?1:0};
 const points=result.plan?.bullets.flatMap(b=>b.path.filter((p,i)=>i%8===0||i===b.path.length-1)).filter(p=>p.x>=0&&p.x<=1000&&p.y>=-250&&p.y<=560)||[];
 result.framing={points:[...points,{x:result.before.units[0].x,y:result.before.units[0].y-30},result.focus],subjects:[0,...(/^W\d\d$/.test(id)||E.skills.includes(id)||id==='boss-core'||id==='boss-swap'||id==='controls'?[1]:[])]};
 return result;
}
function make(s,id,found,source){
 const before=snapshot(s);before.angle=found.angle;before.power=found.power;before.mode=s.mode;
 let plan=found.plan;const teachingEvent=plan.events.find(e=>e.type===eventFor[id]&&(id!=='reflection'||e.surface==='reflector'));
 // Stage lessons show a local interaction; equipment lessons use a labelled practice arena.
 if(source==='stage'&&!/^W\d\d$/.test(id)&&!E.skills.includes(id)){
  const firstHit=plan.impacts.find(i=>i.hit),end=Math.min(teachingEvent?teachingEvent.t+.65:1.1,firstHit?Math.max(.1,firstHit.t-.12):Infinity);
  if(end<plan.duration)plan=truncate(plan,end);
 }
 const after=snapshot(before);if(plan.damage.some(Boolean))E.resolve(after,clone(plan));else E.applyEvents(after,clone(plan),Infinity);
 if(id==='terminal'&&after.effects.pendingPolarity)E.boundary(after);
 const target=teachingEvent||plan.impacts.at(-1)||plan.path.at(-1),releaseAt=id==='controls'?(E.combat.get(before.characterId).charge.rise)*(found.power-20)/80:.85;
 const result=decorate({id,source,state:before,before,after,pose:{angle:found.angle,power:found.power,mode:before.mode,selectedSkill:before.selectedSkill},plan,proof:{event:eventFor[id]||'hit',valid:useful(s,id,plan)},releaseAt,flightStart:releaseAt,flightEnd:releaseAt+plan.duration/playbackRate,duration:releaseAt+plan.duration/playbackRate+resultHold,playbackRate,resultHold,focus:{x:target.x,y:target.y,radius:170}},id,source);
 result.annotationAt=teachingEvent?.t??plan.impacts.find(hit=>hit.hit?.unit===1)?.t??plan.duration;
 if(['C','U','F','V','M'].includes(id)){
  const plain=snapshot(before);plain.world.regions=plain.world.regions.filter(r=>r.kind!==id);
  const baseline=E.trajectory(plain,0,found.angle,found.power);
  result.comparison={path:baseline.path.filter(p=>p.t<=plan.duration),label:'WITHOUT FIELD'};
 }
 return result;
}
function motion(before,after,id,event){
 const result=decorate({id,state:before,before,after,pose:{angle:before.angle,power:20,mode:before.mode,selectedSkill:before.selectedSkill},plan:null,proof:{event,valid:true},releaseAt:.85,flightStart:.85,flightEnd:1.85,duration:3.5,resultHold,focus:{x:after.units[0].x,y:after.units[0].y-25,radius:170}},id,before._preview?'vignette':'stage');
 if(['move','slope','height'].includes(id))result.cue.axis=Math.sign(after.units[0].x-before.units[0].x);return result;
}
function aimDemo(original){
 const state=fixture(original,'aim');Object.assign(state.units[1],G.safePosition(state.world,700,380));state.mode='W01';state.selectedSkill=null;
 const variants=[24,64].map((angle,index)=>{
  const plan=E.trajectory(state,0,angle,65),p=make(state,'aim',{plan,angle,power:65},'vignette');
  p.proof={event:'aim',valid:plan.path.length>4};p.label=index?'HIGH AIM':'LOW AIM';p.motion={kind:'aim',fromAngle:index?24:64,toAngle:angle};p.cue={control:'aimStick',axis:index?1:-1};
  const apex=plan.path.reduce((a,b)=>b.y<a.y?b:a);p.focus={x:apex.x,y:apex.y,radius:170};p.annotation={x:apex.x,y:apex.y,label:index?'HIGH ARC':'LOW ARC'};p.annotationAt=apex.t;p.instruction=index?'Push AIM up.':'Pull AIM down.';p.outcome=index?'Higher aim raises the arc.':'Lower aim keeps the arc low.';
  return p;
 });
 const result={...variants[0],variants,duration:variants.reduce((sum,p)=>sum+p.duration,0)};result.proof={event:'aim',valid:variants.every(p=>p.proof.valid)&&variants[0].pose.angle!==variants[1].pose.angle};return result;
}
function bossCore(original){
 const state=snapshot(original);if(!state.spec.boss||!state.units[1].parts.some(p=>p.hp>0))return null;
 state.pickups=[];state.mode='W01';state.selectedSkill=null;
 function choose(s,kind){
  for(const angle of [0,8,16,24,32,40,48,56,64,72,80,-8,4,12,20,28,36,44,52,60,68,76,84])for(const power of [95,85,75,65,55,45,100,35,25,20]){
   const plan=E.trajectory(s,0,angle,power);
   if(kind==='part'&&Object.entries(plan.partDamage).some(([i,d])=>d>=s.units[1].parts[i].hp&&s.units[1].parts[i].hp>0))return {plan,angle,power};
   if(kind==='weak'&&plan.damage[1]>1){
    const u=s.units[1],center={x:u.x+(u.facingCore||0)*20,y:u.y-77},radius=u.exposed>0?44:u.parts.some(p=>p.hp<=0)?38:26;
    if(plan.impacts.some(hit=>hit.hit?.unit===1&&hit.hit.kind==='weak'&&Math.hypot(hit.x-center.x,hit.y-center.y)<=radius+1e-6))return {plan,angle,power};
   }
  }return null;
 }
 const first=choose(state,'part');if(!first)return null;
 const a=make(state,'boss-core',first,'boss-demo');a.label='BREAK ARMOR';a.annotation.label='ARMOR BROKEN';a.proof={event:'part',valid:a.after.units[1].parts.some((p,i)=>p.hp<=0&&a.before.units[1].parts[i].hp>0)};
 const opened=snapshot(a.after),second=choose(opened,'weak');if(!second)return null;
 const b=make(opened,'boss-core',second,'boss-demo');b.label='HIT THE CORE';b.proof={event:'weak',valid:second.plan.events.some(e=>e.type==='weak')};
 b.annotation={x:second.plan.impacts.find(i=>i.hit?.kind==='weak').x,y:second.plan.impacts.find(i=>i.hit?.kind==='weak').y,label:'CORE ×2'};
 const result={...a,variants:[a,b],duration:a.duration+b.duration};result.proof={event:'armor-core',valid:a.proof.valid&&b.proof.valid};return result;
}
// Resolve each variant by its own duration. The renderer receives real physics
// time at a deliberately slower playback rate and an explicit readable aftermath.
function at(preview,age=preview?.age||0){
 if(!preview)return null;
 let local=preview,time=Math.max(0,age),index=0;
 if(preview.duration>0)time%=preview.duration;
 if(preview.variants){for(let i=0;i<preview.variants.length;i++){const candidate=preview.variants[i];if(time<candidate.duration||i===preview.variants.length-1){local=candidate;index=i;break;}time-=candidate.duration;}}
 const phase=time<local.flightStart?'WATCH':time<local.flightEnd?'SHOT':'RESULT',rate=local.playbackRate||1;
 const flight=local.plan?E.clamp((time-local.flightStart)*rate,0,local.plan.duration):0;
 const effectProgress=local.plan?E.clamp((time-local.flightEnd)/.35,0,1):E.clamp((time-local.flightStart)/Math.max(.01,local.flightEnd-local.flightStart),0,1);
 const pose={...local.pose};if(local.motion?.kind==='aim'&&phase==='WATCH'){const t=E.clamp(time/Math.max(.01,local.flightStart),0,1),ease=t*t*(3-2*t);pose.angle=local.motion.fromAngle+(local.motion.toAngle-local.motion.fromAngle)*ease;}
 const displayPower=local.id==='controls'&&phase==='WATCH'?E.chargePower(time,local.state):pose.power;
 const controlAction=local.id==='controls'?(phase==='WATCH'?'HOLD FIRE':phase==='SHOT'?'RELEASE':'HIT'):local.id==='aim'?local.label:phase==='RESULT'?local.outcome:local.instruction;
 const annotation=phase==='RESULT'||phase==='SHOT'&&(local.plan?flight+1e-9>=(local.annotationAt??local.plan.duration):effectProgress>=.5)?local.annotation:null;
 return {...local,variants:undefined,age:time,variantIndex:index,pose,flight,effectProgress,phase,step:local.label||phase,label:local.label||phase,displayPower,controlAction,annotation,cue:{...local.cue,active:phase==='WATCH'},description:phase==='RESULT'?local.outcome:local.instruction};
}
function specialPreview(original,id){
 const weapon=E.combat.weapons.find(w=>w.id===id&&w.special);if(!weapon)return null;
 const state=fixture(original,id);state.characterId=weapon.machineId;state.specialAmmo=3;state.mode=id;state.selectedSkill=null;state.weaponStock={};
 const target={gun:520,ban:590,hibari:650,hana:440,rin:720,mogu:650,koro:800,sora:580,rico:760,yui:650}[weapon.machineId];
 state.spec.components=[];state.spec.features=[];
 if(weapon.machineId==='gun')state.spec.components=[{id:'demo-cover',destructible:true,poly:[[40,20],[46,20],[46,12],[40,12]]}];
 if(weapon.machineId==='mogu')state.spec.components=[{id:'demo-cover',destructible:true,poly:[[40,28],[52,28],[52,12],[40,12]]}];
 if(weapon.machineId==='rico')state.spec.features=[{type:'R',v:[30,85,28]}];
 if(weapon.machineId==='koro')state.spec.floors=[[[0,12],[48,12]],[[58,4],[100,4]]];
 state.world=G.world(state.spec);const hp=E.combat.get(state.characterId).hp/E.combat.pointsPerUnit;
 state.units=[{...G.safePosition(state.world,160,380),hp,maxHp:hp,parts:[],exposed:0,range:[35,965]},{...G.safePosition(state.world,target,weapon.machineId==='koro'?460:380),hp:3,maxHp:3,parts:[],exposed:0,range:[250,965]}];
 const proves=plan=>{
  const events=plan.events,hit=plan.damage[1]>0;
  if(weapon.machineId==='gun')return plan.damage[1]>.2&&plan.destroyed.length>0;
  if(weapon.machineId==='ban')return hit&&events.some(e=>e.type==='shockwave')&&!plan.impacts.some(i=>i.hit?.unit===1)&&state.units[1].x-plan.end.x>70;
  if(weapon.machineId==='hibari')return hit&&events.some(e=>e.type==='airburst');
  if(weapon.machineId==='hana')return plan.bullets.length===3&&plan.damage[1]>1.2;
  if(weapon.machineId==='rin')return hit&&events.some(e=>e.type==='critical')&&plan.damage[1]>=3.7;
  if(weapon.machineId==='mogu')return events.filter(e=>e.type==='breach-pulse').length===2&&plan.destroyed.length>=2;
  if(weapon.machineId==='koro')return hit&&events.some(e=>e.type==='roll-fall')&&events.filter(e=>e.type==='roll').length>=2;
  if(weapon.machineId==='sora')return plan.damage[1]>.69&&plan.bullets.length===9&&events.some(e=>e.type==='split');
  if(weapon.machineId==='rico')return hit&&events.filter(e=>e.type==='bounce').length>=2;
  return hit&&events.some(e=>e.type==='pull'&&Math.abs(e.to.x-e.from.x)>60)&&events.some(e=>e.type==='compression');
 };
 let found=null;
 for(let angle=Math.max(-12,weapon.minAngle);angle<=weapon.maxAngle&&!found;angle+=3)for(let power=25;power<=100&&!found;power+=5){const plan=E.trajectory(state,0,angle,power);if(proves(plan))found={angle,power,plan};}
 if(!found)return null;
 state.angle=found.angle;state.power=found.power;const before=snapshot(state),after=snapshot(state),plan=found.plan;
 E.selectWeapon(after,id);const actual=E.launch(after,found.angle,found.power);E.resolve(after,actual);
 const interaction=plan.events.find(e=>['shockwave','airburst','critical','breach-pulse','roll-fall','split','pull','bounce','break'].includes(e.type)),focus=interaction||plan.impacts.at(-1)||plan.end,releaseAt=.8;
 const result=decorate({id,source:'vignette',state:before,before,after,pose:{angle:found.angle,power:found.power,mode:id,selectedSkill:null},plan,proof:{event:interaction?.type||'impact',valid:true},releaseAt,flightStart:releaseAt,flightEnd:releaseAt+plan.duration/playbackRate,duration:releaseAt+plan.duration/playbackRate+resultHold,playbackRate,resultHold,focus:{x:focus.x,y:focus.y,radius:170}},id,'vignette');
 result.annotationAt=interaction?.t||0;result.framing.subjects=[0,1];result.framing.keepOverview=true;return result;
}
function skillPreview(original,id){
 const state=fixture(original,id);state.skills={[id]:3};state.selectedSkill=null;state.pickups=[];
 const build=(before,after,plan,label,focus)=>{const d=decorate({id,source:'vignette',state:before,before,after,pose:{angle:before.angle,power:before.power,mode:before.mode,selectedSkill:id},plan,proof:{event:id,valid:true},releaseAt:.8,flightStart:.8,flightEnd:.8+(plan?plan.duration/playbackRate:1),duration:1,playbackRate,resultHold,focus:{...focus,radius:170}},id,'vignette');d.duration=d.flightEnd+resultHold;d.annotation.label=label;d.annotationAt=plan?.duration||0;d.framing.subjects=[0,1];d.framing.keepOverview=true;return d;};
 if(id==='S_BREACH'){
  state.spec.components=[{id:'breach-a',destructible:true,poly:[[40,24],[42,24],[42,12],[40,12]]},{id:'breach-b',destructible:true,poly:[[44.4,24],[46.4,24],[46.4,12],[44.4,12]]}];state.world=G.world(state.spec);state.units[1]={...state.units[1],...G.safePosition(state.world,800,380)};E.selectSkill(state,id);
  let found;for(let angle=-8;angle<=80&&!found;angle+=3)for(let power=25;power<=100;power+=5){const plan=E.trajectory(state,0,angle,power);if(plan.events.some(e=>e.type==='breach')){found=plan;break;}}
  if(!found)return null;state.angle=found.angle;state.power=found.power;const before=snapshot(state),after=snapshot(state),actual=E.launch(after,found.angle,found.power);E.resolve(after,actual);const event=found.events.find(e=>e.type==='breach');return build(before,after,found,'ONE MORE PIECE',event);
 }
 if(id==='S_GUARD'){
  const after=snapshot(state);E.selectSkill(after,id);let miss;for(let a=-8;a<=80&&!miss;a+=4)for(let power=25;power<=100;power+=5){const p=E.trajectory(after,0,a,power);if(p.damage.every(d=>d===0)&&!p.destroyed.length){miss=p;break;}}if(!miss)return null;E.resolve(after,E.launch(after,miss.angle,miss.power));E.next(after);const aim=E.solve(after,1),plan=E.trajectory(after,1,aim.angle,aim.power),raw=E.trajectory({...after,guardActive:false},1,aim.angle,aim.power);if(!plan.damage[0]||Math.abs(plan.damage[0]*2-raw.damage[0])>1e-6)return null;
  const before=snapshot(state);before.guardActive=true;E.resolve(after,E.launch(after,aim.angle,aim.power,plan));const result=build(before,after,plan,'DAMAGE '+E.combat.points(raw.damage[0])+' → '+E.combat.points(plan.damage[0]),plan.impacts.find(i=>i.hit?.unit===0)||plan.end);result.proof={event:id,valid:true,damage:plan.damage[0],unprotected:raw.damage[0]};return result;
 }
 const before=snapshot(state);before.units[0].hp=Math.max(.5,before.units[0].maxHp-2);const healed=snapshot(before);if(!E.repair(healed))return null;const repair=build(before,snapshot(healed),null,'HP +30',{x:healed.units[0].x,y:healed.units[0].y-30});repair.motion={kind:'repair'};E.next(healed);const aim=E.solve(healed,1),plan=E.trajectory(healed,1,aim.angle,aim.power),after=JSON.parse(JSON.stringify(healed));E.resolve(after,E.launch(after,aim.angle,aim.power,plan));const response=build(snapshot(healed),after,plan,'RIVAL RESPONSE',plan.impacts.find(i=>i.hit?.unit===0)||plan.end);response.instruction='The rival acts after the repair.';return {...repair,variants:[repair,response],duration:repair.duration+response.duration,after,proof:{event:id,valid:after.skills[id]===2&&healed.shotCount===1}};
}
function create(original,requested){
 if(['S_GUARD','S_BREACH','S_REPAIR'].includes(requested))return skillPreview(original,requested);
 if(E.combat.weapons.some(w=>w.special&&w.id===requested))return specialPreview(original,requested);
 let id=requested==='touch-controls-v2'?'controls':requested==='W'?'reflection':requested==='ceiling-lift'?'roof':requested==='gate-choices'?'B':requested;
 if(!Object.prototype.hasOwnProperty.call(titles,id)&&!E.weapons.some(w=>w.id===id))return null;
 if(['teleport','wall-fall','destruction','choices'].includes(id)){
  const before=snapshot(original);before.mode='W01';before.selectedSkill=null;before.teleportMode=id==='teleport'||id==='wall-fall';
  if(id==='choices'){const result=create(original,'destruction');return result?{...result,...L.describe(id),id}:null;}
  let found=null;
  for(let angle=-8;angle<=84&&!found;angle+=4)for(let power=25;power<=100;power+=5){const plan=E.trajectory(before,0,angle,power);
   if(id==='destruction'){const event=plan.events.find(e=>e.type==='break');if(event){found={plan,angle,power,event};break;}}
   else{const landing=G.teleportLanding(before.world,plan.teleportContact,before.units[1],before.units[0].range);if(landing&&Math.hypot(landing.x-before.units[0].x,landing.y-before.units[0].y)>65&&(id!=='wall-fall'||landing.y-landing.entry.y>45)){found={plan,angle,power,event:plan.events.find(e=>e.type==='teleport-contact')};break;}}
  }
  if(!found)return null;before.angle=found.angle;before.power=found.power;const after=snapshot(before);E.resolve(after,clone(found.plan));
  const description=L.describe(id),releaseAt=.85,flightEnd=releaseAt+found.plan.duration/playbackRate,focus=found.event;
  return {...description,id,state:before,before,after,pose:{angle:found.angle,power:found.power,mode:before.teleportMode?'TELEPORT':'W01'},plan:found.plan,proof:{event:id,valid:true},source:'stage',releaseAt,flightStart:releaseAt,flightEnd,duration:flightEnd+resultHold,playbackRate,resultHold,focus:{x:focus.x,y:focus.y,radius:210},annotation:{x:focus.x,y:focus.y,label:id==='destruction'?'OPEN':id==='wall-fall'?'FALL · LAND':'LAND'},annotationAt:found.plan.duration,framing:{points:found.plan.path.filter((_,i)=>i%12===0),subjects:[0]},cue:{control:'fire'}};
 }
 if(id==='controls'){
  const state=fixture(original,id);if(!state.characterId)Object.assign(state.units[1],G.safePosition(state.world,650,380));state.mode='W01';state.selectedSkill=null;
  const found=state.characterId?find(state,id):{angle:24,power:65};if(!found)return null;if(!found.plan)found.plan=E.trajectory(state,0,found.angle,found.power);
  const result=make(state,id,found,'vignette');result.proof={event:'release',valid:found.plan.damage[1]>0};return result.proof.valid?result:null;
 }
 if(id==='aim')return aimDemo(original);
 if(id==='boss-core')return bossCore(original);
 if(id==='move'||id==='slope'||id==='height'){
  for(const before of [snapshot(original),fixture(original,id)]){
   for(const distance of [80,160,240,-80,-160]){const after=snapshot(before);E.move(after,0,distance);
    if(Math.abs(after.units[0].x-before.units[0].x)<=30||id!=='move'&&Math.abs(after.units[0].y-before.units[0].y)<=8)continue;
    return motion(before,after,id,'move');
   }
  }return null;
 }
 if(id==='B')return bridgeDemo(original);
 if(id==='BLINK'){
  let before=snapshot(original);if(!before.blink.length)before=fixture(original,id);before.selectedSkill='BLINK';before.skills.BLINK=Math.max(1,before.skills.BLINK||0);const after=snapshot(before);if(!E.blink(after,0))return null;
  return motion(before,after,id,'blink');
 }
 // Each weapon gets a purpose-authored local demonstration with a real target and contact geometry.
 // Feature lessons first use the actual stage, with a designed local scene only if no valid example exists.
 let state=/^W\d\d$/.test(id)||E.skills.includes(id)?fixture(original,id):snapshot(original),source=state._preview?'vignette':'stage';
 state.mode=/^W\d\d$/.test(id)?id:'W01';state.selectedSkill=E.skills.includes(id)?id:null;
 if(id==='boss-swap'){state.selectedSkill='SWAP';state.skills.SWAP=2;source='vignette';}
 if(id==='V')for(const r of state.world.regions)if(r.kind==='V')r.on=true;
 let found=find(state,id);
 if(!found){state=fixture(original,id);source='vignette';found=find(state,id);}
 if(!found)return null;
 let result=make(state,id,found,source);
 // A safe crop must still show the action being taught. If avoiding the solved
 // enemy impact hides the visible effect, use its authored demonstration scene.
 if(!result.proof.valid&&source==='stage'){
  state=fixture(original,id);source='vignette';found=find(state,id);
  if(!found)return null;result=make(state,id,found,source);
 }
 if(!result.proof.valid)return null;
 if(id==='V'){
  const second=snapshot(state);
  for(const r of second.world.regions)if(r.kind==='V')r.on=false;
  const secondPlan=E.trajectory(second,0,found.angle,found.power),other=make(second,id,{plan:secondPlan,angle:found.angle,power:found.power},source);
  other.proof={event:'vent-off',valid:second.world.regions.filter(r=>r.kind==='V').every(r=>!r.on)&&!secondPlan.events.some(e=>e.type==='vent')};
  result.label='VENT ON';other.label='VENT OFF';other.annotation.label='NO LIFT';result.variants=[{...result,variants:undefined},other];result.duration=result.variants.reduce((n,v)=>n+v.duration,0);
 }
 return result;
}
const api={create,titles,at,frame:at,presentation:at};if(typeof module!=='undefined')module.exports=api;else root.ArcPreview=api;
})(globalThis);
