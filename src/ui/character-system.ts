import classesData from "../data/classes.json";
import {
  calculateDerivedStats,
  canChangeJob,
  getBaseExpRequired,
  getBaseExpPercent,
  getClassConfig,
  getJobExpRequired,
  getJobExpPercent,
  getStatUpgradeCost,
  STAT_KEYS,
  type StatKey,
} from "../core/character";
import { applySkillPassives } from "../core/skills";
import { isDebugMode } from "../core/build-info";
import { gameEvents } from "../core/event-bus";
import { t } from "../core/i18n";
import {
  changeSelectedJob,
  equipSelectedCostume,
  gainSelectedExperience,
  getSelectedCharacter,
  spendSelectedStat,
  triggerSelectedEmote,
  writeLegacyBridge,
} from "../core/save";
import "./character-system.css";

declare global {
  interface Window {
    __GV_PHASE2__?: {
      open: () => void;
      gainExp: (baseExp: number, jobExp: number) => void;
    };
  }
}

type Tab = "stats" | "job" | "costume" | "emote";
let activeTab: Tab = "stats";
let animationDemo = "idle";
let initialized = false;

function host(): HTMLElement | null {
  return document.getElementById("gv-character-system");
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

function requestRuntimeRefresh(): void {
  const character = getSelectedCharacter();
  if (!character) return;
  writeLegacyBridge(character);
  window.dispatchEvent(new CustomEvent("greenvale:character-runtime", {
    detail: { characterId: character.id },
  }));
  window.dispatchEvent(new Event("greenvale:character-updated"));
}

function expBar(label: string, current: number, required: number, percent: number): string {
  return `<div class="gv2-exp">
    <div><span>${escapeHtml(label)}</span><b>${percent}%</b></div>
    <i><em style="width:${Math.max(0, Math.min(100, percent))}%"></em></i>
    <small>${current.toLocaleString()} / ${required > 0 ? required.toLocaleString() : "MAX"}</small>
  </div>`;
}

function renderStats(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const derived = applySkillPassives(
    calculateDerivedStats(character.classId, character),
    character.learnedSkills,
  );
  const maxStat = Number(classesData.maxStat) || 99;

  const primary = STAT_KEYS.map((key) => {
    const value = character.stats[key];
    const cost = getStatUpgradeCost(value);
    const canSpend = value < maxStat && character.statPoints >= cost;
    return `<div class="gv2-stat-row">
      <div class="gv2-stat-name"><b>${key}</b><span>${value}</span></div>
      <div class="gv2-stat-cost">${value >= maxStat ? escapeHtml(t("character.max")) : escapeHtml(t("character.cost", { cost }))}</div>
      <button data-phase2="stat" data-stat="${key}" ${canSpend ? "" : "disabled"}>＋</button>
    </div>`;
  }).join("");

  const derivedRows = (Object.entries(derived) as Array<[keyof typeof derived, number]>).map(([key, value]) =>
    `<div class="gv2-derived-row"><span>${escapeHtml(t(`derived.${String(key)}`))}</span><b>${Number.isInteger(value) ? value : value.toFixed(2)}</b></div>`
  ).join("");

  return `<div class="gv2-tab-body">
    <div class="gv2-points">
      <strong>${escapeHtml(t("character.statPoints", { count: character.statPoints }))}</strong>
      <span>${escapeHtml(t("character.skillPoints", { count: character.skillPoints }))}</span>
    </div>
    <div class="gv2-stat-grid">${primary}</div>
    <h3>${escapeHtml(t("character.derived"))}</h3>
    <div class="gv2-derived-grid">${derivedRows}</div>
  </div>`;
}

function classIcon(classId: string): string {
  const letters: Record<string,string> = {
    novice:"NV",vanguard:"VG",arcanist:"AR",ranger:"RG",mender:"MD",shade:"SH",trader:"TR",
  };
  return `<span class="gv2-class-icon gv2-class-icon--${escapeHtml(classId)}">${letters[classId] || "GV"}</span>`;
}

function renderAnimationDemo(classId: string): string {
  const cls = getClassConfig(classId) as any;
  const outfit = cls.outfit || { body: "#5b765f", accent: "#d1c188" };
  const states = ["idle","walk","run","attack","skill","hit","death","rest","emote"];
  return `<section class="gv2-animation-demo">
    <h3>${escapeHtml(t("character.animationDemo"))}</h3>
    <div class="gv2-animation-stage">
      <div class="gv2-dummy" data-state="${animationDemo}" style="--body:${outfit.body};--accent:${outfit.accent}">
        <i class="head"></i><i class="torso"></i><i class="arm a"></i><i class="arm b"></i><i class="leg a"></i><i class="leg b"></i><i class="weapon"></i>
      </div>
    </div>
    <div class="gv2-animation-buttons">
      ${states.map(state => `<button class="${animationDemo===state?"active":""}" data-phase2="animation" data-animation="${state}">${escapeHtml(t(`anim.${state}`))}</button>`).join("")}
    </div>
  </section>`;
}

function renderJob(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  const current = getClassConfig(character.classId) as any;
  const ready = canChangeJob(character.classId, character.jobLevel);

  if (character.classId !== "novice") {
    return `<div class="gv2-tab-body">
      <div class="gv2-current-job">${classIcon(character.classId)}<div><h3>${escapeHtml(t(current.nameKey))}</h3><p>${escapeHtml(t(current.descriptionKey))}</p></div></div>
      <dl class="gv2-job-details">
        <div><dt>${escapeHtml(t("character.weaponTypes"))}</dt><dd>${escapeHtml(current.weapons.join(" · "))}</dd></div>
        <div><dt>${escapeHtml(t("character.passive"))}</dt><dd>${escapeHtml(t(current.passive.nameKey))}</dd></div>
        <div><dt>${escapeHtml(t("character.aspd"))}</dt><dd>${Number(current.aspd).toFixed(2)}</dd></div>
        <div><dt>${escapeHtml(t("character.animationSet"))}</dt><dd>✓</dd></div>
      </dl>
      ${renderAnimationDemo(character.classId)}
      <div class="gv2-rebirth"><b>${escapeHtml(t("character.rebirth"))}</b><span>${escapeHtml(t("character.rebirthPlanned"))}</span></div>
    </div>`;
  }

  const jobs = classesData.classes.filter((entry) => entry.id !== "novice");
  return `<div class="gv2-tab-body">
    <div class="gv2-job-gate ${ready ? "ready" : ""}">
      <b>${escapeHtml(t(ready ? "character.jobReady" : "character.jobLocked"))}</b>
      <span>Job Lv ${character.jobLevel} / 10</span>
    </div>
    ${renderAnimationDemo("novice")}
    <div class="gv2-job-cards">
      ${jobs.map((job:any) => `<article>
        ${classIcon(job.id)}
        <h4>${escapeHtml(t(job.nameKey))}</h4>
        <p>${escapeHtml(t(job.descriptionKey))}</p>
        <div class="gv2-job-tags"><span>${escapeHtml(t(`role.${job.role}`))}</span><span>${escapeHtml(job.recommendedStats.join(" · "))}</span></div>
        <small>${escapeHtml(t("character.weaponTypes"))}: ${escapeHtml(job.weapons.join(" · "))}</small>
        <small>${escapeHtml(t("character.passive"))}: ${escapeHtml(t(job.passive.nameKey))}</small>
        <button data-phase2="job" data-job="${job.id}" ${ready ? "" : "disabled"}>${escapeHtml(t("character.confirmJob", { job: t(job.nameKey) }))}</button>
      </article>`).join("")}
    </div>
  </div>`;
}

function renderCostume(): string {
  const character = getSelectedCharacter();
  if (!character) return "";
  return `<div class="gv2-tab-body">
    <p class="gv2-help">${escapeHtml(t("character.costumeNoStats"))}</p>
    <div class="gv2-costumes">
      ${classesData.costumes.map((costume:any) => {
        const overlay = costume.overlay;
        const style = overlay ? `--body:${overlay.body};--accent:${overlay.accent}` : "--body:#5b765f;--accent:#d1c188";
        return `<button class="${character.costumeId === costume.id ? "active" : ""}" data-phase2="costume" data-costume="${costume.id}">
          <i style="${style}"><em></em></i>
          <span>${escapeHtml(t(costume.nameKey))}</span>
        </button>`;
      }).join("")}
    </div>
  </div>`;
}

function renderEmote(): string {
  return `<div class="gv2-tab-body">
    <p class="gv2-help">${escapeHtml(t("character.emoteHint"))}</p>
    <div class="gv2-emotes">
      ${classesData.emotes.map((emote:any,index) => `<button data-phase2="emote" data-emote="${emote.id}"><i>${index + 1}</i><span>${escapeHtml(t(emote.nameKey))}</span></button>`).join("")}
    </div>
  </div>`;
}

function render(): void {
  const el = host();
  const character = getSelectedCharacter();
  if (!el || !character) return;

  const cls = getClassConfig(character.classId) as any;
  const baseRequired = getBaseExpRequired(character.baseLevel);
  const jobRequired = getJobExpRequired(character.jobLevel);

  el.innerHTML = `<section class="gv2-window">
    <header>
      <div class="gv2-identity">${classIcon(character.classId)}<div><span>${escapeHtml(character.name)}</span><b>${escapeHtml(t(cls.nameKey))}</b></div></div>
      <button class="gv2-close" data-phase2="close">×</button>
    </header>
    <div class="gv2-levels">
      <b>Base Lv ${character.baseLevel}</b><b>Job Lv ${character.jobLevel}</b>
      ${expBar(t("character.baseExp",{current:character.baseExp,required:baseRequired}), character.baseExp, baseRequired, getBaseExpPercent(character))}
      ${expBar(t("character.jobExp",{current:character.jobExp,required:jobRequired}), character.jobExp, jobRequired, getJobExpPercent(character))}
    </div>
    <nav>
      ${(["stats","job","costume","emote"] as Tab[]).map(tab => `<button class="${activeTab===tab?"active":""}" data-phase2="tab" data-tab="${tab}">${escapeHtml(t(`character.${tab}`))}</button>`).join("")}
    </nav>
    ${activeTab === "stats" ? renderStats() : activeTab === "job" ? renderJob() : activeTab === "costume" ? renderCostume() : renderEmote()}
  </section>`;

  el.querySelectorAll<HTMLElement>("[data-phase2]").forEach(node => {
    node.addEventListener("click", () => handleAction(node));
  });
}

function handleAction(node: HTMLElement): void {
  const action = node.dataset.phase2;
  if (action === "close") {
    const el = host(); if (el) el.hidden = true; return;
  }
  if (action === "tab") {
    activeTab = (node.dataset.tab as Tab) || "stats"; render(); return;
  }
  if (action === "animation") {
    animationDemo = String(node.dataset.animation || "idle");
    render();
    return;
  }
  if (action === "stat") {
    try {
      spendSelectedStat(node.dataset.stat as StatKey);
      requestRuntimeRefresh();
      render();
    } catch {
      toast(t("character.notEnoughPoints"));
    }
    return;
  }
  if (action === "job") {
    const jobId = String(node.dataset.job || "");
    const updated = changeSelectedJob(jobId);
    if (updated) {
      requestRuntimeRefresh();
      toast(t("character.jobChanged", { job: t((getClassConfig(jobId) as any).nameKey) }));
      render();
    }
    return;
  }
  if (action === "costume") {
    equipSelectedCostume(String(node.dataset.costume || "none"));
    requestRuntimeRefresh();
    render();
    return;
  }
  if (action === "emote") {
    triggerSelectedEmote(String(node.dataset.emote || ""));
  }
}

export function openCharacterSystem(tab: Tab = "stats"): void {
  activeTab = tab;
  const el = host();
  if (!el) return;
  render();
  el.hidden = false;
}

export function initCharacterSystem(): void {
  if (initialized) return;
  initialized = true;

  document.getElementById("gv-character-btn")?.addEventListener("click", () => openCharacterSystem("stats"));

  window.addEventListener("greenvale:experience", (event) => {
    const detail = (event as CustomEvent).detail || {};
    const before = getSelectedCharacter();
    const updated = gainSelectedExperience(Number(detail.baseExp) || 0, Number(detail.jobExp) || 0, String(detail.source || "combat"));
    if (!updated) return;
    if (!before || updated.baseLevel !== before.baseLevel || updated.jobLevel !== before.jobLevel) {
      toast(t("character.levelUp", { base: updated.baseLevel, job: updated.jobLevel }));
    }
    requestRuntimeRefresh();
    if (host() && !host()!.hidden) render();
  });

  window.addEventListener("greenvale:character-updated", () => {
    if (host() && !host()!.hidden) render();
  });

  window.addEventListener("greenvale:emote", (event) => {
    const detail = (event as CustomEvent).detail || {};
    const emote = classesData.emotes.find((entry) => entry.id === detail.emoteId);
    const bubble = document.getElementById("gv-emote-bubble");
    if (!bubble || !emote) return;
    bubble.textContent = t(emote.nameKey);
    bubble.hidden = false;
    bubble.dataset.emote = emote.id;
    window.setTimeout(() => { bubble.hidden = true; }, 1400);
  });

  if (isDebugMode()) {
    window.__GV_PHASE2__ = {
      open: () => openCharacterSystem(),
      gainExp: (baseExp, jobExp) => {
        gainSelectedExperience(baseExp, jobExp, "debug");
        requestRuntimeRefresh();
      },
    };
  }
}
