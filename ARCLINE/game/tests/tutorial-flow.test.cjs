'use strict';
const assert = require('node:assert/strict');
const E = require('../dist/engine.js');
const L = require('../dist/lessons.js');
const P = require('../dist/preview.js');
const Save = require('../dist/save.js');
const Guide = require('../dist/special-ui.js');
let checks = 0;
const same = (a,b,message) => { assert.deepEqual(a,b,message); checks++; };
const ok = (value,message) => { assert(value,message); checks++; };
const removed = ['slope','height','pickup','boss-swap','ceiling-lift','gate-choices','touch-controls-v2','wall-fall','choices','W01','S_REPAIR'];
const read = {seenPreviewIds: []};
const actual = [];
for (let stage=1; stage<=100; stage++) {
  const state=E.campaign(stage), before=JSON.stringify(state), random=state.random;
  for (const lesson of L.forStage(state,read)) {
    const preview=P.create(state,lesson.id);
    ok(preview?.proof.valid,`a real example exists at the authored introduction ${stage}/${lesson.id}`);
    actual.push([stage,lesson.id]);
    read.seenPreviewIds.push(lesson.key);
  }
  same(JSON.stringify(state),before,`planning cannot spend resources or alter the world at ${stage}`);
  same(state.random,random,`planning keeps the live random source at ${stage}`);
}
same(actual,[[1,'controls'],[2,'aim'],[3,'move'],[4,'teleport'],[6,'reflection'],[7,'destruction'],[8,'roof'],[10,'boss-core'],[21,'C'],[31,'K'],[37,'B'],[41,'U'],[49,'F'],[65,'V'],[71,'M'],[73,'terminal']], 'the approved introduction order, application stages and all feature lessons remain');
same(L.forStage(E.campaign(21),{seenPreviewIds:[]}).map(l=>l.id),['controls','C'],'returning-player controls do not discard the current cloud lesson');
const midboss=E.campaign(5,{battleInventory:{weapons:{W02:3},skills:{S_GUARD:2,S_REPAIR:2}}});
same(L.forStage(midboss,{seenPreviewIds:['v5:controls','v5:teleport']}),[],'a midboss does not start a major-boss core or carried-equipment demo');
ok(E.encounters.forSpec(midboss.spec).feature.includes('破壊すると攻撃ダメージが半減'),'the existing midboss introduction states the actual destruction condition');
for(const id of removed) {
  same(L.describe(id),null,`unused dedicated description is removed: ${id}`);
  same(P.create(E.campaign(10),id),null,`unused dedicated playback is removed: ${id}`);
}
same(L.describe('W'),L.describe('reflection'),'manual W reuses the canonical reflection lesson');
ok(L.seen('reflection',{seenPreviewIds:['v5:W']}),'historical manual acknowledgement suppresses a duplicate reflection lesson');
ok(P.create(E.campaign(6),'W')?.proof.valid,'manual reflection playback remains available');
for (const id of L.ids.filter(id=>/^W\d\d$|^S_/.test(id)||E.skills.includes(id))) {
  const state=E.campaign(10), before=JSON.stringify(state);
  ok(P.create(state,id)?.proof.valid,`selected equipment keeps its real example: ${id}`);
  same(JSON.stringify(state),before,`selected equipment preview cannot spend stock: ${id}`);
}
const old={...Save.decode(null),cleared:19,journeyStarted:true,difficultyConfirmed:true,seenPreviewIds:['v5:controls','v5:aim','v5:pickup','v5:wall-fall','v5:W','v6:special-charge','v7:touch-controls','v7:character-change'],campaignInventory:{weapons:{W02:3},skills:{S_REPAIR:2}},pickupLedger:['L004:SK004']};
const restored=Save.decode(JSON.stringify(old));
same(restored.seenPreviewIds,old.seenPreviewIds,'removed lesson keys remain readable without replaying onboarding');
same(restored.cleared,19,'old progress survives');
same(restored.campaignInventory,old.campaignInventory,'old stock survives');
same(Guide.pagesFor('controls',{seenPreviewIds:[]},E.campaign(1)).map(p=>p.kind),['special'],'level1 keeps the special explanation inside the firing flow');
same(Guide.pagesFor('aim',{seenPreviewIds:['v6:special-charge']},E.campaign(2)).map(p=>p.kind),['map'],'level2 keeps the map guide inside the aiming flow');
same(Guide.remaining(restored,E.campaign(2)),[],'completed existing guides do not replay after migration');
same(Guide.remaining({seenPreviewIds:['v5:aim','v6:special-charge']},E.campaign(2)).map(p=>p.kind),['map'],'an interrupted map page resumes without replaying the completed aiming demo');
console.log(JSON.stringify({phase:process.env.ARCLINE_PRECHECK?'precheck':'verification',checks,status:'PASS',scope:'Authored introductions, real preview isolation, removed definitions, manual reflection, old progress/stock/read flags, combined guide planning.'}));
