# ARCLINE

[0.7.0アップデートのお知らせ](updates/0.7.0/)

The [ARCLINE service site](./) introduces the game,three physics-based feature previews,the20-theme journey,and10 combat machines. [The machine viewer](characters/) publishes the previously standalone character preview,with direct HTML and image downloads. [Play the game](game/dist/?v=0.9.0) remains a separate entry; the service site does not modify the game distribution or progress. Both the service site and game support Japanese/English.

Buildless Canvas artillery game, implementation **0.9.0** / campaign **4.1**. Japanese is the default; English and mirrored controls are saved preferences. Ten selectable machines with distinct combat profiles, **20 themes ×5 stages**,90 normal encounters and10 bosses. No permanent combat buffs.

The **Machine** button in the lobby opens GUN,BAN,HIBARI,HANA,RIN,MOGU,KORO,SORA,RICO and YUI. Their matte arcade graphics are drawn in Canvas 2D from individual paths,with distinct chassis,tracks,wheels,weapons and equipment based on the supplied reference. The same drawing is used in selection,lobby,previews and battles. Selection persists alongside existing progress and inventory. Version0.7.1 introduced appearances only. Version0.7.2 added difficulty and forecast visibility. Version0.7.3 added chapter inventory and level-entry checkpoints. Version0.7.4 restored charge cancellation and clear pause actions with dotted forecasts and a short Hard direction guide. Version0.8.0 added individual normal/special weapons,durability,charge and movement. Character paths,palettes,100 maps,enemy HP and attack planning retain their previous definitions. Safe positioning now uses both horizontal and vertical distance so intact upper teleport landings do not move merely because a rival is below them.

Each machine has **unlimited normal fire** and **three special uses per stage**. All normal shots deal20 points,30 for a direct center hit,or40 on an exposed boss core; center/core multipliers do not stack. Charge controls flight power,not damage. Normal shots allow−15° through80° for all machines. Sora’s special alone requires55°–85°. One salvo,cluster or pulse sequence costs one special use and one action,with a per-target aggregate damage cap.

| Machine | HP | Charge to maximum | Special | Maximum damage per use |
|---|---:|---:|---|---:|
| GUN |140|2.6s|Broad demolition blast,cover destruction,push|60|
| BAN |120|2.6s|Forward cone from contact,push|64|
| HIBARI |120|2.6s|Visible-target proximity burst|58|
| HANA |100|2.4s|Three delayed barrel shots at different angles|78|
| RIN |100|3.2s|Fast precision shot,center bonus|96|
| MOGU |120|2.4s|Three advancing blasts through breakable cover|66|
| KORO |100|2.4s|Rolling bomb that falls across gaps and resumes|70|
| SORA |100|2.8s|High-angle carrier splits into eight falling bomblets|84|
| RICO |80|2.4s|Up to four bounces grow damage and blast|82|
| YUI |100|2.8s|Pull toward impact,then delayed compression blast|90|

Maximum values require the relevant hits; spread,blast falloff,armor,cover and missed projectiles reduce actual damage. Fixed bedrock cannot be destroyed. Detection and attraction respect solid cover. Yui pulls along legal terrain and compresses after0.6seconds; bosses resist displacement. Normal shots have modest flight/range differences; Gun trades range for HP,Rin trades a small blast for speed and a slower charge. Beginner/intermediate/advanced labels describe hitting reliability and setup requirements,not charge speed.

The attack selector separates **machine weapons** from **picked auxiliary**. Empty specials remain visible. Special stock and HP refill on a new stage,retry or interrupted-stage restart; ammo boxes refill auxiliary stock only. Guard can accompany normal,special,auxiliary and teleport actions. Breach and legacy attack skills accompany normal/auxiliary fire; an incompatible weapon selection clears their reservation without consumption. Existing auxiliary IDs,ownership and isolated practice selection remain available. The machine picker shows durability,charge,and both attack descriptions in Japanese and English.

From this directory:

```sh
python3 -m http.server 8000 --directory game/dist
```

Open http://localhost:8000/. No install, bundler or production dependency is needed. The standalone distribution loads only local assets. Its existing adapter can use a host-provided `ytgame`; the external YouTube SDK bootstrap is omitted and YouTube integration requires a separate check.

Choose **Easy / Normal / Hard** in the start menu. Easy shows the full forecast trajectory,Normal shows the first half by world-space arc length,and Hard shows only a straight48px barrel-direction guide,independent of power and future contacts. All three modes use round dotted guides both before and during charge; Hard reveals no predicted landing,bounce or curved trajectory. Normal is the default for new and legacy saves. Split children inherit the parent trajectory distance; delayed volleys remain independent paths. The same rule applies to teleport. The choice is saved and fixed when a duel starts. Actual shots,trails,impacts,enemy telegraphs and instructional previews remain visible in every mode. Difficulty does not alter physics,damage,enemy AI,stock or rewards.

