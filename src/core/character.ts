import classesData from "../data/classes.json";
import formulasData from "../data/formulas.json";

export const STAT_KEYS = ["STR", "AGI", "VIT", "INT", "DEX", "LUK"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type BaseStats = Record<StatKey, number>;

export type CharacterProgression = {
  baseLevel: number;
  baseExp: number;
  jobLevel: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  stats: BaseStats;
};

export type DerivedStats = {
  ATK: number;
  MATK: number;
  DEF: number;
  MDEF: number;
  HIT: number;
  FLEE: number;
  perfectDodge: number;
  CRIT: number;
  critResistance: number;
  ASPD: number;
  MaxHP: number;
  MaxSP: number;
  hpRegen: number;
  spRegen: number;
  maxWeight: number;
  attackRange: number;
};

type ClassConfig = (typeof classesData.classes)[number];

const progression = formulasData.progression;

export function defaultBaseStats(): BaseStats {
  return { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 };
}

export function normalizeBaseStats(raw: Partial<Record<StatKey, unknown>> | null | undefined): BaseStats {
  const max = Number(classesData.maxStat) || 99;
  return STAT_KEYS.reduce((acc, key) => {
    const value = Math.floor(Number(raw?.[key]) || 1);
    acc[key] = Math.min(max, Math.max(1, value));
    return acc;
  }, {} as BaseStats);
}

export function getClassConfig(classId: string): ClassConfig {
  return classesData.classes.find((entry) => entry.id === classId) ?? classesData.classes[0]!;
}

export function getStatUpgradeCost(currentValue: number): number {
  const current = Math.max(1, Math.floor(currentValue));
  const tier = formulasData.progression.statPointCostTiers.find(
    (entry) => current >= entry.min && current <= entry.max,
  );
  return tier?.cost ?? 999;
}

export function getBaseExpRequired(level: number): number {
  const cap = Number(progression.baseLevelCap) || 99;
  const normalized = Math.max(1, Math.min(cap, Math.floor(level)));
  return Number(formulasData.expTables.base[normalized - 1]) || 0;
}

export function getJobExpRequired(level: number): number {
  const cap = Number(progression.jobLevelCap) || 50;
  const normalized = Math.max(1, Math.min(cap, Math.floor(level)));
  return Number(formulasData.expTables.job[normalized - 1]) || 0;
}

export function createInitialProgression(): CharacterProgression {
  return {
    baseLevel: 1,
    baseExp: 0,
    jobLevel: 1,
    jobExp: 0,
    statPoints: 0,
    skillPoints: 0,
    stats: defaultBaseStats(),
  };
}

export function normalizeProgression(raw: any): CharacterProgression {
  const initial = createInitialProgression();
  const baseCap = Number(progression.baseLevelCap) || 99;
  const jobCap = Number(progression.jobLevelCap) || 50;
  return {
    baseLevel: Math.min(baseCap, Math.max(1, Math.floor(Number(raw?.baseLevel) || 1))),
    baseExp: Math.max(0, Math.floor(Number(raw?.baseExp) || 0)),
    jobLevel: Math.min(jobCap, Math.max(1, Math.floor(Number(raw?.jobLevel) || 1))),
    jobExp: Math.max(0, Math.floor(Number(raw?.jobExp) || 0)),
    statPoints: Math.max(0, Math.floor(Number(raw?.statPoints) || 0)),
    skillPoints: Math.max(0, Math.floor(Number(raw?.skillPoints) || 0)),
    stats: normalizeBaseStats(raw?.stats ?? initial.stats),
  };
}

export function applyExperience(
  current: CharacterProgression,
  baseGain: number,
  jobGain: number,
): {
  progression: CharacterProgression;
  baseLevelsGained: number;
  jobLevelsGained: number;
} {
  const next = normalizeProgression(current);
  const baseCap = Number(progression.baseLevelCap) || 99;
  const jobCap = Number(progression.jobLevelCap) || 50;
  let baseLevelsGained = 0;
  let jobLevelsGained = 0;

  next.baseExp += Math.max(0, Math.floor(baseGain));
  while (next.baseLevel < baseCap) {
    const required = getBaseExpRequired(next.baseLevel);
    if (required <= 0 || next.baseExp < required) break;
    next.baseExp -= required;
    next.baseLevel += 1;
    next.statPoints += Number(progression.statPointsPerBaseLevel) || 3;
    baseLevelsGained += 1;
  }
  if (next.baseLevel >= baseCap) next.baseExp = 0;

  next.jobExp += Math.max(0, Math.floor(jobGain));
  while (next.jobLevel < jobCap) {
    const required = getJobExpRequired(next.jobLevel);
    if (required <= 0 || next.jobExp < required) break;
    next.jobExp -= required;
    next.jobLevel += 1;
    next.skillPoints += Number(progression.skillPointsPerJobLevel) || 1;
    jobLevelsGained += 1;
  }
  if (next.jobLevel >= jobCap) next.jobExp = 0;

  return { progression: next, baseLevelsGained, jobLevelsGained };
}

export function canChangeJob(classId: string, jobLevel: number): boolean {
  if (classId !== "novice") return false;
  const novice = getClassConfig("novice") as any;
  const required = Number(novice.jobChange?.requiredJobLevel ?? progression.noviceJobChangeLevel) || 10;
  return jobLevel >= required;
}

export function isValidJobChange(classId: string): boolean {
  const novice = getClassConfig("novice") as any;
  const next: string[] = Array.isArray(novice.jobChange?.next) ? novice.jobChange.next : [];
  return next.includes(classId);
}

export function calculateDerivedStats(
  classId: string,
  progressionState: CharacterProgression,
  weaponAtk?: number,
): DerivedStats {
  const cls = getClassConfig(classId) as any;
  const stats = normalizeBaseStats(progressionState.stats);
  const baseLevel = Math.max(1, progressionState.baseLevel);
  const passive = cls.passive?.bonuses ?? {};
  const weaponATK = Number(weaponAtk ?? cls.starterWeaponAtk ?? 0);

  const rawMaxHp = (Number(cls.baseHp) * baseLevel * Number(cls.hpPerLevel ?? 1)) * (1 + stats.VIT / 100);
  const rawMaxSp = (Number(cls.baseSp) * baseLevel * Number(cls.spPerLevel ?? 1)) * (1 + stats.INT / 150);
  const maxHp = Math.max(1, Math.floor(rawMaxHp * (1 + Number(passive.maxHpPct ?? 0) / 100)));
  const maxSp = Math.max(1, Math.floor(rawMaxSp * (1 + Number(passive.maxSpPct ?? 0) / 100)));
  const baseAtk = stats.STR + Math.floor(stats.DEX / 5) + Math.floor(stats.LUK / 5) + weaponATK;
  const baseMatk = stats.INT * 1.5 + Math.floor((stats.INT * stats.INT) / 100);

  return {
    ATK: Math.max(1, Math.floor(baseAtk * (1 + Number(passive.atkPct ?? 0) / 100))),
    MATK: Math.max(1, Math.floor(baseMatk * (1 + Number(passive.matkPct ?? 0) / 100))),
    DEF: Math.max(0, Math.floor(stats.VIT * 0.8) + Math.floor(stats.STR / 10)),
    MDEF: Math.max(0, Math.floor(stats.INT * 0.7) + Math.floor(stats.VIT * 0.3)),
    HIT: baseLevel + stats.DEX,
    FLEE: baseLevel + stats.AGI + Number(passive.fleeFlat ?? 0),
    perfectDodge: Math.max(0, Math.floor(stats.LUK / 10) + Math.floor(Number(passive.fleeFlat ?? 0) / 4)),
    CRIT: Math.max(0, Number((1 + stats.LUK * 0.3 + Number(passive.critFlat ?? 0)).toFixed(1))),
    critResistance: Math.max(0, Math.floor(stats.VIT / 5) + Math.floor(stats.LUK / 10)),
    ASPD: Math.max(0.5, Number((Number(cls.aspd ?? 1) + stats.AGI * 0.0025).toFixed(3))),
    MaxHP: maxHp,
    MaxSP: maxSp,
    hpRegen: 1 + Math.floor(stats.VIT / 5) + Math.floor(maxHp / 200),
    spRegen: 1 + Math.floor(stats.INT / 6) + Math.floor(maxSp / 100),
    maxWeight:
      Number(cls.baseWeight ?? 2000) +
      stats.STR * 30 +
      stats.VIT * 10 +
      Number(passive.maxWeightFlat ?? 0),
    attackRange: Number(cls.attackRange ?? 64),
  };
}

export function spendStatPoint(
  current: CharacterProgression,
  key: StatKey,
): CharacterProgression {
  const next = normalizeProgression(current);
  const max = Number(classesData.maxStat) || 99;
  if (!STAT_KEYS.includes(key)) throw new Error("Invalid stat");
  if (next.stats[key] >= max) throw new Error("Stat is already at maximum");
  const cost = getStatUpgradeCost(next.stats[key]);
  if (next.statPoints < cost) throw new Error("Not enough stat points");
  next.statPoints -= cost;
  next.stats[key] += 1;
  return next;
}

export function changeJob(
  currentClassId: string,
  targetClassId: string,
  current: CharacterProgression,
): CharacterProgression {
  if (!canChangeJob(currentClassId, current.jobLevel)) throw new Error("Job level requirement not met");
  if (!isValidJobChange(targetClassId)) throw new Error("Invalid job change target");
  const next = normalizeProgression(current);
  next.jobLevel = 1;
  next.jobExp = 0;
  return next;
}

export function getBaseExpPercent(state: CharacterProgression): number {
  const required = getBaseExpRequired(state.baseLevel);
  return required <= 0 ? 100 : Math.min(100, Math.floor((state.baseExp / required) * 100));
}

export function getJobExpPercent(state: CharacterProgression): number {
  const required = getJobExpRequired(state.jobLevel);
  return required <= 0 ? 100 : Math.min(100, Math.floor((state.jobExp / required) * 100));
}
