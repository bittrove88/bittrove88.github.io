(function (root) {
  "use strict";
  function create({
    G,
    N,
    guardian,
    trajectory,
    solve,
    cpuPlan,
    seeded,
    legacyMove,
    afterTurn,
  }) {
    const eligible = (s) =>
      s.stage >= 40 && s.stage < 100 && !guardian(s) && !s.units[1].floating;
    const rule = (s) => ({
      walk: eligible(s),
      teleports: eligible(s) && s.stage >= 71 ? (s.stage < 81 ? 1 : 2) : 0,
    });
    const stats = (s) => ({
      turns: 0,
      walkMisses: 0,
      opportunityMisses: 0,
      blocked: 0,
      teleports: 0,
      cooldown: 0,
      ...s.enemyTactics,
    });
    function clone(s) {
      return {
        ...s,
        units: s.units.map((u) => ({
          ...u,
          parts: u.parts.map((p) => ({ ...p })),
        })),
        turn: 1,
        phase: "cpu",
      };
    }
    function at(s, p) {
      const t = clone(s);
      Object.assign(t.units[1], p);
      t.units[1].facing = t.units[0].x >= p.x ? 1 : -1;
      return t;
    }
    function probe(s) {
      const foe = N.forSpec(s.spec),
        a = foe.attack || {},
        lo = Math.max(-8, a.minAngle ?? -8),
        hi = Math.min(84, a.maxAngle ?? 84);
      let hits = 0,
        damage = 0;
      for (let i = 0; i < 6; i++)
        for (const power of [35, 65, 95]) {
          const shot = trajectory(s, 1, lo + ((hi - lo) * i) / 5, power, {
            weaponId: a.weaponId || "W01",
            ...(a.curve ? { curve: a.curve } : {}),
          });
          if (shot.damage[0] > 0.05 && shot.damage[1] < shot.damage[0]) {
            hits++;
            damage = Math.max(damage, shot.damage[0]);
          }
        }
      return { hits, damage, value: damage * 2 + hits / 18 };
    }
    function exact(s, side = 1) {
      const a = side ? N.forSpec(s.spec).attack || {} : {};
      let best = solve(s, side, a);
      if (side && best.score <= 0.1 && Object.keys(a).length)
        best = solve(s, side);
      return best.score;
    }
    function walkCandidates(s) {
      const u = s.units[1],
        budget = Math.max(
          0,
          140 - (s.enemyWalkRound === s.round ? s.enemyWalkUsed || 0 : 0),
        ),
        micro = N.forSpec(s.spec).move || 0,
        seen = new Set(),
        rows = [];
      for (const dx of [140, -140, 100, -100, 60, -60, micro, -micro]) {
        const t = clone(s);
        G.move(t, 1, Math.max(-budget, Math.min(budget, dx)));
        const p = t.units[1];
        if (
          Math.abs(p.x - u.x) < 12 ||
          Math.abs(p.x - u.x) > budget + 0.001 ||
          !G.clearBody(s.world, p) ||
          seen.has(Math.round(p.x))
        )
          continue;
        seen.add(Math.round(p.x));
        rows.push({ x: p.x, y: p.y, slope: p.slope, surface: p.surface });
      }
      return rows;
    }
    function counterable(s) {
      const p = solve(s, 0);
      if (p.score <= 0.1) return false;
      let hits = 0;
      for (const da of [-1, 0, 1])
        for (const dp of [-2, 0, 2])
          if (
            trajectory(s, 0, p.angle + da, p.power + dp, {
              weaponId: "W01",
              skill: null,
            }).damage[1] > 0.05
          )
            hits++;
      return hits >= 3;
    }
    function supported(s, p) {
      const span = 25 * Math.tan(G.maxSlope) + 2;
      return (
        G.clearBody(s.world, p) &&
        G.walkable(p) &&
        !!G.surfaceAt(s.world, p.x - 25, p.y, span) &&
        !!G.surfaceAt(s.world, p.x + 25, p.y, span)
      );
    }
    function teleportCandidates(s) {
      const u = s.units[1],
        other = s.units[0],
        out = [],
        seen = new Set();
      for (const f of s.world.surfaces)
        for (let i = 1; i < f.points.length; i++) {
          const a = f.points[i - 1],
            b = f.points[i],
            length = Math.abs(b.x - a.x);
          if (length < 45) continue;
          const count = Math.min(8, Math.max(1, Math.ceil(length / 120)));
          for (let j = 0; j < count; j++) {
            const ratio = (j + 0.5) / count,
              x = a.x + (b.x - a.x) * ratio,
              y = a.y + (b.y - a.y) * ratio,
              p = G.safePosition(s.world, x, y, other, u.range);
            if (
              !p ||
              Math.abs(p.x - u.x) < 160 ||
              Math.abs(p.x - other.x) < 250 ||
              Math.hypot(p.x - other.x, p.y - other.y) < 300 ||
              seen.has(Math.round(p.x)) ||
              !supported(s, p)
            )
              continue;
            seen.add(Math.round(p.x));
            out.push(p);
          }
        }
      return out
        .sort((a, b) => Math.abs(a.y - u.y) - Math.abs(b.y - u.y))
        .slice(0, 16);
    }
    function* evaluate(s, random) {
      const trial = clone(s),
        u = trial.units[1],
        from = { x: u.x, y: u.y },
        r = rule(trial);
      if (!r.walk) {
        const target = legacyMove(trial);
        G.move(trial, 1, target - u.x);
        return { target, plan: cpuPlan(trial, random), action: null };
      }
      const st = stats(trial),
        rng = seeded(
          ((trial.matchSeed || 0) + trial.round * 8191 + 17077) >>> 0,
        ),
        current = probe(trial);
      yield;
      const blocked = exact(trial) <= 0.1;
      yield;
      const walking = [];
      for (const p of walkCandidates(trial)) {
        walking.push({ p, ...probe(at(trial, p)) });
        yield;
      }
      walking.sort(
        (a, b) =>
          b.value - a.value || Math.abs(b.p.x - u.x) - Math.abs(a.p.x - u.x),
      );
      const walk = walking.find(
        (c) => c.value >= current.value - 0.05 && (!blocked || c.hits > 0),
      );
      let chosen = null,
        opportunity = false,
        reason = "current-shot";
      if (r.teleports > st.teleports && st.cooldown === 0) {
        const candidates = [];
        for (const p of teleportCandidates(trial)) {
          const future = afterTurn(at(trial, p));
          // A bridge or gate may change as soon as the player gets control.
          if (
            Math.hypot(future.units[1].x - p.x, future.units[1].y - p.y) > 2 ||
            !supported(future, future.units[1])
          )
            continue;
          candidates.push({ p, future, ...probe(future) });
          yield;
        }
        const skill = (trial.stage - 71) / 28;
        candidates.sort(
          (a, b) =>
            b.value +
            Math.max(0, u.y - b.p.y) * 0.0005 * skill -
            (a.value + Math.max(0, u.y - a.p.y) * 0.0005 * skill),
        );
        for (const c of candidates.slice(0, 3)) {
          if (c.value <= Math.max(current.value, walk?.value || 0) + 0.08)
            continue;
          const future = c.future;
          const canAttack = exact(future) > 0.1;
          yield;
          if (!canAttack) continue;
          const canCounter = counterable(future);
          yield;
          if (!canCounter) continue;
          opportunity = true;
          const required =
            (blocked && st.blocked >= 1) || st.opportunityMisses >= 2;
          const chance = Math.min(
            0.85,
            0.55 + (c.value - current.value) * 0.12,
          );
          if (required || rng() < chance) {
            chosen = c;
            reason = required
              ? "repeated-useful-opportunity"
              : "better-firing-position";
          }
          break;
        }
      }
      const next = {
        ...st,
        turns: st.turns + 1,
        blocked: blocked ? st.blocked + 1 : 0,
        cooldown: Math.max(0, st.cooldown - 1),
        opportunityMisses: opportunity ? st.opportunityMisses + 1 : 0,
      };
      if (chosen) {
        next.teleports++;
        next.cooldown = 2;
        next.blocked = 0;
        next.opportunityMisses = 0;
        return {
          target: chosen.p.x,
          plan: null,
          action: {
            kind: "teleport",
            from,
            to: chosen.p,
            round: trial.round,
            next,
            reason,
          },
        };
      }
      let p = { x: u.x, y: u.y, slope: u.slope, surface: u.surface };
      if (
        walk &&
        !u.displaced &&
        (st.walkMisses >= 1 || blocked || rng() < 0.72)
      ) {
        p = walk.p;
        reason = blocked ? "open-firing-line" : "reposition";
        next.walkMisses = 0;
        next.blocked = 0;
      } else next.walkMisses = walk ? st.walkMisses + 1 : 0;
      const action = {
        kind: Math.abs(p.x - u.x) > 1 ? "walk-shoot" : "shoot",
        from,
        to: p,
        round: trial.round,
        next,
        reason,
      };
      return { target: p.x, plan: cpuPlan(at(trial, p), random), action };
    }
    // One deterministic evaluator serves the Worker and the cooperative fallback.
    function plan(s, random) {
      const work = evaluate(s, random);
      let step;
      do {
        step = work.next();
      } while (!step.done);
      return step.value;
    }
    async function planAsync(s, random, options = {}) {
      const work = evaluate(s, random);
      for (;;) {
        if (options.cancelled?.()) return null;
        const step = work.next();
        if (step.done) return step.value;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    function commit(s, action) {
      if (!action) return true;
      const u = s.units[1],
        st = stats(s),
        r = rule(s);
      if (
        !r.walk ||
        s.result ||
        s.turn !== 1 ||
        s.phase !== "cpu" ||
        action.round !== s.round ||
        st.lastRound === s.round ||
        Math.hypot(u.x - action.from.x, u.y - action.from.y) > 2
      )
        return false;
      if (action.kind === "teleport") {
        if (
          st.teleports >= r.teleports ||
          st.cooldown > 0 ||
          !teleportCandidates(s).some(
            (p) => Math.hypot(p.x - action.to.x, p.y - action.to.y) < 2,
          )
        )
          return false;
        Object.assign(u, action.to);
        u.facing = s.units[0].x >= u.x ? 1 : -1;
        u.teleportFlash = { age: 0 };
      } else if (
        !["shoot", "walk-shoot"].includes(action.kind) ||
        Math.abs(action.to.x - u.x) > 140.001
      )
        return false;
      s.enemyTactics = { ...action.next, lastRound: s.round };
      s.enemyActionLog = (s.enemyActionLog || [])
        .concat({
          round: s.round,
          kind: action.kind,
          from: action.from,
          to: action.to,
          teleports: s.enemyTactics.teleports,
          cooldown: s.enemyTactics.cooldown,
          reason: action.reason,
        })
        .slice(-40);
      if (u.displaced) u.displaced--;
      return true;
    }
    return {
      rule,
      plan,
      planAsync,
      commit,
      teleportCandidates,
      walkCandidates,
    };
  }
  const api = { create };
  if (typeof module !== "undefined") module.exports = api;
  else root.ArcEnemyActions = api;
})(globalThis);
