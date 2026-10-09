import skillsData from "../data/skills.json";
import { t } from "../core/i18n";
import {
  assignSelectedHotbar,
  getSelectedCharacter,
  learnSelectedSkill,
  resetSelectedSkills,
  updateSelectedAutoBattle,
} from "../core/save";
import {
  canLearnSkill,
  getClassTreeSkills,
  getSkill,
  getSkillLevel,
  getSkillLevelData,
  getSkillsForClass,
  isUsableSkill,
  prerequisiteLabel,
} from "../core/skills";
import { gameEvents } from "../core/event-bus";
import "./skill-system.css";

type Tab = "tree" | "hotbar" | "auto";

type RuntimeState = {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
};

let initialized = false;
let activeTab: Tab = "tree";
let selectedSkillId = "survivor_strike";
let runtimeState: RuntimeState = { hp: 0, maxHp: 0, sp: 0, maxSp: 0 };
let casting: { skillId: string; source: "hotbar" | "auto" | "ui"; startedAt: number; endsAt: number; timer: number } | null = null;
const cooldowns = new Map<string, number>();
let autoTimer = 0;
let dragTimer = 0;
let draggingSkillId: string | null = null;
let dragGhost: HTMLElement | null = null;

function root(): HTMLElement | null {
  return document.getElementById("gv-skill-system");
}
function hotbarRoot(): HTMLElement | null {
  return document.getElementById("gv-skill-hotbar");
}
function castRoot(): HTMLElement | null {
  return document.getElementById("gv-castbar");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message: string): void {
  const el = document.getElementById("gv-toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  window.setTimeout(() => { el.hidden = true; }, 1800);
}

function skillName(skillId: string): string {
  const skill = getSkill(skillId);
  return skill ? t(skill.nameKey) : skillId;
}

function fmtSeconds(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(ms % 1000 === 0 ? 0 : 1);
}

function renderHotbar(): void {
  const host = hotbarRoot();
  const character = getSelectedCharacter();
  if (!host || !character) return;

  host.innerHTML = `
    <div class="gv3-hotbar-status">${character.autoBattle.enabled ? escapeHtml(t("skill.ui.autoOn")) : escapeHtml(t("skill.ui.autoOff"))}</div>
    <div class="gv3-hotbar-slots">
      ${character.hotbar.map((skillId, slot) => {
        const skill = skillId ? getSkill(skillId) : null;
        const level = skillId ? getSkillLevel(character.learnedSkills, skillId) : 0;
        return `<button class="gv3-hotbar-slot" data-hotbar-slot="${slot}" data-use-skill="${skillId || ""}" ${!skill ? "disabled" : ""}>
          <span class="gv3-slot-number">${slot}</span>
          <i class="gv3-skill-icon gv3-skill-icon--${skill?.type || "empty"}">${skill ? escapeHtml(t(skill.nameKey).slice(0, 2)) : "—"}</i>
          <small>${skill ? `Lv${level}` : escapeHtml(t("skill.ui.empty"))}</small>
          <span class="gv3-cooldown" data-cooldown-skill="${skillId || ""}"></span>
        </button>`;
      }).join("")}
    </div>`;

  host.querySelectorAll<HTMLElement>("[data-use-skill]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.useSkill;
      if (id) void useSkill(id, "hotbar");
    });
  });
  window.__GV_SKILL_STATE__ = { ...runtimeState, lastResult: detail };
  updateCooldownVisuals();
}

