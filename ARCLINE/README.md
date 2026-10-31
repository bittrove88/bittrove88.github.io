# ARCLINE

[0.7.0アップデートのお知らせ](updates/0.7.0/)

The [ARCLINE service site](./) introduces the game,three physics-based feature previews,the20-theme journey,and10 machine appearances. [The machine viewer](characters/) publishes the previously standalone character preview,with direct HTML and image downloads. [Play the game](game/dist/?v=0.7.4) remains a separate entry; the service site does not modify the game distribution or progress. Both the service site and game support Japanese/English.

Buildless Canvas artillery game, implementation **0.7.4** / campaign **4.1**. Japanese is the default; English and mirrored controls are saved preferences. Ten selectable machine appearances, **20 themes ×5 stages**,90 normal encounters and10 bosses. No permanent combat buffs.

The **Machine** button in the lobby opens GUN,BAN,HIBARI,HANA,RIN,MOGU,KORO,SORA,RICO and YUI. Their matte arcade graphics are drawn in Canvas 2D from individual paths,with distinct chassis,tracks,wheels,weapons and equipment based on the supplied reference. The same drawing is used in selection,lobby,previews and battles. Selection persists alongside existing progress and inventory. Version0.7.1 introduced appearances only. Version0.7.2 added difficulty and forecast visibility. Version0.7.3 added chapter inventory and level-entry checkpoints. Version0.7.4 restores drag-out charge cancellation,clarifies pause actions,and draws dotted forecasts with a short Hard direction guide; character graphics,weapon effects,HP,charge timing,collision,controls and enemies retain their previous behavior. Character-specific combat profiles remain a separate,unimplemented design.

From this directory:

```sh
python3 -m http.server 8000 --directory game/dist
```

Open http://localhost:8000/. No install, bundler or production dependency is needed. The standalone distribution loads only local assets. Its existing adapter can use a host-provided `ytgame`; the external YouTube SDK bootstrap is omitted and YouTube integration requires a separate check.

Choose **Easy / Normal / Hard** in the start menu. Easy shows the full forecast trajectory,Normal shows the first half by world-space arc length,and Hard shows only a straight48px barrel-direction guide,independent of power and future contacts. All three modes use round dotted guides both before and during charge; Hard reveals no predicted landing,bounce or curved trajectory. Normal is the default for new and legacy saves. Split children inherit the parent trajectory distance; delayed volleys remain independent paths. The same rule applies to teleport. The choice is saved and fixed when a duel starts. Actual shots,trails,impacts,enemy telegraphs and instructional previews remain visible in every mode. Difficulty does not alter physics,damage,enemy AI,stock or rewards.

Move and aim are adjacent on the **left**. Use one left thumb to alternate between them while the right thumb holds **FIRE**. Releasing movement stops walking; releasing aim keeps the angle; neither releases or resets the charge. FIRE uses the position,angle and power at release, then stops held movement. The gauge takes1.6seconds from20% to100%. A drawn axis and thumb circle identify AIM; no emoji is used. Slide the FIRE finger outside its circle and release to cancel without spending a shot,weapon stock or skill. Sliding back inside re-arms firing. The hint and button color show the current action. On keyboard,Esc cancels a held charge; a later Space release cannot fire. Arrow keys and Space remain available.

From stage4, **Teleport** switches to a non-damaging projectile with unlimited stock. It spends one action instead of an attack. The rover moves to the first contact: on a wall side or ceiling it falls straight down to a supported floor before the enemy acts. Teleport does not bounce,damage enemies,collect items,break terrain or consume special ammunition. A miss or invalid landing keeps the original position and still spends the action. There is no destination selection menu.

Each stage combines finite mountain,cliff,island,cave and shelf components. Cracked purple pieces can be broken with ordinary shots; the opening persists through turn and boss-phase changes. Fixed bedrock,catch floors,reflective surfaces and moving mechanisms remain distinct. Drawing,walking,projectiles,teleport and CPU search use the same collision world. Ordinary direct hits through the enemy center earn1.5×; blast-only hits do not. Boss cores retain2× without stacking.

A chapter spans10 stages. Campaign weapon capsules fill that weapon to **three shots**; at most three finite weapon types are held,each capped at three. Weapons do not auto-equip. Ammo boxes add one shot up to the cap. Unspent weapons and skills carry between levels,including the5th level. The10th-level boss victory resets both inventories for the next chapter. Ordinary shots and teleport stay unlimited.

Existing BURST,PULL and normal-enemy SWAP effects and authored skill supplies remain in use. At most two skill types are held,each capped at three. Authored entry supplies add once; retries do not add them again. Overflow offers replacement or skip after the enemy response,or before committing a winning result. Preparation supply choices are saved before play.

