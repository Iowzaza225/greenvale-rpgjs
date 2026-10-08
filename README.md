# Greenvale: After the Fall — RPGJS restoration preview

> This branch is a **playable-work-in-progress preview**. The live `main` branch and production Netlify site are deliberately unchanged.

## Now included
- Main menu: New Game / Continue
- Survivor name and six selectable classes with different initial stats
- RPGJS movement, collision, mobile joystick, attack, wolf AI
- Mara's first quest: defeat three Mutant Wolves
- Quest rewards: 25 Gold, a Wolf Fang for each kill, and the Greenvale Saber on completion
- Small in-game menu to view class and quest progress
- Lightweight localStorage save for character name/class and first-quest progress (on the same device and browser)

## Not yet implemented or validated
- Full RPGJS save/restore for equipment, inventory, world state and player position
- Native Inventory/Equipment UI and hotbar
- Pets, farming, crafting/forge, base building, dungeons and bosses
- Multiplayer synchronization
- End-to-end iPhone Safari gameplay verification (a successful build does **not** confirm runtime features)

## Build on the restoration branch

```sh
corepack enable
corepack prepare pnpm@11.6.0 --activate
pnpm install --no-frozen-lockfile
RPG_TYPE=rpg pnpm run build
```

Netlify configuration lives in `netlify.toml`: Node 22, `pnpm run build`, publish directory `dist`.
Do not change the live site's production branch until the preview has passed manual QA.

## Mobile QA checklist
1. Open a branch or PR deploy preview: it should show the Greenvale main menu without automatically entering the battle map.
2. Select New Game, provide a name, pick any class, then Start.
3. Confirm the canvas initializes, the survivor name appears, mobile movement works, and a Mutant Wolf can be defeated.
4. Confirm the mission counter increases to 3/3, and the quest reward arrives.
5. Refresh the same browser and press Continue; check the saved class/name and first-quest progress.
6. Check the in-game menu and the Mara dialogue.
7. Test at least one small-screen iPhone portrait view.

## Important
The profile uses browser local storage, not an authenticated server save. Clearing site data, changing browsers, or using private browsing may erase it. Starting a New Game deliberately overwrites the previous local profile.
