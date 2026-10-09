import skillsData from "../data/skills.json";
import type { DerivedStats } from "./character";

export type LearnedSkills = Record<string, number>;
export type HotbarSlot = string | null;
export type AutoBattleSettings = {
  enabled: boolean;
  potionHpBelow: number;
  skillIds: string[];
};

export type SkillRecord = (typeof skillsData.skills)[number];

const skillMap = new Map(skillsData.skills.map((skill) => [skill.id, skill]));
const noviceStarters = ["survivor_strike", "field_first_aid", "camp_rest"];

export function getSkill(skillId: string): SkillRecord | null {
  return skillMap.get(skillId) ?? null;
}

export function getSkillsForClass(classId: string): SkillRecord[] {
  return skillsData.skills.filter((skill) => skill.classId === "novice" || skill.classId === classId);
}

export function getClassTreeSkills(classId: string): SkillRecord[] {
  return skillsData.skills.filter((skill) => skill.classId === classId);
}

export function normalizeLearnedSkills(raw: unknown): LearnedSkills {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const learned: LearnedSkills = {};
  for (const skill of skillsData.skills) {
    const value = Math.max(0, Math.floor(Number(source[skill.id]) || 0));
    if (value > 0) learned[skill.id] = Math.min(skill.maxLv, value);
  }
  for (const starter of noviceStarters) {
    learned[starter] = Math.max(1, learned[starter] || 0);
  }
  return learned;
}

export function normalizeHotbar(raw: unknown): HotbarSlot[] {
  const slots = Array.isArray(raw) ? raw : [];
  const count = Number(skillsData.hotbarSlots) || 10;
  const result = Array.from({ length: count }, (_, index) => {
    const id = typeof slots[index] === "string" ? slots[index] : null;
    return id && skillMap.has(id) ? id : null;
  });
  if (result.every((entry) => entry === null)) {
    result[0] = "survivor_strike";
    result[1] = "field_first_aid";
    result[2] = "camp_rest";
  }
  return result;
}

export function defaultAutoBattle(): AutoBattleSettings {
  return {
    enabled: false,
    potionHpBelow: 40,
    skillIds: ["field_first_aid", "survivor_strike"],
  };
}

export function normalizeAutoBattle(raw: any): AutoBattleSettings {
  const fallback = defaultAutoBattle();
  return {
    enabled: raw?.enabled === true,
    potionHpBelow: Math.min(90, Math.max(10, Math.floor(Number(raw?.potionHpBelow) || fallback.potionHpBelow))),
    skillIds: Array.isArray(raw?.skillIds)
      ? raw.skillIds.filter((id: unknown) => typeof id === "string" && skillMap.has(id)).slice(0, 6)
      : fallback.skillIds,
  };
}

export function getSkillLevel(learned: LearnedSkills, skillId: string): number {
  return Math.max(0, Math.floor(Number(learned[skillId]) || 0));
}

export function canLearnSkill(
  learned: LearnedSkills,
  classId: string,
  skillPoints: number,
  skillId: string,
): { ok: boolean; reason: "ok" | "not-class" | "max" | "points" | "prerequisite" } {
  const skill = getSkill(skillId);
  if (!skill) return { ok: false, reason: "not-class" };
  if (skill.classId !== "novice" && skill.classId !== classId) return { ok: false, reason: "not-class" };
  const current = getSkillLevel(learned, skillId);
  if (current >= skill.maxLv) return { ok: false, reason: "max" };
  if (skillPoints <= 0) return { ok: false, reason: "points" };
  for (const prerequisite of skill.prerequisites ?? []) {
    if (getSkillLevel(learned, prerequisite.skillId) < prerequisite.level) {
      return { ok: false, reason: "prerequisite" };
    }
  }
  return { ok: true, reason: "ok" };
}

export function learnSkillLevel(
  learned: LearnedSkills,
  classId: string,
  skillPoints: number,
  skillId: string,
): { learned: LearnedSkills; skillPoints: number } {
  const normalized = normalizeLearnedSkills(learned);
  const check = canLearnSkill(normalized, classId, skillPoints, skillId);
  if (!check.ok) throw new Error(`Cannot learn skill: ${check.reason}`);
  normalized[skillId] = getSkillLevel(normalized, skillId) + 1;
  return { learned: normalized, skillPoints: skillPoints - 1 };
}

