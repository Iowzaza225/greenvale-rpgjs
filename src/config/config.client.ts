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

function makeOriginalSpritesheet(id: string) {
  const preset = Presets.RMSpritesheet(3, 4, 1);
  const row = (direction: string) => ({ down: 0, left: 1, right: 2, up: 3 } as Record<string, number>)[direction] ?? 0;
  const swing = ({direction}: {direction: string}) => [[
    {time:0,frameX:0,frameY:row(direction)},
    {time:5,frameX:1,frameY:row(direction)},
    {time:10,frameX:2,frameY:row(direction)},
  ]];
  return {
    id, image: originalSpriteDataUrl(id),
    width: ORIGINAL_SPRITE_SIZE.width, height: ORIGINAL_SPRITE_SIZE.height,
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

export default {
  providers: [
    provideLoadMap((id: string) => ({
      id,
      component: WORLD_COMPONENTS[id] || CampMap,
      ...mapSize(id),
      data: {},
      hitboxes: id === "greenvale-camp" ? CAMP_HITBOXES : [
        { id: "top", x: 0, y: 0, width: 1600, height: 10 },
        { id: "bottom", x: 0, y: 990, width: 1600, height: 10 },
        { id: "left", x: 0, y: 0, width: 10, height: 1000 },
        { id: "right", x: 1590, y: 0, width: 10, height: 1000 },
      ],
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
          if (id === "hero") return makeOriginalSpritesheet("hero-novice");
          if (id === "monster") return makeOriginalSpritesheet("monster-ashfang_wolf");
          if (id.startsWith("hero-") || id.startsWith("monster-") || id.startsWith("npc-")) {
            return makeOriginalSpritesheet(id);
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
