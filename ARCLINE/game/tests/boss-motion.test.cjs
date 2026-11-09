"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const E = require("../dist/engine.js"),
  P = require("../dist/physics.js"),
  F = require("../dist/final-team.js"),
  B = E.bossActions,
  G = E.geometry;
let checks = 0;
const rows = [];
const ok = (v, m) => {
    checks++;
    assert.ok(v, m);
  },
  near = (a, b, m) => ok(Math.abs(a - b) < 1e-7, `${m}: ${a} / ${b}`),
  copy = (v) => JSON.parse(JSON.stringify(v));
function arena(stage = 50, index = 0) {
  const s = E.campaign(stage, { matchSeed: 42 });
  if (stage === 100)
    for (let i = 0; i < index; i++) {
      const n = F.credit(s, s.characterId, s.spec.finalBattle.requiredDamage);
      s.units[1].hp -= n;
      F.advance(s);
    }
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
    components: [],
    phaseFeatures: undefined,
    worldWidth: 3000,
  };
  s.world = G.world(s.spec);
  for (const [i, u] of s.units.entries())
    Object.assign(u, {
      x: i ? 1200 : 1010,
      y: 400,
      slope: 0,
      floating: false,
      range: [35, 2965],
    });
  B.refresh(s);
  s.turn = 1;
  s.phase = "cpu";
  return s;
}
function retreat(s) {
  const before = JSON.stringify(s),
    p = E.planEnemyAction(s, E.seeded(999));
  ok(JSON.stringify(s) === before, "planning never changes live state");
  ok(p.action?.kind === "teleport", "close retreat wins over firing");
  ok(p.action.reason === "close-retreat", "no extra probability gate");
  ok(E.commitEnemyAction(s, p.action), "legal teleport commits");
  return p;
}
// Availability, shared budgets, facing attachments, floating movement and body clearance.
for (const stage of [5, 10, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 95, 100]) {
  const s = E.campaign(stage),
    r = E.enemyActionRules(s);
  ok(r.walk === stage >= 30, "walking starts at30 " + stage);
  ok(
    r.teleports === (stage >= 50 ? (s.spec.midboss ? 1 : 2) : 0),
    "teleport threshold/tier " + stage,
  );
}
for (const stage of [35, 40, 50, 60, 90, 100]) {
  const s = arena(stage);
  s.units[0].x = 200;
  const from = s.units[1].x;
  const first = E.move(s, 1, 80),
    second = E.move(s, 1, -90),
    third = E.move(s, 1, 20);
  near(
    Math.abs(first) + Math.abs(second),
    140,
    "split/reversed shared budget " + stage,
  );
  near(third, 0, "no extra walking " + stage);
  ok(B.fits(s), "body and live parts fit " + stage);
  if (stage === 40 || stage === 60) {
    const ids = s.world.solids.filter((o) => /shoulder|front-armor/.test(o.id));
    ok(ids.length > 0, "attached colliders retained");
    ok(
      ids.every((o) => Math.abs(o.poly[0].x - s.units[1].x) < 110),
      "colliders follow body",
    );
  }
  if (stage === 90) {
    s.units[1].floating = true;
    s.enemyWalkUsed = 0;
    const y = s.units[1].y;
    E.move(s, 1, 140);
    near(s.units[1].y, y, "floating motion retains flight altitude");
  }
  rows.push({
    stage,
    walk: Math.abs(first) + Math.abs(second),
    net: s.units[1].x - from,
  });
}
// A narrow obstacle outside the chassis still blocks an attached armor plate.
{
  const s = arena(60);
  s.units[0].x = 200;
  s.world.solids.push(G.rectangle("armor-clearance", 111.8, 112, 11, 17));
  ok(
    G.clearBody(s.world, s.units[1]),
    "ordinary small-body clearance alone misses armor obstruction",
  );
  ok(!B.fits(s), "attached armor may not enter a thin obstacle");
}
// Per-battle caps remain hard limits even for guaranteed close retreat.
for (const stage of [55, 50, 100]) {
  const s = arena(stage);
  s.enemyTactics = {
    teleports: E.enemyActionRules(s).teleports,
    cooldown: 0,
    field: B.field(s),
  };
  ok(
    E.planEnemyAction(s, () => 0).action.kind !== "teleport",
    "close retreat cannot bypass exhausted cap " + stage,
  );
}
// Close-range retreat also works during a telegraphed technique and exposed core.
for (const stage of [50, 55, 60, 75, 90, 95, 100]) {
  const s = arena(stage);
  s.units[1].exposed = 2;
  s.telegraph = {
    kind: stage === 100 ? "E_FINAL_1" : "E_" + stage,
    technique: stage === 100 ? "E_FINAL_1" : "E_" + stage,
    targetX: 1010,
    targetY: 378,
    columns: [0],
    frozen: true,
  };
  const old = copy(s.units[1]),
    p = retreat(s);
  near(E.move(s, 1, 20), 0, "no walking in transfer hand");
  ok(E.launch(s, 48, 50) === null, "no shooting in transfer hand");
  near(s.units[1].exposed, 2, "teleport carries exposure");
  ok(B.gap(s) > 150, "retreat exits close range");
  near(s.enemyTactics.cooldown, 2, "cooldown starts at2");
  near(s.enemyTactics.teleports, 1, "one transfer charged");
  ok(!!s.bossEcho === !!s.spec.boss, "only major bosses leave echo");
  if (s.bossEcho) {
    near(s.bossEcho.unit.x, old.x, "echo stays at departure");
    ok(
      s.deferredBossTelegraph.technique === s.telegraph.technique,
      "pending technique retained",
    );
  }
  ok(!E.commitEnemyAction(s, p.action), "cannot commit twice in one hand");
}
// Contact is transparent and synchronized, including area damage. No relay credit.
{
  const s = arena(100);
  s.turn = 0;
  s.phase = "aim";
  s.units[0].x = 500;
  B.spawnEcho(s, { ...s.units[1], x: 800, parts: [] });
  const before = copy(s.finalTeam.damage),
    withEcho = P.simulate(s, 0, 0, 70, {
      weaponId: "W01",
      origin: { x: 700, y: 356, theta: 0 },
    }),
    plain = copy(s);
  delete plain.bossEcho;
  const without = P.simulate(plain, 0, 0, 70, {
      weaponId: "W01",
      origin: { x: 700, y: 356, theta: 0 },
    }),
    hit = withEcho.events.find((e) => e.type === "echo-hit");
  ok(hit, "projectile directly contacts silhouette");
  ok(
    JSON.stringify(withEcho.bullets) === JSON.stringify(without.bullets),
    "echo does not intercept or consume the projectile",
  );
  ok(
    JSON.stringify(withEcho.damage) === JSON.stringify(without.damage),
    "echo does not change actual damage",
  );
  E.applyEvents(s, withEcho, hit.t - 0.00001);
  ok(s.bossEcho, "not destroyed before contact");
  E.applyEvents(s, withEcho, hit.t);
  ok(
    !s.bossEcho && s.bossEchoEffect.reason === "broken",
    "destroyed at contact",
  );
  ok(
    JSON.stringify(before) === JSON.stringify(s.finalTeam.damage),
    "echo grants no relay credit",
  );
  const t = arena(50);
  t.turn = 0;
  t.units[0].x = 500;
  B.spawnEcho(t, { ...t.units[1], x: 800, parts: [] });
  const splash = P.simulate(t, 0, 90, 20, {
    weaponId: "W02",
    origin: { x: 800, y: 350, theta: Math.PI / 2 },
  });
  ok(
    splash.events.some((e) => e.type === "echo-hit"),
    "blast also destroys echo",
  );
  const warp = P.simulate(t, 0, 0, 70, {
    weaponId: "TELEPORT",
    origin: { x: 700, y: 356, theta: 0 },
  });
  ok(
    !warp.events.some((e) => e.type === "echo-hit"),
    "non-damaging transfer does not destroy echo",
  );
}
// One supplemental attack, live aim, double shot timing, guards and pattern continuity.
for (const index of [0, 3, 6, 9]) {
  const s = arena(100, index);
  retreat(s);
  E.next(s);
  s.phase = "aim";
  ok(!B.due({ ...s, round: s.bossEcho.round }), "no same-hand echo shot");
  const x = s.units[0].x;
  E.move(s, 0, -60);
  ok(B.due(s), "walking does not consume echo");
  s.turn = 1;
  s.phase = "cpu";
  const pattern = copy(s.finalAttackPattern),
    round = s.round,
    count = s.shotCount,
    stocks = copy(s.weaponStock),
    stats = copy(s.enemyTactics);
  const planned = E.planEnemyAction(s, () => 0.5),
    shot = planned.plan;
  ok(shot.echo, "next enemy hand starts with echo");
  near(shot.bullets.length, index >= 6 ? 2 : 1, "phase-specific bullet count");
  if (index >= 6)
    near(
      shot.bullets[1].start - shot.bullets[0].start,
      0.2,
      "fixed double-shot interval",
    );
  const old = copy(s);
  old.units[0].x = x + 200;
  const changed = E.bossEchoPlan(old, () => 0.5);
  ok(
    changed.angle !== shot.angle || changed.power !== shot.power,
    "aim reads current player at firing",
  );
  const guarded = copy(s);
  guarded.guardActive = true;
  const gp = E.bossEchoPlan(guarded, () => 0.5);
  near(gp.damage[0], shot.damage[0] / 2, "Guard applies to echo");
  const immune = copy(s);
  immune.skillEffects = { invincible: true };
  near(E.bossEchoPlan(immune, () => 0.5).damage[0], 0, "invincibility applies");
  ok(E.launch(s, 0, 0, shot), "echo launches");
  ok(!s.bossEcho, "echo consumed once");
  E.resolve(s, shot);
  E.next(s);
  near(s.turn, 1, "same enemy hand continues");
  near(s.round, round, "no extra round");
  near(s.shotCount, count, "no player action cost");
  ok(
    JSON.stringify(stocks) === JSON.stringify(s.weaponStock),
    "no inventory cost",
  );
  ok(
    JSON.stringify(pattern) === JSON.stringify(s.finalAttackPattern),
    "echo never advances main pattern",
  );
  ok(
    JSON.stringify(stats) === JSON.stringify(s.enemyTactics),
    "echo never decrements cooldown",
  );
  const main = E.planEnemyAction(s, () => 0.5);
  ok(!main.plan.echo, "main acts after echo");
  E.commitEnemyAction(s, main.action);
  E.resolve(s, E.launch(s, 0, 0, main.plan));
  E.next(s);
  near(s.turn, 0, "returns to player once");
  near(s.enemyTactics.cooldown, 1, "one real enemy hand consumed");
}
// A pending unique technique survives both the transfer and supplemental attack.
{
  const s = arena(100);
  s.finalAttackPattern = { phase: 0, step: 2 };
  E.telegraph(s);
  retreat(s);
  E.next(s);
  s.turn = 1;
  s.phase = "cpu";
  const echo = E.planEnemyAction(s, () => 0.5).plan;
  E.resolve(s, E.launch(s, 0, 0, echo));
  E.next(s);
  const main = E.planEnemyAction(s, () => 0.5);
  ok(
    main.plan.deferBossAttack && !main.plan.specialTechnique,
    "main uses normal shot beside echo",
  );
  E.commitEnemyAction(s, main.action);
  E.resolve(s, E.launch(s, 0, 0, main.plan));
  E.next(s);
  near(s.finalAttackPattern.step, 2, "unique pattern step retained");
  ok(
    s.telegraph.technique === "E_FINAL_1",
    "same technique is pending next hand",
  );
}
// Relay handoffs, field budgets, skip and retry snapshots.
{
  const s = arena(100);
  retreat(s);
  E.next(s);
  const entry = F.snapshot(s);
  ok(entry.bossEcho, "snapshot includes pending echo");
  B.clearEcho(s, "broken");
  ok(
    F.restore(s, entry) && s.bossEcho,
    "retry restores echo and tactical state together",
  );
  const count = B.tactics(s).teleports;
  F.credit(s, s.characterId, s.spec.finalBattle.requiredDamage);
  F.advance(s);
  ok(!s.bossEcho, "handoff clears echo");
  near(
    B.tactics(s).teleports,
    count,
    "same-field handoff does not refill teleports",
  );
  for (let i = 0; i < 2; i++) {
    F.credit(s, s.characterId, s.spec.finalBattle.requiredDamage);
    F.advance(s);
  }
  near(B.tactics(s).teleports, 0, "new field refills only its own two uses");
  near(B.tactics(s).cooldown, 2, "field change does not bypass cooldown");
  const t = arena(50);
  retreat(t);
  E.next(t);
  t.skillEffects.skip = true;
  E.next(t);
  ok(!t.bossEcho && t.turn === 0, "skip cancels echo and enemy hand");
}
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-boss-motion";
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "BOSS_MOTION.json"),
  JSON.stringify(
    {
      status: "PASS",
      phase: "focused development precheck",
      checks,
      rows,
      limitations: [
        "Human difficulty and physical devices unverified; release/CI verification awaits final agreement.",
      ],
    },
    null,
    2,
  ),
);
console.log("PASS boss motion " + checks + " checks");
