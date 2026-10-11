import creation from "../data/character_creation.json";
import cutscene from "../data/cutscene.json";
import classesConfig from "../data/classes.json";
import { buildInfo } from "../core/build-info";
import { getClassConfig } from "../core/character";
import { gameEvents } from "../core/event-bus";
import { getLocale, setLocale, t, type Locale } from "../core/i18n";
import {
  createCharacter,
  deleteCharacter,
  findCharacter,
  getSelectedCharacter,
  isNameTaken,
  listCharacters,
  loadSave,
  renameCharacter,
  selectCharacter,
  syncSelectedFromLegacy,
  updateCharacter,
  type CharacterAppearance,
  type CharacterSave,
  type PreviewAnimation,
  type PreviewDirection,
} from "../core/save";
import "./onboarding.css";

type View = "title" | "slots" | "creator" | "career" | "cutscene" | "loading";
type ModalState =
  | { kind: "login" }
  | { kind: "rename"; characterId: string }
  | { kind: "delete"; characterId: string }
  | null;

declare global {
  interface Window {
    __GV_START_REQUESTED__?: boolean;
    __GV_CANVAS_READY__?: boolean;
    __GV_ON_CANVAS_READY__?: () => void;
  }
}

const root = () => document.getElementById("gv-app") as HTMLElement | null;
const inGame = () => document.getElementById("gv-in-game") as HTMLElement | null;
const panel = () => document.getElementById("gv-panel") as HTMLElement | null;
const tutorialEl = () => document.getElementById("gv-tutorial") as HTMLElement | null;
const toastEl = () => document.getElementById("gv-toast") as HTMLElement | null;

let view: View = "title";
let modal: ModalState = null;
let creatorSlot = 0;
let draftName = "";
let draftAppearance: CharacterAppearance = defaultAppearance();
let previewDirection: PreviewDirection = "south";
let previewAnimation: PreviewAnimation = "idle";
let creatorError = "";
let cutsceneIndex = 0;
let cutsceneCharacterId = "";
let gameLaunching = false;
let pointerStart: { x: number; y: number } | null = null;

function defaultAppearance(): CharacterAppearance {
  return {
    gender: "female",
    hairStyle: creation.hairStyles[0]?.id ?? "crop",
    hairColor: creation.hairColors[0]?.id ?? "coal",
    skinColor: creation.skinColors[1]?.id ?? "warm",
    outfit: creation.outfits[0]?.id ?? "field",
  };
}

function option<T extends { id: string }>(values: readonly T[], id: string): T {
  return values.find((value) => value.id === id) ?? values[0]!;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function soundEnabled(): boolean {
  try {
    return localStorage.getItem("greenvale.sound") !== "0";
  } catch {
    return true;
  }
}

function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("greenvale.sound", enabled ? "1" : "0");
  } catch {
    // iOS storage restrictions: keep session usable.
  }
  gameEvents.emit("audio:enabled", { enabled });
}

function validateName(name: string, exceptCharacterId?: string): string {
  const value = name.trim();
  const min = Number(creation.nameRules.minLength) || 3;
  const max = Number(creation.nameRules.maxLength) || 12;
  if (value.length < min || value.length > max) return t("creator.error.length");

  const pattern = new RegExp(creation.nameRules.pattern, "u");
  if (!pattern.test(value)) return t("creator.error.charset");

  const lowered = value.toLocaleLowerCase();
  if (
    creation.nameRules.bannedWords.some((word) =>
      lowered.includes(String(word).toLocaleLowerCase()),
    )
  ) {
    return t("creator.error.banned");
  }

  if (isNameTaken(value, exceptCharacterId)) return t("creator.error.taken");
  return "";
}

function randomItem<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function randomizeName(): string {
  const locale = getLocale();
  return randomItem(locale === "th" ? creation.randomNames.th : creation.randomNames.en);
}

