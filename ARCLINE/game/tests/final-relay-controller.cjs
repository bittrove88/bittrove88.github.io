"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

// Replay player inputs through the real controller. Enemy choices, shots,
// contacts, camera waits and handoffs are produced by the application itself.
module.exports = async function replayFinalRelay(page, route, ok, out) {
  await page.evaluate(() => {
    const nativeLaunch = E.launch,
      nativeResolve = E.resolve,
      nativeApply = E.applyEvents;
    const entries = new WeakMap();
    window.relayAudit = {
      launches: [],
      resolved: [],
      phases: [],
      contactFrames: 0,
    };
    E.launch = function (state, ...args) {
      const before = state.units.map((u) => u.hp);
      const plan = nativeLaunch(state, ...args);
      if (state === s && plan) {
        const row = {
          owner: s.characterId,
          map: s.finalTeam.map,
          round: s.round,
          side: plan.side,
          echo: !!plan.echo,
          weapon: plan.weaponId,
          damage: [...plan.damage],
          before,
          quota: s.finalTeam.damage[s.characterId],
        };
        entries.set(plan, row);
        relayAudit.launches.push(row);
      }
      return plan;
    };
    E.applyEvents = function (state, plan, time, ...args) {
      const result = nativeApply(state, plan, time, ...args),
        row = entries.get(plan);
      if (state === s && row) {
        for (const side of [0, 1]) {
          const sum = plan.events
            .filter(
              (e) => e.type === "damage" && e.unit === side && e.t <= time,
            )
            .reduce((n, e) => n + e.value, 0);
          const quota =
            side === 1 && plan.side === 0
              ? s.spec.finalBattle.requiredDamage - row.quota
              : Infinity;
          const expected = Math.min(
            sum,
            row.damage[side],
            row.before[side],
            quota,
          );
          if (
            Math.abs(row.before[side] - state.units[side].hp - expected) > 1e-6
          )
            throw Error(
              `Contact-time HP mismatch: ${row.owner}/${row.weapon}/${side} at ${time}`,
            );
        }
        relayAudit.contactFrames++;
      }
      return result;
    };
    E.resolve = function (state, plan, ...args) {
      const result = nativeResolve(state, plan, ...args);
      const row = entries.get(plan);
      if (state === s && row) {
        const remaining = s.spec.finalBattle.requiredDamage - row.quota;
        const expected =
          plan.side === 0 ? Math.min(row.damage[1], remaining) : row.damage[1];
        // This fixture carries no drain weapon or healing skill. The comparison
        // includes frame-by-frame contact application before resolve is called.
        for (const side of [0, 1]) {
          const damage = side === 1 ? expected : row.damage[0];
          const actual = row.before[side] - state.units[side].hp;
          // Enemy self-hits can exhaust displayed boss HP before all ten quotas
          // are earned. The relay guard must keep that unfinished battle alive.
          if (
            side === 1 &&
            row.before[side] - damage <= 1e-9 &&
            !ArcFinalTeam.complete(state)
          ) {
            const remainingQuotas = state.spec.finalBattle.order.reduce(
              (sum, id) =>
                sum +
                Math.max(
                  0,
                  state.spec.finalBattle.requiredDamage -
                    state.finalTeam.damage[id],
                ),
              0,
            );
            if (
              state.result === "win" ||
              Math.abs(state.units[1].hp - remainingQuotas) > 1e-6
            )
              throw Error(
                "Unfinished relay did not retain its remaining quotas",
              );
            row.quotaGuard = true;
            continue;
          }
          if (Math.abs(actual - damage) > 1e-6)
            throw Error(
              `Controller HP mismatch: ${row.owner}/${row.weapon}/${side}: ${actual}/${damage}`,
            );
        }
        relayAudit.resolved.push({
          ...row,
          after: state.units.map((u) => u.hp),
        });
        entries.delete(plan);
      }
      return result;
    };
    window.relayTick = (count) => {
      for (let i = 0; i < count; i++) {
        const before = s.phase;
        update(1 / 30);
        if (relayAudit.phases.at(-1) !== s.phase)
          relayAudit.phases.push(s.phase);
        if (
          i % 6 === 0 ||
          before !== s.phase ||
          ["cpuFocus", "cpuEchoFocus", "cpuTeleport", "transition"].includes(
            s.phase,
          )
        )
          draw();
        if (
          transition?.kind === "final-travel" ||
          canAim() ||
          s.phase === "over" ||
          (s.phase === "cpu" && !cpuReady)
        )
          break;
      }
      return {
        ready: canAim(),
        phase: s.phase,
        result: s.result,
        travel: transition?.kind === "final-travel",
        map: s.finalTeam.map,
        waitCPU: s.phase === "cpu" && !cpuReady,
      };
    };
  });

  const visited = new Set([0]),
    travelMaps = new Set();
  let won = false;
  for (const [index, action] of route.actions.entries()) {
    await page.evaluate((action) => {
      if (!canAim() || s.turn !== 0)
        throw Error("Replay attempted outside player control");
      if (s.characterId !== action.owner)
        throw Error("Replay owner mismatch: " + s.characterId);
      if (![action.input, action.angle, action.power].every(Number.isFinite))
        throw Error("Nonfinite replay input");
      E.move(s, 0, action.input);
      if ((s.walkUsed || 0) > E.movementLimit + 1e-6)
        throw Error("Illegal cumulative walking");
      const selected = action.teleport
        ? E.selectTeleport(s)
        : E.selectWeapon(s, action.weapon);
      if (!selected) throw Error("Unavailable replay weapon: " + action.weapon);
      if (
        action.angle < E.minimumAngle(s) ||
        action.angle > E.maximumAngle(s) ||
        action.power < 20 ||
        action.power > 100
      )
        throw Error("Illegal replay aim/power");
      s.angle = action.angle;
      s.power = action.power;
      launch();
      if (!shot || shot.side !== 0)
        throw Error("Controller rejected player launch");
    }, action);

    let ready = false;
    for (let tick = 0; tick < 400; tick++) {
      const state = await page.evaluate(() => relayTick(24));
      visited.add(state.map);
      if (state.travel && !travelMaps.has(state.map)) {
        travelMaps.add(state.map);
        ok(
          await page.evaluate(
            () => !canAim() && $("fire").disabled && s.time === 2.2,
          ),
          "collapse freezes battle input",
        );
        const physical = () =>
          page.evaluate(() =>
            JSON.stringify({
              units: s.units.map((u) => ({
                x: u.x,
                y: u.y,
                hp: u.hp,
                parts: u.parts,
              })),
              world: s.world,
              damage: s.finalTeam.damage,
              shots: s.shotCount,
            }),
          );
        const before = await physical();
        await page.evaluate(() => {
          update(0.72);
          draw();
        });
        ok(
          await page.evaluate(
            () =>
              ArcFinalTravel.frame(s, transition).world.solids.length >
              transition.world.solids.length,
          ),
          "terrain visibly breaks into pieces",
        );
        await page.screenshot({
          path: path.join(out, "collapse-to-map" + state.map + ".png"),
        });
        await page.evaluate(() => {
          update(0.95);
          draw();
        });
        await page.screenshot({
          path: path.join(out, "arrival-map" + state.map + ".png"),
        });
        ok(
          (await physical()) === before,
          "travel animation preserves collision, HP and progress",
        );
        await page.evaluate(() => {
          update(0.6);
          draw();
        });
        ok(
          await page.evaluate(
            () =>
              canAim() &&
              transition === null &&
              bgm.state().id === "FINAL_BOSS",
          ),
          "arrival restores input and keeps music",
        );
      }
      if (state.result === "lose" || state.result === "draw")
        throw Error(
          `Replay failed at player input ${index + 1}: ${state.result}`,
        );
      if (state.phase === "over") {
        won = state.result === "win";
        ready = true;
        break;
      }
      if (state.ready || state.travel) {
        ready = true;
        break;
      }
      if (state.waitCPU)
        await page.waitForFunction(
          () => cpuReady !== null || s.phase !== "cpu",
          null,
          { timeout: 30000 },
        );
    }
    assert(ready, "Controller stalled after player input " + (index + 1));
    if (won) break;
  }

  ok(
    won &&
      (await page.evaluate(
        () => s.result === "win" && ArcFinalTeam.complete(s),
      )),
    "real controller completes ten-machine relay",
  );
  ok(
    [...visited].join(",") === "0,1,2,3" && travelMaps.size === 3,
    "all four arenas and three travels reached",
  );
  const audit = await page.evaluate(() => ({
    ...relayAudit,
    errors: platformStatus.errors,
    jobs: platformStatus.cpuJobs,
    order: s.spec.finalBattle.order,
    damage: s.finalTeam.damage,
    requiredDamage: s.spec.finalBattle.requiredDamage,
    finalOwner: s.characterId,
  }));
  ok(
    audit.order.every(
      (id) => audit.damage[id] >= audit.requiredDamage - 1e-7,
    ) && audit.finalOwner === "gun",
    "every machine earns its own full quota, ending with Gun",
  );
  ok(
    audit.launches.some((p) => p.side === 1) &&
      audit.launches.some((p) => p.echo),
    "autonomous main-body and echo shots occur",
  );
  ok(
    audit.phases.includes("cpuMove") && audit.phases.includes("cpuTeleport"),
    "autonomous walking and teleport occur",
  );
  ok(
    audit.phases.includes("cpuFocus") && audit.phases.includes("cpuEchoFocus"),
    "main-body and echo camera focus execute",
  );
  ok(
    audit.jobs.length > 0 && audit.jobs.every((j) => j.worker),
    "all actual enemy decisions use Worker",
  );
  assert.deepEqual(audit.errors, []);
  await page.evaluate(() => {
    ArcStoryView.finishResultText();
    return save.pending;
  });
  await page.waitForFunction(() => !$("resume").disabled);
  ok(
    await page.evaluate(
      () => save.data.cleared === 100 && save.data.chapterRun === null,
    ),
    "completed relay is persisted",
  );

  // Re-open the real saved data before moving the original page to the ending.
  const reloaded = await page.context().newPage();
  try {
    await reloaded.goto(page.url());
    await reloaded.waitForFunction(() => save.ready);
    ok(
      await reloaded.evaluate(
        () => save.data.cleared === 100 && save.data.chapterRun === null,
      ),
      "completed progress survives a real page load",
    );
  } finally {
    await reloaded.close();
  }
  await page.locator("#resume").click();
  await page.waitForFunction(
    () => ArcStoryView.state?.ending && bgm.state().id === "ENDING",
  );
  ok(true, "ending follows the actual victory");
  return audit;
};
