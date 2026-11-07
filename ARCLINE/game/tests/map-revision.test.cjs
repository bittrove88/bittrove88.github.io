'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),E=require('../dist/engine.js'),base=require('./fixtures/integration-baseline.json');
const postReview=require('../../design/stage_reviews/STAGES_POST_REVIEW_RUNTIME_20261107.json').stages,postIds=new Set(postReview.map(r=>r.stage));
require('./integration-preservation.cjs').verifyPostReview();
const approved=require('../../design/stage_reviews/STAGES_051_099_APPROVED_RUNTIME.json').stages.map(old=>postReview.find(r=>r.stage===old.stage)||old);
assert.deepEqual(approved.map(r=>r.stage),Array.from({length:49},(_,i)=>51+i));
for(const row of approved){const s=E.levels[row.stage-1],g=row.geometry,source=fs.readFileSync(path.join(__dirname,'../..',row.source));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sourceSha256,'pinned approval source '+row.stage);assert.deepEqual(s.floors,g.floors);assert.deepEqual(s.features,g.features);assert.deepEqual(s.components.map(p=>[p.id,p.poly,p.destructible,p.reflectiveUnderside]),g.parts.map(p=>[p.id,p.poly,p.breakable,p.reflectiveUnderside]));assert.deepEqual(s.spawn,g.spawn);assert.equal(s.worldWidth,g.worldWidth);assert.equal(s.terrainRevision,row.terrainRevision||'7.0-approved-051-099');for(const round of [1,2,3]){const world=E.geometry.world(s,round);assert(world.solids.every(o=>o.poly.every(p=>Number.isFinite(p.x+p.y))));}}
// Approved early/mid refinements supersede only these five sources.
const refined=require('../../design/stage_reviews/STAGES_IDEA_REFINEMENT_APPROVED_RUNTIME.json').stages;
assert.deepEqual(refined.map(r=>r.stage),[17,33,36,39,47]);
for(const row of refined){const s=E.levels[row.stage-1],g=row.geometry,source=fs.readFileSync(path.join(__dirname,'../..',row.source));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sourceSha256);assert.deepEqual(s.floors,g.floors);assert.deepEqual(s.features,g.features);assert.deepEqual(s.components.map(p=>[p.id,p.poly,p.destructible]),g.parts.map(p=>[p.id,p.poly,p.breakable]));assert.deepEqual(s.spawn,g.spawn);assert.equal(s.worldWidth,g.worldWidth);assert.equal(s.terrainRevision,row.terrainRevision);for(const [k,v] of Object.entries(row.rules))assert.deepEqual(s[k],v,'preserved refined rule '+row.stage+'/'+k);}
const acceptance=require('../../evidence/maps-0241/ACCEPTANCE.json'),blueprints=require('../../design/expedition_013/stage_blueprints.json');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x,sha=x=>crypto.createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
assert.equal(acceptance.preservedStages.length,95);for(const row of acceptance.preservedStages.filter(r=>!postIds.has(r.stage))){assert.equal(sha(require('./pickup-placement-preservation.cjs')(E.levels[row.stage-1])),row.runtimeSha256,'unchanged runtime '+row.stage);assert.equal(sha(blueprints[row.stage-1]),row.blueprintSha256,'unchanged blueprint '+row.stage);}
for(const [key,value] of Object.entries(base.levels[99]))assert.deepEqual(E.levels[99][key],value,'preserve final relay '+key);
require('./integration-preservation.cjs').verify('geometry.js');
console.log('PASS approved51-99 and five refinements, pinned sources, unchanged95 data and final relay');
