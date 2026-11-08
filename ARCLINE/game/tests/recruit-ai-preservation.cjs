"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  manifest = require("../../design/recruit-art-0282/CHANGE_SCOPE.json");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function source(file, bytes) {
  const patch = manifest.sourcePatches[file];
  if (!patch) return bytes;
  assert.equal(
    sha(bytes),
    patch.afterSha256,
    "exact authorized recruit/audio/enemy patch " + file,
  );
  let s = bytes.toString();
  for (const edit of patch.edits) {
    assert.equal(
      s.split(edit.after).length - 1,
      1,
      "one bounded patch " + file,
    );
    s = s.replace(edit.after, () => edit.before);
  }
  assert.equal(
    sha(s),
    patch.beforeSha256,
    "all other source bytes preserved " + file,
  );
  return Buffer.from(s);
}
module.exports = { source, manifest };
