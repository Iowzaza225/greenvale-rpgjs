import effectsData from "../data/effects.json";

export type EffectElement = "neutral" | "fire" | "water" | "wind" | "earth" | "light" | "dark";

export type CombatEffectPreset = {
  kind: string;
  durationMs: number;
  particles: number;
  scale: number;
};

export type AudioCue = {
  wave: OscillatorType;
  frequency: number;
  endFrequency: number;
  durationMs: number;
  gain: number;
};

export type EnvironmentPhase = {
  id: "day" | "dusk" | "night" | string;
  start: number;
  end: number;
  overlay: string;
};

const runtime = (effectsData as any).runtime || {};

export function effectRuntime() {
  return runtime;
}

export function combatEffect(name: string): CombatEffectPreset {
  return runtime.combat?.[name] || {
    kind: name,
    durationMs: 420,
    particles: 5,
    scale: 1,
  };
}

export function elementPalette(element: string | undefined) {
  return runtime.elements?.[element || "neutral"] || runtime.elements?.neutral || {
    primary: "#e6d7b1",
    secondary: "#8fa398",
  };
}

export function audioCue(name: string): AudioCue | null {
  return runtime.audio?.cues?.[name] || null;
}

export function audioMasterGain(): number {
  return Math.max(0, Math.min(1, Number(runtime.audio?.masterGain) || 0));
}

export function audioEnabledByDefault(): boolean {
  return runtime.audio?.enabled !== false;
}

export function environmentConfig() {
  return runtime.environment || {};
}

export function environmentPhaseAt(progress: number): EnvironmentPhase {
  const phases = Array.isArray(runtime.environment?.phases) ? runtime.environment.phases : [];
  const normalized = ((Number(progress) % 1) + 1) % 1;
  return phases.find((phase: any) => normalized >= Number(phase.start) && normalized < Number(phase.end))
    || phases[0]
    || { id: "day", start: 0, end: 1, overlay: "rgba(0,0,0,0)" };
}
