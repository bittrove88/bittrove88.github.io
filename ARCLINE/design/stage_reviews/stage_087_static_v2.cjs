const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_087_proposal_v2.json'))),a=p.after,spec={id:87,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:q.breakable})),features:a.features,worldWidth:a.width};
for(const k of ['floor','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
const report={stage:87,version:2,scope:'static poses, collision/soft region separation and representative rays only; no input/projectile/combat execution',dataConsistent:true,states:[]};
for(const round of [1,2])for(const removed of [false,true]){const base=G.world(spec,round),dead=base.solids.filter(q=>q.destructible).map(q=>q.id);assert.equal(dead.length,1);const w=removed?G.without(base,dead):base,b=w.solids.find(q=>q.kind==='bridge'),c=w.regions.find(q=>q.kind==='C'),r={round,bridgeOpen:b.open,D04Removed:removed,destructionUnits:dead,supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null,supportId:s?.surface});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 const clear=ps=>ps.slice(1).every((pt,i)=>G.lineClear(w,G.point(...ps[i]),G.point(...pt)));
 r.schematicShotSpaces=a.attacks.map(q=>({kind:q.kind,clear:clear(q.points)}));assert(r.schematicShotSpaces.every(q=>q.clear));r.transferSchematicClear=clear(a.transferSpaces[0].points);assert(r.transferSchematicClear);
 const regionPoly=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y1},{x:c.x2,y:c.y2},{x:c.x1,y:c.y2}],inC=q=>q.x>=c.x1&&q.x<=c.x2&&q.y>=c.y1&&q.y<=c.y2;
 const crossesC=ps=>ps.slice(1).some((pt,i)=>{const u=G.point(...ps[i]),v=G.point(...pt);return inC(u)||inC(v)||regionPoly.some((q,j)=>G.segment(u,v,q,regionPoly[(j+1)%4]));});
 r.P0SchematicEntersC=crossesC(a.attacks[0].points);r.outerSchematicAvoidsC=!crossesC(a.attacks[1].points);r.transferSchematicAvoidsC=!crossesC(a.transferSpaces[0].points);assert(r.P0SchematicEntersC&&r.outerSchematicAvoidsC&&r.transferSchematicAvoidsC);
 r.lowIncomingExample={points:[[100,40],[62,28]],blockedByBridge:G.sweep(w,G.point(100,40),G.point(62,28))?.solid.id===b.id};assert.equal(r.lowIncomingExample.blockedByBridge,b.open);
 r.optionalLowerArcClear=clear(a.optionalOpenShot);assert.equal(r.optionalLowerArcClear,removed);
 const withoutC=G.world({...spec,features:spec.features.filter(q=>q.type!=='C')},round);assert.deepStrictEqual(withoutC.solids,base.solids);r.cloudIsNotPhysicalOccluder=true;
 r.openVerticalSpaces=a.anchors.map(q=>({id:q.id,clear:G.lineClear(w,G.point(q.x,q.h+5),G.point(q.x,q.h+65))}));assert(r.openVerticalSpaces.every(q=>q.clear));
 r.directRayChecks=[];r.barrels=[];const independent=G.without(w,[b.id,...dead]);
 for(const q of a.anchors){const s={units:[{...G.support(w,q.x*10,500-q.h*10),facing:1},{}]},count={id:q.id,rayCount:0,open:0,fixedHullBlocksEvenWithoutBridgeOrD04:0},blocked=[];
  for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}assert.equal(blocked.length,0);r.barrels.push({id:q.id,samplesDeg:[0,80],step:1,lengthPx:35,blocked});
  for(const angle of [0,20,40,60,80]){const mu=G.muzzle(s,0,angle);for(const dx of [-2.5,0,2.5])for(const dh of [1,3,5.5]){const target=G.point(a.enemy.x+dx,a.enemy.h+dh),hit=G.sweep(w,mu,target),fixed=G.sweep(independent,mu,target);count.rayCount++;if(!hit||hit.t>.98)count.open++;if(fixed?.solid.id==='087-RECEIVER-HULL'&&fixed.t<.98)count.fixedHullBlocksEvenWithoutBridgeOrD04++;}}
  assert.equal(count.open,0);assert.equal(count.fixedHullBlocksEvenWithoutBridgeOrD04,count.rayCount);r.directRayChecks.push(count);
 }
 r.pickups=a.pickups.map(q=>({id:q.id,insideSolid:w.solids.some(o=>G.inside(G.point(q.x,q.h),o.poly))}));assert(r.pickups.every(q=>!q.insideSolid));report.states.push(r);
}
report.notTested=['B protection against actual enemy shots','C trajectory and hit tolerance','teleport drift/landing/action count','D04 break count','enemy AI/counterattack','20-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_087_static_check_v2.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
