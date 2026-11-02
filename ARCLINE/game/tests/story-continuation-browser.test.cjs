'use strict';
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const Save = require('../dist/save.js'), Run = require('../dist/campaign-run.js');
const root = path.resolve(__dirname, '../../..'), out = process.env.ARCLINE_EVIDENCE_DIR || '/tmp/arcline-continuation';
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const rows = [], errors = [];
const ok = (value, message) => { checks++; assert(value, message); };
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
function profile(cleared, lang) {
  return { schemaVersion: 8, campaignResetVersion: 2, cleared, difficultyConfirmed: true, journeyStarted: true,
    preferences: { language: lang }, seenPreviewIds: Save.previewIds, unlockedCharacterIds: Save.characterIds,
    joinedCharacterIds: Save.characterIds, journal: { moviesSeen: ['prologue', '30', '60', 'epilogue'] },
    chapterRun: Run.checkpoint(cleared === 100 ? 91 : cleared + 1, {}, [], 'continuation', 42) };
}
async function win(page) {
  // This controlled win fixture tests result/save/story transitions. Physics
  // and each ending timeline remain covered by the existing separate suites.
  await page.evaluate(() => { s.result = 'win'; s.phase = 'over'; s.units[1].hp = 0; s.pendingLoot = []; finishResult(); });
  for (let i = 0; i < 8 && await page.locator('#lootPicker').isVisible(); i++) await page.locator('#lootSkip').click();
  await page.waitForFunction('dialog==="result"&&!document.getElementById("resume").disabled');
  await page.evaluate(() => ArcStoryView.finishResultText());
  ok(!/練習|PRACTICE|PLAY AGAIN/i.test(await page.locator('#overlay').innerText()), 'win never offers practice/repeat');
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [stage, cleared, lang, width, height] of [[3, 35, 'ja', 844, 390], [10, 35, 'en', 568, 240], [30, 100, 'ja', 844, 390], [60, 100, 'en', 844, 390], [100, 100, 'ja', 1280, 720]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000 });
      await context.addInitScript(data => {
        if (!localStorage.getItem('arcline-campaign-v1')) localStorage.setItem('arcline-campaign-v1', JSON.stringify(data));
        localStorage.setItem('arcline-install-guide-v1', JSON.stringify({ state: 'closed' }));
      }, profile(cleared, lang));
      const page = await context.newPage(); page.on('pageerror', e => errors.push(String(e)));
      await page.goto('http://127.0.0.1:' + server.address().port + '/ARCLINE/game/dist/');
      await page.waitForFunction('!document.getElementById("play").disabled');
      await page.locator('#chooseLevel').click();
      await page.locator('[data-area="' + Math.floor((stage - 1) / 5) + '"]').click();
      await page.locator('[data-stage="' + (stage - 1) + '"]').click();
      await page.locator('#play').click();
      await page.waitForFunction(stage => s?.stage === stage, stage);
      ok(await page.evaluate(stage => !runContext.practice && save.data.chapterRun.stage === stage, stage), 'selected cleared stage is active saved campaign ' + stage);
      await win(page);
      ok(await page.evaluate(cleared => save.data.cleared === Math.max(cleared, s.stage) && save.data.unlockedCharacterIds.length === 10, cleared), 'maximum progress and machines preserved ' + stage);
      ok(await page.evaluate(stage => stage === 100 ? save.data.chapterRun === null : save.data.chapterRun.stage === stage + 1, stage), 'win saves continuation ' + stage);
      await page.screenshot({ path: path.join(out, 'clear-' + stage + '-' + lang + '.png') });
      if (stage === 3) {
        await page.locator('#returnLobby').click();
        await page.locator('#levelPicker').waitFor({ state: 'visible' });
        ok(await page.evaluate('selectedMap===3&&document.querySelector("[data-stage=\\"3\\"]").classList.contains("current")'), 'returning to stage selection also defaults to next stage4');
        await page.locator('#closeLevels').click();
        await page.reload(); await page.waitForFunction('!document.getElementById("play").disabled');
        ok(await page.evaluate('selectedMap===3&&save.data.cleared===35'), 'reload offers stage4, never previous frontier or repeated stage3');
        await page.locator('#play').click(); await page.waitForFunction('s?.stage===4');
        await win(page); await page.locator('#resume').click(); await page.waitForFunction('s?.stage===5');
        ok(await page.evaluate('save.data.chapterRun.stage===5&&save.data.cleared===35'), 'multiple wins continue along selected story path');
      } else {
        await page.locator('#resume').click();
        if ([30, 60, 100].includes(stage)) {
          await page.waitForFunction(id => ArcStoryView.active && ArcStoryView.state?.id === id, stage === 100 ? 'epilogue' : String(stage));
          ok(await page.evaluate('!!ArcStoryView.state'), 'milestone story opens after a previously cleared stage ' + stage);
          if (stage !== 100) {
            await page.evaluate(() => ArcStoryView.close(true));
            await page.waitForFunction(stage => s?.stage === stage + 1 && !ArcStoryView.active, stage);
            ok(await page.evaluate(stage => save.data.chapterRun.stage === stage + 1, stage), 'interlude continues into next chapter ' + stage);
          } else ok(await page.evaluate('!!ArcStoryView.state.ending&&save.data.cleared===100'), 'final selected win reaches actual ending with all progress retained');
        } else {
          await page.waitForFunction(stage => s?.stage === stage + 1, stage);
          ok(await page.evaluate('s.stage===11'), 'selected chapter boss continues into next chapter');
        }
      }
      rows.push({ stage, cleared, lang, width, height }); await context.close();
    }
    ok(errors.length === 0, errors.join('\n'));
    const report = { status: 'PASS', checks, rows, errors, scope: 'Actual stage selection and result controls with controlled win fixtures: consecutive selected-stage wins, save/reload, chapter boss,30/60 interludes and100 ending. Does not claim human combat or physical-device validation.' };
    fs.writeFileSync(path.join(out, 'STORY_CONTINUATION_BROWSER.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
