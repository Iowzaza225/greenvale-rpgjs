import formulasData from "../data/formulas.json";

export type ElementId = "neutral" | "fire" | "water" | "wind" | "earth" | "light" | "dark";
export type SizeId = "small" | "medium" | "large";
export type RaceId = "beast" | "plant" | "undead" | "human" | "demon";
export type AttackKind = "melee" | "ranged" | "magic";

export type CombatantStats = {
  ATK: number;
  MATK: number;
  DEF: number;
  MDEF: number;
  HIT: number;
  FLEE: number;
  perfectDodge: number;
  CRIT: number;
  critResistance: number;
  BLOCK: number;
  blockReduction?: number;
  MaxHP?: number;
  MaxSP?: number;
  element?: ElementId;
  size?: SizeId;
  race?: RaceId;
};

export type CombatResolveInput = {
  attacker: CombatantStats;
  defender: CombatantStats;
  attackKind: AttackKind;
  skillPowerPercent?: number;
  attackElement?: ElementId;
  sizeMultiplier?: number;
  raceMultiplier?: number;
  forceHit?: boolean;
  forceCrit?: boolean;
  random?: () => number;
};

export type CombatResult = {
  outcome: "hit" | "miss" | "dodge" | "block" | "crit";
  damage: number;
  rawDamage: number;
  hitChance: number;
  critChance: number;
  blockChance: number;
  elementMultiplier: number;
  sizeMultiplier: number;
  raceMultiplier: number;
  critical: boolean;
  blocked: boolean;
};

const combat = formulasData.combat;

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function safe(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getElementMultiplier(
  attack: ElementId = "neutral",
  defense: ElementId = "neutral",
): number {
  const row = (combat.elementMatrix as any)?.[attack];
  return safe(row?.[defense], 1);
}

export function getSizeMultiplier(kind: AttackKind, size: SizeId = "medium"): number {
  return safe((combat.sizeMultipliers as any)?.[kind]?.[size], 1);
}

export function getRaceMultiplier(race: RaceId = "human"): number {
  return safe((combat.raceMultipliers as any)?.[race], 1);
}

export function getHitChance(attackerHit: number, defenderFlee: number): number {
  return clamp(
    safe(combat.minHitChance, 5),
    safe(combat.maxHitChance, 95),
    82 + (safe(attackerHit) - safe(defenderFlee)) * 1.5,
  );
}

export function getCritChance(attackerCrit: number, defenderResistance: number): number {
  return clamp(0, safe(combat.maxCritChance, 60), safe(attackerCrit) - safe(defenderResistance));
}

export function getBlockChance(block: number): number {
  return clamp(0, 45, safe(block));
}

export function resolveCombatHit(input: CombatResolveInput): CombatResult {
  const rng = input.random ?? Math.random;
  const hitChance = input.forceHit ? 100 : getHitChance(input.attacker.HIT, input.defender.FLEE);
  const perfectDodge = clamp(0, safe(combat.perfectDodgeCap, 25), safe(input.defender.perfectDodge));
  const critChance = input.forceCrit ? 100 : getCritChance(input.attacker.CRIT, input.defender.critResistance);
  const blockChance = getBlockChance(input.defender.BLOCK);

  if (!input.forceHit && rng() * 100 >= hitChance) {
    return {
      outcome: "miss",
      damage: 0,
      rawDamage: 0,
      hitChance,
      critChance,
      blockChance,
      elementMultiplier: 1,
      sizeMultiplier: 1,
      raceMultiplier: 1,
      critical: false,
      blocked: false,
    };
  }

  if (!input.forceHit && rng() * 100 < perfectDodge) {
    return {
      outcome: "dodge",
      damage: 0,
      rawDamage: 0,
      hitChance,
      critChance,
      blockChance,
      elementMultiplier: 1,
      sizeMultiplier: 1,
      raceMultiplier: 1,
      critical: false,
      blocked: false,
    };
  }

  const power = Math.max(0, safe(input.skillPowerPercent, 100)) / 100;
  const elementMultiplier = getElementMultiplier(
    input.attackElement ?? "neutral",
    input.defender.element ?? "neutral",
  );
  const sizeMultiplier = input.sizeMultiplier ?? getSizeMultiplier(
    input.attackKind,
    input.defender.size ?? "medium",
  );
  const raceMultiplier = input.raceMultiplier ?? getRaceMultiplier(input.defender.race ?? "human");
  const attackPower = input.attackKind === "magic" ? safe(input.attacker.MATK, 1) : safe(input.attacker.ATK, 1);
  const defense = input.attackKind === "magic" ? safe(input.defender.MDEF) : safe(input.defender.DEF);

  let rawDamage = Math.max(
    safe(combat.minimumDamage, 1),
    attackPower * power * elementMultiplier * sizeMultiplier * raceMultiplier - defense,
  );

  const critical = input.forceCrit || rng() * 100 < critChance;
  if (critical) rawDamage *= safe(combat.critMultiplier, 1.6);

  const blocked = rng() * 100 < blockChance;
  let damage = rawDamage;
  if (blocked) {
    const defenderReduction = safe(input.defender.blockReduction, safe(combat.blockDamageMultiplier, .45));
    damage *= clamp(.15, .8, defenderReduction);
  }

  damage = Math.max(safe(combat.minimumDamage, 1), Math.round(damage));
  rawDamage = Math.max(safe(combat.minimumDamage, 1), Math.round(rawDamage));

  return {
    outcome: blocked ? "block" : critical ? "crit" : "hit",
    damage,
    rawDamage,
    hitChance,
    critChance,
    blockChance,
    elementMultiplier,
    sizeMultiplier,
    raceMultiplier,
    critical,
    blocked,
  };
}

export function calculateThreat(
  damage: number,
  healing = 0,
  proximityBonus = 0,
): number {
  const threat = combat.threat;
  return Math.max(
    0,
    Math.round(
      Math.max(0, damage) * safe(threat.damage, 1) +
      Math.max(0, healing) * safe(threat.heal, .35) +
      Math.max(0, proximityBonus) * safe(threat.proximity, 6),
    ),
  );
}

export function rollChance(chance: number, random: () => number = Math.random): boolean {
  return random() < clamp(0, 1, safe(chance));
}

export function randomInt(min: number, max: number, random: () => number = Math.random): number {
  const low = Math.floor(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(random() * (high - low + 1));
}

export const combatConfig = combat;
