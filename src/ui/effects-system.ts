import skillsData from "../data/skills.json";
import { gameEvents } from "../core/event-bus";
import {
  audioCue,
  audioEnabledByDefault,
  audioMasterGain,
  combatEffect,
  elementPalette,
  environmentConfig,
  environmentPhaseAt,
} from "../core/effects";
import "./effects-system.css";

type FxDetail = {
  kind?: string;
  element?: string;
  direction?: "incoming" | "outgoing";
  outcome?: string;
  durationMs?: number;
  particles?: number;
  scale?: number;
};

let initialized = false;
let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let environmentTimer = 0;
let rainStartTimer = 0;
let rainStopTimer = 0;
let rainRepeatTimer = 0;
let environmentStartedAt = 0;
let forcedEnvironmentPhase: string | null = null;
let forcedRain: boolean | null = null;

function isReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function ensureShell() {
  let effects = document.getElementById("gv-effects-layer");
  if (!effects) {
    effects = document.createElement("div");
    effects.id = "gv-effects-layer";
    effects.hidden = true;
    effects.setAttribute("aria-hidden", "true");
    document.body.appendChild(effects);
  }

  let environment = document.getElementById("gv-environment-layer");
  if (!environment) {
    environment = document.createElement("div");
    environment.id = "gv-environment-layer";
    environment.hidden = true;
    environment.setAttribute("aria-hidden", "true");
    environment.innerHTML = '<div class="gv6-light"></div><div class="gv6-rain"></div><div class="gv6-vignette"></div>';
    document.body.appendChild(environment);
  }

  return { effects, environment };
}

function setCssVar(node: HTMLElement, key: string, value: string) {
  node.style.setProperty(key, value);
}

function burst(detail: FxDetail) {
  const { effects } = ensureShell();
  const preset = combatEffect(detail.kind || "basicHit");
  const palette = elementPalette(detail.element);
  const node = document.createElement("div");
  const duration = Math.max(160, Number(detail.durationMs) || Number(preset.durationMs) || 420);
  const particleCount = Math.max(1, Math.min(18, Number(detail.particles) || Number(preset.particles) || 5));
  const scale = Math.max(.5, Math.min(2, Number(detail.scale) || Number(preset.scale) || 1));
  const direction = detail.direction || "outgoing";

  node.className = `gv6-fx gv6-fx--${preset.kind || detail.kind || "basicHit"} gv6-fx--${direction}`;
  node.dataset.kind = detail.kind || "basicHit";
  node.dataset.element = detail.element || "neutral";
  node.dataset.outcome = detail.outcome || "";
  setCssVar(node, "--gv6-primary", String(palette.primary));
  setCssVar(node, "--gv6-secondary", String(palette.secondary));
  setCssVar(node, "--gv6-duration", duration + "ms");
  setCssVar(node, "--gv6-scale", String(scale));

  const core = document.createElement("i");
  core.className = "gv6-fx-core";
  node.appendChild(core);

  for (let index = 0; index < (isReducedMotion() ? Math.min(4, particleCount) : particleCount); index++) {
    const particle = document.createElement("b");
    particle.className = "gv6-particle";
    const angle = (360 / particleCount) * index + Math.random() * 18;
    const distance = 22 + Math.random() * 34;
    setCssVar(particle, "--gv6-angle", angle + "deg");
    setCssVar(particle, "--gv6-distance", distance + "px");
    setCssVar(particle, "--gv6-delay", Math.round(Math.random() * 55) + "ms");
    node.appendChild(particle);
  }

  effects.appendChild(node);
  effects.dataset.lastEffect = detail.kind || "basicHit";
  effects.dataset.lastElement = detail.element || "neutral";
  window.setTimeout(() => node.remove(), duration + 120);
}

function audioIsEnabled(): boolean {
  try {
    const stored = localStorage.getItem("greenvale.audio.v1");
    if (stored === "off") return false;
    if (stored === "on") return true;
  } catch {}
  return audioEnabledByDefault();
}

