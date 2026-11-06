// Shape checks only. Never runs movement, teleport, ballistics, AI or combat.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const G=require('../../game/dist/geometry.js');
const file=n=>path.join(__dirname,n),proposal=JSON.parse(fs.readFileSync(file('stage_075_proposal_v4.json'),'utf8'));
const a=proposal.after,bp=proposal.blueprintCandidate;
assert.deepEqual(bp.floor,a.floor);assert.deepEqual(bp.features,a.features);
assert.deepEqual(bp.spawnPoints,[[a.player.x,a.player.h],[a.enemy.x,a.enemy.h]]);
assert.deepEqual(bp.parts.map(p=>p.poly),a.parts.map(p=>p.poly));
const spec={id:75,floors:[bp.floor],features:bp.features,components:bp.parts.map(p=>({id:p.id,poly:p.poly,destructible:p.breakable})),worldWidth:bp.worldWidth,hold:1};
const intact=G.world(spec),fragile=intact.solids.filter(p=>p.destructible),gone=G.without(intact,fragile.map(p=>p.id));
const fixed=intact.solids.filter(p=>!p.destructible);
assert.deepEqual(gone.solids,fixed);assert.deepEqual(gone.regions,intact.regions);
assert.equal(fragile.length,1);assert.equal(fragile[0].id,'075-TEMP-DEFENSE@0');
for(const p of a.parts){
 const vertices=p.poly.map(v=>G.point(...v));
 for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){
  if(j===i+1||(i===0&&j===vertices.length-1))continue;
  assert.equal(G.segment(vertices[i],vertices[(i+1)%vertices.length],vertices[j],vertices[(j+1)%vertices.length]),null,p.id+' self intersection');
 }
}
for(let i=1;i<a.floor.length;i++)assert(a.floor[i][0]>a.floor[i-1][0]);
const supportResults=[['P0',a.player],['enemy',a.enemy],...a.anchors.map(p=>[p.id,p])].map(([id,p])=>{
 const raw=G.point(p.x,p.h),support=G.support(intact,raw.x,raw.y);
 assert(support,id+' unsupported');assert(Math.abs(support.y-raw.y)<.5,id+' height');assert(G.clearBody(intact,support),id+' body overlap');assert(Math.abs(support.slope)<35*Math.PI/180,id+' slope');
 return {id,heightErrorPx:+Math.abs(support.y-raw.y).toFixed(6),slopeDeg:+(support.slope*180/Math.PI).toFixed(4),bodyClear:true};
});
let pathSlope=0;
for(let i=1;i<a.movement[0].length;i++){
 const previous=a.movement[0][i-1],current=a.movement[0][i];
 pathSlope=Math.max(pathSlope,Math.abs(Math.atan2(current[1]-previous[1],current[0]-previous[0])*180/Math.PI));
}
assert(pathSlope<35);

const arm=[a.enemy.x-3.4,a.enemy.h+4],body=[a.enemy.x,a.enemy.h+2.4];
const representativeTargets=[{id:'arm',center:arm,rx:1.8,ry:1.8},{id:'body',center:body,rx:3.5,ry:2.6}];
const bands=[];
for(const [state,w] of [['intact',intact],['all-D-removed',gone]])for(const p of [a.player,a.anchors.find(p=>p.id==='R')]){
 const originId=p.id||'P0';let tested=0;
 for(const dh of [2.6,6.6])for(const target of representativeTargets)for(let sample=0;sample<8;sample++){
  const angle=sample*Math.PI/4;
  const endpoint=G.point(target.center[0]+target.rx*Math.cos(angle),target.center[1]+target.ry*Math.sin(angle));
  const hit=G.sweep(w,G.point(p.x,p.h+dh),endpoint);
  assert(hit&&hit.solid.id==='floor0',state+' '+originId+' sight controlled by something other than the fixed floor');tested++;
 }
 bands.push({state,origin:originId,originX:p.x,originHeightOffsets:[2.6,6.6],targetSamples:'8 boundary samples each for existing body ellipse and arm circle',segmentCount:tested,allFirstBlocker:'floor0',meaning:'Representative exterior straight sight bands only; no muzzle calculation or trajectory simulation'});
}

