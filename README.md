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
  i18n/
    th.json
    en.json
  config/
    config.client.ts    RPGJS client/mobile configuration
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
