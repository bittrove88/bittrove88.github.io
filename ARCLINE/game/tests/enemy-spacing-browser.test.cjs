"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { chromium } = require("playwright"),
  Save = require("../dist/save.js");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-enemy-spacing";
fs.mkdirSync(out, { recursive: true });
const rows = [],
  errors = [];
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
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".json": "application/json",
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
          if (fallback) window.Worker = undefined;
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
        bgm.stop?.();
        window.spacingFrames = [];
        window.spacingStep = (seconds) => {
          for (let t = 0; t < seconds; t += 1 / 60) {
            update(Math.min(1 / 60, seconds - t));
            draw();
            spacingFrames.push({
              phase: s.phase,
              x: s.units[1].x,
              gap: ArcEnemyPosition.gap(s),
            });
          }
        };
        window.spacingPrepare = (stage) => {
          lobby();
          manualPaused = false;
          cancelAnimationFrame(raf);
          raf = 0;
          s = E.campaign(stage, { matchSeed: stage === 71 ? 2000 : 42 });
          s.spec = {
            ...s.spec,
            floors: [
              [
                [0, 10],
                [300, 10],
              ],
            ],
            features: [],
            staticFeatures: [],
            phaseFeatures: null,
            components:
              stage === 71
                ? [
                    {
                      id: "cover",
                      kind: "solid",
                      destructible: false,
                      poly: [
                        [150, 10],
                        [158, 10],
                        [158, 25],
                        [150, 25],
                      ],
                    },
                  ]
                : [],
            worldWidth: 3000,
          };
          s.world = G.world(s.spec);
          s.pickups = [];
          s.units.forEach((u, i) =>
            Object.assign(u, {
              x: i ? 1000 : 700,
              y: 400,
              slope: 0,
              surface: "floor0",
              floating: false,
              range: [35, 2965],
              facing: i ? -1 : 1,
            }),
          );
          if (stage === 81) s.enemyTactics = { teleports: 2, cooldown: 2 };
          s.turn = 1;
          s.phase = "cpu";
          s.time = 0;
          shot = null;
          tail = null;
          impact = null;
          demo = null;
          encounter = null;
          transition = null;
          cpuJob = null;
          cpuReady = null;
          $("lobby").hidden = true;
          $("battle").hidden = false;
          $("overlay").hidden = true;
          spacingFrames.length = 0;
          renderer.resetCamera();
          hud();
          draw();
          requestCPU();
          return {
            gap: ArcEnemyPosition.gap(s),
            x: s.units[1].x,
            round: s.round,
            hp: s.units[0].hp,
            micro: ArcEncounters.forSpec(s.spec).move,
          };
        };
      });
      for (const stage of [9, 41, 71, 81]) {
        const before = await page.evaluate(
          (stage) => spacingPrepare(stage),
          stage,
        );
        await page.waitForFunction("cpuReady!==null", null, { timeout: 30000 });
        const decision = await page.evaluate(() => {
          const d = cpuReady;
          spacingStep(0.01);
          return {
            action: d.action,
            target: d.target,
            phase: s.phase,
            rules: E.enemyActionRules(s),
          };
        });
        if (stage === 9) {
          assert(!decision.rules.walk);
          assert.equal(decision.phase, "cpuMove");
          assert(Math.abs(decision.target - before.x) <= before.micro + 0.01);
        } else if (stage === 71) {
          assert.equal(decision.action.kind, "teleport");
          assert.equal(decision.phase, "cpuTeleport");
        } else {
          assert(decision.rules.walk);
          assert.equal(decision.action.kind, "walk-shoot");
          assert.equal(decision.phase, "cpuMove");
          assert(decision.target > before.x);
        }
        if (stage === 71) {
          await page.evaluate(() =>
            spacingStep(s.enemyTeleport.plan.duration + 0.96),
          );
          await page.screenshot({
            path: path.join(out, `spacing-transfer-${width}.png`),
          });
        }
        async function untilPlayer(actions) {
          for (let i = 0; i < 900; i++) {
            const state = await page.evaluate((actions) => {
              spacingStep(0.08);
              return {
                ready:
                  s.turn === 0 && s.phase === "aim" && s.shotCount === actions,
                over: !!s.result,
              };
            }, actions);
            if (state.ready) return;
            if (state.over) throw Error("Unexpected fixture result " + stage);
            await new Promise((r) => setTimeout(r, 2));
          }
          throw Error("No next player hand " + stage);
        }
        await untilPlayer(0);
        const arrival = await page.evaluate(() => ({
          x: s.units[1].x,
          gap: ArcEnemyPosition.gap(s),
          round: s.round,
          teleports: s.enemyTactics?.teleports,
          cooldown: s.enemyTactics?.cooldown,
          hp: s.units[0].hp,
          frames: [...spacingFrames],
          worker: !!worker,
          errors: platformStatus.errors,
          echo: !!s.bossEcho,
        }));
        assert.equal(arrival.worker, !fallback);
        assert.deepEqual(arrival.errors, []);
        assert(!arrival.echo, "normal enemies never gain boss echoes");
        assert(
          arrival.frames
            .filter((f) => f.phase === "cpuMove")
            .every((f) => f.gap >= before.gap - 1e-7),
          "walking cannot voluntarily close further inside the six-body boundary",
        );
        if (stage === 71) {
          assert(arrival.gap >= 480);
          assert.equal(arrival.teleports, 1);
          assert.equal(arrival.cooldown, 2);
        } else {
          assert(arrival.gap > before.gap);
          assert(
            arrival.x - before.x <= (stage === 9 ? before.micro : 140) + 0.01,
          );
        }
        if (stage === 81) {
          assert.equal(arrival.teleports, 2);
          assert.equal(arrival.cooldown, 1);
        }
        await page.evaluate(() => {
          s.angle = 170;
          s.power = 20;
          launch();
        });
        await untilPlayer(1);
        const after = await page.evaluate(() => ({
          gap: ArcEnemyPosition.gap(s),
          round: s.round,
          count: s.shotCount,
          teleports: s.enemyTactics?.teleports,
          cooldown: s.enemyTactics?.cooldown,
          errors: platformStatus.errors,
        }));
        assert.equal(after.round, arrival.round + 1);
        assert.equal(after.count, 1);
        assert.deepEqual(after.errors, []);
        assert(
          after.gap >= Math.min(480, arrival.gap) - 1e-7,
          "subsequent autonomous movement retains spacing",
        );
        if (stage === 71)
          assert.equal(
            after.teleports,
            1,
            "the new destination policy does not refill teleport budgets",
          );
        rows.push({
          stage,
          width,
          height,
          fallback,
          before,
          decision,
          arrival: { ...arrival, frames: undefined },
          after,
        });
      }
      await page.close();
    }
    for (const stage of [9, 41, 71, 81]) {
      const pair = rows.filter((r) => r.stage === stage);
      assert.deepEqual(
        pair[0].decision.action,
        pair[1].decision.action,
        "Worker and cooperative fallback choose the same action",
      );
      assert.equal(pair[0].decision.target, pair[1].decision.target);
      assert.equal(pair[0].arrival.x, pair[1].arrival.x);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "ENEMY_SPACING_BROWSER.json"),
      JSON.stringify(
        {
          status: "PASS",
          rows,
          errors,
          scope:
            "Controlled flat terrain and a cover fixture, real main controller and Worker/cooperative AI, early micro movement,41 active retreat,71 transfer,81 exhausted-budget retreat; enemy hand/player action/enemy hand/player return. Physical devices and whole-campaign clearance not tested.",
        },
        null,
        2,
      ),
    );
    console.log("PASS enemy spacing browser " + rows.length + " scenarios");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
  server.close();
});
