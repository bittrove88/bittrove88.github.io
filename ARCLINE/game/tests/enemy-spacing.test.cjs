"use strict";
const assert = require("node:assert/strict"),
  E = require("../dist/engine.js"),
  A = require("../dist/enemy-actions.js"),
  P = E.enemyPosition,
  G = E.geometry;
let checks = 0;
const ok = (value, message) => {
    checks++;
    assert.ok(value, message);
  },
  copy = (s) => JSON.parse(JSON.stringify(s));
function arena(stage = 50, player = 700, enemy = 1500, wall = null) {
  const s = E.campaign(stage, { matchSeed: 42 });
  s.spec = {
    ...s.spec,
    floors: [
      [
        [0, 10],
        [300, 10],
      ],
    ],
    features: [],
    staticFeatures: [],
    phaseFeatures: null,
    components: wall
      ? [
          {
            id: "cover",
            kind: "solid",
            destructible: false,
            poly: [
              [wall, 10],
              [wall + 8, 10],
              [wall + 8, 25],
              [wall, 25],
            ],
          },
        ]
      : [],
    worldWidth: 3000,
  };
  s.world = G.world(s.spec);
  s.units.forEach((u, i) =>
    Object.assign(u, {
      x: i ? enemy : player,
      y: 400,
      slope: 0,
      surface: "floor0",
      floating: false,
      range: [35, 2965],
      facing: i ? -1 : 1,
    }),
  );
  E.bossActions.refresh(s);
  s.turn = 1;
  s.phase = "cpu";
  return s;
}
// Physical edges and every incremental move enforce the distance, including
// boss armor, both directions, a high target and an already-close player.
for (const stage of [9, 30, 41, 50, 60, 70, 90, 100]) {
  const s = arena(stage),
    before = copy(s.units[0]);
  for (let round = 1; round <= 8; round++) {
    s.round = round;
    E.move(s, 1, -140);
    ok(P.gap(s) >= 480 - 1e-7, "never enter close range stage" + stage);
  }
  const stopped = s.units[1].x;
  s.round++;
  ok(E.move(s, 1, -140) === 0, "stop at six-body boundary");
  assert.deepEqual(s.units[0], before);
  checks++;
  s.units[0].x = stopped - 300;
  s.round++;
  const old = P.gap(s);
  ok(E.move(s, 1, -140) === 0, "do not close further below boundary");
  s.round++;
  ok(
    E.move(s, 1, 140) > 0 && P.gap(s) > old,
    "walking away is allowed while still below boundary",
  );
  const mirror = arena(stage, 2200, 1400);
  for (let round = 1; round <= 8; round++) {
    mirror.round = round;
    E.move(mirror, 1, 140);
    ok(
      P.gap(mirror) >= 480 - 1e-7,
      "same spacing when player stands on the right",
    );
  }
}
{
  const s = arena(100, 700, 1000);
  s.units[1].y = -500;
  ok(
    P.gap(s) < 480,
    "vertical height cannot substitute for horizontal separation",
  );
  ok(
    !P.walkLegal(P.gap(s), P.side(s), P.at(s, { x: 900 })),
    "a high enemy cannot step closer",
  );
  const t = arena(41);
  t.units[1].x = G.clamp(t.units[0].x + 570, 35, 2965);
  const a = {
    kind: "walk-shoot",
    from: { x: t.units[1].x, y: t.units[1].y },
    to: { x: t.units[1].x - 100, y: 400 },
    round: t.round,
    next: { turns: 1 },
  };
  const before = JSON.stringify(t);
  ok(
    !E.commitEnemyAction(t, a),
    "commit rejects an unsafe or stale worker walk",
  );
  ok(before === JSON.stringify(t), "invalid walk consumes no hand or state");
  const boss = arena(50),
    transfer = {
      kind: "teleport",
      from: { x: boss.units[1].x, y: boss.units[1].y },
      to: { x: boss.units[0].x + 400, y: 400, slope: 0, surface: "floor0" },
      round: boss.round,
      next: { teleports: 1, cooldown: 2 },
    };
  const untouched = JSON.stringify(boss);
  ok(
    !E.commitEnemyAction(boss, transfer),
    "commit rejects a close teleport even on a valid floor",
  );
  ok(
    JSON.stringify(boss) === untouched,
    "invalid transfer consumes no budget or hand",
  );
  const player = arena(41);
  player.turn = 0;
  player.phase = "aim";
  ok(
    E.move(player, 0, 140) > 0,
    "player walking is not subject to enemy spacing",
  );
}
// No new movement unlocks: normal enemies start active positioning at41;
// bosses retain30/50, and early enemies retain their existing micro move.
{
  const s = arena(41);
  s.stage = 40;
  ok(!E.enemyActionRules(s).walk, "normal enemy at40 has no active movement");
  s.stage = 41;
  ok(E.enemyActionRules(s).walk, "normal active movement starts at41");
  for (const stage of [5, 10, 25, 30, 40, 50, 55, 100]) {
    const t = E.campaign(stage),
      r = E.enemyActionRules(t);
    ok(r.walk === stage >= 30, "boss walking unlock " + stage);
    ok(
      r.teleports === (stage >= 50 ? (t.spec.midboss ? 1 : 2) : 0),
      "boss transfer unlock and budget " + stage,
    );
  }
  for (const stage of [1, 2, 3, 4]) {
    const t = arena(stage);
    ok(
      E.enemyMoveTarget(t) === t.units[1].x,
      "first four enemies do not gain movement",
    );
  }
  const early = arena(9, 1200, 1500),
    x = early.units[1].x,
    target = E.enemyMoveTarget(early),
    micro = E.encounters.forSpec(early.spec).move;
  ok(
    target >= x && target - x <= micro,
    "early micro movement retreats without gaining a140px action",
  );
  for (const stage of [50, 55, 60, 70, 71, 81, 90, 95, 100]) {
    const t = arena(stage, 1010, 1200),
      rows = E.enemyTeleportCandidates(t);
    ok(rows.length > 0, "flat arena retains teleport opportunities " + stage);
    for (const p of rows) {
      const v = P.at(t, { ...p, facing: t.units[0].x >= p.x ? 1 : -1 });
      ok(
        P.gap(v) >= 480 - 1e-7,
        "every destination retains six body widths " + stage,
      );
    }
  }
}
// A controlled shared-geometry policy fixture isolates selection quality from
// weapon damage and tests the actual evaluator, not a second implementation.
function policy(stage, wall = 150) {
  const s = arena(stage, 500, 2200, wall);
  s.enemyWalkRound = s.round;
  s.enemyWalkUsed = 140;
  s.enemyTactics = {
    opportunityMisses: 2,
    field: E.bossActions.field(s),
    teleports: 0,
    cooldown: 0,
  };
  const ai = A.create({
    G,
    N: E.encounters,
    guardian: E.guardian,
    seeded: E.seeded,
    legacyMove: (t) => t.units[1].x,
    afterTurn: copy,
    solve: () => ({ score: 1, angle: 48, power: 65 }),
    cpuPlan: () => ({}),
    trajectory: (t, side) => {
      const current = Math.abs(t.units[1].x - 2200) < 1;
      return {
        damage: side ? [current ? 0.1 : 1, 0] : [0, current ? 1 : 0.1],
        partDamage: {},
        partHits: {},
      };
    },
  });
  return { s, ai };
}
const ratios = [];
for (const stage of [50, 80, 100]) {
  const { s, ai } = policy(stage);
  let direct = 0;
  for (let i = 1; i <= 300; i++) {
    s.matchSeed = Math.imul(i, 2654435761) >>> 0;
    const before = JSON.stringify(s),
      d = ai.plan(s, E.seeded(1));
    ok(
      d.action.kind === "teleport",
      "family preference is not a teleport probability gate",
    );
    ok(
      P.gap(P.at(s, { ...d.action.to, facing: -1 })) >= 480,
      "selected family obeys minimum gap",
    );
    ok(JSON.stringify(s) === before, "planning remains pure");
    if (d.action.position.direct) direct++;
  }
  const ratio = direct / 300,
    expected = P.profile(stage).directChance;
  ok(
    Math.abs(ratio - expected) < 0.065,
    "direct family share follows stage target " + stage + ":" + ratio,
  );
  ratios.push({ stage, ratio });
}
for (const wall of [null, 90]) {
  const { s, ai } = policy(100, wall),
    d = ai.plan(s, E.seeded(3));
  ok(
    d.action.kind === "teleport",
    "a missing preferred family falls back without suppressing teleport",
  );
  ok(
    d.action.position.direct === (wall === null),
    "only existing fair family is used",
  );
}
{
  const rows = Array.from({ length: 10 }, (_, i) => ({
      score: i / 10,
      gap: 650,
      id: i,
    })),
    means = [];
  for (const stage of [30, 50, 80, 100]) {
    let sum = 0;
    for (let i = 1; i <= 1000; i++)
      sum += P.choose(
        rows,
        stage,
        E.seeded(Math.imul(i, 2654435761) >>> 0),
      ).score;
    means.push(sum / 1000);
  }
  ok(
    means.every((v, i) => !i || v > means[i - 1]),
    "later stages select measurably better positions on identical options",
  );
  const { s, ai } = policy(100),
    a = ai.plan(s, E.seeded(1));
  s.angle = 7;
  s.power = 99;
  s.mode = "S_RICO";
  s.selectedSkill = "S_METEOR";
  s.units[0].facing = -1;
  const b = ai.plan(s, E.seeded(1));
  assert.deepEqual(
    a.action,
    b.action,
    "destination does not read player charge inputs or planned skill",
  );
  checks++;
  const high = arena(100);
  high.units[1].y = 100;
  ok(P.directLane(high), "height alone is not classified as a covered lane");
}
console.log(
  JSON.stringify({
    status: "PASS",
    checks,
    ratios,
    scope:
      "Physical movement and armor edges, early unlocks, candidate validity, controlled evaluator destination-family shares and progression, no player aim read. Real ballistics and browser continuity are separate checks.",
  }),
);