function renderSkillCard(skill: any, group: "novice" | "job"): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const level = getSkillLevel(character.learnedSkills, skill.id);
  const check = canLearnSkill(character.learnedSkills, character.classId, character.skillPoints, skill.id);
  const current = level > 0 ? getSkillLevelData(skill.id, level) : null;
  const next = level < skill.maxLv ? getSkillLevelData(skill.id, level + 1) : null;
  const prereq = prerequisiteLabel(skill).map((value) => {
    const [id, , lv] = value.split(" ");
    return `${skillName(id)} Lv ${lv}`;
  }).join(", ");

  return `<article class="gv3-skill-card ${level > 0 ? "learned" : ""} ${selectedSkillId === skill.id ? "selected" : ""}"
      style="--tree-x:${Number(skill.tree?.x || 0) + 1};--tree-y:${Number(skill.tree?.y || 0) + 1}"
      data-skill-id="${skill.id}" data-tree-group="${group}">
    <button class="gv3-skill-main" data-select-skill="${skill.id}" data-drag-skill="${level > 0 ? skill.id : ""}">
      <i class="gv3-skill-icon gv3-skill-icon--${skill.type}">${escapeHtml(t(skill.nameKey).slice(0,2))}</i>
      <span><b>${escapeHtml(t(skill.nameKey))}</b><small>${escapeHtml(t(`skill.ui.type.${skill.type}`))}</small></span>
      <em>${escapeHtml(t("skill.ui.level",{level,max:skill.maxLv}))}</em>
    </button>
    ${prereq ? `<div class="gv3-requirement">${escapeHtml(t("skill.ui.requires",{requirement:prereq}))}</div>` : ""}
    <div class="gv3-skill-numbers">
      ${current ? `<span>${escapeHtml(t("skill.ui.current"))}: ${current.powerPercent ? escapeHtml(t("skill.ui.power",{value:current.powerPercent})) : current.healPercent ? escapeHtml(t("skill.ui.heal",{value:current.healPercent})) : escapeHtml(t("skill.ui.sp",{value:current.spCost}))}</span>` : ""}
      ${next ? `<span>${escapeHtml(t("skill.ui.next"))}: ${next.powerPercent ? escapeHtml(t("skill.ui.power",{value:next.powerPercent})) : next.healPercent ? escapeHtml(t("skill.ui.heal",{value:next.healPercent})) : escapeHtml(t("skill.ui.sp",{value:next.spCost}))}</span>` : ""}
    </div>
    <div class="gv3-skill-actions">
      <button data-learn-skill="${skill.id}" ${check.ok ? "" : "disabled"}>${level >= skill.maxLv ? escapeHtml(t("skill.ui.max")) : check.reason === "prerequisite" ? escapeHtml(t("skill.ui.locked")) : escapeHtml(t("skill.ui.learn"))}</button>
      <button data-quickslot-skill="${skill.id}" ${level > 0 && isUsableSkill(skill) ? "" : "disabled"}>${escapeHtml(t("skill.ui.quickslot"))}</button>
    </div>
  </article>`;
}

function renderTreeGroup(title: string, skills: any[], group: "novice" | "job"): string {
  return `<section class="gv3-tree-group" data-connect-group="${group}">
    <h3>${escapeHtml(title)}</h3>
    <svg class="gv3-tree-lines" aria-hidden="true"></svg>
    <div class="gv3-tree-grid">${skills.map((skill) => renderSkillCard(skill, group)).join("")}</div>
  </section>`;
}

function renderDetail(): string {
  const character = getSelectedCharacter();
  const skill = getSkill(selectedSkillId);
  if (!character || !skill) return "";
  const level = getSkillLevel(character.learnedSkills, skill.id);
  const shownLevel = Math.max(1, level || 1);
  const data = getSkillLevelData(skill.id, shownLevel);
  const next = level < skill.maxLv ? getSkillLevelData(skill.id, Math.max(1, level + 1)) : null;
  return `<aside class="gv3-detail">
    <div class="gv3-detail-head"><i class="gv3-skill-icon gv3-skill-icon--${skill.type}">${escapeHtml(t(skill.nameKey).slice(0,2))}</i><div><b>${escapeHtml(t(skill.nameKey))}</b><span>${escapeHtml(t(`skill.ui.type.${skill.type}`))}</span></div></div>
    <p>${escapeHtml(t(skill.descriptionKey))}</p>
    <div class="gv3-detail-stats">
      <span>${escapeHtml(t("skill.ui.level",{level,max:skill.maxLv}))}</span>
      <span>${escapeHtml(t("skill.ui.sp",{value:data?.spCost ?? 0}))}</span>
      <span>${escapeHtml(t("skill.ui.cooldown",{value:fmtSeconds(Number(skill.cooldownMs)||0)}))}</span>
      <span>${escapeHtml(t("skill.ui.cast",{value:fmtSeconds(Number(skill.castMs)||0)}))}</span>
      <span>${escapeHtml(t("skill.ui.range",{value:Number(skill.range)||0}))}</span>
      ${data?.powerPercent ? `<span>${escapeHtml(t("skill.ui.power",{value:data.powerPercent}))}</span>` : ""}
      ${data?.healPercent ? `<span>${escapeHtml(t("skill.ui.heal",{value:data.healPercent}))}</span>` : ""}
    </div>
    ${next ? `<div class="gv3-next">→ ${escapeHtml(t("skill.ui.next"))}: SP ${next.spCost} · ${next.powerPercent ? `${next.powerPercent}%` : next.healPercent ? `${next.healPercent}%` : "—"}</div>` : ""}
  </aside>`;
}

