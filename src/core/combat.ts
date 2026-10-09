import formulasData from "../data/formulas.json";
import statusData from "../data/status_effects.json";

export type ElementId = "neutral" | "fire" | "water" | "wind" | "earth" | "light" | "dark";
export type SizeId = "small" | "medium" | "large";
export type RaceId = "beast" | "plant" | "undead" | "human" | "demon";
export type AttackProfile = "melee" | "ranged" | "magic";
export type HitResultType = "miss" | "perfect-dodge" | "hit" | "critical" | "block";

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
  blockChance?: number;
};

export type DamageInput = {
  attacker: CombatantStats;
  defender: CombatantStats;
  skillMultiplier: number;
  element: ElementId;
  targetElement: ElementId;
  targetSize: SizeId;
  targetRace: RaceId;
  profile: AttackProfile;
  magical: boolean;
  rng?: () => number;
};

export type DamageResult = {
  type: HitResultType;
  damage: number;
  rawDamage: number;
  elementMultiplier: number;
  sizeMultiplier: number;
  raceMultiplier: number;
  hitChance: number;
  critChance: number;
  perfectDodgeChance: number;
  blocked: boolean;
  critical: boolean;
};

export type ActiveStatus = {
  id: string;
  stacks: number;
  startedAt: number;
  expiresAt: number;
};

const combat = formulasData.combat as any;
const elementTable = formulasData.elementMultipliers as Record<string, Record<string, number>>;
const sizeTable = formulasData.sizeMultipliers as Record<string, Record<string, number>>;
const raceTable = formulasData.raceMultipliers as Record<string, Record<string, number>>;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getElementMultiplier(attacking: ElementId, defending: ElementId): number {
  return Number(elementTable?.[attacking]?.[defending]) || 1;
}

export function getSizeMultiplier(profile: AttackProfile, size: SizeId): number {
  return Number(sizeTable?.[profile]?.[size]) || 1;
}

export function getRaceMultiplier(element: ElementId, race: RaceId): number {
  return Number(raceTable?.[element]?.[race]) || 1;
}

export function resolveCombatHit(input: DamageInput): DamageResult {
  const rng = input.rng ?? Math.random;
  const perfectDodgeChance = clamp(
    Number(input.defender.perfectDodge) || 0,
    0,
    Number(combat.maxPerfectDodgeChance) || 30,
  );
  if (rng() * 100 < perfectDodgeChance) {
    return {
      type: "perfect-dodge",
      damage: 0,
      rawDamage: 0,
      elementMultiplier: 1,
      sizeMultiplier: 1,
      raceMultiplier: 1,
      hitChance: 100,
      critChance: 0,
      perfectDodgeChance,
      blocked: false,
      critical: false,
    };
  }

  const hitChance = clamp(
    (Number(combat.baseHitChance) || 80) +
      (Number(input.attacker.HIT) || 0) -
      (Number(input.defender.FLEE) || 0),
    Number(combat.minHitChance) || 5,
    Number(combat.maxHitChance) || 95,
  );
  if (rng() * 100 >= hitChance) {
    return {
      type: "miss",
      damage: 0,
      rawDamage: 0,
      elementMultiplier: 1,
      sizeMultiplier: 1,
      raceMultiplier: 1,
      hitChance,
      critChance: 0,
      perfectDodgeChance,
      blocked: false,
      critical: false,
    };
  }

  const critChance = clamp(
    (Number(input.attacker.CRIT) || 0) -
      (Number(input.defender.critResistance) || 0),
    0,
    Number(combat.maxCritChance) || 60,
  );
  const critical = rng() * 100 < critChance;
  const blockChance = clamp(Number(input.defender.blockChance) || 0, 0, 75);
  const blocked = rng() * 100 < blockChance;

  const elementMultiplier = getElementMultiplier(input.element, input.targetElement);
  const sizeMultiplier = getSizeMultiplier(input.profile, input.targetSize);
  const raceMultiplier = getRaceMultiplier(input.element, input.targetRace);
  const offense = input.magical ? Number(input.attacker.MATK) || 1 : Number(input.attacker.ATK) || 1;
  const defense = input.magical ? Number(input.defender.MDEF) || 0 : Number(input.defender.DEF) || 0;
  const critMultiplier = critical ? Number(combat.critMultiplier) || 1.5 : 1;
  const blockMultiplier = blocked ? Number(combat.blockMultiplier) || 0.6 : 1;

  const rawDamage =
    offense *
    Math.max(0, input.skillMultiplier) *
    elementMultiplier *
    sizeMultiplier *
    raceMultiplier *
    critMultiplier *
    blockMultiplier;

  const damage = Math.max(1, Math.round(rawDamage - defense));
  const type: HitResultType = critical ? "critical" : blocked ? "block" : "hit";

  return {
    type,
    damage,
    rawDamage,
    elementMultiplier,
    sizeMultiplier,
    raceMultiplier,
    hitChance,
    critChance,
    perfectDodgeChance,
    blocked,
    critical,
  };
}

export function combatConfig() {
  return combat as {
    pvp: boolean;
    respawnInvulnerabilityMs: number;
    deathExpLossPercent: number;
    autoAttackIntervalMs: number;
    autoAttackRange: number;
    autoLootRadius: number;
  };
}

export function getStatusDefinition(statusId: string): any | null {
  return (statusData.statuses as any[]).find((status) => status.id === statusId) ?? null;
}

export function addOrRefreshStatus(
  current: ActiveStatus[],
  statusId: string,
  now = Date.now(),
  durationOverride?: number,
): ActiveStatus[] {
  const definition = getStatusDefinition(statusId);
  if (!definition) return current;
  const duration = Math.max(100, Number(durationOverride ?? definition.durationMs) || 1000);
  const next = current.filter((entry) => entry.expiresAt > now).map((entry) => ({ ...entry }));
  const found = next.find((entry) => entry.id === statusId);
  if (!found) {
    next.push({ id: statusId, stacks: 1, startedAt: now, expiresAt: now + duration });
    return next;
  }

  if (definition.stacking === "stack") {
    found.stacks = Math.min(Number(definition.maxStacks) || 1, found.stacks + 1);
  } else if (definition.stacking === "refresh" || definition.stacking === "strongest") {
    found.stacks = Math.max(1, found.stacks);
  }
  found.startedAt = now;
  found.expiresAt = now + duration;
  return next;
}

export function pruneStatuses(current: ActiveStatus[], now = Date.now()): ActiveStatus[] {
  return current.filter((entry) => entry.expiresAt > now);
}

export function hasStatus(current: ActiveStatus[], statusId: string, now = Date.now()): boolean {
  return current.some((entry) => entry.id === statusId && entry.expiresAt > now);
}

export function statusRemainingMs(status: ActiveStatus, now = Date.now()): number {
  return Math.max(0, status.expiresAt - now);
}

export function applyDeathExpLoss(currentExp: number): { nextExp: number; lost: number } {
  const percent = clamp(Number(combat.deathExpLossPercent) || 0, 0, 100);
  const lost = Math.min(
    Math.max(0, Math.floor(currentExp)),
    Math.max(0, Math.ceil(Math.max(0, currentExp) * percent / 100)),
  );
  return { nextExp: Math.max(0, Math.floor(currentExp) - lost), lost };
}

export function threatAfterDamage(currentThreat: number, damage: number, multiplier = 1): number {
  return Math.max(0, currentThreat) + Math.max(0, damage) * Math.max(0, multiplier);
}
