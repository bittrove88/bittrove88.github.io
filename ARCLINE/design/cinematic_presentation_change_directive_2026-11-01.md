# ARCLINE — Cinematic Presentation Change Directive
Version: 2026-11-01
Status: APPROVED CREATIVE DIRECTION / IMPLEMENTATION REQUEST
Scope: All 23 approved narrative images. Preserve the approved image selection and shot IDs.

## Objective
Do NOT present the approved still images as a static full-screen slideshow. Build an expressive, readable, painterly in-engine cinematic sequence with shot-specific camera choreography, selective layered cutouts, masks, soft depth, and transitions. Preserve the original images' art direction, character identity, and continuity. No regeneration is required.

## Core presentation rules
1. Use each original 16:9 JPEG as the master background plate. Never destructively alter the master asset. Any derived foreground layer must be an optional separate asset.
2. Favor subtle Ken Burns camera movement (pan, dolly, slow push/pull) within available source resolution. Default scale 1.02–1.12, only push further when the subject remains sharp and composition permits. Use ease-in-out; avoid continuous jitter or fast zoom.
3. For selected shots, extract foreground elements (letter, character silhouette, railing, crane, bridge fragments) as independent alpha layers. Reconstruct/blur underlying plate where needed; do not leave duplicate silhouettes or obvious cutout halos. Apply modest parallax, soft shadows, and depth-of-field, not exaggerated 3D rotation.
4. Introduce floating inset fragments sparingly: masked rectangular or gently chamfered crops with feathered edges (12–28px at 1920x1080), low-amplitude drift (4–12px), soft shadow and subtle background blur. Prefer on memories, communications, route discovery, and letter revelations; avoid during solemn loss and major character reveals. Keep all essential content legible without insets.
5. Depth separation: foreground ~1.0x, midground ~0.45x, background ~0.15x of camera offset; never invent occluded geometry with large displacements. Use gradient vignette, particles, light shafts, reflections and fog as optional restrained overlays.
6. Respect reduced-motion preferences: replace pans/parallax with fades, static focal framing and gentle opacity changes. No flashing; cap luminous pulses and avoid intense bloom.
7. Mobile and desktop: use cover crop with a protected subject safe region; do not crop faces/sensors, bridge discontinuities, the envelope, or the ARKHEART core. Adapt camera target per aspect ratio. Preserve UI and subtitles safe areas.
8. Performance: predecode next plate, lazy-load others, cap concurrent full-resolution textures, use GPU transforms/opacity, prefer CSS/WebGL compositing over per-frame canvas repaint. If cutouts are missing, gracefully fall back to the base plate plus camera motion.
9. Timing: shots typically 5–9s with 0.6–1.1s transitions; narrative pause shots 8–11s. All durations are adjustable by actual narration/dialogue. No automatic skipping of essential story content.
10. Visual consistency: warm amber industrial light, cyan signal motifs, painterly edges. Do not overlay intrusive HUDs, new logos, or unexplained text.

