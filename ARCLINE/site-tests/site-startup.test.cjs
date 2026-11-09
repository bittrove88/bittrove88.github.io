"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "../..");
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-site-startup";
fs.mkdirSync(out, { recursive: true });
const release = require("../game/runtime.json");
let checks = 0;
const rows = [], errors = [], requests = [];
function ok(value, message) { checks++; assert(value, message); }
const html = fs.readFileSync(path.join(root, "ARCLINE/index.html"), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="game\/dist\/([^"?]+)(?:\?[^" ]*)?"/g)].map(match => match[1]);
for (const [index, script] of scripts.entries()) {
  for (const dependency of release.requires[script] || []) {
    const dependencyIndex = scripts.indexOf(dependency);
    ok(dependencyIndex >= 0 && dependencyIndex < index, script + " loads after its runtime dependency " + dependency);
  }
}
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(root, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    if (error) return res.writeHead(404).end();
    res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" })[path.extname(file)] || "application/octet-stream");
    res.end(body);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const [width, height] of [[360, 780], [390, 844], [844, 390], [768, 1024], [1440, 1000]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, reducedMotion: "reduce" });
      await context.addInitScript(() => localStorage.setItem("arcline-campaign-v1", "site-startup-save-sentinel"));
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(String(error)));
      page.on("response", response => { if (response.status() >= 400) requests.push({ status: response.status(), url: response.url() }); });
      await page.goto("http://127.0.0.1:" + server.address().port + "/ARCLINE/");
      await page.waitForFunction(() => globalThis.ArcSite, null, { timeout: 10000 });
      ok(await page.evaluate("!!globalThis.ArcSite"), "site initializes with its real script dependencies: " + errors.join("; "));
      ok(await page.evaluate("typeof ArcEnemyPosition.capabilities === 'function'"), "enemy positioning dependency is available");
      ok(await page.evaluate("typeof ArcBossActions.attachments === 'function'"), "boss geometry dependency is available");
      ok(await page.evaluate(version => ArcSite.version === version, release.version), "site uses current runtime version");
      ok(await page.evaluate("ArcSite.heroStage === 81 && JSON.stringify(ArcSite.maps) === '[4,31,84,98]'"), "hero and map canvases initialize");
      ok(await page.locator("[data-machine]").count() === 10, "all machine controls initialize");
      for (const id of ["gun", "rico", "hibari", "yui"]) {
        await page.locator('[data-machine="' + id + '"]').click();
        ok(await page.evaluate(id => ArcSite.machine === id, id), "machine selection works: " + id);
      }
      for (const id of ["reflection", "destruction", "teleport"]) {
        await page.locator('[data-feature="' + id + '"]').click();
        ok(await page.evaluate(id => ArcSite.feature === id, id), "live demo selection works: " + id);
      }
      ok(await page.locator(".native-map[data-scene]").count() === 4, "four live map previews remain present");
      ok(await page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "site fits viewport");
      ok(await page.evaluate(() => localStorage.getItem("arcline-campaign-v1") === "site-startup-save-sentinel"), "site startup and browsing preserve existing campaign storage");
      ok(errors.length === 0, "no page exceptions: " + errors.join("; "));
      ok(requests.length === 0, "no failed resources: " + JSON.stringify(requests));
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(out, "site-startup-" + width + ".png") });
      rows.push({ width, height, version: release.version });
      await context.close();
    }
    fs.writeFileSync(path.join(out, "SITE_STARTUP.json"), JSON.stringify({ status: "PASS", checks, rows, errors, requests, scope: "Real script loading and initialization, five viewport sizes, hero/maps/machine/demo controls and unchanged campaign storage. Capture provenance, content updates, physical devices and game balance are separate checks." }, null, 2) + "\n");
    console.log("PASS site startup " + checks + " checks");
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
