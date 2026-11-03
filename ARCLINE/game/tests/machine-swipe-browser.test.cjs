'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const Save = require('../dist/save.js'), Run = require('../dist/campaign-run.js');
const root = path.resolve(__dirname, '../../..');
const out = process.env.ARCLINE_EVIDENCE_DIR || '/tmp/arcline-machine-swipe';
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const rows = [], errors = [];
function ok(value, message) { checks++; assert(value, message); }
const server = http.createServer((req, res) => {
  let name = new URL(req.url, 'http://localhost').pathname;
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, bytes) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpeg': 'image/jpeg', '.m4a': 'audio/mp4' })[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
});
// Intersect every clipping ancestor. A button's DOM rectangle alone can be
// outside the actual scroll viewport, especially in the portrait roster.
async function point(page, selector) {
  return page.locator(selector).evaluate(e => {
    const r = e.getBoundingClientRect();
    let left = Math.max(0, r.left), right = Math.min(innerWidth, r.right);
    let top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom);
    for (let p = e.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p), b = p.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(s.overflowX)) { left = Math.max(left, b.left); right = Math.min(right, b.right); }
      if (/auto|scroll|hidden|clip/.test(s.overflowY)) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
    }
    if (right - left < 20 || bottom - top < 28) return null;
    const x = (left + right) / 2, y = (top + bottom) / 2;
    const hit = document.elementFromPoint(x, y);
    return hit && (hit === e || e.contains(hit)) ? { x, y } : null;
  });
}
async function scrollState(page, selector) {
  return page.locator(selector).evaluate(e => {
    const values = [];
    for (let p = e; p; p = p.parentElement) values.push(p.scrollTop);
    return values;
  });
}
async function swipe(page, cdp, selector, direction = -1) {
  const from = await page.locator(selector).evaluate((e, direction) => {
    const app = document.getElementById('app'), viewport = ArcViewport;
    const logical = node => viewport.rect(node, app), r = logical(e);
    const native = app.getBoundingClientRect(), rotation = Number(app.dataset.viewRotation) || 0;
    const client = (x, y) => rotation === 90 ? { x: native.right-y*native.width/app.clientHeight, y: native.top+x*native.height/app.clientWidth }
      : rotation === -90 ? { x: native.left+y*native.width/app.clientHeight, y: native.bottom-x*native.height/app.clientWidth }
      : rotation === 180 ? { x: native.right-x*native.width/app.clientWidth, y: native.bottom-y*native.height/app.clientHeight }
      : { x: native.left+x*native.width/app.clientWidth, y: native.top+y*native.height/app.clientHeight };
    let top = Math.max(0, r.top), bottom = Math.min(app.clientHeight, r.bottom);
    for (let p = e.parentElement; p && p !== app; p = p.parentElement) {
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowY)) {
        const b = logical(p); top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
      }
    }
    const candidates = [...e.querySelectorAll('button,[data-hero-art],.ch-copy p')];
    if (direction < 0) candidates.reverse();
    let best = null;
    for (const child of candidates) {
      const b = logical(child), lo = Math.max(top + 4, b.top), hi = Math.min(bottom - 4, b.bottom);
      if (hi - lo < 24) continue;
      const x = b.x + b.width / 2, y = direction < 0 ? hi - 8 : lo + 8;
      const start = client(x, y), hit = document.elementFromPoint(start.x, start.y);
      if (!hit || !(child === hit || child.contains(hit))) continue;
      const end = direction < 0 ? Math.max(top + 8, y - 160) : Math.min(bottom - 8, y + 160);
      if (Math.abs(end - y) > 20 && (!best || Math.abs(end - y) > Math.abs(best.end - best.y))) best = { x, y, end, start, finish: client(x, end) };
    }
    return best;
  }, direction);
  assert(from && Math.abs(from.end - from.y) > 20, 'a real, visible surface is available to swipe: ' + selector);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from.start }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: from.start.x+(from.finish.x-from.start.x)*i/12, y: from.start.y+(from.finish.y-from.start.y)*i/12 }] });
    await page.waitForTimeout(18);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
}
async function tap(page, selector) {
  const p = await point(page, selector);
  assert(p, 'tap target must already be visible without automatic scrolling: ' + selector);
  await page.touchscreen.tap(p.x, p.y);
}
async function reach(page, cdp, selector, scroller) {
  for (let i = 0; i < 24; i++) {
    if (await point(page, selector)) return;
    await swipe(page, cdp, scroller);
  }
  throw Error('Cannot reach by native swipes: ' + selector);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height, lang] of [[844, 390, 'ja'], [568, 240, 'ja'], [844, 390, 'en'], [390, 844, 'ja']]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
      await context.addInitScript(data => {
        localStorage.setItem('arcline-campaign-v1', JSON.stringify(data));
        localStorage.setItem('arcline-install-guide-v1', JSON.stringify({ state: 'closed' }));
      }, { schemaVersion: 8, campaignResetVersion: 2, cleared: 6, difficultyConfirmed: true, journeyStarted: true,
        preferences: { language: lang }, unlockedCharacterIds: Save.characterIds, seenPreviewIds: Save.previewIds,
        journal: { moviesSeen: ['prologue'] }, chapterRun: Run.checkpoint(7, { weapons: { W06: 2 }, skills: { BURST: 2 } }, [], 'machine-swipe', 20261031) });
      const page = await context.newPage(), cdp = await context.newCDPSession(page);
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto('http://127.0.0.1:' + server.address().port + '/ARCLINE/game/dist/');
      await page.waitForFunction('!document.getElementById("play").disabled');
      const checkpoint = await page.evaluate('JSON.stringify(save.data.chapterRun)');
      await tap(page, '#openCharacters');
      const scroller = '.machine-buttons';
      const before = await scrollState(page, scroller);
      await swipe(page, cdp, scroller);
      const after = await scrollState(page, scroller);
      ok(after.some((n, i) => n > before[i] + 10), 'swiping a card actually scrolls ' + width + '/' + lang);
      ok(await page.locator('[data-confirm-character]').getAttribute('data-confirm-character') === 'gun', 'swipe never accidentally inspects another card');
      ok(await page.evaluate('save.data.equippedCharacterId') === 'gun', 'swipe never changes equipped machine');
      await swipe(page, cdp, scroller, 1);
      ok((await scrollState(page, scroller)).some((n, i) => n < after[i] - 10), 'reverse swipe scrolls back');
      const selected = [];
      for (const id of [...Save.characterIds, 'gun']) {
        console.log('CHECK touch equip ' + width + '/' + lang + '/' + id);
        await tap(page, '#closeCollection'); await tap(page, '#openCharacters');
        await reach(page, cdp, '[data-inspect-character="' + id + '"]', scroller);
        await tap(page, '[data-inspect-character="' + id + '"]');
        ok(await page.locator('[data-confirm-character]').getAttribute('data-confirm-character') === id, 'touch inspects ' + id + '/' + width);
        if (!await page.locator('[data-confirm-character]').isDisabled()) {
          await reach(page, cdp, '[data-confirm-character]', '.machine-profile');
          await tap(page, '[data-confirm-character]');
        }
        ok(await page.evaluate('save.data.equippedCharacterId') === id, 'touch equips ' + id + '/' + width);
        selected.push(id);
      }
      await page.screenshot({ path: path.join(out, 'roster-' + width + '-' + lang + '.png') });
      await tap(page, '#closeCollection');
      if (height > width) await page.setViewportSize({ width: 844, height: 390 });
      await tap(page, '#play'); await page.waitForFunction('!!s');
      await tap(page, '#pause'); await tap(page, '#pauseMachineChange');
      const battleBefore = await page.evaluate('({hp:s.units[0].hp/s.units[0].maxHp,ammo:s.specialAmmo,stage:s.stage,shots:s.shotCount})');
      await reach(page, cdp, '[data-quick-machine="yui"]', '#battleMachineChoices');
      await tap(page, '[data-quick-machine="yui"]');
      ok(await page.evaluate('s.characterId==="yui"&&save.data.equippedCharacterId==="yui"&&manualPaused&&document.getElementById("battleMachinePicker").hidden'), 'touch switches offscreen machine from pause menu');
      assert.deepEqual(await page.evaluate('({hp:s.units[0].hp/s.units[0].maxHp,ammo:s.specialAmmo,stage:s.stage,shots:s.shotCount})'), battleBefore); checks++;
      ok(await page.evaluate('JSON.stringify(save.data.chapterRun)') === checkpoint, 'machine selection preserves exact campaign inventory');
      rows.push({ width, height, lang, selected, battleMachine: 'yui' });
      console.log('PASS native touch roster and battle switch ' + width + '/' + lang);
      await context.close();
    }
    ok(errors.length === 0, errors.join('\n'));
    const report = { status: 'PASS', checks, rows, errors, method: 'Native CDP touchStart/touchMove/touchEnd and touchscreen taps only. No injected CSS, locator click/tap auto-scroll, scrollIntoView or programmatic scroll positions. Physical Safari/Android unverified.' };
    fs.writeFileSync(path.join(out, 'MACHINE_SWIPE_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
