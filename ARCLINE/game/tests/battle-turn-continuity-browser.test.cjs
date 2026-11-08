"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const Save = require("../dist/save.js");
const Crew = require("../dist/crew.js");
const Weapons = require("../dist/weapons.js");
const root = path.resolve(__dirname, "../../..");
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-turn-continuity";
fs.mkdirSync(out, { recursive: true });
const rows = [],
  errors = [];
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    "." + new URL(req.url, "http://local").pathname,
  );
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (file.endsWith(path.sep)) file += "index.html";
  else if (fs.existsSync(file) && fs.statSync(file).isDirectory())
    file += "/index.html";
  fs.readFile(file, (error, body) => {
    if (error) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpeg": "image/jpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
      }[path.extname(file)] || "text/html",
    );
    res.end(body);
  });
});
const seed = (characterId) => ({
  schemaVersion: 8,
  campaignResetVersion: 2,
  cleared: 99,
  difficultyConfirmed: true,
  journeyStarted: true,
  onboarding: { step: "done" },
  seenPreviewIds: Save.previewIds,
  unlockedCharacterIds: Save.characterIds,
  joinedCharacterIds: Save.characterIds,
  equippedCharacterId: characterId,
  journal: {
    introSeen: true,
    moviesSeen: ["prologue", "30", "60", "epilogue"],
  },
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    async function open(characterId, native = false, fallback = false) {
      const page = await browser.newPage({
        viewport: { width: 844, height: 390 },
        reducedMotion: "no-preference",
      });
      page.on("pageerror", (error) => errors.push(error.stack));
      await page.addInitScript((data) => {
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(data));
        localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
        window.battleErrors = [];
        window.addEventListener("error", (event) =>
          window.battleErrors.push(event.message),
        );
      }, seed(characterId));
      await page.goto(
        "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
      );
      await page.waitForFunction("save.ready");
      const state = await page.evaluate(
        ({ native, fallback }) => {
          selectedMap = 8;
          start();
          encounter = null;
          demo = null;
          s.units.forEach((unit) => {
            unit.hp = unit.maxHp = 10000;
          });
          s.specialAmmo = 3;
          hostAudio = false;
          audioSync();
          if (fallback) {
            worker.terminate();
            worker = null;
          }
          if (!native) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          return {
            characterId: s.characterId,
            worker: !!worker,
            canAim: canAim(),
          };
        },
        { native, fallback },
      );
      assert.equal(state.characterId, characterId);
      assert.equal(state.worker, !fallback);
      assert.ok(state.canAim, "fixture reaches the real battle controls");
      return page;
    }
    // Drive the real game controller, renderer and asynchronous CPU Worker through
    // both shots. The attack viewer alone does not exercise this handoff.
    for (const [characterId, weaponId, fallback] of [
      ["sora", "S_SORA", false],
      ...Crew.ids
        .filter((id) => id !== "sora")
        .map((id) => [id, "S_" + id.toUpperCase(), false]),
      ["gun", "W01", false],
      ...Weapons.activeIds.map((id) => ["gun", id, false]),
      ["sora", "S_SORA", true],
    ]) {
      const page = await open(characterId, false, fallback);
      const player = await page.evaluate((weaponId) => {
        if (!ArcWeapons.get(weaponId).special && weaponId !== "W01")
          s.weaponStock[weaponId] = 3;
        if (!E.selectWeapon(s, weaponId))
          throw Error("Cannot select " + weaponId);
        s.angle = 65;
        s.power = 60;
        launch();
        let frames = 0;
        while (s.phase === "flight" && frames++ < 1200) {
          update(1 / 60);
          draw();
        }
        structuredClone({ ...s, random: undefined });
        return {
          phase: s.phase,
          shots: s.shotCount,
          ammo: s.specialAmmo,
          resolved: s.last[0]?.resolved,
          weaponId: s.last[0]?.weaponId,
          frames,
        };
      }, weaponId);
      assert.equal(
        player.phase,
        "impact",
        "player impact completes " + weaponId,
      );
      assert.ok(player.resolved);
      assert.equal(player.weaponId, weaponId === "W01" ? "N_GUN" : weaponId);
      assert.equal(player.shots, 1);
      assert.equal(player.ammo, weaponId.startsWith("S_") ? 2 : 3);
      await page.waitForFunction("!!cpuReady", null, { timeout: 15000 });
      const result = await page.evaluate(() => {
        let frames = 0,
          enemyLaunched = false;
        while (!canAim() && frames++ < 1800) {
          update(1 / 60);
          draw();
          if (shot?.side === 1) {
            enemyLaunched = true;
            structuredClone({ ...s, random: undefined });
          }
        }
        structuredClone({ ...s, random: undefined });
        return {
          aim: canAim(),
          round: s.round,
          enemyLaunched,
          shots: s.shotCount,
          jobs: platformStatus.cpuJobs,
          errors: [...platformStatus.errors, ...battleErrors],
          frames,
        };
      });
      assert.ok(result.enemyLaunched, "enemy really fires " + weaponId);
      assert.ok(
        result.aim && result.round === 2,
        "returns to player input " + weaponId,
      );
      assert.equal(result.shots, 1);
      assert.equal(result.jobs.length, 1);
      assert.equal(result.jobs[0].worker, !fallback);
      assert.deepEqual(result.errors, []);
      rows.push({ characterId, weaponId, fallback, player, result });
      await page.close();
    }
    // Also exercise actual FIRE input and requestAnimationFrame at normal speed,
    // including host pause/resume and a second consecutive turn after the special.
    const page = await open("sora", true);
    await page.evaluate(() => {
      E.selectWeapon(s, "S_SORA");
      s.angle = 65;
      hud();
    });
    await page.locator("#fire").click();
    await page.waitForFunction('s.phase === "flight"');
    assert.equal(await page.evaluate("s.specialAmmo"), 2);
    const age = await page.evaluate(() => {
      pauseHost("regression");
      return shot.presentationAge;
    });
    await page.waitForTimeout(180);
    assert.equal(
      await page.evaluate("shot.presentationAge"),
      age,
      "host pause preserves presentation time",
    );
    await page.evaluate(() => resumeHost("regression"));
    await page.waitForFunction(
      "battleErrors.length || (canAim() && s.round === 2)",
      null,
      { timeout: 20000 },
    );
    assert.deepEqual(await page.evaluate("battleErrors"), []);
    assert.equal(
      await page.evaluate("s.specialAmmo"),
      3,
      "turn two replenishes exactly one charge",
    );
    await page.screenshot({ path: path.join(out, "sora-next-turn.png") });
    await page.evaluate(() => {
      E.selectWeapon(s, "W01");
      hud();
    });
    await page.locator("#fire").click();
    await page.waitForFunction(
      "battleErrors.length || (canAim() && s.round === 3)",
      null,
      { timeout: 20000 },
    );
    const native = await page.evaluate(() => ({
      phase: s.phase,
      round: s.round,
      shots: s.shotCount,
      jobs: platformStatus.cpuJobs,
      errors: [...platformStatus.errors, ...battleErrors],
    }));
    assert.equal(native.round, 3);
    assert.equal(native.shots, 2);
    assert.equal(native.jobs.length, 2);
    assert.ok(native.jobs.every((job) => job.worker));
    assert.deepEqual(native.errors, []);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "BATTLE_TURN_CONTINUITY.json"),
      JSON.stringify(
        {
          status: "PASS",
          rows,
          native,
          errors,
          scope:
            "Actual battle controller, rendered flights, CPU Worker handoff, enemy action, next player input; every special and auxiliary; no-Worker fallback; two normal-speed RAF turns and host pause/resume.",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS battle turn continuity: " +
        rows.length +
        " handoffs + two native RAF turns",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
