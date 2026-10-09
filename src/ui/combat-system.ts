import statusData from "../data/status_effects.json";
import formulasData from "../data/formulas.json";
import {
  applySelectedDeathPenalty,
  consumeSelectedReviveKit,
  getSelectedCharacter,
  updateSelectedCombatSettings,
} from "../core/save";
import {
  addOrRefreshStatus,
  combatConfig,
  pruneStatuses,
  resolveCombatHit,
  statusRemainingMs,
  type ActiveStatus,
  type DamageInput,
} from "../core/combat";
import { gameEvents } from "../core/event-bus";
import { t } from "../core/i18n";
import "./combat-system.css";

declare global {
  interface Window {
    __GV_COMBAT__?: {
      open: () => void;
      resolve: (input: DamageInput) => ReturnType<typeof resolveCombatHit>;
      setAutoAttack: (enabled: boolean) => void;
      setAutoLoot: (enabled: boolean) => void;
      statuses: () => ActiveStatus[];
    };
  }
}

let initialized=false;
let statuses:ActiveStatus[]=[];
let autoTimer=0;
let pendingLoot=0;
let deathOpen=false;
let lastDeathLoss=0;

const root=()=>document.getElementById("gv-combat-system") as HTMLElement|null;
const statusRoot=()=>document.getElementById("gv-status-tray") as HTMLElement|null;
const floatRoot=()=>document.getElementById("gv-combat-floats") as HTMLElement|null;
const lootRoot=()=>document.getElementById("gv-loot-prompt") as HTMLElement|null;

