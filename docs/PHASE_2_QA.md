# Phase 2 QA — Character Stats, Jobs, EXP, Emotes and Costumes

## Automated gate

Run:

```sh
pnpm run test:phase0
pnpm run test:phase1
pnpm run test:phase2
```

Phase 2 WebKit QA verifies:

- save schema migrates from v2 to v3 without losing the character
- six base stats exist at 1 on a new character
- stat points can be spent and obey the increasing cost table
- all 17 derived values render from `formulas.json`
- a Novice at Job Lv 10 sees all six first-job choices
- changing to Ranger resets Job Lv to 1 and equips the configured starter bow
- Base/Job EXP bridge advances levels and grants progression points
- four cosmetic choices persist without changing stat formulas
- nine required character animation placeholders are selectable
- eight emotes render and can be triggered in the world overlay
- Phase 0 boot and Phase 1 onboarding regressions still pass
- no `applySyncPacket`, module-script or RPGJS boot fatal error occurs

## Manual iPhone Safari

1. Open the Phase 2 Netlify Deploy Preview with `?debug=1&lang=th`.
2. Enter a saved character or create a new one.
3. Open the in-game menu.
4. Confirm Base/Job EXP bars, six stats, stat/skill point counts and derived values fit the safe area.
5. Kill Ashfang/legacy training wolves and confirm Base/Job EXP changes.
6. After receiving stat points, spend them and confirm derived values update immediately.
7. Reach Novice Job Lv 10 (or use the automated QA milestone) and choose one of the six jobs.
8. Confirm the class name, passive, allowed weapons, derived HP/SP/ASPD and starter weapon update.
9. Try the costume buttons. Confirm the Character Lab overlay changes while derived stats do not.
10. Try all nine animation placeholders and all eight emotes.
11. Reload Safari and confirm stats, class, EXP, costume and points persist.
12. Confirm no GREENVALE RUNTIME ERROR overlay appears.

## Known Phase 2 limitations

- The world character still uses the stable Phase 0 LPC placeholder sheet. Class outfits, costume layers, hit/death/rest/cheer and weapon-specific animations are implemented as original CSS/config placeholders in the Character Lab until final layered pixel sheets are produced.
- Skill points are earned and saved, but spending them belongs to Phase 3.
- Rebirth and second-job ids/config are present but intentionally disabled.
- Multiplayer-authoritative persistence is not connected yet; Guest progression remains localStorage-backed.
