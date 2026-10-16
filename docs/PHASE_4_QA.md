# Phase 4 QA — Combat, Targeting, Status, Loot and Respawn

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
pnpm run test:phase4
```

Phase 4 automation verifies on iPhone-sized WebKit:

- Phase 0–3 regressions remain green
- save schema migrates to version 5
- combat HUD appears after the RPGJS canvas is ready
- nearest Ashfang Wolf can be targeted
- auto attack acquires and approaches a target
- outgoing combat produces real damage
- default auto-loot persists a drop into the local loot bag
- player status UI receives authoritative status state
- death overlay appears and the player respawns at camp
- combat preferences persist
- no fatal RPGJS sync/module-script boot error appears

## Manual iPhone Safari

1. Open the Phase 4 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Enter Greenvale Camp.
3. Tap **Target** to cycle Ashfang Wolves.
4. Tap **Attack** from outside melee range. The character should approach and attack.
5. Toggle **AUTO** and confirm repeated basic attacks respect ASPD/cooldown.
6. Use skills and confirm floating results can show HIT, CRIT, BLOCK, MISS or Perfect Dodge.
7. Confirm the target card updates HP, distance, element and race.
8. Let a wolf hit the player and confirm incoming damage feedback appears.
9. Trigger/observe Bleed, Slow or Stun and confirm status chips appear and expire.
10. Defeat wolves and confirm Auto Loot adds drops to the Combat → Loot Bag.
11. Turn Auto Loot off, defeat/trigger a drop, and manually pick the ground-loot button.
12. Let the player die. Confirm the knockout overlay appears, then respawn occurs at Greenvale Camp with temporary invulnerability.
13. Reload and confirm auto-attack, auto-loot and loot-bag state persist.

## Combat data

- `formulas.json > combat`: HIT/FLEE, critical, block, element, size, race, variance, attack/loot/respawn ranges.
- `status_effects.json`: stack policy, duration, tick interval, control and speed behavior.
- `monsters.json`: monster combat stats, aggro/leash metadata, basic-attack status proc.
- `drops.json`: drop tables and auto-loot defaults.
- `src/core/combat.ts`: deterministic pure combat rule functions.

## Known limitations

- Final hit VFX/SFX and target-ring art are placeholders.
- Only the Ashfang Wolf encounter is wired into the Phase 4 data-driven runtime; additional monsters use the same config structure in later content phases.
- PvP is disabled.
- Full inventory/equipment UI remains separate from the lightweight Phase 4 loot bag.