function randomizeAppearance(): CharacterAppearance {
  return {
    gender: randomItem(creation.genders).id as CharacterAppearance["gender"],
    hairStyle: randomItem(creation.hairStyles).id,
    hairColor: randomItem(creation.hairColors).id,
    skinColor: randomItem(creation.skinColors).id,
    outfit: randomItem(creation.outfits).id,
  };
}

function avatar(character: Pick<CharacterSave, "appearance" | "costumeId"> | { appearance: CharacterAppearance; costumeId?: string }, size = "large"): string {
  const appearance = character.appearance;
  const hairColor = option(creation.hairColors, appearance.hairColor);
  const skin = option(creation.skinColors, appearance.skinColor);
  const outfit = option(creation.outfits, appearance.outfit);
  const costume = classesConfig.costumes.find((entry) => entry.id === character.costumeId);
  const bodyColor = costume?.overlay?.body || outfit.color;
  const accentColor = costume?.overlay?.accent || outfit.accent;
  return `
    <div class="gv-avatar gv-avatar--${size} gv-hair--${escapeHtml(appearance.hairStyle)}"
      data-gender="${escapeHtml(appearance.gender)}"
      data-direction="${previewDirection}"
      data-animation="${previewAnimation}"
      style="--gv-hair:${hairColor.hex};--gv-skin:${skin.hex};--gv-outfit:${bodyColor};--gv-accent:${accentColor}">
      <div class="gv-avatar-shadow"></div>
      <div class="gv-avatar-body">
        <span class="gv-avatar-leg gv-avatar-leg-a"></span>
        <span class="gv-avatar-leg gv-avatar-leg-b"></span>
        <span class="gv-avatar-torso"></span>
        <span class="gv-avatar-arm gv-avatar-arm-a"></span>
        <span class="gv-avatar-arm gv-avatar-arm-b"></span>
        <span class="gv-avatar-head"></span>
        <span class="gv-avatar-hair"></span>
        <span class="gv-avatar-face"></span>
        <span class="gv-avatar-weapon"></span>
      </div>
    </div>`;
}

function renderTitle(): string {
  return `
    <section class="gv-screen gv-title-screen">
      <div class="gv-title-weather" aria-hidden="true"></div>
      <div class="gv-title-card">
        <div class="gv-brand-mark" aria-hidden="true"><span>G</span></div>
        <div class="gv-eyebrow">${escapeHtml(t("title.kicker"))}</div>
        <h1 class="gv-logo">GREENVALE <small>AFTERFALL</small></h1>
        <p class="gv-lead">${escapeHtml(t("title.tagline"))}</p>
        <button class="gv-primary" id="gv-play" data-action="guest">${escapeHtml(t("title.playGuest"))}</button>
        <button class="gv-secondary" id="gv-login" data-action="login">${escapeHtml(t("title.login"))}</button>
        <div class="gv-title-actions">
          <button class="gv-chip" data-action="language" data-locale-target="${getLocale() === "th" ? "en" : "th"}">🌐 ${escapeHtml(t("title.language"))}: ${getLocale().toUpperCase()}</button>
          <button class="gv-chip" data-action="sound" data-sound-target="${soundEnabled() ? "0" : "1"}">${soundEnabled() ? "🔊" : "🔇"} ${escapeHtml(t(soundEnabled() ? "title.soundOn" : "title.soundOff"))}</button>
        </div>
        <p class="gv-note">${escapeHtml(t("title.guestNote"))}</p>
        <div class="gv-version">${escapeHtml(t("title.version", { version: buildInfo.version }))} · ${escapeHtml(buildInfo.id)}</div>
      </div>
    </section>`;
}

