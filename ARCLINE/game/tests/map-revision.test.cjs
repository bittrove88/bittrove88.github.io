'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto'),E=require('../dist/engine.js'),base=require('./fixtures/integration-baseline.json');
const approved=require('../../design/stage_reviews/STAGES_051_099_APPROVED_RUNTIME.json').stages;
assert.deepEqual(approved.map(r=>r.stage),Array.from({length:49},(_,i)=>51+i));
for(const row of approved){const s=E.levels[row.stage-1],g=row.geometry,source=fs.readFileSync(path.join(__dirname,'../..',row.source));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),row.sourceSha256,'pinned approval source '+row.stage);assert.deepEqual(s.floors,g.floors);assert.deepEqual(s.features,g.features);assert.deepEqual(s.components.map(p=>[p.id,p.poly,p.destructible,p.reflectiveUnderside]),g.parts.map(p=>[p.id,p.poly,p.breakable,p.reflectiveUnderside]));assert.deepEqual(s.spawn,g.spawn);assert.equal(s.worldWidth,g.worldWidth);assert.equal(s.terrainRevision,'7.0-approved-051-099');for(const round of [1,2,3]){const world=E.geometry.world(s,round);assert(world.solids.every(o=>o.poly.every(p=>Number.isFinite(p.x+p.y))));}}
for(const [key,value] of Object.entries(base.levels[99]))assert.deepEqual(E.levels[99][key],value,'preserve final relay '+key);
require('./integration-preservation.cjs').verify('geometry.js');
console.log('PASS approved51-99 geometry,source hashes,147 changing worlds;unchanged100');
