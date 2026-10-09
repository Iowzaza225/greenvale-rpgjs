# Greenvale Afterfall

Mobile-first post-apocalyptic RPG built with RPGJS and deployed on Netlify. iPhone Safari is the primary browser target.

## Development rule

Work is released phase-by-phase. A phase is not complete until the production build passes and the iPhone WebKit smoke test passes. Working systems are preserved; unstable features are isolated instead of being mixed into a stable boot path.

## Project structure

```text
src/
  core/
    build-info.ts       build id/version shown in debug mode
    config.ts           loads and validates JSON game data
    event-bus.ts        internal decoupled event bus
    i18n.ts             Thai/English locale service
    save.ts             versioned Guest save, migration, 3 character slots
  data/
    classes.json
    skills.json
    monsters.json
    items.json
    quests.json
    maps.json
    shop.json
    status_effects.json
    drops.json
    formulas.json
    effects.json
    character_creation.json
    cutscene.json
  i18n/
    th.json
    en.json
  config/
    config.client.ts    RPGJS client/mobile configuration
  ui/
    onboarding.ts       title, slots, creator, prologue, tutorial
    onboarding.css      safe-area mobile UI + original CSS placeholders
  server.ts             current RPGJS authoritative gameplay module
  standalone.ts         browser bootstrap
tests/
  phase0-boot.spec.ts   iPhone WebKit boot smoke
```

Every JSON dataset has `schemaVersion: 1`. `src/core/config.ts` validates schema versions and duplicate ids before RPGJS is started. If config validation fails, the mobile runtime error overlay appears before the game starts.

## i18n

Thai is the default UI language. All new UI strings must be added to both:

- `src/i18n/th.json`
- `src/i18n/en.json`

Use `t("some.key")` from `src/core/i18n.ts`. Do not add new user-facing strings directly into gameplay code unless they are a temporary legacy string scheduled for migration.

## Game-data authoring

The JSON files are the content source of truth for new systems. Add content by data, not by adding another hard-coded switch statement.

### Add a monster

1. Add a unique record to `src/data/monsters.json`.
2. Add its drop table to `src/data/drops.json`.
3. Add Thai/English name keys to the i18n files.
4. Reference its id from a spawn zone in `maps.json` when the spawn-zone system is enabled.
5. Add missing original art to `ASSET_TODO.md`.

### Add a skill

1. Add a record to `skills.json` with a stable id and formula/effect references.
2. Add text keys to both i18n files.
3. Reference formula ids from `formulas.json` and effect ids from `effects.json`.
4. Assign it to a class skill tree through class data when the Phase 3 skill tree is enabled.

### Add an item

1. Add the item to `items.json`.
2. Add translation keys.
3. Reference the item id from shops, drops, quests or recipes.

### Add a quest

1. Add the quest to `quests.json`.
2. Add translation keys.
3. Use stable monster/item/map ids for objectives and rewards.

The legacy Phase-0 combat encounter in `server.ts` is intentionally preserved while the data-driven runtime adapters are introduced phase-by-phase; new content must use the JSON data path.

## Event bus

`src/core/event-bus.ts` exposes `gameEvents`.

Examples:

```ts
gameEvents.on("game:canvas-ready", ({ build }) => {
  console.log("ready", build)
})

gameEvents.emit("quest:updated", { questId: "main_first_hunt" })
```

This keeps HUD, audio, quests, save, networking and gameplay systems from importing each other directly.

## Build and test

```sh
corepack enable
corepack prepare pnpm@11.6.0 --activate
pnpm install --no-frozen-lockfile
RPG_TYPE=rpg pnpm run build
pnpm exec playwright install webkit
pnpm run test:phase0
```

To show the build id on screen, open the game with:

```text
?debug=1
```

## Netlify

`netlify.toml` is the source of truth:

- Node 22
- build command: `pnpm run build`
- publish directory: `dist`
- standalone RPG type: `RPG_TYPE=rpg`
- HTML is never cached
- hashed assets are immutable
- missing assets are not rewritten to `index.html`

See `docs/PHASE_0_QA.md` for manual iPhone validation.

## Art policy

Reference screenshots are layout/system inspiration only. Greenvale Afterfall must use original names, visual identity, characters, monsters, skills and art. Temporary non-final assets are tracked in `ASSET_TODO.md`.


## Phase 1 onboarding

Guest onboarding now uses a versioned local save (`greenvale.save`, schema version 2) with three character slots and migration from the legacy Phase 0 profile. New characters always begin as Novice; career previews are informational until Job Lv 10 is implemented in Phase 2.

Character creation content is configured in `src/data/character_creation.json`: name rules, reserved words, random-name pools, genders, six hair styles, eight hair colors, four skin tones, starter outfits, preview animations and directions. Prologue frames live in `src/data/cutscene.json`.

The current login button is intentionally a backend-ready UI boundary only. It does not fake authentication. Guest saves are local to the browser/device until a real account backend is introduced.

For Phase 1 validation see `docs/PHASE_1_QA.md`.


## Phase 2 character progression

Character saves now use schema version 3. Each character stores:

- Base Lv / Base EXP (1–99)
- Job Lv / Job EXP (1–50)
- STR, AGI, VIT, INT, DEX, LUK
- unspent stat and skill points
- selected job
- cosmetic costume selection

