"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  { chromium } = require("playwright"),
  S = require("../dist/save.js"),
  R = require("../dist/campaign-run.js"),
  replayFinalRelay = require("./final-relay-controller.cjs");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-final100-browser";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const errors = [],
  relayResults = [],
  ok = (v, m) => {
    checks++;
    assert(v, m);
  },
  route = JSON.parse(
    fs.readFileSync(
      path.join(root, "ARCLINE/game/tests/fixtures/final-relay-0331.json"),
    ),
  );
const server = http.createServer((q, r) => {
  let name = new URL(q.url, "http://local").pathname;
  if (name.endsWith("/")) name += "index.html";
  const f = path.resolve(root, "." + name);
  if (!f.startsWith(root + path.sep)) return r.writeHead(403).end();
  fs.readFile(f, (e, b) => {
    if (e) return r.writeHead(404).end();
    r.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".png": "image/png",
        ".jpeg": "image/jpeg",
        ".m4a": "audio/mp4",
      }[path.extname(f)] || "application/octet-stream",
    );
    r.end(b);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
      executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    }),
    base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const [width, height, lang, motion] of process.env
      .ARCLINE_FINAL_QUEUE_ONLY
      ? [[844, 390, "ja", "no-preference"]]
      : process.env.ARCLINE_FINAL_CAVE_ONLY
        ? [[568, 240, "ja", "no-preference"]]
        : [
            [568, 240, "ja", "no-preference"],
            [844, 390, "ja", "no-preference"],
            [393, 852, "en", "reduce"],
          ]) {
      const c = await browser.newContext({
          viewport: { width, height },
          hasTouch: true,
          isMobile: true,
          reducedMotion: motion,
        }),
        profile = {
          schemaVersion: 8,
          campaignResetVersion: 2,
          cleared: 99,
          unlockedCharacterIds: S.characterIds,
          joinedCharacterIds: S.characterIds,
          equippedCharacterId: "rin",
          difficulty: "normal",
          difficultyConfirmed: true,
          journeyStarted: true,
          seenPreviewIds: S.previewIds,
          preferences: { language: lang, controls: "left" },
          journal: { moviesSeen: ["prologue", "30", "60"] },
          onboarding: { step: "done" },
          chapterRun: R.checkpoint(
            100,
            { weapons: {}, skills: {} },
            [],
            "new-final-save",
            4697,
          ),
        };
      await c.addInitScript((p) => {
        // Seed only an empty context; subsequent pages must read the actual
        // completion save rather than resetting it to this entry fixture.
        if (!localStorage.getItem("arcline-campaign-v1"))
          localStorage.setItem("arcline-campaign-v1", JSON.stringify(p));
        localStorage.setItem(
          "arcline-install-guide-v1",
          JSON.stringify({ state: "closed" }),
        );
      }, profile);
      const p = await c.newPage();
      p.on("pageerror", (e) => errors.push(String(e)));
      await p.goto(base + "/ARCLINE/game/dist/");
      await p.waitForFunction('!document.getElementById("play").disabled');
      await p.locator("#play").tap();
      await p.waitForFunction("s?.stage===100&&!demo");
      if (await p.locator("#bossIntroSkip").isVisible())
        await p.locator("#bossIntroSkip").tap();
      await p.waitForFunction("canAim()");
      ok(
        await p.evaluate(
          's.characterId==="hana"&&E.combat.points(s.units[0].hp)===100&&E.combat.points(s.units[1].hp)===1500&&Math.abs(s.units[0].x-s.units[1].x)>=800',
        ),
        "HP100 and1500 total / remote spawn " + width,
      );
      ok(
        (await p.locator("#finalTeamProgress").textContent()).includes("150"),
        "per-machine150 objective " + width,
      );
      await p.locator("#finalTeamHUD").tap();
      ok(
        (await p.locator("#battleMachineChoices button:disabled").count()) ===
          10,
        "fixed order all10 read-only " + width,
      );
      await p.locator("#closeBattleMachines").tap();
      await p.evaluate(() => {
        cancelAnimationFrame(raf);
        raf = 0;
        encounter = null;
      });
      if (process.env.ARCLINE_FINAL_QUEUE_ONLY) {
        await p.evaluate(() => {
          s = E.campaign(100);
          for (let i = 0; i < 2; i++) {
            ArcFinalTeam.credit(
              s,
              s.characterId,
              s.spec.finalBattle.requiredDamage,
            );
            E.next(s);
            s.phase = "aim";
          }
          ArcFinalTeam.credit(
            s,
            s.characterId,
            s.spec.finalBattle.requiredDamage,
          );
          cpuJob = { id: 987, token: gameToken };
          cpuReady = { target: 100, plan: { angle: 45, power: 60 } };
          advanceTurn();
          draw();
        });
        ok(
          await p.evaluate(
            's.characterId==="sora"&&s.finalTeam.map===1&&transition?.kind==="final-travel"&&!cpuJob&&!cpuReady&&!canAim()',
          ),
          "handoff discards queued old-map CPU work",
        );
        await c.close();
        continue;
      }
      if (process.env.ARCLINE_FINAL_CAVE_ONLY) {
        await p.evaluate(() => {
          s = E.campaign(100, { matchSeed: 4697 });
          while (s.finalTeam.map < 2) {
            ArcFinalTeam.credit(
              s,
              s.characterId,
              s.spec.finalBattle.requiredDamage,
            );
            E.next(s);
            s.phase = "aim";
          }
          s.phase = "aim";
          hud();
          draw();
        });
        ok(
          await p.evaluate('s.spec.finalBackdrop==="cave"&&canAim()'),
          "cave backdrop active",
        );
        await p.screenshot({ path: path.join(out, "cave-normal.png") });
        await p.locator("#mapCameraToggle").tap();
        await p.screenshot({ path: path.join(out, "cave-overview.png") });
        await c.close();
        continue;
      }
      if (width === 844) {
        relayResults.push(await replayFinalRelay(p, route, ok, out));
      } else {
        for (const map of [0, 1, 2, 3]) {
          await p.evaluate((map) => {
            s = E.campaign(100, { matchSeed: 4697 });
            while (s.finalTeam.map < map) {
              ArcFinalTeam.credit(
                s,
                s.characterId,
                s.spec.finalBattle.requiredDamage,
              );
              E.next(s);
              s.phase = "aim";
            }
            s.phase = "aim";
            hud();
            draw();
          }, map);
          await p.locator("#mapCameraToggle").tap();
          await p
            .locator("#mapCameraAll")
            .count()
            .then(async (n) => {
              if (n) await p.locator("#mapCameraAll").tap();
            });
          await p.screenshot({
            path: path.join(out, "map-" + map + "-" + width + ".png"),
          });
          await p.locator("#mapCameraClose").tap();
          ok(
            await p.evaluate(
              "Math.abs(s.units[0].x-s.units[1].x)>=800&&E.combat.points(s.units[0].hp)===100",
            ),
            "map placement " + width + "/" + map,
          );
        }
        if (motion === "reduce") {
          await p.evaluate(() => {
            s = E.campaign(100);
            for (let i = 0; i < 2; i++) {
              ArcFinalTeam.credit(
                s,
                s.characterId,
                s.spec.finalBattle.requiredDamage,
              );
              E.next(s);
              s.phase = "aim";
            }
            ArcFinalTeam.credit(
              s,
              s.characterId,
              s.spec.finalBattle.requiredDamage,
            );
            advanceTurn();
            draw();
          });
          ok(
            await p.evaluate("transition?.reduced&&s.time===.7&&!canAim()"),
            "reduced motion still gates transition",
          );
          await p.evaluate(() => {
            update(0.8);
            draw();
          });
          ok(
            await p.evaluate("canAim()"),
            "reduced motion arrival restores input",
          );
        }
      }
      await c.close();
    }
    ok(errors.length === 0, errors.join("\n"));
    fs.writeFileSync(
      path.join(
        out,
        process.env.ARCLINE_FINAL_QUEUE_ONLY
          ? "HANDOFF_QUEUE.json"
          : process.env.ARCLINE_FINAL_CAVE_ONLY
            ? "CAVE_VISUAL.json"
            : "FINAL_BATTLE_BROWSER.json",
      ),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          errors,
          relayResults,
          scope:
            "HP100/150 each/1500 total;remote spawns;three mobile sizes and two languages;all4 map inspection;current legal player inputs through production controller with autonomous Worker enemies, frame-applied HP, walking/teleport/echo/camera phases through collapse and arrival with frozen input,unchanged collisions,music,save andENDING;reduced motion.",
        },
        null,
        2,
      ),
    );
    console.log("PASS final100 browser " + checks + " checks");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
