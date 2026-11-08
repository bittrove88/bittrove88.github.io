"use strict";
// Authoring only: native inputs against the current strategic enemy; no synthetic damage or landing.
const fs = require("node:fs"),
  path = require("node:path"),
  Q = require("./approved-map-qa.cjs"),
  E = require("../dist/engine.js"),
  crypto = require("node:crypto");
const out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-recruit-enemy";
fs.mkdirSync(out, { recursive: true });
const target = new Set([41, 71, 79, 89, 98, 99]),
  rows = [],
  sources = Object.fromEntries(
    [
      "engine.js",
      "enemy-actions.js",
      "geometry.js",
      "physics.js",
      "levels.js",
    ].map((n) => [
      n,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, "../dist", n)))
        .digest("hex"),
    ]),
  );
for (const stage of E.levels
  .filter((l) => l.id >= 40 && l.id < 100 && !E.encounters.guardian(l))
  .map((l) => l.id)) {
  const row = Q.match(stage, { id: "gun", difficulty: "normal", seed: 4697 });
  rows.push(row);
  console.log(
    stage,
    row.result,
    row.actions.length,
    row.enemies.map((e) => e.action?.kind || e.kind),
  );
  const report = {
    status: rows.every((r) => r.result === "win") ? "PASS" : "FAIL",
    scope:
      "Current native engine, normal gun, actual strategic enemy and actual counterattacks. Search-derived inputs, not human win rates.",
    sources,
    rows,
  };
  fs.writeFileSync(
    path.join(out, "ALL_CURRENT_ENEMY_MATCHES.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
const selected = rows.filter((r) => target.has(r.stage));
fs.writeFileSync(
  path.join(out, "CURRENT_ENEMY_MATCHES.json"),
  JSON.stringify(
    {
      status: selected.every((r) => r.result === "win") ? "PASS" : "FAIL",
      scope:
        "Six representative current-AI native matches; selected from the full ordinary-stage run.",
      sources,
      rows: selected,
    },
    null,
    2,
  ) + "\n",
);
if (rows.some((r) => r.result !== "win")) process.exitCode = 1;
