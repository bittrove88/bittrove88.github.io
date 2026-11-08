"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  http = require("http");
const Save = require("../dist/save.js"),
  Run = require("../dist/campaign-run.js"),
  Crew = require("../dist/crew.js"),
  Weapons = require("../dist/weapons.js"),
  Skills = require("../dist/skills.js");
const root = path.resolve(__dirname, "../../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-battle-ui";
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [] };
const server = http.createServer((req, res) => {
  let name = new URL(req.url, "http://local").pathname;
  if (name.endsWith("/")) name += "index.html";
  const f = path.resolve(root, "." + name);
  if (!f.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpeg": "image/jpeg",
        ".m4a": "audio/mp4",
      }[path.extname(f)] || "text/html",
    );
    res.end(b);
  });
});
function fixture(stage = 9, lang = "ja", guidesSeen = true) {
  const d = Save.decode(
    JSON.stringify({
      schemaVersion: 8,
      campaignResetVersion: 2,
      cleared: 99,
      journeyStarted: true,
      difficultyConfirmed: true,
      onboarding: { step: "done" },
      journal: { introSeen: true, moviesSeen: ["prologue", "30", "60"] },
      unlockedCharacterIds: Crew.ids,
      joinedCharacterIds: Crew.ids,
      equippedCharacterId: "gun",
      preferences: { language: lang, controls: "left" },
    }),
  );
  d.pendingRecruit = null;
  d.seenPreviewIds = Save.previewIds.filter(
    (id) => guidesSeen || !id.startsWith("v7:"),
  );
  d.chapterRun = Run.checkpoint(
    stage,
    {
      weapons: Object.fromEntries(Weapons.activeIds.map((id) => [id, 6])),
      skills: Object.fromEntries(Skills.activeIds.map((id) => [id, 6])),
    },
    [],
    "ui-browser",
    424242,
  );
  d.campaignInventory = JSON.parse(JSON.stringify(d.chapterRun.inventory));
  return d;
}
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const b = await chromium.launch({
    executablePath: process.env.ARCLINE_CHROMIUM || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const url =
    "http://127.0.0.1:" + server.address().port + "/ARCLINE/game/dist/";
  async function page(size, data) {
    const p = await b.newPage({
      viewport: size,
      hasTouch: true,
      isMobile: true,
      reducedMotion: "reduce",
    });
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.addInitScript((data) => {
      if (!localStorage.getItem("arcline-campaign-v1"))
        localStorage.setItem("arcline-campaign-v1", JSON.stringify(data));
      localStorage.setItem("arcline-install-guide-v1", '{"state":"closed"}');
    }, data);
    await p.goto(url);
    await p.waitForFunction(
      'save.ready&&!document.getElementById("play").disabled',
    );
    assert.equal(
      await p.evaluate("s"),
      null,
      "native start still requires a user action",
    );
    await p.locator("#play").click();
    await p.waitForFunction("!!s");
    return p;
  }
  try {
    for (const lang of ["ja", "en"])
      for (const size of [
        { width: 844, height: 390 },
        { width: 568, height: 320 },
        { width: 390, height: 844 },
        { width: 1280, height: 720 },
      ]) {
        const p = await page(size, fixture(9, lang));
        await p.waitForFunction("canAim()");
        const tag = lang + "-" + size.width;
        const dock = await p.evaluate(() => {
          const $ = (id) => document.getElementById(id),
            font = (e) => ({
              size: getComputedStyle(e).fontSize,
              line: getComputedStyle(e).lineHeight,
            });
          return {
            main: ["stick", "aimStick", "fire"].map((id) => [
              $(id).offsetWidth,
              $(id).offsetHeight,
            ]),
            menus: ["warpToggle", "weaponToggle", "skillToggle"].map((id) => [
              $(id).offsetWidth,
              $(id).offsetHeight,
            ]),
            charge: document.querySelector("#powerHUD .power-track")
              .offsetHeight,
          };
        });
        assert.deepEqual(dock.main, [
          [68, 68],
          [68, 68],
          [68, 68],
        ]);
        assert.equal(dock.menus[1][0], dock.menus[2][0]);
        assert.equal(dock.charge, 26);
        await p.evaluate(() => {
          s.units[0].hp = s.units[0].maxHp * 0.6;
          s.specialAmmo = 2;
          s.shotCount = 3;
          hud();
        });
        const before = await p.evaluate(
          "({ratio:s.units[0].hp/s.units[0].maxHp,special:s.specialAmmo,actions:s.shotCount})",
        );
        await p.locator("#characterChange").click();
        assert.equal(await p.locator("[data-quick-machine]").count(), 10);
        assert.equal(
          await p
            .locator("#battleMachineChoices")
            .evaluate(
              (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
            ),
          5,
        );
        await p.locator('[data-quick-machine="yui"]').click();
        const after = await p.evaluate(
          "({ratio:s.units[0].hp/s.units[0].maxHp,special:s.specialAmmo,actions:s.shotCount})",
        );
        assert.ok(Math.abs(after.ratio - before.ratio) < 0.00001);
        assert.equal(after.special, before.special);
        assert.equal(after.actions, before.actions);
        await p.locator("#weaponToggle").click();
        const ids = await p
          .locator("[data-choose-weapon]")
          .evaluateAll((es) => es.map((e) => e.dataset.chooseWeapon));
        assert.equal(ids.length, 14);
        assert.equal(ids[0], "W01");
        assert.deepEqual(ids.slice(2), [
          "W14",
          "W02",
          "W12",
          "W19",
          "W22",
          "W09",
          "W10",
          "W11",
          "W21",
          "W07",
          "W16",
          "W23",
        ]);
        const weaponFont = await p
          .locator(".weapon-choice-copy small")
          .first()
          .evaluate((e) => ({
            size: getComputedStyle(e).fontSize,
            line: getComputedStyle(e).lineHeight,
          }));
        const bottomFont = await p
          .locator(".weapon-picker-note")
          .evaluate((e) => ({
            size: getComputedStyle(e).fontSize,
            line: getComputedStyle(e).lineHeight,
          }));
        if (size.width === 844)
          await p.screenshot({
            path: path.join(out, "ui-weapons-" + tag + ".png"),
          });
        await p.locator("#closeWeapons").click();
        await p.locator("#skillToggle").click();
        const skillIds = await p
          .locator("[data-skill]")
          .evaluateAll((es) => es.map((e) => e.dataset.skill));
        assert.deepEqual(skillIds, [
          "S_FULL_REPAIR",
          "S_INVINCIBLE",
          "S_ALL_ATTACK",
          "S_REPAIR",
          "S_BARRIER",
          "S_SPECIAL_REFILL",
          "S_POWER_UP_I",
          "S_POWER_UP_II",
          "S_ENEMY_WEAKEN",
          "S_CHARGE_SLOW_I",
          "S_CHARGE_SLOW_II",
          "S_FREE_MOVE",
          "S_ENEMY_SKIP",
          "S_LOW_GRAVITY",
          "S_HIGH_GRAVITY",
        ]);
        assert.deepEqual(
          await p.locator("#skillChoices h3").allTextContents(),
          lang === "en" ? ["Rare skills", "Skills"] : ["レアスキル", "スキル"],
        );
        assert.deepEqual(
          await p
            .locator(".skill-note")
            .first()
            .evaluate((e) => ({
              size: getComputedStyle(e).fontSize,
              line: getComputedStyle(e).lineHeight,
            })),
          weaponFont,
        );
        await p.locator('[data-skill="S_POWER_UP_I"]').scrollIntoViewIfNeeded();
        await p.locator('[data-skill="S_POWER_UP_I"]').click();
        assert.equal(await p.evaluate("s.skills.S_POWER_UP_I"), 6);
        assert.deepEqual(
          await p.locator("#battleSkillDescription").evaluate((e) => ({
            size: getComputedStyle(e).fontSize,
            line: getComputedStyle(e).lineHeight,
          })),
          bottomFont,
        );
        if (size.width === 844)
          await p.screenshot({
            path: path.join(out, "ui-skills-" + tag + ".png"),
          });
        await p.locator("#battleSkillUse").click();
        assert.equal(await p.evaluate("s.skills.S_POWER_UP_I"), 5);
        assert.equal(await p.evaluate("s.skillEffects.power.factor"), 1.2);
        assert.equal(await p.evaluate("s.shotCount"), 3);
        assert.equal(
          await p.locator(".fire-wrap>.battle-label").innerText(),
          lang === "en" ? "Skill" : "スキル",
        );
        await p.locator("#skillToggle").click();
        await p.locator('[data-skill="S_BARRIER"]').click();
        assert.equal(
          await p.locator("#battleSkillUse").isDisabled(),
          true,
          "same-turn second use is blocked while inspecting cards",
        );
        await p.locator("#closeSkills").click();
        await p.evaluate(() => {
          s.skills = {
            S_HIGH_GRAVITY: 2,
            S_POWER_UP_II: 1,
            S_REPAIR: 0,
            S_INVINCIBLE: 1,
          };
          s.weaponStock = { W23: 1, W19: 0, W02: 1 };
          hud();
        });
        await p.locator("#skillToggle").click();
        assert.deepEqual(
          await p
            .locator("[data-skill]")
            .evaluateAll((es) => es.map((e) => e.dataset.skill)),
          ["S_INVINCIBLE", "S_POWER_UP_II", "S_HIGH_GRAVITY"],
        );
        await p.locator("#closeSkills").click();
        await p.locator("#weaponToggle").click();
        assert.deepEqual(
          (
            await p
              .locator("[data-choose-weapon]")
              .evaluateAll((es) => es.map((e) => e.dataset.chooseWeapon))
          ).slice(2),
          ["W02", "W23"],
        );
        await p.locator("#closeWeapons").click();
        await p.evaluate(() =>
          ArcI18n.setLanguage(ArcI18n.language === "en" ? "ja" : "en"),
        );
        await p.evaluate(() =>
          ArcI18n.setLanguage(ArcI18n.language === "en" ? "ja" : "en"),
        );
        await p.locator("#pause").click();
        await p.locator("#pauseMachineChange").click();
        assert.equal(await p.locator("#battleMachinePicker").isVisible(), true);
        await p.locator("#closeBattleMachines").click();
        assert.equal(await p.locator("#overlay").isVisible(), true);
        await p.locator("#resume").click();
        if (size.width === 844)
          await p.screenshot({
            path: path.join(out, "ui-battle-" + tag + ".png"),
          });
        report.checks.push({
          kind: "layout-selection",
          lang,
          size,
          dock,
          carryOver: after,
        });
        await p.close();
      }
    for (const stage of [2, 9]) {
      const p = await page(
        { width: 568, height: 320 },
        fixture(stage, "ja", false),
      );
      await p.evaluate(() => {
        if (demo) endDemo();
        if (specialLesson.active)
          document.querySelector("#specialLesson button")?.click();
      });
      await p.waitForFunction('!document.getElementById("battleCoach").hidden');
      const key = stage === 2 ? "v7:touch-controls" : "v7:character-change";
      assert.ok(
        await p.evaluate((key) => save.data.seenPreviewIds.includes(key), key),
      );
      assert.equal(await p.evaluate("canAim()"), false);
      await p.keyboard.press("Escape");
      assert.equal(await p.locator("#battleCoach").isVisible(), false);
      await p.evaluate(() => save.pending);
      await p.reload();
      await p.waitForFunction(
        'save.ready&&!document.getElementById("play").disabled',
      );
      assert.ok(
        await p.evaluate((key) => save.data.seenPreviewIds.includes(key), key),
      );
      await p.locator("#play").click();
      await p.waitForFunction("!!s");
      await p.waitForTimeout(500);
      assert.equal(await p.locator("#battleCoach").isVisible(), false);
      report.checks.push({ kind: "persistent-guide", stage });
      await p.close();
    }
    // Repair remains a separate confirmation and consumes exactly one action.
    const repairPage = await page({ width: 844, height: 390 }, fixture());
    await repairPage.waitForFunction("canAim()");
    await repairPage.evaluate(() => {
      s.units[0].hp = s.units[0].maxHp * 0.5;
      cancelAnimationFrame(raf);
      raf = 0;
      hud();
    });
    const repairBefore = await repairPage.evaluate(
      "({hp:s.units[0].hp,actions:s.shotCount,stock:s.skills.S_REPAIR})",
    );
    await repairPage.locator("#skillToggle").click();
    await repairPage.locator('[data-skill="S_REPAIR"]').click();
    assert.equal(
      await repairPage.evaluate("s.skills.S_REPAIR"),
      repairBefore.stock,
    );
    await repairPage.locator("#battleSkillUse").click();
    assert.equal(await repairPage.locator("#repairConfirm").isVisible(), true);
    assert.equal(
      await repairPage.locator("#battleSkillInspector").isVisible(),
      false,
    );
    await repairPage.locator("#repairCommit").click();
    assert.equal(
      await repairPage.evaluate("s.skills.S_REPAIR"),
      repairBefore.stock - 1,
    );
    assert.equal(
      await repairPage.evaluate("s.shotCount"),
      repairBefore.actions + 1,
    );
    assert.ok(
      await repairPage.evaluate((old) => s.units[0].hp > old, repairBefore.hp),
    );
    report.checks.push({
      kind: "repair-confirmation",
      stock: "one",
      actions: "one",
      healing: true,
    });
    await repairPage.close();

    // Real touch input: 4:1 boundary, exactly-two-finger pinch and post-pinch suppression.
    const p = await page({ width: 844, height: 390 }, fixture());
    await p.waitForFunction("canAim()");
    const cdp = await p.context().newCDPSession(p);
    const touch = (type, points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map(([id, x, y]) => ({ id, x, y })),
      });
    const angle = await p.evaluate("s.angle");
    await touch("touchStart", [[1, 660, 150]]);
    await touch("touchMove", [[1, 660, 180]]);
    await touch("touchEnd", []);
    assert.notEqual(await p.evaluate("s.angle"), angle);
    assert.ok(
      await p.evaluate(() => {
        const actual = Number(
          document
            .querySelector("#aimStickKnob [data-aim-barrel]")
            .getAttribute("transform")
            .match(/rotate\(([-\d.]+)/)[1],
        );
        return (
          Math.abs(actual - (G.muzzle(s, 0, s.angle).theta * 180) / Math.PI) <
          0.00001
        );
      }),
      "aim graphic follows the actual muzzle",
    );
    const adjusted = await p.evaluate("s.angle");
    await touch("touchStart", [[1, 700, 150]]);
    await touch("touchMove", [[1, 700, 180]]);
    await touch("touchEnd", []);
    assert.equal(await p.evaluate("s.angle"), adjusted);
    assert.equal(await p.locator("#quickViewReset").isVisible(), true);
    await p.locator("#quickViewReset").click();
    const scale = await p.evaluate("renderer.view.scale");
    await touch("touchStart", [
      [1, 340, 150],
      [2, 460, 150],
    ]);
    await touch("touchMove", [
      [1, 300, 150],
      [2, 500, 150],
    ]);
    await p.waitForTimeout(80);
    assert.ok(
      await p.evaluate((old) => renderer.view.scale > old * 1.2, scale),
    );
    assert.equal(
      await p.evaluate("visualViewport.scale"),
      1,
      "pinch does not zoom the page UI",
    );
    assert.equal(await p.locator("#fire").evaluate((e) => e.offsetWidth), 68);
    const afterPinch = await p.evaluate("s.angle");
    await touch("touchEnd", [[1, 300, 150]]);
    await touch("touchMove", [[1, 300, 190]]);
    await touch("touchEnd", []);
    assert.equal(await p.evaluate("s.angle"), afterPinch);
    const held = await p.evaluate("renderer.view.scale");
    await touch("touchStart", [
      [1, 300, 150],
      [2, 400, 150],
      [3, 500, 150],
    ]);
    await touch("touchMove", [
      [1, 260, 150],
      [2, 400, 150],
      [3, 540, 150],
    ]);
    await touch("touchEnd", []);
    assert.equal(await p.evaluate("renderer.view.scale"), held);
    await p.locator("#quickViewReset").click();
    await p.locator("#mapCameraToggle").click();
    const mapScale = await p.evaluate("mapCamera.options.cameraView.scale");
    await touch("touchStart", [
      [1, 340, 150],
      [2, 460, 150],
    ]);
    await touch("touchMove", [
      [1, 300, 150],
      [2, 500, 150],
    ]);
    await touch("touchEnd", []);
    assert.ok(
      await p.evaluate(
        (old) => mapCamera.options.cameraView.scale > old * 1.2,
        mapScale,
      ),
    );
    await p.locator("#mapCameraClose").click();
    report.checks.push({
      kind: "full-map-pinch",
      zoom: "native map view increases with two fingers",
    });

    // The original charge control still charges and cancels without spending an action.
    const fire = await p.locator("#fire").boundingBox();
    await p.mouse.move(fire.x + fire.width / 2, fire.y + fire.height / 2);
    await p.mouse.down();
    await p.waitForFunction("!!charge");
    await p.waitForTimeout(250);
    assert.ok(await p.evaluate("s.power>20"));
    const count = await p.evaluate("s.shotCount");
    await p.mouse.move(fire.x - 90, fire.y - 30);
    await p.mouse.up();
    await p.waitForTimeout(100);
    assert.equal(await p.evaluate("charge"), null);
    assert.equal(await p.evaluate("s.shotCount"), count);
    // Portrait uses the same logical gesture regions; only the client transform changes.
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForFunction("viewport.state.rotation===90&&canAim()");
    const rotatedTouch = async (type, points) => {
      const clients = await p.evaluate((points) => {
        const app = document.getElementById("app"),
          r = app.getBoundingClientRect();
        return points.map(([id, x, y]) => [
          id,
          r.right - (y * r.width) / app.clientHeight,
          r.top + (x * r.height) / app.clientWidth,
        ]);
      }, points);
      await touch(type, clients);
    };
    const rotatedScale = await p.evaluate("renderer.view.scale");
    await rotatedTouch("touchStart", [
      [1, 340, 150],
      [2, 460, 150],
    ]);
    await rotatedTouch("touchMove", [
      [1, 300, 150],
      [2, 500, 150],
    ]);
    await rotatedTouch("touchEnd", []);
    assert.ok(
      await p.evaluate((old) => renderer.view.scale > old * 1.2, rotatedScale),
    );
    assert.equal(await p.evaluate("visualViewport.scale"), 1);
    await p.locator("#mapCameraToggle").click();
    const rotatedMapScale = await p.evaluate(
      "mapCamera.options.cameraView.scale",
    );
    await rotatedTouch("touchStart", [
      [1, 340, 150],
      [2, 460, 150],
    ]);
    await rotatedTouch("touchMove", [
      [1, 300, 150],
      [2, 500, 150],
    ]);
    await rotatedTouch("touchEnd", []);
    assert.ok(
      await p.evaluate(
        (old) => mapCamera.options.cameraView.scale > old * 1.2,
        rotatedMapScale,
      ),
    );
    await p.locator("#mapCameraClose").click();
    report.checks.push({
      kind: "portrait-pinch",
      battle: true,
      fullMap: true,
      pageScale: 1,
    });
    report.checks.push({
      kind: "touch-and-charge",
      boundary: "80/20",
      pinch: "exactly2",
      remainingFinger: "suppressed",
      threeFingers: "no zoom",
      charge: "hold and cancel preserved",
    });
    await p.close();
    assert.deepEqual(report.errors, []);
    report.status = "PASS";
    console.log("PASS battle UI browser", report.checks.length, "scenarios");
  } finally {
    await b.close();
    server.close();
    fs.writeFileSync(
      path.join(out, "BATTLE_UI_BROWSER.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
})().catch((e) => {
  report.status = "FAIL";
  report.failure = String(e.stack);
  fs.writeFileSync(
    path.join(out, "BATTLE_UI_BROWSER.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.error(e);
  server.close();
  process.exitCode = 1;
});
