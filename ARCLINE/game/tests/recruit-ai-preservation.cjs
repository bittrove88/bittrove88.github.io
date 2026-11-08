"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  manifest = require("../../design/recruit-art-0292/CHANGE_SCOPE.json");
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function source(file, bytes) {
  bytes = require("./damage-sync-preservation.cjs").source(file, bytes);
  const patch = manifest.sourcePatches[file];
  if (!patch) return bytes;
  // Release builds rewrite import query versions, while the Worker body stays pinned.
  if (file === "cpu-worker.js") {
    const text = bytes.toString(),
      line = text.split("\n").find((l) => l.startsWith("importScripts("));
    const pinned = patch.edits
      .map((e) => e.after)
      .join("\n")
      .match(/\.js\?v=([^']+)/)[1];
    assert(
      line &&
        [...line.matchAll(/\.js\?v=([^']+)/g)].every(
          (m) => m[1] === require("../runtime.json").cacheVersion,
        ),
      "Worker imports use the current cache version",
    );
    bytes = Buffer.from(
      text.replace(
        line,
        line.replace(/(\.js\?v=)[^']+/g, (_, prefix) => prefix + pinned),
      ),
    );
  }
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
