import { worldHitboxes } from "../core/world-geometry";
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
import TrainingMap from "../components/training-plains.ce";
import GroveMap from "../components/mutant-grove.ce";
import CavernMap from "../components/stoneburrow-cavern.ce";
import BossMap from "../components/rotten-core.ce";
import { ORIGINAL_SPRITE_SIZE, originalSpriteDataUrl } from "../art/original-sprites";
import { SMOOTH_FRAME, smoothFantasySheetDataUrl } from "../art/smooth-fantasy";
import { paintedFantasySheetDataUrl } from "../art/painted-sprites";
import { CAMP_HEIGHT, CAMP_HITBOXES, CAMP_WIDTH } from "../shared";

const WORLD_COMPONENTS: Record<string, any> = {
  "greenvale-camp": CampMap,
  "training-plains": TrainingMap,
  "mutant-grove": GroveMap,
  "stoneburrow-cavern": CavernMap,
  "rotten-core": BossMap,
};

function mapSize(id: string) {
  return id === "greenvale-camp" ? { width: CAMP_WIDTH, height: CAMP_HEIGHT }
    : { width: 1600, height: 1000 };
}

async function makeCharacterSpritesheet(id: string) {
  // Default to smooth-fantasy. ?art=pixel restores the old pixel sheet for QA.
  const mode = typeof window === "undefined" ? "painted" :
    new URLSearchParams(window.location.search).get("art") || "painted";
  const pixelArt = mode === "pixel";
  // Painted original assets are the default; canvas art remains a safe fallback.
  let image = pixelArt ? originalSpriteDataUrl(id) : smoothFantasySheetDataUrl(id);
  if (!pixelArt && mode !== "canvas") {
    try {
      image = (await paintedFantasySheetDataUrl(id)) ?? image;
    } catch (error) {
      console.warn("[Greenvale] Painted sprite unavailable, using canvas fallback:", id, error);
    }
  }
  const width = pixelArt ? ORIGINAL_SPRITE_SIZE.width : SMOOTH_FRAME.width * SMOOTH_FRAME.columns;
  const height = pixelArt ? ORIGINAL_SPRITE_SIZE.height : SMOOTH_FRAME.height * SMOOTH_FRAME.rows;
  const preset = Presets.RMSpritesheet(3, 4, 1);
  const row = (direction: string) => ({ down: 0, left: 1, right: 2, up: 3 } as Record<string, number>)[direction] ?? 0;
  const swing = ({direction}: {direction: string}) => [[
    {time:0,frameX:0,frameY:row(direction)},
    {time:5,frameX:1,frameY:row(direction)},
    {time:10,frameX:2,frameY:row(direction)},
  ]];
  return {
    id, image,
    width, height,
    framesWidth: 3, framesHeight: 4,
    spriteRealSize: { width: 40, height: 48 },
    ...preset,
    textures: {
      ...preset.textures,
      attack2: { animations: swing },
      attack3: { animations: swing },
      attack: { animations: swing },
      skill: { animations: swing },
    },
  };
}

/** Debug-only adapter for QA of bundled, production-generated image atlases. */
declare global {
  interface Window {
    __GV_ART_QA__?: { smooth: (id: string) => string; pixel: (id: string) => string };
  }
}
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1") {
  window.__GV_ART_QA__ = {
    smooth: smoothFantasySheetDataUrl,
    pixel: originalSpriteDataUrl,
    painted: paintedFantasySheetDataUrl,
  };
}

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: WORLD_COMPONENTS[id] || CampMap,
      ...mapSize(id),
      data: {},
      hitboxes: worldHitboxes(id),
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
          joystickMargin: [24, 22, 46, 18],
          buttonsMargin: 42,
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
          action: { enabled: true, width: 54, height: 54 },
          back: { enabled: false, width: 54, height: 54 },
          dash: { enabled: true, width: 48, height: 48 },
        },
      }),
      {
        spritesheetResolver: async (id: string) => {
          if (id === "hero") return makeCharacterSpritesheet("hero-novice");
          if (id === "monster") return makeCharacterSpritesheet("monster-ashfang_wolf");
          if (id.startsWith("hero-") || id.startsWith("monster-") || id.startsWith("npc-")) {
            return makeCharacterSpritesheet(id);
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