async function unlockAudio() {
  if (audioUnlocked || !audioIsEnabled()) return;
  try {
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === "suspended") await audioContext.resume();
    audioUnlocked = audioContext.state === "running";
    (window as any).__GV_AUDIO_UNLOCKED__ = audioUnlocked;
    const { effects } = ensureShell();
    effects.dataset.audioReady = audioUnlocked ? "true" : "false";
  } catch {
    audioUnlocked = false;
  }
}

function playCue(name: string) {
  const cue = audioCue(name);
  if (!cue || !audioUnlocked || !audioContext || !audioIsEnabled()) return;
  try {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const duration = Math.max(.035, Number(cue.durationMs) / 1000);
    const master = audioMasterGain();
    osc.type = cue.wave || "sine";
    osc.frequency.setValueAtTime(Math.max(30, Number(cue.frequency) || 180), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, Number(cue.endFrequency) || Number(cue.frequency) || 180), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, master * Math.max(.05, Number(cue.gain) || .2)), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + duration + .02);
    const { effects } = ensureShell();
    effects.dataset.lastAudio = name;
  } catch {}
}

function skillConfig(skillId: string) {
  return (skillsData.skills as any[]).find(skill => skill.id === skillId) || null;
}

function onCombatResult(detail: any) {
  const outcome = String(detail?.outcome || "hit");
  const direction = detail?.direction === "incoming" ? "incoming" : "outgoing";
  const element = String(detail?.element || "neutral");

  if (String(detail?.attackType) === "status") {
    burst({ kind: "status", element, direction, outcome });
    playCue("status");
    return;
  }

  if (outcome === "crit") {
    burst({ kind: "crit", element, direction, outcome });
    playCue("crit");
  } else if (outcome === "block") {
    burst({ kind: "block", element, direction, outcome });
    playCue("block");
  } else if (outcome === "perfect-dodge") {
    burst({ kind: "perfectDodge", element, direction, outcome });
    playCue("miss");
  } else if (outcome === "miss") {
    burst({ kind: "miss", element, direction, outcome });
    playCue("miss");
  } else {
    burst({ kind: "basicHit", element, direction, outcome });
    playCue(direction === "outgoing" ? "attack" : "hit");
  }
}

function onSkillResult(detail: any) {
  if (!detail?.ok) return;
  const skill = skillConfig(String(detail.skillId || ""));
  const element = String(skill?.element || "neutral");
  if (Number(detail.heal) > 0) {
    burst({ kind: "heal", element: "light", direction: "outgoing" });
    playCue("heal");
    return;
  }
  if (Number(detail.damage) > 0 || skill?.runtime?.kind === "damage" || skill?.runtime?.kind === "debuff") {
    burst({ kind: "crit", element, direction: "outgoing", scale: .9, particles: 8, durationMs: 480 });
    playCue("skill");
  }
}

function renderRain(active: boolean) {
  const { environment } = ensureShell();
  const rain = environment.querySelector(".gv6-rain") as HTMLElement | null;
  if (!rain) return;
  const config = environmentConfig().rain || {};
  environment.dataset.rain = active ? "true" : "false";
  rain.replaceChildren();
  if (!active) return;

  const count = isReducedMotion()
    ? Math.max(1, Number(config.reducedMotionDrops) || 6)
    : Math.max(1, Number(config.drops) || 24);

  setCssVar(rain, "--gv6-rain-opacity", String(Number(config.opacity) || .4));
  for (let index = 0; index < count; index++) {
    const drop = document.createElement("i");
    setCssVar(drop, "--gv6-left", (Math.random() * 100).toFixed(2) + "%");
    setCssVar(drop, "--gv6-rain-delay", (-Math.random() * 1.4).toFixed(2) + "s");
    setCssVar(drop, "--gv6-rain-speed", (.62 + Math.random() * .55).toFixed(2) + "s");
    setCssVar(drop, "--gv6-rain-length", (24 + Math.random() * 28).toFixed(0) + "px");
    rain.appendChild(drop);
  }
}

