/* This is the only game loader in the STG artifact. Isolation must succeed first. */
(async function () {
  'use strict';
  const loading = document.getElementById('loading');
  try {
    const config = JSON.parse(document.getElementById('staging-config').textContent);
    if (config.environment !== 'staging' || !location.pathname.startsWith(config.sitePath + 'game/')) throw Error('Invalid STG deployment path');
    const params = new URLSearchParams(location.search);
    const raw = params.get('stage');
    const stage = raw === null ? 1 : /^\d{1,3}$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(stage) || stage < 1 || stage > 100) throw Error('開始ステージは1〜100で指定してください。');
    if (params.has('preview')) throw Error('このSTGでは開始ステージから確認してください。');
    const memory = ArcStagingSession.installIsolation(globalThis);
    const load = name => new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = name + '?v=' + encodeURIComponent(config.runtimeCacheVersion);
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(Error('読込失敗: ' + name));
      document.body.append(script);
    });
    Object.defineProperty(globalThis, 'ArcStaging', { value: Object.freeze({
      environment: 'staging', sourceCommit: config.sourceCommit, initialStage: stage,
      fixture: 'stage-entry-v1', initialSeed: stage > 1 ? 424242 : null,
    }) });
    const badge = document.createElement('details');
    badge.id = 'stagingBadge';
    const summary = document.createElement('summary');
    summary.textContent = 'STG・保存なし';
    const info = document.createElement('p');
    info.textContent = config.version + ' / ' + config.sourceCommit.slice(0, 8) + (config.sourceDirty ? ' + local changes' : '') + ' / 開始 ' + stage + '面';
    const note = document.createElement('p');
    note.textContent = 'このプレイ中のみ保持。再読込で初期化。機体・在庫は検証用の初期状態です。';
    const reset = document.createElement('a');
    reset.href = '../'; reset.textContent = '開始ステージを選び直す';
    badge.append(summary, info, note, reset); document.body.append(badge);
    for (const name of config.scripts) {
      if (name === 'game.js') {
        memory.setItem(ArcSave.key, JSON.stringify(ArcStagingSession.initialData(globalThis, stage)));
        const status = document.getElementById('saveStatus');
        const refresh = () => {
          const label = globalThis.ArcI18n?.language === 'en' ? 'STG · Session only' : 'STG・このプレイ中のみ';
          if (status.textContent !== label) status.textContent = label;
        };
        new MutationObserver(refresh).observe(status, { childList: true, characterData: true, subtree: true });
        refresh();
      }
      await load(name);
      if (name === 'device.js') {
        // Fullscreen fallback and settings must not offer PWA installation.
        globalThis.ArcDevice = Object.freeze({ ...ArcDevice, offer(done = () => {}) { done(); } });
      }
    }
    document.documentElement.dataset.stagingReady = 'true';
  } catch (error) {
    // No runtime scripts are present in the HTML to bypass this loader.
    document.getElementById('app').hidden = true;
    loading.hidden = false;
    loading.textContent = 'STGを起動できません: ' + error.message;
    loading.setAttribute('role', 'alert');
    document.documentElement.dataset.stagingError = String(error.message);
  }
})();
