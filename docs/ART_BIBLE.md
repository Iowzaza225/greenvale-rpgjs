# Greenvale Afterfall — Original Art Bible (procedural first pass)

## World identity
- Oblique 2.5D world with 2D pixel sprites, post-disaster forests and hand-repaired settlements.
- Palette: forest #243c32, pine #5a8268, dirt #82735a, old brass #d0b97d, rock #747b77, ash #393b40 and crimson corruption #755454.
- No borrowed RPGJS playground hero/monster/wood image URLs. Current runtime textures are built in browser using `src/art/original-sprites.ts` and `src/art/original-icons.ts`.
- All original art is programmatic, deterministic and local to the project. It is an independently editable foundation, **not** finished hand-drawn studio sprite art.

## Gameplay sprites
- 3 frames horizontally × 4 direction rows.
- Each frame 48×56 px; PNG atlas 144×224 px generated from Canvas at runtime.
- Row 0 down, row 1 left, row 2 right, row 3 up.
- Render at 1× or 2× with nearest-neighbor/pixelated filtering.
- RPGJS stand/walk/attack/attack2/attack3/skill reuse available 3-frame sequences. Polished dedicated run, hit, death, rest and emote sheets remain an art-production task.
- 7 hero job palettes: Novice, Vanguard, Arcanist, Ranger, Mender, Shade, Trader.
- 8 NPC sheets: Mara, trainer, merchant, blacksmith, healer, quest keeper, gatekeeper, settler.
- 11 monster sheets: Ashfang Wolf, Mossling, Sewer Rat, Ironthorn Boar, Blightcap Mushroom, Hollow Scarecrow, Giant Mire Crab, Ash Bat, Stone Husk, Hollow Raider, Rotten Core Guardian.

## Icons
- 32×32 px deterministically composed in `src/art/original-icons.ts`.
- Active, passive, buff, debuff, toggle and item palette families.
- Identical skill ID always yields the same icon pixels.
- The runtime loads base64 PNG images generated locally; no fetching a third-party texture server.

## World map architecture
- Five own-design CanvasEngine component maps, all 1600×1000 world pixels:
  - `src/components/camp-map.ce` — Greenvale Camp (safe town)
  - `src/components/training-plains.ce` — Training Plains
  - `src/components/mutant-grove.ce` — Mutant Grove
  - `src/components/stoneburrow-cavern.ce` — Stoneburrow Cavern
  - `src/components/rotten-core.ce` — Rotten Core
- Fixed world backgrounds use custom geometry and visual gate markers; spawn positions, NPC/monster types and warp endpoints live in `src/data/maps.json`.
- Data/visual components are separated so art upgrades can replace terrain without changing the quest, combat or save system.

## Next art-production upgrades
- Dedicated frame animation for all hero weapons and 11 enemy attacks/deaths.
- Individually hand-pixelled tile atlases and decorative prop layers; current terrain is original procedural geometry.
- VFX/SFX/sprite FX per 51 abilities (Phase 3 IDs are already registered).
- Creature sounds, biome BGM and final lighting/shader passes, without overloading iPhone Safari.

## 2.5D renderer contract (0.8.1)
- Geometry source: `src/assets/maps/<map-id>.json`; renderer: `src/art/world-scene.ts`.
- XY is the existing RPGJS world plane; height extends artwork upward only.
- Ground and shadows are background layers. Props sort at `y + depth` with RPGJS
  characters (their foot position), allowing rear/front occlusion.
- Solid footprint width/depth is shared with server, client and keyboard movement.
- Components own/dispose their Pixi graphics on map unload; no shared destroyed nodes.
- Existing 48x56 character sheets remain a separate pipeline. Full nine-state
  animation and costume compositing are NOT implemented by this renderer change.
