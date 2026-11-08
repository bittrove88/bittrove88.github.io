"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  vm = require("node:vm"),
  crypto = require("node:crypto");
const E = require("../dist/engine.js"),
  G = E.geometry,
  P = require("../dist/physics.js"),
  Art = require("../dist/component-art.js"),
  Fix = require("./reported-fixes-preservation.cjs");
const root = path.resolve(__dirname, "../.."),
  base = Fix.manifest.base,
  plain = (x) => JSON.parse(JSON.stringify(x));
let checks = 0;
const ok = (x, m) => {
    checks++;
    assert(x, m);
  },
  eq = (a, b, m) => {
    checks++;
    assert.deepEqual(a, b, m);
  };
const previous = (file) =>
  cp.execFileSync("git", ["show", base + ":ARCLINE/" + file], { cwd: root });
const levels = JSON.parse(previous("design/runtime_campaign_20x5.json")).levels,
  bps = JSON.parse(previous("design/expedition_013/stage_blueprints.json")),
  currentBps = require("../../design/expedition_013/stage_blueprints.json");
eq(
  E.levels.map(Fix.level),
  levels,
  "only the pinned8/12 geometry and four verification inputs change runtime data",
);
eq(currentBps.map(Fix.blueprint), bps, "other98 blueprints remain unchanged");
for (const row of Fix.manifest.stages) {
  const record = require(path.join(root, row.source)),
    n = row.stage;
  eq(
    E.levels[n - 1],
    record.after.runtime,
    "current exact authorized map " + n,
  );
  eq(
    currentBps[n - 1],
    record.after.blueprint,
    "current exact authored blueprint " + n,
  );
  for (const [key, value] of Object.entries(record.before.runtime))
    if (
      ![
        "floors",
        "components",
        "terrainRevision",
        "tacticalGoal",
        "tacticalGoalEn",
      ].includes(key)
    )
      eq(
        E.levels[n - 1][key],
        value,
        "map rules, spawns, stock and HP preserved " + n + "/" + key,
      );
}
const currentPickups =
    require("../../design/pickup_placements.json").placements,
  oldPickups = JSON.parse(previous("design/pickup_placements.json")).placements;
eq(
  Fix.pickups(currentPickups),
  oldPickups,
  "all other capsule records preserved",
);
for (let i = 0; i < 46; i++) {
  const strip = (p) =>
    Object.fromEntries(
      Object.entries(p).filter(([key]) => key !== "verification"),
    );
  eq(
    strip(currentPickups[i]),
    strip(oldPickups[i]),
    "all46 capsule coordinates, IDs, types, quantities and spawn turns preserved",
  );
}
const oldGeometry = { exports: {} };
vm.runInNewContext(previous("game/dist/geometry.js").toString(), {
  module: oldGeometry,
});
const prior = oldGeometry.exports;
for (let n = 1; n <= 99; n++)
  for (const round of [1, 3]) {
    if ([8, 12].includes(n)) continue;
    const a = G.world(E.levels[n - 1], round, 0, { cloudOffset: 80 }),
      b = prior.world(levels[n - 1], round, 0, { cloudOffset: 80 });
    const withoutClouds = (w) => ({
      ...w,
      regions: w.regions.filter((r) => r.kind !== "C"),
    });
    eq(
      plain(withoutClouds(a)),
      plain(withoutClouds(b)),
      "non-cloud collision/force geometry preserved " + n + "/" + round,
    );
  }
let clouds = 0,
  emptySamples = 0,
  filledSamples = 0;
for (const spec of E.levels.slice(0, 99)) {
  const initial = G.world(spec, 1).regions.filter((r) => r.kind === "C"),
    later = G.world(spec, 9, 0, { cloudOffset: 80 }).regions.filter(
      (r) => r.kind === "C",
    );
  eq(
    initial.map((r) => r.clouds),
    later.map((r) => r.clouds),
    "cloud positions stay at the initial world locations " + spec.id,
  );
  for (const r of initial) {
    clouds++;
    eq(
      Art.regionNode(r).motion.clouds,
      r.clouds,
      "drawing receives the physical cloud silhouettes",
    );
    for (let x = r.x1 + 2; x < r.x2; x += 9)
      for (let y = r.y1 + 2; y < r.y2; y += 9) {
        const inside = P.inRegion({ x, y }, r);
        if (inside) filledSamples++;
        else emptySamples++;
        ok(
          inside === G.cloudContains({ x, y }, r),
          "physics uses the visible cloud union",
        );
      }
    ok(
      !P.inRegion({ x: r.x1 - 1, y: (r.y1 + r.y2) / 2 }, r),
      "no cloud contact outside its clipped area",
    );
  }
}
ok(
  clouds > 10 && emptySamples > filledSamples && filledSamples > 100,
  "both visible puffs and formerly invisible rectangular gaps are exercised",
);
const s = E.campaign(21, { matchSeed: 4697 }),
  r = s.world.regions.find((r) => r.kind === "C");
let entered = 0;
for (let angle = 12; angle <= 78; angle += 6)
  for (const power of [40, 60, 80, 100]) {
    const z = E.trajectory(s, 0, angle, power);
    for (const e of z.events.filter((e) => e.type === "cloud")) {
      entered++;
      ok(P.inRegion(e, r), "every real slowing event is inside a drawn cloud");
    }
  }
