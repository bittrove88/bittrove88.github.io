# ARCLINE — Character Image Overlay & Unlock Presentation Directive
Version: 2026-11-01
Status: implementation directive, not implementation evidence
Applies to: all ten protagonist machines, selection/roster, unlock, profile/detail, post-story return-to-work montage.
Companion: `design/cinematic_presentation_change_directive_2026-11-01.md`.
Existing authoritative machine names, roles, mottos and colors: `game/dist/characters.js` / `ArcCharacters.characters`. Do not invent stats or replace actual combat values.

## 1. Intent and visual hierarchy
The approved character illustration is the HERO, not a background to cover with a dense card. The overlay should communicate (1) identity, (2) role, (3) unlock/selection state, (4) actionable information, and only then (5) one brief line of personality. Keep the machine silhouette and sensor fully visible. Never place body copy across the sensor, barrel, wheels, or main distinctive feature.

On 16:9 desktop: machine image occupies left 60–68% (with protected subject zone), textual information on right 32–40% over a dark translucent scrim or frosted panel. The panel begins outside the protected subject region; a 40–80px feathered transition avoids a hard split. On portrait/mobile: image top 52–60%, details below, with a bottom gradient behind short name only; no text crossing the character's head/sensor. Allow the image to be re-framed per machine, not center-cropped mechanically.

## 2. Exact content overlay (top to bottom)
A. Top-left: small section label `MACHINE / 01–10` (or localized `機体 01/10`) only in roster/detail; no label on raw story frames.
B. Hero name: `GUN`, `BAN`, etc., uppercase Latin, large but not oversized. Japanese name as a smaller subtitle. Name must come from canonical character data.
C. Role: one line, localized from `roleJa` / `role`; at most two lines on small screens.
D. Distinctive short motto: localized from `mottoJa` / `motto`; place after role with adequate spacing. Do not invent dialogue.
E. Combat summary (ONLY if actual game data are available): equipped weapon, survivability, movement/skill, expressed with existing game labels and live values. If values are absent, omit the entire section; do not show fake numeric bars, arbitrary rarity stars or made-up attack power.
F. State and action: `未解放` / `解放済み` / `選択中` / `編成する` (EN localized equivalents). Only actionable buttons are interactive; the selected state must be visually distinguishable without color alone.
G. Optional accessibility: a single `演出をスキップ` button on unlock animation, keyboard focus, ARIA live announcement of machine unlocked; no mandatory timed reading.

## 3. Per-machine art direction
Use one consistent overlay template, but adjust accent, subject-safe region and one signature motion per character. Accent color should derive from `ArcCharacters` canonical `light` / `color` values; avoid hard-coded new palette drift.

| ID | Role (canonical JP) | Signature reveal / image camera | Secondary graphic |
|---|---|---|---|
| GUN | 重装アサルトタンク | Slow push along tracks toward cannon, settle on cyan sensor | One short amber pulse along cannon edge; no projectile |
| BAN | 突破型ショックマシン | Short lateral slide revealing red fins, then hold | Angular red edge highlight, no explosion |
| HIBARI | 偵察型インターセプター | Push from distant signal to teal/yellow sensor | Two faint cyan scan arcs, no fake radar stats |
| HANA | 三連装ライトタンク | Gentle diagonal drift showing all three barrels | Three soft sequential glints, not firing |
| RIN | 精密狙撃デストロイヤー | Slow narrow pan along long barrel toward sightline | One fine focus-line accent, no target reticle over story objects |
| MOGU | 解体作業デモリッション | Low-angle push toward gear/wheel mechanism | Dust motes and restrained amber edge light |
| KORO | 六輪ローバー砲撃車 | Sideways tracking revealing all six wheels | Thin route trace beneath vehicle, not a speed stat |
| SORA | 自走迫撃モーター | Gentle upward tilt toward tilted mortar and rings | Soft circular skyward ripple, no missile launch |
| RICO | 跳躍トリックスター | Small diagonal camera move then a single controlled settle | One curved magenta arc, no dizzying bounce loop |
| YUI | 重力牽引サポート | Push from segmented arm/connector toward cyan eye | Two lines converge into one cyan connection pulse |