function renderSlots(): string {
  const characters = listCharacters();
  const cards = characters
    .map((character, slot) => {
      if (!character) {
        return `
          <article class="gv-slot gv-slot--empty">
            <div class="gv-slot-number">0${slot + 1}</div>
            <div class="gv-slot-empty-icon">＋</div>
            <strong>${escapeHtml(t("slots.empty"))}</strong>
            <button class="gv-primary gv-small-btn" data-action="create-slot" data-slot="${slot}">${escapeHtml(t("slots.create"))}</button>
          </article>`;
      }
      return `
        <article class="gv-slot">
          <div class="gv-slot-number">0${slot + 1}</div>
          <div class="gv-slot-avatar">${avatar(character, "small")}</div>
          <div class="gv-slot-info">
            <h3>${escapeHtml(character.name)}</h3>
            <p>${escapeHtml(t((getClassConfig(character.classId) as any).nameKey))}</p>
            <div class="gv-meta-row"><span>${escapeHtml(t("slots.level", { level: character.baseLevel }))}</span><span>${escapeHtml(t("slots.job", { level: character.jobLevel }))}</span></div>
            <div class="gv-muted">${escapeHtml(t("slots.freeRename", { count: character.renameCredits }))}</div>
          </div>
          <button class="gv-primary gv-small-btn" data-action="enter-character" data-character="${character.id}">${escapeHtml(t("slots.enter"))}</button>
          <div class="gv-inline-actions">
            <button class="gv-link" data-action="rename-character" data-character="${character.id}" ${character.renameCredits <= 0 ? "disabled" : ""}>${escapeHtml(t("slots.rename"))}</button>
            <button class="gv-link gv-danger" data-action="delete-character" data-character="${character.id}">${escapeHtml(t("slots.delete"))}</button>
          </div>
        </article>`;
    })
    .join("");

  return `
    <section class="gv-screen gv-panel-screen">
      <div class="gv-wide-card">
        <header class="gv-screen-header">
          <button class="gv-back" data-action="title">‹ ${escapeHtml(t("common.back"))}</button>
          <div><div class="gv-eyebrow">GREENVALE · GUEST</div><h2>${escapeHtml(t("slots.title"))}</h2><p>${escapeHtml(t("slots.subtitle"))}</p></div>
          <button class="gv-chip" data-action="language" data-locale-target="${getLocale() === "th" ? "en" : "th"}">🌐 ${getLocale().toUpperCase()}</button>
        </header>
        <div class="gv-slots">${cards}</div>
      </div>
    </section>`;
}

function optionButtons(
  labelKey: string,
  values: readonly { id: string; nameKey?: string; hex?: string; color?: string }[],
  selected: string,
  field: keyof CharacterAppearance,
): string {
  return `
    <div class="gv-field-group">
      <label>${escapeHtml(t(labelKey))}</label>
      <div class="gv-option-grid">
        ${values
          .map((item) => {
            const swatch = item.hex || item.color;
            return `<button type="button" class="gv-option ${item.id === selected ? "active" : ""}" data-action="appearance" data-field="${field}" data-value="${item.id}" title="${escapeHtml(item.nameKey ? t(item.nameKey) : item.id)}">
              ${swatch ? `<span class="gv-swatch" style="--swatch:${swatch}"></span>` : ""}
              <span>${escapeHtml(item.nameKey ? t(item.nameKey) : item.id)}</span>
            </button>`;
          })
          .join("")}
      </div>
    </div>`;
}

