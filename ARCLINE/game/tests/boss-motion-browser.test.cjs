"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { chromium } = require("playwright");
const Save = require("../dist/save.js"),
  root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-boss-motion-browser";
fs.mkdirSync(out, { recursive: true });
const errors = [],
  rows = [];
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    "." + new URL(req.url, "http://local").pathname,
  );
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file += "/index.html";
  fs.readFile(file, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
      }[path.extname(file)] || "text/html",
    );
    res.end(b);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const [width, height, fallback] of [
      [1280, 720, false],
      [568, 320, true],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: width < 1000,
      });
      page.on("pageerror", (e) => errors.push(e.stack));
      await page.addInitScript(
        ({ seed, fallback }) => {
          localStorage.setItem("arcline-campaign-v1", JSON.stringify(seed));
          localStorage.setItem(
            "arcline-install-guide-v1",
            '{"state":"closed"}',
          );
          if (fallback) globalThis.Worker = undefined;
        },
        {
          fallback,
          seed: {
            schemaVersion: 8,
            campaignResetVersion: 2,
            cleared: 99,
            difficultyConfirmed: true,
            journeyStarted: true,
            onboarding: { step: "done" },
            seenPreviewIds: Save.previewIds,
            unlockedCharacterIds: Save.characterIds,
            joinedCharacterIds: Save.characterIds,
            journal: {
              introSeen: true,
              moviesSeen: ["prologue", "30", "60", "epilogue"],
            },
          },
        },
      );
      await page.goto(
        "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
      );
      await page.waitForFunction("save.ready");
      await page.evaluate(() => {
        cancelAnimationFrame(raf);
        raf = 0;
        manualPaused = false;
        bgm.stop?.();
        window.bossResolved = [];
        const original = E.resolve;
        E.resolve = (state, plan, ...args) => {
          bossResolved.push({
            echo: !!plan.echo,
            kind: plan.attackKind,
            bullets: plan.bullets.length,
            round: state.round,
          });
          return original(state, plan, ...args);
        };
        window.bossStep = (seconds) => {
          for (let t = 0; t < seconds; t += 1 / 60) {
            update(Math.min(1 / 60, seconds - t));
            draw();
          }
        };
        window.prepareBoss = (stage, index = 0, flat = false) => {
          lobby();
          manualPaused = false;
          cancelAnimationFrame(raf);
          raf = 0;
          s = E.campaign(stage, { matchSeed: 42 });
          if (stage === 100)
            for (let i = 0; i < index; i++) {
              const n = ArcFinalTeam.credit(
                s,
                s.characterId,
                s.spec.finalBattle.requiredDamage,
              );
              s.units[1].hp -= n;
              ArcFinalTeam.advance(s);
            }
          E.telegraph(s);
          if (flat) {
            s.spec = {
              ...s.spec,
              floors: [
                [
                  [0, 10],
                  [300, 10],
                ],
              ],
              components: [],
              features: [],
              staticFeatures: [],
              phaseFeatures: undefined,
              worldWidth: 3000,
            };
            s.world = G.world(s.spec);
            s.units.forEach((u, i) =>
              Object.assign(u, {
                x: i ? 1200 : 1010,
                y: 400,
                slope: 0,
                floating: false,
                range: [35, 2965],
              }),
            );
            E.bossActions.refresh(s);
          } else {
            const boss = s.units[1];
            let pad = null;
            for (const dx of [-160, -180, -200, -220, 160, 180, 200]) {
              const q = G.safePosition(
                s.world,
                boss.x + dx,
                boss.y,
                boss,
                s.units[0].range,
              );
              if (!q) continue;
              const old = { ...s.units[0] };
              Object.assign(s.units[0], q);
              if (E.bossActions.gap(s) <= 150 && E.bossActions.gap(s) > 0) {
                pad = q;
                break;
              }
              Object.assign(s.units[0], old);
            }
            if (!pad) throw Error("No close fixture on native stage " + stage);
          }
          $("lobby").hidden = true;
          $("battle").hidden = false;
          $("overlay").hidden = true;
          encounter = null;
          demo = null;
          shot = null;
          tail = null;
          impact = null;
          cpuJob = null;
          cpuReady = null;
          bossResolved.length = 0;
          s.turn = 1;
          s.phase = "cpu";
          s.time = 0;
          renderer.resetCamera();
          draw();
          requestCPU();
          return { x: s.units[1].x, hp: s.units[0].hp };
        };
      });
      for (const [stage, index, flat] of [
        [50, 0, false],
        [100, 6, true],
      ]) {
        const before = await page.evaluate(
          ([stage, index, flat]) => prepareBoss(stage, index, flat),
          [stage, index, flat],
        );
        await page.waitForFunction("cpuReady!==null");
        const decision = await page.evaluate(() => {
          const kind = cpuReady.action?.kind;
          bossStep(0.01);
          return { kind, phase: s.phase, x: s.units[1].x };
        });
        assert.equal(decision.kind, "teleport");
        assert.equal(decision.phase, "cpuTeleport");
        assert.equal(decision.x, before.x);
        const waiting = await page.evaluate(() => {
          bossStep(3);
          return {
            turn: s.turn,
            phase: s.phase,
            echo: !!s.bossEcho,
            hp: s.units[0].hp,
            round: s.round,
            x: s.units[1].x,
            shots: s.bossEcho?.shots,
            echoBounds: s.bossEcho
              ? {
                  left:
                    renderer.view.x +
                    (s.bossEcho.unit.x - 105) * renderer.view.scale,
                  right:
                    renderer.view.x +
                    (s.bossEcho.unit.x + 105) * renderer.view.scale,
                }
              : null,
          };
        });
        assert.equal(waiting.turn, 0);
        assert.equal(waiting.phase, "aim");
        assert(waiting.echo);
        assert.equal(waiting.hp, before.hp);
        assert.notEqual(waiting.x, before.x);
        assert(
          waiting.echoBounds.left >= 8 && waiting.echoBounds.right <= width - 8,
          "echo remains within horizontal camera bounds",
        );
        await page.screenshot({
          path: path.join(out, `boss-${stage}-${width}.png`),
        });
        const paused = await page.evaluate(() => {
          const before = JSON.stringify(s);
          manualPaused = true;
          bossStep(1);
          manualPaused = false;
          return before === JSON.stringify(s);
        });
        assert(paused, "pause freezes echo lifecycle");
        await page.evaluate(() => {
          s.angle = 170;
          s.power = 20;
          launch();
        });
        let done = false;
        for (let i = 0; i < 700; i++) {
          const state = await page.evaluate(() => {
            bossStep(0.08);
            return {
              done: s.turn === 0 && s.phase === "aim" && s.shotCount === 1,
              over: !!s.result,
            };
          });
          if (state.done) {
            done = true;
            break;
          }
          if (state.over) throw Error("Unexpected fixture result");
          await new Promise((r) => setTimeout(r, 2));
        }
        assert(done, "echo + main returns to player");
        const result = await page.evaluate(() => ({
          resolved: bossResolved,
          round: s.round,
          count: s.shotCount,
          cooldown: s.enemyTactics.cooldown,
          echo: !!s.bossEcho,
          worker: !!worker,
          errors: platformStatus.errors,
        }));
        assert.equal(result.resolved.filter((r) => r.echo).length, 1);
        assert.equal(
          result.resolved.filter((r) => r.echo)[0].bullets,
          stage === 100 ? 2 : 1,
        );
        assert.equal(result.resolved.filter((r) => !r.echo).length, 2);
        assert.equal(result.round, waiting.round + 1);
        assert.equal(result.count, 1);
        assert.equal(result.cooldown, 1);
        assert(!result.echo);
        assert.equal(result.worker, !fallback);
        assert.deepEqual(result.errors, []);
        rows.push({ stage, index, width, height, fallback, waiting, result });
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "BOSS_MOTION_BROWSER.json"),
      JSON.stringify(
        {
          status: "PASS",
          phase: "focused development precheck",
          rows,
          errors,
          scope:
            "Native stage50 and late-final fixture; actual main/Worker and cooperative fallback, departure/arrival, echo shot/main hand/player return, pause, desktop and small-screen rendering. Physical devices and final release verification not performed.",
        },
        null,
        2,
      ),
    );
    console.log("PASS boss motion browser " + rows.length + " scenarios");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  server.close();
});