function esc(value:unknown):string{
  return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function toast(message:string):void{
  const el=document.getElementById("gv-toast");if(!el)return;
  el.textContent=message;el.hidden=false;setTimeout(()=>{el.hidden=true;},1700);
}
function statusDef(id:string):any|null{
  return (statusData.statuses as any[]).find(s=>s.id===id)??null;
}
function renderStatusTray():void{
  const el=statusRoot();if(!el)return;
  statuses=pruneStatuses(statuses);
  el.hidden=statuses.length===0;
  el.innerHTML=statuses.map(status=>{
    const def=statusDef(status.id);const remaining=Math.ceil(statusRemainingMs(status)/1000);
    return `<div class="gv4-status gv4-status--${esc(def?.category||"debuff")}" title="${esc(def?t(def.nameKey):status.id)}">
      <i>${esc((def?t(def.nameKey):status.id).slice(0,1))}</i><span>${remaining}</span>${status.stacks>1?`<b>x${status.stacks}</b>`:""}
    </div>`;
  }).join("");
}
function addStatus(detail:any):void{
  const id=String(detail?.id||"");if(!id)return;
  statuses=addOrRefreshStatus(statuses,id,Date.now(),Number(detail?.durationMs)||undefined);
  renderStatusTray();
}
function removeStatus(id:string):void{
  statuses=statuses.filter(s=>s.id!==id);renderStatusTray();
}
function floatText(detail:any):void{
  const el=floatRoot();if(!el)return;
  const type=String(detail?.type||"hit");
  const numeric=Number(detail?.damage);
  const damage=Number.isFinite(numeric)?Math.max(0,Math.floor(Math.abs(numeric))):0;
  const numericTypes=new Set(["hit","critical","block","player-hit","heal"]);
  // MISS / PERFECT DODGE are text outcomes. Real damage outcomes must never
  // create a misleading 0 or negative label.
  if(numericTypes.has(type)&&damage<=0)return;
  const node=document.createElement("span");
  node.className=`gv4-float gv4-float--${type}`;
  const key=`combat.float.${type}`;
  node.textContent=t(key,{damage});
  node.style.left=`${44+Math.random()*12}%`;
  node.style.top=`${36+Math.random()*9}%`;
  el.appendChild(node);
  setTimeout(()=>node.remove(),1100);
}
function renderLoot():void{
  const el=lootRoot();if(!el)return;
  if(pendingLoot<=0){el.hidden=true;el.innerHTML="";return;}
  el.hidden=false;
  el.innerHTML=`<div><b>${esc(t("combat.loot.pending"))}</b><button data-pickup>${esc(t("combat.loot.pickup",{count:pendingLoot}))}</button></div>`;
  el.querySelector("[data-pickup]")?.addEventListener("click",()=>{
    window.dispatchEvent(new CustomEvent("greenvale:loot-pickup",{detail:{kind:"wolf-fang",count:pendingLoot}}));
    pendingLoot=0;renderLoot();
  });
}
function renderSettings():void{
  const el=root();const character=getSelectedCharacter();if(!el||!character)return;
  const cfg=combatConfig();
  el.innerHTML=`<section class="gv4-window">
    <header><div><span>GREENVALE · COMBAT</span><h2>${esc(t("combat.title"))}</h2></div><button data-close>×</button></header>
    <main>
      <label class="gv4-toggle"><input type="checkbox" data-auto-attack ${character.combatSettings.autoAttack?"checked":""}><i></i><div><b>${esc(t("combat.autoAttack"))}</b><small>${character.combatSettings.autoAttack?esc(t("combat.autoOn")):esc(t("combat.autoOff"))}</small></div></label>
      <label class="gv4-toggle"><input type="checkbox" data-auto-loot ${character.combatSettings.autoLoot?"checked":""}><i></i><div><b>${esc(t("combat.autoLoot"))}</b><small>${esc(t("combat.loot.auto"))}</small></div></label>
      <div class="gv4-readonly"><span>${esc(t("combat.pvp"))}</span><b>${cfg.pvp? "ON":esc(t("combat.pvpOff"))}</b></div>
      <div class="gv4-info-grid">
        <span>🔥 Fire → Earth ×1.25</span><span>💧 Water → Fire ×1.25</span>
        <span>💨 Wind → Water ×1.25</span><span>🪨 Earth → Wind ×1.25</span>
        <span>✨ Light ↔ Dark ×1.25</span><span>⚔️ Crit ×1.5 · Block ×0.6</span>
      </div>
    </main>
  </section>`;
  el.querySelector("[data-close]")?.addEventListener("click",()=>{el.hidden=true;});
  const aa=el.querySelector<HTMLInputElement>("[data-auto-attack]");
  aa?.addEventListener("change",()=>{updateSelectedCombatSettings({autoAttack:aa.checked});renderSettings();toast(t("combat.saved"));});
  const al=el.querySelector<HTMLInputElement>("[data-auto-loot]");
  al?.addEventListener("change",()=>{updateSelectedCombatSettings({autoLoot:al.checked});renderSettings();toast(t("combat.saved"));});
}
function renderDeath():void{
  const el=root();const character=getSelectedCharacter();if(!el||!character)return;
  deathOpen=true;el.hidden=false;
  el.innerHTML=`<section class="gv4-window gv4-death">
    <header><div><span>GREENVALE · DOWN</span><h2>${esc(t("combat.death.title"))}</h2></div></header>
    <main><p>${esc(t("combat.death.body",{lost:lastDeathLoss}))}</p>
      <button class="gv4-primary" data-respawn="save-point">${esc(t("combat.respawn.save"))}</button>
      <button class="gv4-secondary" data-respawn="item" ${character.reviveKits>0?"":"disabled"}>${esc(t("combat.respawn.item",{count:character.reviveKits}))}</button>
      <small>${esc(t("combat.respawn.invulnerable"))}</small>
    </main>
  </section>`;
  el.querySelectorAll<HTMLElement>("[data-respawn]").forEach(btn=>btn.addEventListener("click",()=>{
    const mode=btn.dataset.respawn==="item"?"item":"save-point";
    if(mode==="item"&&!consumeSelectedReviveKit()){toast(t("combat.noRevive"));return;}
    window.dispatchEvent(new CustomEvent("greenvale:respawn",{detail:{mode}}));
    deathOpen=false;el.hidden=true;toast(t("combat.respawned"));
  }));
}
function onDeath():void{
  if(deathOpen)return;
  const result=applySelectedDeathPenalty();lastDeathLoss=result.lostExp;renderDeath();
}
function autoTick():void{
  const character=getSelectedCharacter();if(!character?.combatSettings.autoAttack||deathOpen)return;
  window.dispatchEvent(new CustomEvent("greenvale:auto-attack",{detail:{source:"auto"}}));
}
export function openCombatSystem():void{
  const el=root();if(!el)return;renderSettings();el.hidden=false;
}
export function initCombatSystem():void{
  if(initialized)return;initialized=true;
  document.getElementById("gv-combat-btn")?.addEventListener("click",openCombatSystem);
  gameEvents.on("game:canvas-ready",()=>{renderStatusTray();});
  window.addEventListener("greenvale:combat-result",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    floatText(detail);
  });
  window.addEventListener("greenvale:status-add",(event)=>addStatus((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:status-remove",(event)=>removeStatus(String((event as CustomEvent).detail?.id||"")));
  window.addEventListener("greenvale:death",onDeath);
  window.addEventListener("greenvale:loot-drop",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    if(detail.auto){toast(t("combat.loot.auto"));return;}
    pendingLoot+=Math.max(1,Number(detail.count)||1);renderLoot();
  });
  window.addEventListener("greenvale:respawned",()=>{
    statuses=addOrRefreshStatus(statuses,"revive_guard",Date.now(),combatConfig().respawnInvulnerabilityMs);
    renderStatusTray();
  });
  setInterval(renderStatusTray,250);
  autoTimer=window.setInterval(autoTick,Number((formulasData.combat as any).autoAttackIntervalMs)||850);
  window.__GV_COMBAT__={
    open:openCombatSystem,
    resolve:resolveCombatHit,
    setAutoAttack:(enabled)=>{updateSelectedCombatSettings({autoAttack:enabled});},
    setAutoLoot:(enabled)=>{updateSelectedCombatSettings({autoLoot:enabled});},
    statuses:()=>[...statuses],
  };
}
