"use strict";
// Re-record only user-authorized maps/cloud routes; older accepted evidence stays immutable.
const fs = require("node:fs"),
  path = require("node:path"),
  E = require("../dist/engine.js"),
  Q = require("./approved-map-qa.cjs");
const root = path.resolve(__dirname, "../.."),
  out = process.env.ARCLINE_EVIDENCE_DIR || "/tmp/arcline-fixes-0281";
fs.mkdirSync(out, { recursive: true });
const targets = new Set([
  8,
  12,
  ...E.levels
    .filter((s) =>
      [
        ...s.features,
        ...(s.staticFeatures || []),
        ...Object.values(s.phaseFeatures || {}).flat(),
        ...(s.finalBattle?.maps || []).flatMap((m) => m.features || []),
      ].some((f) => f.type === "C"),
    )
    .map((s) => s.id),
]);
const groups = ["0240", "0241", "0250", "0260", "0270"].map((version) => {
  const dir = path.join(root, "evidence/maps-" + version),
    manifest = require(path.join(dir, "ACCEPTANCE.json"));
  return {
    dir,
    manifest,
    version,
    ids: new Set(
      manifest.geometryChangedStages || manifest.changedStages || [],
    ),
  };
});
const latest = new Map(),
  sources = [];
for (const group of groups) {
  for (const [name] of Object.entries(group.manifest.reports)) {
    if (name === "FINAL100_MATCHES.json") continue;
    for (const row of require(path.join(group.dir, name)).rows) {
      if (!targets.has(row.stage)) continue;
      sources.push({ row, version: group.version });
    }
  }
}
// The current replay suite selects the latest geometry's evidence for each map.
const cases = [];
for (const item of sources) {
  const { row, version } = item;
  const later = groups.filter((g) => g.version > version);
  if (later.some((g) => g.ids.has(row.stage))) continue;
  const key = [row.stage, row.id, row.difficulty, row.seed, !!row.special].join(
    "/",
  );
  if (!latest.has(key)) {
    latest.set(key, null);
    cases.push({ key, ...row });
  }
}
const rows = [];
for (const c of cases) {
  const started = Date.now(),
    row = Q.match(c.stage, {
      id: c.id,
      legacyEnemy: true,
      difficulty: c.difficulty,
      seed: c.seed,
      special: !!c.special,
    });
  rows.push({ key: c.key, ...row });
  fs.writeFileSync(
    path.join(out, "REPLAYS.json"),
    JSON.stringify(
      {
        status: rows.every((r) => r.result === "win") ? "PASS" : "FAIL",
        targetStages: [...targets],
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(c.key, row.result, row.actions.length, Date.now() - started);
  if (row.result !== "win") throw Error("Native route failed " + c.key);
}
const finals = [];
for (const old of require(
  path.join(root, "evidence/maps-0270/FINAL_MATCHES.json"),
).rows) {
  const started = Date.now(),
    row = Q.match(100, {
      id: old.id,
      legacyEnemy: true,
      difficulty: old.difficulty,
      seed: old.seed,
      special: !!old.special,
    });
  finals.push(row);
  fs.writeFileSync(
    path.join(out, "FINAL_MATCHES.json"),
    JSON.stringify(
      {
        status: finals.every((r) => r.result === "win") ? "PASS" : "FAIL",
        rows: finals,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Final",
    row.difficulty,
    row.result,
    row.actions.length,
    Date.now() - started,
  );
  if (row.result !== "win") throw Error("Final route failed");
}
console.log(
  "Recorded",
  rows.length,
  "ordinary routes and",
  finals.length,
  "final relays",
);

const guides = [];
for (const [stage, id] of [
  [8, "gun"],
  [8, "hana"],
  [12, "gun"],
  [12, "koro"],
]) {
  const row = Q.match(stage, {
    id,
    legacyEnemy: true,
    difficulty: "normal",
    seed: 4697,
    special: id !== "gun",
  });
  guides.push(row);
  if (row.result !== "win") throw Error("Guide failed " + stage + "/" + id);
}
fs.writeFileSync(
  path.join(out, "MAP_GUIDES.json"),
  JSON.stringify({ status: "PASS", rows: guides }, null, 2) + "\n",
);
