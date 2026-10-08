import {
  HudComponent,
  Presets,
  inject,
  provideClientGlobalConfig,
  provideClientModules,
  provideLoadMap,
  RpgClientEngine,
  withMobile,
} from "@rpgjs/client";
import {
  createActionBattleUi,
  createActionBattleVisual,
  provideActionBattle,
} from "@rpgjs/action-battle/client";
import CampMap from "../components/camp-map.ce";
import { CAMP_HEIGHT, CAMP_HITBOXES, CAMP_WIDTH } from "../shared";

const RPGJS_ASSET_BASE =
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
      ui: createActionBattleUi({
        hotbar: { enabled: true, autoOpen: true },
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
          moveInterval: 40,
          threshold: 0.08,
        },
        buttons: {
          action: { enabled: true, width: 70, height: 70 },
          back: { enabled: true, width: 54, height: 54 },
          dash: { enabled: true, width: 56, height: 56 },
        },
      }),
      {
        gui: [
          {
            id: "hud",
            component: HudComponent,
            autoDisplay: true,
            dependencies: () => {
              const engine = inject(RpgClientEngine);
              return [engine.scene.currentPlayer];
            },
          },
        ],
        spritesheetResolver: async (id: string) => {
          if (id === "hero") {
            return Presets.LPCSpritesheetPreset({
              id: "hero",
              imageSource: RPGJS_ASSET_BASE + "hero.png",
              width: 1728,
              height: 5568,
              ratio: 1.35,
            });
          }
          if (id === "monster") {
            return Presets.LPCSpritesheetPreset({
              id: "monster",
              imageSource: RPGJS_ASSET_BASE + "monster.png",
              width: 1248,
              height: 2016,
              ratio: 1.28,
            });
          }
          if (id === "potion") {
            return Presets.IconPreset({
              id,
              image: RPGJS_ASSET_BASE + "wood.png",
              framesWidth: 1,
              framesHeight: 1,
            });
          }
          return undefined;
        },
        sceneMap: {
          onAfterLoading() {
            const engine = inject(RpgClientEngine);
            const viewport = (engine as any).findViewportInstance?.();
            if (viewport) viewport.setZoom?.(1.05, false);
          },
        },
      },
    ]),
  ],
};
