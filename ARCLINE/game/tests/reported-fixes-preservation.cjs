"use strict";
// Preserve old evidence exactly while the user-authorized delta is pinned and tested separately.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict"),
  vm = require("node:vm");
const manifest = require("../../design/stage_reviews/STAGES_REPORTED_FIXES_20261108.json"),
  root = path.resolve(__dirname, "../..");
const plain = (x) => JSON.parse(JSON.stringify(x)),
  sha = (x) => crypto.createHash("sha256").update(x).digest("hex");
const rows = manifest.stages.map((row) => {
  const bytes = fs.readFileSync(path.join(root, row.source));
  assert.equal(
    sha(bytes),
    row.sourceSha256,
    "pinned explicit map change " + row.stage,
  );
  return JSON.parse(bytes);
});
function level(s) {
  const old = rows.find((r) => r.stage === s.id)?.before.runtime;
  const result = plain(old || s);
  result.pickups = result.pickups.map((p) => {
    const prior = manifest.pickupVerificationChanges.find(
      (r) => r.before.placementId === p.placementId,
    );
    return prior ? { ...p, verification: plain(prior.before.verification) } : p;
  });
  return result;
}
function blueprint(s) {
  return rows.find((r) => r.stage === s.stage)?.before.blueprint || s;
}
function pickups(ps) {
  return ps.map(
    (p) =>
      manifest.pickupVerificationChanges.find(
        (r) => r.before.placementId === p.placementId,
      )?.before || p,
  );
}
function source(file, bytes) {
  let text = bytes.toString();
  const patch = manifest.sourcePatches[file];
  if (patch) {
    assert.equal(
      sha(bytes),
      patch.afterSha256,
      "only the pinned reported cloud fix " + file,
    );
    for (const edit of patch.edits) {
      assert.equal(
        text.split(edit.after).length - 1,
        1,
        "one exact cloud source block " + file,
      );
      text = text.replace(edit.after, () => edit.before);
    }
    assert.equal(
      sha(text),
      patch.beforeSha256,
      "all other source bytes unchanged " + file,
    );
  }
  if (file === "levels.js") {
    const module = { exports: {} };
    vm.runInNewContext(text, { module });
    const all = Array.from(module.exports, level);
    const from = text.indexOf("const levels=") + "const levels=".length,
      to = text.indexOf(";\nif(typeof module");
    assert(from > 0 && to > from);
    text = text.slice(0, from) + JSON.stringify(all) + text.slice(to);
  }
  return Buffer.from(text);
}
const replayKey = (r) =>
  [r.stage, r.id, r.difficulty, r.seed, !!r.special].join("/");
let replays;
function currentReplay(row) {
  if (!replays)
    replays = require("../../evidence/reported-fixes-0281/REPLAYS.json").rows;
  return replays.find((r) => r.key === replayKey(row)) || row;
}
module.exports = { manifest, level, blueprint, pickups, source, currentReplay };
