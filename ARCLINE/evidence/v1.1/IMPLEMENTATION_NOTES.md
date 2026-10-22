# v1.1 implementation candidate — 0.4.0-rc1

Date: 2026-10-22 JST. Baseline: `125c76a`, pushed to `origin/codex/arcline-v1.1` before implementation. Original repository root and .git retained; no uncommitted user work existed. This branch is based on the original work branch, not a replacement of main. No force push, deployment, Sites access change or YouTube submission.

## Runtime

- `levels.js`: 100 authored floor polylines, overhead polygons, bridges, water/force regions, terminals, supplies, capsules and boss descriptors. `reviewId` / `review` preserve the exact overriding note for all 100 rows. See `LEVEL_REVIEW_TRACE.json` for the runtime mapping; prose is not the collision model.
- `geometry.js`: multiple surfaces and closed solids, swept intersections, wheel contacts, slopes ≤35°, gap/water/ceiling stops, safe BLINK/bridge retreat, actual muzzle/facing after SWAP.
- `physics.js`: one simulation for real shots, local demos and CPU. Water, cloud, reflection, wind/updraft/vent/magnet; phase thickness, rolling, ground waves stopped by gaps, apex split/dive, delayed Twin and finite lifetimes. Transparent contacts precede impact; pickups never destroy the projectile. No damage/AI compensation based on remaining HP or shots.
- `engine.js`: 5 player durability, 3/10 normal, 10/18 boss, half grazes, attack budgets, full part transmission, 3/3/4 final phases with carryover, capped temporary supplies and deferred final resolution. CPU movement is animated and computed in a Worker from already known state. Shooting and environmental state are frozen during each sequence.
- `game.js` / `render.js`: one rover, weapon/appearance loadout, terrain thumbnails and uncollected capsules, gauge 28px above Fire, 0.72s charge, 0.8s hold + 0.6s tail fade, relative angle retained, explicit trial switching, local interruptible demos, multi-pointer cancellation and host pause/audio.
- `save.js`: same storage location/SDK, schema v2 with validated IDs, original progress backup and separate collection unlocks. No save after a failed SDK load. Failed writes stay pending for retry; no server save was introduced.

## Blockout tuning and reasons

Original numerical anchors are initial hypotheses. The following implementation choices are explicit and are not changes to the historical design files:

- Standard graze radius is 64px rather than the initial 60px. Damage remains 1 / 0.5; there is no aim snapping. This small, visible blast adjustment supports a 13-integer-power success band on the narrow bridge approaches. Tests count grazes, not guaranteed direct hits throughout that band.
- Lv4 cover moved near the enemy and lowered to h14 so the right upper rim is actually within BURST range. Lv7/16 include thin fixed shore walkways over a lower water floor. Lv9's channel was lowered; water regions are not buried in an impenetrable floor. Characters stop before submerged ground.
- Lv9/13 ramp crests and Lv93 overhead clearance were adjusted for the 35°/body-height model. The wheel solver handles convex crests without treating their centre height as an impassable step.
- Lv12/18/22/36/56/86/94 enemy anchors move 4 design units toward the route entrance. Lv20 uses a flat h10 boss bank so both sides retain a ballistic route with the bridge open; the original sloping h16 anchor prevented the boss from clearing its own bridge. Damage and durability are unchanged.
- Lv14 Mortar capsule moved from (61,31) to (63,33), onto an actual attack arc; the window was widened. Weapon and boss refill collection plus attack are tested separately from optional appearance detours.
- BLINK candidates use safe floor projection. Several are low/intermediate approaches rather than universal high platforms. Lv91's left bank slope permits distinct low candidates. Lv100 has explicit fixed platforms at the high/intermediate anchors in every phase.
- Lv11 holds the initial bridge state for two actions, then alternates. Lv39/51/58 hold each state for two actions. Lv20 never fixes its bridge on part destruction. Lv30 separates wing/altitude and cloud changes. Lv60 becomes steady weak wind, then stops with a wider core. Lv90 defers cloud and bridge changes while its altitude/part queue is processed.
- Lv31 PULL only; Lv73 SWAP only; Lv81 PUSH/PHASE. Lv55/57, Lv63/65 and Lv75/77 have the revised rest/application roles. Lv83 uses the reflector behind the enemy; Lv85/95 have optional reflection surfaces. Lv99 uses a quieter enemy profile.
- When standing immediately against a wall/ceiling, a shot may require walking back. The free-movement route is checked from sampled states rather than pretending every stationary pose has a direct ballistic solution. Such cases are recorded in CAMPAIGN.json.

## Validation meaning and remaining work

The JSON results are new runs against this implementation. A sampled-state pass is not a proof over all continuous positions, all control timings or every possible combination of prior displacements. A solver's perfect-information wins are not human clear rates, fun ratings or measured play times. Boss strategy tests isolate geometry/damage; enemy damage is included separately in the campaign simulation.

Real Chromium QA uses six viewport sizes and CDP-generated simultaneous touches, plus a mocked SDK and an unavailable-SDK path. Physical iOS/Android devices, safe-area behavior on actual hardware, real app switching, player comprehension of each local demo, the distinct feel of all 20 weapons, timing comfort and campaign pacing still require direct human/device assessment. Main-thread and Worker timings are cloud-browser measurements, not target-phone performance.

YouTube Developer Portal access/onboarding, current official requirements review, SDK Test Suite, actual YouTube save/CSP/device checks, final artwork, submitter metadata, review and public release remain unperformed. No certification or public YouTube release is claimed. Existing owner-only Sites deployment is untouched.
