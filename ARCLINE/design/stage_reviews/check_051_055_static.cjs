'use strict';
// Design geometry only; no projectile or combat simulation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const G = require('../../game/dist/geometry.js');
const levels = require('../../game/dist/levels.js');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
const results = [];
for (let n = 51; n <= 55; n++) {
  const p = read(`stage_${String(n).padStart(3, '0')}_proposal_v1.json`);
  const a = p.after, live = levels[n - 1];
  assert.deepEqual(p.before.floors, live.floors);
  assert.deepEqual(p.before.features, live.features);
  assert.deepEqual([p.before.player.x, p.before.player.h], live.spawn[0]);
  assert.deepEqual([p.before.enemy.x, p.before.enemy.h], live.spawn[1]);
  assert.deepEqual(p.before.parts.map(x => x.poly), live.components.map(x => x.poly));
  assert.deepEqual(p.before.pickups, live.pickups);
  for (const [key, value] of Object.entries(p.difficulty.currentRules)) {
    if (key in live) assert.deepEqual(value, live[key]);
  }
  for (const floor of a.floors) {
    for (let i = 1; i < floor.length; i++) assert(floor[i][0] > floor[i - 1][0]);
  }
  for (const part of a.parts) {
    const poly = part.poly.map(x => G.point(...x));
    for (let i = 0; i < poly.length; i++) for (let j = i + 1; j < poly.length; j++) {
      if (j === i + 1 || i === 0 && j === poly.length - 1) continue;
      assert(!G.segment(poly[i], poly[(i + 1) % poly.length], poly[j], poly[(j + 1) % poly.length]), 'Self intersection: ' + part.id);
    }
  }
  const w = G.world({...live, worldWidth: a.width, floors: a.floors,
    components: a.parts.map(x => ({...x, destructible: x.breakable})), features: a.features});
  const checks = [];
  const points = [...Object.entries({player: a.player, enemy: a.enemy}),
    ...p.routeDesign.anchors.map(x => [x.id, x])];
  for (const [name, point] of points) {
    const target = G.point(point.x, point.h), s = G.safePosition(w, target.x, target.y);
    assert(s, `Missing support: ${n} ${name}`);
    assert(Math.abs(s.x - target.x) < .1, `Relocated x: ${n} ${name}`);
    assert(Math.abs(s.y - target.y) < .1, `Relocated y: ${n} ${name}: ${s.y} vs ${target.y}`);
    assert(G.clearBody(w, s));
    if (point.surface) assert(s.surface.startsWith(point.surface), `Wrong support: ${n} ${name}`);
    if (name === 'player' || name === 'enemy') assert(Math.abs(s.slope) * 180 / Math.PI <= 4);
    checks.push({id: name, x: s.x, y: s.y, surface: s.surface,
      slopeDegrees: Number((s.slope * 180 / Math.PI).toFixed(3))});
  }
  if (n === 51 || n === 54) {
    const q = a.player;
    const state = {world: w, units: [{...G.safePosition(w, q.x * 10, 500 - q.h * 10), range: [35, a.width - 35]}, G.point(a.enemy.x, a.enemy.h)], result: null};
    const dx = n === 51 ? 130 : 60;
    assert(Math.abs(G.move(state, 0, dx) - dx) < .1, `Short walk blocked: ${n}`);
  }
  assert.deepEqual(a.pickups.map(x => [x.placementId, x.id, x.amount, x.spawnTurn]),
    live.pickups.map(x => [x.placementId, x.id, x.amount, x.spawnTurn]));
  for (const item of a.pickups) {
    const q = G.point(item.x, item.h);
    for (const [dx, dy] of [[0, 0], [22, 0], [-22, 0], [0, 22], [0, -22]]) {
      assert(!w.solids.some(x => G.inside({x: q.x + dx, y: q.y + dy}, x.poly)), `Capsule embedded: ${n}`);
    }
    assert(item.needsReverification && !item.verification);
  }
  results.push({stage: n, status: 'PASS', floorSegments: a.floors.length,
    components: a.parts.length, anchors: checks, pickups: a.pickups.length});
}
const report = {status: 'PASS', sourceCommit: '5f81de5a159a132fd84be7200fe7611945230718',
  scope: 'Static geometry only. No projectile, teleport-input, combat, or device verification.',
  checks: ['Before maps and protected enemy rules match live levels',
    'Strict floor ordering and non-self-intersecting polygons',
    'Exact spawns, named supports, body clearance, initial slopes <=4 degrees',
    '130px and 60px planned short walks on stages 51/54',
    'Capsule IDs/counts/turns preserved, centre and four 22px cardinal samples clear, old ballistic evidence removed'],
  stages: results};
fs.writeFileSync(path.join(__dirname, 'STAGES_051_055_STATIC_CHECK.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(results.map(x => ({stage: x.stage, status: x.status, supports: x.anchors.length}))));
