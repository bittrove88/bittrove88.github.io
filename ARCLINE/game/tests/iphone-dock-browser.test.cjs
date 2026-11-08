"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const Save = require("../dist/save.js"),
  Run = require("../dist/campaign-run.js");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-iphone-dock";
fs.mkdirSync(out, { recursive: true });
const rows = [],
  errors = [];
let checks = 0;
const ok = (value, message) => {
  checks++;
  assert(value, message);
};
const server = http.createServer((req, res) => {
  let name = new URL(req.url, "http://local").pathname;
  if (name.endsWith("/")) name += "index.html";
  const file = path.resolve(root, "." + name);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, bytes) => {
    if (error) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".m4a": "audio/mp4",
      }[path.extname(file)] || "text/html",
    );
    res.end(bytes);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const [width, height, lang] of [
      [440, 956, "ja"],
      [430, 932, "en"],
      [393, 852, "ja"],
      [375, 812, "en"],
    ]) {
      const profile = Save.decode(
        JSON.stringify({
          schemaVersion: 8,
          campaignResetVersion: 2,
          cleared: 99,
          difficultyConfirmed: true,
          journeyStarted: true,
          onboarding: { step: "done" },
          unlockedCharacterIds: Save.characterIds,
          joinedCharacterIds: Save.characterIds,
          journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
          seenPreviewIds: Save.previewIds,
          preferences: { language: lang, controls: "left" },
        }),
      );
      profile.pendingRecruit = null;
      profile.chapterRun = Run.checkpoint(
        2,
        { weapons: {}, skills: {} },
        [],
        "dock-browser",
        424242,
      );
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      await context.addInitScript((data) => {
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(data));
        localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
        window.testAngle = 0;
        window.testInsets = { top: 59, right: 0, bottom: 34, left: 0 };
        Object.defineProperty(navigator, "standalone", {
          configurable: true,
          get: () => true,
        });
        Object.defineProperty(window, "orientation", {
          configurable: true,
          get: () => testAngle,
        });
        // Chromium has no iPhone notch metrics. Resolve the production mirror's already-rotated env() values only.
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
                (_, side) => testInsets[side] + "px",
              );
            descriptor.set.call(this, value);
          },
        });
      }, profile);
      const p = await context.newPage();
      p.on("pageerror", (error) => errors.push(String(error)));
      await p.goto(
        "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
      );
      await p.waitForFunction(
        'save.ready&&!document.getElementById("play").disabled',
      );
      await p.locator("#play").click();
      await p.waitForFunction("canAim()");
      const saved = await p.evaluate("JSON.stringify(save.data)");
      for (const mode of [
        {
          name: "portrait",
          angle: 0,
          w: width,
          h: height,
          insets: { top: 59, right: 0, bottom: 34, left: 0 },
          safe: { left: 59, right: 34, bottom: 0 },
        },
        {
          name: "portrait-reversed",
          angle: 180,
          w: width,
          h: height,
          insets: { top: 59, right: 0, bottom: 34, left: 0 },
          safe: { left: 34, right: 59, bottom: 0 },
        },
        {
          name: "landscape",
          angle: 90,
          w: height,
          h: width,
          insets: { top: 0, right: 59, bottom: 21, left: 59 },
          safe: { left: 59, right: 59, bottom: 21 },
        },
        {
          name: "landscape-reversed",
          angle: 270,
          w: height,
          h: width,
          insets: { top: 0, right: 59, bottom: 21, left: 59 },
          safe: { left: 59, right: 59, bottom: 0 },
        },
      ]) {
        await p.evaluate((mode) => {
          testAngle = mode.angle;
          testInsets = mode.insets;
        }, mode);
        await p.setViewportSize({ width: mode.w, height: mode.h });
        await p.evaluate(() => viewport.fit());
        await p.evaluate(() => new Promise(requestAnimationFrame));
        for (const hand of ["left", "right"])
          for (const menu of [
            "weapon",
            "weapon-skill",
            "teleport-weapon",
            "all",
          ]) {
            const row = await p.evaluate(
              ({ hand, menu }) => {
                cancelAnimationFrame(raf);
                raf = 0;
                selectedMap =
                  menu === "all" || menu === "teleport-weapon" ? 3 : 1;
                s = E.campaign(selectedMap + 1, {
                  equippedCharacterId: "gun",
                  matchSeed: 17,
                });
                s.skills =
                  menu === "all" || menu === "weapon-skill"
                    ? { S_BARRIER: 1 }
                    : {};
                encounter = null;
                demo = null;
                controlLayout = hand;
                applyControlLayout();
                renderer.resetCamera();
                hud();
                draw();
                const app = document.getElementById("app"),
                  rect = (id) =>
                    ArcViewport.rect(document.querySelector(id), app);
                const selectors = [
                  "#stick",
                  "#aimStick",
                  "#fire",
                  "#moveBudget",
                  "#angleText",
                  "#shotBudget",
                  "#powerHUD",
                  "#weaponToggle",
                ];
                if (!document.getElementById("warpToggle").hidden)
                  selectors.push("#warpToggle");
                if (!document.getElementById("skills").hidden)
                  selectors.push("#skillToggle");
                return {
                  logical: { width: app.clientWidth, height: app.clientHeight },
                  dock: rect("#battleControls"),
                  items: selectors.map((selector) => ({
                    selector,
                    ...rect(selector),
                  })),
                  track: document.querySelector(".power-track").offsetHeight,
                  view: { ...renderer.view },
                  main: ["stick", "aimStick", "fire"].map((id) => ({
                    id,
                    width: document.getElementById(id).offsetWidth,
                    height: document.getElementById(id).offsetHeight,
                  })),
                };
              },
              { hand, menu },
            );
            const label = JSON.stringify({
              width,
              height,
              mode: mode.name,
              hand,
              menu,
            });
            ok(
              row.items.every(
                (r) =>
                  r.left >= mode.safe.left - 0.5 &&
                  r.right <= row.logical.width - mode.safe.right + 0.5 &&
                  r.bottom <= row.logical.height - mode.safe.bottom + 0.5,
              ),
              "buttons, menus, charge and numeric labels stay inside safe edges " +
                label +
                " " +
                JSON.stringify(row.items),
            );
            ok(
              row.dock.width <= 820.5,
              "the dock has a fixed maximum width " + label,
            );
            ok(
              row.main.every((r) => r.width === 68 && r.height === 68),
              "main buttons keep their approved size " + label,
            );
            ok(
              row.items
                .filter((r) =>
                  ["#weaponToggle", "#skillToggle"].includes(r.selector),
                )
                .every((r) => r.width <= 212.5),
              "available menus never stretch across absent slots " + label,
            );
            ok(
              row.track === 26,
              "native charge track keeps its height " + label,
            );
            ok(
              Number.isFinite(row.view.scale) && row.view.scale > 0,
              "battlefield retains a valid camera " + label,
            );
            rows.push({
              device: [width, height],
              mode: mode.name,
              hand,
              menu,
              safe: mode.safe,
              ...row,
            });
            if (
              width === 440 &&
              hand === "left" &&
              (menu === "weapon" || menu === "all") &&
              (mode.name === "portrait" || mode.name === "landscape")
            )
              await p.screenshot({
                path: path.join(out, "dock-" + mode.name + "-" + menu + ".png"),
              });
          }
      }
      ok(
        (await p.evaluate("JSON.stringify(save.data)")) === saved,
        "layout checks preserve native save " + width,
      );
      await context.close();
    }
    ok(!errors.length, errors.join("\n"));
    fs.writeFileSync(
      path.join(out, "IPHONE_DOCK_BROWSER.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          rows,
          errors,
          scope:
            "Real production CSS and viewport transforms in Chromium with controlled iPhone safe-area metrics; four sizes, four orientations, both hands, four inventory states. Physical Safari/iPhone remains unverified.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      "PASS iPhone dock",
      checks,
      "checks",
      rows.length,
      "layout conditions",
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
