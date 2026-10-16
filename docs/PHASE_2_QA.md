# Phase 2 QA — Levels, Stats, Jobs, Costumes and Emotes

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
```

Phase 2 automation verifies on iPhone-sized WebKit:

- Phase 0 boot remains stable
- Phase 1 onboarding still works
- save schema migrates to version 3
- Base/Job EXP produces levels and spendable points
- six primary stats render and can be increased
- stat point cost is enforced
- Novice job change unlocks at Job Lv 10+
- one of the six jobs can be selected
- class change resets the new class Job Lv to 1
- class id and derived values are bridged into the RPGJS runtime profile
- costume selection persists without stat effects
- all emotes are data-driven and can trigger the in-world emote bubble
- no fatal RPGJS sync/module-script boot error appears

## Manual iPhone Safari

1. Open the Phase 2 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Create or select a character and enter the world.
3. Kill Ashfang/Mutant Wolves and confirm Base/Job EXP increases.
4. Open menu → **ค่าพลัง / อาชีพ**.
5. Spend a stat point and confirm the derived values update.
6. Confirm stat upgrade cost rises at the configured thresholds.
7. Reach Novice Job Lv 10, open the Job tab and choose one of:
   Vanguard, Arcanist, Ranger, Mender, Shade, Trader.
8. Confirm the new class name, passive, weapons and Base ASPD appear.
9. Confirm the selected class affects live RPGJS MaxHP/MaxSP/ATK/DEF without a boot error.
10. Select each costume and confirm the save changes but derived stats do not.
11. Trigger all 8 emotes and confirm the gesture bubble appears.
12. Reload and confirm class, stats, points and costume persist.

For faster manual QA in debug mode, the automated helper can grant EXP from DevTools:
`window.__GV_PHASE2__.gainExp(8000, 8000)`.

## Known Phase 2 limitations

- Final class sprites, weapon-specific attack sprites and VFX are placeholders/config references; original final art is still pending.
- Skill point spending is intentionally deferred to Phase 3 skill trees.
- Rebirth/second jobs are represented in config only and are disabled.
- Multiplayer-authoritative account progression is not active yet; standalone Netlify uses the local versioned save and mirrors the resulting combat stats into the RPGJS player.
