const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_079_proposal_v3.json'))),a=p.after,spec={id:79,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:false})),features:a.features,worldWidth:a.width};
for(const k of ['floor','floors','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
const report={stage:79,version:3,scope:'static shape, launch/arrival spaces and representative direct rays only; no shot or input execution',dataConsistent:true,removedRoof:!a.parts.some(q=>q.id==='079-HINGE-SERVICE-ARM'),poses:[]};assert(report.removedRoof);
const dist=(q,c,d)=>{const dx=d.x-c.x,dy=d.y-c.y,t=Math.max(0,Math.min(1,((q.x-c.x)*dx+(q.y-c.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(q.x-c.x-t*dx,q.y-c.y-t*dy);};
for(const round of [1,2]){const w=G.world(spec,round),b=w.solids.find(q=>q.kind==='bridge'),m=w.regions[0],r={round,bridgeOpen:b.open,supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null,supportId:s?.surface});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 r.Mclearances=w.solids.map(o=>({id:o.id,clearancePx:Math.min(...o.poly.map((q,i)=>dist(m,q,o.poly[(i+1)%o.poly.length])))-m.radius}));assert(r.Mclearances.every(q=>q.clearancePx>0));
 const clear=ps=>ps.slice(1).every((pt,i)=>G.lineClear(w,G.point(...ps[i]),G.point(...pt)));
 r.schematicShotSpaces=a.attacks.map(q=>({kind:q.kind,clear:clear(q.points)}));assert(r.schematicShotSpaces.every(q=>q.clear));
 r.transferSpaces=a.transferSpaces.map(q=>({to:q.to,schematicClear:clear(q.points)}));assert(r.transferSpaces.every(q=>q.schematicClear));
 r.openVerticalSpaces=a.anchors.map(q=>({id:q.id,clear:G.lineClear(w,G.point(q.x,q.h+5),G.point(q.x,q.h+55))}));assert(r.openVerticalSpaces.every(q=>q.clear));
 r.terminalLineClear=G.lineClear(w,G.point(96,27),G.point(98,35));assert(r.terminalLineClear);
 r.barrels=[];r.directRayChecks=[];
 for(const q of a.anchors){const s={units:[{...G.support(w,q.x*10,500-q.h*10),facing:1},{}]},blocked=[];
  for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}r.barrels.push({id:q.id,blocked,angleSamples:[0,80],step:1,lengthPx:35});assert.equal(blocked.length,0);
  const counts={id:q.id,rayCount:0,blockedByEnemyRidge:0,openRays:0};
  for(const angle of [0,20,40,60,80]){const mu=G.muzzle(s,0,angle);for(const dx of [-2.5,0,2.5])for(const dh of [1,3,5.5]){const target=G.point(a.enemy.x+dx,a.enemy.h+dh),hit=G.sweep(w,mu,target);counts.rayCount++;if(!hit||hit.t>.98)counts.openRays++;else if(hit.solid.id==='floor2')counts.blockedByEnemyRidge++;}}
  assert.equal(counts.openRays,0);assert.equal(counts.blockedByEnemyRidge,counts.rayCount);r.directRayChecks.push(counts);
 }
 r.P0UpwardDepartureSamples=[];for(let angle=0;angle<=80;angle+=10){const s={units:[{...G.support(w,630,-20),facing:1},{}]},mu=G.muzzle(s,0,angle),to={x:mu.x+mu.dx*150,y:mu.y+mu.dy*150};const clear=G.lineClear(w,mu,to);assert(clear);r.P0UpwardDepartureSamples.push({angle,first150PxClear:true});}
 r.LHeadroom={xRange:[93,99],heightFromFootPx:450,clear:true};for(let x=93;x<=99;x++){assert(G.lineClear(w,G.point(x,29),G.point(x,69)));}
 if(round===1){for(let x=630;x<=750;x+=2){const s=G.support(w,x,-20);assert(s&&G.clearBody(w,s)&&Math.abs(s.y+20)<1e-6);}r.flatCrossingBandPx=120;}
 assert.deepStrictEqual(G.world(spec,round,0,{polarity:-1}).solids,w.solids);report.poses.push(r);
}
report.notTested=['actual teleport trajectories/landing/action count','actual walking','bridge boundary actor settlement','T switching input','M/ordinary hit trajectories','enemy AI/counterattack','16-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_079_static_check_v3.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
