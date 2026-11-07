const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_081_proposal_v2.json'))),a=p.after,spec={id:81,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:q.breakable})),features:a.features,worldWidth:a.width};
for(const k of ['floor','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
const report={stage:81,version:2,scope:'static supports, intended contact/space and direct rays; no projectile or input execution',dataConsistent:true,states:[]};
for(const round of [1,2])for(const removed of [false,true]){const base=G.world(spec,round),dead=base.solids.filter(q=>q.destructible).map(q=>q.id);assert.equal(dead.length,1);const w=removed?G.without(base,dead):base,k=w.solids.find(q=>q.kind==='crystal'),withoutK=G.without(w,[k.id]),r={round,windDirection:w.regions.find(q=>q.kind==='F').direction,D03Removed:removed,destructionUnits:dead,supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 const clear=(world,ps)=>ps.slice(1).every((pt,i)=>G.lineClear(world,G.point(...ps[i]),G.point(...pt)));
 r.outerSchematicSpaceClear=clear(withoutK,a.attacks[0].points);r.intendedKContact=G.sweep(w,G.point(25,36),G.point(50,76))?.solid.id===k.id;r.innerSchematicSpaceClear=clear(w,a.attacks[1].points);assert(r.outerSchematicSpaceClear&&r.intendedKContact&&r.innerSchematicSpaceClear);
 r.transferSchematicClear=clear(w,a.transferSpaces[0].points);assert(r.transferSchematicClear);
 r.openVerticalSpaces=a.anchors.map(q=>({id:q.id,clear:G.lineClear(w,G.point(q.x,q.h+5),G.point(q.x,q.h+70))}));assert(r.openVerticalSpaces.every(q=>q.clear));
 r.directRayChecks=[];r.barrels=[];
 for(const q of a.anchors){const s={units:[{...G.support(w,q.x*10,500-q.h*10),facing:1},{}]},count={id:q.id,rayCount:0,open:0,blockedByFixedRoot:0,blockedByBranch:0},blocked=[];
  for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}assert.equal(blocked.length,0);r.barrels.push({id:q.id,samplesDeg:[0,80],step:1,lengthPx:35,blocked});
  for(const angle of [0,20,40,60,80]){const mu=G.muzzle(s,0,angle);for(const dx of [-2.5,0,2.5])for(const dh of [1,3,5.5]){const hit=G.sweep(w,mu,G.point(a.enemy.x+dx,a.enemy.h+dh));count.rayCount++;if(!hit||hit.t>.98)count.open++;else if(hit.solid.id==='081-SPLIT-ROOT-RING')count.blockedByFixedRoot++;else if(hit.solid.destructible)count.blockedByBranch++;}}
  assert.equal(count.open,0);if(removed)assert.equal(count.blockedByFixedRoot,count.rayCount);r.directRayChecks.push(count);
 }
 r.P0HighDeparture=[];const s={units:[{...G.support(w,250,170),facing:1},{}]};for(const angle of [45,50,60,70,80]){const mu=G.muzzle(s,0,angle),to={x:mu.x+mu.dx*150,y:mu.y+mu.dy*150};assert(G.lineClear(w,mu,to));r.P0HighDeparture.push({angle,first150PxClear:true});}
 report.states.push(r);
}
report.notTested=['actual K reflected trajectory and angle tolerance','F trajectory in either direction','teleport drift/landing/action count','branch break count and protection','enemy AI/counterattack','20-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_081_static_check_v2.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
