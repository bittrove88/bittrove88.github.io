"use strict";
// Reverse only the user-authorized enemy presentation delta for historical guards.
const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  manifest = require("../../design/enemy-motion-0297-scope.json");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function source(file, bytes) {
  const patch = manifest.sourcePatches[file];
  if (!patch) return bytes;
  assert.equal(
    sha(bytes),
    patch.afterSha256,
    "approved enemy motion delta " + file,
  );
  let text = bytes.toString();
  for (const edit of [...patch.edits].reverse()) {
    assert.equal(
      text.split(edit.after).length - 1,
      1,
      "unique enemy motion edit " + file,
    );
    text = text.replace(edit.after, () => edit.before);
  }
  assert.equal(
    sha(text),
    patch.beforeSha256,
    "all other source bytes preserved " + file,
  );
  return Buffer.from(text);
}
module.exports = { source, manifest };
