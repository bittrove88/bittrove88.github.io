"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  Save = require("../dist/save.js"),
  Crew = require("../dist/crew.js");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-recruit-enemy";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const ok = (v, m) => {
    checks++;
    assert(v, m);
  },
  errors = [],
  rows = [],
  phoneRows = [];
const server = http.createServer((q, r) => {
  let name = new URL(q.url, "http://local").pathname;
  if (name.endsWith("/")) name += "index.html";
  const file = path.resolve(root, "." + name);
  if (!file.startsWith(root + path.sep)) return r.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return r.writeHead(404).end();
    r.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".m4a": "audio/mp4",
        ".svg": "image/svg+xml",
      }[path.extname(file)] || "text/html",
    );
    r.end(b);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const c = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
    });
    await c.addInitScript(
      (profile) => {
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(profile));
        localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
      },
      Save.decode(
        JSON.stringify({
          schemaVersion: 8,
          campaignResetVersion: 2,
          cleared: 99,
          journeyStarted: true,
          difficultyConfirmed: true,
          onboarding: { step: "done" },
          unlockedCharacterIds: Crew.ids,
          joinedCharacterIds: Crew.ids,
          seenPreviewIds: Save.previewIds,
          journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
        }),
      ),
    );
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(
      "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
    );
    await p.waitForFunction(
      'save.ready&&!document.getElementById("play").disabled',
    );
    await p.evaluate(() => {
      bgm.unlock();
      window.audioDuringLoading = [];
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...a) {
        if (ArcExpeditionUi.loading) audioDuringLoading.push(this.src);
        return play.apply(this, a);
      };
    });
    let release;
    const gate = new Promise((r) => (release = r));
    let blocked = 0;
    await p.route("**/roll-cutouts/players/rico.png*", async (route) => {
      blocked++;
      await gate;
      await route.continue();
    });
    await p.evaluate(() => ArcExpeditionUi.replay("rico", () => {}));
    await p.waitForTimeout(400);
    const pending = await p.evaluate(() => ({
      loading: ArcExpeditionUi.loading,
      panel: document.querySelector(".expedition-panel").hidden,
      bgm: bgm.state(),
      elapsed: document.querySelector("#expeditionArt [data-hero-art]").dataset
        .elapsed,
      source: document.querySelector("#expeditionArt [data-hero-art]").dataset
        .source,
    }));
    ok(
      blocked > 0 &&
        pending.loading &&
        pending.panel &&
        pending.source === "image-loading" &&
        +pending.elapsed === 0,
      "whole recruit panel waits for the actual original",
    );
    ok(
      pending.bgm.state === "paused",
      "existing native BGM pauses while the image is unavailable",
    );
    await p.evaluate(() => {
      bgm.unlock();
      pauseHost("sdk");
      resumeHost("sdk");
    });
    await p.waitForTimeout(200);
    ok(
      await p.evaluate(
        'bgm.state().state==="paused"&&audioDuringLoading.length===0',
      ),
      "gesture and host resume cannot start music before the image",
    );
    await p.screenshot({ path: path.join(out, "recruit-loading.png") });
    release();
    await p.waitForFunction("!ArcExpeditionUi.loading");
    ok(
      await p.locator(".expedition-panel").isVisible(),
      "complete scene opens after decode",
    );
    ok(
      await p.evaluate(
        'bgm.state().state!=="paused"&&document.querySelector("#expeditionArt .ch-image").naturalWidth>0',
      ),
      "image and BGM resume together",
    );
    await p.locator("#expeditionStay").click();
    await p.unroute("**/roll-cutouts/players/rico.png*");
    // The network may be finished while the decoder is still preparing pixels.
    await p.evaluate(() => {
      window.originalRecruitDecode = HTMLImageElement.prototype.decode;
      window.decodeGate = new Promise(
        (resolve) => (window.finishRecruitDecode = resolve),
      );
      HTMLImageElement.prototype.decode = function () {
        const result = originalRecruitDecode.call(this);
        if (this.closest("#expeditionArt") && this.src.includes("hana.png"))
          return result.then(() => {
            window.recruitDecoderWaiting = true;
            return decodeGate;
          });
        return result;
      };
      ArcExpeditionUi.replay("hana", () => {});
    });
    await p.waitForFunction("window.recruitDecoderWaiting");
    ok(
      await p.evaluate(
        'ArcExpeditionUi.loading&&document.querySelector(".expedition-panel").hidden&&bgm.state().state==="paused"&&document.querySelector("#expeditionArt .ch-image").complete',
      ),
      "even a loaded image cannot reveal or play music before decode resolves",
    );
    await p.evaluate(() => {
      finishRecruitDecode();
      HTMLImageElement.prototype.decode = originalRecruitDecode;
    });
    await p.waitForFunction("!ArcExpeditionUi.loading");
    await p.locator("#expeditionStay").click();
    // Offline/failed images retain progress, reveal neither canvas nor scene, and offer a real retry.
    await p.route("**/roll-cutouts/players/ban.png*", (r) => r.abort());
    await p.evaluate(() => {
      ArcAssetLoader.clear("assets/ending/roll-cutouts/players/ban.png");
      save.data.pendingRecruit = { id: "ban", stage: 15, alreadyOwned: false };
      ArcExpeditionUi.open(() => {});
    });
    await p.locator("#expeditionLoadRetry").waitFor({ state: "visible" });
    ok(
      (await p.locator(".expedition-panel").isHidden()) &&
        (await p.evaluate(
          'ArcExpeditionUi.loading&&bgm.state().state==="paused"',
        )),
      "failed load stays silent with no incomplete character",
    );
    ok(
      await p.evaluate('save.data.pendingRecruit.id==="ban"'),
      "load failure never consumes pending recruit",
    );
    await p.screenshot({ path: path.join(out, "recruit-retry.png") });
    await p.unroute("**/roll-cutouts/players/ban.png*");
    await p.locator("#expeditionLoadRetry").click();
    await p.waitForFunction("!ArcExpeditionUi.loading");
    await p.locator("#expeditionStay").click();
    await p.waitForFunction("!ArcExpeditionUi.active");
    // Every player image, both languages, compact/native/rotated landscape and desktop.
    for (const [width, height] of [
      [568, 240],
      [844, 390],
      [852, 393],
      [932, 430],
      [393, 852],
      [1280, 720],
    ])
      for (const lang of ["ja", "en"]) {
        await p.setViewportSize({ width, height });
        await p.evaluate((lang) => ArcI18n.setLanguage(lang), lang);
        for (const id of Crew.ids) {
          await p.evaluate((id) => {
            save.data.pendingRecruit = {
              id,
              stage: ArcCrew.get(id).stage,
              alreadyOwned: true,
            };
            ArcExpeditionUi.open(() => {});
          }, id);
          await p.waitForFunction("!ArcExpeditionUi.loading");
          const data = await p.evaluate(() => {
            cancelAnimationFrame(raf);
            raf = 0;
            const a = document.querySelector("#expeditionArt [data-hero-art]"),
              img = a.querySelector(".ch-image"),
              actor = ArcEndingData.actors.find(
                (x) => x.id === "player:" + a.dataset.heroArt,
              );
            const poses = [];
            for (const t of [1.35, 2, 4, 7]) {
              a.dataset.elapsed = String(t);
              ArcCharacterHero.updateAll(
                0,
                document.getElementById("expeditionArt"),
              );
              const x = img.getBoundingClientRect(),
                b = a.getBoundingClientRect();
              poses.push({
                t,
                contained:
                  x.left >= b.left - 1 &&
                  x.right <= b.right + 1 &&
                  x.top >= b.top - 1 &&
                  x.bottom <= b.bottom + 1 &&
                  x.left >= -1 &&
                  x.right <= innerWidth + 1 &&
                  x.top >= -1 &&
                  x.bottom <= innerHeight + 1,
              });
            }
            return {
              id: a.dataset.heroArt,
              source: a.dataset.source,
              width: img.naturalWidth,
              height: img.naturalHeight,
              expected: [actor.width, actor.height],
              fit: getComputedStyle(img).objectFit,
              url: img.src,
              poses,
              canvas: a.querySelector("canvas").hidden,
            };
          });
          ok(
            data.source === "verified-image" &&
              data.width === data.expected[0] &&
              data.height === data.expected[1] &&
              data.fit === "contain" &&
              data.canvas,
            "correct complete asset, no placeholder " +
              id +
              "/" +
              width +
              "/" +
              lang,
          );
          ok(
            data.poses.every((p) => p.contained),
            "whole image remains inside its frame at every settled pose " +
              id +
              "/" +
              width +
              "/" +
              lang,
          );
          ok(
            data.url.includes("?v="),
            "revised alpha asset bypasses old cached PNG " + id,
          );
          rows.push({ width, height, lang, ...data });
          await p.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          if (width === 844 && lang === "ja")
            await p.screenshot({
              path: path.join(out, "recruit-" + id + ".png"),
            });
          await p.locator("#expeditionStay").click();
          await p.waitForFunction("!ArcExpeditionUi.active");
        }
      }
    // Resolve the real rotated production CSS with controlled iPhone safe-area values.
    const phoneContext = await browser.newContext({
      viewport: { width: 440, height: 956 },
      hasTouch: true,
      isMobile: true,
    });
    await phoneContext.addInitScript(
      (profile) => {
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(profile));
        localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
        window.phoneAngle = 0;
        const insets = (window.phoneInsets = {
          top: 59,
          right: 0,
          bottom: 34,
          left: 0,
        });
        Object.defineProperty(navigator, "standalone", {
          get: () => true,
          configurable: true,
        });
        Object.defineProperty(window, "orientation", {
          get: () => phoneAngle,
          configurable: true,
        });
        const descriptor = Object.getOwnPropertyDescriptor(
          Node.prototype,
          "textContent",
        );
        Object.defineProperty(Node.prototype, "textContent", {
          ...descriptor,
          set(value) {
            if (
              this.nodeType === 1 &&
              this.hasAttribute("data-viewport-mirror")
            )
              value = String(value).replace(
                /env\(safe-area-inset-(top|right|bottom|left)[^)]*\)/g,
                (_, side) => insets[side] + "px",
              );
            descriptor.set.call(this, value);
          },
        });
      },
      Save.decode(
        JSON.stringify({
          schemaVersion: 8,
          campaignResetVersion: 2,
          cleared: 99,
          journeyStarted: true,
          difficultyConfirmed: true,
          onboarding: { step: "done" },
          unlockedCharacterIds: Crew.ids,
          joinedCharacterIds: Crew.ids,
          seenPreviewIds: Save.previewIds,
          journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
        }),
      ),
    );
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (e) => errors.push(String(e)));
    await phone.goto(
      "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
    );
    await phone.waitForFunction(
      'save.ready&&!document.getElementById("play").disabled',
    );
    for (const mode of [
      {
        angle: 0,
        w: 440,
        h: 956,
        left: 59,
        right: 34,
        bottom: 0,
        insets: { top: 59, right: 0, bottom: 34, left: 0 },
      },
      {
        angle: 180,
        w: 440,
        h: 956,
        left: 34,
        right: 59,
        bottom: 0,
        insets: { top: 59, right: 0, bottom: 34, left: 0 },
      },
      {
        angle: 90,
        w: 956,
        h: 440,
        left: 59,
        right: 59,
        bottom: 21,
        insets: { top: 0, right: 59, bottom: 21, left: 59 },
      },
      {
        angle: 270,
        w: 956,
        h: 440,
        left: 59,
        right: 59,
        bottom: 0,
        insets: { top: 0, right: 59, bottom: 21, left: 59 },
      },
    ]) {
      const angle = mode.angle;
      await phone.evaluate(
        (mode) => Object.assign(phoneInsets, mode.insets),
        mode,
      );
      await phone.setViewportSize({ width: mode.w, height: mode.h });
      await phone.evaluate((angle) => {
        phoneAngle = angle;
        viewport.fit();
      }, angle);
      for (const id of Crew.ids) {
        await phone.evaluate((id) => {
          save.data.pendingRecruit = {
            id,
            stage: ArcCrew.get(id).stage,
            alreadyOwned: true,
          };
          ArcExpeditionUi.open(() => {});
        }, id);
        await phone.waitForFunction("!ArcExpeditionUi.loading");
        const frame = await phone.evaluate(() => {
          const art = document.querySelector("#expeditionArt [data-hero-art]");
          art.dataset.elapsed = "7";
          ArcCharacterHero.updateAll(0);
          const app = document.getElementById("app"),
            r = ArcViewport.rect(art.querySelector(".ch-image"), app);
          return {
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
            width: app.clientWidth,
            height: app.clientHeight,
          };
        });
        phoneRows.push({
          id,
          angle,
          ...frame,
          safe: { left: mode.left, right: mode.right, bottom: mode.bottom },
        });
        ok(
          frame.left >= mode.left - 0.5 &&
            frame.right <= frame.width - mode.right + 0.5 &&
            frame.top >= -0.5 &&
            frame.bottom <= frame.height - mode.bottom + 0.5,
          "whole recruit image avoids the iPhone cutout " + id + "/" + angle,
        );
        await phone.locator("#expeditionStay").click();
      }
    }
    await phoneContext.close();
    // Worker and main-thread planners see identical real state and seeded RNG.
    await p.setViewportSize({ width: 844, height: 390 });
    const worker = await p.evaluate(async () => {
      const s = E.campaign(98, { matchSeed: 4697 }),
        seed = 12345,
        expected = E.planEnemyAction(s, E.seeded(seed));
      const w = new Worker("cpu-worker.js?v=" + ArcRelease.cacheVersion);
      try {
        return await new Promise((resolve, reject) => {
          w.onerror = (e) => reject(Error(e.message));
          w.onmessage = (e) => resolve({ expected, actual: e.data });
          w.postMessage({ id: 1, state: { ...s, random: undefined }, seed });
        });
      } finally {
        w.terminate();
      }
    });
    ok(
      !worker.actual.error &&
        JSON.stringify(worker.expected.action) ===
          JSON.stringify(worker.actual.action),
      "Worker and fallback return the same action",
    );
    ok(
      JSON.stringify(worker.expected.plan) ===
        JSON.stringify(worker.actual.plan),
      "Worker and fallback return the same shot",
    );
    const fallback = await p.evaluate(async () => {
      worker?.terminate();
      worker = null;
      s = E.campaign(98, { matchSeed: 4697 });
      s.turn = 1;
      s.phase = "cpu";
      gameToken++;
      const original = JSON.stringify(s),
        expected = E.planEnemyAction(
          s,
          E.seeded((s.matchSeed + s.round * 1009) >>> 0),
        );
      let ticks = 0;
      const timer = setInterval(() => ticks++, 1);
      requestCPU();
      while (!cpuReady) await new Promise((r) => setTimeout(r, 5));
      clearInterval(timer);
      const match = JSON.stringify(cpuReady) === JSON.stringify(expected),
        unchanged = JSON.stringify(s) === original;
      cpuJob = null;
      cpuReady = null;
      return { ticks, match, unchanged };
    });
    ok(
      fallback.match && fallback.unchanged && fallback.ticks > 5,
      "actual Worker-disabled fallback yields to the UI and matches Worker logic",
    );
    // Exercise the actual game phase branch: teleport consumes the whole enemy turn.
    const phase = await p.evaluate(() => {
      lobby();
      s = E.campaign(98, { matchSeed: 4697 });
      s.phase = "cpu";
      s.turn = 1;
      let decision;
      for (let i = 0; i < 6; i++) {
        decision = E.planEnemyAction(s, E.seeded(100 + i));
        if (decision.action?.kind === "teleport") break;
        E.commitEnemyAction(s, decision.action);
        E.move(s, 1, decision.target - s.units[1].x);
        E.next(s);
        s.phase = "aim";
        E.next(s);
        s.phase = "cpu";
      }
      if (decision.action?.kind !== "teleport")
        throw Error("No native teleport opportunity");
      cpuReady = decision;
      cpuJob = { id: 4321, token: gameToken };
      s.time = 0;
      const hp = s.units.map((u) => u.hp),
        count = s.shotCount;
      update(0.01);
      const during = {
        phase: s.phase,
        hp: s.units.map((u) => u.hp),
        count: s.shotCount,
        queued: !!cpuReady,
      };
      update(0.6);
      return {
        hp,
        count,
        during,
        after: { turn: s.turn, phase: s.phase, hp: s.units.map((u) => u.hp) },
        log: s.enemyActionLog,
      };
    });
    ok(
      phase.during.phase === "cpuTeleport" &&
        !phase.during.queued &&
        JSON.stringify(phase.hp) === JSON.stringify(phase.during.hp) &&
        phase.count === phase.during.count,
      "actual CPU teleport phase has no shot or damage",
    );
    ok(
      phase.after.turn === 0 &&
        JSON.stringify(phase.hp) === JSON.stringify(phase.after.hp),
      "teleport returns control to the player without attacking",
    );
    ok(errors.length === 0, errors.join("\n"));
    fs.writeFileSync(
      path.join(out, "RECRUIT_ENEMY_BROWSER.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          rows,
          phoneRows,
          loading: pending,
          fallback,
          phase,
          errors,
          scope:
            "Ten original-pixel cutouts x6 viewports x2 languages x4 settled poses; native image decoding and BGM loading/failure/retry; Worker parity and actual teleport game phase. Physical Safari remains unverified.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log("PASS recruit/enemy browser", checks);
    await c.close();
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
