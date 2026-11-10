"use strict";
// Marketing sequences contain only native trajectories and committed engine states.
const E = require("../dist/engine.js"),
  G = E.geometry,
  Q = require("./route-planner.cjs"),
  fs = require("node:fs"),
  path = require("node:path"),
  release = require("../runtime.json");
const clone = (x) => JSON.parse(JSON.stringify(x)),
  rows = {};
function action(s, plan, labelJa, labelEn, extra = {}) {
  const before = clone(s),
    shot = E.launch(s, plan.angle, plan.power, plan);
  if (!shot) throw Error("Rejected demonstration action");
  E.resolve(s, shot);
  while (s.pendingLoot.length) E.resolveLoot(s, null, true);
  return {
    before,
    after: clone(s),
    plan: clone(shot),
    label: { ja: labelJa, en: labelEn },
    ...extra,
  };
}
function enemy(s) {
  E.next(s);
  const from = clone(s.units[1]),
    x = E.enemyMoveTarget(s);
  G.move(s, 1, x - s.units[1].x);
  const plan = E.cpuPlan(s, E.seeded(77));
  const step = action(
    s,
    plan,
    "準備にも相手の手番が返る",
    "Preparation still gives the rival a turn",
    { walkFrom: from, walkSide: 1 },
  );
  E.next(s);
  s.phase = "aim";
  return step;
}
{
  const s = E.campaign(31, {
      equippedCharacterId: "gun",
      matchSeed: 77,
      battleInventory: {},
    }),
    p = Q.firing(
      s,
      "W01",
      (p) =>
        p.damage[1] > 0.4 &&
        p.damage[0] === 0 &&
        p.events.filter((e) => e.type === "bounce").length === 1 &&
        p.events.some((e) => e.type === "bounce" && e.surface === "crystal"),
    );
  if (!p) throw Error("No single-bounce demonstration");
  rows.reflection = {
    id: "reflection",
    stage: 31,
    reason: {
      ja: "入口の結晶で一度返し、岩肩の奥の敵へ通す。",
      en: "One bounce from the entrance crystal reaches behind the rock ridge.",
    },
    steps: [
      action(
        s,
        p.plan,
        "結晶で返して、敵に命中",
        "Bounce from the crystal, then hit the rival",
      ),
    ],
    proof: {
      source:
        "ARCLINE " + release.version + " / campaign" + release.campaignVersion,
      valid: true,
      bounces: 1,
      crystalHit: true,
      enemyDamage: p.plan.damage[1],
    },
  };
}
{
  const s = E.campaign(7, {
      equippedCharacterId: "gun",
      matchSeed: 77,
      battleInventory: {},
    }),
    p = { plan: E.trajectory(s, 0, 30, 50, { weaponId: "W01" }) };
  if (
    !(
      p.plan.destroyed.length > 0 &&
      p.plan.damage[1] === 0 &&
      p.plan.damage[0] === 0
    )
  )
    throw Error("No arched cover break");
  const steps = [
    action(
      s,
      p.plan,
      "割れた門が射線を塞いでいる",
      "Break the cracked gate blocking the lane",
    ),
  ];
  steps.push(enemy(s));
  const follow = { plan: E.trajectory(s, 0, 30, 50, { weaponId: "W01" }) };
  if (!(follow.plan.damage[1] > 0.4 && follow.plan.damage[0] === 0))
    throw Error("No arched follow-up after break");
  steps.push(
    action(
      s,
      follow.plan,
      "開いた窓から、次の一射",
      "Send the next shot through the opening",
    ),
  );
  rows.destruction = {
    id: "destruction",
    stage: 7,
    reason: {
      ja: "一射目で遮蔽を外し、開いた射線を二射目で使う。",
      en: "The first shot removes cover; the next uses the opened lane.",
    },
    steps,
    proof: {
      source:
        "ARCLINE " + release.version + " / campaign" + release.campaignVersion,
      valid: true,
      destroyed: p.plan.destroyed,
      followUpDamage: follow.plan.damage[1],
      arcRise:
        steps[0].before.units[0].y - Math.min(...p.plan.path.map((v) => v.y)),
      beforeSolids: steps[0].before.world.solids.length,
      afterSolids: steps[0].after.world.solids.length,
    },
  };
}
{
  const s = E.campaign(4, {
      equippedCharacterId: "gun",
      matchSeed: 77,
      battleInventory: {},
    }),
    from = clone(s.units[0]);
  const plan = E.trajectory(s, 0, 58, 72.5, { weaponId: "TELEPORT" }),
    land = G.teleportLanding(
      s.world,
      plan.teleportContact,
      s.units[1],
      from.range,
    ),
    roof = plan.path.filter((p) => p.x >= 540 && p.x <= 740);
  if (!land || land.x < 760 || !roof.length || roof.some((p) => p.y > 95))
    throw Error("Teleport must travel above the headland");
  const selected = { plan, land };
  if (!selected) throw Error("No distant useful teleport");
  const walkProbe = clone(s);
  G.move(walkProbe, 0, 1000);
  if (walkProbe.units[0].x >= selected.land.x - 50)
    throw Error("Teleport is merely ordinary walking");
  s.teleportMode = true;
  const steps = [
    action(
      s,
      selected.plan,
      "岩肩の上を越えて、対岸へ転移弾を送る",
      "Send the teleport shot over the headland",
    ),
  ];
  s.teleportMode = false;
  steps.push(enemy(s));
  const follow = Q.firing(
    s,
    "W01",
    (p) => p.damage[1] > 0.4 && p.damage[0] === 0,
  );
  if (!follow) throw Error("No useful attack after teleport");
  steps.push(
    action(
      s,
      follow.plan,
      "裏岸から、敵を横から狙う",
      "Fire along the dock from the far bank",
    ),
  );
  rows.teleport = {
    id: "teleport",
    stage: 4,
    reason: {
      ja: "渡れない谷と岩肩を越え、対岸の側面へ回り込む。",
      en: "Cross the gap and headland to open a side shot from the far bank.",
    },
    steps,
    proof: {
      source:
        "ARCLINE " + release.version + " / campaign" + release.campaignVersion,
      valid: true,
      displacement: Math.hypot(
        steps[0].after.units[0].x - from.x,
        steps[0].after.units[0].y - from.y,
      ),
      roofClearance: 110 - Math.max(...roof.map((p) => p.y)),
      walkingLimit: walkProbe.units[0].x,
      landing: clone(steps[0].after.units[0]),
      followUpDamage: follow.plan.damage[1],
    },
  };
}
fs.writeFileSync(
  path.resolve(__dirname, "../../site/scenes.js"),
  "/* Generated from current ARCLINE production physics; edit game/tools/build_site_scenes.cjs. */\nglobalThis.ArcSiteScenes=" +
    JSON.stringify(rows) +
    ";\n",
);
console.log(
  Object.fromEntries(
    Object.entries(rows).map(([id, r]) => [
      id,
      { steps: r.steps.length, proof: r.proof },
    ]),
  ),
);
