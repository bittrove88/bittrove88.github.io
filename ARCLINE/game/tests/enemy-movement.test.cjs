"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  cp = require("node:child_process"),
  path = require("node:path"),
  Guard = require("./enemy-motion-preservation.cjs");
const root = path.resolve(__dirname, "../..");
for (const file of [
  "game.js",
  "engine.js",
  "enemy-actions.js",
  "enemy-attacks.js",
  "attack-catalog.js",
  "physics.js",
  "geometry.js",
  "levels.js",
  "combat.js",
  "weapons.js",
  "skills.js",
  "save.js",
  "inventory.js",
  "final-team.js",
  "render.js",
  "effects.js",
]) {
  const current = fs.readFileSync(path.join(root, "game/dist", file));
  assert.deepEqual(
    Guard.source(file, current),
    cp.execFileSync("git", [
      "show",
      Guard.manifest.base + ":ARCLINE/game/dist/" + file,
    ]),
    "preserved gameplay and player teleport " + file,
  );
}
const runtime = require("../runtime.json");
assert.equal(runtime.saveSchema, 8);
assert.equal(runtime.resetVersion, 2);
for (const file of [
  "design/combat_balance.json",
  "game/ui/battle-ui.js",
  "game/ui/battle-catalog.js",
  "game/dist/presentation.js",
  "game/dist/campaign-run.js",
  "game/tools/balance.py",
  "game/dist/encounters.js",
]) {
  assert.deepEqual(
    fs.readFileSync(path.join(root, file)),
    cp.execFileSync("git", ["show", Guard.manifest.base + ":ARCLINE/" + file]),
    "latest main feature preserved " + file,
  );
}
console.log(
  "PASS enemy movement: bounded controller delta; latest-main gameplay, HP/action balance, menu sources and save compatibility preserved",
);