function renderCreator(): string {
  const previewCharacter = { appearance: draftAppearance };
  return `
    <section class="gv-screen gv-panel-screen">
      <div class="gv-wide-card gv-creator-layout">
        <header class="gv-screen-header gv-creator-header">
          <button class="gv-back" data-action="slots">‹ ${escapeHtml(t("common.back"))}</button>
          <div><div class="gv-eyebrow">CHARACTER · SLOT 0${creatorSlot + 1}</div><h2>${escapeHtml(t("creator.title"))}</h2></div>
          <button class="gv-chip" data-action="random-all">⟳ ${escapeHtml(t("creator.randomAll"))}</button>
        </header>

        <div class="gv-preview-pane">
          <h3>${escapeHtml(t("creator.preview"))}</h3>
          <div class="gv-preview-stage">${avatar(previewCharacter, "large")}</div>
          <div class="gv-preview-controls">
            <button class="gv-chip" data-action="rotate">↻ ${escapeHtml(t("creator.direction"))}: ${escapeHtml(t(`preview.dir.${previewDirection}`))}</button>
            <button class="gv-chip" data-action="animation">▶ ${escapeHtml(t("creator.animation"))}: ${escapeHtml(t(`preview.anim.${previewAnimation}`))}</button>
          </div>
          <div class="gv-novice-card">
            <div class="gv-eyebrow">${escapeHtml(t("creator.classTitle"))}</div>
            <strong>${escapeHtml(t("class.novice.name"))}</strong>
            <p>${escapeHtml(t("creator.noviceOnly"))}</p>
            <button class="gv-secondary gv-small-btn" data-action="career">${escapeHtml(t("creator.careerGuide"))}</button>
          </div>
        </div>

        <form class="gv-creator-form" id="gv-creator-form">
          <div class="gv-field-group">
            <label for="gv-name">${escapeHtml(t("creator.nameLabel"))}</label>
            <div class="gv-name-row">
              <input id="gv-name" class="gv-input" maxlength="${creation.nameRules.maxLength}" value="${escapeHtml(draftName)}" autocomplete="off" inputmode="text" />
              <button type="button" class="gv-secondary gv-random-name" data-action="random-name">🎲 ${escapeHtml(t("creator.randomName"))}</button>
            </div>
            <small>${escapeHtml(t("creator.nameHint"))}</small>
            <div id="gv-name-error" class="gv-error">${escapeHtml(creatorError)}</div>
          </div>
          ${optionButtons("creator.gender", creation.genders, draftAppearance.gender, "gender")}
          ${optionButtons("creator.hair", creation.hairStyles, draftAppearance.hairStyle, "hairStyle")}
          ${optionButtons("creator.hairColor", creation.hairColors, draftAppearance.hairColor, "hairColor")}
          ${optionButtons("creator.skin", creation.skinColors, draftAppearance.skinColor, "skinColor")}
          ${optionButtons("creator.outfit", creation.outfits, draftAppearance.outfit, "outfit")}
          <button class="gv-primary" id="gv-create-character" type="submit">${escapeHtml(t("creator.create"))}</button>
        </form>
      </div>
    </section>`;
}