`src/core/character.ts` is the shared rules engine for EXP leveling, stat costs, job changes and derived stats. Balance data stays in JSON:

- `classes.json`: jobs, weapon permissions, HP/SP growth, ASPD, passives, animation ids, 8 emotes, costumes and second-job/Rebirth scaffolding
- `formulas.json`: derived-stat formulas, stat-point cost tiers, Base 1–99 EXP table and Job 1–50 EXP table

Novice changes job at Job Lv 10 into Vanguard, Arcanist, Ranger, Mender, Shade or Trader. Skill points are earned now but are intentionally spent in Phase 3.

The in-game **Stats / Job** window is mobile safe-area aware and allows stat allocation, job selection, costume switching and emotes. Standalone RPGJS receives updated MaxHP/MaxSP/ATK/DEF immediately through the local runtime bridge.

See `docs/PHASE_2_QA.md`.


## Phase 3 skills

`src/data/skills.json` is now the source of truth for the complete first-job skill layer:

- 3 Novice skills
- 8 Vanguard skills
- 8 Arcanist skills
- 8 Ranger skills
- 8 Mender skills
- 8 Shade skills
- 8 Trader skills

Every skill defines stable ids, translation keys, type, MaxLv, prerequisites, per-level SP, cooldown, cast time, after-cast delay, range, area shape, per-level damage/heal values, formula id, element, allowed weapon types, consumed-item field, VFX id, SFX id, status effect and tree coordinates.

The shared rules engine is `src/core/skills.ts`. It handles learning, prerequisite validation, skill-point spending, hotbar assignments, reset/refund, passive derived-stat bonuses and Auto settings.

### Add a skill by JSON

1. Add the skill record to `src/data/skills.json`.
2. Add `skill.<id>.name` and `skill.<id>.description` to both i18n files.
3. Add the referenced effect id to `src/data/effects.json`.
4. Use an existing formula id from `formulas.json` and an existing status id from `status_effects.json`.
5. Put its `tree.x/tree.y` coordinates and prerequisite ids in JSON.
6. No skill-tree UI code change is needed: the Phase 3 UI renders the tree and connectors from config.

### Mobile hotbar

Greenvale uses its own 10-slot hotbar rather than the RPGJS synchronized hotbar. On portrait iPhone it displays as two rows of five above the movement/action controls and respects the bottom safe area. Learned skills can be quick-assigned or held and dragged to slots 0–9.

See `docs/PHASE_3_QA.md`.


## Phase 3 skill system

Skills are fully data-driven from `src/data/skills.json`. The current dataset contains **51 original Greenvale skills**:

- Novice: 3
- Vanguard: 8
- Arcanist: 8
- Ranger: 8
- Mender: 8
- Shade: 8
- Trader: 8

Each skill record contains the gameplay fields needed by the Phase 3 runtime: `id`, `classId`, translation keys, type, MaxLv, prerequisites, SP-by-level, cooldown, cast time, after-cast delay, range, area shape, power/heal-by-level, element, weapon requirements, consumed items, formula id, icon/effect/sound ids, optional status effect, interrupt flag, skill-tree coordinates, runtime behavior and auto-battle metadata.

### Add a new skill with JSON only

1. Add one object to `src/data/skills.json`.
2. Add `skill.<id>.name` and `skill.<id>.description` to `src/i18n/th.json` and `src/i18n/en.json`.
3. Add the referenced `effectId` to `src/data/effects.json`.
4. If the skill applies a status, reference an id already defined in `src/data/status_effects.json`.
5. Build. `validateGameConfig()` rejects invalid class ids, wrong per-level array lengths, duplicate ids, missing prerequisites/effects/statuses, or classes with fewer than the required Phase 3 skill count.

No TypeScript edit is required for a normal damage/heal/buff/debuff/toggle/passive skill that uses the existing runtime kinds.

### Save / hotbar

Save schema version 4 stores learned levels, 10 hotbar slots, auto-battle settings and the reset-item count. Old Phase 1/2/3 saves migrate automatically. The mobile hotbar is separate from RPGJS synchronized built-in skill state so iPhone Safari does not reintroduce the earlier async hydration failure.

See `docs/PHASE_3_QA.md`.


## Phase 4 combat

Combat rules are centralized in `src/core/combat.ts` and balanced from `src/data/formulas.json`.

Supported combat outcomes:

- physical and magical formula paths
- Neutral, Fire, Water, Wind, Earth, Light, Dark
- Small / Medium / Large size multipliers
- Beast / Plant / Undead / Human / Demon race modifiers
- Miss, Perfect Dodge, Critical, Block
- PvP configuration locked off
- threat accumulation per enemy
- death EXP penalty, save-point/item revive, 3-second revive invulnerability
- Auto Attack and Auto Loot preferences

`status_effects.json` contains Poison, Bleed, Stun, Slow, Freeze, Sleep, Silence, Blind and Confusion plus combat buffs. New status content should be added there, translated in both i18n files, and referenced by skill/monster config instead of hard-coded UI strings.

The current standalone server bridges RPGJS hits through the shared combat resolver, so Phase 3 skills and normal attacks use the same damage outcome path.

See `docs/PHASE_4_QA.md`.
