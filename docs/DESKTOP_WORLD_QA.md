# Desktop and original-world QA

## Local commands

```bash
pnpm run build
pnpm run test:qa
pnpm run test:desktop
```

Tests use an iPhone 14-size WebKit project for Phase 0–4 regressions and a 1280×800 desktop Chromium project for new desktop controls/zone travel. GitHub Actions installs the two browsers.

## Desktop controls

| Input | Action |
| --- | --- |
| WASD / arrows | Movement (WASD relayed to the RPGJS arrow control path) |
| Space / J | Basic attack |
| 1–0 | Hotbar slots (0 activates the last slot) |
| Tab | Cycle nearest visible target |
| Q | Quest journal |
| K | Skill tree |
| C | Character stats |
| B | Combat / loot |
| I | Inventory (collected loot) |
| M | World map |
| E | Interact with NPC / gate |
| F | Fullscreen |
| Escape | Close an open custom panel |

Keyboard shortcuts do not activate while typing in text inputs or with a game modal open. Mouse remains supported for buttons and dragging skill cards.

## Map travel path

1. Start in Greenvale Camp.
2. Speak to the east gatekeeper for Training Plains.
3. Continue through the east gate to Mutant Grove.
4. Enter Stoneburrow Cavern from Mutant Grove.
5. Reach Rotten Core from the cavern.
6. Use westward return gates to travel back to camp.

Map routes are bidirectional. In `?debug=1` mode tests use `greenvale:debug-travel` to exercise the same RPGJS `changeMap` path without travelling manually.

## Regression gates
- RPGJS canvas created, no runtime error overlay.
- Phase 0–4 WebKit smoke tests green.
- Desktop Chromium moves the real player using WASD.
- Desktop M/K/C and 1–0 open the map, skills, stats and skill slots.
- All five map components load through RPGJS and report correct current zone.
- New hero sprite resolves without remote playground art.
- Save v5 character and combat settings persist.
- Mobile-only control layout remains enabled on iPhone.

## Current scope and limitations
- Spawn graphics, monster stats/EXP/drop tables, town NPC interactions and warp gates are wired.
- Art is original, procedural 2D pixel art; not a hand-polished production sprite atlas or 3D model.
- Maps are five playable connected zones, not fully featured dungeons with pathfinding, fog-of-war, multi-channel networking or bespoke boss phase AI.
- NPC merchants/trainers are interactable dialogue placeholders; real shops and server-driven quest chains remain future implementation.
- Art and world simulation are local standalone RPGJS/Netlify, not yet a synchronized multiplayer backend.

## 0.8.1 desktop / oblique 2.5D slice
- I/Q open dedicated loot inventory and first-hunt journal from the existing save.
- Desktop panels are floating, can be open side by side, and have draggable headers.
- Esc closes the visually topmost panel. Movement/attacks stop while panels are open.
- Arrow keys and WASD use the same collision-checked movement path.
- Mouse skill drag starts after 5 px; touch retains a 450 ms hold. Cancel does not drop.
- Five maps now use height-extruded props and directional ground shadows. Prop foot Y
  sorts them with characters inside RPGJS's event layer. Collision footprints come
  from the same JSON read by renderer, server and desktop movement.
- Test 16:9 / 16:10 HUD separation, resize clamping and map round trips.
- This is an oblique 2.5D prototype, not a 3D engine or finished authored pixel art.
