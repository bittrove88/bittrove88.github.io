# ARCLINE — Session-wide integration directive (2026-11-01)

This is the implementation entry point for all changes approved in the session. The full consolidated deliverable is `ARCLINE_SESSION_CHANGE_DIRECTIVE_20261101.md` (supplied as a downloadable file in the conversation). The implemented response, reproduction commands and remaining asset gaps are recorded in [0.14 implementation](cinematics_014/IMPLEMENTATION.md). The three repository sources below remain the selection and creative specifications:

1. [23-shot final selection](cinematic_final_approved_manifest.md)
2. [23-shot cinematic camera, cutout, parallax and transition plan](cinematic_presentation_change_directive_2026-11-01.md)
3. [10-character image overlay, roster and unlock plan](character_image_overlay_directive_2026-11-01.md)

## Required integration sequence

P0: Extract all 23 JPEGs from `../assets/cinematics/ARCLINE_FINAL_23_SCENES_20261101.zip` into `../assets/cinematics/{SHOT_ID}.jpeg`. Verify scene IDs and hashes. The archive is not itself a runtime image directory. Keep E01-03 (ARKHEART + matching seal) and E04-01 (reverse-side letter with bridge drawing) as the approved new versions. Confirm character-specific artwork mapping separately before writing `../assets/characters/unlock/{id}.jpeg`.

P1: Implement a data-driven 23-shot player, per-shot slow pan/push/pull, focal points, transitions, reduced-motion fallback and mobile-safe crops. Do not alter narrative order or base JPEGs.

P2: Add *selective* layered cutouts, feathered or chamfered floating inset crops, blur, modest parallax and subtle signal/fog/light effects. Prioritize P03-01, I30-02, I60-02 and E04-01. Avoid a strong envelope-to-core beam in E01-03 because it changes the meaning of the reveal.

P3: For each of the ten canonical machines, display name, Japanese name, role, motto, real unlock/selection state and actionable controls on top of the approved art. Source canonical text/colors from `../game/dist/characters.js` and stats/state from real game data. Keep the machine silhouette unobstructed. Use distinct machine-specific reveal motions, skippable animation, and selective detail insets. Do not replace existing gameplay Canvas character rendering with static art.

P4: Test all 23 shots, all ten machines, JA/EN, desktop/mobile, keyboard/touch, reduced motion, fallback and gameplay regressions. Preserve evidence and update status only when actually verified.

## Important state boundary

The **23 scene selections are approved** and the **ZIP was observed in GitHub**. This does **not** establish that individual JPEGs have been extracted or that the cinematic and character UI features have been implemented. The repository directives are specifications, not implementation evidence.