const C=a.anchors.find(p=>p.id==='C');
const lowDefenseHit=G.sweep(intact,G.point(...arm),G.point(C.x,C.h+2.4));
assert.equal(lowDefenseHit?.solid.id,'075-TEMP-DEFENSE@0');
assert(G.lineClear(gone,G.point(...arm),G.point(C.x,C.h+2.4)));
const schematicRoutes=a.attacks.map(route=>{
 for(let i=1;i<route.points.length;i++)assert(G.lineClear(intact,G.point(...route.points[i-1]),G.point(...route.points[i])),route.kind+' schematic crosses fixed/temporary solid');
 return {kind:route.kind,destructionPrerequisite:[],schematicSegmentsClearWithDIntact:true,status:'concept-only-not-an-actual-trajectory'};
});
let minOpening=Infinity;
for(let x=76;x<=113;x+=.5){
 const floor=G.floorY(a.floor.map(v=>G.point(...v)),x*10);const ray=G.sweep({solids:intact.solids.filter(p=>p.id==='075-ADIT-BEDROCK')}, {x:x*10,y:floor-1},{x:x*10,y:-400});
 if(ray)minOpening=Math.min(minOpening,floor-ray.y);
}
assert(minOpening>150);
const D=a.parts.find(p=>p.breakable);const width=(Math.max(...D.poly.map(v=>v[0]))-Math.min(...D.poly.map(v=>v[0])))*10;
assert.equal(width,80);assert.deepEqual(proposal.destructionPlans,{main:[],alternative:[]});
const report={stage:75,version:'A-v4',status:'static-shape-confirmed-design-approval-pending',source:'stage_075_proposal_v4.json',scope:'existing geometry.world, data consistency, representative support/body samples, fixed/temporary role separation and schematic space only',
 blueprintDataMatchesDrawing:true,polygonSelfIntersections:0,supportHeightTolerancePx:.5,supports:supportResults,plannedApproachMaxSlopeDeg:+pathSlope.toFixed(4),minimumPitMouthVerticalClearancePx:+minOpening.toFixed(3),
 destructible:{id:'075-TEMP-DEFENSE@0',widthPx:width,runtimeFragmentCount:fragile.length,oneHitRemoval:'not-claimed-not-tested',requiredToOpenRoutes:false},
 allDRemoved:{fixedGeometryExactlyUnchanged:true,magnetRegionExactlyUnchanged:true,exteriorSightBands:bands},
 temporaryDefense:{representativeArmToCBodySegmentWithD:'blocked-by-D',sameSegmentWithoutD:'clear',meaning:'Illustrates temporary defense, not proof against actual enemy attacks'},
 schematicRoutes,
 rendering:{engine:'Chromium',svgCount:3,visualReview:'full map, rough comparison, intact/removed states and diversity; coordinate-derived diagrams, not game screenshots'},
 notTested:['actual walking or transfer actions','teleport landing','actual muzzle and barrel','M deflection and ballistics','destruction damage or shot count','arm hit or weakening in battle','enemy AI and counterattack','24-action victory'],
 runtimeChanged:false,finalDesignApproval:false};
const content=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(file('stage_075_static_check_v4.json'),'utf8'),content,'static report out of sync');
else fs.writeFileSync(file('stage_075_static_check_v4.json'),content);
console.log(JSON.stringify({status:'pass',supportSamples:supportResults.length,exteriorSegmentsPerState:64,permanentBlocker:'floor0',DFragmentCount:1,minimumOpeningPx:report.minimumPitMouthVerticalClearancePx,movementOrCombatRun:false}));