Move and aim are adjacent on the **left**. Use one left thumb to alternate between them while the right thumb holds **FIRE**. Releasing movement stops walking; releasing aim keeps the angle; neither releases or resets the charge. FIRE uses the position,angle and power at release, then stops held movement. The gauge takes2.4–3.2seconds from20% to100%,depending on the machine,with a0.25second maximum hold before returning. Teleport uses the same2.6second charge for every machine. A drawn axis and thumb circle identify AIM; no emoji is used. Slide the FIRE finger outside its circle and release to cancel without spending a shot,weapon stock or skill. Sliding back inside re-arms firing. The hint and button color show the current action. On keyboard,Esc cancels a held charge; a later Space release cannot fire. Arrow keys and Space remain available.

From stage4, **Teleport** switches to a non-damaging projectile with unlimited stock. It spends one action instead of an attack. The rover moves to the first contact: on a wall side or ceiling it falls straight down to a supported floor before the enemy acts. Teleport does not bounce,damage enemies,collect items,break terrain or consume special ammunition. A miss or invalid landing keeps the original position and still spends the action. There is no destination selection menu.

Each stage combines finite mountain,cliff,island,cave and shelf components. Cracked purple pieces can be broken with ordinary shots; the opening persists through turn and boss-phase changes. Fixed bedrock,catch floors,reflective surfaces and moving mechanisms remain distinct. Drawing,walking,projectiles,teleport and CPU search use the same collision world. Ordinary direct hits through the enemy center earn1.5×; blast-only hits do not. Boss cores retain2× without stacking.

A chapter spans10 stages. Campaign weapon capsules fill that weapon to **three shots**; at most three finite weapon types are held,each capped at three. Weapons do not auto-equip. Ammo boxes add one shot up to the cap. Unspent weapons and skills carry between levels,including the5th level. The10th-level boss victory resets both inventories for the next chapter. Ordinary shots and teleport stay unlimited.

Version0.9.0 introduces three skills in stages1–20. Guard halves the complete next enemy attack sequence,including delayed shots,and expires even if the enemy misses. It does not prevent self-damage,forced movement or lost support. Breach adds at most one nearby destructible piece within48 world units at the first destructive impact of an ordinary/auxiliary shot; it adds no damage and cannot pass a fixed wall. Field Repair restores up to30 HP for one action,then the rival acts. Full HP blocks repair. The confirmation shows actual healing and the action cost; canceling is free. At most two skill types are held,each capped at three. Reservations consume only when a compatible action commits. Old skill quantities retain their original effects; later stages retain their previous supplies during this partial rollout. Overflow offers replacement or skip after the rival response,or before committing a winning result.

The saved level entry holds inventory,selected opening weapon,match seed and pickup ledger. Defeat or an interrupted battle restores that entry. A win commits the unspent stock and next entry together; a failed save offers retry and blocks campaign advancement. Chapter restart starts its first level with no finite weapons while retaining permanent progress. Existing ownership of all20 weapon IDs and37 appearance IDs is preserved. Owned weapons remain selectable in isolated **practice** with three shots; practice does not grant chapter stock or advance campaign progress. Machine-specific special ammunition is independent of chapter inventory. Practice does not grant the new midpoint rewards.

Stages1–20 now contain11 weapon boxes and5 skill boxes,with one skill reward after clearing5 and15. These are ordinary encounters in this release. The first chapter grants Guard for stage6; Repair first appears at12 and Breach at17. Boxes are optional,have typed resource IDs and distinct placement IDs,and can be collected with a normal shot by all ten machines. The first20-stage supply layout replaces the prior three boxes; stages21–100 retain their13 existing boxes and previous encounters/supplies. Total field supplies are29. Weapon records for Heavy Shell,Ricochet,Rail and Drill open after stages3,8,13 and14 respectively; finite campaign stock stays separate from ownership and practice. Drill alone phases only breakable cover,not fixed rock,reflective materials or devices. Saves migrate to schema4; the actual0.8.0 client refuses that schema and cannot overwrite new skill stock. The prior save is backed up before migration,and subsequent reloads do not overwrite that backup. A home-screen installation or separate browser may have its own storage.

