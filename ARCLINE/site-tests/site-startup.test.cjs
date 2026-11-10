"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { chromium } = require("playwright");
const server = require("./site-server.cjs")(),
  release = require("../game/runtime.json");
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-site-startup";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const rows = [],
  ok = (value, message) => {
    checks++;
    assert(value, message);
  };
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const mode of [
      "normal",
      "no-game-metadata",
      "no-site-script",
      "no-javascript",
      "no-storage",
      "failed-video",
    ]) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        javaScriptEnabled: mode !== "no-javascript",
        reducedMotion: mode === "failed-video" ? "no-preference" : "reduce",
      });
      const page = await context.newPage(),
        errors = [],
        requests = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("request", (r) => requests.push(r.url()));
      if (mode === "no-game-metadata")
        await page.route("**/release-info.js*", (r) => r.abort());
      if (mode === "no-site-script")
        await page.route("**/site/site.js*", (r) => r.abort());
      if (mode === "failed-video")
        await page.route(/\/site\/media\/hana\.(mp4|webm)(\?|$)/, (r) =>
          r.abort(),
        );
      if (mode === "no-storage")
        await context.addInitScript(() => {
          for (const key of ["getItem", "setItem", "removeItem"])
            Storage.prototype[key] = () => {
              throw Error("Storage unavailable");
            };
        });
      else
        await context.addInitScript(() => {
          localStorage.setItem(
            "arcline-campaign-v1",
            "site-startup-save-sentinel",
          );
          for (const key of ["getItem", "setItem", "removeItem"]) {
            const native = Storage.prototype[key];
            Storage.prototype[key] = function (name, ...args) {
              if (name === "arcline-campaign-v1")
                throw Error("Site must not access campaign storage");
              return native.call(this, name, ...args);
            };
          }
        });
      await page.goto(base + "/ARCLINE/");
      ok(
        (await page.locator("h1").innerText()).replace(/\s/g, "") ===
          "読み切れ。撃ち抜け。",
        "brand copy readable: " + mode,
      );
      ok(
        (await page
          .locator('a[href="game/dist/?v=' + release.version + '"]')
          .count()) >= 3,
        "real game entry survives: " + mode,
      );
      ok(
        (await page.locator("#heroVideo").getAttribute("poster")) ===
          "site/media/hana.jpg?v=20261110",
        "poster survives: " + mode,
      );
      ok(
        !requests.some((url) =>
          /\/game\/dist\/(enemy-position|boss-actions|enemy-actions|engine)\.js/.test(
            url,
          ),
        ),
        "landing does not depend on battle initialization: " + mode,
      );
      if (!["no-site-script", "no-javascript"].includes(mode)) {
        await page.waitForFunction(() => !!globalThis.ArcSite);
        ok(
          await page.evaluate((v) => ArcSite.version === v, release.version),
          "site metadata or fallback is current: " + mode,
        );
        ok(
          (await page.locator("[data-machine]").count()) === 10,
          "machine selectors initialize: " + mode,
        );
        if (mode === "no-storage") {
          await page.locator("#menuButton").click();
          await page.locator("#languageButton").click();
          ok(
            (await page.locator("html").getAttribute("lang")) === "en",
            "translation survives unavailable storage",
          );
        }
      }
      if (mode === "failed-video") {
        await page.locator("#heroVideo").scrollIntoViewIfNeeded();
        await page
          .locator(".hero-frame .media-error")
          .waitFor({ state: "visible" });
        ok(
          await page.locator(".hero-frame .playback").isDisabled(),
          "failed video offers readable fallback",
        );
        await page.locator('[data-hero="sora"]').click();
        await page.waitForFunction(
          () => heroVideo.readyState >= 2 && !heroVideo.paused,
        );
        ok(true, "selecting another clip recovers playback");
      }
      ok(
        errors.length === 0,
        "no uncaught exceptions: " + mode + " " + errors.join(";"),
      );
      if (mode !== "no-storage" && mode !== "no-javascript")
        ok(
          await page.evaluate(
            () =>
              Object.fromEntries(Object.entries(localStorage))[
                "arcline-campaign-v1"
              ] === "site-startup-save-sentinel",
          ),
          "campaign storage preserved: " + mode,
        );
      rows.push({ mode, errors, requests: requests.length });
      await context.close();
    }
    fs.writeFileSync(
      path.join(out, "SITE_STARTUP.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          rows,
          scope:
            "Six startup/failure modes; no landing dependency on battle modules; real CTA and static content survive; campaign storage access forbidden.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log("PASS site startup " + checks + " checks");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
