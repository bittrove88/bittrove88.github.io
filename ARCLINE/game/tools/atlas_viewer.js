(function (root) {
  'use strict';
  const E = root.ArcEngine, F = root.ArcFinalTeam, Camera = root.ArcMapCamera;
  const $ = id => document.getElementById(id);
  const states = new Map(), byCanvas = new WeakMap(), errors = [];
  let entries = [], current = null, pointer = null;
  const toolbar = document.querySelector('.toolbar');
  // The production renderer annotates this HUD host on touch screens.
  const hudHost = document.createElement('div');
  hudHost.id = 'battle';
  hudHost.hidden = true;
  hudHost.setAttribute('inert', '');
  hudHost.dataset.atlasContext = 'true';
  document.body.append(hudHost);
  const mode = document.createElement('select');
  mode.id = 'atlasMode';
  mode.setAttribute('aria-label', 'マップの表示');
  mode.innerHTML = '<option value="native">背景・オブジェクトつき</option><option value="geometry">地形図</option>';
  toolbar.prepend(mode);
  const turn = document.createElement('select');
  turn.id = 'atlasTurn';
  turn.setAttribute('aria-label', '機構の表示ターン');
  for (let n = 1; n <= 6; n++) turn.add(new Option('表示ターン ' + n, n));
  mode.after(turn);
  const download = document.createElement('button');
  download.id = 'atlasDownload';
  download.textContent = 'HTMLを保存';
  toolbar.append(download);
  const dialog = document.createElement('dialog');
  dialog.id = 'atlasDialog';
  dialog.className = 'atlas-dialog';
  dialog.setAttribute('aria-labelledby', 'atlasTitle');
  dialog.innerHTML = '<div class="atlas-dialog-head"><div><h2 id="atlasTitle"></h2><p id="atlasSubtitle"></p></div><button id="atlasClose" type="button">閉じる</button></div><canvas id="atlasStage" class="atlas-stage" aria-label="拡大マップ"></canvas><div class="atlas-view-controls"><button id="atlasOut" type="button" aria-label="縮小">−</button><output id="atlasZoom">100%</output><button id="atlasIn" type="button" aria-label="拡大">＋</button><button id="atlasFit" type="button">全体</button><label class="atlas-view-label">機構の状態<select id="atlasModalTurn"></select></label><button id="atlasPng" type="button">画像を保存</button></div><p class="atlas-help">ドラッグで移動・＋／−で拡大縮小。表示ターンで橋や風などの状態を切り替えられます。</p><p id="atlasCaption" class="atlas-caption"></p>';
  document.body.append(dialog);
  for (let n = 1; n <= 6; n++) $('atlasModalTurn').add(new Option(n + 'ターン', n));
  const large = $('atlasStage'), largeRenderer = root.ArcRender.create(large);
  const legacyRender = render;
  const originalLegend = document.querySelector('.legend').innerHTML;
  const originalNote = document.querySelector('.note').textContent;
  const manifest = JSON.parse($('atlasNativeManifest').textContent);
  document.querySelector('header p').textContent = '全100面と最終戦4戦場を、最新の背景・地形・オブジェクトで確認。各マップを選ぶと拡大できます。';

  function report(error) {
    errors.push(String(error));
    console.error(error);
    let notice = $('atlasError');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'atlasError';
      notice.className = 'atlas-render-error';
      notice.setAttribute('role', 'alert');
      toolbar.after(notice);
    }
    notice.textContent = 'マップを表示できませんでした。ページを再読み込みしてください。';
  }
  function stateFor(stage, arena, round) {
    const key = [stage, arena, round].join(':');
    if (states.has(key)) return states.get(key);
    const s = E.campaign(stage, {equippedCharacterId: 'gun', difficulty: 'normal', matchSeed: 4697, battleInventory: {}});
    // Static inspection of each relay entry, using the existing placement API.
    // This is a visual state selection, not a played battle or a win witness.
    if (stage === 100) {
      while (s.finalTeam.map < arena) {
        const amount = F.credit(s, s.characterId, s.spec.finalBattle.requiredDamage);
        s.units[1].hp -= amount;
        F.advance(s);
      }
      E.rebuildWorld(s);
    }
    // Advance only the existing environment boundary; no attacks or save writes.
    while (s.round < round) E.boundary(s);
    s.phase = 'aim';
    states.set(key, s);
    return s;
  }
  function frame(canvas) {
    const pad = Math.min(14, canvas.clientWidth * .025);
    return {left: pad, top: pad, width: Math.max(1, canvas.clientWidth - pad * 2), height: Math.max(1, canvas.clientHeight - pad * 2)};
  }
  function draw(renderer, canvas, state, view) {
    renderer.draw(state, {cameraView: view, presentationFrame: {top: 0, bottom: canvas.clientHeight}, canAim: false, reducedMotion: true, time: 0});
  }
  function paint(entry) {
    if (mode.value !== 'native' || !entry.canvas.clientWidth) return;
    const round = Number(turn.value), s = stateFor(entry.stage, entry.arena, round);
    const key = [round, entry.canvas.clientWidth, entry.canvas.clientHeight].join(':');
    if (entry.key === key) return;
    draw(entry.renderer, entry.canvas, s, Camera.fit(Camera.bounds(s), frame(entry.canvas)));
    entry.key = key;
    entry.canvas.dataset.ready = 'true';
    entry.canvas.dataset.scene = root.ArcBackgrounds.sceneFor(s).id;
  }
  const observer = new IntersectionObserver(list => {
    for (const item of list) if (item.isIntersecting) {
      const entry = byCanvas.get(item.target);
      if (entry) try {paint(entry);} catch (error) {report(error);}
    }
  }, {rootMargin: '400px'});
  const resize = new ResizeObserver(list => {
    for (const item of list) {
      if (item.target === large) {if (current && dialog.open) fitLarge();continue;}
      const entry = byCanvas.get(item.target);
      if (entry?.key) try {paint(entry);} catch (error) {report(error);}
    }
  });
  resize.observe(large);
  function mount() {
    observer.disconnect();
    for (const entry of entries) resize.unobserve(entry.canvas);
    entries = [];
    for (const tile of document.querySelectorAll('.tile')) {
      const label = tile.querySelector('.tile-head b').textContent.trim();
      const parts = label.split('/').map(x => Number(x.trim()));
      const stage = parts[0], arena = parts.length > 1 ? parts[1] - 1 : 0;
      if (!Number.isInteger(stage) || stage < 1 || stage > 100) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'atlas-open';
      button.setAttribute('aria-label', label + ' ' + tile.querySelector('.tile-head span').textContent + 'を拡大');
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.dataset.stage = stage;
      canvas.dataset.arena = arena;
      button.append(canvas);
      tile.querySelector('svg').before(button);
      const entry = {stage, arena, canvas, button, renderer: root.ArcRender.create(canvas), key: ''};
      button.onclick = () => open(entry);
      entries.push(entry);
      byCanvas.set(canvas, entry);
      observer.observe(canvas);
      resize.observe(canvas);
    }
  }
  function refresh() {legacyRender();mount();}
  function setMode() {
    document.body.classList.toggle('atlas-native', mode.value === 'native');
    const native = mode.value === 'native';
    turn.disabled = !native;
    document.querySelector('.legend').innerHTML = native ? '<span>ゲームと同じ背景・地形・機構・機体を表示</span><span>マップを選択して拡大</span><span>状態の閲覧用表示です。戦闘・セーブは進行しません。</span>' : originalLegend;
    document.querySelector('.note').textContent = native ? '難易度は設計上の区分です。機構の表示ターンを選んで、橋・送風・噴気・取得物などの状態を確認できます。100面の4戦場は下段に個別掲載しています。配置と機構状態の閲覧用表示で、対戦結果を示すものではありません。' : originalNote;
    if (native) for (const entry of entries) observer.observe(entry.canvas);
  }
  function fitLarge() {
    if (!current || !large.clientWidth || !dialog.open) return;
    const s = stateFor(current.stage, current.arena, Number($('atlasModalTurn').value));
    current.state = s;
    current.bounds = Camera.bounds(s);
    current.view = Camera.fit(current.bounds, frame(large));
    drawLarge();
  }
  function drawLarge() {
    if (!current) return;
    draw(largeRenderer, large, current.state, current.view);
    const base = Camera.fit(current.bounds, frame(large)).scale;
    $('atlasZoom').textContent = Math.round(current.view.scale / base * 100) + '%';
  }
  function open(entry) {
    const spec = E.levels[entry.stage - 1], arena = spec.finalBattle?.maps[entry.arena];
    current = {stage: entry.stage, arena: entry.arena, button: entry.button};
    $('atlasTitle').textContent = (entry.stage === 100 ? '100 / ' + (entry.arena + 1) : String(entry.stage).padStart(3, '0')) + '｜' + (arena?.name.ja || spec.name);
    $('atlasSubtitle').textContent = spec.themeName + ' · ' + (arena ? '最終戦 ' + (entry.arena + 1) : spec.boss ? 'ボス' : spec.midboss ? '中ボス' : '通常ステージ') + ' · v' + manifest.version;
    $('atlasCaption').textContent = spec.tacticalGoal;
    $('atlasModalTurn').value = turn.value;
    dialog.showModal();
    fitLarge();
  }
  function zoom(factor, anchor = {x: large.clientWidth / 2, y: large.clientHeight / 2}) {
    if (!current) return;
    current.view = Camera.zoom(current.view, factor, anchor, current.bounds, frame(large));
    drawLarge();
  }
  function point(event) {
    const r = large.getBoundingClientRect();
    return {x: (event.clientX - r.left) * large.clientWidth / r.width, y: (event.clientY - r.top) * large.clientHeight / r.height};
  }
  large.onpointerdown = event => {
    if (!current || !event.isPrimary || event.button !== 0) return;
    pointer = {id: event.pointerId, origin: point(event), view: {...current.view}};
    large.setPointerCapture(event.pointerId);
  };
  large.onpointermove = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const p = point(event);
    current.view = Camera.constrain({...pointer.view, x: pointer.view.x + p.x - pointer.origin.x, y: pointer.view.y + p.y - pointer.origin.y}, current.bounds, frame(large));
    drawLarge();
  };
  const release = event => {if (pointer?.id === event.pointerId) pointer = null;};
  large.onpointerup = large.onpointercancel = release;
  large.addEventListener('wheel', event => {event.preventDefault();zoom(Math.exp(-event.deltaY * .0015), point(event));}, {passive: false});
  $('atlasClose').onclick = () => dialog.close();
  dialog.addEventListener('click', event => {if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close();});
  dialog.addEventListener('close', () => {pointer = null;current?.button.focus();current = null;});
  $('atlasIn').onclick = () => zoom(1.3);
  $('atlasOut').onclick = () => zoom(1 / 1.3);
  $('atlasFit').onclick = fitLarge;
  $('atlasModalTurn').onchange = fitLarge;
  $('atlasPng').onclick = () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = large.toDataURL('image/png');
    a.download = 'ARCLINE_' + current.stage + (current.stage === 100 ? '_' + (current.arena + 1) : '') + '_turn' + $('atlasModalTurn').value + '.png';
    a.click();
  };
  async function renderAll() {
    if (mode.value !== 'native') return;
    for (let i = 0; i < entries.length; i++) {
      paint(entries[i]);
      if (i % 8 === 7) await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }
  mode.onchange = setMode;
  turn.onchange = () => {
    for (const entry of entries) entry.key = '';
    for (const entry of entries) if (entry.canvas.getBoundingClientRect().bottom >= -400 && entry.canvas.getBoundingClientRect().top <= innerHeight + 400) paint(entry);
  };
  $('filter').onchange = $('difficulty').onchange = refresh;
  $('print').onclick = async () => {await renderAll();window.print();};
  download.onclick = async () => {
    const copy = document.documentElement.cloneNode(true);
    copy.querySelectorAll('#atlasMode,#atlasTurn,#atlasDownload,#atlasDialog,#atlasError,[data-atlas-context],.atlas-open').forEach(node => node.remove());
    copy.querySelector('body').classList.remove('atlas-native');
    copy.querySelector('.legend').innerHTML = originalLegend;
    copy.querySelector('.note').textContent = originalNote;
    for (const id of ['filter', 'difficulty']) {
      const select = copy.querySelector('#' + id);
      while (select.options.length > 1) select.remove(1);
    }
    const html = '<!doctype html>\n' + copy.outerHTML;
    const url = URL.createObjectURL(new Blob([html], {type: 'text/html;charset=utf-8'}));
    const a = document.createElement('a');a.href = url;a.download = 'ARCLINE_100_MAP_ATLAS_v' + manifest.version + '.html';a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  root.ArcMapAtlas = Object.freeze({
    renderAll,
    get metrics() {return {version: manifest.version, tiles: entries.length, rendered: entries.filter(e => e.canvas.dataset.ready === 'true').length, uniqueMaps: new Set(entries.map(e => e.stage + ':' + e.arena)).size, scenes: [...new Set(entries.filter(e => e.canvas.dataset.scene).map(e => e.canvas.dataset.scene))], errors: [...errors]};},
    get current() {return current ? {stage: current.stage, arena: current.arena, view: {...current.view}, round: current.state.round, scene: root.ArcBackgrounds.sceneFor(current.state).id} : null;}
  });
  try {setMode();mount();} catch (error) {report(error);}
})(globalThis);
