import itemsData from "../data/items.json";
import { t } from "../core/i18n";
import { gameEvents } from "../core/event-bus";
import {
  addSelectedLoot,
  getSelectedCharacter,
  updateSelectedCombatSettings,
} from "../core/save";
import "./combat-system.css";

type TargetState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  distance: number;
  element?: string;
  size?: string;
  race?: string;
} | null;

type GroundDrop = { itemId: string; quantity: number };

let initialized = false;
let targetState: TargetState = null;
let targetStatuses = new Map<string,{stacks:number;expiresAt:number}>();
let playerStatuses = new Map<string,{stacks:number;expiresAt:number}>();
let groundDrops: GroundDrop[] = [];
let deathTimer = 0;

function itemName(itemId:string):string{
  const item=(itemsData.items as any[]).find(entry=>entry.id===itemId);
  return item ? t(item.nameKey) : itemId;
}
function safe(value:unknown):string{
  return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
function toast(message:string):void{
  const el=document.getElementById("gv-toast");if(!el)return;
  el.textContent=message;el.hidden=false;window.setTimeout(()=>{el.hidden=true;},1800);
}
function renderTarget():void{
  const el=document.getElementById("gv-combat-target");if(!el)return;
  if(!targetState){el.hidden=true;el.innerHTML="";return;}
  const pct=Math.max(0,Math.min(100,(targetState.hp/Math.max(1,targetState.maxHp))*100));
  const statuses=Array.from(targetStatuses.entries()).map(([id,state])=>
    `<span data-status="${safe(id)}">${safe(t(`status.${id}.name`))}${state.stacks>1?` ×${state.stacks}`:""}</span>`
  ).join("");
  el.innerHTML=`<div class="gv4-target-card">
    <div class="gv4-target-head"><b style="color:${safe(targetState.difficultyColor||"#fff4d6")}">${safe(targetState.name)}${targetState.level?` · Lv ${Math.round(targetState.level)}`:""}</b><small>${safe(t("combat.distance",{value:targetState.distance}))}</small></div>
    <i><em style="width:${pct}%"></em></i>
    <div class="gv4-target-meta"><span>${Math.max(0,Math.round(targetState.hp))}/${Math.round(targetState.maxHp)}</span><span>${safe(t(`element.${targetState.element||"neutral"}`))}</span><span>${safe(t(`race.${targetState.race||"beast"}`))}</span></div>
    <div class="gv4-target-statuses">${statuses}</div>
  </div>`;
  el.hidden=false;
}
function renderControls():void{
  const el=document.getElementById("gv-combat-controls");const char=getSelectedCharacter();
  if(!el||!char)return;
  el.innerHTML=`<button data-combat="target">◎<small>${safe(t("combat.target"))}</small></button>
    <button class="gv4-attack" data-combat="attack">⚔<small>${safe(t("combat.attack"))}</small></button>
    <button class="${char.combatSettings.autoAttack?"active":""}" data-combat="auto">A<small>${safe(t(char.combatSettings.autoAttack?"combat.autoOn":"combat.autoOff"))}</small></button>
    <button class="${char.combatSettings.autoLoot?"active":""}" data-combat="loot">▣<small>${safe(t("combat.autoLoot"))}</small></button>`;
  el.querySelectorAll<HTMLElement>("[data-combat]").forEach(node=>node.addEventListener("click",()=>{
    const action=node.dataset.combat;
    if(action==="attack")window.dispatchEvent(new Event("greenvale:basic-attack"));
    if(action==="target")window.dispatchEvent(new Event("greenvale:target-cycle"));
    if(action==="auto"){
      const current=getSelectedCharacter();if(!current)return;
      updateSelectedCombatSettings({autoAttack:!current.combatSettings.autoAttack});
      window.dispatchEvent(new Event("greenvale:character-runtime"));
      renderControls();renderPanel();
    }
    if(action==="loot"){
      const current=getSelectedCharacter();if(!current)return;
      updateSelectedCombatSettings({autoLoot:!current.combatSettings.autoLoot});
      window.dispatchEvent(new Event("greenvale:character-runtime"));
      renderControls();renderPanel();
      if(getSelectedCharacter()?.combatSettings.autoLoot)collectGroundDrops();
    }
  }));
}
function outcomeText(detail:any):string{
  const outcome=String(detail.outcome||"hit");
  if(outcome==="miss")return t("combat.miss");
  if(outcome==="perfect-dodge")return t("combat.perfectDodge");
  if(outcome==="block")return `${t("combat.block")} -${Math.round(Number(detail.damage)||0)}`;
  if(outcome==="crit")return `${t("combat.crit")} -${Math.round(Number(detail.damage)||0)}`;
  return `-${Math.round(Number(detail.damage)||0)}`;
}
function showCombatFloat(detail:any):void{
  const host=document.getElementById("gv-combat-feed");if(!host)return;
  const node=document.createElement("div");
  node.className=`gv4-float gv4-float--${safe(detail.direction||"outgoing")} gv4-float--${safe(detail.outcome||"hit")}`;
  node.textContent=outcomeText(detail);
  host.appendChild(node);
  window.setTimeout(()=>node.remove(),1200);
}
function renderStatusStrip():void{
  const el=document.getElementById("gv-player-status");if(!el)return;
  const entries=Array.from(playerStatuses.entries());
  if(!entries.length){el.hidden=true;el.innerHTML="";return;}
  el.innerHTML=entries.map(([id,state])=>`<span data-status="${safe(id)}"><b>${safe(t(`status.${id}.name`))}</b><small>${state.stacks>1?`×${state.stacks}`:""}</small></span>`).join("");
  el.hidden=false;
}
function collectGroundDrops():void{
  if(!groundDrops.length)return;
  for(const drop of groundDrops)addSelectedLoot(drop.itemId,drop.quantity);
  const summary=groundDrops.map(drop=>`${itemName(drop.itemId)} ×${drop.quantity}`).join(", ");
  groundDrops=[];
  toast(t("combat.lootCollected",{items:summary}));
  renderLootPanel();renderPanel();
}
function renderLootPanel():void{
  const el=document.getElementById("gv-ground-loot");if(!el)return;
  if(!groundDrops.length){el.hidden=true;el.innerHTML="";return;}
  el.innerHTML=`<div><b>${safe(t("combat.groundLoot"))}</b>${groundDrops.map((drop,index)=>`<button data-pick-loot="${index}">${safe(itemName(drop.itemId))} ×${drop.quantity}</button>`).join("")}</div>`;
  el.querySelectorAll<HTMLElement>("[data-pick-loot]").forEach(node=>node.addEventListener("click",()=>{
    const index=Number(node.dataset.pickLoot);const drop=groundDrops[index];if(!drop)return;
    addSelectedLoot(drop.itemId,drop.quantity);groundDrops.splice(index,1);
    toast(t("combat.lootCollected",{items:`${itemName(drop.itemId)} ×${drop.quantity}`}));
    renderLootPanel();renderPanel();
  }));
  el.hidden=false;
}
function renderPanel():void{
  const el=document.getElementById("gv-combat-system");const char=getSelectedCharacter();
  if(!el||!char)return;
  const bag=Object.entries(char.lootBag).filter(([,qty])=>Number(qty)>0);
  el.innerHTML=`<section class="gv4-panel"><header><div><span>GREENVALE · COMBAT</span><h2>${safe(t("combat.title"))}</h2></div><button data-combat-close>×</button></header>
    <div class="gv4-toggle-row"><label><input type="checkbox" data-setting-auto ${char.combatSettings.autoAttack?"checked":""}><span></span><b>${safe(t("combat.autoAttack"))}</b></label>
    <label><input type="checkbox" data-setting-loot ${char.combatSettings.autoLoot?"checked":""}><span></span><b>${safe(t("combat.autoLoot"))}</b></label></div>
    <div class="gv4-rules"><b>${safe(t("combat.rules"))}</b><p>${safe(t("combat.rulesHelp"))}</p></div>
    <div class="gv4-bag"><h3>${safe(t("combat.lootBag"))}</h3>${bag.length?bag.map(([id,qty])=>`<div><span>${safe(itemName(id))}</span><b>×${qty}</b></div>`).join(""):`<p>${safe(t("combat.emptyBag"))}</p>`}</div>
  </section>`;
  el.querySelector<HTMLElement>("[data-combat-close]")?.addEventListener("click",()=>{el.hidden=true;});
  const auto=el.querySelector<HTMLInputElement>("[data-setting-auto]");
  auto?.addEventListener("change",()=>{updateSelectedCombatSettings({autoAttack:auto.checked});window.dispatchEvent(new Event("greenvale:character-runtime"));renderControls();renderPanel();});
  const loot=el.querySelector<HTMLInputElement>("[data-setting-loot]");
  loot?.addEventListener("change",()=>{updateSelectedCombatSettings({autoLoot:loot.checked});window.dispatchEvent(new Event("greenvale:character-runtime"));renderControls();renderPanel();if(loot.checked)collectGroundDrops();});
}
function showDeath(respawnMs:number):void{
  const el=document.getElementById("gv-death-overlay");if(!el)return;
  window.clearInterval(deathTimer);
  const end=Date.now()+Math.max(0,respawnMs);
  const draw=()=>{const left=Math.max(0,end-Date.now());el.innerHTML=`<div><b>${safe(t("combat.down"))}</b><span>${safe(t("combat.respawnIn",{value:(left/1000).toFixed(1)}))}</span></div>`;};
  draw();el.hidden=false;deathTimer=window.setInterval(draw,100);
}
function hideDeath():void{
  window.clearInterval(deathTimer);const el=document.getElementById("gv-death-overlay");if(el)el.hidden=true;
}
export function openCombatSystem():void{
  const el=document.getElementById("gv-combat-system");if(!el)return;renderPanel();el.hidden=false;
}
export function initCombatSystem():void{
  if(initialized)return;initialized=true;
  document.getElementById("gv-combat-btn")?.addEventListener("click",openCombatSystem);
  gameEvents.on("game:canvas-ready",()=>{
    const controls=document.getElementById("gv-combat-controls");
    if(controls)controls.hidden=false;
    renderControls();
    window.dispatchEvent(new Event("greenvale:combat-state-request"));
  });
  renderControls();
  window.addEventListener("greenvale:target-state",(event)=>{targetState=((event as CustomEvent).detail||{}).target||null;renderTarget();});
  window.addEventListener("greenvale:target-status",(event)=>{
    const detail=(event as CustomEvent).detail||{};const id=String(detail.statusId||"");if(!id)return;
    if(detail.active)targetStatuses.set(id,{stacks:Number(detail.stacks)||1,expiresAt:Number(detail.expiresAt)||0});else targetStatuses.delete(id);renderTarget();
  });
  window.addEventListener("greenvale:player-status",(event)=>{
    playerStatuses.clear();for(const state of ((event as CustomEvent).detail?.statuses||[])){playerStatuses.set(String(state.id),{stacks:Number(state.stacks)||1,expiresAt:Number(state.expiresAt)||0});}renderStatusStrip();
  });
  window.addEventListener("greenvale:combat-result",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    (window as any).__GV_COMBAT_LAST__=detail;
    if(detail.direction==="outgoing")(window as any).__GV_COMBAT_LAST_OUTGOING__=detail;
    showCombatFloat(detail);
  });
  window.addEventListener("greenvale:loot-drop",(event)=>{
    const drops=((event as CustomEvent).detail?.drops||[]) as GroundDrop[];
    groundDrops.push(...drops.filter(drop=>drop?.itemId&&Number(drop.quantity)>0));
    if(getSelectedCharacter()?.combatSettings.autoLoot)collectGroundDrops();else renderLootPanel();
  });
  window.addEventListener("greenvale:player-dead",(event)=>showDeath(Number((event as CustomEvent).detail?.respawnMs)||1800));
  window.addEventListener("greenvale:player-respawn",()=>hideDeath());
  window.addEventListener("greenvale:character-updated",()=>{renderControls();if(document.getElementById("gv-combat-system")&&!document.getElementById("gv-combat-system")!.hidden)renderPanel();});
  window.dispatchEvent(new Event("greenvale:combat-state-request"));
}
