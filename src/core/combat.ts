import formulasData from "../data/formulas.json";
import statusData from "../data/status_effects.json";

export type CombatElement = "neutral" | "fire" | "water" | "wind" | "earth" | "light" | "dark";
export type CombatSize = "small" | "medium" | "large";
export type CombatRace = "beast" | "plant" | "undead" | "human" | "demon";
export type DamageKind = "physical" | "magical";
export type CombatOutcome = "miss" | "perfect-dodge" | "block" | "hit" | "crit";

export type CombatStats = {
  ATK: number;
  MATK: number;
  DEF: number;
  MDEF: number;
  HIT: number;
  FLEE: number;
  CRIT: number;
  critResistance: number;
  perfectDodge: number;
  blockChance?: number;
  blockReduction?: number;
  element?: CombatElement;
  size?: CombatSize;
  race?: CombatRace;
};

export type DamageContext = {
  kind: DamageKind;
  powerPercent: number;
  element?: CombatElement;
  weaponType?: string;
  targetSize?: CombatSize;
  targetRace?: CombatRace;
  varianceRoll?: number;
  hitRoll?: number;
  dodgeRoll?: number;
  critRoll?: number;
  blockRoll?: number;
};

export type DamageResult = {
  outcome: CombatOutcome;
  damage: number;
  raw: number;
  hitChance: number;
  critChance: number;
  blockChance: number;
  elementMultiplier: number;
  sizeMultiplier: number;
  raceMultiplier: number;
  varianceMultiplier: number;
};

export type StatusDefinition = (typeof statusData.statuses)[number];

const combat = formulasData.combat;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getElementMultiplier(
  attack: CombatElement = "neutral",
  defense: CombatElement = "neutral",
): number {
  return Number((combat.elementMultipliers as any)?.[attack]?.[defense]) || 1;
}

export function getSizeMultiplier(weaponType: string | undefined, size: CombatSize = "medium"): number {
  if (!weaponType) return 1;
  return Number((combat.sizeMultipliers as any)?.[weaponType]?.[size]) || 1;
}

export function getRaceMultiplier(element: CombatElement = "neutral", race: CombatRace = "human"): number {
  return Number((combat.raceMultipliers as any)?.[element]?.[race]) || 1;
}

export function getStatusDefinition(id: string): StatusDefinition | null {
  return statusData.statuses.find((entry) => entry.id === id) ?? null;
}

export function calculateHitChance(attacker: CombatStats, defender: CombatStats): number {
  const cfg = combat.hitChance;
  return clamp(
    Number(cfg.base) + (Number(attacker.HIT) - Number(defender.FLEE)) * Number(cfg.perHitFleePoint),
    Number(cfg.min),
    Number(cfg.max),
  );
}

export function calculateCritChance(attacker: CombatStats, defender: CombatStats): number {
  return clamp(
    Number(attacker.CRIT) - Number(defender.critResistance),
    0,
    Number(combat.crit.maxChance),
  );
}

export function calculateBlockChance(defender: CombatStats): number {
  return clamp(
    Number(defender.blockChance ?? combat.block.defaultChance),
    0,
    Number(combat.block.maxChance),
  );
}

function normalizedRoll(value: number | undefined): number {
  if (Number.isFinite(value)) return clamp(Number(value), 0, .999999);
  return Math.random();
}

export function resolveDamage(
  attacker: CombatStats,
  defender: CombatStats,
  context: DamageContext,
): DamageResult {
  const hitChance = calculateHitChance(attacker, defender);
  const critChance = calculateCritChance(attacker, defender);
  const blockChance = calculateBlockChance(defender);
  const attackElement = context.element ?? "neutral";
  const defenseElement = defender.element ?? "neutral";
  const elementMultiplier = getElementMultiplier(attackElement, defenseElement);
  const sizeMultiplier = getSizeMultiplier(context.weaponType, context.targetSize ?? defender.size ?? "medium");
  const raceMultiplier = getRaceMultiplier(attackElement, context.targetRace ?? defender.race ?? "human");

  if (normalizedRoll(context.dodgeRoll) * 100 < clamp(Number(defender.perfectDodge), 0, 40)) {
    return { outcome:"perfect-dodge",damage:0,raw:0,hitChance,critChance,blockChance,elementMultiplier,sizeMultiplier,raceMultiplier,varianceMultiplier:1 };
  }
  if (normalizedRoll(context.hitRoll) * 100 >= hitChance) {
    return { outcome:"miss",damage:0,raw:0,hitChance,critChance,blockChance,elementMultiplier,sizeMultiplier,raceMultiplier,varianceMultiplier:1 };
  }

  const power = Math.max(0, Number(context.powerPercent) || 0) / 100;
  const source = context.kind === "magical" ? Math.max(1, Number(attacker.MATK)) : Math.max(1, Number(attacker.ATK));
  const defense = context.kind === "magical" ? Math.max(0, Number(defender.MDEF)) : Math.max(0, Number(defender.DEF));
  const varianceMin = Number(combat.damageVariance.min);
  const varianceMax = Number(combat.damageVariance.max);
  const varianceMultiplier = varianceMin + (varianceMax - varianceMin) * normalizedRoll(context.varianceRoll);

  let raw = Math.max(
    1,
    source * power * elementMultiplier * sizeMultiplier * raceMultiplier * varianceMultiplier - defense,
  );

  const crit = normalizedRoll(context.critRoll) * 100 < critChance;
  if (crit) raw *= Number(combat.crit.multiplier);

  const blocked = normalizedRoll(context.blockRoll) * 100 < blockChance;
  let damage = raw;
  let outcome: CombatOutcome = crit ? "crit" : "hit";
  if (blocked) {
    const reduction = clamp(
      Number(defender.blockReduction ?? combat.block.defaultReduction),
      0,
      .9,
    );
    damage *= 1 - reduction;
    outcome = "block";
  }

  return {
    outcome,
    damage: Math.max(1, Math.round(damage)),
    raw: Math.max(1, Math.round(raw)),
    hitChance,
    critChance,
    blockChance,
    elementMultiplier,
    sizeMultiplier,
    raceMultiplier,
    varianceMultiplier,
  };
}

export function basicAttackDelayMs(aspd: number): number {
  const normalized = clamp(Number(aspd) || 1, .5, 2.2);
  return Math.round(clamp(1000 / normalized, 420, 1800));
}

export function rollDrop(chance: number, roll = Math.random()): boolean {
  return normalizedRoll(roll) < clamp(Number(chance) || 0, 0, 1);
}

export function randomQuantity(min: number, max: number, roll = Math.random()): number {
  const lo = Math.max(0, Math.floor(Number(min) || 0));
  const hi = Math.max(lo, Math.floor(Number(max) || lo));
  return lo + Math.floor(normalizedRoll(roll) * (hi - lo + 1));
}