function renderTree(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const novice = getClassTreeSkills("novice");
  const current = character.classId === "novice" ? [] : getClassTreeSkills(character.classId);
  return `<div class="gv3-tree-layout">
    <div class="gv3-tree-scroll">
      ${renderTreeGroup(t("class.novice.name"), novice, "novice")}
      ${current.length ? renderTreeGroup(t(`class.${character.classId}.name`), current, "job") : ""}
    </div>
    ${renderDetail()}
  </div>`;
}

function renderHotbarEditor(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const learned = getSkillsForClass(character.classId).filter((skill) => getSkillLevel(character.learnedSkills, skill.id) > 0 && isUsableSkill(skill));
  return `<div class="gv3-editor">
    <p class="gv3-help">${escapeHtml(t("skill.ui.dragHint"))}</p>
    <div class="gv3-editor-slots">
      ${character.hotbar.map((skillId,slot)=>`<button data-hotbar-slot="${slot}" data-editor-slot="${slot}"><b>${slot}</b><span>${skillId ? escapeHtml(skillName(skillId)) : escapeHtml(t("skill.ui.empty"))}</span><em data-clear-slot="${slot}">×</em></button>`).join("")}
    </div>
    <div class="gv3-learned-list">
      ${learned.map(skill=>`<button data-drag-skill="${skill.id}" data-quickslot-skill="${skill.id}"><i class="gv3-skill-icon gv3-skill-icon--${skill.type}">${escapeHtml(t(skill.nameKey).slice(0,2))}</i><span>${escapeHtml(t(skill.nameKey))}<small>Lv ${getSkillLevel(character.learnedSkills,skill.id)}</small></span></button>`).join("")}
    </div>
  </div>`;
}

function renderAuto(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const learned = getSkillsForClass(character.classId).filter((skill) => getSkillLevel(character.learnedSkills, skill.id) > 0 && isUsableSkill(skill) && skill.auto?.allowed !== false);
  return `<div class="gv3-auto">
    <label class="gv3-switch"><input type="checkbox" data-auto-enabled ${character.autoBattle.enabled ? "checked" : ""}><span></span><b>${escapeHtml(t("skill.ui.autoEnable"))}</b></label>
    <label class="gv3-range"><b>${escapeHtml(t("skill.ui.autoHp",{value:character.autoBattle.potionHpBelow}))}</b><input type="range" min="10" max="90" step="5" value="${character.autoBattle.potionHpBelow}" data-auto-hp></label>
    <p class="gv3-help">${escapeHtml(t("skill.ui.autoHint"))}</p>
    <h3>${escapeHtml(t("skill.ui.autoSkills"))}</h3>
    <div class="gv3-auto-list">
      ${learned.map((skill)=>{
        const index=character.autoBattle.skillIds.indexOf(skill.id);
        return `<div class="${index>=0?"active":""}"><button data-auto-toggle="${skill.id}"><i class="gv3-skill-icon gv3-skill-icon--${skill.type}">${escapeHtml(t(skill.nameKey).slice(0,2))}</i><span>${escapeHtml(t(skill.nameKey))}</span><em>${index>=0 ? index+1 : "＋"}</em></button>
        ${index>=0 ? `<button data-auto-move="${skill.id}" data-dir="-1">↑</button><button data-auto-move="${skill.id}" data-dir="1">↓</button>` : ""}</div>`;
      }).join("")}
    </div>
  </div>`;
}

