/* STG-only session adapter. Never include in the production runtime list. */
(function (root) {
  'use strict';
  function memoryStorage() {
    const values = new Map();
    return new Proxy(Object.create(null), {
      get(_, key) {
        if (key === 'getItem') return name => values.get(String(name)) ?? null;
        if (key === 'setItem') return (name, value) => { values.set(String(name), String(value)); };
        if (key === 'removeItem') return name => { values.delete(String(name)); };
        if (key === 'clear') return () => values.clear();
        if (key === 'key') return index => [...values.keys()][index] ?? null;
        if (key === 'length') return values.size;
        return values.get(String(key));
      },
      set(_, key, value) { values.set(String(key), String(value)); return true; },
      deleteProperty(_, key) { values.delete(String(key)); return true; },
      ownKeys() { return [...values.keys()]; },
      getOwnPropertyDescriptor(_, key) {
        return values.has(String(key)) ? { configurable: true, enumerable: true, value: values.get(String(key)), writable: true } : undefined;
      },
    });
  }
  function installIsolation(target) {
    // These are per-Window overrides. Do not touch native Storage.prototype or
    // read a native storage getter: other same-origin tabs keep their own APIs.
    const local = memoryStorage(), session = memoryStorage();
    for (const [name, value] of [['localStorage', local], ['sessionStorage', session], ['indexedDB', undefined], ['ytgame', undefined]]) {
      Object.defineProperty(target, name, { value, configurable: false, writable: false });
      if (target[name] !== value) throw Error('Cannot isolate ' + name);
    }
    Object.defineProperty(target.document, 'cookie', {
      configurable: false,
      get() { throw Error('Cookies are disabled in STG'); },
      set() { throw Error('Cookies are disabled in STG'); },
    });
    Object.defineProperty(target.navigator, 'serviceWorker', {
      configurable: false,
      get() { throw Error('Service workers are disabled in STG'); },
    });
    local.setItem('arcline-install-guide-v1', JSON.stringify({ state: 'staging' }));
    return local;
  }
  function initialData(api, stage) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 100) throw RangeError('Stage must be 1–100');
    if (stage === 1) return api.ArcSave.decode(null);
    const cleared = stage - 1;
    const data = api.ArcSave.decode(JSON.stringify({
      schemaVersion: api.ArcSave.schemaVersion,
      campaignResetVersion: api.ArcSave.resetVersion,
      cleared,
      unlockedCharacterIds: api.ArcCrew.joinedAt(cleared),
      joinedCharacterIds: api.ArcCrew.joinedAt(cleared),
      difficulty: 'normal', difficultyConfirmed: true, journeyStarted: true,
      onboarding: { version: 1, step: 'done', tried: [] },
      journal: { introSeen: true, moviesSeen: ['prologue', ...[30, 60].filter(n => cleared >= n).map(String)] },
      chapterRun: api.ArcCampaignRun.checkpoint(stage, {}, [], 'stg-' + stage, 424242),
    }));
    data.campaignInventory = JSON.parse(JSON.stringify(data.chapterRun.inventory));
    for (const mode of ['easy', 'hard']) {
      data.difficultyProgress[mode] = Object.fromEntries(api.ArcSave.progressFields
        .filter(key => data[key] !== undefined)
        .map(key => [key, JSON.parse(JSON.stringify(data[key]))]));
    }
    return data;
  }
  const api = { memoryStorage, installIsolation, initialData };
  if (typeof module !== 'undefined') module.exports = api;
  else Object.defineProperty(root, 'ArcStagingSession', { value: Object.freeze(api) });
})(globalThis);
