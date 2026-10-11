import { allMonsters, bestiaryProgress, getMonsterConfig } from "../core/monsters";
import { t } from "../core/i18n";
import "./monster-system.css";

const STORAGE_KEY = "greenvale.bestiary.v1";

type BestiarySave = {
  version: 1;
  kills: Record<string, number>;
  rewardsSeen: string[];
};

function loadBestiary(): BestiarySave {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw?.version === 1 && raw.kills && typeof raw.kills === "object") {
      return {
        version: 1,
        kills: { ...raw.kills },
        rewardsSeen: Array.isArray(raw.rewardsSeen) ? raw.rewardsSeen.map(String) : [],
      };
    }
  } catch {}
  return { version: 1, kills: {}, rewardsSeen: [] };
}

function saveBestiary(save: BestiarySave) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch {}
}

function monsterName(monsterId: string): string {
  const config = getMonsterConfig(monsterId);
  return config ? t(config.nameKey) : monsterId;
}

function ensureShell() {
  let button = document.getElementById("gv-bestiary-button") as HTMLButtonElement | null;
  if (!button) {
    button = document.createElement("button");
    button.id = "gv-bestiary-button";
    button.type = "button";
    button.textContent = "📖 " + t("bestiary.button");
    button.setAttribute("aria-label", t("bestiary.title"));
    document.body.appendChild(button);
  }

  let panel = document.getElementById("gv-bestiary-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "gv-bestiary-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="gv5-panel-card" role="dialog" aria-modal="true" aria-label="${t("bestiary.title")}">
        <header><strong>📖 ${t("bestiary.title")}</strong><button type="button" data-best-close>×</button></header>
        <div class="gv5-bestiary-list"></div>
      </div>
    `;
    document.body.appendChild(panel);
  }

  let boss = document.getElementById("gv-boss-bar");
  if (!boss) {
    boss = document.createElement("div");
    boss.id = "gv-boss-bar";
    boss.hidden = true;
    boss.innerHTML = `
      <div class="gv5-boss-title"><span data-boss-name></span><span data-boss-phase></span></div>
      <div class="gv5-boss-track"><i data-boss-fill></i></div>
      <div class="gv5-boss-hp" data-boss-hp></div>
    `;
    document.body.appendChild(boss);
  }

  let toast = document.getElementById("gv-monster-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "gv-monster-toast";
    toast.hidden = true;
    document.body.appendChild(toast);
  }

  return { button, panel, boss, toast };
}

function renderBestiary() {
  const { panel } = ensureShell();
  const list = panel.querySelector(".gv5-bestiary-list") as HTMLElement;
  const save = loadBestiary();
  list.innerHTML = "";

  for (const config of allMonsters()) {
    const kills = Number(save.kills[config.id] || 0);
    const progress = bestiaryProgress(config, kills);
    const article = document.createElement("article");
    article.className = "gv5-bestiary-entry";
    article.dataset.monsterId = config.id;
    const flags = [
      config.boss?.fieldBoss ? t("monster.boss") : "",
      config.miniBoss ? t("monster.miniboss") : "",
    ].filter(Boolean).join(" · ");
    article.innerHTML = `
      <div class="gv5-monster-icon" aria-hidden="true">${config.boss ? "☠" : config.race === "plant" ? "✿" : "◆"}</div>
      <div class="gv5-monster-copy">
        <strong>${progress.revealed ? monsterName(config.id) : "???"}</strong>
        <small>${flags || t("monster.ai." + config.ai)}</small>
        <span>${t("bestiary.kills", { count: kills })}</span>
        <span>${progress.revealed
          ? `Lv ${config.level} · ${config.element} · ${config.size} · ${config.race}`
          : t("bestiary.revealAt", { count: progress.revealKills })}</span>
        <span class="${progress.rewardReady ? "is-ready" : ""}">${progress.rewardReady
          ? t("bestiary.rewardReady")
          : t("bestiary.rewardAt", { count: progress.rewardKills })}</span>
      </div>
    `;
    list.appendChild(article);
  }
}

function showToast(message: string) {
  const { toast } = ensureShell();
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout((showToast as any)._timer);
  (showToast as any)._timer = window.setTimeout(() => { toast.hidden = true; }, 2600);
}

function recordMonsterDefeat(monsterId: string) {
  const config = getMonsterConfig(monsterId);
  if (!config) return;
  const save = loadBestiary();
  const before = Number(save.kills[monsterId] || 0);
  const next = before + 1;
  save.kills[monsterId] = next;
  saveBestiary(save);

  const beforeProgress = bestiaryProgress(config, before);
  const nextProgress = bestiaryProgress(config, next);
  if (!beforeProgress.revealed && nextProgress.revealed) {
    showToast(t("bestiary.newEntry", { name: monsterName(monsterId) }));
  }
  renderBestiary();
  window.dispatchEvent(new CustomEvent("greenvale:bestiary-updated", { detail: { monsterId, kills: next } }));
}

function updateBossBar(detail: any) {
  const { boss } = ensureShell();
  if (!detail || detail.active === false || Number(detail.hp) <= 0) {
    boss.hidden = true;
    return;
  }
  const maxHp = Math.max(1, Number(detail.maxHp) || 1);
  const hp = Math.max(0, Number(detail.hp) || 0);
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  (boss.querySelector("[data-boss-name]") as HTMLElement).textContent = String(detail.name || monsterName(String(detail.monsterId || "")));
  (boss.querySelector("[data-boss-phase]") as HTMLElement).textContent = detail.phase ? t("monster.phase", { phase: detail.phase }) : "";
  (boss.querySelector("[data-boss-hp]") as HTMLElement).textContent = `${Math.ceil(hp)} / ${Math.ceil(maxHp)}`;
  (boss.querySelector("[data-boss-fill]") as HTMLElement).style.width = `${Math.round(ratio * 100)}%`;
  boss.hidden = false;
}

let initialized = false;

export function initMonsterSystem(): void {
  if (initialized) return;
  initialized = true;
  const { button, panel } = ensureShell();

  button.addEventListener("click", () => {
    renderBestiary();
    panel.hidden = false;
  });
  panel.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-best-close]") || target === panel) panel.hidden = true;
  });

  window.addEventListener("greenvale:monster-defeated", event => {
    const detail = (event as CustomEvent).detail || {};
    recordMonsterDefeat(String(detail.monsterId || ""));
  });
  window.addEventListener("greenvale:boss-state", event => updateBossBar((event as CustomEvent).detail));
  window.addEventListener("greenvale:monster-announce", event => {
    const detail = (event as CustomEvent).detail || {};
    showToast(t("monster.announce", { name: detail.name || monsterName(String(detail.monsterId || "")) }));
  });
  window.addEventListener("greenvale:combat-state-request", () => renderBestiary());

  renderBestiary();
}
