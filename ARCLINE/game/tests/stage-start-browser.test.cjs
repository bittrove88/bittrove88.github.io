'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const Save = require('../dist/save.js');
const Run = require('../dist/campaign-run.js');
const root = path.resolve(__dirname, '../../..');
const out = process.env.ARCLINE_EVIDENCE_DIR || '/tmp/arcline-stage-start';
fs.mkdirSync(out, { recursive: true });
const errors = [], rows = [];
let checks = 0;
function ok(value, message) { checks++; assert(value, message); }
function profile(lang) {
  return {
    schemaVersion: Save.schemaVersion, campaignResetVersion: Save.resetVersion,
    cleared: 6, difficultyConfirmed: true, journeyStarted: true,
    preferences: { language: lang, controls: 'left' },
    seenPreviewIds: Save.previewIds, journal: { moviesSeen: ['prologue'] },
    chapterRun: Run.checkpoint(7, { weapons: { W06: 2 }, skills: { BURST: 2 } }, [], 'stage-start-regression', 20261031),
  };
}
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
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height, lang] of [[844, 390, 'ja'], [844, 390, 'en'], [568, 240, 'ja'], [1440, 900, 'en']]) {
      const touch = width < 1000;
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
      await context.addInitScript(data => {
        if (!localStorage.getItem('arcline-campaign-v1')) localStorage.setItem('arcline-campaign-v1', JSON.stringify(data));
        localStorage.setItem('arcline-install-guide-v1', JSON.stringify({ state: 'closed' }));
      }, profile(lang));
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      const activate = selector => touch ? page.locator(selector).tap() : page.locator(selector).click();
      async function select(stage) {
        await activate('#chooseLevel');
        await activate('[data-area="' + Math.floor((stage - 1) / 5) + '"]');
        await activate('[data-stage="' + (stage - 1) + '"]');
      }
      await page.goto('http://127.0.0.1:' + server.address().port + '/ARCLINE/game/dist/');
      await page.waitForFunction('!document.getElementById("play").disabled');
      const checkpoint = await page.evaluate('JSON.stringify(save.data.chapterRun)');
      await select(3);
      ok(await page.evaluate('selectedMap') === 2, 'stage picker selects stage 3');
      ok(await page.locator('#resumeRun').count() === 0, 'one start action, no separate resume control');
      ok(await page.locator('#play').innerText() === (lang === 'ja' ? 'ステージ3を開始' : 'Start stage 3'), 'start action names the selected stage');
      const play = await page.locator('#play').boundingBox();
      ok(play.x >= 0 && play.y >= 0 && play.x + play.width <= width + 1 && play.y + play.height <= height + 1 && play.height >= 44, 'single start action fits ' + width);
      await page.screenshot({ path: path.join(out, 'stage-selected-' + width + '-' + lang + '.png') });
      await activate('#play');
      await page.waitForFunction('!!s');
      ok(await page.evaluate('s.stage===3&&selectedMap===2&&runContext.practice&&!document.getElementById("battle").hidden'), 'one activation starts chosen cleared stage, never resets to chapter stage');
      ok(await page.evaluate('JSON.stringify(save.data.chapterRun)') === checkpoint, 'replaying chosen stage preserves campaign checkpoint and stock');
      await activate('#pause');
      await activate('#resume');
      ok(await page.evaluate('s.stage===3&&!manualPaused&&document.getElementById("overlay").hidden'), 'pause resumes the same running stage');
      await activate('#pause');
      await activate('#returnLobby');
      await activate('#resume');
      await select(7);
      ok(await page.locator('#play').innerText() === (lang === 'ja' ? 'ステージ7を開始' : 'Start stage 7'), 'same start action names campaign stage');
      await activate('#play');
      await page.waitForFunction('!!s');
      ok(await page.evaluate('s.stage===7&&!runContext.practice'), 'same button starts the selected campaign stage');
      assert.deepEqual(await page.evaluate('({weapons:s.weaponStock,skills:s.skills})'), { weapons: { W06: 2 }, skills: { BURST: 2 } }); checks++;
      await page.evaluate(() => save.pending);
      ok(await page.evaluate('JSON.stringify(save.data.chapterRun)') === checkpoint, 'campaign start preserves exact entry checkpoint');
      await page.reload();
      await page.waitForFunction('!document.getElementById("play").disabled');
      ok(await page.evaluate('selectedMap===6&&save.data.cleared===6'), 'reload still offers actual campaign checkpoint and preserves progress');
      ok(await page.locator('#resumeRun').count() === 0, 'reload has only one start action');
      rows.push({ width, height, lang, clearedStage: 3, campaignStage: 7, stockPreserved: true, pauseResume: true });
      await context.close();
    }
    ok(errors.length === 0, errors.join('\n'));
    const report = { status: 'PASS', checks, rows, errors, scope: 'Real browser UI stage selection and a single start action; Japanese/English; touch and desktop; isolated replay; exact campaign inventory; pause/resume; reload. Physical Safari/Android unverified.' };
    fs.writeFileSync(path.join(out, 'STAGE_START_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