export function resetLearnedSkills(
  learned: LearnedSkills,
): { learned: LearnedSkills; refunded: number } {
  const normalized = normalizeLearnedSkills(learned);
  let refunded = 0;
  for (const skill of skillsData.skills) {
    const level = getSkillLevel(normalized, skill.id);
    const freeBase = noviceStarters.includes(skill.id) ? 1 : 0;
    refunded += Math.max(0, level - freeBase);
  }
  const next: LearnedSkills = {};
  for (const id of noviceStarters) next[id] = 1;
  return { learned: next, refunded };
}

export function sanitizeHotbarForLearned(hotbar: HotbarSlot[], learned: LearnedSkills): HotbarSlot[] {
  return normalizeHotbar(hotbar).map((id) => id && getSkillLevel(learned, id) > 0 ? id : null);
}

export function assignHotbar(
  hotbar: HotbarSlot[],
  learned: LearnedSkills,
  slot: number,
  skillId: string | null,
): HotbarSlot[] {
  const next = normalizeHotbar(hotbar);
  if (slot < 0 || slot >= next.length) throw new Error("Invalid hotbar slot");
  if (skillId !== null && getSkillLevel(learned, skillId) <= 0) throw new Error("Skill not learned");
  if (skillId) {
    for (let index = 0; index < next.length; index++) {
      if (next[index] === skillId) next[index] = null;
    }
  }
  next[slot] = skillId;
  return next;
}

function levelArrayValue(values: readonly number[] | undefined, level: number): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Number(values[Math.max(0, Math.min(values.length - 1, level - 1))]) || 0;
}

export function getSkillLevelData(skillId: string, level: number) {
  const skill = getSkill(skillId);
  if (!skill) return null;
  const safeLevel = Math.max(1, Math.min(skill.maxLv, level));
  return {
    level: safeLevel,
    spCost: levelArrayValue(skill.spCost, safeLevel),
    powerPercent: levelArrayValue(skill.powerPercent, safeLevel),
    healPercent: levelArrayValue(skill.healPercent, safeLevel),
    cooldownMs: Number(skill.cooldownMs) || 0,
    castMs: Number(skill.castMs) || 0,
    afterCastMs: Number(skill.afterCastMs) || 0,
    range: Number(skill.range) || 0,
  };
}

export function applySkillPassives(
  derived: DerivedStats,
  learned: LearnedSkills,
): DerivedStats {
  const result = { ...derived } as Record<string, number>;
  for (const skill of skillsData.skills) {
    if (skill.type !== "passive" || !skill.passiveBonus) continue;
    const level = getSkillLevel(learned, skill.id);
    if (level <= 0) continue;
    for (const [key, perLevel] of Object.entries(skill.passiveBonus)) {
      const current = Number(result[key]);
      if (!Number.isFinite(current)) continue;
      result[key] = Math.max(0, current + Number(perLevel) * level);
    }
  }
  return result as DerivedStats;
}

export function getCastInterruptProtection(learned: LearnedSkills): number {
  const normalized = normalizeLearnedSkills(learned);
  let chance = 0;
  for (const skill of skillsData.skills as any[]) {
    const perLevel = Number(skill.interruptProtection?.chancePerLevel) || 0;
    if (perLevel <= 0) continue;
    chance += perLevel * getSkillLevel(normalized, skill.id);
  }
  return Math.min(0.75, Math.max(0, chance));
}

export function getSpentSkillPoints(learned: LearnedSkills): number {
  const normalized = normalizeLearnedSkills(learned);
  return skillsData.skills.reduce((sum, skill) => {
    const freeBase = noviceStarters.includes(skill.id) ? 1 : 0;
    return sum + Math.max(0, getSkillLevel(normalized, skill.id) - freeBase);
  }, 0);
}

export function prerequisiteLabel(skill: SkillRecord): string[] {
  return (skill.prerequisites ?? []).map((entry) => `${entry.skillId} Lv ${entry.level}`);
}

export function isUsableSkill(skill: SkillRecord): boolean {
  return skill.type !== "passive";
}

export const skillConfig = skillsData;
