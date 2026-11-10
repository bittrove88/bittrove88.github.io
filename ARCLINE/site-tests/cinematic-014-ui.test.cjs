"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-cinematic-014";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const ok = (v, m) => {
  checks++;
  assert(v, m);
};
const server = require("./site-server.cjs")();
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port,
    b = await chromium.launch({
      executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    }),
    errors = [],
    bad = [],
    views = [];
  try {
    for (const [width, height] of [
      [360, 780],
      [390, 844],
      [844, 390],
      [1440, 900],
    ]) {
      const c = await b.newContext({
          viewport: { width, height },
          hasTouch: width < 1000,
        }),
        p = await c.newPage();
      await c.addInitScript(() => {
        if (!localStorage.getItem("arcline-campaign-v1"))
          localStorage.setItem(
            "arcline-campaign-v1",
            JSON.stringify({
              schemaVersion: 8,
              campaignResetVersion: 2,
              difficultyConfirmed: true,
              journeyStarted: true,
              cleared: 80,
              equippedCharacterId: "gun",
              unlockedCharacterIds: [
                "gun",
                "ban",
                "hibari",
                "hana",
                "rin",
                "mogu",
                "koro",
                "sora",
                "rico",
                "yui",
              ],
              journal: { narrativeVersion: "0.13.0", moviesSeen: ["prologue"] },
            }),
          );
      });
      p.on("pageerror", (e) => errors.push(e.stack));
      p.on("response", (r) => {
        if (r.status() >= 400 && !r.url().includes("favicon"))
          bad.push(r.url());
      });
      await p.goto(base + "/ARCLINE/characters/");
      await p.waitForFunction(() => !!globalThis.ArcSite);
      ok(
        p.url().endsWith("/ARCLINE/#machines"),
        "old machine route redirects to integrated section " + width,
      );
      ok(
        (await p.locator("[data-machine]").count()) === 10,
        "integrated showcase has ten machines " + width,
      );
      ok(
        await p.evaluate(() => !globalThis.ArcEngine && !globalThis.ArcSave),
        "public showcase does not boot the game or save manager",
      );
      ok(
        await p.evaluate(
          () =>
            JSON.parse(localStorage.getItem("arcline-campaign-v1"))
              .equippedCharacterId === "gun",
        ),
        "inspection preserves current formation",
      );
      ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "integrated showcase width " + width,
      );
      await p.goto(base + "/ARCLINE/cinematics/");
      await p.selectOption("#movie", "all");
      await p.waitForFunction(
        'ArcCinematicReview.state.player.status==="ready"',
      );
      ok(
        (await p.locator("#shotGrid button[data-shot]").count()) === 23,
        "all23 review controls",
      );
      await p.locator('#shotGrid button[data-shot="14"]').click();
      await p.waitForFunction(
        'ArcCinematicReview.state.player.status==="ready"',
      );
      ok(
        await p.evaluate('ArcCinematicReview.state.shot==="E01-03"'),
        "review selects exact new replacement",
      );
      await p.locator("#pause").click();
      const age = await p.evaluate("ArcCinematicReview.state.age");
      await p.waitForTimeout(120);
      ok(
        (await p.evaluate("ArcCinematicReview.state.age")) === age,
        "review pauses exact camera clock",
      );
      await p.locator("#lang").click();
      ok(
        (await p.locator("#title").innerText()).includes("sender"),
        "review English source",
      );
      ok(
        await p.evaluate("document.documentElement.scrollWidth<=innerWidth"),
        "review width " + width,
      );
      views.push({
        width,
        height,
        integratedMachines: 10,
        compatibilityRedirect: true,
        reviewShots: 23,
        formationPreserved: true,
      });
      await c.close();
    }
    // The former downloadable viewer is retired too; keep a visible destination if refresh is disabled.
    const retired = fs.readFileSync(
      path.join(root, "ARCLINE/characters/ARCLINE_Characters_Preview.html"),
      "utf8",
    );
    ok(
      retired.includes(
        "0;url=https://bittrove88.github.io/ARCLINE/#machines",
      ) &&
        retired.includes(
          'href="https://bittrove88.github.io/ARCLINE/#machines"',
        ),
      "retired standalone URL points to the integrated section with a fallback link",
    );
    ok(
      !/<script\b/.test(retired),
      "retired viewer has no game or save initialization",
    );
    ok(!errors.length, errors.join("\n"));
    ok(!bad.length, bad.join("\n"));
    fs.writeFileSync(
      path.join(out, "PUBLIC_UI.json"),
      JSON.stringify(
        {
          status: "PASS",
          checks,
          viewports: views,
          errors,
          badRequests: bad,
          scope:
            "Legacy machine route redirects to ten integrated profiles at four sizes, no save initialization or formation edits; retired standalone destination; unchanged 23-shot cinematic review, pause and locale.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({ status: "PASS", checks, views: views.length }),
    );
  } finally {
    await b.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
