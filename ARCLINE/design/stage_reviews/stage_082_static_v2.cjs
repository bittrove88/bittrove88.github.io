const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_082_proposal_v2.json'))),a=p.after,spec={id:82,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:q.breakable})),features:a.features,worldWidth:a.width};
for(const k of ['floor','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
const report={stage:82,version:2,scope:'static shape, intended floor contact, open spaces and direct rays; no projectile/input/combat execution',dataConsistent:true,states:[]};
const dist=(q,c,d)=>{const dx=d.x-c.x,dy=d.y-c.y,t=Math.max(0,Math.min(1,((q.x-c.x)*dx+(q.y-c.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(q.x-c.x-t*dx,q.y-c.y-t*dy);};
for(const removed of [false,true]){const base=G.world(spec),dead=base.solids.filter(q=>q.destructible).map(q=>q.id);assert.equal(dead.length,1);const w=removed?G.without(base,dead):base,m=w.regions[0],r={D03Removed:removed,destructionUnits:dead,supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 r.Mclearances=w.solids.map(o=>({id:o.id,clearancePx:Math.min(...o.poly.map((q,i)=>dist(m,q,o.poly[(i+1)%o.poly.length])))-m.radius}));assert(r.Mclearances.every(q=>q.clearancePx>0));
 const reflectors=w.solids.filter(q=>q.kind==='reflector');r.Wsurfaces=reflectors.map(q=>({id:q.id,floorId:q.floorId}));assert.equal(reflectors.length,1);assert.equal(reflectors[0].floorId,'floor1');
 const shot=a.attacks[0],contact=shot.points[shot.contactIndex],before=shot.points[shot.contactIndex-1],hit=G.sweep(w,G.point(...before),G.point(...contact));r.WintendedContact=hit?.solid.kind==='reflector';assert(r.WintendedContact);
 const clear=ps=>ps.slice(1).every((pt,i)=>G.lineClear(w,G.point(...ps[i]),G.point(...pt)));
 r.WspaceClear=shot.points.slice(1).every((pt,i)=>{let start=G.point(...shot.points[i]);if(i===shot.contactIndex)start={x:start.x,y:start.y-.6};return G.lineClear(w,start,G.point(...pt));});assert(r.WspaceClear);
 r.WschematicAvoidsM=shot.points.slice(1).every((pt,i)=>G.circle(G.point(...shot.points[i]),G.point(...pt),m,m.radius)===null);assert(r.WschematicAvoidsM);
 r.MspaceClear=clear(a.attacks[1].points);assert(r.MspaceClear);r.MschematicEntersField=a.attacks[1].points.some(pt=>Math.hypot(pt[0]*10-m.x,500-pt[1]*10-m.y)<m.radius);assert(r.MschematicEntersField);
 r.transferSchematicClear=clear(a.transferSpaces[0].points);assert(r.transferSchematicClear);
 r.lowerWindowLineClear=G.lineClear(w,G.point(55,16),G.point(65,16));assert.equal(r.lowerWindowLineClear,removed);
 r.openVerticalSpaces=a.anchors.map(q=>({id:q.id,clear:G.lineClear(w,G.point(q.x,q.h+5),G.point(q.x,q.h+65))}));assert(r.openVerticalSpaces.every(q=>q.clear));
 r.fixedLeftRootBlocksExample=!G.lineClear(w,G.point(55,80),G.point(65,25));assert(r.fixedLeftRootBlocksExample);
 r.directRayChecks=[];r.barrels=[];
 for(const q of a.anchors){const s={units:[{...G.support(w,q.x*10,500-q.h*10),facing:1},{}]},count={id:q.id,rayCount:0,open:0,blockedByFixedRootOrShore:0},blocked=[];
  for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}assert.equal(blocked.length,0);r.barrels.push({id:q.id,samplesDeg:[0,80],step:1,lengthPx:35,blocked});
  for(const angle of [0,20,40,60,80]){const mu=G.muzzle(s,0,angle);for(const dx of [-2.5,0,2.5])for(const dh of [1,3,5.5]){const h=G.sweep(w,mu,G.point(a.enemy.x+dx,a.enemy.h+dh));count.rayCount++;if(!h||h.t>.98)count.open++;else if(['floor2','082-RIGHT-RETURN-ROOT'].includes(h.solid.id))count.blockedByFixedRootOrShore++;}}
  assert.equal(count.open,0);assert.equal(count.blockedByFixedRootOrShore,count.rayCount);r.directRayChecks.push(count);
 }
 r.P0DepartureSamples=[];const s={units:[{...G.support(w,360,200),facing:1},{}]};for(let angle=0;angle<=80;angle+=10){const mu=G.muzzle(s,0,angle),to={x:mu.x+mu.dx*150,y:mu.y+mu.dy*150};assert(G.lineClear(w,mu,to));r.P0DepartureSamples.push({angle,first150PxClear:true});}
 r.pickups=a.pickups.map(q=>({id:q.id,insideSolid:w.solids.some(o=>G.inside(G.point(q.x,q.h),o.poly))}));assert(r.pickups.every(q=>!q.insideSolid));report.states.push(r);
}
report.notTested=['actual W reflection and angle tolerance','M trajectory and hits','actual teleport/landing/action count','window break shot count and protection','enemy AI/counterattack','20-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_082_static_check_v2.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
