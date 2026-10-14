# Phase 5B — 2.5D Smooth Fantasy runtime sprites

## Current implementation

- New Canvas2D **transparent PNG atlases** generated locally in the browser. This does **not** fetch the original concept-board art from a URL.
- 96 × 112 px per cell, 3 motion frames × 4 facings (down, left, right, up). Whole PNG is 288 × 448 px.
- Character ids: `hero-*`, `npc-*`; monster ids: `monster-*`. Separate palettes/silhouettes for wolves, boars, rats, mushrooms, crabs, bats, golems, raiders and other enemies.
- Full RPGJS spritesheet resolver integration in `src/config/config.client.ts`, preserving the existing RM 3×4 animation contract, server character ids, collision, hotbar and combat logic.
- Default: smooth art. Add `?art=pixel` to the game URL to immediately switch back to the original sprite generator without changing saved characters.
- Sprites are cached as PNG data URLs per id. They only load when a character type is requested.

## Important limitations

The previously generated **concept-board image is art direction only**, not a clean frame-aligned spritesheet. The current game integration uses deterministic, drawn Canvas2D **prototype sprites**, not the concept-board painting. This is an intermediate runtime-compatible art upgrade; hand-drawn transparent frame-perfect atlases are still required to match the illustrated concept quality.

- This phase currently uses RPGJS 4-direction frames; **8-direction animation, dedicated run/attack/hit/death frame sets, and layered equipment remain future tasks**.
- The 3-frame generic swing remains a temporary animation. Gameplay collision and damage are unchanged.
- No 3D engine is added, keeping the existing RPGJS + Pixi renderer.
- No production/mobile performance figures have been measured yet.

## QA

Run `pnpm build` and `pnpm exec playwright test tests/smooth-fantasy.spec.ts --project=desktop-chromium`, then the existing `pnpm test:desktop` / `pnpm test:qa`.

Check visually on an actual iPhone:
1. Character appears in the camp with no black rectangle around it.
2. Player walking four facings, monster appearances, NPC appearances.
3. Combat attack, skill usage, map changes, death/revival.
4. Memory and FPS with several monsters nearby. `?art=pixel` is the rollback control.

Keep changes isolated from `main` until regression and actual-device QA succeed.
