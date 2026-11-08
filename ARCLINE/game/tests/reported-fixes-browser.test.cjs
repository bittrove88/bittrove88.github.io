"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const Save = require("../dist/save.js"),
  Crew = require("../dist/crew.js");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-reported-fixes";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const ok = (v, m) => {
    checks++;
    assert(v, m);
  },
  errors = [];
const before =
  require("../../design/stage_reviews/STAGES_REPORTED_FIXES_20261108.json").stages.map(
    (r) => require(path.join(root, "ARCLINE", r.source)),
  );
const server = http.createServer((q, r) => {
  let name = new URL(q.url, "http://local").pathname;
  if (name.endsWith("/")) name += "index.html";
  let file = path.resolve(root, "." + name);
  if (!file.startsWith(root + path.sep)) return r.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return r.writeHead(404).end();
    r.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".m4a": "audio/mp4",
      }[path.extname(file)] || "text/html",
    );
    r.end(b);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      reducedMotion: "no-preference",
    });
    await context.addInitScript(
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
          journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
          seenPreviewIds: Save.previewIds,
        }),
      ),
    );
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto(
      "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
    );
    await p.waitForFunction(
      'save.ready&&!document.getElementById("play").disabled',
    );
    const raster = await p.evaluate(() => {
      const state = E.campaign(21, { matchSeed: 4697 }),
        r = state.world.regions.find((r) => r.kind === "C");
      function draw(time, bounds) {
        const c = document.createElement("canvas");
        c.width = 1000;
        c.height = 500;
        const x = c.getContext("2d");
        ArcComponentArt.drawRegion(x, r, { time, dpr: 1, bounds });
        return x.getImageData(0, 0, 1000, 500).data;
      }
      const a = draw(0),
        b = draw(20),
        clipA = draw(0, { left: 300, right: 740, top: 70, bottom: 290 }),
        clipB = draw(20, { left: 340, right: 780, top: 90, bottom: 320 });
      let changes = 0,
        overlapChanges = 0,
        ghosts = 0,
        contacts = 0,
        transparentGaps = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changes++;
      for (let x = 345; x < 735; x++)
        for (let y = 95; y < 285; y++) {
          const i = (y * 1000 + x) * 4;
          for (let k = 0; k < 4; k++)
            if (clipA[i + k] !== clipB[i + k]) {
              overlapChanges++;
              break;
            }
        }
      for (let x = r.x1 + 2; x < r.x2; x += 4)
        for (let y = r.y1 + 2; y < r.y2; y += 4) {
          const alpha = a[(y * 1000 + x) * 4 + 3],
            hit = ArcPhysics.inRegion({ x: x + 0.5, y: y + 0.5 }, r);
          if (hit) {
            contacts++;
            if (!alpha) ghosts++;
          } else if (!alpha) transparentGaps++;
        }
      return { changes, overlapChanges, ghosts, contacts, transparentGaps };
    });
    ok(raster.changes === 0, "cloud pixels stay fixed as time advances");
    ok(
      raster.overlapChanges === 0,
      "camera clipping does not redistribute clouds",
    );
    ok(
      raster.ghosts === 0 &&
        raster.contacts > 100 &&
        raster.transparentGaps > 100,
      "physical contacts occupy visible cloud pixels, not empty rectangular gaps",
    );
    // Slow the actual original cutout. Observe every frame before it can load.
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    let blocked = 0;
    await p.route(
      "**/assets/ending/roll-cutouts/players/hana.png*",
      async (route) => {
        blocked++;
        await gate;
        await route.continue();
      },
    );
    await p.evaluate(() => {
      window.revealFrames = [];
      function sample() {
        const e = document.querySelector("#expeditionArt [data-hero-art]");
        if (e && !document.getElementById("expeditionDialog").hidden) {
          const canvas = e.querySelector("canvas"),
            plane = e.querySelector(".ch-art-plane");
          revealFrames.push({
            source: e.dataset.source,
            elapsed: +e.dataset.elapsed,
            canvas:
              !canvas.hidden &&
              getComputedStyle(canvas).display !== "none" &&
              +getComputedStyle(plane).opacity > 0.01,
          });
        }
        window.revealFrame = requestAnimationFrame(sample);
      }
      sample();
      ArcExpeditionUi.replay("hana", () => {});
    });
    await p.waitForTimeout(800);
    ok(blocked > 0, "the original image is actually held back");
    ok(
      (await p.locator("#expeditionRevealSkip").count()) === 0,
      "there is no joining skip button",
    );
    const waiting = await p.evaluate(() => ({
      frames: revealFrames,
      source: document.querySelector("#expeditionArt [data-hero-art]").dataset
        .source,
    }));
    ok(
      waiting.source === "image-loading" &&
        waiting.frames.length > 5 &&
        !waiting.frames.some((f) => f.canvas),
      "no inferior placeholder appears before the concept image",
    );
    ok(
      waiting.frames.every((f) => f.elapsed === 0),
      "flight waits for the original image",
    );
    release();
    await p.waitForFunction(
      'document.querySelector("#expeditionArt [data-hero-art]").dataset.source==="verified-image"',
    );
    ok(
      await p.locator("#expeditionArt .ch-canvas").isHidden(),
      "canvas remains hidden after the original is ready",
    );
    await p.waitForFunction(
      'Number(getComputedStyle(document.getElementById("expeditionMotto")).opacity)===1',
    );
    await p.screenshot({ path: path.join(out, "join-original-only.png") });
    await p.evaluate(() => cancelAnimationFrame(revealFrame));
    await p.locator("#expeditionStay").click();
    // Compare the same native map view before/after with the corrected dock in both.
    await p.locator("#play").click();
    await p.waitForFunction("canAim()");
    for (const record of before)
      for (const version of ["before", "after"]) {
        const result = await p.evaluate(
          ({ record, version }) => {
            cancelAnimationFrame(raf);
            raf = 0;
            encounter = null;
            demo = null;
            s = E.campaign(record.stage, {
              equippedCharacterId: "gun",
              matchSeed: 4697,
            });
            if (version === "before") {
              s.spec = record.before.runtime;
              s.world = G.world(s.spec);
            }
            s.angle = record.stage === 8 ? 46 : 12;
            s.power = record.stage === 8 ? 92 : 95;
            renderer.resetCamera();
            hud();
            clock = 1.5;
            draw();
            return { stage: s.stage, view: renderer.view };
          },
          { record, version },
        );
        ok(
          result.view.scale > 0,
          "valid native view " + record.stage + "/" + version,
        );
        await p.screenshot({
          path: path.join(
            out,
            "stage-" + record.stage + "-" + version + "-battle.png",
          ),
        });
        await p.locator("#mapCameraToggle").click();
        await p.waitForFunction("mapCamera.active");
        await p.screenshot({
          path: path.join(
            out,
            "stage-" + record.stage + "-" + version + ".png",
          ),
        });
        await p.locator("#mapCameraClose").click();
      }
    await p.evaluate(() => {
      s = E.campaign(21, { matchSeed: 4697 });
      s.angle = 54;
      s.power = 80;
      clock = 0;
      renderer.resetCamera();
      hud();
      draw();
    });
    await p.screenshot({
      path: path.join(out, "clouds-visible-footprints.png"),
    });
    await p.locator("#mapCameraToggle").click();
    await p.screenshot({ path: path.join(out, "clouds-full-map.png") });
    await p.locator("#mapCameraClose").click();
    ok(!errors.length, errors.join("\n"));
    await context.close();
    fs.writeFileSync(
      path.join(out, "REPORTED_FIXES_BROWSER.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          raster,
          originalWaitFrames: waiting.frames.length,
          blockedImageRequests: blocked,
          errors,
          scope:
            "Real cloud raster/physics coverage and time/camera stability; delayed-original reveal without placeholder or skip; native8/12 before/after views. Chromium, not physical Safari.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log("PASS reported fixes browser", checks, "checks");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