## Shot-by-shot direction
| Shot | Camera | Compositing / key beat | Transition |
|---|---|---|---|
| P01-01 | Slow aerial-feeling lateral drift across harbor toward intact bridge | Subtle water glints, foreground harbor structure parallax | Gentle dissolve |
| P01-02 | Track alongside moving freight from rear-quarter to bridge | Foreground rail/crane parallax, tiny wheel/route motion cues; do not fake full vehicle animation | Directional match cut |
| P01-03 | Slow push from illuminated workshop foreground toward functioning harbor and bridge | Warm practical lights, soft foreground depth; preserve peaceful working atmosphere | Warm fade |
| P02-01 | Begin on familiar bridge alignment, then slow push toward the broken gap; end nearly still | Reduce ambience and movement at reveal; no floating cards, no spectacle | Brief held cut |
| P02-02 | Dolly inward toward stopped cargo at barrier | Barrier and cargo layered at different depths; light motion settles to stillness | Cut on pause |
| P03-01 | Macro push toward wax-sealed letter | Feathered envelope cutout floats slightly above blurred workbench for a brief discovery beat | Soft focus dissolve |
| P03-02 | Slow lateral reveal across gathering of ten | Optional foreground silhouettes, sequential gentle sensor illumination; no character duplication | Rising dissolve |
| P03-03 | Follow GUN leaving at dawn | Mild road/foreground parallax; warm horizon expands | Forward match cut |
| I30-01 | Descend/creep into mist valley toward HIBARI | Fog planes and faint blue signal depth | Mist dissolve |
| I30-02 | Move from HIBARI sensor toward distant answering lights | Isolate distant beacon in softly feathered floating inset for 1–2s, then merge back; cyan signal ripple | Light-matched dissolve |
| I60-01 | Lateral wind-swept move across RIN and gorge | Restrained snow/wind layer, brief pause at dangerous route | Harder cut |
| I60-02 | Push toward map/safer illuminated detour | Route-map crop rises subtly as a floating card over softened landscape, then returns; warm route glow | Route-led dissolve |
| E01-01 | Slow monumental upward push to ARKHEART core | Deep chamber layers and restrained core breathing glow | Low-key dissolve |
| E01-02 | Pan from YUI connection to activated system | Separate cable/connector if clean alpha available, sequential cyan lights | Cyan crossfade |
| E01-03 | Begin with wax-sealed envelope, tilt/push to ARKHEART cyan heart | Thin golden light connection; seal shape must match P03-01; no duplicate envelopes | Light-bridge dissolve |
| E02-01 | Fixed symmetric frame with very slow pullback | Ten signal lights darken one by one, no rapid flashing; allow silence | Held dark fade |
| E02-02 | Slow wide reveal of returning ten | Layered near/far silhouettes only if accurately extracted; lights return gradually | Warm dissolve |
| E02-03 | Push toward GUN and hold at reply | Slight sensor glow, restrained floating response light; avoid floating portrait card | Cut on emotional beat |
| E03-01 | Hold ARKHEART near-static, then slow pullback | Cyan core dims gently, no explosive shutdown; ambient dust | Long fade |
| E03-02 | Camera tracks reopened harbor route | Traffic and bridge return as subtle movement cues; water glints | Match cut |
| E04-01 | Start close on unfolded reverse side of letter, ease out to reveal harbor beyond | Letter as foreground feathered layer with background defocus; preserve bridge illustration and blank/text-free original | Paper dissolve |
| E04-02 | Lateral move across YUI, GUN and working harbor | Foreground machinery and cables parallax; small power/sensor lights | Warm dissolve |
| E04-03 | Begin at bridge/road and gradually pull back to full restored harbor | Maximize open sky, horizon and continuous route; minimal overlays | Slow fade to end |

## Implementation contract
- Read approved mapping from `design/cinematic_final_approved_manifest.md`.
- Asset archive currently present at `assets/cinematics/ARCLINE_FINAL_23_SCENES_20261101.zip`; unpack approved JPEGs to `assets/cinematics/{SHOT_ID}.jpeg` before runtime use. Do not assume the ZIP is directly loadable by the browser.
- Create data-driven `cinematic_shots` metadata per shot: `id, src, durationMs, camera:{start:{x,y,scale},end:{x,y,scale},easing}, layers[], effects[], transition, focalPoint, reducedMotion`.
- Build reusable camera, alpha-layer, mask/feather, floating-fragment, fog/light and transition components. Use optional assets and progressive enhancement.
- Ensure there is no accidental second copy of a character, distorted cutout edges, letter/seal mismatch, or wrong intact/broken bridge state. P01-03 is approved as an exterior illuminated harbor workshop shot.
- Keep story ordering and shot IDs unchanged. No new scene images or characters without explicit creative review.
- Acceptance: all 23 shots render in sequence; 16:9 desktop and portrait/mobile focal crops verified; transitions remain stable; fallback works with only base JPEGs; reduced-motion works; no text/logo overlays; cinematic effects are purposeful and not repetitive.
- Track asset-extraction tasks separately from base camera implementation so the cinematic can ship without waiting for all masks.
