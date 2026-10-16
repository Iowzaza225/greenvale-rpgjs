# REBORN: External Asset License Registry

## Imported assets actually present in this branch

The three PNG files below are copied unmodified from **Kenney — Mobile Controls**, via a public git mirror.
- `public/assets/kenney-mobile/icon_sword.png`
- `public/assets/kenney-mobile/icon_target.png`
- `public/assets/kenney-mobile/icon_menu.png`

**Author:** Kenney (https://kenney.nl/)  
**Original pack:** https://kenney.nl/assets/mobile-controls  
**Public mirror:** https://github.com/shorepine/kenney  
**Pinned mirror commit:** `3694c6879e487c108f55677be7dd2ca75b07cc3b`  
**Original source paths:** `ui/Mobile Controls/Sprites/Icons/icon_sword.png`, `icon_target.png`, `icon_menu.png`  
**License:** CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/), optional credit appreciated.

These are *assets*, not external scripts or remote runtime dependencies. Source art credit does not imply Kenney endorsement.

## Character / monster artwork

`src/art/smooth-fantasy.ts` and `src/art/original-sprites.ts` are **original procedural sprite generators from this project's earlier Phase 5 preview**, reused on the REBORN branch. They produce 27x4 atlas frames for classes, monsters and NPCs.

The generated artwork is not a commercial asset pack and is not final hand-painted 2.5D artwork. There is **no external knight GLTF, OpenGameArt ZIP or Sova Digital art inside this branch**. Such packs were researched, but license permission alone does not guarantee RPGJS compatibility. Future external character imports require verifying frame layout, alpha channel, foot pivot and directional states, plus a repeatable conversion/test pipeline.

## Source validation

Do not copy art from non-open games without permission. Keep external art licenses beside the code. Avoid remote hotlinks in production.
