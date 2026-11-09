(function (root) {
  "use strict";
  const G =
    typeof module !== "undefined" ? require("./geometry.js") : root.ArcGeometry;
  const rules = Object.freeze({
    bodyWidth: 80,
    minGap: 480,
    preferredMin: 560,
    preferredMax: 800,
  });
  function profile(stage) {
    return stage < 40
      ? { band: 0, angles: 4, choices: 6, directChance: 0.3 }
      : stage < 70
        ? { band: 1, angles: 6, choices: 4, directChance: 0.3 }
        : stage < 90
          ? { band: 2, angles: 8, choices: 3, directChance: 0.2 }
          : { band: 3, angles: 9, choices: 2, directChance: 0.1 };
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
    return Math.max(0, 1 - Math.max(0, distance - rules.preferredMax) / 800);
  }
  function score(attack, incoming, distance) {
    const strength = (p) =>
      (0.5 * p.hits) / p.samples + (0.5 * p.damage) / (1 + p.damage);
    return (
      0.45 * strength(attack) +
      0.45 * (1 - strength(incoming)) +
      0.1 * comfort(distance)
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
