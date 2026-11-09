'use strict';
// Production UI, controls, physics and presentation clock. No combat values or art
// are substituted. Frame-stepped capture is an editorial source, not a timing test.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '../..');
const Save = require('../dist/save.js');
const Run = require('../dist/campaign-run.js');
const release = require('../runtime.json');
const out = path.resolve(process.argv[2] || '/workspace/work/arcline-video/production');
const base = process.env.ARCLINE_CAPTURE_URL || 'http://127.0.0.1:8765';
const fps = 30;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const report = { status: 'editorial-source', version: release.version, commit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), fps, width: 1920, height: 1080, method: 'Native update/draw at 1/30 s per captured frame, real keyboard charge/release and DOM angle input; isolated synthetic progress selects an unlocked stage. No HP, geometry, damage, motion or rendering overrides.', takes: [], errors: [] };
  const selectedTakes = (process.env.ARCLINE_TAKES || 'L01,L02').split(',');
  if (selectedTakes.length < 2 && fs.existsSync(path.join(out, 'capture.json'))) report.takes = JSON.parse(fs.readFileSync(path.join(out, 'capture.json'))).takes.filter(t => !selectedTakes.includes(t.id));
  try {
    for (const spec of [{ id: 'L01', stage: 7, angle: 0, chargeFrames: 54, seconds: 20 }, { id: 'L02', stage: 4, angle: 40, chargeFrames: 39, seconds: 8 }]) {
      if (!selectedTakes.includes(spec.id)) continue;
      const profile = Save.decode(JSON.stringify({ schemaVersion: 8, campaignResetVersion: 2, cleared: spec.stage - 1, difficulty: 'normal', difficultyConfirmed: true, journeyStarted: true, unlockedCharacterIds: ['gun'], seenPreviewIds: Save.previewIds, onboarding: { step: 'done' }, journal: { moviesSeen: ['prologue'] }, preferences: { language: 'ja' } }));
      profile.chapterRun = Run.checkpoint(spec.stage, {}, [], 'marketing-' + spec.id, 77);
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
      await context.addInitScript(p => { localStorage.setItem('arcline-campaign-v1', JSON.stringify(p)); localStorage.setItem('arcline-install-guide-v1', '{"state":"closed"}'); }, profile);
      const page = await context.newPage();
      page.on('pageerror', e => report.errors.push(String(e)));
      await page.goto(base + '/ARCLINE/game/dist/');
      await page.waitForFunction('save.ready&&!document.getElementById("play").disabled');
      await page.evaluate(spec => {
        save.data.pendingRecruit = null; save.data.updateNoticePending = false;
        selectedMap = spec.stage - 1; start({ skipStory: true }); endDemo();
        encounter = null; document.getElementById('encounterBanner').hidden = true;
        cancelAnimationFrame(raf); raf = 0; clock = 0;
        globalThis.captureShot = null; globalThis.captureShotSerial = 0;
        document.getElementById('world').focus();
        if (spec.id === 'L02') document.getElementById('warpToggle').click();
        endDemo(); hud(); draw();
      }, spec);
      // Prime production assets before the take, without advancing combat time.
      await page.waitForTimeout(500);
      const encoder = cp.spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-framerate', String(fps), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, spec.id + '.mp4')], { stdio: ['pipe', 'ignore', 'pipe'] });
      let encodingError = ''; encoder.stderr.on('data', b => encodingError += b);
      const take = { ...spec, file: spec.id + '.mp4', character: 'gun', difficulty: 'normal', seed: 77, shots: [], states: [], actions: [], secondAim: null };
      let chargingAt = null, released = false, secondAimFrame = null, followPlan = null;
      for (let frame = 0; frame < spec.seconds * fps; frame++) {
        if (frame === 15) {
          await page.locator('#aimRange').evaluate((e, angle) => { e.value = String(angle); e.dispatchEvent(new Event('input', { bubbles: true })); }, spec.angle);
          take.actions.push({ t: frame / fps, control: 'aimRange', angle: spec.angle });
        }
        if (frame === 60) { await page.keyboard.down(' '); chargingAt = frame; take.actions.push({ t: frame / fps, control: 'Space down' }); }
        if (secondAimFrame !== null && frame === secondAimFrame + 45) { await page.keyboard.down(' '); chargingAt = frame; take.actions.push({ t: frame / fps, control: 'Space down' }); }
        if (chargingAt !== null && frame === chargingAt + (followPlan ? Math.round((followPlan.power - 20) * 2.6 / 80 * fps) : spec.chargeFrames)) {
          await page.keyboard.up(' '); take.actions.push({ t: frame / fps, control: 'Space up' }); chargingAt = null; released = true;
        }
        const state = await page.evaluate(({ frame, fps }) => {
          cancelAnimationFrame(raf); raf = 0;
          update(1 / fps, 1 / fps); draw();
          let launched = null;
          if (shot && captureShot !== shot) {
            captureShot = shot;
            launched = { serial: ++captureShotSerial, t: frame / fps - shot.presentationAge + 1 / fps, side: shot.side, weapon: shot.weaponId, angle: shot.angle, power: shot.power, duration: shot.duration, presentationDuration: shotMotion.duration, damage: shot.damage, destroyed: shot.destroyed, cues: ArcSFX.timeline(shot).cues.map(c => ({ ...c, presentationTime: shotMotion.timeAt(c.t) })), events: shot.events.map(e => ({ type: e.type, t: e.t, x: e.x, y: e.y })) };
          }
          return { t: frame / fps, phase: s.phase, turn: s.turn, canAim: canAim(), hp: s.units.map(u => u.hp), positions: s.units.map(u => ({ x: u.x, y: u.y })), solids: s.world.solids.length, launched };
        }, { frame, fps });
        if (state.launched) take.shots.push(state.launched);
        if (frame % fps === 0) take.states.push(state);
        if (spec.id === 'L01' && released && !followPlan && state.canAim && state.turn === 0 && frame > 150) {
          followPlan = await page.evaluate(() => {
            for (let angle = 6; angle <= 80; angle += 2) for (let hold = 18; hold <= 76; hold++) {
              const power = E.chargePower(hold / 30, s), p = E.trajectory(s, 0, angle, power);
              if (p.damage[1] > 0 && p.damage[0] === 0 && [-1, 1].every(delta => E.trajectory(s, 0, angle, E.chargePower((hold + delta) / 30, s)).damage[1] > 0)) return { angle, power, hold, expected: p.damage[1] };
            }
            return null;
          });
          if (!followPlan) throw Error('No legal follow-up in the recorded native state');
          secondAimFrame = frame; take.secondAim = { t: frame / fps, ...followPlan };
          await page.locator('#aimRange').evaluate((e, angle) => { e.value = String(angle); e.dispatchEvent(new Event('input', { bubbles: true })); }, followPlan.angle);
          take.actions.push({ t: frame / fps, control: 'aimRange', angle: followPlan.angle });
        }
        const jpeg = await page.screenshot({ type: 'jpeg', quality: 94 });
        if (!encoder.stdin.write(jpeg)) await once(encoder.stdin, 'drain');
        if ([0, 150, 210].includes(frame)) fs.writeFileSync(path.join(out, spec.id + '-' + frame + '.jpg'), jpeg);
        if (frame % (fps * 4) === 0) console.log(spec.id + ': ' + frame / fps + ' s, ' + state.phase);
      }
      encoder.stdin.end(); const [code] = await once(encoder, 'exit'); if (code !== 0) throw Error(encodingError);
      take.final = await page.evaluate(() => ({ hp: s.units.map(u => u.hp), solids: s.world.solids.length, positions: s.units.map(u => ({ x: u.x, y: u.y })), stage: s.stage }));
      report.takes.push(take); fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
      // World shots use the same production page and renderer; they are identified as later stages.
      if (spec.id === 'L02') for (const stage of [61, 84]) {
        await page.evaluate(stage => { cancelAnimationFrame(raf); raf = 0; s = E.campaign(stage, { equippedCharacterId: 'gun', matchSeed: 77, difficulty: 'normal' }); shot = null; shotMotion = null; tail = null; impact = null; transition = null; encounter = null; charge = null; demo = null; clock = 1.5; renderer.resetCamera(); hud(); draw(); }, stage);
        await page.screenshot({ path: path.join(out, 'world-' + stage + '.png') });
      }
      await context.close(); console.log('Captured ' + spec.id);
    }
    if (report.errors.length) throw Error(report.errors.join('\n'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
