# ARCLINE

Buildless Canvas artillery campaign. Implementation candidate **0.4.1**, based on design **v1.1**. English UI, one rover, 100 fixed levels (90 normal / 10 bosses), 20 weapons, 8 skills and 37 collectible appearances. No permanent combat upgrades.

The imported 0.3 implementation is preserved in baseline commit `125c76a`; `EXPORT_MANIFEST.json` describes that import, including the verified distribution ZIP that was deliberately excluded from Git. Historical results in `evidence/current-release/` are **not** evidence for the new implementation.

From this directory:

```sh
python3 -m http.server 8000 --directory game/dist
node game/tests/engine.test.cjs
node game/tests/campaign.test.cjs
node game/tests/accessibility.test.cjs
node game/tests/boss.test.cjs
```

Open http://localhost:8000/. No install or build is needed for play. Drag the battlefield or use the angle slider / ± buttons to aim; hold Fire, then release. The wide charge gauge sweeps from 20 to 100 in 0.95 seconds. While charging, the trajectory and impact area use the same physics as the shot. Use the joystick while charging. Keyboard: arrows and Space. New-control and new-feature previews loop without advancing combat until OK is pressed. Skill buttons toggle a skill; hold to inspect the same preview. BLINK requires a second tap on the destination. The weapon button switches Standard / equipped special (or the single new-weapon trial). Collection is saved immediately and survives defeat.

Real-browser QA additionally uses Playwright and Chromium provided by the development environment:

```sh
ARCLINE_EVIDENCE_DIR=/tmp/arcline-qa node game/tests/runtime.test.cjs
```

This optional QA dependency is not shipped. Production relies only on local HTML/CSS/JS and the YouTube SDK, with offline SDK fallback.

`game/tools/build_levels.py` deterministically compiles authored polygon/region blockouts with review provenance. It does not infer collision geometry from Japanese prose. The original design documents and JSON remain unchanged. Package a candidate outside the repository with:

```sh
python3 game/tools/build_playables.py --output /tmp/arcline-package
```

`evidence/v1.1/` contains measured results, scope and tuning notes. Automated geometry samples and Chromium touch emulation are separate from physical-device QA, player research and YouTube certification. The existing Sites project is unchanged. GitHub Pages serves the merged main branch. The 0.4.1 touch/UI changes and verification are recorded under evidence/touch-ux/.
