import classesData from "../data/classes.json";
import formulasData from "../data/formulas.json";
import expCurves from "../data/exp_curves.json";
import itemsData from "../data/items.json";

export const STAT_KEYS = ["STR", "AGI", "VIT", "INT", "DEX", "LUK"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type StatBlock = Record<StatKey, number>;

export type DerivedStats = {
  ATK: number;
  MATK: number;
  DEF: number;
  MDEF: number;
  HIT: number;
  FLEE: number;
  perfectDodge: number;
  CRIT: number;
  critResist: number;
  ASPD: number;
  MaxHP: number;
  MaxSP: number;
  hpRegen: number;
  spRegen: number;
  maxWeight: number;
  attackRange: number;
  block: number;
};

export type CharacterProgressionView = {
  classId: string;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  jobExp: number;
  stats: StatBlock;
  equipment?: {
    weaponId?: string | null;
    armorDef?: number;
    gearMdef?: number;
  };
};

type ClassConfig = (typeof classesData.classes)[number] & {
  baseAspd: number;
  attackRange: number;
  weightBonus: number;
  hpPerLevel: number;
  spPerLevel: number;
  outfitColor: string;
  icon: string;
  starterWeaponId: string;
  passive?: { id: string; effects?: Record<string, number> };
  jobMaxLevel: number;
};

const classById = new Map(classesData.classes.map((entry) => [entry.id, entry as ClassConfig]));
const itemById = new Map(itemsData.items.map((entry) => [entry.id, entry as any]));

export function defaultStats(): StatBlock {
  return { STR: 1, AGI: 1, VIT: 1, INT: 1, DEX: 1, LUK: 1 };
}

export function normalizeStats(raw: unknown): StatBlock {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const output = defaultStats();
  for (const key of STAT_KEYS) {
    output[key] = Math.min(99, Math.max(1, Math.floor(Number(source[key]) || 1)));
  }
  return output;
}

export function getClassConfig(classId: string): ClassConfig {
  return (classById.get(classId) ?? classById.get("novice")) as ClassConfig;
}

export function getStarterWeaponId(classId: string): string {
  return getClassConfig(classId).starterWeaponId;
}

export function getStatPointCost(currentValue: number): number {
  const value = Math.min(99, Math.max(1, Math.floor(currentValue)));
  const row = formulasData.statPointCost.find((entry) => value >= entry.min && value <= entry.max);
  return Math.max(1, Number(row?.cost) || 1);
}

export function getBaseCurve(level: number) {
  const safe = Math.min(99, Math.max(1, Math.floor(level)));
  return expCurves.base.find((row) => row.level === safe) ?? expCurves.base[0];
}

export function getJobCurve(level: number) {
  const safe = Math.min(50, Math.max(1, Math.floor(level)));
  return expCurves.job.find((row) => row.level === safe) ?? expCurves.job[0];
}

export function isJobChangeEligible(classId: string, jobLevel: number): boolean {
  return classId === "novice" && jobLevel >= Number(classesData.jobChange.noviceRequiredJobLevel || 10);
}

export function getAvailableFirstJobs(): ClassConfig[] {
  return classesData.classes.filter((entry) => entry.id !== "novice") as ClassConfig[];
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / Math.max(1, divisor));
}

function pct(value: number, percentValue: number): number {
  return value * (1 + percentValue / 100);
}

function passiveEffect(classConfig: ClassConfig, id: string): number {
  return Number(classConfig.passive?.effects?.[id]) || 0;
}

