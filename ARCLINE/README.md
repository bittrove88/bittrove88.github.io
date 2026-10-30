# ARCLINE

[0.7.0アップデートのお知らせ](updates/0.7.0/)

Buildless Canvas artillery game, implementation **0.7.1** / campaign **4.1**. Japanese is the default; English and mirrored controls are saved preferences. Ten selectable machine appearances, **20 themes ×5 stages**,90 normal encounters and10 bosses. No permanent combat buffs.

The **Machine** button in the lobby opens GUN,BAN,HIBARI,HANA,RIN,MOGU,KORO,SORA,RICO and YUI. Their matte arcade graphics are drawn in Canvas 2D from individual paths,with distinct chassis,tracks,wheels,weapons and equipment based on the supplied reference. The same drawing is used in selection,lobby,previews and battles. Selection persists alongside existing progress and inventory. This update changes appearances only: current weapons,ammunition,HP,charge timing,collision,controls,enemy graphics and all100 stages retain their0.7.0 behavior. Character-specific combat profiles remain a separate,unimplemented design.

From this directory:

```sh
python3 -m http.server 8000 --directory game/dist
```

Open http://localhost:8000/. No install, bundler or production dependency is needed. The standalone distribution loads only local assets. Its existing adapter can use a host-provided `ytgame`; the external YouTube SDK bootstrap is omitted and YouTube integration requires a separate check.

Move and aim are adjacent on the **left**. Use one left thumb to alternate between them while the right thumb holds **FIRE**. Releasing movement stops walking; releasing aim keeps the angle; neither releases or resets the charge. FIRE uses the position,angle and power at release, then stops held movement. The gauge takes1.6seconds from20% to100%. A drawn axis and thumb circle identify AIM; no emoji is used. Arrow keys and Space remain available.

From stage4, **Teleport** switches to a non-damaging projectile with unlimited stock. It spends one action instead of an attack. The rover moves to the first contact: on a wall side or ceiling it falls straight down to a supported floor before the enemy acts. Teleport does not bounce,damage enemies,collect items,break terrain or consume special ammunition. A miss or invalid landing keeps the original position and still spends the action. There is no destination selection menu.

Each stage combines finite mountain,cliff,island,cave and shelf components. Cracked purple pieces can be broken with ordinary shots; the opening persists through turn and boss-phase changes. Fixed bedrock,catch floors,reflective surfaces and moving mechanisms remain distinct. Drawing,walking,projectiles,teleport and CPU search use the same collision world. Ordinary direct hits through the enemy center earn1.5×; blast-only hits do not. Boss cores retain2× without stacking.

Twelve core weapon roles unlock through stage completion,with an unlimited Standard cannon and one equipped special carrying two shots. Optional capsules give two trial shots for that battle without auto-equipping or permanently unlocking the weapon. Ammo boxes appear only with a special equipped. The eight other legacy weapon IDs remain usable for existing owners. BURST,PULL and normal-enemy SWAP remain finite combat skills; teleport has its own button. Existing progress,all weapon ownership and the37 appearance IDs are preserved. New maps do not place appearance pickups or skill-refill capsules.

The100 explicit runtime maps are authored in `design/runtime_campaign_20x5.json`; `game/tools/build_levels.py` validates and serializes them. Each has its own components,spawns,devices and action budget. Preparation by teleport or excavation also spends an action. Normal stages allow10–14 actions,bosses20–22,and the finale28. Enemy attacks choose different angle families with stage-dependent error and a new match seed; fixed attack telegraphs do not chase future player input.

Automatic previews introduce17 relevant first uses and loop until **OK**. Preview contacts and effects use the same simulation; weapon/skill practice scenes are labelled. Inventory shows names,stock and selection. Map pickups use projectile/ammo shapes instead ofW/R/S/B letters. Results are centered. Japanese/English stage names and interface text are supported.

Phones play in landscape,with84px primary controls and a compact92px deck. The camera changes scale with opponent distance; tall encounters retain readable tanks and show an offscreen direction. Stationary charging holds the view; moving while charging follows the rover. High projectiles receive smooth vertical tracking,followed by an impact hold and return. Retained browser zoom is inverse-fitted without reloading the duel. Rotation cancels held input and preserves independent SDK/visibility pauses.

Fullscreen requires a user gesture. Browsers with support use native fullscreen; iPhone fallback explains home-screen launch. No service worker or offline cache is installed. A home-screen app may have storage separate from Safari.

Current checks:

```sh
node game/tests/integrated.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-characters node game/tests/character-graphics.test.cjs
node game/tests/integrated-campaign.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/integrated-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/orientation-i18n.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/viewport.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/fullscreen.test.cjs
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

The browser checks use the environment's Playwright/Chromium,not a shipped library. Prior combat results are in `evidence/integrated-0.7.0/`; character graphics checks are in `evidence/character-graphics/`. The character suite compares1,000 seeded campaign states and random sequences,checks selection at six viewports,and measures300 real Canvas muzzle poses. Original-image pixel equivalence and physical-phone performance are not claimed. Three prior recorded seed variants produce300 complete machine-guided battles with real enemy turns,using Standard and teleport; this is not human difficulty validation or exhaustive reachable-state verification. Rendering/input checks cover100 maps at8 viewports,real emulated touch input,orientation,language,zoom recovery and fullscreen fallback. Physical iPhone/Android usability,installation and YouTube certification remain unverified.

Automatic publishing review rejected the external YouTube script in the HTML. The standalone release removes that external script; this is not a YouTube-certified package.

Original0.3 import commit `125c76a`, `EXPORT_MANIFEST.json`,v1.0/v1.1 design documents and earlier evidence/test suites remain historical provenance. Old tests that assume finite tap-to-BLINK,capsule-based weapon unlocks or the previous100 maps are superseded by the current checks above. Historical passes do not certify0.7.0. Distribution ZIPs are created outside Git. The existing Sites project is unchanged; GitHub Pages serves merged main.
