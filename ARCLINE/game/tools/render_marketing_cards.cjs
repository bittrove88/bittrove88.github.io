'use strict';
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const out = path.resolve(process.argv[2] || '/workspace/work/arcline-video/production');
const base = process.env.ARCLINE_CAPTURE_URL || 'http://127.0.0.1:8765';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const lang of ['ja', 'en']) for (const vertical of [false, true]) {
      const page = await browser.newPage({ viewport: vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
      const headline = lang === 'ja' ? 'その一発で、<br>道をひらけ。' : 'One shot.<br>A new way.';
      const cta = lang === 'ja' ? 'ゲームを遊ぶ' : 'Play ARCLINE';
      await page.setContent(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>
        *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{background:#f3efdf;color:#173c47;font-family:"Noto Sans CJK JP",sans-serif}.rule{position:absolute;inset:64px;border:1px solid #173c472b}.eyebrow{font-size:19px;letter-spacing:5px;font-weight:500;margin-bottom:40px}.copy{position:absolute;left:150px;top:158px;z-index:2}.logo{display:block;width:369px;height:54px;object-fit:contain;object-position:left center;margin-bottom:66px}h1{font-size:${lang === 'ja' ? 96 : 110}px;line-height:1.3;letter-spacing:-5px;margin:0 0 48px;font-weight:900}.cta{display:inline-flex;align-items:center;gap:48px;background:#173c47;color:#fff8e5;border-radius:12px;padding:23px 32px;font-size:28px;font-weight:700}.url{font-size:20px;letter-spacing:1px;margin-top:30px}.art{position:absolute;width:780px;height:auto;right:88px;top:300px}.circle{position:absolute;border:1px solid #be69352c;border-radius:50%;width:780px;height:780px;right:68px;top:160px}.circle:after{content:"";position:absolute;inset:58px;border:1px solid #be69352c;border-radius:50%}.note{position:absolute;right:143px;bottom:137px;font-size:16px;letter-spacing:4px}.accent{width:60px;height:5px;background:#b65e32;margin:35px 0}.dot{position:absolute;right:145px;top:104px;width:13px;height:13px;border-radius:50%;background:#b65e32}
        ${vertical ? '.rule{inset:45px}.copy{left:90px;top:150px}.eyebrow{font-size:16px;letter-spacing:3px}.logo{margin-bottom:60px}h1{font-size:96px;margin-bottom:35px}.art{width:750px;right:80px;top:1020px}.circle{width:800px;height:800px;right:60px;top:900px}.note{right:90px;bottom:105px}.dot{right:90px;top:84px}' : ''}
        </style><div class="rule"></div><div class="dot"></div><div class="circle"></div><img class="art" src="${base}/ARCLINE/assets/ending/roll-cutouts/players/gun.png"><div class="copy"><div class="eyebrow">TURN-BASED ARTILLERY ADVENTURE</div><img class="logo" src="${base}/ARCLINE/assets/ending/cutouts/brand/logo_arcline.png"><h1>${headline}</h1><div class="cta">${cta}<span>↗</span></div><div class="url">bittrove88.github.io/ARCLINE/</div></div><div class="note">AIM. CHARGE. FIND YOUR WAY.</div></html>`);
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
      await page.screenshot({ path: path.join(out, `end-${lang}-${vertical ? 'v' : 'h'}.png`) });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
