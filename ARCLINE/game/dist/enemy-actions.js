(function (root) {
  "use strict";
  const B =
    typeof module !== "undefined"
      ? require("./boss-actions.js")
      : root.ArcBossActions;
  const Position =
    typeof module !== "undefined"
      ? require("./enemy-position.js")
      : root.ArcEnemyPosition;
  function create({
    G,
    N,
    trajectory,
    solve,
    cpuPlan,
    seeded,
    legacyMove,
    afterTurn,
  }) {
    const rule = Position.capabilities,
      policy = Position.policy;
    const stats = (s) => ({
      turns: 0,
      walkMisses: 0,
      opportunityMisses: 0,
      blocked: 0,
      teleports: 0,
      cooldown: 0,
      ...(B.active(s) ? B.tactics(s) : s.enemyTactics),
    });
    function clone(s) {
      return {
        ...s,
        units: s.units.map((u) => ({
          ...u,
          parts: u.parts.map((p) => ({ ...p })),
        })),
        effects: { ...s.effects },
        pendingChanges: [...s.pendingChanges],
        finalAttackPattern: s.finalAttackPattern && { ...s.finalAttackPattern },
        turn: 1,
        phase: "cpu",
      };
    }
    function at(s, p) {
      const t = clone(s);
      if (B.active(s)) B.relocate(t, p);
      else Object.assign(t.units[1], p);
      t.units[1].facing = B.active(t)
        ? B.facing(t, p.x)
        : t.units[0].x >= p.x
          ? 1
          : -1;
      return t;
    }
    function playerView(s) {
      return {
        ...s,
        mode: "W01",
        weaponId: "W01",
        selectedSkill: null,
        teleportMode: false,
        angle: 48,
        power: 70,
        units: s.units.map((u, i) =>
          i === 0 ? { ...u, facing: s.units[1].x >= u.x ? 1 : -1 } : u,
        ),
      };
    }
    function threat(s, shot, side) {
      return (
        shot.damage[1 - side] +
        (side === 0
          ? s.units[1].parts.reduce(
              (n, p, i) =>
                n +
                0.8 *
                  (p.breakHits
                    ? (shot.partHits?.[i] || 0) / p.breakHits
                    : shot.partDamage?.[i] || 0),
              0,
            )
          : 0)
      );
    }
    function probe(s, side = 1) {
      if (!side) s = playerView(s);
      const foe = N.forSpec(s.spec),
        a = side ? foe.attack || {} : {},
        lo = Math.max(-8, a.minAngle ?? -8),
        hi = Math.min(84, a.maxAngle ?? 84),
        angles = Position.profile(s.stage).angles;
      let hits = 0,
        damage = 0;
      for (let i = 0; i < angles; i++)
        for (const power of [35, 65, 95]) {
          const shot = trajectory(
            s,
            side,
            lo + ((hi - lo) * i) / (angles - 1),
            power,
            {
              weaponId: a.weaponId || "W01",
              skill: null,
              ...(a.curve ? { curve: a.curve } : {}),
            },
          );
          const amount = threat(s, shot, side);
          if (amount > policy.hitThreshold && shot.damage[side] < amount) {
            hits++;
            damage = Math.max(damage, amount);
          }
        }
      return {
        hits,
        damage,
        samples: angles * 3,
        value: damage * 2 + hits / (angles * 3),
      };
    }
    function assess(s, p) {
      const attack = probe(s),
        incoming = probe(s, 0),
        gap = Position.gap(s);
      return {
        p,
        state: s,
        attack,
        incoming,
        gap,
        score: Position.score(attack, incoming, gap),
        direct: Position.directLane(s, B.terrain(s)),
      };
    }
    function solution(s, side = 1) {
      let a = side
        ? N.forSpec(s.spec).attack || {}
        : { weaponId: "W01", skill: null };
      let best = solve(s, side, a);
      if (
        side &&
        best.score <= policy.routeThreshold &&
        Object.keys(a).length
      ) {
        a = {};
        best = solve(s, side, a);
      }
      return { ...best, settings: a };
    }
    function aimProbe(s, side, aim, angles = [-3, 0, 3], powers = [-8, 0, 8]) {
      let hits = 0,
        damage = 0;
      if (aim.score > policy.routeThreshold)
        for (const da of angles)
          for (const dp of powers) {
            const shot = trajectory(
              s,
              side,
              Math.max(-8, Math.min(84, aim.angle + da)),
              Math.max(20, Math.min(100, aim.power + dp)),
              {
                ...aim.settings,
                weaponId: aim.settings.weaponId || "W01",
                skill: null,
              },
            );
            const amount = threat(s, shot, side);
            if (amount > policy.hitThreshold && shot.damage[side] < amount) {
              hits++;
              damage = Math.max(damage, amount);
            }
          }
      const samples = angles.length * powers.length;
      return { hits, damage, samples, value: damage * 2 + hits / samples };
    }
    function* inspect(c) {
      const own = solution(c.state);
      yield;
      if (own.score <= policy.routeThreshold)
        return { ...c, canAttack: false, canCounter: false };
      const defense = playerView(c.state),
        other = solution(defense, 0);
      yield;
      const attack = aimProbe(c.state, 1, own),
        incoming = aimProbe(defense, 0, other),
        narrow = aimProbe(defense, 0, other, [-1, 0, 1], [-2, 0, 2]);
      return {
        ...c,
        attack,
        incoming,
        score: Position.score(attack, incoming, c.gap),
        canAttack: own.score > policy.routeThreshold,
        canCounter:
          other.score > policy.routeThreshold &&
          narrow.hits >= policy.counterHits,
      };
    }
    function walkCandidates(s) {
      const u = s.units[1],
        budget = Position.remainingWalk(s),
        micro = N.forSpec(s.spec).move || 0,
        seen = new Set(),
        rows = [];
      for (const dx of [
        Position.rules.walk,
        -Position.rules.walk,
        100,
        -100,
        60,
        -60,
        micro,
        -micro,
      ]) {
        const t = clone(s);
        (B.active(t) ? B.move : Position.move)(
          t,
          Math.max(-budget, Math.min(budget, dx)),
        );
        const p = t.units[1];
        if (
          Math.abs(p.x - u.x) < 12 ||
          Math.abs(p.x - u.x) > budget + 0.001 ||
          !(B.active(s) ? B.fits(t) : G.clearBody(s.world, p)) ||
          seen.has(Math.round(p.x))
        )
          continue;
        seen.add(Math.round(p.x));
        rows.push({
          x: p.x,
          y: p.y,
          slope: p.slope,
          surface: p.surface,
          ...(p.floating ? { floating: true } : {}),
        });
      }
      return rows;
    }
    function supported(s, p) {
      if (B.active(s) && (p.floating || s.units[1].floating))
        return B.fits(at(s, p));
      if (B.active(s) && !B.fits(at(s, p))) return false;
      const span = 25 * Math.tan(G.maxSlope) + 2;
      return (
        G.clearBody(s.world, p) &&
        G.walkable(p) &&
        !!G.surfaceAt(s.world, p.x - 25, p.y, span) &&
        !!G.surfaceAt(s.world, p.x + 25, p.y, span)
      );
    }
    // Planning and application are separate checks, using one landing rule.
    function landingFuture(s, p) {
      const future = afterTurn(at(s, p));
      return Math.hypot(future.units[1].x - p.x, future.units[1].y - p.y) > 2 ||
        !supported(future, future.units[1]) ||
        Position.gap(future) < Position.rules.minGap
        ? null
        : future;
    }
    function teleportCandidates(s) {
      const u = s.units[1],
        other = s.units[0],
        out = [],
        seen = new Set();
      for (const f of (B.active(s) ? B.terrain(s) : s.world).surfaces)
        for (let i = 1; i < f.points.length; i++) {
          const a = f.points[i - 1],
            b = f.points[i],
            length = Math.abs(b.x - a.x);
          if (length < 45) continue;
          const count = Math.min(
            B.active(s) ? 48 : 8,
            Math.max(1, Math.ceil(length / (B.active(s) ? 60 : 120))),
          );
          const samples = Array.from(
            { length: count },
            (_, j) => (j + 0.5) / count,
          );
          if (B.active(s))
            samples.push(
              ...[
                35,
                s.units[1].hitShape?.rx || 35,
                length / 2,
                length - 35,
                length - (s.units[1].hitShape?.rx || 35),
              ]
                .filter((x) => x > 0 && x < length)
                .map((x) => x / length),
            );
          for (const ratio of samples) {
            const x = a.x + (b.x - a.x) * ratio,
              y = a.y + (b.y - a.y) * ratio,
              p =
                B.active(s) && u.floating
                  ? {
                      x: G.clamp(x, u.range[0], u.range[1]),
                      y: u.y,
                      slope: 0,
                      floating: true,
                    }
                  : G.safePosition(
                      B.active(s) ? B.terrain(s) : s.world,
                      x,
                      y,
                      other,
                      u.range,
                    );
            if (
              !p ||
              Math.abs(p.x - u.x) < 160 ||
              Position.gap(
                Position.at(s, {
                  ...p,
                  facing: B.active(s)
                    ? B.facing(s, p.x)
                    : other.x >= p.x
                      ? 1
                      : -1,
                }),
              ) < Position.rules.minGap ||
              seen.has(Math.round(p.x)) ||
              !supported(s, p)
            )
              continue;
            seen.add(Math.round(p.x));
            out.push(p);
          }
        }
      const limit = B.active(s) ? 32 : 16;
      const direct = [],
        covered = [];
      for (const p of out) {
        const t = Position.at(s, { ...p, facing: other.x >= p.x ? 1 : -1 });
        (Position.directLane(t, B.terrain(s)) ? direct : covered).push(p);
      }
      if (!direct.length || !covered.length) return Position.spread(out, limit);
      const first = Position.spread(
        covered,
        Math.min(covered.length, limit / 2),
      );
      const second = Position.spread(
        direct,
        Math.min(direct.length, limit - first.length),
      );
      return first.concat(
        second,
        Position.spread(
          covered.filter((p) => !first.includes(p)),
          limit - first.length - second.length,
        ),
      );
    }
    function* evaluate(s, random) {
      const trial = clone(s),
        u = trial.units[1],
        from = { x: u.x, y: u.y },
        r = rule(trial);
      if (!r.walk) {
        const target = legacyMove(trial);
        Position.move(trial, target - u.x);
        return { target, plan: cpuPlan(trial, random), action: null };
      }
      if (r.boss) {
        u.facing = B.facing(trial);
        B.refresh(trial);
      }
      // The charging laser is the sole exception to boss repositioning.
      // Echo deferral is a normal turn, so it keeps the usual movement rules.
      if (
        trial.telegraph?.technique === "E_FINAL_4" &&
        trial.bossEchoFiredRound !== trial.round
      ) {
        const st = stats(trial),
          p = { x: u.x, y: u.y, slope: u.slope, surface: u.surface };
        const next = {
          ...st,
          field: B.field(trial),
          turns: st.turns + 1,
          cooldown: Math.max(0, st.cooldown - 1),
        };
        return {
          target: u.x,
          plan: cpuPlan(trial, random),
          action: {
            kind: "shoot",
            from,
            to: p,
            round: trial.round,
            next,
            reason: "final-beam-lock",
          },
        };
      }
      const retreat = Position.gap(trial) < Position.rules.minGap;
      const st = stats(trial),
        rng = seeded(
          ((trial.matchSeed || 0) + trial.round * 8191 + 17077) >>> 0,
        ),
        current = yield* inspect(assess(trial, { x: u.x, y: u.y }));
      yield;
      const blocked = !current.canAttack;
      yield;
      const walking = [];
      for (const p of walkCandidates(trial)) {
        let future = at(trial, p);
        if (Position.profile(trial.stage).forecastWalk) {
          future = afterTurn(future);
          if (
            Math.hypot(future.units[1].x - p.x, future.units[1].y - p.y) > 2 ||
            !supported(future, p)
          )
            continue;
        }
        const c = assess(future, p);
        if (!retreat || c.gap > current.gap + policy.retreatGain)
          walking.push(c);
        yield;
      }
      const walkOptions = [];
      const rankedWalk = [...walking].sort((a, b) =>
        retreat ? b.gap - a.gap || b.score - a.score : b.score - a.score,
      );
      for (const raw of rankedWalk) {
        const c = yield* inspect(raw);
        if (
          c.canAttack &&
          c.canCounter &&
          (retreat ||
            c.attack.value >=
              current.attack.value - policy.walkAttackTolerance ||
            c.score > current.score + policy.walkScoreGain)
        )
          walkOptions.push(c);
        if (
          (retreat && walkOptions.length) ||
          walkOptions.length >= Position.profile(trial.stage).choices
        )
          break;
      }
      const walk = retreat
        ? walkOptions[0] || null
        : Position.choose(walkOptions, trial.stage, rng);
      let chosen = null,
        opportunity = false,
        reason = "current-shot";
      if (r.teleports > st.teleports && st.cooldown === 0) {
        const candidates = [];
        for (const p of teleportCandidates(trial)) {
          const future = landingFuture(trial, p);
          // A bridge or gate may change as soon as the player gets control.
          if (!future) continue;
          candidates.push(assess(future, p));
          yield;
        }
        // The family roll selects a destination, never whether to teleport.
        // A missing or unfair family falls back to the other legal family.
        const direct = rng() < Position.profile(trial.stage).directChance;
        let landing = null;
        for (const family of [direct, !direct]) {
          const pool = candidates
            .filter((c) => c.direct === family)
            .sort((a, b) => b.score - a.score);
          const options = [];
          const search = retreat
            ? pool
            : pool.slice(0, Position.profile(trial.stage).searchLimit);
          for (const raw of search) {
            const c = yield* inspect(raw);
            const improvesAttack =
              c.attack.value >
              Math.max(current.attack.value, walk?.attack.value || 0) +
                policy.teleportAttackGain;
            const improvesPosition =
              c.score >
              Math.max(current.score, walk?.score || 0) +
                policy.teleportScoreGain;
            if (
              c.canAttack &&
              c.canCounter &&
              (retreat || improvesAttack || improvesPosition)
            )
              options.push(c);
            if (options.length >= Position.profile(trial.stage).choices) break;
          }
          if (options.length) {
            landing = Position.choose(options, trial.stage, rng);
            break;
          }
        }
        if (landing) {
          opportunity = true;
          const required =
            retreat ||
            (blocked && st.blocked >= 1) ||
            st.opportunityMisses >= 2;
          const chance = Math.min(
            0.85,
            0.55 +
              Math.max(
                0,
                landing.attack.value - current.attack.value,
                (landing.score - current.score) * 4,
              ) *
                0.12,
          );
          if (required || rng() < chance) {
            chosen = landing;
            reason = retreat
              ? "close-retreat"
              : required
                ? "repeated-useful-opportunity"
                : "better-combat-position";
          }
        }
      }
      const next = {
        ...st,
        ...(r.boss ? { field: B.field(trial) } : {}),
        turns: st.turns + 1,
        blocked: blocked ? st.blocked + 1 : 0,
        cooldown: Math.max(0, st.cooldown - 1),
        opportunityMisses: opportunity ? st.opportunityMisses + 1 : 0,
      };
      if (chosen) {
        next.teleports++;
        next.cooldown = Position.rules.cooldown;
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
            position: {
              gap: chosen.gap,
              score: chosen.score,
              direct: chosen.direct,
              band: Position.profile(trial.stage).band,
            },
          },
        };
      }
      let p = { x: u.x, y: u.y, slope: u.slope, surface: u.surface };
      if (
        walk &&
        !u.displaced &&
        (retreat || st.walkMisses >= 1 || blocked || rng() < 0.72)
      ) {
        p = walk.p;
        reason = retreat
          ? "spacing-retreat"
          : blocked
            ? "open-firing-line"
            : "reposition";
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
        position:
          walk && p === walk.p
            ? {
                gap: walk.gap,
                score: walk.score,
                direct: walk.direct,
                band: Position.profile(trial.stage).band,
              }
            : null,
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
          (s.enemyWalkRound === s.round && s.enemyWalkUsed > 0) ||
          st.teleports >= r.teleports ||
          st.cooldown > 0 ||
          !teleportCandidates(s).some(
            (p) => Math.hypot(p.x - action.to.x, p.y - action.to.y) < 2,
          )
        )
          return false;
        if (!landingFuture(s, action.to)) return false;
        if (r.boss) {
          const from = { ...u, parts: u.parts.map((p) => ({ ...p })) };
          B.relocate(s, action.to);
          B.spawnEcho(s, from);
          if (s.telegraph)
            s.deferredBossTelegraph = JSON.parse(JSON.stringify(s.telegraph));
        } else Object.assign(u, action.to);
        u.facing = s.units[0].x >= u.x ? 1 : -1;
        u.teleportFlash = { age: 0 };
      } else if (
        !["shoot", "walk-shoot"].includes(action.kind) ||
        Math.abs(action.to.x - u.x) > Position.remainingWalk(s) + 0.001
      )
        return false;
      else {
        const preview = clone(s),
          delta = action.to.x - u.x;
        (r.boss ? B.move : Position.move)(preview, delta);
        if (
          Math.hypot(
            preview.units[1].x - action.to.x,
            preview.units[1].y - action.to.y,
          ) > 2 ||
          (action.kind === "shoot" && Math.abs(delta) > 1)
        )
          return false;
      }
      if (r.boss) {
        u.facing = B.facing(s);
        B.refresh(s);
      }
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
          position: action.position || null,
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
