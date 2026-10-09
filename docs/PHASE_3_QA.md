# Phase 3 QA — Skills, Tree, Hotbar, Cast, Cooldown and Auto

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
```

The Phase 3 iPhone-sized WebKit test verifies:

- Phase 0 boot regression still passes
- Phase 1 onboarding and save migration still pass
- Phase 2 stat/job progression still passes
- save schema migrates to version 4
- 3 Novice skills and 8 skills for the active class render from JSON
- skill points can raise a learned skill level
- prerequisite/MaxLv/available-point gates are enforced
- learned skills can be assigned to the 0–9 custom mobile hotbar
- a combat skill can execute against a live RPGJS enemy
- SP cost and cooldown runtime state are returned to the hotbar
- cooldown overlay appears
- interruptible cast is cancelled when the player is hit
- auto-battle settings and HP threshold persist
- Memory Respec Chip refunds spent skill points once
- reset removes invalid hotbar assignments
- no fatal `applySyncPacket`, module-script or RPGJS boot error appears

## Manual iPhone Safari

1. Open the Phase 3 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Create/select a survivor and enter the world.
3. Reach Novice Job Lv 10 and change to any of the six jobs.
4. Open **MENU → สกิล / แถบลัด**.
5. Verify the Novice tree plus 8 skills for the chosen job.
6. Tap a skill and compare current/next level SP, power/heal, cooldown, cast time and range.
7. Spend skill points and verify prerequisite locks.
8. Hold a learned skill for about 0.45s and drag it onto hotbar slot 0–9.
9. Use an instant attack skill near a wolf and verify SP decreases and cooldown overlay appears.
10. Use Field First Aid, then take a hit during its cast and verify the cast is interrupted.
11. Test buff, debuff, toggle, passive and heal skills.
12. Open Auto and enable it. Adjust the HP threshold and skill order.
13. Use **Memory Respec Chip** once and verify spent skill points return and learned class skills reset.
14. Reload Safari and confirm learned skills, hotbar, auto settings and remaining reset chip persist.

## Known Phase 3 limitations

- The project deliberately uses its own JSON-driven skill runtime instead of mutating RPGJS synchronized built-in skill/hotbar state during initial Safari hydration. This preserves the Phase 0 async-boot fix.
- Final original skill icons, VFX sprite sheets and SFX are still placeholders. Their ids are already present in `skills.json` / `effects.json`.
- Complex projectile travel, ground-target cursor and polished multi-target geometry will be expanded with the Phase 4 combat/status layer and Phase 6 VFX layer.
- The reset chip is represented by the Phase 3 save inventory counter and item config. The full unified item/inventory UI arrives in Phase 8.
- Auto-battle is local standalone logic for the current Netlify build; authoritative multiplayer validation belongs to the server-backed release path.
