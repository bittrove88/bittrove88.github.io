"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."),
  release = require("../game/runtime.json"),
  manifest = require("../site/showcase-captures.json");
const server = require("./site-server.cjs")(),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-service-site";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const ok = (value, message) => {
    checks++;
    assert(value, message);
  },
  hash = (file) =>
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, file)))
      .digest("hex");
const allMachines = [
  "gun",
  "hana",
  "sora",
  "rico",
  "rin",
  "ban",
  "hibari",
  "mogu",
  "koro",
  "yui",
];
ok(
  manifest.version === release.version,
  "footage records the current game version",
);
ok(manifest.captures.length === 14, "10 specials and four tactical examples");
for (const [file, expected] of Object.entries(manifest.sourceHashes))
  ok(hash(file) === expected, "native capture source unchanged: " + file);
for (const row of manifest.captures) {
  ok(hash("site/" + row.file) === row.sha256, "video bytes: " + row.id);
  ok(
    hash("site/" + row.poster) === row.posterSha256,
    "poster bytes: " + row.id,
  );
  ok(
    row.damage.every(Number.isFinite) && row.duration > 2,
    "native attack evidence: " + row.id,
  );
}
for (const row of manifest.artwork) {
  ok(hash(row.source) === row.sourceSha256, "approved original: " + row.id);
  ok(
    hash("site/" + row.file) === row.sha256,
    "optimized original artwork: " + row.id,
  );
}
const warning = manifest.captures.find((row) => row.id === "warning").proof;
ok(
  warning.valid &&
    warning.damageWithoutMove > 0 &&
    warning.damageAfterMove === 0 &&
    warning.sameAngle &&
    warning.samePower &&
    warning.walk <= 140,
  "real frozen-warning avoidance, unchanged enemy aim and legal movement",
);
const captures = require("../site/gameplay-captures.json");
ok(
  captures.implementation === release.version,
  "current production UI screenshots",
);
for (const [file, expected] of Object.entries(captures.sourceHashes))
  ok(hash(file) === expected, "current world image source: " + file);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|href|poster|data-src)="([^"]+)"/g)) {
  const url = new URL(match[1], "http://localhost/ARCLINE/");
  if (url.origin !== "http://localhost" || url.hash) continue;
  let file = path.join(root, "..", decodeURIComponent(url.pathname));
  if (url.pathname.endsWith("/")) file = path.join(file, "index.html");
  ok(fs.existsSync(file), "local reference exists: " + match[1]);
}
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
      executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    }),
    rows = [],
    errors = [],
    bad = [];
  try {
    for (const [width, height] of [
      [360, 780],
      [390, 844],
      [844, 390],
      [768, 1024],
      [1440, 1000],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        hasTouch: width < 1000,
      });
      await context.addInitScript(() => {
        localStorage.setItem("arcline-campaign-v1", "site-showcase-sentinel");
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("response", (r) => {
        if (r.status() >= 400) bad.push({ status: r.status(), url: r.url() });
      });
      await page.goto(base + "/ARCLINE/");
      await page.waitForFunction(() => !!globalThis.ArcSite);
      ok(
        (await page.locator("h1").count()) === 1,
        "one brand heading " + width,
      );
      ok(
        (await page.locator("h1").innerText()).replace(/\s/g, "") ===
          "読み切れ。撃ち抜け。",
        "approved work tagline " + width,
      );
      ok(
        await page.evaluate(() => !globalThis.ArcEngine),
        "landing works without battle initialization " + width,
      );
      ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "fits viewport " + width,
      );
      const order = await page
        .locator("main>section")
        .evaluateAll((items) => items.map((item) => item.id));
      ok(
        JSON.stringify(order.slice(0, 5)) ===
          JSON.stringify(["top", "machines", "play", "journey", "how-to"]),
        "approved information hierarchy " + width,
      );
      ok(
        (await page.locator("[data-machine]").count()) === 10,
        "ten selectable companions " + width,
      );
      // A full-view video must play; a mostly offscreen landscape video may remain paused.
      await page.locator("#heroVideo").scrollIntoViewIfNeeded();
      await page.locator('[data-hero="sora"]').click();
      await page.locator("#heroVideo").scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          heroVideo.readyState >= 2 &&
          !heroVideo.paused &&
          heroVideo.currentTime > 0.05,
      );
      ok(
        await page.evaluate(
          () =>
            ArcSite.hero === "sora" &&
            heroVideo.videoWidth === 1024 &&
            heroVideo.muted &&
            heroVideo.playsInline,
        ),
        "native hero video plays inline " + width,
      );
      await page.locator('[data-video="heroVideo"]').click();
      const stopped = await page
        .locator("#heroVideo")
        .evaluate((video) => video.currentTime);
      await page.waitForTimeout(130);
      ok(
        await page
          .locator("#heroVideo")
          .evaluate(
            (video, t) =>
              video.paused && Math.abs(video.currentTime - t) < 0.02,
            stopped,
          ),
        "explicit pause holds " + width,
      );
      await page.locator("#machines").scrollIntoViewIfNeeded();
      for (const id of width === 1440 ? allMachines : ["hana", "rico"]) {
        await page.locator('[data-machine="' + id + '"]').click();
        await page.locator("#machineVideo").scrollIntoViewIfNeeded();
        await page.waitForFunction(
          () =>
            machineVideo.readyState >= 2 &&
            machineVideo.videoWidth === 1024 &&
            !machineVideo.paused,
        );
        ok(
          await page.evaluate(
            (id) =>
              ArcSite.machine === id &&
              machineVideo.currentSrc.includes("/" + id + ".mp4"),
            id,
          ),
          "selected native special " + id + " " + width,
        );
        ok(
          (await page
            .locator('[data-machine="' + id + '"]')
            .getAttribute("aria-pressed")) === "true",
          "selected machine exposed " + id,
        );
        ok(
          (await page.locator("#machineMotto").innerText()).length > 4 &&
            (await page.locator("#machineSpecial").innerText()).length > 2,
          "complete attack introduction " + id,
        );
        await page.locator("#machineArt").evaluate((img) => img.decode());
        ok(
          await page
            .locator("#machineArt")
            .evaluate((img) => img.naturalWidth > 0),
          "approved artwork decoded " + id,
        );
      }
      ok(
        await page.locator("#heroVideo").evaluate((video) => video.paused),
        "hero stops outside viewport " + width,
      );
      for (const id of width === 390 || width === 1440
        ? ["destruction", "reflection", "teleport", "warning"]
        : ["reflection", "warning"]) {
        await page.locator('[data-feature="' + id + '"]').click();
        await page.locator("#featureVideo").scrollIntoViewIfNeeded();
        await page.waitForFunction(
          () => featureVideo.readyState >= 2 && !featureVideo.paused,
        );
        ok(
          await page.evaluate(
            (id) =>
              ArcSite.feature === id &&
              featureVideo.currentSrc.includes("/" + id + ".mp4"),
            id,
          ),
          "native tactical replay " + id + " " + width,
        );
        ok(
          (await page
            .locator("#featurePanel")
            .getAttribute("aria-labelledby")) ===
            "feature-" + id,
          "tactical panel association " + id,
        );
        ok(
          await page.evaluate(
            () =>
              [...document.querySelectorAll("video")].filter(
                (video) => !video.paused,
              ).length <= 1,
          ),
          "one active video " + id + " " + width,
        );
      }
      await page.locator("#feature-destruction").focus();
      await page.keyboard.press("ArrowRight");
      ok(
        await page.evaluate(() => ArcSite.feature === "reflection"),
        "keyboard tactic tabs " + width,
      );
      for (const id of ["shore", "volcano", "garden", "fortress"]) {
        await page.locator('[data-landscape="' + id + '"]').click();
        await page.locator("#landscapeImage").evaluate((img) => img.decode());
        ok(
          await page
            .locator("#landscapeImage")
            .evaluate(
              (img, id) =>
                img.naturalWidth === 1280 && img.src.includes("gameplay-" + id),
              id,
            ),
          "current world image " + id + " " + width,
        );
      }
      await page.locator(".faq details").nth(1).locator("summary").click();
      ok(
        await page
          .locator(".faq details")
          .nth(1)
          .evaluate((node) => node.open),
        "save information opens " + width,
      );
      if (width <= 800) {
        await page.locator("#menuButton").click();
        await page.keyboard.press("Escape");
        ok(
          (await page.locator("#menuButton").getAttribute("aria-expanded")) ===
            "false",
          "Escape closes mobile navigation " + width,
        );
        await page.locator("#menuButton").click();
      }
      await page.locator("#languageButton").click();
      ok(
        (await page.locator("html").getAttribute("lang")) === "en",
        "English switch " + width,
      );
      ok(
        (await page.locator("h1").innerText()).includes("Read the battle."),
        "English brand line " + width,
      );
      ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "English fits " + width,
      );
      if (width === 390 || width === 1440) {
        await page.locator("#top").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(out, "site-impact-" + width + "-en.png"),
        });
      }
      await page.locator("#languageButton").click();
      if (width <= 800) await page.keyboard.press("Escape");
      ok(
        await page.evaluate(
          () =>
            localStorage.getItem("arcline-campaign-v1") ===
            "site-showcase-sentinel",
        ),
        "campaign save unchanged by browsing " + width,
      );
      const links = await page
        .locator('a[href^="game/dist/"]')
        .evaluateAll((items) => items.map((item) => item.getAttribute("href")));
      ok(
        links.every((link) => link === "game/dist/?v=" + release.version),
        "all game CTAs target current release " + width,
      );
      rows.push({
        width,
        height,
        machines: width === 1440 ? 10 : 2,
        languages: 2,
        tacticalExamples: width === 390 || width === 1440 ? 4 : 2,
      });
      if (width === 390 || width === 1440) {
        await page
          .locator("img")
          .evaluateAll((images) =>
            images.forEach((img) => (img.loading = "eager")),
          );
        await page.waitForFunction(() =>
          [...document.images].every(
            (img) => img.complete && img.naturalWidth > 0,
          ),
        );
        await page.locator("#top").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(out, "site-impact-" + width + "-ja.png"),
          fullPage: true,
        });
      }
      await context.close();
    }
    const reduced = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: "reduce",
      }),
      p = await reduced.newPage(),
      mediaRequests = [];
    p.on("request", (request) => {
      if (request.url().includes(".mp4")) mediaRequests.push(request.url());
    });
    await p.goto(base + "/ARCLINE/");
    await p.waitForFunction(() => !!globalThis.ArcSite);
    await p.locator("#heroVideo").scrollIntoViewIfNeeded();
    ok(
      await p
        .locator("video")
        .evaluateAll((videos) =>
          videos.every((video) => video.paused && !video.getAttribute("src")),
        ),
      "reduced motion uses posters without video downloads",
    );
    ok(
      mediaRequests.length === 0,
      "no unsolicited video download in reduced motion",
    );
    await p.locator('[data-video="heroVideo"]').click();
    await p.waitForFunction(
      () => !heroVideo.paused && heroVideo.currentTime > 0.1,
    );
    ok(true, "reduced motion allows explicit playback");
    await p.locator('[data-video="heroVideo"]').click();
    ok(
      await p.locator("#heroVideo").evaluate((video) => video.paused),
      "explicit video pause",
    );
    await reduced.close();
    // Exercise the actual public entry route without modifying an existing save.
    const launchContext = await browser.newContext({
        viewport: { width: 844, height: 390 },
      }),
      launch = await launchContext.newPage();
    await launch.goto(base + "/ARCLINE/");
    await launch.locator(".header-play").click();
    await launch.waitForFunction(
      () =>
        document.getElementById("play") &&
        !document.getElementById("play").disabled,
    );
    ok(
      await launch.locator("#lobby").isVisible(),
      "landing CTA opens the real game lobby",
    );
    ok(
      await launch.evaluate(
        (version) => ArcRelease.version === version,
        release.version,
      ),
      "game entry loads the current release",
    );
    await launchContext.close();
    ok(errors.length === 0, "no page exceptions " + errors.join(";"));
    ok(bad.length === 0, "no failed resources " + JSON.stringify(bad));
    fs.writeFileSync(
      path.join(out, "SERVICE_SITE.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          rows,
          errors,
          badRequests: bad,
          scope:
            "Current capture/source hashes; five responsive sizes in JA/EN; ten native special videos; tactical examples and frozen-warning proof; native playback, pause, offscreen stopping, one player at a time, reduced motion, storage preservation, actual game entry. Physical devices and human marketing response remain unverified.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log("PASS service site " + checks + " checks");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
