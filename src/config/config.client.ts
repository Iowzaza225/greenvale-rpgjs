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

/**
 * Reborn CC0 baked Knight atlas. Generated from KayKit's *animated GLB*
 * in a separate Chromium bake job, not from a pasted/static portrait.
 * Missing atlas -> original battle-tested Phase-4 hero; no blank sprites.
 */
const REBORN_KNIGHT = "/assets/characters/kaykit-knight-2p5d.webp";
const DIR_ROW:Record<string,number> = {down:0,left:1,right:2,up:3};
const BANKS = ["walk","idle","run","attack","cast","hit","death","rest","emote"] as const;
let knightAtlasAvailable: boolean | null = null;
async function resolveLicensedKnight(id:string) {
  if (typeof window !== "undefined" &&
      new URLSearchParams(location.search).get("art") === "legacy") return null;
  if (knightAtlasAvailable===null) {
    try {
      const response=await fetch(REBORN_KNIGHT,{method:"HEAD"});
      knightAtlasAvailable=response.ok && (response.headers.get("content-type")||"").includes("image/");
    }catch { knightAtlasAvailable=false; }
  }
  if(!knightAtlasAvailable) return null;
  if(typeof window!=="undefined" && (window as any).__GV_REBORN_ASSET_QA__) {
    (window as any).__GV_REBORN_ASSET_QA__.loadedFor=id;
  }
  const preset=Presets.RMSpritesheet(3,4,1);
  const anim=(bank:number)=>({
    animations:({direction}:{direction:string})=> [[...Array.from({length:3},(_,frame)=>({
      time:frame*8,
      frameX:bank*3+frame,
      frameY:DIR_ROW[direction]??0,
    }))]],
  });
  return {
    id,image:REBORN_KNIGHT,...preset,
    width:96*27,height:112*4,framesWidth:27,framesHeight:4,
    spriteRealSize:{width:44,height:54},
    textures:{
      ...preset.textures,
      idle:anim(1),
      walk:anim(0),
      run:anim(2),
      attack:anim(3),
      attack2:anim(3),
      attack3:anim(3),
      skill:anim(4),
      cast:anim(4),
      hit:anim(5),
      death:anim(6),
      rest:anim(7),
      emote:anim(8),
    },
  };
}
if(typeof window!=="undefined" && new URLSearchParams(location.search).has("debug")) {
  (window as any).__GV_REBORN_ASSET_QA__={image:REBORN_KNIGHT,banks:BANKS};
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
          if (id === "hero") {
            const knight=await resolveLicensedKnight(id);
            if(knight)return knight;
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