The saved level entry holds inventory,selected opening weapon,match seed and pickup ledger. Defeat or an interrupted battle restores that entry. A win commits the unspent stock and next entry together; a failed save offers retry and blocks campaign advancement. Chapter restart starts its first level with no finite weapons while retaining permanent progress. Existing ownership of all20 weapon IDs and37 appearance IDs is preserved. Owned weapons remain selectable in isolated **practice** with three shots; practice does not grant chapter stock or advance campaign progress. Character-specific special ammunition and new skill effects are separate work.

There are still16 optional map supplies. Eight buried capsules were moved into clear,ordinary-shot-reachable space without changing terrain,IDs or supply counts. More frequent weapon placements and new skill pickups are not part of the current release. Saves migrate to schema3; older clients refuse that schema rather than overwriting chapter data. A home-screen installation or separate browser may have its own storage.

The100 explicit runtime maps are authored in `design/runtime_campaign_20x5.json`; `game/tools/build_levels.py` validates and serializes them. Each has its own components,spawns,devices and action budget. Preparation by teleport or excavation also spends an action. Normal stages allow10–14 actions,bosses20–22,and the finale28. Enemy attacks choose different angle families with stage-dependent error and a new match seed; fixed attack telegraphs do not chase future player input.

Automatic previews introduce17 relevant first uses and loop until **OK**. Preview contacts and effects use the same simulation; weapon/skill practice scenes are labelled. Inventory shows names,stock and selection. Map pickups use projectile/ammo shapes instead ofW/R/S/B letters. Results are centered. Japanese/English stage names and interface text are supported.

Phones play in landscape,with84px primary controls and a compact92px deck. The camera changes scale with opponent distance; tall encounters retain readable tanks and show an offscreen direction. Stationary charging holds the view; moving while charging follows the rover. High projectiles receive smooth vertical tracking,followed by an impact hold and return. Retained browser zoom is inverse-fitted without reloading the duel. Rotation cancels held input and preserves independent SDK/visibility pauses.

The pause menu keeps **Resume game**,fullscreen,language,control-side switch,**Retry level**,and **Return to title** visible together,including568×240 landscape. Retry and title exit ask for confirmation; cancel/Esc returns to the paused menu. Retry restores the level entry,including its inventory and match seed. Flight and opponent turns stay frozen until resume.

Fullscreen requires a user gesture. Browsers with support use native fullscreen; iPhone fallback explains home-screen launch. No service worker or offline cache is installed. A home-screen app may have storage separate from Safari.

Current checks:

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-site node site-tests/service-site.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-controls node game/tests/charge-pause.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-stock node game/tests/chapter-stock.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-stock node game/tests/chapter-stock-content.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-stock node game/tests/chapter-stock-browser.test.cjs
node game/tests/integrated.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-difficulty node game/tests/aim-guide.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-difficulty node game/tests/difficulty-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-characters node game/tests/character-graphics.test.cjs
node game/tests/integrated-campaign.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/integrated-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/orientation-i18n.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/viewport.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/fullscreen.test.cjs
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

The browser checks use the environment's Playwright/Chromium,not a shipped library. Prior combat results are in `evidence/integrated-0.7.0/`; character graphics checks are in `evidence/character-graphics/`. The original0.7.2 difficulty checks are in `evidence/difficulty/`; updated dotted-guide,charge-cancel and pause checks are in `evidence/charge-pause-guides/`; chapter inventory,save protection,pickup routes and regression checks are in `evidence/chapter-stock/`. Set `ARCLINE_PREVIOUS_DIST` to an immutable0.7.2 distribution when running `chapter-stock-content.test.cjs` to repeat the2,000 physical-shot comparisons and the actual old-client write-protection test. Pickup contact events are excluded from those comparisons because eight supply positions intentionally changed. The character suite compares1,000 seeded campaign states and random sequences,checks selection at six viewports,and measures300 real Canvas muzzle poses. Original-image pixel equivalence and physical-phone performance are not claimed. Three prior recorded seed variants produce300 complete machine-guided battles with real enemy turns,using Standard and teleport; this is not human difficulty validation or exhaustive reachable-state verification. Rendering/input checks cover100 maps at8 viewports,real emulated touch input,orientation,language,zoom recovery and fullscreen fallback. Physical iPhone/Android usability,installation and YouTube certification remain unverified.

Automatic publishing review rejected the external YouTube script in the HTML. The standalone release removes that external script; this is not a YouTube-certified package.

Original0.3 import commit `125c76a`, `EXPORT_MANIFEST.json`,v1.0/v1.1 design documents and earlier evidence/test suites remain historical provenance. Old tests that assume finite tap-to-BLINK,capsule-based weapon unlocks or the previous100 maps are superseded by the current checks above. Historical passes alone do not certify the current release. Distribution ZIPs are created outside Git. The existing Sites project is unchanged; GitHub Pages serves merged main.
