# Phase 6 QA — Combat VFX, Audio and Environment

## Scope

Phase 6 is a presentation layer on top of the already-stable Phase 4/5 combat logic. It does not replace targeting, damage, status, monster AI, drops or save data.

Implemented:

- data-driven VFX presets in `effects.json`
- basic hit/slash, crit burst, block shield, miss, perfect-dodge, status pulse, defeat and loot presentation
- element palettes for neutral/fire/water/wind/earth/light/dark
- healing ring for healing skills and respawn
- generated Web Audio cues for attack, hit, crit, block, miss, heal, skills, status, loot and defeat
- Safari-safe audio unlock on the first user gesture; no autoplay is attempted
- day/dusk/night overlay cycle
- lightweight rain particles with reduced-motion fallback
- iPhone safe presentation: overlays never capture touches and stay below gameplay controls
- debug-only deterministic hooks for VFX/environment QA

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
pnpm run test:phase4
pnpm run test:phase5
pnpm run test:phase6
```

Phase 6 verifies on iPhone WebKit:

- RPGJS canvas still boots
- effect/environment layers mount after gameplay starts
- a real combat-result drives the VFX layer
- crit/fire effect metadata renders
- healing skill result renders the heal effect
- requested sound cue reaches the audio runtime
- night + rain can render together
- no fatal runtime error occurs

## Manual iPhone Safari

1. Open the Phase 6 Deploy Preview using `?debug=1&lang=th`.
2. Enter gameplay and attack an Ashfang Wolf.
3. Check that normal hits show a small slash/impact, while crit/block/miss remain visually distinct.
4. Use a healing skill and confirm the green/light healing ring.
5. Keep sound enabled and tap once inside the game; later attacks should produce short generated placeholder SFX.
6. Leave the game open to see the day/dusk/night visual transition and scheduled light rain.
7. Confirm rain and lighting never block joystick, attack, target, hotbar or menu touches.
8. On iOS with Reduce Motion enabled, confirm particle count/animation load is reduced.

## Known limitations

- Phase 6 audio is synthesized placeholder Web Audio, not final recorded SFX/BGM.
- Skill VFX use original CSS/particle placeholders with element palettes; final sprite-sheet VFX can replace them without changing combat logic.
- Weather is cosmetic only in this phase; it does not alter stats, aggro or movement.
- Day/night is local visual presentation. Shared server/world time can be introduced later without replacing the client effect renderer.
