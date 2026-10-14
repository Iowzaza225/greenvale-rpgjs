import { gameEvents } from "../core/event-bus";
import { openCharacterSystem } from "./character-system";
import { openSkillSystem } from "./skill-system";
import { openCombatSystem } from "./combat-system";
import "./desktop-controls.css";

let initialized = false;
const held = new Set<string>();
const directions: Record<string, {dx:number;dy:number}> = {
  KeyW:{dx:0,dy:-1},KeyA:{dx:-1,dy:0},KeyS:{dx:0,dy:1},KeyD:{dx:1,dy:0},
};
const modalIds=["gv-world-map","gv-character-system","gv-skill-system","gv-combat-system","gv-panel"];
let frame=0,lastFrame=0;

function visible(id:string):boolean {
  const el=document.getElementById(id);
  return !!el && !el.hidden && getComputedStyle(el).display!=="none";
}
function inputFocused():boolean {
  const el=document.activeElement as HTMLElement | null;
  return !!el && (["INPUT","TEXTAREA","SELECT"].includes(el.tagName)||el.isContentEditable);
}
function ready():boolean {
  return Boolean(window.__GV_CANVAS_READY__ && !document.getElementById("gv-app")?.offsetParent);
}
function busy():boolean {
  return modalIds.some(visible)||visible("gv-death-overlay");
}
function stopMovement():void {
  held.clear();
  if(frame)cancelAnimationFrame(frame);
  frame=0;lastFrame=0;
}
function moveTick(now:number):void {
  frame=0;
  if(!held.size){lastFrame=0;return;}
  const dt=lastFrame?Math.min(42,now-lastFrame):16;
  lastFrame=now;
  if(ready()&&!busy()&&!inputFocused()){
    let dx=0,dy=0;
    for(const key of held){const direction=directions[key];if(direction){dx+=direction.dx;dy+=direction.dy;}}
    if(dx||dy)window.dispatchEvent(new CustomEvent("greenvale:desktop-move",{detail:{dx,dy,dt}}));
  }
  frame=requestAnimationFrame(moveTick);
}
function closeOverlays():boolean {
  for(const id of modalIds){
    if(!visible(id))continue;
    const el=document.getElementById(id);if(el)el.hidden=true;
    return true;
  }
  return false;
}
function openMenu():void {
  (document.getElementById("gv-menu-btn") as HTMLButtonElement|null)?.click();
}
function updateDevice():void {
  const desktop=matchMedia("(pointer: fine) and (min-width: 800px)").matches;
  document.body.dataset.gvDevice=desktop?"desktop":"touch";
  const help=document.getElementById("gv-desktop-help");
  if(help)help.hidden=!desktop||!ready();
}
async function toggleFullscreen():Promise<void>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }catch{/* Some previews disallow Fullscreen API. */}
}
function onKey(event:KeyboardEvent):void {
  if(event.metaKey||event.ctrlKey||event.altKey)return;
  if(directions[event.code] && event.type==="keyup"){
    held.delete(event.code);
    event.preventDefault();
    return;
  }
  if(!ready())return;
  if(event.code==="Escape"&&event.type==="keydown"){
    stopMovement();
    if(closeOverlays()){event.preventDefault();event.stopPropagation();}
    return;
  }
  if(inputFocused()||busy())return;

  if(directions[event.code]){
    if(event.type==="keydown"){
      held.add(event.code);
      if(!frame)frame=requestAnimationFrame(moveTick);
    }
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if(event.type!=="keydown"||event.repeat)return;
  const digit=/^Digit([0-9])$/.exec(event.code);
  if(digit){
    const slot=digit[1]==="0"?9:Number(digit[1])-1;
    window.dispatchEvent(new CustomEvent("greenvale:hotbar-use",{detail:{slot}}));
    event.preventDefault();return;
  }

  if(event.code==="Space"||event.code==="KeyJ"){
    window.dispatchEvent(new Event("greenvale:basic-attack"));
  }else if(event.code==="KeyQ"||event.code==="Tab"){
    window.dispatchEvent(new Event("greenvale:target-cycle"));
  }else if(event.code==="KeyK"){
    openSkillSystem("tree");
  }else if(event.code==="KeyC"){
    openCharacterSystem("stats");
  }else if(event.code==="KeyB"){
    openCombatSystem();
  }else if(event.code==="KeyM"){
    window.dispatchEvent(new Event("greenvale:world-map-open"));
  }else if(event.code==="KeyI"){
    openMenu();
  }else if(event.code==="KeyF"){
    void toggleFullscreen();
  }else if(event.code==="KeyE"){
    window.dispatchEvent(new Event("greenvale:desktop-interact"));
  }else return;
  event.preventDefault();event.stopPropagation();
}
export function initDesktopControls():void {
  if(initialized)return;
  initialized=true;
  window.addEventListener("keydown",onKey,{capture:true});
  window.addEventListener("keyup",onKey,{capture:true});
  window.addEventListener("blur",stopMovement);
  window.addEventListener("resize",updateDevice);
  gameEvents.on("game:canvas-ready",updateDevice);
  updateDevice();
  document.getElementById("gv-fullscreen-btn")?.addEventListener("click",()=>void toggleFullscreen());
  document.getElementById("gv-controls-btn")?.addEventListener("click",()=>{
    const help=document.getElementById("gv-desktop-help-detail");
    if(help)help.hidden=!help.hidden;
  });
  document.getElementById("gv-help-close")?.addEventListener("click",()=>{
    const help=document.getElementById("gv-desktop-help-detail");
    if(help)help.hidden=true;
  });
}
