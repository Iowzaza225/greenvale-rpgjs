# Phase 3 QA — Skill Trees, Hotbar, Casting and Auto Battle

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
```

Phase 3 WebKit QA verifies:

- the Phase 0 boot path still has no fatal `applySyncPacket` or module-script error
- Phase 1 onboarding still works
- Phase 2 stats/job change still works
- save schema migrates to version 4
- Novice exposes 3 skills
- every first job exposes 8 skills in JSON
- a learned skill consumes a skill point
- prerequisites and MaxLv gates are enforced by the shared rules engine
- a learned Ranger skill can be assigned to hotbar slot 0–9
- the custom hotbar can execute a real standalone RPGJS combat hit
- cooldown state is returned to the mobile UI
- an interruptible cast is cancelled by a player-hit event
- auto-battle settings persist
- a Memory Respec Chip resets learned levels and refunds spent points

## Manual iPhone Safari

1. Open the Phase 3 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Create/select a survivor and enter the world.
3. Open **MENU → สกิล / แถบลัด**.
4. Check the Novice tree: Survivor Strike, Field First Aid, Camp Rest.
5. Gain Job EXP and change to one of the six jobs at Job Lv 10.
6. Confirm the selected class tree contains at least 8 skills and prerequisite connector lines.
7. Spend skill points. Tap a skill and compare current/next-level SP, cooldown, cast time, range and power/heal.
8. On mobile, hold a learned skill for ~0.45 s and drag it to a hotbar slot 0–9.
9. Close the window and use the hotbar in combat. Verify:
   - cooldown overlay counts down
   - SP is consumed
   - damage/heal happens
   - out-of-range skills report no target
10. Cast Field First Aid while taking a hit; the cast bar should be interrupted.
11. Open the Auto tab:
   - enable Auto
   - set an HP threshold
   - choose/reorder learned skills
   - verify Auto uses only the configured learned skills
12. Use **Memory Respec Chip** and confirm spent skill points are refunded while the three base Novice skills remain Lv 1.
13. Reload and confirm learned skills, hotbar and Auto settings persist.

Debug helpers:
- `window.__GV_PHASE2__.gainExp(9000, 9000)` — accelerate level/job QA.
- `window.__GV_SKILL_STATE__` — inspect current HP/SP and the last custom skill result.

## Skill runtime architecture

The built-in RPGJS synchronized hotbar remains disabled because it previously triggered the Safari `applySyncPacket` boot race. Phase 3 uses a Greenvale-owned DOM hotbar and a narrow standalone event bridge:

`skill UI → greenvale:skill-cast → authoritative standalone server handler → greenvale:skill-result`

This preserves the stable Phase 0 boot path and avoids mutating RPGJS skill/hotbar synchronized collections during initial hydration.

## Known Phase 3 limitations

- Final skill icons, VFX and SFX are placeholders referenced by stable ids.
- The current standalone skill bridge targets the local RPGJS server. A true remote multiplayer transport is deferred until the multiplayer backend phase.
- Phase 3 statuses only use the existing Slow/Stun/Bleed foundations. Full status resistance, stacking and UI timers are Phase 4.
- Auto battle currently chooses from configured learned skills and an HP threshold. Full item-inventory potion consumption belongs to the item/economy phase.
