# Greenvale Afterfall — Asset TODO

Phase 0 keeps gameplay bootable while the final art pipeline is prepared. No asset from the reference game is used.

## Replace before release

| Current placeholder | Final asset target | Notes |
| --- | --- | --- |
| RPGJS sample `hero.png` | `public/assets/characters/novice/` | Create original Greenvale pixel character sheets: idle/walk/run/attack/hit/death/rest/emote |
| RPGJS sample `monster.png` | `public/assets/monsters/ashfang_wolf/` | Original mutated-beast design |
| RPGJS sample `wood.png` reused as icons | `public/assets/icons/items/` and `public/assets/icons/skills/` | Unique item/skill icons |
| Canvas rectangle camp map | `public/assets/maps/greenvale_camp/` | Original tileset, props, collision reference |
| No final VFX | `public/assets/effects/` | Spark, heal, buff, level-up, warp, skill effects |
| No final BGM/SFX | `public/assets/audio/` | Camp BGM, UI, attack, skill, monster sounds |

## Placeholder policy

New missing art must use an original CSS/SVG/Canvas placeholder or a clearly marked internal placeholder id. Do not copy screenshots, logos, characters, skill art, monster art, names, or UI assets from the reference game.


## Phase 1 onboarding placeholders

| Placeholder | Replace with | Phase |
| --- | --- | --- |
| CSS-built survivor preview | Original layered pixel-art character sheets for 2 body types, 6 hair styles, 8 hair colors, 4 skin tones, and starter outfits | Before final art lock |
| CSS profession skill preview | Original sprite/VFX preview clips for Vanguard, Arcanist, Ranger, Mender, Shade, Trader | Phase 3/6 |
| CSS prologue scenery | Original 6-frame Afterfall concept/pixel scenes | Art pass |
| Text-only Greenvale wordmark | Final original Greenvale Afterfall logo | Branding pass |

The CSS placeholders are original project-generated shapes. They do not copy art from the reference screenshots.


## Phase 2 class-system placeholders

| Placeholder | Final asset target | Notes |
| --- | --- | --- |
| CSS class icons | `public/assets/icons/classes/` | Original icons for Novice, Vanguard, Arcanist, Ranger, Mender, Shade, Trader |
| CSS class outfit colors | layered character equipment sheets | One original job outfit per class |
| CSS costume overlays | `public/assets/costumes/` | Valley Cloak, Ash Scarf, Signal Coat; cosmetic only |
| Character Lab animation dummy | layered sprite sheets | idle, walk, run, attack per weapon, skill, hit, death, rest, cheer |
| Emoji development emotes | `public/assets/emotes/` | Replace all 8 with original Greenvale pixel emotes before art lock |
| Starter weapon placeholders | `public/assets/weapons/` | staff, bow, mace, dagger and cart-tool art |

Phase 2 gameplay data and animation mappings already reference stable ids, so final art can replace placeholders without changing save ids or game rules.