function renderWindow(): void {
  const host = root();
  const character = getSelectedCharacter();
  if (!host || !character) return;
  host.innerHTML = `<section class="gv3-window">
    <header><div><span>${escapeHtml(t("skill.ui.kicker"))}</span><h2>${escapeHtml(t("skill.ui.title"))}</h2></div><button data-skill-close>×</button></header>
    <div class="gv3-points"><b>${escapeHtml(t("skill.ui.points",{count:character.skillPoints}))}</b><span>${escapeHtml(t("skill.ui.resetItems",{count:character.skillResetItems}))}</span></div>
    <nav>${(["tree","hotbar","auto"] as Tab[]).map(tab=>`<button class="${activeTab===tab?"active":""}" data-skill-tab="${tab}">${escapeHtml(t(`skill.ui.${tab}`))}</button>`).join("")}</nav>
    <main>${activeTab==="tree" ? renderTree() : activeTab==="hotbar" ? renderHotbarEditor() : renderAuto()}</main>
    <footer><button data-skill-job>${escapeHtml(t("skill.ui.changeJob"))}</button><button data-skill-reset ${character.skillResetItems>0?"":"disabled"}>${escapeHtml(t("skill.ui.reset"))}</button></footer>
  </section>`;

  bindWindowActions(host);
  if (activeTab === "tree") requestAnimationFrame(drawConnections);
}

function bindWindowActions(host: HTMLElement): void {
  host.querySelector<HTMLElement>("[data-skill-close]")?.addEventListener("click",()=>{host.hidden=true;});
  host.querySelectorAll<HTMLElement>("[data-skill-tab]").forEach(node=>node.addEventListener("click",()=>{
    activeTab=(node.dataset.skillTab as Tab)||"tree"; renderWindow();
  }));
  host.querySelectorAll<HTMLElement>("[data-select-skill]").forEach(node=>node.addEventListener("click",()=>{
    selectedSkillId=String(node.dataset.selectSkill||"survivor_strike"); renderWindow();
  }));
  host.querySelectorAll<HTMLElement>("[data-learn-skill]").forEach(node=>node.addEventListener("click",()=>{
    const id=String(node.dataset.learnSkill||"");
    try {
      const updated=learnSelectedSkill(id);
      if(updated){
        toast(t("skill.ui.learned",{skill:skillName(id),level:getSkillLevel(updated.learnedSkills,id)}));
        renderWindow(); renderHotbar();
        window.dispatchEvent(new Event("greenvale:character-runtime"));
        window.dispatchEvent(new Event("greenvale:character-updated"));
      }
    } catch { toast(t("skill.ui.locked")); }
  }));
  host.querySelectorAll<HTMLElement>("[data-quickslot-skill]").forEach(node=>node.addEventListener("click",(event)=>{
    if ((event.target as HTMLElement).closest("[data-drag-skill]") && node.hasAttribute("data-drag-skill") && activeTab==="hotbar") return;
    const id=String(node.dataset.quickslotSkill||"");
    quickAssign(id);
  }));
  host.querySelectorAll<HTMLElement>("[data-clear-slot]").forEach(node=>node.addEventListener("click",(event)=>{
    event.stopPropagation();
    assignSelectedHotbar(Number(node.dataset.clearSlot),null); renderWindow(); renderHotbar();
  }));
  host.querySelectorAll<HTMLElement>("[data-drag-skill]").forEach(bindLongPressDrag);
  host.querySelector<HTMLElement>("[data-skill-reset]")?.addEventListener("click",()=>{
    const character=getSelectedCharacter();
    if(!character) return;
    if(character.skillResetItems<=0){toast(t("skill.ui.noReset"));return;}
    if(!window.confirm(t("skill.ui.resetConfirm"))) return;
    try {
      resetSelectedSkills();
      window.dispatchEvent(new Event("greenvale:character-runtime"));
      window.dispatchEvent(new Event("greenvale:character-updated"));
      toast(t("skill.ui.resetDone")); renderWindow(); renderHotbar();
    } catch { toast(t("skill.ui.noReset")); }
  });
  host.querySelector<HTMLElement>("[data-skill-job]")?.addEventListener("click",()=>{
    host.hidden=true;
    window.dispatchEvent(new CustomEvent("greenvale:open-character",{detail:{tab:"job"}}));
  });
  const enabled=host.querySelector<HTMLInputElement>("[data-auto-enabled]");
  enabled?.addEventListener("change",()=>{updateSelectedAutoBattle({enabled:enabled.checked}); renderWindow(); renderHotbar();});
  const hp=host.querySelector<HTMLInputElement>("[data-auto-hp]");
  hp?.addEventListener("change",()=>{updateSelectedAutoBattle({potionHpBelow:Number(hp.value)}); renderWindow();});
  host.querySelectorAll<HTMLElement>("[data-auto-toggle]").forEach(node=>node.addEventListener("click",()=>{
    const character=getSelectedCharacter(); if(!character) return;
    const id=String(node.dataset.autoToggle||"");
    const next=[...character.autoBattle.skillIds];
    const index=next.indexOf(id);
    if(index>=0) next.splice(index,1); else next.push(id);
    updateSelectedAutoBattle({skillIds:next.slice(0,6)}); renderWindow();
  }));
  host.querySelectorAll<HTMLElement>("[data-auto-move]").forEach(node=>node.addEventListener("click",()=>{
    const character=getSelectedCharacter(); if(!character) return;
    const id=String(node.dataset.autoMove||""); const dir=Number(node.dataset.dir)||0;
    const next=[...character.autoBattle.skillIds]; const index=next.indexOf(id); const target=index+dir;
    if(index>=0&&target>=0&&target<next.length){[next[index],next[target]]=[next[target],next[index]];updateSelectedAutoBattle({skillIds:next});renderWindow();}
  }));
}

