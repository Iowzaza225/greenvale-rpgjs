import itemsData from "../data/items.json";
import { t } from "../core/i18n";
import { addSelectedLoot, getSelectedCharacter, updateSelectedCombatSettings } from "../core/save";
import { gameEvents } from "../core/event-bus";
import "./combat-system.css";

let initialized = false;
let deathTimer = 0;

function qs<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function esc(value: unknown): string {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

function toast(message: string): void {
  const el=qs<HTMLElement>("gv-toast"); if(!el)return;
  el.textContent=message; el.hidden=false; setTimeout(()=>{el.hidden=true;},1800);
}

function itemName(itemId:string):string{
  const item=(itemsData.items as any[]).find(entry=>entry.id===itemId);
  return item ? t(item.nameKey) : itemId;
}

function renderQuick():void{
  const host=qs<HTMLElement>("gv-combat-quick");
  const c=getSelectedCharacter();
  if(!host||!c)return;
  host.hidden=false;
  host.innerHTML=`
    <button data-combat-quick="attack" class="${c.combatSettings.autoAttack?"active":""}">⚔ <span>${esc(t("combat.autoAttackShort"))}</span></button>
    <button data-combat-quick="loot" class="${c.combatSettings.autoLoot?"active":""}">◈ <span>${esc(t("combat.autoLootShort"))}</span></button>`;
  host.querySelector("[data-combat-quick='attack']")?.addEventListener("click",()=>{
    updateSelectedCombatSettings({autoAttack:!getSelectedCharacter()?.combatSettings.autoAttack});
    renderQuick(); renderWindow();
  });
  host.querySelector("[data-combat-quick='loot']")?.addEventListener("click",()=>{
    updateSelectedCombatSettings({autoLoot:!getSelectedCharacter()?.combatSettings.autoLoot});
    renderQuick(); renderWindow();
  });
}

function renderWindow():void{
  const host=qs<HTMLElement>("gv-combat-system");
  const c=getSelectedCharacter();
  if(!host||!c)return;
  const inventory=Object.entries(c.lootInventory).filter(([,qty])=>Number(qty)>0);
  host.innerHTML=`<section class="gv4-window">
    <header><div><span>GREENVALE · COMBAT</span><h2>${esc(t("combat.title"))}</h2></div><button data-combat-close>×</button></header>
    <div class="gv4-switches">
      <label><input type="checkbox" data-auto-attack ${c.combatSettings.autoAttack?"checked":""}><i></i><span><b>${esc(t("combat.autoAttack"))}</b><small>${esc(t("combat.autoAttackHelp"))}</small></span></label>
      <label><input type="checkbox" data-auto-loot ${c.combatSettings.autoLoot?"checked":""}><i></i><span><b>${esc(t("combat.autoLoot"))}</b><small>${esc(t("combat.autoLootHelp"))}</small></span></label>
    </div>
    <label class="gv4-range"><b>${esc(t("combat.lootRadius",{value:c.combatSettings.autoLootRadius}))}</b><input data-loot-radius type="range" min="80" max="420" step="20" value="${c.combatSettings.autoLootRadius}"></label>
    <div class="gv4-rules"><h3>${esc(t("combat.rules"))}</h3><p>${esc(t("combat.rulesText"))}</p></div>
    <div class="gv4-loot-ledger"><h3>${esc(t("combat.lootLedger"))}</h3>${inventory.length?inventory.map(([id,qty])=>`<div><span>${esc(itemName(id))}</span><b>×${qty}</b></div>`).join(""):`<p>${esc(t("combat.noLoot"))}</p>`}</div>
  </section>`;
  host.querySelector("[data-combat-close]")?.addEventListener("click",()=>host.hidden=true);
  const attack=host.querySelector<HTMLInputElement>("[data-auto-attack]");
  attack?.addEventListener("change",()=>{updateSelectedCombatSettings({autoAttack:attack.checked});renderQuick();});
  const loot=host.querySelector<HTMLInputElement>("[data-auto-loot]");
  loot?.addEventListener("change",()=>{updateSelectedCombatSettings({autoLoot:loot.checked});renderQuick();});
  const radius=host.querySelector<HTMLInputElement>("[data-loot-radius]");
  radius?.addEventListener("change",()=>{updateSelectedCombatSettings({autoLootRadius:Number(radius.value)});renderWindow();});
}

function renderTarget(detail:any):void{
  const host=qs<HTMLElement>("gv-combat-target"); if(!host)return;
  if(!detail?.active){host.hidden=true;return;}
  const hp=Math.max(0,Number(detail.hp)||0),max=Math.max(1,Number(detail.maxHp)||1);
  const pct=Math.max(0,Math.min(100,hp/max*100));
  const statuses=Array.isArray(detail.statuses)?detail.statuses:[];
  host.hidden=false;
  host.innerHTML=`<div class="gv4-target-title"><b>Lv ${Number(detail.level)||1} · ${esc(detail.name||"Enemy")}</b><span>${esc(t(`element.${detail.element||"neutral"}`))}</span></div>
    <div class="gv4-target-hp"><i style="width:${pct}%"></i><em>${Math.round(hp)}/${Math.round(max)}</em></div>
    <div class="gv4-statuses">${statuses.map((id:string)=>`<span>${esc(t(`status.${id}.name`))}</span>`).join("")}</div>`;
}

function floatCombat(detail:any):void{
  if(detail?.type!=="damage"&&detail?.type!=="status-damage"&&detail?.type!=="status-heal")return;
  const host=qs<HTMLElement>("gv-combat-float");if(!host)return;
  const node=document.createElement("div");
  const outcome=String(detail.outcome||"hit");
  node.className=`gv4-float gv4-float--${outcome}`;
  if(detail.type==="status-heal") node.textContent=`+${Number(detail.amount)||0}`;
  else if(["miss","dodge"].includes(outcome)) node.textContent=t(`combat.outcome.${outcome}`);
  else node.textContent=`${detail.critical?"CRIT ":""}${detail.blocked?"BLOCK ":""}-${Number(detail.damage)||0}`;
  host.appendChild(node);setTimeout(()=>node.remove(),950);
}

function showDeath(detail:any):void{
  const host=qs<HTMLElement>("gv-death-overlay");if(!host)return;
  const reviveAt=Number(detail?.reviveAt)||Date.now()+3500;
  host.hidden=false;
  clearInterval(deathTimer);
  const draw=()=>{
    const remain=Math.max(0,Math.ceil((reviveAt-Date.now())/1000));
    host.innerHTML=`<div><span>AFTERFALL</span><h2>${esc(t("combat.knockedOut"))}</h2><p>${esc(t("combat.reviveCountdown",{seconds:remain}))}</p></div>`;
  };
  draw();deathTimer=window.setInterval(draw,250);
}
function hideDeath():void{clearInterval(deathTimer);const host=qs<HTMLElement>("gv-death-overlay");if(host)host.hidden=true;}

function showLoot(detail:any):void{
  const host=qs<HTMLElement>("gv-loot-prompt");if(!host)return;
  const items=(detail.items||[]).map((x:any)=>`${itemName(String(x.itemId))} ×${Number(x.quantity)||1}`).join(" · ");
  host.hidden=false;
  host.innerHTML=`<div><b>${esc(t("combat.lootNearby"))}</b><span>${esc(items)}${detail.gold? ` · ${detail.gold} Gold`:""}</span><button data-loot-claim>${esc(t("combat.pickup"))}</button></div>`;
  host.querySelector("[data-loot-claim]")?.addEventListener("click",()=>window.dispatchEvent(new CustomEvent("greenvale:loot-claim",{detail:{token:detail.token}})));
  setTimeout(()=>{if(host)host.hidden=true;},19500);
}

export function openCombatSystem():void{const host=qs<HTMLElement>("gv-combat-system");if(!host)return;renderWindow();host.hidden=false;}

export function initCombatSystem():void{
  if(initialized)return;initialized=true;
  qs<HTMLElement>("gv-combat-btn")?.addEventListener("click",openCombatSystem);
  gameEvents.on("game:canvas-ready",()=>renderQuick());
  gameEvents.on("i18n:changed",()=>{renderQuick();if(qs<HTMLElement>("gv-combat-system")&&!qs<HTMLElement>("gv-combat-system")!.hidden)renderWindow();});
  window.addEventListener("greenvale:target",(event)=>renderTarget((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:combat-event",(event)=>floatCombat((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:death",(event)=>showDeath((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:revive",()=>{hideDeath();toast(t("combat.revived"));});
  window.addEventListener("greenvale:loot-available",(event)=>showLoot((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:loot-award",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    for(const item of detail.items||[])addSelectedLoot(String(item.itemId),Number(item.quantity)||0);
    const summary=(detail.items||[]).map((x:any)=>`${itemName(String(x.itemId))} ×${Number(x.quantity)||1}`).join(" · ");
    toast(t("combat.lootReceived",{items:summary||String(detail.gold||0)+" Gold"}));
    renderWindow();
  });
  window.addEventListener("greenvale:loot-claim-result",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    if(detail.ok){const host=qs<HTMLElement>("gv-loot-prompt");if(host)host.hidden=true;}
    else toast(t("combat.lootTooFar"));
  });
  window.addEventListener("greenvale:character-updated",()=>renderQuick());
}
