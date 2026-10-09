import {
  Presets,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
  withMobile,
} from "@rpgjs/client";
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle,
} from "@rpgjs/action-battle/client";
import CampMap from "../components/camp-map.ce";
import { CAMP_HEIGHT, CAMP_HITBOXES, CAMP_WIDTH } from "../shared";

const ASSET_BASE =
  "https://raw.githubusercontent.com/RSamaium/RPG-JS/v5/playground/games/action-battle/public/";

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: CampMap,
      width: CAMP_WIDTH,
      height: CAMP_HEIGHT,
      data: {},
      hitboxes: CAMP_HITBOXES,
    })),
    provideClientGlobalConfig(),
    provideActionBattle({
      visual: createActionBattleVisual("impact"),
      // Greenvale renders one authoritative floating number from combat-system.ts.
      // Disable Action Battle's built-in damage number component to avoid duplicate
      // sprite-attached "-0" / "-damage" labels on iPhone.
      feedback: { damageNumbers: false },
      // LPC preset provides attack2 (7-frame slash) and attack3 (6-frame heavy swing).
      animations: { attack: { animationName: "attack2", repeat: 1 } },
      ui: createActionBattleUi({
        hotbar: false,
        targeting: true,
        attackPreview: true,
      }),
    }),
    provideClientModules([
      withMobile({
        enabled: "auto",
        layout: {
          joystickSide: "left",
          joystickMargin: [24, 22, 24, 18],
          buttonsMargin: 20,
          gap: 12,
        },
        joystick: {
          outerColor: "#29495c",
          innerColor: "#eef6f6",
          scale: 0.86,
          moveInterval: 25,
          threshold: 0.06,
        },
        buttons: {
          action: { enabled: true, width: 70, height: 70 },
          back: { enabled: true, width: 54, height: 54 },
          dash: { enabled: true, width: 56, height: 56 },
        },
      }),
      {
        spritesheetResolver: async (id: string) => {
          if (id === "hero") {
            return Presets.LPCSpritesheetPreset({
              id: "hero",
              imageSource: ASSET_BASE + "hero.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            });
          }
          if (id === "monster") {
            return Presets.LPCSpritesheetPreset({
              id: "monster",
              imageSource: ASSET_BASE + "monster.png",
              width: 1728,
              height: 5568,
              ratio: 1.5,
            });
          }
          if (id === "potion" || id === "focus-slash") {
            return Presets.IconPreset({
              id,
              image: ASSET_BASE + "wood.png",
              framesWidth: 1,
              framesHeight: 1,
            });
          }
          return undefined;
        },
      },
    ]),
  ],
};
