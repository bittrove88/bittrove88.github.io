'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const G=require('../../game/dist/geometry.js'),L=require('../../game/dist/levels.js');
const read=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8'));
const fingerprint=require('./review_fingerprint.cjs');
const gallery=read('map_review_gallery_data.json'),rows=[];
for(const e of gallery.stages.filter(x=>x.stage>=51&&x.stage<=99)){
 const n=e.stage,p=read(e.source),s=e.after,live=L[n-1],errors=[],supports=[];
 const check=(label,fn)=>{try{fn();}catch(err){errors.push(label+': '+err.message);}};
 check('source',()=>{assert.deepEqual(p.after,s);assert.deepEqual(p.before,e.before);assert.deepEqual(s.pickups.map(x=>[x.placementId,x.id,x.amount,x.spawnTurn]),live.pickups.map(x=>[x.placementId,x.id,x.amount,x.spawnTurn]));assert.deepEqual(e.before.floors,live.floors);assert.deepEqual(e.before.features,live.features);for(const [k,v] of Object.entries(p.difficulty.currentRules))if(k in live)assert.deepEqual(v,live[k]);});
 for(const f of s.floors)check('floor',()=>{for(let i=1;i<f.length;i++)assert(f[i][0]>f[i-1][0]);});
 for(const part of s.parts)check(part.id,()=>{const v=part.poly.map(q=>G.point(...q));for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){if(j===i+1||i===0&&j===v.length-1)continue;assert(!G.segment(v[i],v[(i+1)%v.length],v[j],v[(j+1)%v.length]),'self intersection');}});
 const spec={...live,worldWidth:s.width,floors:s.floors,components:s.parts.map(x=>({...x,destructible:x.breakable})),features:s.features};
 const w=G.world(spec),points=[...Object.entries({player:s.player,enemy:s.enemy}),...p.routeDesign.anchors.map(a=>[a.id,a])];
 for(const [id,q] of points)check('support '+id,()=>{
  if(q.floating){assert.equal(n,90);assert(G.clearBody(w,G.point(q.x,q.h)));supports.push({id,kind:'engine-supported-floating-boss',x:q.x*10,y:500-q.h*10});return;}
  const foot=G.safePosition(w,q.x*10,500-q.h*10);assert(foot,'no safe support');assert(Math.abs(foot.x-q.x*10)<.1,'x changed '+foot.x);assert(Math.abs(foot.y-(500-q.h*10))<.1,'h changed to '+((500-foot.y)/10));assert(G.clearBody(w,foot));if(q.surface)assert(foot.surface.startsWith(q.surface),'wrong surface '+foot.surface);if(['player','enemy'].includes(id))assert(Math.abs(foot.slope)*180/Math.PI<=4,'initial slope '+foot.slope*180/Math.PI);supports.push({id,...foot});
 });
 for(const q of s.pickups)check('capsule '+q.id,()=>{const c=G.point(q.x,q.h);for(const [dx,dy] of [[0,0],[22,0],[-22,0],[0,22],[0,-22]])assert(!w.solids.some(x=>G.inside({x:c.x+dx,y:c.y+dy},x.poly)),'embedded');assert(!q.verification&&q.needsReverification);});
 const pieces=[];
 s.parts.forEach((part,i)=>{const solids=w.solids.filter(x=>x.componentId===part.id&&x.kind!=='reflector');pieces.push({id:part.id,label:(part.breakable?'D':'F')+String(i+1).padStart(2,'0'),breakable:part.breakable,unitCount:solids.length,units:solids.map((x,j)=>({id:x.id,label:(part.breakable?'D':'F')+String(i+1).padStart(2,'0')+(solids.length>1?'-'+String(j+1):''),poly:x.poly.map(q=>[q.x/10,(500-q.y)/10])})),purpose:part.purpose});});
 for(const crystal of w.solids.filter(x=>x.kind==='crystal'))check('crystal '+crystal.id,()=>{for(const point of crystal.poly)assert(!w.solids.some(x=>x.id!==crystal.id&&x.kind!=='reflector'&&G.inside(point,x.poly)),'embedded in rock');});
 if(s.features.some(f=>f.type==='B'))for(const round of [1,2])check('bridge pose '+round,()=>{const pose=G.world(spec,round);for(const q of p.routeDesign.anchors){const f=G.safePosition(pose,q.x*10,500-q.h*10);assert(f&&Math.abs(f.x-q.x*10)<.1&&Math.abs(f.y-(500-q.h*10))<.1,'anchor '+q.id+' invalid');}});
 rows.push({stage:n,inputHash:fingerprint(e,p),status:errors.length?'FAIL':'PASS',errors,supports,pieces});
}
const report={status:rows.some(x=>x.status==='FAIL')?'FAIL':'PASS',scope:'Static geometry/supports/destruction granularity only; not combat or actual teleport validation',stages:rows};
fs.writeFileSync(path.join(__dirname,'STAGES_051_099_STATIC_CHECK.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,maps:rows.length,failed:rows.filter(x=>x.errors.length).map(x=>({stage:x.stage,errors:x.errors}))},null,2));
process.exitCode=report.status==='PASS'?0:1;
