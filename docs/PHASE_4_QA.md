# Phase 4 QA — Combat, Elements, Status, Aggro, Death and Auto Play

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
pnpm run test:phase4
```

Phase 4 checks:

- Phase 0–3 regressions still pass
- elemental multiplier changes damage
- Miss, Perfect Dodge, Critical and Block outcomes resolve
- PvP remains disabled
- save schema migrates to version 5
- Auto Attack / Auto Loot persist
- abnormal-status tray renders
- combat floating text renders
- death modal appears and save-point respawn works
- no fatal RPGJS sync or module boot error

## Manual iPhone Safari

1. Open the Phase 4 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Enter the world and fight Ashfang Wolf with basic attacks and skills.
3. Confirm floating combat text visibly differs:
   - normal damage
   - critical
   - block
   - miss
   - perfect dodge
4. Let the wolf attack and watch for Poison under the status tray.
5. Open MENU → **ต่อสู้ / ออโต้**.
6. Enable Auto Attack and confirm nearby enemies are attacked.
7. Disable Auto Loot, kill a wolf, then use the on-screen pickup prompt.
8. Re-enable Auto Loot and confirm loot is collected without the prompt.
9. Die once:
   - verify Base EXP loss
   - choose respawn at save point
   - verify 3-second revive protection
10. Die again and test Field Revive Kit if one remains.
11. Reload and confirm combat settings persist.
12. Confirm no runtime error overlay appears.

## Known Phase 4 limitations

- Current content contains one active training monster; the shared combat engine already supports all configured elements/sizes/races for later monsters.
- Aggro/threat is tracked server-side; party threat switching becomes visible when multiplayer/party content is introduced.
- Auto Loot currently handles the existing Wolf Fang drop path. Full ground-item ownership/timers are Phase 8.
- Status icons are project-generated CSS placeholders; final icons belong to the art pass.