function quickAssign(skillId: string): void {
  const character=getSelectedCharacter(); if(!character) return;
  let slot=character.hotbar.findIndex((id)=>id===null);
  if(slot<0) slot=0;
  try {
    assignSelectedHotbar(slot,skillId);
    toast(t("skill.ui.assigned",{skill:skillName(skillId),slot}));
    renderWindow(); renderHotbar();
  } catch {}
}

function bindLongPressDrag(node: HTMLElement): void {
  const skillId=String(node.dataset.dragSkill||"");
  if(!skillId) return;
  node.addEventListener("pointerdown",(event)=>{
    window.clearTimeout(dragTimer);
    dragTimer=window.setTimeout(()=>{
      draggingSkillId=skillId;
      dragGhost=document.createElement("div");
      dragGhost.className="gv3-drag-ghost";
      dragGhost.textContent=skillName(skillId);
      document.body.appendChild(dragGhost);
      moveGhost(event.clientX,event.clientY);
      if(navigator.vibrate) navigator.vibrate(20);
    },450);
  });
  node.addEventListener("pointermove",(event)=>{
    if(draggingSkillId){event.preventDefault();moveGhost(event.clientX,event.clientY);}
  });
  const finish=(event:PointerEvent)=>{
    window.clearTimeout(dragTimer);
    if(!draggingSkillId) return;
    const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-hotbar-slot]");
    if(target){
      const slot=Number(target.dataset.hotbarSlot);
      try {assignSelectedHotbar(slot,draggingSkillId);toast(t("skill.ui.assigned",{skill:skillName(draggingSkillId),slot}));}
      catch {}
    }
    draggingSkillId=null;dragGhost?.remove();dragGhost=null;renderWindow();renderHotbar();
  };
  node.addEventListener("pointerup",finish);
  node.addEventListener("pointercancel",(event)=>finish(event as PointerEvent));
}

