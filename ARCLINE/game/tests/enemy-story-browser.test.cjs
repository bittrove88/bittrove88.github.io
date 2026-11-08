const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const app = path.resolve(__dirname, "../.."),
  root = path.dirname(app),
  { chromium } = require("playwright"),
  Save = require("../dist/save.js"),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-story-0293";
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((q, r) => {
  let f = path.resolve(root, "." + new URL(q.url, "http://local").pathname);
  if (!f.startsWith(root + "/")) return r.writeHead(403).end();
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f += "/index.html";
  fs.readFile(f, (e, b) => {
    if (e) return r.writeHead(404).end();
    r.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".m4a": "audio/mp4",
      }[path.extname(f)] || "text/html",
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
    rows = [],
    errors = [];
  try {
    for (const [w, h] of [
      [844, 390],
      [568, 240],
      [393, 852],
    ])
      for (const lang of ["ja", "en"]) {
        const c = await browser.newContext({
          viewport: { width: w, height: h },
          hasTouch: true,
          reducedMotion: "reduce",
        });
        await c.addInitScript(
          (data) => {
            localStorage.setItem("arcline-campaign-v1", JSON.stringify(data));
            localStorage.setItem(
              "arcline-install-guide-v1",
              '{"state":"closed"}',
            );
          },
          {
            schemaVersion: 8,
            campaignResetVersion: 2,
            cleared: 99,
            difficulty: "normal",
            difficultyConfirmed: true,
            journeyStarted: true,
            onboarding: { step: "done" },
            unlockedCharacterIds: Save.characterIds,
            joinedCharacterIds: Save.characterIds,
            seenPreviewIds: Save.previewIds,
            preferences: { language: lang },
            journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
          },
        );
        const p = await c.newPage();
        p.on("pageerror", (e) => errors.push(String(e)));
        await p.goto(
          "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/",
        );
        await p.waitForFunction(
          'save.ready&&!document.getElementById("play").disabled',
        );
        for (const stage of [41, 71]) {
          const row = await p.evaluate((stage) => {
            lobby();
            selectedMap = stage - 1;
            start({ skipStory: true });
            endDemo();
            cancelAnimationFrame(raf);
            raf = 0;
            encounter = { age: 0.5, duration: 2.8, boss: false };
            paintEncounter();
            hud();
            draw();
            const e = $("encounterFeature"),
              b = $("encounterBanner").getBoundingClientRect();
            return {
              stage,
              text: e.textContent,
              expected: ArcStory.entry(stage, ArcI18n.language).feature,
              visible: !$("encounterBanner").hidden,
              bounds: { x: b.x, y: b.y, right: b.right, bottom: b.bottom },
              width: innerWidth,
              height: innerHeight,
            };
          }, stage);
          assert.equal(row.text, row.expected);
          assert(
            row.visible &&
              row.bounds.x >= -1 &&
              row.bounds.y >= -1 &&
              row.bounds.right <= w + 1 &&
              row.bounds.bottom <= h + 1,
            JSON.stringify(row),
          );
          await p.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          await p.screenshot({
            path: path.join(out, `entry${stage}-${w}-${lang}.png`),
          });
          rows.push({ ...row, w, h, lang, kind: "entry" });
          if (stage === 41) {
            await p.evaluate(() => {
              s.result = "win";
              s.phase = "over";
              finishResult();
              ArcStoryView.update(10);
              ArcStoryView.finishResultText();
            });
            await p.waitForFunction("!resultSaving");
            const clear = await p.evaluate(() => ({
              text: $("chapterMessage").querySelector(".story-sr").textContent,
              expected: ArcStory.result(41, ArcI18n.language).aftermath,
              visible: !$("overlay").hidden && !$("chapterMessage").hidden,
              scrollable:
                $("chapterMessage").scrollHeight >=
                $("chapterMessage").clientHeight,
            }));
            assert.equal(clear.text, clear.expected);
            assert(clear.visible);
            await p.waitForTimeout(320);
            await p.screenshot({
              path: path.join(out, `clear41-${w}-${lang}.png`),
            });
            rows.push({ ...clear, w, h, lang, stage: 41, kind: "clear" });
          }
        }
        await c.close();
      }
    assert.equal(errors.length, 0, errors.join("\n"));
    fs.writeFileSync(
      path.join(out, "STORY_LAYOUT.json"),
      JSON.stringify(
        {
          status: "PASS",
          rows,
          errors,
          scope:
            "Real runtime text bindings in entry and clear-layout fixtures, not native victory proof. Three viewport sizes, JA/EN. No physical device claim.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log("PASS story layout", rows.length);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