function renderCareer(): string {
  const careers = classesConfig.classes.filter((item) => item.id !== "novice");
  return `
    <section class="gv-screen gv-panel-screen">
      <div class="gv-wide-card">
        <header class="gv-screen-header">
          <button class="gv-back" data-action="creator">‹ ${escapeHtml(t("common.back"))}</button>
          <div><div class="gv-eyebrow">JOB LV 10 · PREVIEW</div><h2>${escapeHtml(t("career.title"))}</h2></div>
        </header>
        <div class="gv-career-grid">
          ${careers
            .map(
              (career) => `
            <article class="gv-career-card">
              <div class="gv-career-fx gv-career-fx--${escapeHtml((career as any).previewFx || "pulse")}"><i></i><i></i><i></i></div>
              <h3>${escapeHtml(t(career.nameKey))}</h3>
              <p>${escapeHtml(t(career.descriptionKey))}</p>
              <dl>
                <div><dt>${escapeHtml(t("career.role"))}</dt><dd>${escapeHtml(t(`role.${career.role}`))}</dd></div>
                <div><dt>${escapeHtml(t("career.difficulty"))}</dt><dd>${"◆".repeat(Number(career.difficulty) || 1)}${"◇".repeat(Math.max(0, 5 - (Number(career.difficulty) || 1)))}</dd></div>
                <div><dt>${escapeHtml(t("career.recommended"))}</dt><dd>${escapeHtml(((career as any).recommendedStats || []).join(" · "))}</dd></div>
              </dl>
              <div class="gv-fx-label">${escapeHtml(t("career.skillPreview"))}</div>
            </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

function renderCutscene(): string {
  const frame = cutscene.frames[Math.min(cutsceneIndex, cutscene.frames.length - 1)]!;
  const isLast = cutsceneIndex >= cutscene.frames.length - 1;
  return `
    <section class="gv-screen gv-cutscene gv-cutscene--${escapeHtml(frame.tone)}">
      <div class="gv-cutscene-art" aria-hidden="true"><span></span><span></span><span></span></div>
      <button class="gv-chip gv-cutscene-skip" data-action="skip-cutscene">${escapeHtml(t("cutscene.skip"))}</button>
      <article class="gv-cutscene-card">
        <div class="gv-cutscene-count">${cutsceneIndex + 1} / ${cutscene.frames.length}</div>
        <h2>${escapeHtml(t(frame.titleKey))}</h2>
        <p>${escapeHtml(t(frame.textKey))}</p>
        <div class="gv-cutscene-dots">${cutscene.frames.map((_item, index) => `<i class="${index === cutsceneIndex ? "active" : ""}"></i>`).join("")}</div>
        <button class="gv-primary" data-action="${isLast ? "finish-cutscene" : "next-cutscene"}">${escapeHtml(t(isLast ? "cutscene.enter" : "cutscene.next"))}</button>
      </article>
    </section>`;
}

function renderLoading(): string {
  return `
    <section class="gv-screen gv-loading-screen">
      <div class="gv-loader"></div>
      <div class="gv-eyebrow">GREENVALE AFTERFALL</div>
      <h2>${escapeHtml(t("cutscene.enter"))}</h2>
    </section>`;
}

function renderModal(): string {
  if (!modal) return "";
  if (modal.kind === "login") {
    return `
      <div class="gv-modal-backdrop">
        <div class="gv-modal">
          <h3>${escapeHtml(t("account.title"))}</h3>
          <p>${escapeHtml(t("account.body"))}</p>
          <button class="gv-primary" data-action="close-modal">${escapeHtml(t("common.close"))}</button>
        </div>
      </div>`;
  }

  const character = findCharacter(modal.characterId);
  if (!character) return "";
  const deleting = modal.kind === "delete";
  return `
    <div class="gv-modal-backdrop">
      <div class="gv-modal">
        <h3>${escapeHtml(t(deleting ? "slots.deleteTitle" : "slots.renameTitle"))}</h3>
        <p>${escapeHtml(t(deleting ? "slots.deleteBody" : "slots.renameBody", { name: character.name }))}</p>
        <input id="gv-modal-input" class="gv-input" value="" maxlength="${creation.nameRules.maxLength}" autocomplete="off" />
        <div id="gv-modal-error" class="gv-error"></div>
        <div class="gv-modal-actions">
          <button class="gv-secondary" data-action="close-modal">${escapeHtml(t("common.cancel"))}</button>
          <button class="gv-primary ${deleting ? "gv-danger-solid" : ""}" data-action="${deleting ? "confirm-delete" : "confirm-rename"}" data-character="${character.id}">${escapeHtml(t("common.confirm"))}</button>
        </div>
      </div>
    </div>`;
}

function render(): void {
  const host = root();
  if (!host) return;
  host.hidden = false;
  host.innerHTML =
    (view === "title"
      ? renderTitle()
      : view === "slots"
        ? renderSlots()
        : view === "creator"
          ? renderCreator()
          : view === "career"
            ? renderCareer()
            : view === "cutscene"
              ? renderCutscene()
              : renderLoading()) + renderModal();

  localizeErrorOverlay();

  host.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    element.addEventListener("click", (event) => onRootClick(event as MouseEvent));
  });

  const nameInput = document.getElementById("gv-name") as HTMLInputElement | null;
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      draftName = nameInput.value;
      creatorError = "";
      const error = document.getElementById("gv-name-error");
      if (error) error.textContent = "";
    });
  }

  const form = document.getElementById("gv-creator-form") as HTMLFormElement | null;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitCreator();
  });
}

function localizeErrorOverlay(): void {
  const title = document.getElementById("runtime-error-title");
  const copy = document.getElementById("runtime-error-copy");
  const close = document.getElementById("runtime-error-close");
  if (title) title.textContent = t("error.runtimeTitle");
  if (copy) copy.textContent = t("common.copyError");
  if (close) close.textContent = t("common.close");
}

