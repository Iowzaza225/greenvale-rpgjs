# Phase 4 QA — Combat Core

## Automated iPhone WebKit gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
pnpm run test:phase4
```

Phase 4 automation checks:

- Phase 0–3 regressions still pass
- save migrates to version 5
- Combat / Auto menu opens on iPhone-sized WebKit
- Auto Attack setting persists
- nearest-enemy target HUD appears
- Auto Attack approaches and damages a live Ashfang Wolf
- manual loot prompt appears when Auto Loot is disabled
- loot can be claimed in range
- KO overlay appears at 0 HP
- player revives asynchronously at Greenvale Camp
- no fatal RPGJS hydration/module-script/applySyncPacket error appears

## Manual iPhone Safari

1. Open the Phase 4 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Enter the world and verify the target HUD does not cover the safe area.
3. Fight Ashfang Wolf with a normal attack:
   - HIT should deal one bounded amount
   - MISS/DODGE should deal 0
   - CRIT should be larger
   - BLOCK should reduce the result
4. Use offensive skills and verify the same combat resolver is used.
5. Apply Slow, Stun, Bleed or other configured statuses with class skills and verify status labels/timers clear.
6. Open MENU → **ต่อสู้ / ออโต้**:
   - turn Auto Attack on/off
   - turn Auto Loot on/off
   - change loot radius
7. With Auto Attack on, stand away from a wolf and confirm the player acquires, approaches, then attacks.
8. With Auto Loot off, kill a wolf and claim the nearby loot prompt.
9. With Auto Loot on, kill a wolf inside the configured radius and confirm the loot is collected without tapping.
10. Reload and confirm combat settings and saved loot ledger persist.
11. Let the player die. Confirm KO overlay appears and the character revives at camp with 50% HP/SP.
12. Confirm Phase 3 skill auto-approach still works and does not return the old false “no target in range” message.

## Current limitations

- Only the Ashfang Wolf encounter is wired to the Phase 4 monster adapter. New monsters can use the same JSON structure in later map/content phases.
- Final damage-number art, status icons, target-ring art and loot-world sprites are placeholders.
- The current standalone build has one player; the threat table is ready for multiple targets, but multiplayer threat arbitration is not meaningful until networking/account phases.
- Full equipment-driven elements/resistances and inventory weight/equipment UI belong to later item/equipment phases.
