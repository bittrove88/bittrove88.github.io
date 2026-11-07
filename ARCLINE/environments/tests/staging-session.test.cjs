'use strict';
const assert = require('node:assert/strict');
const {memoryStorage, installIsolation, initialData} = require('../staging/session.js');
const api = {
  ArcSave: require('../../game/dist/save.js'), ArcCrew: require('../../game/dist/crew.js'),
  ArcCampaignRun: require('../../game/dist/campaign-run.js'),
};
let checks = 0;
function ok(value, message) { checks++; assert(value, message); }
const a = memoryStorage(), b = memoryStorage();
a.setItem('key', 12); ok(a.getItem('key') === '12' && a.length === 1, 'Storage string semantics');
ok(b.getItem('key') === null && Object.keys(a).join() === 'key', 'independent sessions and enumerable keys');
a.removeItem('key'); ok(a.getItem('key') === null, 'remove memory entry');
let nativeReads = 0;
const host = {document: {}, navigator: {}};
for (const key of ['localStorage', 'sessionStorage', 'indexedDB', 'ytgame']) Object.defineProperty(host, key, { configurable: true, get() { nativeReads++; throw Error('native access'); } });
const memory = installIsolation(host);
ok(nativeReads === 0 && memory === host.localStorage && host.ytgame === undefined, 'isolation never reads native storage or SDK');
assert.throws(() => host.document.cookie, /disabled/); assert.throws(() => host.navigator.serviceWorker, /disabled/);
const blocked = {document: {}, navigator: {}};
Object.defineProperty(blocked, 'localStorage', {value: {}, configurable: false});
assert.throws(() => installIsolation(blocked), TypeError);
for (const stage of [1, 2, 10, 30, 50, 60, 99, 100]) {
  const state = initialData(api, stage);
  ok(state.cleared === stage - 1 && !state.journal.moviesSeen.includes('epilogue'), 'uncompleted stage ' + stage);
  if (stage === 1) {
    ok(state.onboarding.step === 'prologue' && !state.difficultyConfirmed, 'fresh first journey');
  } else {
    ok(state.chapterRun.stage === stage && state.chapterRun.seed === 424242 && state.onboarding.step === 'done', 'reproducible direct entry ' + stage);
    for (const mode of ['easy','hard','normal']) {
      const selected = api.ArcSave.prepareDifficulty(state, mode);
      ok(selected.cleared === stage - 1 && selected.chapterRun.stage === stage, 'same unlocked scope after ' + mode);
      ok(selected.unlockedCharacterIds.every(id => api.ArcCrew.joinedAt(stage - 1).includes(id)), 'only expected crew');
    }
    ok(JSON.stringify(initialData(api, stage)) === JSON.stringify(state), 'repeatable fixture ' + stage);
  }
}
for (const n of [0, -1, 101, 1.5, '50', NaN]) assert.throws(() => initialData(api, n), RangeError);
console.log('PASS staging session ' + checks + ' checks');