The100 explicit runtime maps are authored in `design/runtime_campaign_20x5.json`; `game/tools/build_levels.py` validates and serializes them. Each has its own components,spawns,devices and action budget. Preparation by teleport or excavation also spends an action. Normal stages allow10–14 actions,bosses20–22,and the finale28. Enemy attacks choose different angle families with stage-dependent error and a new match seed; fixed attack telegraphs do not chase future player input.

Automatic previews introduce17 relevant first uses,plus each machine special and new skill,and loop until **OK**. Preview contacts and effects use the same simulation; weapon/skill practice scenes are labelled. Inventory shows names,stock and selection. Map pickups use projectile/ammo shapes and drawn shield,tool and fracture symbols instead ofW/R/S/B letters. New skill examples show real protected damage,an additional broken piece,or recovery followed by the rival response. Terrain introductions take priority at entry; a deferred skill lesson appears on first selection. New skill pickups can teach after the rival response and any slot decision. Results are centered. Japanese/English stage names and interface text are supported.

Phones play in landscape,with84px primary controls and a compact92px deck. The camera changes scale with opponent distance; tall encounters retain readable tanks and show an offscreen direction. Stationary charging holds the view; moving while charging follows the rover. High projectiles receive smooth vertical tracking,followed by an impact hold and return. Retained browser zoom is inverse-fitted without reloading the duel. Rotation cancels held input and preserves independent SDK/visibility pauses.

The pause menu keeps **Resume game**,fullscreen,language,control-side switch,**Retry level**,and **Return to title** visible together,including568×240 landscape. Retry and title exit ask for confirmation; cancel/Esc returns to the paused menu. Retry restores the level entry,including its inventory and match seed. Flight and opponent turns stay frozen until resume.

Fullscreen requires a user gesture. Browsers with support use native fullscreen; iPhone fallback explains home-screen launch. No service worker or offline cache is installed. A home-screen app may have storage separate from Safari.

Current checks:

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-skills node game/tests/early-skills.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-skills node game/tests/early-skills-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-machines node game/tests/machine-combat.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-machines node game/tests/machine-previews.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-machines node game/tests/machine-matches.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-machines node game/tests/machine-combat-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-machines node game/tests/machine-worker.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-site node site-tests/service-site.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-controls node game/tests/charge-pause.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-stock node game/tests/chapter-stock.test.cjs
node game/tests/integrated.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-difficulty node game/tests/aim-guide.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-difficulty node game/tests/difficulty-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-characters node game/tests/character-graphics.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/integrated-browser.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/orientation-i18n.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/viewport.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/fullscreen.test.cjs
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

The browser checks use the environment's Playwright/Chromium,not a shipped library. Current results are in [evidence/early-skills/](evidence/early-skills/):1,556 skill/state/migration checks,379 browser checks at six sizes,160 normal-shot pickup routes,30 new-skill demonstrations,and200 complete battles across all ten machines and stages1–20. Those battles use native HP and real seeded enemy turns,with no auxiliary or skill supply. The complete lesson suite now checks670 machine/lesson combinations for both actual effect and live-state immutability. Rendering/input regressions cover100 maps at eight viewports,84px controls,actual emulated multitouch,orientation,language,zoom recovery and fullscreen fallback. Character drawing and combat profiles remain unchanged from0.8.0. Human difficulty,physical iPhone/Android usability,installation and YouTube certification remain unverified.

Older evidence remains in `evidence/integrated-0.7.0/`, `evidence/character-graphics/`, `evidence/difficulty/`, `evidence/charge-pause-guides/`, `evidence/chapter-stock/` and `evidence/machine-combat/`. It describes its own release and is not added to the current pass totals. The old chapter-stock-browser fixture assumes the former stage7 weapon pickup; the new early-skills-browser suite covers actual pickup/replacement,reward saving and retry with the current supply layout. The historical chapter-stock-content suite compares legacy shots against0.7.2; it is not a current-release check. Optional `ARCLINE_PREVIOUS_DIST` for early-skills points to immutable0.8.0 for actual migration/back-write,profile,weapon-definition and map-preservation comparisons. The machine-combat suite uses immutable0.7.4 for seeded CPU parity. Full ten-machine ×100-stage completion and physical-device performance are not claimed.

Automatic publishing review rejected the external YouTube script in the HTML. The standalone release removes that external script; this is not a YouTube-certified package.

Original0.3 import commit `125c76a`, `EXPORT_MANIFEST.json`,v1.0/v1.1 design documents and earlier evidence/test suites remain historical provenance. Old tests that assume finite tap-to-BLINK,capsule-based weapon unlocks or the previous100 maps are superseded by the current checks above. Historical passes alone do not certify the current release. Distribution ZIPs are created outside Git. The existing Sites project is unchanged; GitHub Pages serves merged main.
