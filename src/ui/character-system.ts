import classesData from "../data/classes.json";
import costumesData from "../data/costumes.json";
import emotesData from "../data/emotes.json";
import animationsData from "../data/animations.json";
import { gameEvents } from "../core/event-bus";
import { t } from "../core/i18n";
import {
  allocateStat,
  changeJob,
  gainExperience,
  getSelectedCharacter,
  setCostume,
  type CharacterSave,
} from "../core/save";
import {
  STAT_KEYS,
  calculateDerivedStats,
  getBaseCurve,
  getClassConfig,
  getJobCurve,
  getStatPointCost,
  isJobChangeEligible,
} from "../core/progression";
import "./character-system.css";

let bound = false;
let activeAnimation = "idle";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pct(current: number, required: number | null): number {
  if (!required || required <= 0) return 100;
  return Math.max(0, Math.min(100, (current / required) * 100));
}

function toast(message: string): void {
  const el = document.getElementById("gv-toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 1900);
}

function className(id: string): string {
  const config = getClassConfig(id);
  return t(config.nameKey);
}

function renderStatRows(character: CharacterSave): string {
  return STAT_KEYS.map((key) => {
    const value = character.stats[key];
    const cost = getStatPointCost(value);
    const disabled = value >= 99 || character.statPoints < cost;
    return `<div class="gv-stat-row">
      <span class="gv-stat-key">${esc(t(`stat.${key}`))}</span>
      <strong>${value}</strong>
      <span class="gv-stat-cost">${value >= 99 ? esc(t("phase2.max")) : esc(t("phase2.cost",{cost}))}</span>
      <button type="button" data-cs-action="stat" data-stat="${key}" ${disabled ? "disabled" : ""}>＋</button>
    </div>`;
  }).join("");
}

function renderDerived(character: CharacterSave): string {
  const derived = calculateDerivedStats(character);
  const keys = ["ATK","MATK","DEF","MDEF","HIT","FLEE","perfectDodge","CRIT","critResist","ASPD","MaxHP","MaxSP","hpRegen","spRegen","maxWeight","attackRange","block"] as const;
  return keys.map((key) => `<div class="gv-derived-cell"><span>${esc(t(`derived.${key}`))}</span><strong>${esc(derived[key])}</strong></div>`).join("");
}

function renderJobChange(character: CharacterSave): string {
  if (character.classId !== "novice") {
    const cfg = getClassConfig(character.classId);
    return `<div class="gv-current-job">
      <div><small>${esc(t("phase2.passive"))}</small><strong>${esc(t(`passive.${cfg.passive?.id || "adaptable"}`))}</strong></div>
      <div><small>${esc(t("phase2.weapons"))}</small><strong>${esc(cfg.weapons.join(" · "))}</strong></div>
    </div>`;
  }

  if (!isJobChangeEligible(character.classId, character.jobLevel)) {
    return `<div class="gv-job-locked">🔒 ${esc(t("phase2.jobLocked"))}</div>`;
  }

  const jobs = classesData.classes.filter((entry) => entry.id !== "novice");
  return `<div class="gv-job-ready">
    <strong>✓ ${esc(t("phase2.jobReady"))}</strong>
    <div class="gv-job-grid">
      ${jobs.map((job) => `<button type="button" data-cs-action="job" data-job="${job.id}">
        <i class="gv-job-icon" style="--job-color:${esc((job as any).outfitColor || "#5b765f")}" data-icon="${esc((job as any).icon || "")}"></i>
        <b>${esc(t(job.nameKey))}</b>
        <span>${esc(t(`role.${job.role}`))}</span>
        <small>${esc(job.recommendedStats.join(" · "))}</small>
      </button>`).join("")}
    </div>
  </div>`;
}

function renderCostumes(character: CharacterSave): string {
  return costumesData.costumes.map((costume) =>
    `<button type="button" class="${costume.id === character.costumeId ? "active" : ""}" data-cs-action="costume" data-costume="${costume.id}">
      ${esc(t(costume.nameKey))}
    </button>`
  ).join("");
}

function renderEmotes(): string {
  return emotesData.emotes.map((emote) =>
    `<button type="button" data-cs-action="emote" data-emote="${emote.id}" title="${esc(t(emote.nameKey))}">
      <span class="gv-emote-pixel gv-emote-pixel--${esc(emote.id)}" aria-hidden="true"></span><small>${esc(t(emote.nameKey))}</small>
    </button>`
  ).join("");
}

function renderAnimations(): string {
  return animationsData.animations.map((animation) =>
    `<button type="button" class="${animation.id === activeAnimation ? "active" : ""}" data-cs-action="animation" data-animation="${animation.id}">
      ${esc(t(animation.nameKey))}
    </button>`
  ).join("");
}

export function renderCharacterSystem(): void {
  const host = document.getElementById("gv-character-system");
  const character = getSelectedCharacter();
  if (!host || !character) return;

  const baseRow = getBaseCurve(character.baseLevel);
  const jobRow = getJobCurve(character.jobLevel);
  const classCfg = getClassConfig(character.classId);
  const baseRequired = Number(baseRow.expToNext) || null;
  const jobRequired = Number(jobRow.expToNext) || null;

  host.innerHTML = `
    <section class="gv-cs">
      <header class="gv-cs-head">
        <div><small>${esc(t("phase2.sheet"))}</small><h3>${esc(character.name)} · ${esc(className(character.classId))}</h3></div>
        <div class="gv-cs-points"><b>${esc(t("phase2.statPoints"))}: ${character.statPoints}</b><b>${esc(t("phase2.skillPoints"))}: ${character.skillPoints}</b></div>
      </header>

      <div class="gv-level-grid">
        <div class="gv-level-box"><div><strong>Base Lv ${character.baseLevel}</strong><span>${character.baseExp} / ${baseRequired ?? "MAX"}</span></div><i><b style="width:${pct(character.baseExp,baseRequired)}%"></b></i></div>
        <div class="gv-level-box"><div><strong>Job Lv ${character.jobLevel}</strong><span>${character.jobExp} / ${jobRequired ?? "MAX"}</span></div><i><b style="width:${pct(character.jobExp,jobRequired)}%"></b></i></div>
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.stats"))}</h4>
        <div class="gv-stat-list">${renderStatRows(character)}</div>
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.derived"))}</h4>
        <div class="gv-derived-grid">${renderDerived(character)}</div>
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.jobChange"))}</h4>
        ${renderJobChange(character)}
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.costume"))}</h4>
        <p class="gv-cs-note">${esc(t("phase2.costumeNote"))}</p>
        <div class="gv-costume-row">${renderCostumes(character)}</div>
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.animationLab"))}</h4>
        <div class="gv-animation-stage" data-animation="${activeAnimation}" data-costume="${esc(character.costumeId)}" data-class="${esc(character.classId)}" style="--job-outfit:${esc((classCfg as any).outfitColor || "#58745f")}">
          <div class="gv-animation-dummy"><i></i><b></b><span></span></div>
          <em>${esc(t(`animation.${activeAnimation}`))}</em>
        </div>
        <div class="gv-animation-row">${renderAnimations()}</div>
      </div>

      <div class="gv-cs-section">
        <h4>${esc(t("phase2.emotes"))}</h4>
        <div class="gv-emote-row">${renderEmotes()}</div>
      </div>

      <div class="gv-cs-section gv-rebirth-box">
        <h4>${esc(t("phase2.rebirth"))}</h4>
        <p>${esc(t("phase2.rebirthLocked"))}</p>
      </div>

      <div class="gv-cs-foot"><span>${esc(t("phase2.passive"))}: ${esc(t(`passive.${classCfg.passive?.id || "adaptable"}`))}</span><span>${esc(t("phase2.weapons"))}: ${esc(classCfg.weapons.join(" · "))}</span></div>
    </section>`;
}

function showEmote(id: string): void {
  const data = emotesData.emotes.find((entry) => entry.id === id);
  const el = document.getElementById("gv-emote-pop");
  if (!data || !el) return;
  el.innerHTML = `<span class="gv-emote-pixel gv-emote-pixel--${esc(data.id)}" aria-hidden="true"></span>`;
  el.hidden = false;
  el.dataset.emote = id;
  setTimeout(() => { el.hidden = true; }, 1700);
}

function onClick(event: Event): void {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cs-action]");
  if (!target) return;
  const character = getSelectedCharacter();
  if (!character) return;
  const action = target.dataset.csAction;

  try {
    if (action === "stat") {
      allocateStat(character.id, target.dataset.stat as any);
      renderCharacterSystem();
      return;
    }
    if (action === "job") {
      const jobId = String(target.dataset.job || "");
      const changed = changeJob(character.id, jobId);
      toast(t("phase2.jobChanged",{className:className(changed.classId)}));
      renderCharacterSystem();
      return;
    }
    if (action === "costume") {
      setCostume(character.id, String(target.dataset.costume || "none"));
      renderCharacterSystem();
      return;
    }
    if (action === "emote") {
      showEmote(String(target.dataset.emote || ""));
      return;
    }
    if (action === "animation") {
      activeAnimation = String(target.dataset.animation || "idle");
      renderCharacterSystem();
    }
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

function onExperience(event: Event): void {
  const custom = event as CustomEvent<{ baseExp?: number; jobExp?: number }>;
  const character = getSelectedCharacter();
  if (!character) return;
  const result = gainExperience(character.id, Number(custom.detail?.baseExp)||0, Number(custom.detail?.jobExp)||0);
  if (result.baseLevelsGained || result.jobLevelsGained) {
    toast(t("phase2.levelUp",{base:result.baseLevelsGained,job:result.jobLevelsGained}));
  }
  renderCharacterSystem();
}

export function initCharacterSystem(): void {
  if (bound) return;
  bound = true;
  document.getElementById("gv-character-system")?.addEventListener("click", onClick);
  window.addEventListener("greenvale:experience", onExperience as EventListener);
  gameEvents.on("save:changed", () => renderCharacterSystem());
  gameEvents.on("i18n:changed", () => renderCharacterSystem());
  renderCharacterSystem();
}
