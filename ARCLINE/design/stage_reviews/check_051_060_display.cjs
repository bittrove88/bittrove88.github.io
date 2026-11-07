'use strict';
// Comparison-page checks only; does not load or play the game.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const output = path.resolve(process.argv[2] || '/tmp/arcline-map-review-051-060');
fs.mkdirSync(output, {recursive: true});
const html = fs.readFileSync(path.join(__dirname, 'map_review_gallery.html'), 'utf8');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  const rows = [], cards = [];
  try {
    for (const [viewport, width, height] of [['desktop', 1400, 1050], ['phone-landscape', 844, 390], ['phone-portrait', 390, 844]]) {
      const page = await browser.newPage({viewport: {width, height}}), errors = [], requests = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', r => requests.push(r.url()));
      await page.setContent(html);
      assert.equal(await page.locator('#stagePicker option').count(), 10);
      for (let n = 51; n <= 60; n++) {
        await page.selectOption('#stagePicker', String(n));
        assert((await page.locator('#stageTitle').innerText()).includes(String(n)));
        for (const comparison of n <= 55 ? ['live', 'previous'] : ['live']) {
          await page.click(comparison === 'live' ? '#compareLive' : '#comparePrevious');
          const scale = await page.locator('.chart svg').evaluateAll(xs => ({
            viewBoxes: xs.map(x => x.getAttribute('viewBox')),
            widths: xs.map(x => x.getBoundingClientRect().width),
            overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          }));
          assert.equal(scale.viewBoxes[0], scale.viewBoxes[1]);
          assert(Math.abs(scale.widths[0] - scale.widths[1]) < 1);
          assert(!scale.overflow);
          rows.push({stage: n, viewport, comparison, status: 'PASS', sameScale: true, noHorizontalOverflow: true});
        }
        await page.click('#compareLive');
        if (viewport === 'desktop') {
          await page.screenshot({path: path.join(output, `stage-${n}-comparison.png`), fullPage: true});
          cards.push(await page.locator('.map').nth(1).evaluate(el => ({
            stage: Number(document.getElementById('stagePicker').value),
            title: document.getElementById('stageTitle').textContent,
            concept: document.getElementById('why').textContent, html: el.innerHTML,
          })));
        }
      }
      assert(await page.locator('#comparePrevious').isDisabled());
      await page.click('#prev');
      assert((await page.locator('#stageTitle').innerText()).includes('59'));
      await page.click('#next');
      assert((await page.locator('#stageTitle').innerText()).includes('60'));
      await page.selectOption('#stagePicker', '58');
      await page.click('#toggleScale');
      const zoom = await page.locator('.chart svg').evaluateAll(xs => xs.map(x => x.getBoundingClientRect().width));
      assert(zoom[0] >= 1100 && Math.abs(zoom[0] - zoom[1]) < 1);
      assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      await page.click('#toggleScale');
      if (viewport === 'phone-portrait') await page.screenshot({path: path.join(output, 'phone-portrait.png'), fullPage: true});
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
      await page.close();
    }
    for (const start of [51, 56]) {
      const page = await browser.newPage({viewport: {width: 1600, height: 1100}});
      const selected = cards.filter(c => c.stage >= start && c.stage <= start + 4);
      await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>body{background:#0a1923;color:#edf8f4;font:15px/1.5 system-ui;margin:20px}h1{font-size:28px}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}article{border:1px solid #395d67;background:#142d3a;border-radius:14px;padding:14px}h2{font-size:18px;margin:0 0 6px}p{margin:5px 0}.header{display:none}.chart svg{width:100%;display:block}.legend{font-size:12px;color:#bacfd0}.chart{margin-top:10px}</style><h1>ARCLINE｜${start}〜${start + 4}面 コンセプト反映版</h1><p>未承認・ゲーム未実装。概念経路は実測弾道ではありません。面間の縮尺は異なります。</p><main>${selected.map(c => `<article><h2>${c.title}</h2><p>${c.concept}</p>${c.html}</article>`).join('')}</main></html>`);
      await page.screenshot({path: path.join(output, `overview-${start}-${start + 4}.png`), fullPage: true});
      await page.close();
    }
    const report = {status: 'PASS', scope: 'Comparison HTML only. Emulated viewports; no physical-device or gameplay verification.',
      checks: rows, stageViewportChecks: 30, comparisonChecks: rows.length,
      additionalChecks: ['Previous/live switch and unavailable-state handling', 'Previous/next navigation', 'Shared-scale diagram zoom and containment'],
      consoleErrors: 0, runtimeRequests: 0};
    fs.writeFileSync(path.join(__dirname, 'STAGES_051_060_DISPLAY_CHECK.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({status: 'PASS', maps: 10, viewports: 3, comparisons: rows.length, consoleErrors: 0, runtimeRequests: 0}));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
