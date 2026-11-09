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
// Historical0.29.2 guards still unwrap the newly authorized controller change.
const historic = require("./recruit-ai-preservation.cjs");
assert.deepEqual(
  historic.source(
    "game.js",
    fs.readFileSync(path.join(root, "game/dist/game.js")),
  ),
  cp.execFileSync("git", [
    "show",
    historic.manifest.base + ":ARCLINE/game/dist/game.js",
  ]),
);
console.log(
  "PASS enemy movement: bounded controller delta,13 gameplay/player-presentation modules unchanged,save compatibility,historical preservation guard",
);
