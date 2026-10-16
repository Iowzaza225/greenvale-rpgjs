# Phase 5 mobile 2.5D — Smooth Fantasy character animation

This **mobile-only** art slice starts from Phase 4 and does not bring in
the existing Desktop foundation PRs. No merge into `main`.

## Current art system
- Local, original deterministic Canvas2D drawing; no external RPGJS sample
  hero/monster texture CDN or copyrighted asset imports.
- Smooth non-pixel style, 96 × 112 px frames, 4 directions, 9 action
  banks × 3 poses = **27 columns × 4 rows** per character.
- Action banks: walk, idle, run, attack, cast, hit, death, rest, emote.
- Every action gets separately drawn transforms and foreground details;
  notably attack/cast/hit/death use different visible silhouettes.
- Character classes: Novice, Vanguard, Arcanist, Ranger, Mender, Shade, Trader.
- Eleven monster silhouettes and original NPC variants from `smooth-fantasy.ts`.
- `hero-<class>` appearance is selected from the actual RPGJS class;
  Ashfang Wolf and Mara use their dedicated RPGJS graphic ids.
- RPGJS native `attack2` and `attack3` load the attack bank; skill,
  hit, death, rest, run and emote banks are available for future runtime triggers.
- Fallback `?art=pixel` is available only for regression diagnosis.
- QA probes available under `?debug=1`: `window.__GV_MOBILE_ART_QA__`.

## QA
- `pnpm build`
- `pnpm test:qa`
- Verify iPhone WebKit loads the world, 13 sampled atlases contain all
  nine visible action banks and no regression in Phase 0–4.
- Test an actual iPhone Safari: move/turn; attack wolf with the normal
  attack and hotbar; watch attack frames; change jobs; return to camp;
  ensure no black sprite background, freeze or runtime overlay.

## Still pending
This is **not final character/monster art** and not a true 3D renderer.
Character customization/costume equipment compositing in the RPGJS map,
8-direction sets, independent hand-painted transparent atlases, fully wired
hit/death/rest/emote playback and profession-specific weapon animations are
still pending. The separate 2.5D world/map remake follows in another stage.