function moveGhost(x:number,y:number):void{
  if(!dragGhost)return;
  dragGhost.style.left=`${x}px`;dragGhost.style.top=`${y-48}px`;
}

function drawConnections(): void {
  document.querySelectorAll<HTMLElement>(".gv3-tree-group").forEach(group=>{
    const svg=group.querySelector<SVGSVGElement>(".gv3-tree-lines");
    const grid=group.querySelector<HTMLElement>(".gv3-tree-grid");
    if(!svg||!grid)return;
    const box=grid.getBoundingClientRect(); svg.setAttribute("viewBox",`0 0 ${box.width} ${box.height}`); svg.innerHTML="";
    group.querySelectorAll<HTMLElement>("[data-skill-id]").forEach(card=>{
      const skill=getSkill(String(card.dataset.skillId||"")); if(!skill)return;
      for(const req of skill.prerequisites??[]){
        const from=group.querySelector<HTMLElement>(`[data-skill-id="${req.skillId}"]`); if(!from)continue;
        const a=from.getBoundingClientRect(),b=card.getBoundingClientRect();
        const x1=a.left-box.left+a.width/2,y1=a.top-box.top+a.height;
        const x2=b.left-box.left+b.width/2,y2=b.top-box.top;
        const path=document.createElementNS("http://www.w3.org/2000/svg","path");
        path.setAttribute("d",`M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`);
        path.setAttribute("class",getSkillLevel(getSelectedCharacter()?.learnedSkills||{},req.skillId)>=req.level?"met":"");
        svg.appendChild(path);
      }
    });
  });
}

function showCast(skillId:string,duration:number):void{
  const el=castRoot();if(!el)return;
  el.hidden=false;
  el.innerHTML=`<div><b>${escapeHtml(t("skill.ui.castLabel",{skill:skillName(skillId)}))}</b><i><em></em></i></div>`;
  const bar=el.querySelector<HTMLElement>("em");
  if(bar){bar.style.animationDuration=`${duration}ms`;}
}
function hideCast():void{const el=castRoot();if(el)el.hidden=true;}

function cancelCast(interrupted=false):void{
  if(!casting)return;
  window.clearTimeout(casting.timer);casting=null;hideCast();
  if(interrupted)toast(t("skill.ui.castInterrupted"));
}

async function useSkill(skillId:string,source:"hotbar"|"auto"|"ui"):Promise<void>{
  const character=getSelectedCharacter();const skill=getSkill(skillId);
  if(!character||!skill||getSkillLevel(character.learnedSkills,skillId)<=0||!isUsableSkill(skill))return;
  if(casting)return;
  const readyAt=cooldowns.get(skillId)||0;
  if(readyAt>Date.now()){if(source!=="auto")toast(t("skill.ui.cooling"));return;}
  const level=getSkillLevel(character.learnedSkills,skillId);
  const data=getSkillLevelData(skillId,level);
  if(!data)return;
  if(runtimeState.maxSp>0&&runtimeState.sp<data.spCost){if(source!=="auto")toast(t("skill.ui.noSp"));return;}
  if(data.castMs>0){
    const started=Date.now();
    showCast(skillId,data.castMs);
    const timer=window.setTimeout(()=>{casting=null;hideCast();dispatchSkill(skillId,level,source);},data.castMs);
    casting={skillId,source,startedAt:started,endsAt:started+data.castMs,timer};
  }else dispatchSkill(skillId,level,source);
}

function dispatchSkill(skillId:string,level:number,source:"hotbar"|"auto"|"ui"):void{
  window.dispatchEvent(new CustomEvent("greenvale:skill-cast",{detail:{skillId,level,source}}));
}

function updateCooldownVisuals():void{
  const now=Date.now();
  document.querySelectorAll<HTMLElement>("[data-cooldown-skill]").forEach(node=>{
    const id=String(node.dataset.cooldownSkill||"");if(!id){node.style.setProperty("--cooldown-p","0");node.textContent="";return;}
    const skill=getSkill(id);const ready=cooldowns.get(id)||0;const total=Number(skill?.cooldownMs)||0;
    const remaining=Math.max(0,ready-now);
    const ratio=total>0?Math.min(1,remaining/total):0;
    node.style.setProperty("--cooldown-p",String(ratio));
    node.textContent=remaining>0?(remaining/1000).toFixed(1):"";
  });
}