## 4. Unlock choreography (default 5.5–7s, skippable)
0.0–0.7s: transition from game to character image, background fades in with subtle blur; no abrupt white flash.
0.7–2.0s: camera moves within the image (scale 1.02→1.08, small pan). Optional cleanly cut foreground silhouette shifts 4–10px relative to plate; never double-render the same machine.
1.5–2.5s: name and Japanese subtitle enter from 12–20px with 200–350ms opacity/translate easing; use character accent underline or one small light sweep, not a full-screen effect.
2.2–3.2s: role and motto fade in sequentially. Keep text panel stable after arrival.
3.0–4.2s: optional single character-specific signature effect from table; must not obscure silhouette.
4.0s onward: unlock/selection state and CTA become interactive; player can continue at any time. Never force waiting for animation end.
Reduced-motion: static focal crop + 150–250ms fades; no parallax, zoom, sliding, or scanning arcs.

## 5. Roster and detail interactions
Roster: ten thumbnail tiles, each with machine name, canonical role and state. Crop to show unique silhouette; hover/focus = subtle scale 1.01 and border glow, not a repeated intro animation. Locked tiles may use desaturation and lock symbol but still show recognizable shape; do not imply a locked machine is selectable.
Detail: selecting a tile changes hero image and metadata together, without transient mismatch. Crossfade old/new plates 250–400ms, reset focal crop per character. Keep focus in a predictable place and announce name to assistive technology. Persist current selection only if existing game state supports it; do not silently alter the player's active combat machine.
Gameplay: existing Canvas 2D machine rendering and actual gameplay HUD remain authoritative. Cinematic images are for menu, unlock and story only; do not replace playable sprites with flat JPEGs.

## 6. Optional floating cropped fragments
Use on at most 3–4 machine intros (e.g. HIBARI sensor, RIN barrel, YUI connector, MOGU gear), not all ten. A crop of an original image can float as a small secondary detail at 10–22% screen width, with 12–24px corner radius or angled chamfer, feathered edge, 8–16px blur in the background behind it, subtle shadow, 4–8px drift. The inset must show a DIFFERENT detail than the main focal region and disappear before text CTA is presented. If crop quality or duplicate geometry looks wrong, omit the inset entirely.

## 7. Typography / accessibility / safe areas
Recommended hierarchy at 1920×1080: name 56–76px, Japanese name 20–26px, role 24–30px, motto 20–24px, metadata 18–22px, action 22–26px. Responsive clamp sizes rather than fixed pixels. Keep text contrast >=4.5:1, buttons >=44×44 CSS px, keyboard and touch support. Never bake text into the art; all overlay text remains selectable and localized (JA/EN). Use a light scrim behind text; blur should be limited to the text area, not the machine. On narrow screens stack text below hero image; preserve scroll and avoid overlap with device safe-area insets.

## 8. Data and integration
Implement as data-driven `characterPresentation` keyed by canonical machine IDs, not by file order. Suggested fields:
`{id, imageSrc, focal:{desktop:{x,y},mobile:{x,y}}, protectedBox, overlaySide, revealMotion, signatureEffect, allowInset, unlockState, roleKey, mottoKey}`.
Text and accent are read from `ArcCharacters.get(id)`; unlock state and stats from actual game save/character-selection data. No fabricated numeric data. For source art, use only verified character-specific approved JPEGs; the 23-shot cinematic ZIP is not a substitute for character-unlock image inventory. Missing art falls back to existing Canvas rendering and retains full functionality.
Implement a reusable `CharacterHero`, `CharacterInfoOverlay`, `UnlockReveal`, `RosterTile` and `MachineDetail` (names illustrative). Test all ten, both locales, keyboard/touch, unlocked/locked/selected states, desktop and mobile crops, reduced motion and missing-image fallback.

## 9. Acceptance criteria
- All ten canonical machines appear with the correct name, role, motto, image and accent.
- No text obscures unique silhouettes; mobile crop preserves important features.
- No fabricated combat stats; lock/selection state matches game state.
- Intro is skippable and stable at low frame rates.
- Floating crop masks have no halos/duplicate geometry; if absent, fallback still works.
- No change to gameplay balance or original 23-shot narrative.
- Approved JPEGs remain untouched; derivative alpha/mask assets are separate.
- Documented shot-based cinematic directive remains the authoritative story presentation plan.