export function calculateDerivedStats(character: CharacterProgressionView): DerivedStats {
  const stats = normalizeStats(character.stats);
  const classConfig = getClassConfig(character.classId);
  const rules = formulasData.derived;
  const weaponId = character.equipment?.weaponId || classConfig.starterWeaponId;
  const weapon = itemById.get(weaponId) ?? itemById.get(classConfig.starterWeaponId) ?? {};
  const weaponATK = Number(weapon.atk) || 0;
  const armorDEF = Number(character.equipment?.armorDef) || 0;
  const gearMDEF = Number(character.equipment?.gearMdef) || 0;
  const baseLevel = Math.min(99, Math.max(1, Math.floor(character.baseLevel || 1)));

  let ATK =
    stats.STR * Number(rules.atk.strMultiplier) +
    floorDiv(stats.DEX, Number(rules.atk.dexFloorDivisor)) +
    floorDiv(stats.LUK, Number(rules.atk.lukFloorDivisor)) +
    weaponATK * Number(rules.atk.weaponAtkMultiplier);

  let MATK =
    stats.INT * Number(rules.matk.intMultiplier) +
    floorDiv(stats.INT * stats.INT, Number(rules.matk.intSquareDivisor));

  let DEF =
    stats.VIT * Number(rules.def.vitMultiplier) +
    floorDiv(stats.STR, Number(rules.def.strFloorDivisor)) +
    armorDEF * Number(rules.def.armorDefMultiplier);

  let MDEF =
    stats.INT * Number(rules.mdef.intMultiplier) +
    stats.VIT * Number(rules.mdef.vitMultiplier) +
    gearMDEF * Number(rules.mdef.gearMdefMultiplier);

  let HIT =
    baseLevel * Number(rules.hit.baseLevelMultiplier) +
    stats.DEX * Number(rules.hit.dexMultiplier);

  let FLEE =
    baseLevel * Number(rules.flee.baseLevelMultiplier) +
    stats.AGI * Number(rules.flee.agiMultiplier);

  let perfectDodge = floorDiv(stats.LUK, Number(rules.perfectDodge.lukFloorDivisor));
  let CRIT = Number(rules.crit.base) + floorDiv(stats.LUK, Number(rules.crit.lukFloorDivisor));
  let critResist =
    floorDiv(stats.LUK, Number(rules.critResist.lukFloorDivisor)) +
    floorDiv(stats.VIT, Number(rules.critResist.vitFloorDivisor));

  let ASPD =
    Number(classConfig.baseAspd) +
    stats.AGI * Number(rules.aspd.agiMultiplier) +
    stats.DEX * Number(rules.aspd.dexMultiplier);
  ASPD = Math.min(Number(rules.aspd.max), Math.max(Number(rules.aspd.min), ASPD));

  let MaxHP =
    (Number(classConfig.baseHp) + Number(classConfig.hpPerLevel) * Math.max(0, baseLevel - 1)) *
    (1 + stats.VIT / Number(rules.maxHp.vitScaleDivisor));
  let MaxSP =
    Number(classConfig.baseSp) +
    Number(classConfig.spPerLevel) * Math.max(0, baseLevel - 1) +
    stats.INT * Number(rules.maxSp.intFlatMultiplier) +
    baseLevel * Number(rules.maxSp.baseLevelFlatMultiplier);
  MaxSP *= 1 + stats.INT / Number(rules.maxSp.intScaleDivisor);

  MaxHP = pct(MaxHP, passiveEffect(classConfig, "maxHpPct"));
  MaxSP = pct(MaxSP, passiveEffect(classConfig, "maxSpPct"));
  MATK = pct(MATK, passiveEffect(classConfig, "matkPct"));
  MDEF = pct(MDEF, passiveEffect(classConfig, "mdefPct"));
  HIT += passiveEffect(classConfig, "hitFlat");
  FLEE += passiveEffect(classConfig, "fleeFlat");
  perfectDodge += passiveEffect(classConfig, "perfectDodgeFlat");
  CRIT += passiveEffect(classConfig, "critFlat");

  const hpRegen =
    Number(rules.hpRegen.base) +
    floorDiv(stats.VIT, Number(rules.hpRegen.vitFloorDivisor)) +
    floorDiv(MaxHP, Number(rules.hpRegen.maxHpFloorDivisor));
  const spRegen =
    Number(rules.spRegen.base) +
    floorDiv(stats.INT, Number(rules.spRegen.intFloorDivisor)) +
    floorDiv(MaxSP, Number(rules.spRegen.maxSpFloorDivisor));
  const maxWeight =
    Number(rules.maxWeight.base) +
    stats.STR * Number(rules.maxWeight.strMultiplier) +
    stats.VIT * Number(rules.maxWeight.vitMultiplier) +
    Number(classConfig.weightBonus || 0) +
    passiveEffect(classConfig, "maxWeightFlat");
  const attackRange = Math.max(Number(rules.attackRange.minimum), Number(classConfig.attackRange) || 0);
  const block = passiveEffect(classConfig, "blockPct");

  return {
    ATK: Math.max(1, Math.floor(ATK)),
    MATK: Math.max(1, Math.floor(MATK)),
    DEF: Math.max(0, Math.floor(DEF)),
    MDEF: Math.max(0, Math.floor(MDEF)),
    HIT: Math.max(1, Math.floor(HIT)),
    FLEE: Math.max(1, Math.floor(FLEE)),
    perfectDodge: Math.max(0, Math.floor(perfectDodge)),
    CRIT: Math.max(0, Math.floor(CRIT)),
    critResist: Math.max(0, Math.floor(critResist)),
    ASPD: Number(ASPD.toFixed(3)),
    MaxHP: Math.max(1, Math.floor(MaxHP)),
    MaxSP: Math.max(1, Math.floor(MaxSP)),
    hpRegen: Math.max(1, Math.floor(hpRegen)),
    spRegen: Math.max(1, Math.floor(spRegen)),
    maxWeight: Math.max(0, Math.floor(maxWeight)),
    attackRange: Math.max(1, Math.floor(attackRange)),
    block: Math.max(0, Math.floor(block)),
  };
}
