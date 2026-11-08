'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),vm=require('vm'),assert=require('assert/strict'),cache={};
const plain=x=>JSON.parse(JSON.stringify(x));
function original(name){name=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[name])return cache[name];const m={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show','4bcf554:ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module:m,require:original});return cache[name]=m.exports;}

// Keep historical checks on their exact accepted snapshots. Every superseding
// source is independently pinned and checked against the current data below.
function completionManifest(){return require('../../design/stage_reviews/STAGES_REVIEW_COMPLETION_RUNTIME_20261107.json');}
function completionSource(n){const row=completionManifest().stages.find(r=>r.stage===n);return row?require(path.resolve(__dirname,'../..',row.source)):null;}
function beforeCompletionLevel(level){level=require('./reported-fixes-preservation.cjs').level(level);return completionSource(level.id)?.before.runtime||level;}
function beforeCompletionBlueprint(bp){bp=require('./reported-fixes-preservation.cjs').blueprint(bp);return completionSource(bp.stage)?.before.blueprint||bp;}
function beforeCompletionPickups(ps){ps=require('./reported-fixes-preservation.cjs').pickups(ps);return ps.map(p=>completionManifest().pickupChanges.find(r=>r.stage===p.stage)?.before||p);}

function verify(file,equal=assert.deepEqual){
 const name=file.replace(/\.js$/,''),E=require('../dist/engine.js'),G=E.geometry,W=require('../dist/weapons.js');
 if(['geometry','physics','engine','render','visual-art'].includes(name)){
  const before=original('geometry');for(const n of [100])for(const round of [1,2,3]){
   const current=plain(G.world(beforeCompletionLevel(E.levels[n-1]),round)),old=plain(before.world(original('levels')[n-1],round)),added=current.surfaces.slice(old.surfaces.length);
   // 0.23.1 adds support edges to existing projectile colliders. Keep every
   // old surface, polygon, region and terminal byte-identical in this legacy
   // physics fixture. Current authored geometry is pinned by verifyCompletion().
   equal({...current,surfaces:current.surfaces.slice(0,old.surfaces.length)},old,'protected 51-100 collision '+n+'/'+round);
   for(const f of added){const solid=current.solids.find(o=>o.id===f.solidId);assert(solid,'new support belongs to an existing collider');assert(f.points.every(p=>solid.poly.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-7)),'support endpoints match actual polygon');}
  }
  if(name==='engine')for(const method of ['telegraph','enemyMoveTarget','changeCharacter'])equal(E[method].toString(),original('engine')[method].toString(),'preserved behavior '+method);
 }else if(name==='weapons'){for(const w of original('weapons').weapons)equal(plain(W.getEnemy(w.id)),plain(w),'enemy weapon unchanged '+w.id);equal(plain(W.teleport),plain(original('weapons').teleport),'teleport unchanged');}
 else if(name==='skills'){for(const id of ['S_GUARD','S_BREACH'])equal(require('../dist/skills.js').compatible(id,W.get('W01')),true,'legacy skill usable '+id);}
 else if(name==='inventory'){equal(require('../dist/inventory.js').normalize({weapons:{W03:3,W20:2},skills:{BURST:3,S_GUARD:2}}),{weapons:{W03:3,W20:2},skills:{BURST:3,S_GUARD:2}},'all legacy stock retained');}
 else if(name==='campaign-run'){const Run=require('../dist/campaign-run.js');equal(Run.chapter(100),10,'chapters retained');equal(Run.decode(Run.checkpoint(99,{weapons:{W03:2}},['L002:weapon:W02'],'test',7)).inventory,{weapons:{W03:2},skills:{}},'checkpoint retains legacy stock');}
 else if(name==='save'){const S=require('../dist/save.js');equal([S.key,S.schemaVersion,S.resetVersion],[original('save').key,8,2],'save identity preserved');}
 else {const current=require(path.resolve(__dirname,'../dist',file)),before=original(name);for(const key of Object.keys(before))if(typeof before[key]!=='function')equal(plain(current[key]),plain(before[key]),'unchanged catalog '+file+'/'+key);}
}
// Later user-authorized map edits supersede only their pinned sources. Keep the
// earlier approvals immutable and compare every other field/map to main0.24.2.
function verifyPostReview(){
 const root=path.resolve(__dirname,'../..'),E=require('../dist/engine.js'),manifest=require('../../design/stage_reviews/STAGES_POST_REVIEW_RUNTIME_20261107.json'),acceptance=require('../../evidence/maps-0250/ACCEPTANCE.json'),bps=require('../../design/expedition_013/stage_blueprints.json').map(beforeCompletionBlueprint),levels=E.levels.map(beforeCompletionLevel),crypto=require('crypto');
 const intro=require('../../design/stage_reviews/STAGES_INTRO_REFINEMENT_RUNTIME_20261107.json'),introIds=new Set(intro.stages.map(r=>r.stage));
 const ids=[3,4,7,8,9,12,14,16,18,19,20,23,26,27,28,29,58,64,92];assert.deepEqual(manifest.stages.map(r=>r.stage),ids);assert.deepEqual(acceptance.changedStages,ids);assert.equal(acceptance.matches,23);
 const prior=file=>JSON.parse(cp.execFileSync('git',['show',acceptance.base+':ARCLINE/'+file],{cwd:root,encoding:'utf8'})),old=prior('design/runtime_campaign_20x5.json').levels,oldBps=prior('design/expedition_013/stage_blueprints.json');
 const designPrior=file=>JSON.parse(cp.execFileSync('git',['show',(manifest.designBaselineMain||manifest.baselineMain)+':ARCLINE/'+file],{cwd:root,encoding:'utf8'})),designOld=designPrior('design/runtime_campaign_20x5.json').levels,designOldBps=designPrior('design/expedition_013/stage_blueprints.json');
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x,sha=x=>crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex'),allowed=new Set(['floors','components','features','spawn','worldWidth','terrainRevision','tacticalGoal','tacticalGoalEn','pickups']);
 for(const row of manifest.stages){
  const source=fs.readFileSync(path.join(root,row.source)),p=JSON.parse(source),n=row.stage;assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sourceSha256,'pinned post-review source '+n);assert.deepEqual(p.before.runtime,designOld[n-1],'actual prior runtime '+n);assert.deepEqual(p.before.blueprint,designOldBps[n-1],'actual prior blueprint '+n);
  assert.deepEqual(levels[n-1],{...p.after.runtime,...(row.integrationPickupOverride?{pickups:row.integrationPickupOverride}:{}),terrainRevision:row.terrainRevision},'exact scoped runtime '+n);assert.deepEqual(bps[n-1],{...p.after.blueprint,terrainRevision:row.terrainRevision},'exact scoped blueprint '+n);
  for(const [key,value]of Object.entries(old[n-1]))if(!allowed.has(key))assert.deepEqual(levels[n-1][key],value,'protected rule '+n+'/'+key);
 }
 assert.equal(acceptance.preservedStages.length,81);
 for(const row of acceptance.preservedStages){assert(!ids.includes(row.stage));if(introIds.has(row.stage)){const current=intro.stages.find(r=>r.stage===row.stage),priorSource=require(path.join(root,current.source));assert.deepEqual(priorSource.before.runtime,old[row.stage-1]);assert.deepEqual(priorSource.before.blueprint,oldBps[row.stage-1]);assert.equal(sha(priorSource.before.runtime),row.runtimeSha256);assert.equal(sha(priorSource.before.blueprint),row.blueprintSha256);continue;}assert.deepEqual(levels[row.stage-1],old[row.stage-1]);assert.deepEqual(bps[row.stage-1],oldBps[row.stage-1]);assert.equal(sha(levels[row.stage-1]),row.runtimeSha256);assert.equal(sha(bps[row.stage-1]),row.blueprintSha256);}
 const pickups=beforeCompletionPickups(require('../../design/pickup_placements.json').placements),previous=prior('design/pickup_placements.json').placements;assert.equal(pickups.length,46);
 for(let i=0;i<pickups.length;i++){const p=pickups[i],before=previous[i],omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['x','h','verification'].includes(k)));assert.deepEqual(omit(p),omit(before),'pickup identity/stock/turn '+p.stage);if(![12,14].includes(p.stage))assert.deepEqual([p.x,p.h],[before.x,before.h]);if(!ids.includes(p.stage)&&!introIds.has(p.stage))assert.deepEqual(p,before);}
 verifyIntro();verifyCompletion();return true;
}
function verifyIntro(){
 const root=path.resolve(__dirname,'../..'),E=require('../dist/engine.js'),m=require('../../design/stage_reviews/STAGES_INTRO_REFINEMENT_RUNTIME_20261107.json'),a=require('../../evidence/maps-0260/ACCEPTANCE.json'),bps=require('../../design/expedition_013/stage_blueprints.json').map(beforeCompletionBlueprint),levels=E.levels.map(beforeCompletionLevel),crypto=require('crypto');
 const ids=[31,37,71,73];assert.deepEqual(m.stages.map(r=>r.stage),ids);assert.deepEqual(a.changedStages,ids);assert.equal(a.matches,7);assert.equal(a.base,m.baseline);assert.equal(a.preservedStages.length,96);
 const prior=f=>JSON.parse(cp.execFileSync('git',['show',m.baseline+':ARCLINE/'+f],{cwd:root,encoding:'utf8'})),old=prior('design/runtime_campaign_20x5.json').levels,oldBps=prior('design/expedition_013/stage_blueprints.json'),canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x,sha=x=>crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex'),allowed=new Set(['floors','components','features','spawn','terrainRevision','tacticalGoal','tacticalGoalEn','pickups']);
 for(const row of m.stages){const buf=fs.readFileSync(path.join(root,row.source)),p=JSON.parse(buf),i=row.stage-1;assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),row.sourceSha256);assert.deepEqual(p.before.runtime,old[i]);assert.deepEqual(p.before.blueprint,oldBps[i]);assert.deepEqual(levels[i],p.after.runtime);assert.deepEqual(bps[i],p.after.blueprint);for(const [k,v]of Object.entries(old[i]))if(!allowed.has(k))assert.deepEqual(levels[i][k],v,'preserved introduction rule '+row.stage+'/'+k);}
 for(const row of a.preservedStages){assert(!ids.includes(row.stage));assert.deepEqual(levels[row.stage-1],old[row.stage-1]);assert.deepEqual(bps[row.stage-1],oldBps[row.stage-1]);assert.equal(sha(levels[row.stage-1]),row.runtimeSha256);assert.equal(sha(bps[row.stage-1]),row.blueprintSha256);}
 const ps=beforeCompletionPickups(require('../../design/pickup_placements.json').placements),op=prior('design/pickup_placements.json').placements;assert.equal(ps.length,46);for(let i=0;i<46;i++){const p=ps[i],before=op[i],omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='verification'));assert.deepEqual(omit(p),omit(before),'all capsule coordinates/stock/identity/turn '+p.stage);if(!m.pickupVerificationChanges.includes(p.stage))assert.deepEqual(p,before);}
 return true;
}

