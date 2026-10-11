# Phase 5 QA — Monsters, Spawn Zones, Bosses and Bestiary

## Scope

Phase 5 expands the Phase 4 combat runtime without replacing it. Monster content is now data-driven from `monsters.json`, spawn slots come from `maps.json`, drops remain in `drops.json`, and the existing combat/status/loot paths are reused.

Implemented in this phase:

- 14 original Greenvale monsters covering Lv 2–30
- AI metadata for passive, aggressive, assist, ranged, coward and boss types
- sparse fixed spawn-slot pools from map spawn zones with per-zone `maxAlive`
- leash/vision/assist metadata, ranged attack distance, coward low-HP retreat
- field bosses with top-screen HP bar and HP phase tracking
- mini-boss schedule metadata of 30–60 minutes plus world-style announcement
- Safari-safe respawn: Action Battle removes defeated events, then Phase 5 recreates the fixed spawn slot as a fresh RPGJS event
- difficulty-colored target names based on player level
- persistent Bestiary kill counts, reveal thresholds and one-time collection rewards
- data-driven EXP and drop dispatch for every monster

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
pnpm run test:phase3
pnpm run test:phase4
pnpm run test:phase5
```

The Phase 5 iPhone WebKit test verifies:

- the RPGJS canvas still boots
- the Bestiary control is mounted only after gameplay starts
- a real spawned monster can be defeated through the Phase 4 auto-attack path
- Greenvale Camp keeps only 3 live quest wolves during normal play
- the defeated wolf slot respawns as a fresh RPGJS event without a `removeEvent` runtime error
- a defeat is persisted to `greenvale.bestiary.v1`
- all 14 Bestiary entries render
- Ashfang Alpha drives the field-boss bar
- the Marrowtusk mini-boss pooled slot can be activated in debug mode
- no fatal RPGJS sync/module-script/runtime errors occur

## Manual iPhone Safari

1. Open the Phase 5 Deploy Preview with `?debug=1&lang=th`.
2. Create/enter a character and confirm the Bestiary button appears after the canvas loads.
3. Cycle targets and confirm monster names show level-based difficulty color.
4. Fight several monster types. Confirm HP, EXP, status procs and loot use each monster's own JSON stats.
5. Open Bestiary and confirm kill totals persist after reload.
6. Kill enough of one species to reach its reveal threshold; its data should become visible.
7. Reach its collection threshold; the one-time reward should route through the existing loot system.
8. Target Ashfang Alpha and confirm the boss bar appears at the top safe area.
9. Reduce a boss through configured HP thresholds and confirm its phase number updates.
10. For the 30–60 minute mini-boss schedule, either wait normally or use the debug activation event in a QA build.

## Known limitations

- All Phase 5 monsters currently share the temporary RPGJS sample monster sheet; original sprites are tracked in `ASSET_TODO.md`.
- Monster special-skill ids and boss phase skill sets are configured now; bespoke VFX/animations are deferred to Phase 6.
- The ranged AI uses the stable RPGJS action-battle attack pattern at an extended attack range until original projectile VFX lands in Phase 6.
- The full 14-monster roster remains in data/Bestiary, but Greenvale Camp now spawns only the 3 Ashfang Wolves needed for the opening quest. Other species are reserved for their later maps; field bosses are spawned explicitly in QA instead of crowding the camp.
