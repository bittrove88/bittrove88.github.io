# ARCLINE 0.3.0 — The 100-level journey

Implemented review build; not submitted to or certified for YouTube Playables.

- Unlimited back-and-forth movement during your turn, including while charging. Each side stays in its own battlefield zone. Kestrel moves faster; Basalt has a wider blast and more HP.
- Hold FIRE, release to shoot. Power sweeps 20–100–20, taking 0.72 seconds each way, with no maximum plateau. A horizontal HUD meter stays away from the firing finger. Dashed guides mark 25/50/75/100; an orange marker recalls the previous shot.
- Larger aiming dots, last trajectory, glowing projectile and trail, 40 impact particles, expanding shockwave and brief camera shake. Reduced-motion preference disables shake.
- 100 deterministic, distinct terrain layouts across 10 recurring biomes: shore, dunes, ice terraces, twin spires, mesa, crystal crests, crater, crossing slopes, wall, and triple defence. Later sectors add higher and layered obstructions. These are procedural variations, not 100 bespoke illustrated worlds.
- Clear a level to unlock the next. Replay unlocked levels from the level grid. Level 100 has a completion outcome. Defeat/draw retries the same level.
- Terrain complexity is the main progression. CPU changes from Normal at levels 1–50, to Middle at 51–80, to Hard at 81–100; higher accuracy and movement choices, no stat bonuses. Individual biome difficulty varies within the overall upward curve.
- English UI and original synthesized ambient/effects, enabled after first gesture. YouTube mute/pause and browser audio restrictions remain authoritative.
- Progress uses SDK loadData/saveData inside YouTube; localStorage outside. Successful load precedes saving. Loading failure falls back to unsaved session play without overwriting cloud data; save failures display a status message. No external gameplay server.

## Rules and controls
Drag vertically on the battlefield to aim. Use the left stick to move and the right button to charge. Mouse shares the same controls; arrows move/aim, Space charges. Pointer cancellation and pause cancel an active charge. One shot per turn. Round 11 onward removes 20 HP from both units each round to end stalemates. No online play, terrain destruction, shop, login, or GPT integration.

## Verification and remaining gates
CAMPAIGN_TEST_RESULT.json: production engine tests across all 100 stages and both rigs, attack solutions for both spawn positions, unlimited repeated movement, full matches to outcome, finite trajectories and unique terrain fingerprints.
UI_TEST_RESULT.json: production game script under mock DOM/Web Audio/SDK, covering 14 representative flows across rig choices, stage thresholds and level 100; aiming, simultaneous movement/charge, charge cancellation, pause/resume, sound control, next-level/retry and saving. These are not real-browser tests or a human balance assessment.

Real Android/iOS/tablet visual and touch QA remains required, including small landscape screens, rotation, safe areas, multi-touch and low-FPS charge feel. Supported preview infrastructure was unavailable in this environment. Confirm human enjoyment and difficulty progression, performance, and 3–5 minute match timing. Unlimited aiming means duration depends on the player.

YouTube Developer Portal access/onboarding, SDK Test Suite, actual in-YouTube cloud saving, CSP/platform QA, metadata and final promotional art, rights checks, submission, certification and publication remain pending. The private hosted review URL is separate from YouTube publication.

## Package
arcline-playables.zip contains index.html, style.css, engine.js and game.js at root. Metadata is a draft; publisher/developer must be supplied by the actual submitter. Earlier thumbnail concepts are not screenshots of this version and must be refreshed for submission.

Official SDK and integration references checked for cloud saving:
https://developers.google.com/youtube/gaming/playables/reference/sdk
https://developers.google.com/youtube/gaming/playables/certification/requirements_integration
