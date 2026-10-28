# ARCLINE

Buildless Canvas artillery campaign. Implementation **0.6.2**, with the player-directed **2.0 redesign**. English UI, one rover, **20 themes × 5 fixed levels** (90 normal / 10 bosses), 20 weapons, 8 skills and 37 collectible appearances. Reflective solid ground replaces water. No permanent combat upgrades.

The imported 0.3 implementation is preserved in baseline commit `125c76a`; `EXPORT_MANIFEST.json` describes that import, including the verified distribution ZIP that was deliberately excluded from Git. Historical results in `evidence/current-release/` are **not** evidence for the new implementation.

From this directory:

```sh
python3 -m http.server 8000 --directory game/dist
node game/tests/engine.test.cjs
node game/tests/engine-redesign.test.cjs
node game/tests/physics-redesign.test.cjs
node game/tests/preview-redesign.test.cjs
node game/tests/campaign.test.cjs
node game/tests/accessibility.test.cjs
node game/tests/boss.test.cjs
node game/tests/rewards.test.cjs
node game/tests/preview-curriculum.test.cjs
```

Open http://localhost:8000/. No install or build is needed for play. Use the left MOVE stick to drive and the right AIM stick to raise/lower the barrel. A small deflection makes fine adjustments; releasing the aim stick keeps the angle. Hold the central FIRE button, then release. The wide charge gauge sweeps from 20 to 100 in **1.6 seconds**. The camera stays fixed while charging, with a thin physics-based trajectory and no landing marker. Movement, aiming and charging accept independent fingers, including simultaneous input. The battlefield drag remains available. Keyboard: arrows and Space; focused AIM also supports Home/End.

Exterior ground now continues to the screen edge visually, without filling intentional interior gaps or changing collision geometry. Safari gesture suppression is paired with a visual-viewport fit: if a browser retains page zoom, the game compensates its scale and offsets so the HUD and controls remain visible and touch positions remain aligned. One-finger menu scrolling is preserved.

Bright, solid reflector strips bounce shots at every incidence angle, with a shared limit of three bounces. They follow the actual ground and can be walked on. There is no underwater slowdown or hidden shallow-angle condition.

The explicit first-use curriculum is in `design/preview_curriculum.json` and `game/dist/lessons.js`. Each stage offers at most one relevant automatic entry lesson; OK returns directly to play. Level 1 teaches FIRE, level 2 AIM, level 3 capsules, level 4 movement on slopes, level 6 reflective ground and level 10 armor/core attacks. Later first appearances introduce their environmental mechanic. Weapons and skills are introduced when actually selected and stocked, rather than merely acquired.

Previews loop until **OK** in a separate footer, with the live HUD and controls hidden. A setup pause, physics playback at 0.65× and a 1.65-second outcome hold make the action and effect distinct. Context distinguishes this level from weapon/skill practice scenes. Contact labels appear after the actual contact; force comparisons label the dashed path. Skill buttons toggle a skill; hold to replay its preview. BLINK requires a second tap on the destination, and cannot spend its use through a cannon shot.

Gear selects the starting weapon. Battle and Equipment use the same canonical names, including Standard. The battle button shows Unlimited or the remaining shots; the chooser distinguishes the equipped special (two shots per level), pickup trial (one shot) and exhausted stock, which remains visible as Empty. A pickup never silently equips itself. Skill cards show their names, remaining uses and Selected/Used/Empty status; one skill can be used per turn. Opening a choice cancels held input. Clear/result dialogs are centered. Journey shows five large stage cards in each of twenty themes. Collections are saved immediately and survive defeat; previous progress and collection IDs are preserved. Cosmetic flags, muzzle accents, trim and trails add no combat buffs.

Real-browser QA additionally uses Playwright and Chromium provided by the development environment:

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/runtime.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/touch-ux.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/immersion.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/viewport.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/render-boundary.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/camera-framing.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/ui-clarity.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/loadout-lessons.test.cjs
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/preview-visual.test.cjs
```

This optional QA dependency is not shipped. Production relies only on local HTML/CSS/JS and the YouTube SDK, with offline SDK fallback.

`design/runtime_campaign_20x5.json` is the current explicit 100-level source. `game/tools/build_levels.py` validates and serializes it deterministically. Original v1.0/v1.1 design documents and JSON remain historical provenance; the player's later requests override water, ten-stage themes and the former UI. Package a candidate outside the repository with:

```sh
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

`evidence/clarity/` records the 0.6.2 stock/selection, curriculum, preview, layout and camera regressions. Boss part-break rewards now spawn at their intended in-arena coordinates, and invalid off-board pickups cannot shrink the camera. `evidence/dual-stick/` records the 0.6.1 input, viewport recovery and terrain-boundary checks. `evidence/redesign/` records the 0.6.0 behavior, campaign and browser verification. Earlier results in `evidence/v1.1/`, `evidence/touch-ux/` and `evidence/immersion/` describe their respective historical versions. Automated geometry samples and Chromium touch emulation are separate from physical-device QA, human enjoyment and YouTube certification. The existing Sites project is unchanged. GitHub Pages serves the merged main branch.
