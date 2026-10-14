/**
 * Authored 2.5D Smooth Fantasy art, cut from the project's original concept
 * sheet and stored locally in the repository as transparent WebP images.
 *
 * This is a lightweight 4-facing prototype built from painted poses; it is
 * NOT a finished 8-direction or multi-action animation atlas.
 */
import swordsman from "../assets/sprites/painted/hero-swordsman.webp";
import heavyArmor from "../assets/sprites/painted/hero-heavy-armor.webp";
import knight from "../assets/sprites/painted/hero-knight.webp";
import rogue from "../assets/sprites/painted/hero-rogue.webp";
import mage from "../assets/sprites/painted/hero-mage.webp";
import corruptedWolf from "../assets/sprites/painted/monster-corrupted-wolf.webp";
import undeadSoldier from "../assets/sprites/painted/monster-undead-soldier.webp";
import { SMOOTH_FRAME } from "./smooth-fantasy";

const authoredSources: Record<string, string> = {
  "hero-novice": swordsman,
  "hero-vanguard": knight,
  "hero-arcanist": mage,
  "hero-ranger": rogue,
  "hero-mender": mage,
  "hero-shade": rogue,
  "hero-trader": heavyArmor,
  "npc-mara": rogue,
  "npc-trainer": knight,
  "npc-merchant": heavyArmor,
  "npc-blacksmith": knight,
  "npc-healer": mage,
  "npc-quest_keeper": mage,
  "npc-gatekeeper": heavyArmor,
  "npc-settler": swordsman,
  "monster-ashfang_wolf": corruptedWolf,
  "monster-hollow_raider": undeadSoldier,
};
const cache = new Map<string, Promise<string>>();

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

function drawAnimationFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  col: number,
  row: number,
): void {
  const w=SMOOTH_FRAME.width, h=SMOOTH_FRAME.height;
  ctx.save();
  ctx.translate(col*w,row*h);
  ctx.imageSmoothingEnabled=true;

  // Contact shadow is subtle; RPGJS still owns collision and sorting.
  ctx.fillStyle="#07131a52";
  ctx.beginPath();
  ctx.ellipse(w/2,h-8,23,4,0,0,Math.PI*2);
  ctx.fill();

  // Same grounded source pose in each cell; slight movement is a prototype
  // until independent hand-authored walk/attack/death frames arrive.
  const sway=col===0?-2:col===2?2:0;
  const bob=col===1?-2:0;
  const mirrored=row===1;
  ctx.translate(w/2+sway,h/2+bob);
  if(mirrored) ctx.scale(-1,1);
  ctx.rotate(col===0?-.014:col===2?.014:0);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  ctx.restore();
}

export function paintedFantasySheetDataUrl(id: string): Promise<string | undefined> {
  const src=authoredSources[id];
  if(!src)return Promise.resolve(undefined);
  const cached=cache.get(id);
  if(cached)return cached;

  const promise=loadImage(src).then(img=>{
    const canvas=document.createElement("canvas");
    canvas.width=SMOOTH_FRAME.width*SMOOTH_FRAME.columns;
    canvas.height=SMOOTH_FRAME.height*SMOOTH_FRAME.rows;
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx)throw new Error("2D Canvas is unavailable for painted sprites");
    for(let row=0;row<SMOOTH_FRAME.rows;row++)
      for(let col=0;col<SMOOTH_FRAME.columns;col++)
        drawAnimationFrame(ctx,img,col,row);
    return canvas.toDataURL("image/png");
  });
  cache.set(id,promise);
  promise.catch(()=>cache.delete(id)); // Allow retry after asset/network errors.
  return promise;
}

export const PAINTED_IDS = Object.keys(authoredSources);
