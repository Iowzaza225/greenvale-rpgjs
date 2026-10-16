# GREENVALE REBORN — Imported CC0 assets (2026-10-16)

## License + provenance

### KayKit Character Pack: Adventurers — **Knight**
- Creator: Kay Lousberg / KayKit
- License: **CC0 1.0 Universal** (no attribution required; credit supplied voluntarily)
- Original repo: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- License proof: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/blob/672074b73ba276876a19e8816ecdc5241817ab47/LICENSE.txt
- Source pinned commit: `672074b73ba276876a19e8816ecdc5241817ab47`
- Original source path: `addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb`
- Verified Git blob SHA: `717b56ca2b5ff5392679774725201ba03a3eefab`
- Model includes skeletal animation clips. CI downloads **that exact pinned source**, verifies Git blob SHA-1 before using it, and bakes **27 columns x 4 rows**, 96x112 frames, nine banks (walk/idle/run/attack/cast/hit/death/rest/emote) x three poses.
- Runtime image: `public/assets/characters/kaykit-knight-2p5d.webp` (derived from CC0 Knight model, retained local after CI bake)
- Source asset: `public/assets/vendor/kaykit/Knight.glb` (retained as original CC0 source, not rendered live during gameplay)
- Renderer source is **project-written** `tools/kaykit-bake.js` using Three.js/WebGL only at **bake time**, while live gameplay remains RPGJS/Pixi sprite rendering.
- If the baked atlas is not available, fallback is the original existing Phase 4 RPGJS hero; no broken player sprites. To force the older hero for diagnosis use `?art=legacy`.

### Kenney UI Pack – Adventure
- Creator: Kenney / https://kenney.nl
- Official pack: https://kenney.nl/assets/ui-pack-adventure
- License: **Creative Commons CC0**
- Source archive rehost used to copy *unchanged individual tiny PNGs*: https://github.com/shorepine/kenney/tree/main/ui/UI%20Pack%20-%20Adventure
- Confirm official licensing here: https://kenney.nl/assets/ui-pack-adventure
- Seven selected files imported into `public/assets/vendor/kenney/`; no other third-party UI pack included
- Controls use existing real engine input/callbacks; imported sprites only restyle the HUD.

## Implementation scope and exclusions
This asset pass imports original **licensed game assets**, not files extracted from a protected commercial game. It does not claim a complete final character roster, hand-painted art, character customization, new AI, or multiplayer. The model is **low-poly 3D in source** and automatically rendered to **2.5D sprite sheets** so phones do not load a 3D engine for normal play.

## QA / release gate
- [ ] KayKit source download and SHA verified in GitHub Actions
- [ ] Chromium bake creates opaque character pixels in all required atlas banks, preserves transparency
- [ ] WebP generated and committed on feature branch
- [ ] iPhone WebKit renders actual RPGJS scene using baked Knight, attack and walking frame sequence visibly changes
- [ ] Check mobile UI thumb target touch, no overlapping and all 10 hotbar slots accessible
- [ ] Manually test physical iPhone Safari and desktop before PR merged
- [ ] Do not modify main or user saves

## Caveat
If an animation state does not have a distinct matching clip in the source, the baker currently supports fallback **only** for cast/rest/emote; required walk/idle/run/attack/hit/death must match source clips or the bake fails loudly. Final art quality requires later visual acceptance.
