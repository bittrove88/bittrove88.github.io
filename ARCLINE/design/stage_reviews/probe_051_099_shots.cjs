'use strict';
// Bounded single-projectile exploration, never a battle or autonomous-AI test.
const fs=require('node:fs'),path=require('node:path');
const G=require('../../game/dist/geometry.js'),P=require('../../game/dist/physics.js'),E=require('../../game/dist/engine.js'),L=require('../../game/dist/levels.js'),N=require('../../game/dist/encounters.js');
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const fingerprint=require('./review_fingerprint.cjs');
const g=read('map_review_gallery_data.json'),rows=[];
const start=Number(process.argv[2])||51,end=Number(process.argv[3])||99;
for(const e of g.stages.filter(x=>x.stage>=start&&x.stage<=end)){
 const p=read(e.source),m=e.after,n=e.stage,spec={...L[n-1],worldWidth:m.width,floors:m.floors,components:m.parts.map(x=>({...x,destructible:x.breakable})),features:m.features,spawn:[[m.player.x,m.player.h],[m.enemy.x,m.enemy.h]]};
 const points=[{id:'P0',...m.player,plan:'intact'},...p.routeDesign.anchors.map((x,i)=>({...x,plan:x.plan||(i===1?'alternative':'main')}))],positions=[];
 for(const q of points){
  const destroyed=p.destructionPlans[q.plan]||[],state=E.campaign(n,{matchSeed:1}),effects={destroyed,polarity:q.probePolarity||0,broken:0};
  state.spec=spec;state.world=G.world(spec,q.probeRound||1,0,effects);state.effects=effects;
  const player=G.safePosition(state.world,q.x*10,500-q.h*10),enemy=G.safePosition(state.world,m.enemy.x*10,500-m.enemy.h*10);
  if(!player||!enemy){positions.push({id:q.id,status:'NO_SUPPORT',samples:0});continue;}
  Object.assign(state.units[0],player,{range:[35,m.width-35]});Object.assign(state.units[1],enemy,{range:[35,m.width-35]});
  if(m.enemy.floating){state.units[1].y=500-m.enemy.h*10;state.units[1].floating=true;}
  state.units[0].facing=state.units[1].x>=state.units[0].x?1:-1;state.units[1].facing=-state.units[0].facing;
  if(N.guardian(spec))state.units[1].slope=0;
  const required=({54:{mirror:['bounce']},65:{rim:['bounce']},68:{mirror:['bounce']},71:{low:['magnet','bounce']},74:{lower:['magnet','bounce']},77:{lower:['magnet','bounce']},82:{'root-under':['magnet','bounce']},84:{side:['bounce']},86:{P0:['bounce','cloud']},91:{front:['bounce'],side:['bounce']},94:{low:['magnet','bounce']},96:{inner:['magnet','bounce']},97:{low:['wind','bounce']},98:{lower:['bounce']},99:{mirror:['cloud','magnet','bounce']}})[n]?.[q.id]||[];
  let hits=0,samples=0,best=null,requiredFound=false;const mechanisms=new Set(),bounceSolids=new Set();
  const run=(angle,power)=>{const shot=P.simulate(state,0,angle,power,{weaponId:'W01'}),damage=shot.damage[1]+Object.values(shot.partDamage||{}).reduce((a,b)=>a+b,0);samples++;if(damage>0){hits++;const kinds=new Set();for(const event of shot.events){if(['wind','cloud','updraft','vent','magnet','bounce'].includes(event.type)){mechanisms.add(event.type);kinds.add(event.type);}if(event.type==='bounce')bounceSolids.add(event.solidId);}const meets=required.length&&required.every(k=>kinds.has(k));if(meets)requiredFound=true;const score=damage+kinds.size*.01+(meets?10:0);if(!best||score>best.score){const trace=(shot.bullets[0]?.path||[]).filter((pt,i)=>i%4===0||shot.events.some(ev=>ev.type==='bounce'&&Math.abs(ev.t-pt.t)<1e-6));if(shot.end)trace.push(shot.end);best={angle,power,damage,score,assumedPolarity:state.effects.polarity||0,selfDamage:shot.damage[0],events:shot.events.map(x=>x.type),path:trace.map(x=>[Number((x.x/10).toFixed(3)),Number(((500-x.y)/10).toFixed(3))])};}}return damage;};
  for(let angle=-12;angle<=84;angle+=6)for(let power=20;power<=100;power+=10)run(angle,power);
  if(!best){for(let angle=-12;angle<=88;angle+=2)for(let power=20;power<=100;power+=5)run(angle,power);}
  if(!best&&m.features.some(x=>x.type==='T')){
   for(const polarity of [1,-1]){
    state.effects={...effects,polarity};state.world=G.world(spec,q.probeRound||1,0,state.effects);
    for(let angle=-12;angle<=88;angle+=2)for(let power=20;power<=100;power+=5)run(angle,power);
    if(best){best.assumedPolarity=polarity;break;}
   }
  }
  if(required.length&&!requiredFound){for(let angle=-15;angle<=169;angle+=2)for(let power=20;power<=100;power+=2)run(angle,power);}
  let neighbors=0,neighborCenter=null;
  if(best){const angle=best.angle,power=best.power;neighborCenter={angle,power};for(const da of [-1,0,1])for(const dp of [-2,0,2]){if(run(Math.max(-15,Math.min(170,angle+da)),Math.max(20,Math.min(100,power+dp)))>0)neighbors++;}}
  positions.push({id:q.id,x:q.x,h:q.h,plan:q.plan,round:q.probeRound||1,destroyed,status:best?'SINGLE_SHOT_FOUND':'NO_SAMPLE_FOUND',samples,hits,requiredMechanisms:required,requiredMechanismsFound:requiredFound,winningMechanisms:[...mechanisms],bounceSolids:[...bounceSolids],neighborHits:neighbors,neighborCenter,neighborSamples:best?9:0,best});
 }
 rows.push({stage:n,inputHash:fingerprint(e,p),status:positions.some(x=>x.best)?'SINGLE_SHOT_SAMPLE_FOUND':'NEEDS_BALLISTIC_REVIEW',positions});
 fs.writeFileSync(path.join(__dirname,'STAGES_051_099_SHOT_PROBE.json'),JSON.stringify({scope:'Stationary-enemy Gun/W01 single shots; round 1 or documented bridge phase 2. Coarse grid, bounded refinement if needed, then 3x3 neighbors. Planned openings and assumed terminal polarity; no movement/teleport input, enemy reaction, autonomous AI or action-budget clear. Different positions may use different states; hit counts do not isolate movement benefit. Best examples favor documented gimmick combinations with a search bonus; they are not optimal human play.',stages:rows},null,2)+'\n');
 console.log(n,positions.map(x=>x.id+':'+x.hits).join(' '));
}
console.log(JSON.stringify({maps:rows.length,withSamples:rows.filter(x=>x.status==='SINGLE_SHOT_SAMPLE_FOUND').length,needsReview:rows.filter(x=>x.status!=='SINGLE_SHOT_SAMPLE_FOUND').map(x=>x.stage)}));