ok(entered > 0, "actual projectiles still slow inside visible clouds");
const c = r.clouds[0],
  insidePoint = { x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2 };
ok(P.inRegion(insidePoint, r), "an enabled visible puff has contact");
ok(
  !P.inRegion(insidePoint, { ...r, on: false }),
  "disabled clouds have no contact",
);
ok(
  !P.inRegion(insidePoint, { ...r, strength: 0 }),
  "zero-strength hidden clouds have no contact",
);
const roof = E.levels[7].components[0];
eq(
  roof.reflectiveUnderside.map((p) => p[1]),
  [40, 40],
  "stage8 ceiling is horizontal",
);
eq(
  Math.max(...E.levels[7].floors.flat().map((p) => p[1])),
  24,
  "stage8 ridge is lowered",
);
const reflected = E.trajectory(E.campaign(8, { matchSeed: 4697 }), 0, 46, 92);
ok(
  reflected.damage[1] > 0 &&
    reflected.events.some(
      (e) => e.type === "bounce" && e.surface === "reflector",
    ),
  "a real initial ceiling reflection reaches the enemy",
);
const oldBeam = levels[11].components[0].poly,
  newBeam = E.levels[11].components[0].poly;
eq(
  newBeam.slice(0, 4),
  oldBeam.slice(0, 4),
  "stage12 beam top and its capsule support stay fixed",
);
eq(
  newBeam.slice(4),
  oldBeam.slice(4).map(([x, h]) => [x, h + 3]),
  "stage12 underside is raised30 world pixels",
);
for (const file of [
  "engine.js",
  "combat.js",
  "weapons.js",
  "skills.js",
  "save.js",
  "crew.js",
  "crew-usage.js",
  "final-team.js",
  "campaign-run.js",
  "inventory.js",
  "battle-ui.js",
  "render.js",
])
  eq(
    fs.readFileSync(path.join(root, "game/dist", file)),
    previous("game/dist/" + file),
    "all unrelated gameplay and prior UI fixes preserved " + file,
  );
for (const file of Object.keys(Fix.manifest.sourcePatches))
  eq(
    Fix.source(file, fs.readFileSync(path.join(root, "game/dist", file))),
    previous("game/dist/" + file),
    "exact bounded cloud-only source delta " + file,
  );
const html = fs.readFileSync(path.join(root, "game/dist/index.html"), "utf8"),
  ui = fs.readFileSync(path.join(root, "game/dist/expedition-ui.js"), "utf8");
ok(
  !html.includes('id="expeditionRevealSkip"') &&
    !ui.includes("expeditionRevealSkip"),
  "joining has no skip control or handler",
);
ok(html.includes('id="filmSkip"'), "other story skip controls are retained");
for (const [stage, id] of [
  [8, "roof"],
  [21, "C"],
]) {
  const state = E.campaign(stage, { matchSeed: 4697 }),
    before = JSON.stringify(state),
    preview = require("../dist/preview.js").create(state, id);
  ok(preview?.proof.valid, "real causal guide " + id);
  eq(JSON.stringify(state), before, "guide preserves live state " + id);
}
const acceptance = require("../../evidence/reported-fixes-0281/ACCEPTANCE.json");
for (const [file, hash] of Object.entries(acceptance.reports))
  eq(
    crypto
      .createHash("sha256")
      .update(
        fs.readFileSync(path.join(root, "evidence/reported-fixes-0281", file)),
      )
      .digest("hex"),
    hash,
    "pinned current native proof " + file,
  );
for (const row of require("../../evidence/reported-fixes-0281/MAP_GUIDES.json")
  .rows) {
  const state = E.campaign(row.stage, {
    equippedCharacterId: row.id,
    difficulty: row.difficulty,
    matchSeed: row.seed,
    battleInventory: {},
  });
  let ei = 0;
  for (const a of row.actions) {
    state.phase = "aim";
    E.move(state, 0, a.input);
    ok(E.selectWeapon(state, a.id), "native guide input");
    const z = E.launch(state, a.angle, a.power);
    ok(z, "native guide launch");
    E.resolve(state, z);
    while (state.pendingLoot.length) E.resolveLoot(state, null, true);
    eq(z.damage, a.damage, "guide native damage");
    if (state.result) break;
    E.next(state);
    if (state.turn === 1) {
      const en = require("../tools/approved-map-qa.cjs").enemy(state);
      eq(en.damage, row.enemies[ei++].damage, "guide autonomous retaliation");
      if (state.result) break;
      E.next(state);
    }
  }
  ok(
    state.result === "win",
    "current normal/recommended route wins " + row.stage + "/" + row.id,
  );
}
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-reported-fixes";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "REPORTED_FIXES_UNIT.json"),
  JSON.stringify(
    {
      status: "PASS",
      checks,
      clouds,
      filledSamples,
      emptySamples,
      slowingEvents: entered,
      scope:
        "Exact source and98-map preservation; fixed world silhouettes shared by rendering/physics; positive and negative cloud contacts; stage8 reflection and stage12 clearance; no join skip.",
    },
    null,
    2,
  ) + "\n",
);
console.log("PASS reported fixes", checks, "checks");
