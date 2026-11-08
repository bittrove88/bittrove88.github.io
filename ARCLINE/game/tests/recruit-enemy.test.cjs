"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  cp = require("node:child_process"),
  crypto = require("node:crypto"),
  E = require("../dist/engine.js"),
  Q = require("../tools/approved-map-qa.cjs"),
  Guard = require("./recruit-ai-preservation.cjs");
const root = path.resolve(__dirname, "../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-recruit-enemy";
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const ok = (x, m) => {
    checks++;
    assert(x, m);
  },
  eq = (a, b, m) => {
    checks++;
    assert.deepEqual(a, b, m);
  },
  copy = (x) => JSON.parse(JSON.stringify(x)),
  sha = (x) => crypto.createHash("sha256").update(x).digest("hex");
for (const f of Object.keys(Guard.manifest.sourcePatches))
  eq(
    Guard.source(f, fs.readFileSync(path.join(root, "game/dist", f))),
    cp.execFileSync("git", [
      "show",
      Guard.manifest.base + ":ARCLINE/game/dist/" + f,
    ]),
    "bounded source delta " + f,
  );
for (const f of [
  "combat.js",
  "physics.js",
  "geometry.js",
  "weapons.js",
  "skills.js",
  "save.js",
  "inventory.js",
  "levels.js",
  "final-team.js",
  "render.js",
  "battle-ui.js",
  "charge-camera.js",
])
  eq(
    require("./damage-sync-preservation.cjs").source(f, fs.readFileSync(path.join(root, "game/dist", f))),
    cp.execFileSync("git", [
      "show",
      Guard.manifest.base + ":ARCLINE/game/dist/" + f,
    ]),
    "other physics/maps/HP/UI preserved " + f,
  );
const pixels = JSON.parse(
  cp.execFileSync(
    "python3",
    [
      "-c",
      `
import json,hashlib
from pathlib import Path
from PIL import Image,ImageChops
root=Path(${JSON.stringify(root)});data=json.loads((root/'assets/ending/player-cutouts.json').read_text());points={'gun':(694,697),'hana':(704,433),'koro':(736,350),'ban':(1566,720),'sora':(1313,169),'rico':(790,365),'hibari':(988,423),'mogu':(1455,410),'rin':(1358,225),'yui':(1040,143)};rows=[]
def preserved(a,alpha):
 spec=a['mask']
 if not spec.get('preserveAlphaRegions'):return True
 previous=Image.open(root/spec['previousAlphaSource']).convert('L')
 return all(ImageChops.subtract(previous.crop(box),alpha.crop(box)).getbbox() is None for box in spec['preserveAlphaRegions'])
for a in data['actors']:
 original=Image.open(root/a['source']).convert('RGB');im=Image.open(root/a['src']);alpha=Image.open(root/a['mask']['alphaSource']);name=a['id'].split(':')[1];rows.append({'id':name,'rgbIdentical':im.convert('RGB').tobytes()==original.crop(a['crop']).tobytes(),'sourceHash':hashlib.sha256((root/a['source']).read_bytes()).hexdigest()==a['sourceSha256'],'featureOpaque':alpha.getpixel(points[name])>0,'maskHash':hashlib.sha256((root/a['mask']['alphaSource']).read_bytes()).hexdigest()==a['mask']['alphaSha256'],'nativeSize':list(im.size)==[a['width'],a['height']],'previousPartsPreserved':preserved(a,alpha)})
print(json.dumps(rows))
`,
    ],
    { encoding: "utf8" },
  ),
);
ok(pixels.length === 10, "every original machine checked");
for (const p of pixels)
  for (const k of [
    "rgbIdentical",
    "sourceHash",
    "featureOpaque",
    "maskHash",
    "nativeSize",
    "previousPartsPreserved",
  ])
    ok(p[k], p.id + "/" + k);
for (const n of [1, 5, 14, 29, 39, 40, 50, 60, 70, 75, 80, 85, 90, 95, 100]) {
  const s = E.campaign(n, { matchSeed: 42 }),
    old = copy(s),
    before = JSON.stringify(s),
    target = E.enemyMoveTarget(old);
  E.geometry.move(old, 1, target - old.units[1].x);
  const shot = E.cpuPlan(old, E.seeded(42)),
    plan = E.planEnemyAction(s, E.seeded(42));
  eq(plan.target, target, "legacy target " + n);
  eq(plan.plan, shot, "legacy shot " + n);
  eq(JSON.stringify(s), before, "planner never mutates real state " + n);
  ok(
    !E.enemyActionRules(s).teleports,
    "no teleport for early maps and guardians " + n,
  );
}
// Synthetic connected-floor unit fixture: actual segmented/reversed movement shares one140px budget.
{
  const s = E.campaign(41);
  s.spec = {
    ...s.spec,
    floors: [
      [
        [0, 10],
        [100, 10],
      ],
    ],
    components: [],
    features: [],
  };
  s.world = E.geometry.world(s.spec);
  Object.assign(s.units[0], { x: 200, y: 400 });
  Object.assign(s.units[1], { x: 700, y: 400, slope: 0, range: [35, 965] });
  s.turn = 1;
  s.phase = "cpu";
  eq(E.move(s, 1, 90), 90, "first enemy segment");
  eq(E.move(s, 1, -100), -50, "reversal uses remaining50 only");
  eq(E.move(s, 1, 50), 0, "cannot exceed budget");
  eq(s.enemyWalkUsed, 140, "cumulative actual distance");
  s.round++;
  eq(E.move(s, 1, 90), 90, "next enemy turn refills");
}
const rows = [],
  counts = {
    walk: 0,
    shoot: 0,
    teleport: 0,
    forced: 0,
    battles: 0,
    teleportBattles: 0,
    maxPlanMs: 0,
  };
for (const n of E.levels
  .filter((s) => s.id >= 40 && s.id < 100 && !E.encounters.guardian(s))
  .map((s) => s.id))
  for (const seed of n >= 71 ? [42, 4697] : [4697]) {
    const s = E.campaign(n, { matchSeed: seed }),
      turns = [];
    let priorTeleport = -10,
      teleports = 0;
    for (let i = 0; i < 4 && !s.result; i++) {
      s.phase = "aim";
      E.selectWeapon(s, "W01");
      const miss = E.launch(s, 170, 20);
      ok(!!miss, "real observation shot");
      E.resolve(s, miss);
      if (s.result) break;
      E.next(s);
      if (s.turn !== 1) continue;
      s.phase = "cpu";
      const before = JSON.stringify(s),
        start = performance.now(),
        plan = E.planEnemyAction(
          s,
          E.seeded((s.matchSeed + s.round * 1009) >>> 0),
        );
      counts.maxPlanMs = Math.max(counts.maxPlanMs, performance.now() - start);
      eq(JSON.stringify(s), before, "pure actual-map planner " + n);
      const hp = s.units.map((u) => u.hp),
        from = { x: s.units[1].x, y: s.units[1].y };
      ok(E.commitEnemyAction(s, plan.action), "commit current action");
      let attack = null,
        moved = 0;
      if (plan.action.kind === "teleport") {
        counts.teleport++;
        teleports++;
        ok(
          i - priorTeleport >= 3,
          "two complete enemy turns between teleports",
        );
        priorTeleport = i;
        eq(
          s.units.map((u) => u.hp),
          hp,
          "teleport does no damage",
        );
        ok(
          Math.hypot(
            s.units[0].x - s.units[1].x,
            s.units[0].y - s.units[1].y,
          ) >= 300,
          "no close-range teleport",
        );
        ok(
          E.geometry.clearBody(s.world, s.units[1]),
          "legal non-overlapping destination",
        );
        ok(E.solve(s, 0).score > 0.1, "player can counter after teleport");
        if (plan.action.reason === "repeated-useful-opportunity")
          counts.forced++;
      } else {
        moved = E.move(s, 1, plan.target - s.units[1].x);
        ok((s.enemyWalkUsed || 0) <= 140.00001, "shared enemy walk budget");
        attack = E.launch(s, plan.plan.angle, plan.plan.power, plan.plan);
        ok(!!attack, "single real enemy shot");
        E.resolve(s, attack);
        counts[Math.abs(moved) > 1 ? "walk" : "shoot"]++;
      }
      ok(teleports <= E.enemyActionRules(s).teleports, "hard per-battle cap");
      turns.push({
        round: s.round,
        kind: plan.action.kind,
        reason: plan.action.reason,
        from,
        to: { x: s.units[1].x, y: s.units[1].y },
        moved,
        walkUsed: s.enemyWalkUsed || 0,
        teleports,
        cooldown: s.enemyTactics.cooldown,
        damage: attack?.damage || [0, 0],
        hp: s.units.map((u) => u.hp),
      });
      if (!s.result) {
        E.next(s);
        if (plan.action.kind === "teleport") {
          ok(
            E.geometry.clearBody(s.world, s.units[1]),
            "legal after actual next-turn terrain change",
          );
          ok(
            E.solve(s, 0).score > 0.1,
            "counterattack survives actual next-turn terrain change " +
              n +
              "/" +
              seed +
              "/" +
              s.round,
          );
        }
      }
    }
    counts.battles++;
    if (teleports) counts.teleportBattles++;
    rows.push({ stage: n, seed, result: s.result, turns });
  }
ok(counts.walk > 20, "walking is actually visible across real normal maps");
ok(counts.teleport > 5, "native teleports actually occur");
ok(
  counts.forced > 0,
  "conditional priority fires after repeated useful opportunity",
);
ok(
  rows.some(
    (r) => r.stage >= 71 && !r.turns.some((t) => t.kind === "teleport"),
  ),
  "staying and shooting remains valid",
);
// Counter expiry is action-based: no countdown in preview, host frames, skipped enemy turns or stale commits.
{
  const s = E.campaign(98, { matchSeed: 42 });
  s.enemyTactics = { teleports: 1, cooldown: 2 };
  const before = copy(s.enemyTactics);
  E.planEnemyAction(s, E.seeded(2));
  eq(s.enemyTactics, before, "preview does not advance cooldown");
  s.skillEffects = { skip: 1 };
  s.phase = "aim";
  E.next(s);
  eq(s.enemyTactics, before, "skipped enemy turn does not advance cooldown");
  ok(
    !E.commitEnemyAction(s, {
      kind: "teleport",
      round: -1,
      from: { x: 0, y: 0 },
    }),
    "stale action rejected",
  );
  eq(s.enemyTactics, before, "stale action cannot change counters");
}
// Newly recorded current-AI inputs must still win under native enemy decisions.
const matches = require("../../evidence/recruit-enemy-0292/CURRENT_ENEMY_MATCHES.json");
ok(matches.rows.length === 6, "six real current-AI full matches");
for (const [file, hash] of Object.entries(matches.sources))
  eq(
    sha(require("./damage-sync-preservation.cjs").source(file, fs.readFileSync(path.join(root, "game/dist", file)))),
    hash,
    "recorded current-AI source fingerprint " + file,
  );
const allMatches = require("../../evidence/recruit-enemy-0292/ALL_CURRENT_ENEMY_MATCHES.json");
ok(
  allMatches.rows.length === 48 &&
    allMatches.rows.every(
      (r) => r.result === "win" && r.actions.length <= r.limit,
    ),
  "all48 affected ordinary stages have native wins",
);
eq(
  allMatches.sources,
  matches.sources,
  "full and representative records use the same current AI",
);
for (const historical of matches.rows) {
  const row = require("./damage-sync-preservation.cjs").replay(historical,"CURRENT_ENEMY_MATCHES");
  const s = E.campaign(row.stage, {
    equippedCharacterId: row.id,
    difficulty: row.difficulty,
    matchSeed: row.seed,
    battleInventory: {},
  });
  let enemyIndex = 0;
  for (const input of row.actions) {
    s.phase = "aim";
    E.move(s, 0, input.input);
    input.teleport ? E.selectTeleport(s) : E.selectWeapon(s, input.id);
    const shot = E.launch(s, input.angle, input.power);
    ok(!!shot, "current native replay launch");
    E.resolve(s, shot);
    while (s.pendingLoot.length) E.resolveLoot(s, null, true);
    eq(shot.damage, input.damage, "current native replay damage");
    if (s.result) break;
    E.next(s);
    if (s.turn === 1) {
      const actual = Q.enemy(s),
        prior = row.enemies[enemyIndex++];
      eq(actual.damage, prior.damage, "current strategic retaliation damage");
      eq(actual.position, prior.position, "current strategic arrival");
      eq(
        actual.action?.kind,
        prior.action?.kind,
        "current strategic action type",
      );
      if (s.result) break;
      E.next(s);
    }
  }
  eq(s.result, "win", "full current-AI victory " + row.stage);
  eq(s.shotCount, row.actions.length, "recorded action count " + row.stage);
}
fs.writeFileSync(
  path.join(out, "RECRUIT_ENEMY_UNIT.json"),
  JSON.stringify(
    {
      status: "PASS",
      checks,
      pixels,
      counts,
      rows,
      scope:
        "Original RGB and ten symptomatic feature checks; exact source preservation; legacy early/boss plans; all affected ordinary maps with real miss shots and real enemy actions. Observations are not human win rates.",
    },
    null,
    2,
  ) + "\n",
);
console.log("PASS recruit/enemy unit", checks, JSON.stringify(counts));