function submitCreator(): void {
  const error = validateName(draftName);
  if (error) {
    creatorError = error;
    const node = document.getElementById("gv-name-error");
    if (node) node.textContent = creatorError;
    return;
  }

  const character = createCharacter(creatorSlot, draftName.trim(), draftAppearance);
  selectCharacter(character.id);
  cutsceneCharacterId = character.id;
  cutsceneIndex = 0;
  view = "cutscene";
  render();
}

function openCreator(slot: number): void {
  creatorSlot = slot;
  draftName = randomizeName();
  draftAppearance = defaultAppearance();
  previewDirection = "south";
  previewAnimation = "idle";
  creatorError = "";
  view = "creator";
  render();
}

function enterCharacter(id: string): void {
  const character = selectCharacter(id);
  if (!character.cutsceneSeen) {
    cutsceneCharacterId = character.id;
    cutsceneIndex = 0;
    view = "cutscene";
    render();
    return;
  }
  launchGame();
}

function finishCutscene(): void {
  if (cutsceneCharacterId) {
    updateCharacter(cutsceneCharacterId, (character) => {
      character.cutsceneSeen = true;
      return character;
    });
    selectCharacter(cutsceneCharacterId);
  }
  launchGame();
}

function launchGame(): void {
  if (gameLaunching) return;
  gameLaunching = true;
  view = "loading";
  render();
  window.__GV_START_REQUESTED__ = true;
  window.dispatchEvent(new Event("greenvale:start"));
}

function showToast(message: string): void {
  const el = toastEl();
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  window.setTimeout(() => {
    el.hidden = true;
  }, 1800);
}

function updateQuestTracker(): void {
  const quest = document.getElementById("gv-quest");
  const profile = (() => {
    try {
      return JSON.parse(localStorage.getItem("greenvale.profile.v1") || "null");
    } catch {
      return null;
    }
  })();
  if (!quest) return;
  quest.textContent =
    profile?.completed === true
      ? t("quest.complete")
      : t("quest.tracker", { kills: Math.min(3, Math.max(0, Number(profile?.kills) || 0)) });
}

function renderInGameShell(): void {
  const selected = getSelectedCharacter();
  updateQuestTracker();

  const menuTitle = document.getElementById("gv-panel-title");
  const menuProfile = document.getElementById("gv-panel-profile");
  const characterButton = document.getElementById("gv-character-btn");
  const skillButton = document.getElementById("gv-skill-btn");
  const combatButton = document.getElementById("gv-combat-btn");
  const resume = document.getElementById("gv-resume");
  const returnTitle = document.getElementById("gv-title-btn");
  if (menuTitle) menuTitle.textContent = t("menu.title");
  if (menuProfile) {
    const className = selected ? t((getClassConfig(selected.classId) as any).nameKey) : "";
    menuProfile.textContent = selected ? `${selected.name} · ${className} · Base ${selected.baseLevel} / Job ${selected.jobLevel}` : "";
  }
  if (characterButton) characterButton.textContent = t("menu.character");
  if (skillButton) skillButton.textContent = t("menu.skills");
  if (combatButton) combatButton.textContent = t("menu.combat");
  if (resume) resume.textContent = t("menu.resume");
  if (returnTitle) returnTitle.textContent = t("menu.returnTitle");
}

function tutorialStep(character: CharacterSave): number {
  return Math.min(4, Math.max(0, character.tutorial.step));
}

