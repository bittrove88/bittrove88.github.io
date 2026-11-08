"use strict";
const assert = require("node:assert/strict"),
  cp = require("node:child_process"),
  approval = require("../../design/story_emotion_0141/enemy-awareness-0293.json");
// Restore only the three approved prose slots, then compare the entire story.
function story(value) {
  const result = JSON.parse(JSON.stringify(value));
  assert.equal(result.revision, approval.revision);
  assert.equal(
    result.presentation.saveNarrativeVersion,
    approval.saveNarrativeVersion,
  );
  assert.deepEqual(
    approval.changes.map((c) => `${c.collection}/${c.stage}/${c.field}`).sort(),
    ["chapters/41/opening", "chapters/71/opening", "stageClears/41/event"],
  );
  for (const c of approval.changes) {
    const row = result[c.collection].find(
      (r) => (r.start ?? r.stage) === c.stage,
    );
    assert.deepEqual(
      row[c.field],
      c.after,
      "approved bilingual prose " + c.stage + "/" + c.field,
    );
    row[c.field] = c.before;
  }
  result.revision = approval.previousRevision;
  const before = JSON.parse(
    cp.execFileSync(
      "git",
      ["show", approval.base + ":ARCLINE/" + approval.source],
      { encoding: "utf8" },
    ),
  );
  assert.deepEqual(
    result,
    before,
    "all other story data, save namespace and reveal gates are unchanged",
  );
  return result;
}
module.exports = { story };
