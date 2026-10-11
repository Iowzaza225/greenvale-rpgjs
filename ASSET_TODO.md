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


## Phase 2 placeholders

| Placeholder | Final original asset |
| --- | --- |
| CSS two-letter class badges | 7 original class icons: Novice, Vanguard, Arcanist, Ranger, Mender, Shade, Trader |
| CSS costume mannequins | Layered costume sprites for Greenvale Scout, Ash Wanderer and Signal Runner |
| Text emote bubble | 8 original emote sprite animations/icons |
| Shared temporary RPGJS hero sheet | Per-class outfit sheets and weapon-specific idle/walk/run/attack/skill/hit/death/rest/emote animation sheets |

All final art must remain original to Greenvale Afterfall.


## Phase 3 skill placeholders

| Placeholder | Final original asset |
| --- | --- |
| Two-letter CSS skill icons | 51 original skill icons matching Greenvale Afterfall visual language |
| `placeholder://skill/<id>` effects | Unique VFX/sprite sheets for every skill id |
| `sfx_<skill-id>` references | Original cast/impact audio for each skill |
| Generic cast-bar presentation | Final Greenvale cast/interrupt animation and sound |
| Generic cooldown conic overlay | Final icon masks/cooldown ring art |

The placeholder ids are stable so final art/audio can replace them without changing skill logic.


## Phase 4 placeholders

| Placeholder | Final original asset |
| --- | --- |
| CSS target card / target button | Original lock-on ring + target marker |
| CSS floating damage text | Original combat-number font/VFX treatment |
| Text status chips | Original status-effect icons |
| Generic impact animation | Element-specific hit, crit, block, miss and status VFX |
| Text ground-loot panel | Original world-drop sprite, pickup glow and pickup SFX |
| Knockout overlay | Original downed/respawn treatment |

All final combat presentation must remain original to Greenvale Afterfall.

## Phase 5 monster placeholders

| Placeholder | Final original asset |
| --- | --- |
| Shared RPGJS monster sheet | Original sheets for Mossling, Rustpipe Rat, Ashfang Wolf, Wandering Sporecap, Ironspine Boar, Ragcrow, Cinder Bat, Mire Crab, Hivewing, Shale Golem, Hollow Raider, Ashfang Alpha, Verdant Rotroot and Marrowtusk |
| Text/CSS field-boss bar | Original Greenvale boss-frame art and phase markers |
| CSS Bestiary symbols | Original monster portraits/silhouettes and discovery/reward badges |
| Melee animation reused by ranged AI | Original projectile sprite/VFX and impact animation in Phase 6 |
| Text mini-boss announcement | Original world-announcement panel and SFX |

All Phase 5 names and data are original Greenvale Afterfall content.