function renderTutorial(): void {
  const host = tutorialEl();
  const character = getSelectedCharacter();
  if (!host || !character || character.tutorial.completed) {
    if (host) host.hidden = true;
    return;
  }

  const step = tutorialStep(character);
  const keys = ["tutorial.walk", "tutorial.attack", "tutorial.potion", "tutorial.quest"];
  host.hidden = false;
  host.innerHTML = `
    <div class="gv-tutorial-card">
      <div class="gv-tutorial-top"><strong>${escapeHtml(t("tutorial.title"))}</strong><span>${escapeHtml(t("tutorial.progress", { step: step + 1 }))}</span></div>
      <p>${escapeHtml(t(keys[step]!))}</p>
      <div class="gv-tutorial-meter"><i style="width:${(step / 4) * 100}%"></i></div>
      ${step === 2 ? `<button class="gv-primary gv-small-btn" data-tutorial-action="potion">${escapeHtml(t("tutorial.usePotion"))}</button>` : ""}
    </div>`;

  const potionButton = host.querySelector("[data-tutorial-action='potion']") as HTMLButtonElement | null;
  potionButton?.addEventListener("click", () => {
    const current = getSelectedCharacter();
    if (!current || tutorialStep(current) !== 2) return;
    updateCharacter(current.id, (draft) => {
      draft.tutorial.trainingPotionUsed = true;
      draft.tutorial.step = 3;
      return draft;
    });
    showToast(t("toast.potion"));
    renderTutorial();
  });
}

function advanceTutorial(expected: number): void {
  const character = getSelectedCharacter();
  if (!character || character.tutorial.completed || tutorialStep(character) !== expected) return;

  updateCharacter(character.id, (draft) => {
    const next = expected + 1;
    draft.tutorial.step = next;
    if (next >= 4) draft.tutorial.completed = true;
    return draft;
  });

  if (expected >= 3) {
    const host = tutorialEl();
    if (host) {
      host.hidden = false;
      host.innerHTML = `<div class="gv-tutorial-card gv-tutorial-done"><strong>✓ ${escapeHtml(t("tutorial.done"))}</strong></div>`;
      setTimeout(() => {
        if (host) host.hidden = true;
      }, 1800);
    }
  } else {
    renderTutorial();
  }
}

function bindGameTutorialGestureTracking(): void {
  window.addEventListener(
    "pointerdown",
    (event) => {
      const character = getSelectedCharacter();
      if (!character || character.tutorial.completed) return;
      const step = tutorialStep(character);
      if (step === 0 && event.clientX < innerWidth * 0.48 && event.clientY > innerHeight * 0.5) {
        pointerStart = { x: event.clientX, y: event.clientY };
      } else if (step === 1 && event.clientX > innerWidth * 0.58 && event.clientY > innerHeight * 0.5) {
        advanceTutorial(1);
      }
    },
    { passive: true },
  );

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      if (Math.hypot(dx, dy) >= 18) {
        pointerStart = null;
        advanceTutorial(0);
      }
    },
    { passive: true },
  );
  window.addEventListener("pointerup", () => {
    pointerStart = null;
  }, { passive: true });
}

function onCanvasReady(): void {
  const host = root();
  if (host) host.hidden = true;
  const hud = inGame();
  if (hud) hud.hidden = false;
  renderInGameShell();
  renderTutorial();
  gameEvents.emit("onboarding:entered-world", { characterId: getSelectedCharacter()?.id ?? null });
}

