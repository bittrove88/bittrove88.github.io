(function (root) {
  "use strict";
  const G =
    typeof module !== "undefined" ? require("./geometry.js") : root.ArcGeometry;
  const N =
    typeof module !== "undefined"
      ? require("./encounters.js")
      : root.ArcEncounters;
  const bodyWidth = 80,
    minBodies = 6;
  const rules = Object.freeze({
    bodyWidth,
    minBodies,
    minGap: bodyWidth * minBodies,
    preferredMin: bodyWidth * 7,
    preferredMax: bodyWidth * 10,
    farRange: bodyWidth * 10,
    walk: 140,
    cooldown: 2,
    unlocks: Object.freeze({
      normalWalk: 41,
      bossWalk: 30,
      bossTeleport: 50,
      normalTeleport: 71,
      secondNormalTeleport: 81,
      final: 100,
    }),
  });
  const policy = Object.freeze({
    attackWeight: 0.45,
    defenseWeight: 0.45,
    distanceWeight: 0.1,
    hitThreshold: 0.05,
    routeThreshold: 0.1,
    counterHits: 3,
    retreatGain: 1,
    walkAttackTolerance: 0.05,
    walkScoreGain: 0.01,
    teleportAttackGain: 0.08,
    teleportScoreGain: 0.015,
  });
  const progression = Object.freeze(
    [
      {
        before: 40,
        band: 0,
        angles: 4,
        choices: 6,
        directChance: 0.3,
        searchLimit: 4,
        forecastWalk: false,
      },
      {
        before: 70,
        band: 1,
        angles: 6,
        choices: 4,
        directChance: 0.3,
        searchLimit: 6,
        forecastWalk: false,
      },
      {
        before: 90,
        band: 2,
        angles: 8,
        choices: 3,
        directChance: 0.2,
        searchLimit: 8,
        forecastWalk: false,
      },
      {
        before: Infinity,
        band: 3,
        angles: 9,
        choices: 2,
        directChance: 0.1,
        searchLimit: 10,
        forecastWalk: true,
      },
    ].map(Object.freeze),
  );
  function profile(stage) {
    return (
      progression.find((p) => stage < p.before) ||
      progression[progression.length - 1]
    );
  }
  function unlocked(s) {
    const guardian = N.guardian(s.spec),
      u = rules.unlocks;
    return {
      boss: guardian && s.stage >= u.bossWalk,
      normal: !guardian && s.stage >= u.normalWalk && s.stage < u.final,
    };
  }
  function capabilities(s) {
    const { boss, normal } = unlocked(s),
      u = rules.unlocks,
      walk = boss || (normal && !s.units[1].floating);
    return {
      walk,
      teleports: boss
        ? s.stage >= u.bossTeleport
          ? s.spec.midboss
            ? 1
            : 2
          : 0
        : walk && s.stage >= u.normalTeleport
          ? s.stage < u.secondNormalTeleport
            ? 1
            : 2
          : 0,
      boss,
    };
  }
  const bossActive = (s) => unlocked(s).boss;
  function usesWalkBudget(s) {
    const { boss, normal } = unlocked(s);
    return boss || normal;
  }
  function remainingWalk(s) {
    return Math.max(
      0,
      rules.walk - (s.enemyWalkRound === s.round ? s.enemyWalkUsed || 0 : 0),
    );
  }
  function bounds(s, side) {
    const u = s.units[side],
      h = u.hitShape || { x: 0, y: -22, rx: 40, ry: 31 };
    const c = G.actorPoint(s, side, h.x || 0, h.y),
      rx = Math.max(rules.bodyWidth / 2, h.rx);
    const parts = G.actorParts(s, side).filter((p) => p.hp > 0);
    return {
      left: Math.min(
        c.x - rx,
        ...parts.map(
          (p) => u.x + p.dx - Math.max(p.radius || 0, p.armorRadius || 0),
        ),
      ),
      right: Math.max(
        c.x + rx,
        ...parts.map(
          (p) => u.x + p.dx + Math.max(p.radius || 0, p.armorRadius || 0),
        ),
      ),
      center: c,
    };
  }
  function gap(s) {
    const a = bounds(s, 0),
      b = bounds(s, 1);
    return Math.max(b.left - a.right, a.left - b.right);
  }
  function at(s, p) {
    return { ...s, units: [s.units[0], { ...s.units[1], ...p }] };
  }
  const side = (s) => Math.sign(s.units[1].x - s.units[0].x);
  function walkLegal(beforeGap, beforeSide, s) {
    return (
      beforeSide * side(s) >= 0 &&
      gap(s) >= Math.min(rules.minGap, beforeGap) - 1e-7
    );
  }
  function restore(u, original) {
    for (const key of Object.keys(u)) if (!(key in original)) delete u[key];
    Object.assign(u, original);
  }
  // Only voluntary enemy movement uses this guard; player and forced movement
  // retain the shared geometry's original rules.
  function move(s, amount) {
    const u = s.units[1],
      start = u.x;
    let remaining = G.clamp(amount, -1000, 1000);
    while (Math.abs(remaining) > 0.01) {
      const old = { ...u },
        before = gap(s),
        direction = side(s),
        dx = G.clamp(remaining, -2, 2);
      G.move(s, 1, dx);
      if (!walkLegal(before, direction, s)) {
        restore(u, old);
        break;
      }
      const moved = u.x - old.x;
      if (Math.abs(moved) < 0.01) break;
      remaining -= moved;
      if (u.animation?.fall && u.animation !== old.animation) break;
    }
    return u.x - start;
  }
  function comfort(distance) {
    if (distance < rules.minGap) return 0;
    if (distance < rules.preferredMin)
      return (
        0.5 +
        (0.5 * (distance - rules.minGap)) / (rules.preferredMin - rules.minGap)
      );
    return Math.max(
      0,
      1 - Math.max(0, distance - rules.preferredMax) / rules.farRange,
    );
  }
  function score(attack, incoming, distance) {
    const strength = (p) =>
      (0.5 * p.hits) / p.samples + (0.5 * p.damage) / (1 + p.damage);
    return (
      policy.attackWeight * strength(attack) +
      policy.defenseWeight * (1 - strength(incoming)) +
      policy.distanceWeight * comfort(distance)
    );
  }
  function choose(rows, stage, random) {
    const sorted = [...rows].sort(
      (a, b) => b.score - a.score || (b.gap || 0) - (a.gap || 0),
    );
    const count = Math.min(profile(stage).choices, sorted.length);
    return count
      ? sorted[Math.min(count - 1, Math.floor(random() * count))]
      : null;
  }
  function directLane(s, world = s.world) {
    // Height alone is not cover. Both direct firing segments must be open;
    // attached armor is excluded by the caller's terrain view.
    const centers = [bounds(s, 0).center, bounds(s, 1).center];
    return [0, 1].every((i) => {
      const u = s.units[i],
        target = centers[1 - i],
        theta = Math.atan2(target.y - u.y, target.x - u.x) - (u.slope || 0);
      const angle =
        ((u.facing === 1 ? -theta : theta - Math.PI) * 180) / Math.PI;
      return G.lineClear(world, G.muzzle(s, i, angle), target);
    });
  }
  function spread(rows, count) {
    const sorted = [...rows].sort((a, b) => a.x - b.x || a.y - b.y);
    if (sorted.length <= count) return sorted;
    return Array.from(
      { length: count },
      (_, i) =>
        sorted[Math.round((i * (sorted.length - 1)) / Math.max(1, count - 1))],
    );
  }
  const api = {
    rules,
    policy,
    capabilities,
    bossActive,
    usesWalkBudget,
    remainingWalk,
    profile,
    bounds,
    gap,
    at,
    side,
    walkLegal,
    restore,
    move,
    comfort,
    score,
    choose,
    directLane,
    spread,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcEnemyPosition = api;
})(globalThis);
