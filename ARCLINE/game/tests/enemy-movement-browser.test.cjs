"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const Save = require("../dist/save.js");
const root = path.resolve(__dirname, "../../..");
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-enemy-movement";
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
    for (const [width, height, fps, fallback] of [
      [1280, 720, 30, false],
      [844, 390, 120, false],
      [568, 320, 30, true],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: width < 1000,
      });
      page.on("pageerror", (e) => errors.push(e.stack));
      await page.addInitScript((data) => {
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(data));
        localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
      }, seed("gun"));
      await page.goto(
        "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
      );
      await page.waitForFunction("save.ready");
      await page.evaluate(
        ({ fps, fallback }) => {
          manualPaused = true;
          cancelAnimationFrame(raf);
          raf = 0;
          bgm.stop?.();
          if (fallback && worker) {
            worker.onerror = null;
            worker.onmessage = null;
            worker.terminate();
            worker = null;
          }
          window.fps = fps;
          window.stepMotion = (seconds) => {
            for (let elapsed = 0; elapsed < seconds; ) {
              const dt = Math.min(1 / fps, seconds - elapsed);
              update(dt);
              draw();
              elapsed += dt;
            }
          };
          window.motionResult = { fps, fallback, walk: [], teleport: [] };
          window.prepareMotion = (stage) => {
            lobby();
            manualPaused = false;
            cancelAnimationFrame(raf);
            raf = 0;
            s = E.campaign(stage, { matchSeed: 4697 });
            $("lobby").hidden = true;
            $("battle").hidden = false;
            encounter = null;
            demo = null;
            shot = null;
            tail = null;
            s.phase = "cpu";
            s.turn = 1;
            s.time = 0;
            renderer.resetCamera();
            draw();
          };
        },
        { fps, fallback },
      );
      const early = await page.evaluate(async () => {
        prepareMotion(9);
        s.matchSeed = 42;
        requestCPU();
        while (!cpuReady) await new Promise((r) => setTimeout(r, 5));
        update(0.001);
        if (s.phase !== "cpuMove" || s.cpuMoveDuration !== 0.2)
          throw Error("early-stage legacy movement changed");
        return {
          duration: s.cpuMoveDuration,
          distance: Math.abs(s.cpuTarget - s.cpuStart),
        };
      });
      // The real planner's walking target, rendered and moved through the controller.
      const walking = await page.evaluate(async () => {
        prepareMotion(41);
        s.matchSeed = 42;
        const origin = s.units[1].x;
        requestCPU();
        while (!cpuReady) await new Promise((r) => setTimeout(r, 5));
        const expected = cpuReady.target;
        update(1 / fps);
        draw();
        if (s.phase !== "cpuMove") throw Error("41 has no walking action");
        const duration = s.cpuMoveDuration,
          distance = Math.abs(expected - origin);
        if (Math.abs(duration - distance / 160) > 1e-9)
          throw Error("distance compressed by duration cap");
        let elapsed = 0,
          last = s.units[1].x,
          maxSpeed = 0,
          frames = 0;
        while (s.phase === "cpuMove" && frames++ < 200) {
          update(1 / fps);
          draw();
          elapsed += 1 / fps;
          maxSpeed = Math.max(maxSpeed, Math.abs(s.units[1].x - last) * fps);
          last = s.units[1].x;
        }
        if (maxSpeed > 160.001 || distance > 140.001 || s.phase !== "flight")
          throw Error("walk speed/budget/shoot handoff");
        return {
          origin,
          expected,
          distance,
          duration,
          elapsed,
          maxSpeed,
          worker: platformStatus.cpuJobs.at(-1)?.worker,
        };
      });
      assert(walking.distance > 60);
      assert.equal(!!walking.worker, !fallback);
      // A real stage71 shot -> CPU Worker/fallback -> walk -> next turn -> teleport.
      const native = await page.evaluate(async () => {
        lobby();
        manualPaused = false;
        cancelAnimationFrame(raf);
        raf = 0;
        s = E.campaign(71, { matchSeed: 4697 });
        $("lobby").hidden = true;
        $("battle").hidden = false;
        const phases = new Set();
        let transfer = null,
          seen = false;
        for (let turn = 0; turn < 2; turn++) {
          const round = s.round;
          E.selectWeapon(s, "W01");
          s.angle = 170;
          s.power = 20;
          manualPaused = false;
          launch();
          if (!shot) throw Error("native player shot failed");
          for (let frame = 0; frame < 4000; frame++) {
            update(1 / fps);
            draw();
            phases.add(s.phase);
            if (s.enemyTeleport && !seen) {
              seen = true;
              transfer = {
                from: { x: s.units[1].x, y: s.units[1].y },
                hp: s.units.map((u) => u.hp),
                shots: s.shotCount,
                used: s.enemyTactics?.teleports || 0,
              };
            }
            if (s.enemyTeleport) {
              const t = s.enemyTeleport;
              if (
                !t.landed &&
                Math.hypot(
                  s.units[1].x - transfer.from.x,
                  s.units[1].y - transfer.from.y,
                ) > 0.001
              )
                throw Error("relocated before pulse arrival");
              if (
                t.landed &&
                Math.hypot(
                  s.units[1].x - t.action.to.x,
                  s.units[1].y - t.action.to.y,
                ) > 0.001
              )
                throw Error("arrival mismatch");
              if (
                JSON.stringify(transfer.hp) !==
                  JSON.stringify(s.units.map((u) => u.hp)) ||
                s.shotCount !== transfer.shots
              )
                throw Error("teleport attacked");
            }
            if (s.round > round && s.turn === 0 && s.phase === "aim") break;
            if (frame % 10 === 0) await new Promise((r) => setTimeout(r, 1));
            if (frame === 3999) throw Error("enemy handoff timed out");
          }
        }
        if (!seen || !canAim() || s.enemyTactics.teleports !== 1)
          throw Error("native teleport/turn completion");
        return {
          phases: [...phases],
          actions: s.enemyActionLog,
          canAim: canAim(),
          hp: s.units.map((u) => u.hp),
        };
      });
      assert(native.phases.includes("cpuTeleport"));
      assert(native.phases.includes("cpuMove"));
      // Freeze the actual transfer mid-flight, inspect the shared drawing call and
      // contact timing, then verify one commit, the arrival flash and no extra shot.
      const timing = await page.evaluate(async () => {
        prepareMotion(71);
        s.round = 2;
        requestCPU();
        while (!cpuReady) await new Promise((r) => setTimeout(r, 5));
        if (cpuReady.action?.kind !== "teleport") {
          let found = false;
          for (let i = 0; i < 20; i++) {
            const decision = E.planEnemyAction(s, E.seeded(i));
            if (decision.action?.kind === "teleport") {
              cpuReady = decision;
              found = true;
              break;
            }
          }
          if (!found) throw Error("no legal transfer fixture");
        }
        const from = { x: s.units[1].x, y: s.units[1].y },
          to = cpuReady.action.to,
          used = s.enemyTactics?.teleports || 0;
        update(1 / fps);
        const transfer = s.enemyTeleport;
        if (!transfer) throw Error("transfer did not start");
        const duration = transfer.plan.duration;
        stepMotion(duration * 0.5);
        draw();
        if (
          s.units[1].x !== from.x ||
          s.units[1].y !== from.y ||
          (s.enemyTactics?.teleports || 0) !== used
        )
          throw Error("premature transfer");
        const ctx = $("world").getContext("2d"),
          original = ctx.stroke;
        let calls = 0;
        ctx.stroke = function (...args) {
          if (this.strokeStyle === ArcEffects.appearance("TELEPORT").color)
            calls++;
          return original.apply(this, args);
        };
        draw();
        ctx.stroke = original;
        if (calls < 1) throw Error("player TELEPORT brush not rendered");
        window.transferSnapshot = { from, to, duration, age: transfer.age };
        // The production RAF loop owns pause: paused loops must leave the pulse still.
        const age = transfer.age;
        manualPaused = true;
        loop(performance.now());
        cancelAnimationFrame(raf);
        raf = 0;
        if (transfer.age !== age) throw Error("paused teleport advanced");
        manualPaused = false;
        return { from, to, duration, age, calls };
      });
      await page.screenshot({
        path: path.join(out, `teleport-flight-${width}.png`),
      });
      const arrival = await page.evaluate(() => {
        const t = s.enemyTeleport;
        stepMotion(t.plan.duration - t.age + 0.000001);
        draw();
        if (
          !t.landed ||
          !s.units[1].teleportFlash ||
          s.enemyTactics.teleports !== 1 ||
          s.enemyActionLog.filter((a) => a.kind === "teleport").length !== 1
        )
          throw Error("contact must commit once and flash");
        return {
          x: s.units[1].x,
          y: s.units[1].y,
          flash: s.units[1].teleportFlash.age,
        };
      });
      assert.equal(arrival.x, timing.to.x);
      assert.equal(arrival.y, timing.to.y);
      await page.screenshot({
        path: path.join(out, `teleport-arrival-${width}.png`),
      });
      await page.evaluate(() => {
        update(0.56);
        if (s.phase === "transition") update(0.61);
        draw();
        if (s.turn !== 0 || !canAim() || s.enemyTeleport)
          throw Error("arrival did not return control " + s.phase);
      });
      // Exit mid-transfer: a later frame must not commit the discarded action.
      await page.evaluate(() => {
        prepareMotion(71);
        s.round = 2;
        let decision;
        for (let i = 0; i < 20; i++) {
          decision = E.planEnemyAction(s, E.seeded(i));
          if (decision.action?.kind === "teleport") break;
        }
        cpuReady = decision;
        update(0.001);
        if (!s.enemyTeleport) throw Error("exit fixture");
        lobby();
        update(1);
        draw();
        if (s !== null || cpuReady || cpuJob)
          throw Error("stale transfer after lobby");
      });
      // Adjacent player TELEPORT keeps the native physics/resolve path and flash.
      const player = await page.evaluate(() => {
        const state = E.campaign(71);
        E.selectTeleport(state);
        const plan = E.trajectory(state, 0, 48, 60);
        const hp = state.units.map((u) => u.hp);
        E.resolve(state, plan);
        return {
          teleport: plan.teleport,
          success: plan.teleportSuccess,
          hpUnchanged:
            JSON.stringify(hp) === JSON.stringify(state.units.map((u) => u.hp)),
          flash: !!state.units[0].teleportFlash,
        };
      });
      assert(
        player.teleport && player.success && player.hpUnchanged && player.flash,
      );
      let realtime = null;
      if (width === 1280) {
        realtime = await page.evaluate(async () => {
          prepareMotion(71);
          s.round = 2;
          let decision;
          for (let i = 0; i < 20; i++) {
            decision = E.planEnemyAction(s, E.seeded(i));
            if (decision.action?.kind === "teleport") break;
          }
          cpuReady = decision;
          update(0.001);
          const duration = s.enemyTeleport.plan.duration,
            started = performance.now();
          previous = 0;
          schedule();
          while (s.enemyTeleport) await new Promise((r) => setTimeout(r, 16));
          const elapsed = (performance.now() - started) / 1000;
          manualPaused = true;
          cancelAnimationFrame(raf);
          raf = 0;
          if (elapsed < duration + 0.5 || elapsed > duration + 1.5)
            throw Error("normal-speed transfer timing " + elapsed);
          return { duration, elapsed, used: s.enemyTactics.teleports };
        });
      }
      rows.push({
        width,
        height,
        fps,
        fallback,
        walking,
        early,
        native,
        timing,
        arrival,
        player,
        realtime,
      });
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "ENEMY_MOVEMENT_BROWSER.json"),
      JSON.stringify({ status: "PASS", rows, errors }, null, 2),
    );
    console.log(
      "PASS enemy movement: " +
        rows.length +
        " viewport/fps/Worker cases, native turns, shared TELEPORT brush, contact, pause, exit, player teleport",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
