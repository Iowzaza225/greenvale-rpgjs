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

// The mobile preview does not fetch third-party hero/monster artwork.
const facingRows: Record<string,number> = { down:0, left:1, right:2, up:3 };
function makeSmoothSpritesheet(id:string) {
  const pixelFallback = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("art") === "pixel";
  const image = pixelFallback ? originalSpriteDataUrl(id) : smoothFantasySheetDataUrl(id);
  const frameCount = pixelFallback ? 3 : SMOOTH_FRAME.columns;
  const preset = Presets.RMSpritesheet(3,4,1);

  const anim=(action:SmoothAction)=>({ animations:({direction}:{direction:string}) => [[
    ...Array.from({length:3},(_,frame)=>({
      time:frame*5,
      frameX:pixelFallback?frame:smoothActionOffset(action)+frame,
      frameY:facingRows[direction]??0,
    })),
  ]]});
  const idle = { animations:({direction}:{direction:string}) => [[{
    time:0,frameX:pixelFallback?1:smoothActionOffset("idle")+1,frameY:facingRows[direction]??0,
  }]]};
  const textures = {
    ...preset.textures,
    idle,
    run:anim("run"),
    attack:anim("attack"),
    attack2:anim("attack"),
    attack3:anim("attack"),
    skill:anim("cast"),
    cast:anim("cast"),
    hit:anim("hit"),
    death:anim("death"),
    rest:anim("rest"),
    emote:anim("emote"),
  };
  return {
    id,image,...preset,
    width:pixelFallback?ORIGINAL_SPRITE_SIZE.width:SMOOTH_FRAME.width*SMOOTH_FRAME.columns,
    height:pixelFallback?ORIGINAL_SPRITE_SIZE.height:SMOOTH_FRAME.height*SMOOTH_FRAME.rows,
    framesWidth:frameCount,framesHeight:4,
    spriteRealSize:{width:44,height:54},
    textures,
  };
}
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1") {
  (window as any).__GV_MOBILE_ART_QA__ = {
    actionOffset:smoothActionOffset,
    actions:["walk","idle","run","attack","cast","hit","death","rest","emote"],
    smooth:smoothFantasySheetDataUrl,
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
          if (id === "hero") return makeSmoothSpritesheet("hero-novice");
          if (id === "monster") return makeSmoothSpritesheet("monster-ashfang_wolf");
          if (id.startsWith("hero-") || id.startsWith("monster-") || id.startsWith("npc-")) {
            return makeSmoothSpritesheet(id);
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