function verifyCompletion(){
 const root=path.resolve(__dirname,'../..'),E=require('../dist/engine.js'),m=completionManifest(),a=require('../../evidence/maps-0270/ACCEPTANCE.json'),bps=require('../../design/expedition_013/stage_blueprints.json').map(require('./reported-fixes-preservation.cjs').blueprint),levels=E.levels.map(require('./reported-fixes-preservation.cjs').level),crypto=require('crypto');
 const ids=[31,34,41,42,43,44,45,46,48,63,81,83,86,87,88,91,97,98,100];assert.deepEqual(m.stages.map(r=>r.stage),ids);assert.deepEqual(a.changedStages,ids);assert.deepEqual(m.textOnlyStages,[41,45]);assert.deepEqual(m.geometryChangedStages,ids.filter(n=>![41,45].includes(n)));assert.equal(a.matches,28);assert.equal(a.ordinaryMatches,26);assert.equal(a.finalRelayMatches,2);assert.equal(a.base,m.baseline);assert.equal(a.preservedStages.length,81);
 const prior=f=>JSON.parse(cp.execFileSync('git',['show',m.baseline+':ARCLINE/'+f],{cwd:root,encoding:'utf8'})),old=prior('design/runtime_campaign_20x5.json').levels,oldBps=prior('design/expedition_013/stage_blueprints.json'),canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x,sha=x=>crypto.createHash('sha256').update(JSON.stringify(canon(x))).digest('hex'),allowed=new Set(['floors','components','features','spawn','worldWidth','terrainRevision','tacticalGoal','tacticalGoalEn','pickups']);
 for(const row of m.stages){const buf=fs.readFileSync(path.join(root,row.source)),p=JSON.parse(buf),i=row.stage-1;assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),row.sourceSha256,'pinned completion source '+row.stage);assert.deepEqual(p.before.runtime,old[i]);assert.deepEqual(p.before.blueprint,oldBps[i]);assert.deepEqual(levels[i],p.after.runtime,'exact scoped current runtime '+row.stage);assert.deepEqual(bps[i],p.after.blueprint,'exact scoped current blueprint '+row.stage);for(const[k,v]of Object.entries(old[i]))if(!allowed.has(k)&&!(row.stage===100&&k==='finalBattle'))assert.deepEqual(levels[i][k],v,'preserved completion rule '+row.stage+'/'+k);
  if(m.textOnlyStages.includes(row.stage))for(const k of ['floors','components','features','spawn','worldWidth','pickups'])assert.deepEqual(levels[i][k],old[i][k],'instruction-only geometry '+row.stage+'/'+k);
 }
 for(const row of a.preservedStages){assert(!ids.includes(row.stage));assert.deepEqual(levels[row.stage-1],old[row.stage-1]);assert.deepEqual(bps[row.stage-1],oldBps[row.stage-1]);assert.equal(sha(levels[row.stage-1]),row.runtimeSha256);assert.equal(sha(bps[row.stage-1]),row.blueprintSha256);}
 const ps=require('./reported-fixes-preservation.cjs').pickups(require('../../design/pickup_placements.json').placements),op=prior('design/pickup_placements.json').placements;assert.equal(ps.length,46);assert.deepEqual(m.pickupCoordinateChanges,[87]);assert.deepEqual(m.pickupVerificationChanges,[34,42,44,87,88,97]);for(let i=0;i<46;i++){const p=ps[i],before=op[i],omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['verification','x','h'].includes(k)));assert.deepEqual(omit(p),omit(before),'all capsule identity/stock/turn '+p.stage);if(p.stage!==87)assert.deepEqual([p.x,p.h],[before.x,before.h]);const change=m.pickupChanges.find(r=>r.stage===p.stage);if(change){assert.deepEqual(change.before,before);assert.deepEqual(change.after,p);}else assert.deepEqual(p,before);}
 const current=levels[99].finalBattle,previous=old[99].finalBattle;for(const[k,v]of Object.entries(previous))if(k!=='maps')assert.deepEqual(current[k],v,'dedicated final relay rule '+k);assert.equal(current.maps.length,4);for(let j=0;j<4;j++){const before=previous.maps[j],after=current.maps[j],mapAllowed=new Set(['floor','floorSegments','parts','floors','components','features','spawns','bossSpawn']);for(const[k,v]of Object.entries(before))if(!mapAllowed.has(k))assert.deepEqual(after[k],v,'final arena metadata '+j+'/'+k);assert.deepEqual(Object.keys(after.spawns),Object.keys(before.spawns));assert.deepEqual(after.features.map(f=>f.type),before.features.map(f=>f.type));assert(after.floors.flat().every(p=>p.every(Number.isFinite)));}
 for(const[file,hash]of Object.entries({...a.reports,...a.finalReports})){const buf=fs.readFileSync(path.join(root,'evidence/maps-0270',file));assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),hash,'pinned completion native inputs '+file);const report=JSON.parse(buf);assert.equal(report.status,'PASS');assert(report.rows.every(r=>r.result==='win'));}
 return true;
}

module.exports={verify,original,verifyPostReview,verifyIntro,verifyCompletion,beforeCompletionLevel,beforeCompletionBlueprint};
