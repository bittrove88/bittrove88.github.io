'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const out = process.env.ARCLINE_COMPONENT_EVIDENCE_DIR || path.join(os.tmpdir(), 'arcline-component-art');
fs.mkdirSync(out, { recursive: true });
const files = new Map(['/component-study.svg', '/component-study.html'].map(url => [url, path.join(__dirname, url.slice(1))]));
const errors = [], externalRequests = [], rows = [];
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  if (name === '/favicon.ico') return res.writeHead(204).end();
  const file = files.get(name);
  if (!file) return res.writeHead(404).end();
  res.setHeader('Content-Type', name.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const executablePath = process.env.ARCLINE_CHROMIUM || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  let browser;
  try {
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
    const board = await browser.newPage({ viewport: { width: 1440, height: 1135 }, deviceScaleFactor: 1 });
    board.on('pageerror', e => errors.push(String(e)));
    await board.goto(origin + '/component-study.svg');
    await board.screenshot({ path: path.join(out, 'component-study.png') });
    await board.close();
    for (const [width, height] of [[1440, 1135], [844, 390], [568, 240], [393, 852]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('request', req => { if (!req.url().startsWith(origin + '/')) externalRequests.push(req.url()); });
      await page.goto(origin + '/component-study.html');
      const state = await page.evaluate(() => {
        const study = document.querySelector('.study'), svg = study.querySelector(':scope > svg');
        return { viewBox: svg.getAttribute('viewBox'), boardWidth: svg.getBoundingClientRect().width, scrollable: study.scrollWidth > study.clientWidth, bodyFits: document.documentElement.scrollWidth <= innerWidth + 1, images: svg.querySelectorAll('image').length };
      });
      assert.equal(state.viewBox, '0 0 1440 1135');
      assert(state.bodyFits, 'Only the study, not the whole page, should scroll horizontally');
      assert(state.boardWidth >= 960, 'Comparison labels must not shrink with the viewport');
      if (width < 1000) assert(state.scrollable, 'Small preview should allow horizontal study scrolling');
      assert.equal(state.images, 0, 'Study must not depend on raster assets');
      await page.screenshot({ path: path.join(out, `preview-${width}x${height}.png`) });
      rows.push({ width, height, ...state, status: 'PASS' });
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    const report = { status: 'PASS', scope: 'Standalone design preview only; no gameplay integration or physical-device claim.', rows, errors, externalRequests };
    fs.writeFileSync(path.join(out, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('PASS: standalone SVG and HTML at four viewport sizes; external requests 0');
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
