const fs=require('fs'),path=require('path'),assert=require('assert'),G=require(process.argv[2]||path.resolve(__dirname,'../../game/dist/geometry.js'));
const p=JSON.parse(fs.readFileSync(path.join(__dirname,'stage_079_proposal_v2.json'))),a=p.after,spec={id:79,hold:1,floors:a.floors,components:a.parts.map(q=>({...q,destructible:false})),features:a.features,worldWidth:a.width};
for(const k of ['floor','floors','parts','features'])assert.deepStrictEqual(a[k],p.blueprintCandidate[k]);assert.deepStrictEqual(p.blueprintCandidate.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
assert.deepStrictEqual(a.floors,p.blueprintCandidate.floorSegments);
const report={stage:79,version:2,scope:'static shape in two bridge poses and two M polarities; no input or combat',dataConsistent:true,poses:[]};
const dist=(q,c,d)=>{const dx=d.x-c.x,dy=d.y-c.y,t=Math.max(0,Math.min(1,((q.x-c.x)*dx+(q.y-c.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(q.x-c.x-t*dx,q.y-c.y-t*dy);};
for(const round of [1,2]){const w=G.world(spec,round),b=w.solids.find(q=>q.kind==='bridge'),m=w.regions[0],r={round,bridgeOpen:b.open,bridgeEnd:{x:b.poly[1].x,h:(500-b.poly[1].y)/10},supports:[],selfIntersections:[]};
 for(const q of [{id:'enemy',...a.enemy},...a.anchors]){const pt=G.point(q.x,q.h),s=G.support(w,pt.x,pt.y);r.supports.push({id:q.id,supported:!!s,bodyClear:!!s&&G.clearBody(w,s),heightErrorPx:s?Math.abs(s.y-pt.y):null,supportId:s?.surface});}assert(r.supports.every(q=>q.supported&&q.bodyClear&&q.heightErrorPx<1e-6));
 for(const o of w.solids)for(let i=0;i<o.poly.length;i++)for(let j=i+2;j<o.poly.length;j++){if(i===0&&j===o.poly.length-1)continue;if(G.segment(o.poly[i],o.poly[(i+1)%o.poly.length],o.poly[j],o.poly[(j+1)%o.poly.length]))r.selfIntersections.push([o.id,i,j]);}assert.equal(r.selfIntersections.length,0);
 r.Mclearances=w.solids.map(o=>({id:o.id,clearancePx:Math.min(...o.poly.map((q,i)=>dist(m,q,o.poly[(i+1)%o.poly.length])))-m.radius}));assert(r.Mclearances.every(q=>q.clearancePx>0));
 r.schematicSpaces=a.attacks.map(q=>({kind:q.kind,clear:q.points.slice(1).every((pt,i)=>G.lineClear(w,G.point(...q.points[i]),G.point(...pt)))}));assert(r.schematicSpaces.every(q=>q.clear));
 r.terminalLineClear=G.lineClear(w,G.point(70,27),G.point(71,35));assert(r.terminalLineClear);
 r.highAngleBand={P0RepresentativeBlocked:!G.lineClear(w,G.point(63,55),G.point(67,65)),AEquivalentRelativeRayClear:G.lineClear(w,G.point(75,55),G.point(79,65))};assert(Object.values(r.highAngleBand).every(Boolean));
 r.barrels=[];for(const [x,h]of [[63,52],[75,52],[70,24]]){const s={units:[{...G.support(w,x*10,500-h*10),facing:1},{}]},blocked=[];for(let angle=0;angle<=80;angle++){const mu=G.muzzle(s,0,angle);if(!G.lineClear(w,mu.pivot,mu))blocked.push(angle);}r.barrels.push({x,blocked,samplesDeg:[0,80],step:1,defaultLengthPx:35});assert.equal(blocked.length,0);}
 if(round===1){for(let x=630;x<=750;x+=2){const s=G.support(w,x,-20);assert(s&&G.clearBody(w,s)&&Math.abs(s.y+20)<1e-6);}r.flatCrossingBand={horizontalPx:120,budgetPx:140,representativeBodySamplesEveryPx:2};}
 r.pickups=a.pickups.map(q=>({id:q.id,insideSolid:w.solids.some(o=>G.inside(G.point(q.x,q.h),o.poly))}));assert(r.pickups.every(q=>!q.insideSolid));
 const reversed=G.world(spec,round,0,{polarity:-1});assert.equal(reversed.regions[0].direction,-1);assert.deepStrictEqual(reversed.solids,w.solids);r.polaritySwitchChangesSolids=false;report.poses.push(r);
}
report.notTested=['actual walking across bridge','bridge boundary actor settlement','teleport landing and count','T hit and switching input','M trajectory and hits','enemy AI/counterattack','16-action victory','device display'];fs.writeFileSync(path.join(__dirname,'stage_079_static_check_v2.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
