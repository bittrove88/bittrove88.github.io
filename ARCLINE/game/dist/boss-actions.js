(function (root) {
  "use strict";
  const node = typeof module !== "undefined";
  const G = node ? require("./geometry.js") : root.ArcGeometry;
  const Position = node
    ? require("./enemy-position.js")
    : root.ArcEnemyPosition;
  const rules = Object.freeze({
    walk: Position.rules.walk,
    close: Position.rules.minGap,
    cooldown: Position.rules.cooldown,
    echoDamage: 0.25,
    echoBlast: 80,
    echoInterval: 0.2,
  });
  const active = Position.bossActive;
  const field = (s) =>
    s.stage === 100
      ? Math.min(3, Math.floor((s.finalTeam?.index || 0) / 3))
      : 0;
  function rule(s) {
    const boss = active(s),
      r = boss ? Position.capabilities(s) : null;
    return {
      boss,
      walk: boss,
      teleports: r ? r.teleports : 0,
      echo: !!s.spec.boss && s.stage >= Position.rules.unlocks.bossTeleport,
      field: field(s),
    };
  }
  function tactics(s) {
    const old = s.enemyTactics || {};
    return s.stage === 100 && old.field !== field(s)
      ? {
          ...old,
          field: field(s),
          teleports: 0,
          opportunityMisses: 0,
          blocked: 0,
        }
      : old;
  }
  const attachment = (id) =>
    /^shoulder[01](?::|$)/.test(id) ||
    /^front-armor(?::|$)/.test(id) ||
    /^part-armor:/.test(id);
  function terrain(s) {
    if (!s.world.solids.some((o) => attachment(o.id))) return s.world;
    return {
      ...s.world,
      solids: s.world.solids.filter((o) => !attachment(o.id)),
      surfaces: s.world.surfaces.filter((f) => !attachment(f.solidId || f.id)),
    };
  }
  function attachments(s) {
    if (s.stage === 40)
      G.actorParts(s, 1).forEach((p, i) => {
        if (p.hp <= 0) return;
        const u = s.units[1],
          x = u.x + p.dx,
          y = u.y + p.dy,
          d = (i === 0 ? -1 : 1) * -(u.facing || -1);
        s.world.solids.push({
          id: "shoulder" + i,
          armorPart: i,
          kind: "crystal",
          poly: [
            { x: x - 17, y: y - 12 * d },
            { x: x + 17, y: y + 12 * d },
            { x: x + 17, y: y + 12 * d + 5 },
            { x: x - 17, y: y - 12 * d + 5 },
          ],
        });
      });
    if (s.stage === 60 && !s.units[1].parts.some((p) => p.hp <= 0)) {
      const u = s.units[1];
      const dir = u.facing || -1,
        xs = [u.x + dir * 62, u.x + dir * 92].sort((a, b) => a - b);
      s.world.solids.push({
        ...G.rectangle(
          "front-armor",
          xs[0] / 10,
          xs[1] / 10,
          (500 - u.y + 3) / 10,
          (500 - u.y + 58) / 10,
        ),
        armorPart: 0,
      });
    }
    if ([70, 80, 90].includes(s.stage))
      G.actorParts(s, 1).forEach((p, i) => {
        if (p.hp <= 0) return;
        const u = s.units[1],
          r = p.armorRadius;
        s.world.solids.push({
          id: "part-armor:" + i,
          kind: "solid",
          armorPart: i,
          poly: Array.from({ length: 8 }, (_, j) => ({
            x: u.x + p.dx + Math.cos((j * Math.PI) / 4) * r,
            y: u.y + p.dy + Math.sin((j * Math.PI) / 4) * r,
          })),
        });
      });
  }
  function refresh(s) {
    if (![40, 60, 70, 80, 90].includes(s.stage)) return;
    const w = terrain(s);
    s.world = { ...w, solids: [...w.solids], surfaces: [...w.surfaces] };
    attachments(s);
    G.addSolidSurfaces(s.world);
  }
  function shapes(s, side = 1) {
    const u = s.units[side],
      h = u.hitShape || { x: 0, y: -22, rx: 31, ry: 31 };
    return [
      { ...G.actorPoint(s, side, h.x || 0, h.y), rx: h.rx, ry: h.ry },
      ...G.actorParts(s, side)
        .filter((p) => p.hp > 0)
        .map((p) => ({
          x: u.x + p.dx,
          y: u.y + p.dy,
          rx: p.radius,
          ry: p.radius,
        })),
    ];
  }
  function gap(s) {
    const p =
      Math.abs(s.units[0].slope || 0) > (35 * Math.PI) / 180
        ? G.actorPoint(s, 0, 0, -22)
        : { x: s.units[0].x, y: s.units[0].y - 22 };
    return Math.min(
      ...shapes(s).map((b) => {
        if (((p.x - b.x) / b.rx) ** 2 + ((p.y - b.y) / b.ry) ** 2 <= 1)
          return -31;
        let distance = Infinity;
        for (let i = 0; i < 48; i++) {
          const a = (i * Math.PI) / 24,
            z = ((i + 1) * Math.PI) / 24;
          const x = b.x + Math.cos(a) * b.rx,
            y = b.y + Math.sin(a) * b.ry;
          const dx = (Math.cos(z) - Math.cos(a)) * b.rx,
            dy = (Math.sin(z) - Math.sin(a)) * b.ry;
          const t = G.clamp(
            ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy),
            0,
            1,
          );
          distance = Math.min(
            distance,
            Math.hypot(p.x - x - t * dx, p.y - y - t * dy),
          );
        }
        return distance - 31;
      }),
    );
  }
  function fits(s) {
    const u = s.units[1],
      w = terrain(s),
      width = s.spec.worldWidth || 1000;
    const owned = { ...s, world: { solids: [] } };
    attachments(owned);
    const armorClear = owned.world.solids.every((armor) => {
      return !w.solids.some((o) => {
        // Existing armor skirts meet the slope supporting the chassis.
        // Permit that lower contact, while checking the full plate against
        // every other obstacle and its upper half against its own support.
        const support = w.surfaces.some(
          (f) => f.id === u.surface && (f.solidId || f.id) === o.id,
        );
        const poly = armor.poly.map((p) => ({
          x: p.x,
          y: Math.min(u.y - (support ? 26 : 3), p.y),
        }));
        return (
          poly.some((p) => G.inside(p, o.poly)) ||
          o.poly.some((p) => G.inside(p, poly)) ||
          poly.some((a, i) =>
            o.poly.some((b, j) => {
              const hit = G.segment(
                a,
                poly[(i + 1) % poly.length],
                b,
                o.poly[(j + 1) % o.poly.length],
              );
              return hit && hit.t > 0.001 && hit.t < 0.999;
            }),
          )
        );
      });
    });
    return (
      armorClear &&
      shapes(s).every((h) => {
        if (h.x - h.rx < 0 || h.x + h.rx > width) return false;
        const points = [{ x: h.x, y: h.y }];
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI) / 12;
          points.push({
            x: h.x + Math.cos(a) * h.rx * 0.98,
            y: Math.min(u.y - 2, h.y + Math.sin(a) * h.ry * 0.98),
          });
        }
        return !w.solids.some(
          (o) =>
            points.some((p) => G.inside(p, o.poly)) ||
            o.poly.some(
              (p) =>
                p.y < u.y - 3 &&
                ((p.x - h.x) / h.rx) ** 2 + ((p.y - h.y) / h.ry) ** 2 < 0.98,
            ),
        );
      }) &&
      gap(s) > 0
    );
  }
  function facing(s, x = s.units[1].x) {
    const frozen =
      s.stage < 100 &&
      s.telegraph?.technique &&
      s.bossEchoFiredRound !== s.round;
    return (frozen ? s.telegraph.targetX : s.units[0].x) >= x ? 1 : -1;
  }
  function relocate(s, pad) {
    Object.assign(s.units[1], pad, { slope: 0 });
    s.units[1].facing = facing(s, pad.x);
    refresh(s);
  }
  function move(s, amount) {
    const u = s.units[1],
      start = u.x;
    let remaining = G.clamp(amount, -rules.walk, rules.walk);
    while (Math.abs(remaining) > 0.01) {
      const dx = G.clamp(remaining, -2, 2),
        old = { ...u },
        beforeGap = Position.gap(s),
        beforeSide = Position.side(s),
        oldWorld = s.world;
      if (u.floating) u.x = G.clamp(u.x + dx, u.range[0], u.range[1]);
      else {
        s.world = terrain(s);
        G.move(s, 1, dx);
      }
      u.slope = 0;
      u.facing = facing(s);
      if (
        Math.abs(u.x - old.x) < 0.01 ||
        !Position.walkLegal(beforeGap, beforeSide, s) ||
        !fits(s)
      ) {
        Position.restore(u, old);
        s.world = oldWorld;
        break;
      }
      remaining -= u.x - old.x;
      u.facing = facing(s);
      refresh(s);
    }
    return u.x - start;
  }
  function spawnEcho(s, from) {
    if (!rule(s).echo) return;
    const unit = JSON.parse(JSON.stringify(from));
    for (const k of ["animation", "reaction", "recoil", "teleportFlash"])
      delete unit[k];
    s.bossEcho = {
      id: (s.bossEchoSerial || 0) + 1,
      unit,
      round: s.round,
      field: field(s),
      teamSerial: s.finalTeam?.serial,
      shots: s.stage === 100 && field(s) >= 2 ? 2 : 1,
    };
    s.bossEchoSerial = s.bossEcho.id;
  }
  function clearEcho(s, reason) {
    if (!s.bossEcho) return;
    s.bossEchoEffect = {
      id: s.bossEcho.id,
      unit: s.bossEcho.unit,
      field: s.bossEcho.field,
      reason,
      age: 0,
      duration:
        0.2 +
        (reason === "fired" ? (s.bossEcho.shots - 1) * rules.echoInterval : 0),
    };
    delete s.bossEcho;
  }
  function due(s) {
    return (
      !!s.bossEcho &&
      s.round > s.bossEcho.round &&
      !s.result &&
      !s.finalTeam?.pending
    );
  }
  const api = {
    rules,
    active,
    field,
    rule,
    tactics,
    terrain,
    attachments,
    refresh,
    shapes,
    gap,
    fits,
    facing,
    relocate,
    move,
    spawnEcho,
    clearEcho,
    due,
  };
  if (node) module.exports = api;
  else root.ArcBossActions = api;
})(globalThis);
