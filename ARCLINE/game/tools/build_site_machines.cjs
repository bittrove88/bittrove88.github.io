"use strict";
// The public cast profile follows the same character, crew and combat sources as the game.
const fs = require("node:fs"),
  path = require("node:path");
const A = require("../dist/characters.js"),
  C = require("../dist/crew.js"),
  B = require("../dist/combat.js");
require("../dist/i18n.js");
const ids = [
  "gun",
  "hana",
  "sora",
  "rico",
  "rin",
  "ban",
  "hibari",
  "mogu",
  "koro",
  "yui",
];
const local = (value) => [value.ja, value.en];
const data = ids.map((id) => {
  const a = A.get(id),
    c = C.get(id),
    b = B.get(id);
  return {
    id,
    role: [a.roleJa, a.role],
    charm: local(c.charm),
    desire: local(c.desire),
    line: local(c.line),
    hp: b.hp,
    stage: c.stage,
    normal: [globalThis.ArcI18n.t(b.normalNote), b.normalNote],
    special: [
      b.special.nameJa +
        "：通常の敵に最大" +
        B.points(b.special.damageCap) +
        "ダメージ。",
      b.specialNote,
    ],
  };
});
const file = path.resolve(__dirname, "../../index.html");
let html = fs.readFileSync(file, "utf8");
const block =
  '<!-- SITE_MACHINES_START -->\n<script id="machineData" type="application/json">' +
  JSON.stringify(data).replace(/</g, "\\u003c") +
  "</script>\n<!-- SITE_MACHINES_END -->";
if (html.includes("<!-- SITE_MACHINES_START -->"))
  html = html.replace(
    /<!-- SITE_MACHINES_START -->[\s\S]*?<!-- SITE_MACHINES_END -->/,
    block,
  );
else html = html.replace("</main>", block + "\n</main>");
fs.writeFileSync(file, html);
console.log("Updated 10 public machine profiles from canonical sources");
