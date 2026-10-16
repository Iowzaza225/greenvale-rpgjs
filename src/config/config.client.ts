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

import { SMOOTH_FRAME, smoothActionOffset, smoothFantasySheetDataUrl, type SmoothAction } from "../art/smooth-fantasy";
import { ORIGINAL_SPRITE_SIZE, originalSpriteDataUrl } from "../art/original-sprites";

// Animated frames are owned by the actual RPGJS spritesheet renderer.
// Asset pack artwork from other games never bypasses the sprite resolver.
const facingRows: Record<string, number> = { down: 0, left: 1, right: 2, up: 3 };
function makeRebornSpritesheet(id: string) {
  const pixelFallback = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("art") === "pixel";
  const image = pixelFallback ? originalSpriteDataUrl(id) : smoothFantasySheetDataUrl(id);
  const preset = Presets.RMSpritesheet(3, 4, 1);
  const action = (name: SmoothAction) => ({
    animations: ({ direction }: { direction: string }) => [[
      ...Array.from({ length: 3 }, (_, frame) => ({
        time: frame * 5,
        frameX: pixelFallback ? frame : smoothActionOffset(name) + frame,
        frameY: facingRows[direction] ?? 0,
      })),
    ]],
  });
  const idle = {
    animations: ({ direction }: { direction: string }) => [[
      { time: 0, frameX: pixelFallback ? 1 : smoothActionOffset("idle") + 1, frameY: facingRows[direction] ?? 0 },
    ]],
  };
  return {
    id, image, ...preset,
    width: pixelFallback ? ORIGINAL_SPRITE_SIZE.width : SMOOTH_FRAME.width * SMOOTH_FRAME.columns,
    height: pixelFallback ? ORIGINAL_SPRITE_SIZE.height : SMOOTH_FRAME.height * SMOOTH_FRAME.rows,
    framesWidth: pixelFallback ? 3 : SMOOTH_FRAME.columns,
    framesHeight: 4,
    spriteRealSize: { width: 44, height: 54 },
    textures: {
      ...preset.textures,
      idle,
      run: action("run"),
      attack: action("attack"),
      attack2: action("attack"),
      attack3: action("attack"),
      skill: action("cast"),
      cast: action("cast"),
      hit: action("hit"),
      death: action("death"),
      rest: action("rest"),
      emote: action("emote"),
    },
  };
}
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1") {
  (window as any).__GV_MOBILE_ART_QA__ = {
    actionOffset: smoothActionOffset,
    actions: ["walk", "idle", "run", "attack", "cast", "hit", "death", "rest", "emote"],
    smooth: smoothFantasySheetDataUrl,
  };
}

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
          joystickMargin: [18, 18, 18, 12],
          buttonsMargin: 18,
          gap: 10,
        },
        joystick: {
          outerColor: "#29495c",
          innerColor: "#eef6f6",
          scale: 0.83,
          moveInterval: 25,
          threshold: 0.06,
        },
        buttons: {
          action: { enabled: true, width: 62, height: 62 },
          back: { enabled: false, width: 54, height: 54 },
          dash: { enabled: false, width: 56, height: 56 },
        },
      }),
      {
        spritesheetResolver: async (id: string) => {
          if (id === "hero") return makeRebornSpritesheet("hero-novice");
          if (id === "monster") return makeRebornSpritesheet("monster-ashfang_wolf");
          if (id.startsWith("hero-") || id.startsWith("monster-") || id.startsWith("npc-")) {
            return makeRebornSpritesheet(id);
          }
          if (id === "potion" || id === "focus-slash") {
            return Presets.IconPreset({
              id,
              image: originalSpriteDataUrl("hero-novice"),
              framesWidth: 3,
              framesHeight: 4,
            });
          }
          return undefined;
        },
      },
    ]),
  ],
};
