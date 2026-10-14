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
| Q / Tab | Cycle nearest visible target |
| K | Skill tree |
| C | Character stats |
| B | Combat / loot |
| I | Main menu |
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