function applyEnvironment() {
  const { environment } = ensureShell();
  const config = environmentConfig();
  const cycleMs = Math.max(60_000, Number(config.cycleMs) || 240_000);
  const elapsed = Date.now() - environmentStartedAt + Math.max(0, Number(config.startOffsetMs) || 0);
  const progress = ((elapsed % cycleMs) + cycleMs) % cycleMs / cycleMs;
  const autoPhase = environmentPhaseAt(progress);
  const phase = forcedEnvironmentPhase
    ? ((config.phases || []).find((entry: any) => entry.id === forcedEnvironmentPhase) || autoPhase)
    : autoPhase;

  environment.dataset.phase = String(phase.id || "day");
  const light = environment.querySelector(".gv6-light") as HTMLElement | null;
  if (light) light.style.background = String(phase.overlay || "rgba(0,0,0,0)");

  if (forcedRain !== null) renderRain(forcedRain);
}

function scheduleRain() {
  const config = environmentConfig().rain || {};
  if (config.enabled === false) return;
  window.clearTimeout(rainStartTimer);
  window.clearTimeout(rainStopTimer);
  window.clearInterval(rainRepeatTimer);

  const duration = Math.max(3000, Number(config.durationMs) || 26000);
  const interval = Math.max(duration + 5000, Number(config.intervalMs) || 105000);
  const initial = Math.max(3000, Number(config.initialDelayMs) || 22000);
  const start = () => {
    if (forcedRain === null) renderRain(true);
    rainStopTimer = window.setTimeout(() => {
      if (forcedRain === null) renderRain(false);
    }, duration);
  };

  rainStartTimer = window.setTimeout(() => {
    start();
    rainRepeatTimer = window.setInterval(start, interval);
  }, initial);
}

function startEnvironment() {
  const { environment } = ensureShell();
  environment.hidden = false;
  environmentStartedAt = Date.now();
  window.clearInterval(environmentTimer);
  applyEnvironment();
  environmentTimer = window.setInterval(applyEnvironment, 1000);
  scheduleRain();
}

export function initEffectsSystem(): void {
  if (initialized) return;
  initialized = true;
  const { effects, environment } = ensureShell();

  const unlock = () => void unlockAudio();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchend", unlock, { passive: true });

  gameEvents.on("game:canvas-ready", () => {
    effects.hidden = false;
    environment.hidden = false;
    startEnvironment();
    (window as any).__GV_EFFECTS_READY__ = true;
  });

  window.addEventListener("greenvale:combat-result", event => onCombatResult((event as CustomEvent).detail || {}));
  window.addEventListener("greenvale:skill-result", event => onSkillResult((event as CustomEvent).detail || {}));
  window.addEventListener("greenvale:monster-defeated", () => {
    burst({ kind: "defeat", element: "earth", direction: "outgoing" });
    playCue("defeat");
  });
  window.addEventListener("greenvale:loot-drop", () => playCue("loot"));
  window.addEventListener("greenvale:player-respawn", () => burst({ kind: "heal", element: "light", direction: "incoming", scale: 1.3 }));

  window.addEventListener("greenvale:debug-effect", event => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const detail = (event as CustomEvent).detail || {};
    burst({
      kind: String(detail.kind || "crit"),
      element: String(detail.element || "fire"),
      direction: detail.direction === "incoming" ? "incoming" : "outgoing",
    });
    playCue(String(detail.audio || "crit"));
  });

  window.addEventListener("greenvale:debug-environment", event => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const detail = (event as CustomEvent).detail || {};
    forcedEnvironmentPhase = detail.phase ? String(detail.phase) : null;
    forcedRain = typeof detail.rain === "boolean" ? detail.rain : null;
    applyEnvironment();
  });
}
