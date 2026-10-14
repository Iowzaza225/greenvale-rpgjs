import { gameEvents } from "../core/event-bus";
import { t } from "../core/i18n";
import { openCharacterSystem } from "./character-system";
import { openSkillSystem } from "./skill-system";
import { openCombatSystem } from "./combat-system";
import "./desktop-controls.css";

let initialized = false;
const remappedKeys = new Set<string>();
const directions: Record<string, string> = {
  KeyW: "ArrowUp", KeyA: "ArrowLeft", KeyS: "ArrowDown", KeyD: "ArrowRight",
};
const modalIds = ["gv-world-map", "gv-character-system", "gv-skill-system", "gv-combat-system", "gv-panel"];

function visible(id: string): boolean {
  const el = document.getElementById(id);
  return Boolean(el && !el.hidden && getComputedStyle(el).display !== "none");
}

function inputFocused(): boolean {
  const element = document.activeElement as HTMLElement | null;
  return !!element && (["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) || element.isContentEditable);
}

function ready(): boolean {
  return Boolean(window.__GV_CANVAS_READY__ && !document.getElementById("gv-app")?.offsetParent);
}

function busy(): boolean {
  return modalIds.some(visible) || visible("gv-tutorial") || visible("gv-death-overlay");
}

function sendKey(type: "keydown" | "keyup", code: string): void {
  const key = code.replace(/^Arrow/, "Arrow");
  const event = new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true });
  Object.defineProperty(event, "gvSynthetic", { value: true });
  window.dispatchEvent(event);
  document.dispatchEvent(event);
}

function closeOverlays(): boolean {
  for (const id of modalIds) {
    if (!visible(id)) continue;
    const el = document.getElementById(id);
    if (el) el.hidden = true;
    return true;
  }
  return false;
}

function openMenu(): void {
  const button = document.getElementById("gv-menu-btn") as HTMLButtonElement | null;
  button?.click();
}

function updateDevice(): void {
  const desktop = matchMedia("(pointer: fine) and (min-width: 800px)").matches;
  document.body.dataset.gvDevice = desktop ? "desktop" : "touch";
  const help = document.getElementById("gv-desktop-help");
  if (help) help.hidden = !desktop || !ready();
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // The browser may disable fullscreen, including embedded previews.
  }
}

function onKey(event: KeyboardEvent): void {
  if ((event as any).gvSynthetic || event.metaKey || event.ctrlKey || event.altKey) return;
  if (!ready()) return;
  if (event.code === "Escape") {
    if (closeOverlays()) { event.preventDefault(); event.stopPropagation(); }
    return;
  }
  if (inputFocused() || busy()) return;

  if (directions[event.code]) {
    if (event.type === "keydown") {
      if (remappedKeys.has(event.code)) return;
      remappedKeys.add(event.code);
    } else remappedKeys.delete(event.code);
    sendKey(event.type as "keydown" | "keyup", directions[event.code]);
    event.preventDefault();
    return;
  }

  if (event.type !== "keydown" || event.repeat) return;
  const digit = /^Digit([0-9])$/.exec(event.code);
  if (digit) {
    const slot = digit[1] === "0" ? 9 : Number(digit[1]) - 1;
    window.dispatchEvent(new CustomEvent("greenvale:hotbar-use", { detail: { slot } }));
    event.preventDefault();
    return;
  }

  if (event.code === "Space" || event.code === "KeyJ") {
    window.dispatchEvent(new Event("greenvale:basic-attack"));
  } else if (event.code === "KeyQ" || event.code === "Tab") {
    window.dispatchEvent(new Event("greenvale:target-cycle"));
  } else if (event.code === "KeyK") {
    openSkillSystem("tree");
  } else if (event.code === "KeyC") {
    openCharacterSystem("stats");
  } else if (event.code === "KeyB") {
    openCombatSystem();
  } else if (event.code === "KeyM") {
    window.dispatchEvent(new Event("greenvale:world-map-open"));
  } else if (event.code === "KeyI") {
    openMenu();
  } else if (event.code === "KeyF") {
    void toggleFullscreen();
  } else if (event.code === "KeyE") {
    sendKey("keydown", "Enter");
    sendKey("keyup", "Enter");
  } else return;
  event.preventDefault();
  event.stopPropagation();
}

export function initDesktopControls(): void {
  if (initialized) return;
  initialized = true;
  window.addEventListener("keydown", onKey, { capture: true });
  window.addEventListener("keyup", onKey, { capture: true });
  window.addEventListener("blur", () => {
    for (const code of remappedKeys) sendKey("keyup", directions[code]);
    remappedKeys.clear();
  });
  window.addEventListener("resize", updateDevice);
  gameEvents.on("game:canvas-ready", updateDevice);
  updateDevice();
  document.getElementById("gv-fullscreen-btn")?.addEventListener("click", () => void toggleFullscreen());
  document.getElementById("gv-controls-btn")?.addEventListener("click", () => {
    const help = document.getElementById("gv-desktop-help-detail");
    if (help) help.hidden = !help.hidden;
  });
  document.getElementById("gv-help-close")?.addEventListener("click", () => {
    const help = document.getElementById("gv-desktop-help-detail");
    if (help) help.hidden = true;
  });
}
