"use strict";
const assert = require("node:assert/strict"),
  C = require("../dist/charge-camera.js");
let checks = 0;
const ok = (v, m) => {
    checks++;
    assert.ok(v, m);
  },
  near = (a, b, m) => ok(Math.abs(a - b) < 1e-7, m);
const normal = { x: -100, y: -180, scale: 0.65 },
  unit = { x: 1100, y: 400, hitShape: { y: -44 } },
  frame = { width: 844, top: 50, bottom: 275 };
const before = JSON.stringify({ normal, unit, frame }),
  start = C.echoView(normal, unit, 0, frame),
  close = C.echoView(normal, unit, C.echoPresentation.lead, frame);
assert.deepEqual(start, normal);
checks++;
near(
  close.x + unit.x * close.scale,
  frame.width / 2,
  "focus follows the echo source, not the relocated main body",
);
near(
  close.y + (unit.y - 44) * close.scale,
  (frame.top + frame.bottom) / 2,
  "source sits in usable arena",
);
ok(
  close.scale >= normal.scale && close.scale <= normal.scale * 1.35,
  "bounded source zoom",
);
for (const lastStart of [0, 0.2]) {
  const held = C.echoView(
    normal,
    unit,
    C.echoPresentation.lead + lastStart,
    frame,
    lastStart,
  );
  assert.deepEqual(held, close);
  checks++;
  const restored = C.echoView(
    normal,
    unit,
    C.echoPresentation.lead +
      lastStart +
      C.echoPresentation.flash +
      C.echoPresentation.release,
    frame,
    lastStart,
  );
  assert.deepEqual(restored, normal);
  checks++;
}
let previous = 0;
for (const age of [0, 0.03, 0.06, 0.12, 0.18]) {
  const v = C.echoView(normal, unit, age, frame);
  ok(v.scale >= previous, "smooth approach is monotonic");
  previous = v.scale;
}
near(C.echoCue(0), 1, "new residue starts clearly marked");
ok(C.echoCue(0.5) > 0, "arrival cue lasts through transfer settle");
near(
  C.echoCue(C.echoPresentation.cue),
  0,
  "cue ends without permanent warning",
);
near(C.echoCue(-1), 0, "no cue before creation");
for (const distance of [50, 300, 600, 1000, 2500]) {
  const old = Math.max(0.45, Math.min(1.2, distance / 650)),
    boss = C.transferDuration(distance, true);
  near(
    C.transferDuration(distance),
    old,
    "ordinary enemy transfer retains its timing",
  );
  ok(boss > old, "boss projectile is easier to follow");
  ok(boss >= 0.7 && boss <= 1.6, "bounded presentation delay");
}
near(
  JSON.stringify({ normal, unit, frame }) === before ? 1 : 0,
  1,
  "view helpers never mutate game coordinates",
);
console.log("PASS echo presentation " + checks + " checks");