function autoTick():void{
  const character=getSelectedCharacter();if(!character?.autoBattle.enabled||casting)return;
  const hpPct=runtimeState.maxHp>0?(runtimeState.hp/runtimeState.maxHp)*100:100;
  const ids=character.autoBattle.skillIds.filter(id=>getSkillLevel(character.learnedSkills,id)>0);
  let selected:string|undefined;
  if(hpPct<=character.autoBattle.potionHpBelow){
    selected=ids.find(id=>getSkill(id)?.runtime?.kind==="heal");
  }
  if(!selected)selected=ids.find(id=>{
    const skill=getSkill(id);return !!skill&&skill.runtime?.kind!=="heal"&&isUsableSkill(skill);
  });
  if(selected)void useSkill(selected,"auto");
}

function handleSkillResult(detail:any):void{
  if(detail?.hp!==undefined)runtimeState.hp=Number(detail.hp)||0;
  if(detail?.maxHp!==undefined)runtimeState.maxHp=Number(detail.maxHp)||0;
  if(detail?.sp!==undefined)runtimeState.sp=Number(detail.sp)||0;
  if(detail?.maxSp!==undefined)runtimeState.maxSp=Number(detail.maxSp)||0;
  const id=String(detail?.skillId||"");
  if(detail?.ok&&id){
    const skill=getSkill(id);cooldowns.set(id,Number(detail.readyAt)||Date.now()+(Number(skill?.cooldownMs)||0));
    if(detail.source!=="auto")toast(t("skill.ui.used",{skill:skillName(id)}));
  }else if(id&&detail?.reason&&detail.source!=="auto"){
    const key=detail.reason==="no-sp"?"skill.ui.noSp":detail.reason==="cooldown"?"skill.ui.cooling":detail.reason==="no-target"?"skill.ui.noTarget":"skill.ui.locked";
    toast(t(key));
  }
  updateCooldownVisuals();
}

export function openSkillSystem(tab:Tab="tree"):void{
  activeTab=tab;
  const el=root();if(!el)return;
  renderWindow();el.hidden=false;
}

export function initSkillSystem():void{
  if(initialized)return;initialized=true;
  document.getElementById("gv-skill-btn")?.addEventListener("click",()=>openSkillSystem("tree"));

  gameEvents.on("game:canvas-ready",()=>{
    const hotbar=hotbarRoot();if(hotbar)hotbar.hidden=false;
    window.__GV_SKILL_STATE__ = { ...runtimeState };
    renderHotbar();
    window.dispatchEvent(new Event("greenvale:skill-state-request"));
  });
  gameEvents.on("i18n:changed",()=>{if(root()&&!root()!.hidden)renderWindow();renderHotbar();});

  window.addEventListener("greenvale:skill-result",(event)=>handleSkillResult((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:skill-state",(event)=>handleSkillResult((event as CustomEvent).detail||{}));
  window.addEventListener("greenvale:player-hit",(event)=>{
    const detail=(event as CustomEvent).detail||{};
    if(detail.hp!==undefined)runtimeState.hp=Number(detail.hp)||0;
    if(detail.maxHp!==undefined)runtimeState.maxHp=Number(detail.maxHp)||0;
    if(casting){
      const skill=getSkill(casting.skillId);
      if(skill?.interruptible!==false)cancelCast(true);
    }
  });
  window.addEventListener("greenvale:character-updated",()=>{renderHotbar();if(root()&&!root()!.hidden)renderWindow();});

  window.setInterval(updateCooldownVisuals,100);
  autoTimer=window.setInterval(autoTick,700);
}

export function destroySkillSystem():void{
  if(autoTimer)window.clearInterval(autoTimer);
  cancelCast(false);
}
