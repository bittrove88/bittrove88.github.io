/* Recording-only staging. Game physics, weapon definitions and tutorials are unchanged. */
(function (root) {
  "use strict";
  const node = typeof module !== "undefined";
  const E = node ? require("../game/dist/engine.js") : root.ArcEngine;
  const Review = node
    ? require("../game/dist/attack-review-model.js")
    : root.ArcAttackReview;
  const Motion = node
    ? require("../game/dist/attack-motion.js")
    : root.ArcAttackMotion;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const shots = Object.freeze({
    gun: { angle: 32, power: 50, style: "cover arc" },
    hana: { angle: 42, power: 42.5, style: "arched salvo" },
    sora: { angle: 48, power: 67.5, style: "high meteor arc" },
    rico: { angle: 38, power: 42.5, style: "three arched ricochets" },
    rin: { angle: 4, power: 62.5, style: "fast low piercing shot" },
    ban: { angle: 34, power: 45, style: "near-target shockwave arc" },
    hibari: { angle: 32, power: 55, style: "airburst arc" },
    mogu: { angle: 0, power: 80, targetX: 575, style: "low excavation shot" },
    koro: { angle: -12, power: 25, style: "ground rolling and drop" },
    yui: { angle: 44, power: 47.5, style: "near-target gravity arc" },
  });
  function create(id) {
    const shot = shots[id];
    if (!shot) throw Error("Unknown showcase machine " + id);
    const original = Review.create("special:" + id),
      before = clone(original.before);
    if (shot.targetX)
      Object.assign(
        before.units[1],
        E.geometry.safePosition(before.world, shot.targetX, before.units[1].y),
      );
    before.angle = shot.angle;
    before.power = shot.power;
    const plan = E.trajectory(before, 0, shot.angle, shot.power, {
      weaponId: original.row.weaponId,
    });
    const after = clone(before);
    E.resolve(after, plan);
    const paths = plan.bullets.filter((b) => !b.effect).flatMap((b) => b.path);
    const impact = plan.impacts[0],
      target = before.units[1];
    const proof = {
      valid: plan.damage[1] > 0 && plan.damage[0] === 0,
      style: shot.style,
      angle: shot.angle,
      power: shot.power,
      arcRise: before.units[0].y - Math.min(...paths.map((p) => p.y)),
      target: { x: target.x, y: target.y },
      impact: impact && { x: impact.x, y: impact.y },
      impactDistance:
        impact && Math.hypot(impact.x - target.x, impact.y - target.y),
      bounces: plan.events.filter((e) => e.type === "bounce").length,
      destroyed: plan.destroyed,
    };
    if (id === "yui") {
      const well = plan.events.find((e) => e.type === "gravity-well"),
        pull = plan.events.find((e) => e.type === "pull");
      Object.assign(proof, {
        radius: well.radius,
        well: { x: well.x, y: well.y },
        pullFrom: pull.from,
        pullTo: pull.to,
      });
    }
    if (!proof.valid) throw Error("Showcase has no valid native hit: " + id);
    return {
      ...original,
      before,
      after,
      plan,
      motion: Motion.create(plan),
      scene: "site-showcase",
      proof,
    };
  }
  const api = { shots, create };
  if (node) module.exports = api;
  else root.ArcSiteShowcase = api;
})(globalThis);
