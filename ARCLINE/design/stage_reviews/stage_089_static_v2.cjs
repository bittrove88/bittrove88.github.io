const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_089_proposal_v2.json'))),a=p.after,spec={id:89,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:q.breakable})),features:a.features,worldWidth:a.width};
for(const k of ['floor','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
const report={stage:89,version:2,scope:'static floor contact/reflection direction, spaces and representative rays; no projectile/input/combat execution',dataConsistent:true,states:[]};
for(const removed of [false,true]){const base=G.world(spec),dead=base.solids.filter(q=>q.destructible).map(q=>q.id);assert.equal(dead.length,1);const w=removed?G.without(base,dead):base,c=w.regions.find(q=>q.kind==='C'),r={D04Removed:removed,destructionUnits:dead,supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 const contactPart=w.solids.find(q=>q.id==='089-RETURN-KEEL'),hull=w.solids.find(q=>q.id==='089-FIXED-PROW');r.keelHullConnection=G.inside(G.point(140,31.5),contactPart.poly)&&G.inside(G.point(140,31.5),hull.poly);assert(r.keelHullConnection);
 const reflectors=w.solids.filter(q=>q.kind==='reflector');r.Wsurfaces=reflectors.map(q=>({id:q.id,support:q.floorId}));assert.equal(reflectors.length,1);assert(reflectors[0].floorId.startsWith('089-RETURN-KEEL'));
 const shot=a.attacks[1],at=shot.contactIndex,before=G.point(...shot.points[at-1]),contact=G.point(...shot.points[at]),hit=G.sweep(w,before,contact);r.intendedWContact=hit?.solid.kind==='reflector';assert(r.intendedWContact);
 const incoming={x:contact.x-before.x,y:contact.y-before.y},dot=incoming.x*hit.nx+incoming.y*hit.ny,out={x:incoming.x-2*dot*hit.nx,y:incoming.y-2*dot*hit.ny};r.staticReflectionDirection={incomingLeft:incoming.x<0,outgoingRight:out.x>0,outgoingUp:out.y<0};assert(Object.values(r.staticReflectionDirection).every(Boolean));
 const clear=ps=>ps.slice(1).every((pt,i)=>G.lineClear(w,G.point(...ps[i]),G.point(...pt)));
 r.WschematicSpaceClear=shot.points.slice(1).every((pt,i)=>{let start=G.point(...shot.points[i]);if(i===at)start={x:start.x+hit.nx*.6,y:start.y+hit.ny*.6};return G.lineClear(w,start,G.point(...pt));});assert(r.WschematicSpaceClear);
 r.outerSchematicClear=clear(a.attacks[0].points);assert(r.outerSchematicClear);r.transferSchematicClear=clear(a.transferSpaces[0].points);assert(r.transferSchematicClear);
 const cp=[{x:c.x1,y:c.y1},{x:c.x2,y:c.y1},{x:c.x2,y:c.y2},{x:c.x1,y:c.y2}],inC=q=>q.x>=c.x1&&q.x<=c.x2&&q.y>=c.y1&&q.y<=c.y2;
 const crossesC=ps=>ps.slice(1).some((pt,i)=>{const u=G.point(...ps[i]),v=G.point(...pt);return inC(u)||inC(v)||cp.some((q,j)=>G.segment(u,v,q,cp[(j+1)%4]));});
 r.outerSchematicEntersC=crossesC(a.attacks[0].points);r.WschematicAvoidsC=!crossesC(shot.points);r.transferSchematicAvoidsC=!crossesC(a.transferSpaces[0].points);assert(r.outerSchematicEntersC&&r.WschematicAvoidsC&&r.transferSchematicAvoidsC);
 r.cutoutLowerArcClear=clear(a.optionalOpenShot);assert.equal(r.cutoutLowerArcClear,removed);
 r.turnBand={from:120,to:119,horizontalPx:10,clear:true};for(let x=1190;x<=1200;x+=2){const s=G.support(w,x,300);assert(s&&G.clearBody(w,s)&&Math.abs(s.slope)<1e-6);}
 r.openVerticalSpaces=a.anchors.map(q=>({id:q.id,clear:G.lineClear(w,G.point(q.x,q.h+5),G.point(q.x,q.h+70))}));assert(r.openVerticalSpaces.every(q=>q.clear));
 r.directRayChecks=[];r.barrels=[];const fixed=G.without(w,dead);
 for(const q of a.anchors){const facing=q.id==='B-fire'?-1:1,s={units:[{...G.support(w,q.x*10,500-q.h*10),facing},{}]},count={id:q.id,facing,rayCount:0,open:0,fixedHullBlocked:0},blocked=[];
  for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}assert.equal(blocked.length,0);r.barrels.push({id:q.id,facing,samplesDeg:[0,80],step:1,lengthPx:35,blocked});
  for(const angle of [0,20,40,60,80]){const mu=G.muzzle(s,0,angle);for(const dx of [-2.5,0,2.5])for(const dh of [1,3,5.5]){const target=G.point(a.enemy.x+dx,a.enemy.h+dh),h=G.sweep(w,mu,target),f=G.sweep(fixed,mu,target);count.rayCount++;if(!h||h.t>.98)count.open++;if(f?.solid.id==='089-FIXED-PROW'&&f.t<.98)count.fixedHullBlocked++;}}
  assert.equal(count.open,0);assert.equal(count.fixedHullBlocked,count.rayCount);r.directRayChecks.push(count);
 }
 r.pickups=a.pickups.map(q=>({id:q.id,insideSolid:w.solids.some(o=>G.inside(G.point(q.x,q.h),o.poly))}));assert(r.pickups.every(q=>!q.insideSolid));report.states.push(r);
}
report.notTested=['actual W bounce followed by target hit','C trajectory and tolerance','teleport/landing/action count','actual turning input','D04 break count','enemy AI/counterattack','20-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_089_static_check_v2.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