function onRootClick(event: MouseEvent): void {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  event.preventDefault();
  event.stopImmediatePropagation();

  if (action === "guest") {
    view = "slots";
    render();
    return;
  }
  if (action === "login") {
    modal = { kind: "login" };
    render();
    return;
  }
  if (action === "close-modal") {
    modal = null;
    render();
    return;
  }
  if (action === "title") {
    view = "title";
    render();
    return;
  }
  if (action === "slots") {
    view = "slots";
    render();
    return;
  }
  if (action === "creator") {
    view = "creator";
    render();
    return;
  }
  if (action === "career") {
    view = "career";
    render();
    return;
  }
  if (action === "language") {
    const requested = target.dataset.localeTarget;
    const next: Locale = requested === "en" ? "en" : "th";
    setLocale(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.location.replace(url.toString());
    return;
  }
  if (action === "sound") {
    setSoundEnabled(target.dataset.soundTarget === "1");
    render();
    return;
  }
  if (action === "create-slot") {
    openCreator(Number(target.dataset.slot) || 0);
    return;
  }
  if (action === "enter-character") {
    enterCharacter(String(target.dataset.character || ""));
    return;
  }
  if (action === "rename-character") {
    modal = { kind: "rename", characterId: String(target.dataset.character || "") };
    render();
    return;
  }
  if (action === "delete-character") {
    modal = { kind: "delete", characterId: String(target.dataset.character || "") };
    render();
    return;
  }
  if (action === "confirm-rename") {
    const id = String(target.dataset.character || "");
    const input = document.getElementById("gv-modal-input") as HTMLInputElement | null;
    const value = input?.value.trim() || "";
    const error = validateName(value, id);
    if (error) {
      const node = document.getElementById("gv-modal-error");
      if (node) node.textContent = error;
      return;
    }
    renameCharacter(id, value);
    modal = null;
    render();
    showToast(t("toast.renameDone"));
    return;
  }
  if (action === "confirm-delete") {
    const id = String(target.dataset.character || "");
    const character = findCharacter(id);
    const input = document.getElementById("gv-modal-input") as HTMLInputElement | null;
    if (!character || input?.value.trim() !== character.name) {
      const node = document.getElementById("gv-modal-error");
      if (node) node.textContent = t("slots.deleteBody", { name: character?.name || "" });
      return;
    }
    deleteCharacter(id);
    modal = null;
    render();
    showToast(t("toast.deleteDone"));
    return;
  }
  if (action === "random-name") {
    draftName = randomizeName();
    creatorError = "";
    render();
    return;
  }
  if (action === "random-all") {
    draftAppearance = randomizeAppearance();
    draftName = randomizeName();
    creatorError = "";
    render();
    return;
  }
  if (action === "appearance") {
    const field = target.dataset.field as keyof CharacterAppearance;
    const value = String(target.dataset.value || "");
    (draftAppearance as any)[field] = value;
    render();
    return;
  }
  if (action === "rotate") {
    const directions = creation.directions as PreviewDirection[];
    const index = directions.indexOf(previewDirection);
    previewDirection = directions[(index + 1) % directions.length]!;
    render();
    return;
  }
  if (action === "animation") {
    const animations = creation.previewAnimations as PreviewAnimation[];
    const index = animations.indexOf(previewAnimation);
    previewAnimation = animations[(index + 1) % animations.length]!;
    render();
    return;
  }
  if (action === "next-cutscene") {
    cutsceneIndex = Math.min(cutscene.frames.length - 1, cutsceneIndex + 1);
    render();
    return;
  }
  if (action === "skip-cutscene" || action === "finish-cutscene") {
    finishCutscene();
  }
}

export function initOnboarding(): void {
  loadSave();
  const host = root();
  if (!host) throw new Error("#gv-app is missing");
  if (host.dataset.gvOnboardingBound === "1") return;
  host.dataset.gvOnboardingBound = "1";

  // Bind action buttons after each render. Direct handlers are more reliable on
  // iPhone/WebKit than delegating all title-screen taps through a replaced root.
  window.__GV_ON_CANVAS_READY__ = onCanvasReady;
  window.addEventListener("greenvale:progress", () => {
    syncSelectedFromLegacy();
    updateQuestTracker();
  });
  window.addEventListener("greenvale:character-updated", renderInGameShell);

  document.getElementById("gv-menu-btn")?.addEventListener("click", () => {
    renderInGameShell();
    const el = panel();
    if (el) el.hidden = false;
  });
  document.getElementById("gv-resume")?.addEventListener("click", () => {
    const el = panel();
    if (el) el.hidden = true;
  });
  document.getElementById("gv-title-btn")?.addEventListener("click", () => location.reload());
  document.getElementById("gv-quest")?.addEventListener("click", () => advanceTutorial(3));

  bindGameTutorialGestureTracking();
  gameEvents.on("i18n:changed", () => {
    localizeErrorOverlay();
    renderInGameShell();
  });
  render();
}
