'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),vm=require('vm'),assert=require('assert/strict'),cache={};
const plain=x=>JSON.parse(JSON.stringify(x));
function original(name){name=name.replace(/^\.\//,'').replace(/\.js$/,'');if(cache[name])return cache[name];const m={exports:{}};vm.runInNewContext(cp.execFileSync('git',['show','4bcf554:ARCLINE/game/dist/'+name+'.js'],{encoding:'utf8'}),{module:m,require:original});return cache[name]=m.exports;}
function verify(file,equal=assert.deepEqual){
 const name=file.replace(/\.js$/,''),E=require('../dist/engine.js'),G=E.geometry,W=require('../dist/weapons.js');
 if(['geometry','physics','engine','render','visual-art'].includes(name)){
  const before=original('geometry');for(const n of [100])for(const round of [1,2,3]){
   const current=plain(G.world(E.levels[n-1],round)),old=plain(before.world(original('levels')[n-1],round)),added=current.surfaces.slice(old.surfaces.length);
   // 0.23.1 adds support edges to existing projectile colliders. Keep every
   // old surface, polygon, region and terminal byte-identical.
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
 const root=path.resolve(__dirname,'../..'),E=require('../dist/engine.js'),manifest=require('../../design/stage_reviews/STAGES_POST_REVIEW_RUNTIME_20261107.json'),acceptance=require('../../evidence/maps-0250/ACCEPTANCE.json'),bps=require('../../design/expedition_013/stage_blueprints.json'),crypto=require('crypto');
 const ids=[3,4,7,8,9,12,14,16,18,19,20,23,26,27,28,29,58,64,92];assert.deepEqual(manifest.stages.map(r=>r.stage),ids);assert.deepEqual(acceptance.changedStages,ids);assert.equal(acceptance.matches,22);
 const prior=file=>JSON.parse(cp.execFileSync('git',['show',acceptance.base+':ARCLINE/'+file],{cwd:root,encoding:'utf8'})),old=prior('design/runtime_campaign_20x5.json').levels,oldBps=prior('design/expedition_013/stage_blueprints.json');
 const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x,sha=x=>crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex'),allowed=new Set(['floors','components','features','spawn','worldWidth','terrainRevision','tacticalGoal','tacticalGoalEn','pickups']);
 for(const row of manifest.stages){
  const source=fs.readFileSync(path.join(root,row.source)),p=JSON.parse(source),n=row.stage;assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sourceSha256,'pinned post-review source '+n);assert.deepEqual(p.before.runtime,old[n-1],'actual prior runtime '+n);assert.deepEqual(p.before.blueprint,oldBps[n-1],'actual prior blueprint '+n);
  assert.deepEqual(E.levels[n-1],{...p.after.runtime,terrainRevision:row.terrainRevision},'exact scoped runtime '+n);assert.deepEqual(bps[n-1],{...p.after.blueprint,terrainRevision:row.terrainRevision},'exact scoped blueprint '+n);
  for(const [key,value]of Object.entries(old[n-1]))if(!allowed.has(key))assert.deepEqual(E.levels[n-1][key],value,'protected rule '+n+'/'+key);
 }
 assert.equal(acceptance.preservedStages.length,81);
 for(const row of acceptance.preservedStages){assert(!ids.includes(row.stage));assert.deepEqual(E.levels[row.stage-1],old[row.stage-1]);assert.deepEqual(bps[row.stage-1],oldBps[row.stage-1]);assert.equal(sha(E.levels[row.stage-1]),row.runtimeSha256);assert.equal(sha(bps[row.stage-1]),row.blueprintSha256);}
 const pickups=require('../../design/pickup_placements.json').placements,previous=prior('design/pickup_placements.json').placements;assert.equal(pickups.length,46);
 for(let i=0;i<pickups.length;i++){const p=pickups[i],before=previous[i],omit=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['x','h','verification'].includes(k)));assert.deepEqual(omit(p),omit(before),'pickup identity/stock/turn '+p.stage);if(p.stage!==29)assert.deepEqual([p.x,p.h],[before.x,before.h]);if(!ids.includes(p.stage))assert.deepEqual(p,before);}
 return true;
}
module.exports={verify,original,verifyPostReview};
