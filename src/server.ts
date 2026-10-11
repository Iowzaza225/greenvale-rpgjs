import {
  ATK,
  Components,
  MAXHP,
  MAXSP,
  PDEF,
  RpgPlayer,
  createServer,
  provideServerModules,
  type EventDefinition,
} from "@rpgjs/server";
import {
  AttackPattern,
  BattleAi,
  EnemyType,
  chase,
  createActionBattleVisual,
  ifTargetInRange,
  provideActionBattle,
  useAttack,
} from "@rpgjs/action-battle/server";
import { CAMP_HEIGHT, CAMP_HITBOXES, CAMP_MAP_ID, CAMP_WIDTH } from "./shared.ts";
import skillsData from "./data/skills.json" with { type: "json" };
import monstersData from "./data/monsters.json" with { type: "json" };
import dropsData from "./data/drops.json" with { type: "json" };
import statusData from "./data/status_effects.json" with { type: "json" };
import {
  basicAttackDelayMs,
  randomQuantity,
  resolveDamage,
  rollDrop,
  type CombatStats,
} from "./core/combat.ts";

const TrainingBlade = {
  id: "training-blade",
  name: "Greenvale Training Blade",
  atk: 14,
  knockbackForce: 34,
  _type: "weapon" as const,
};

const HunterKnife = {
  id: "hunter-knife",
  name: "Hunter Knife",
  description: "มีดล่าสัตว์เบาและเร็ว",
  atk: 16,
  knockbackForce: 30,
  _type: "weapon" as const,
};

const MedicBlade = {
  id: "medic-blade",
  name: "Medic Utility Blade",
  description: "มีดอเนกประสงค์ของทีมแพทย์สนาม",
  atk: 12,
  knockbackForce: 27,
  _type: "weapon" as const,
};

const GuardianSword = {
  id: "guardian-sword",
  name: "Guardian Sword",
  description: "ดาบหนักของแนวหน้าค่าย Greenvale",
  atk: 17,
  knockbackForce: 44,
  _type: "weapon" as const,
};

const BeastSpear = {
  id: "beast-spear",
  name: "Beast Spear",
  description: "หอกสั้นสำหรับนักฝึกสัตว์",
  atk: 15,
  knockbackForce: 36,
  _type: "weapon" as const,
};

const EngineerCutter = {
  id: "engineer-cutter",
  name: "Scrap Cutter",
  description: "เครื่องมือตัดเศษเหล็กดัดแปลงเป็นอาวุธ",
  atk: 14,
  knockbackForce: 33,
  _type: "weapon" as const,
};

const WolfClaw = {
  id: "wolf-claw",
  name: "Mutant Claw",
  atk: 8,
  knockbackForce: 22,
  _type: "weapon" as const,
};


const GreenvaleSaber = {
  id: "greenvale-saber",
  name: "Greenvale Saber",
  description: "รางวัลจากภารกิจแรก: รอยเขี้ยวในป่า",
  atk: 20,
  knockbackForce: 42,
  _type: "weapon" as const,
};

const WolfFang = {
  id: "wolf-fang",
  name: "Wolf Fang",
  description: "เขี้ยวของหมาป่ากลายพันธุ์",
  price: 7,
  _type: "item" as const,
};

const FieldPotion = {
  id: "field-potion",
  name: "Field Potion",
  description: "ยาฉุกเฉิน ฟื้น HP 45",
  icon: "potion",
  consumable: true,
  hpValue: 45,
  price: 18,
  _type: "item" as const,
};

const FocusSlash = {
  id: "focus-slash",
  name: "Focus Slash",
  description: "ฟันเป้าหมายระยะใกล้ ใช้ SP 8",
  icon: "focus-slash",
  spCost: 8,
  hitRate: 1,
  power: 24,
  coefficient: { [ATK]: 1.0, [PDEF]: 0.25 },
  _type: "skill" as const,
  action: {
    target: "enemy" as const,
    range: 105,
    mode: "instant" as const,
    visual: {
      fx: "slashSpark",
      color: "#f2d176",
      accentColor: "#8dc8a0",
      scale: 1.08,
    },
  },
};

// The stable RPGJS standalone client runs the game server in the browser.
// This lightweight profile keeps class and first-quest progress across reloads.
// Full inventory/position persistence will be added only after engine-save testing.
type Profile = {
  name: string;
  classId: string;
  started: boolean;
  kills: number;
  completed: boolean;
  baseLevel?: number;
  jobLevel?: number;
  derived?: {
    ATK?: number;
    MATK?: number;
    DEF?: number;
    MDEF?: number;
    MaxHP?: number;
    MaxSP?: number;
    HIT?: number;
    FLEE?: number;
    CRIT?: number;
    critResistance?: number;
    perfectDodge?: number;
    ASPD?: number;
    attackRange?: number;
  };
  learnedSkills?: Record<string, number>;
  combatSettings?: { autoAttack?: boolean; autoLoot?: boolean; targetMode?: string };
  lootBag?: Record<string, number>;
  updatedAt?: number;
};

const CLASS_STATS: Record<string, { hp: number; sp: number; atk: number; pdef: number; speed: number }> = {
  novice:     { hp: 120, sp: 50,  atk: 12, pdef: 5,  speed: 3.1 },
  vanguard:   { hp: 180, sp: 48,  atk: 18, pdef: 11, speed: 2.95 },
  arcanist:   { hp: 118, sp: 135, atk: 10, pdef: 4,  speed: 3.0 },
  ranger:     { hp: 138, sp: 72,  atk: 17, pdef: 6,  speed: 3.45 },
  mender:     { hp: 142, sp: 118, atk: 12, pdef: 7,  speed: 3.05 },
  shade:      { hp: 130, sp: 76,  atk: 17, pdef: 5,  speed: 3.65 },
  trader:     { hp: 155, sp: 80,  atk: 14, pdef: 8,  speed: 3.15 },
  scavenger:  { hp: 165, sp: 85,  atk: 14, pdef: 6,  speed: 3.1 },
  hunter:     { hp: 150, sp: 80,  atk: 18, pdef: 5,  speed: 3.7 },
  medic:      { hp: 145, sp: 125, atk: 12, pdef: 6,  speed: 3.0 },
  guardian:   { hp: 220, sp: 65,  atk: 15, pdef: 12, speed: 2.8 },
  beastmaster:{ hp: 185, sp: 95,  atk: 15, pdef: 7,  speed: 3.35 },
  engineer:   { hp: 165, sp: 110, atk: 15, pdef: 8,  speed: 3.15 },
};

const STARTER_WEAPONS: Record<string, any> = {
  novice: TrainingBlade,
  vanguard: GuardianSword,
  arcanist: MedicBlade,
  ranger: HunterKnife,
  mender: MedicBlade,
  shade: HunterKnife,
  trader: EngineerCutter,
  scavenger: TrainingBlade,
  hunter: HunterKnife,
  medic: MedicBlade,
  guardian: GuardianSword,
  beastmaster: BeastSpear,
  engineer: EngineerCutter,
};

const WOLF_CONFIG = (monstersData.monsters as any[]).find((entry) => entry.id === "ashfang_wolf") || {
  id: "ashfang_wolf", level: 3, hp: 90, atk: 13, def: 3, mdef: 1, hit: 12, flee: 8,
  crit: 3, critResistance: 1, perfectDodge: 1, blockChance: 2, blockReduction: .35,
  element: "neutral", size: "medium", race: "beast", attackRange: 58,
};

function classWeaponType(classId: string): string {
  const map: Record<string, string> = {
    novice: "blade", vanguard: "blade", arcanist: "staff", ranger: "bow",
    mender: "mace", shade: "dagger", trader: "cart",
  };
  return map[classId] || "blade";
}

function profileCombatStats(profile: Profile): CombatStats {
  const derived = profile.derived || {};
  const fallback = CLASS_STATS[profile.classId] || CLASS_STATS.novice;
  return {
    ATK: Math.max(1, Number(derived.ATK) || fallback.atk),
    MATK: Math.max(1, Number(derived.MATK) || Math.max(1, fallback.atk * .8)),
    DEF: Math.max(0, Number(derived.DEF) || fallback.pdef),
    MDEF: Math.max(0, Number(derived.MDEF) || Math.max(0, fallback.pdef * .7)),
    HIT: Math.max(1, Number(derived.HIT) || 8),
    FLEE: Math.max(0, Number(derived.FLEE) || 5),
    CRIT: Math.max(0, Number(derived.CRIT) || 1),
    critResistance: Math.max(0, Number(derived.critResistance) || 0),
    perfectDodge: Math.max(0, Number(derived.perfectDodge) || 0),
    blockChance: profile.classId === "vanguard" ? 12 : 3,
    blockReduction: profile.classId === "vanguard" ? .55 : .4,
    element: "neutral",
    size: "medium",
    race: "human",
  };
}

function wolfCombatStats(): CombatStats {
  return {
    ATK: Number(WOLF_CONFIG.atk) || 13,
    MATK: Math.max(1, (Number(WOLF_CONFIG.atk) || 13) * .7),
    DEF: Number(WOLF_CONFIG.def) || 3,
    MDEF: Number(WOLF_CONFIG.mdef) || 1,
    HIT: Number(WOLF_CONFIG.hit) || 12,
    FLEE: Number(WOLF_CONFIG.flee) || 8,
    CRIT: Number(WOLF_CONFIG.crit) || 3,
    critResistance: Number(WOLF_CONFIG.critResistance) || 1,
    perfectDodge: Number(WOLF_CONFIG.perfectDodge) || 1,
    blockChance: Number(WOLF_CONFIG.blockChance) || 2,
    blockReduction: Number(WOLF_CONFIG.blockReduction) || .35,
    element: String(WOLF_CONFIG.element || "neutral") as any,
    size: String(WOLF_CONFIG.size || "medium") as any,
    race: String(WOLF_CONFIG.race || "beast") as any,
  };
}


let activePlayer: RpgPlayer | null = null;
const activeEnemies = new Set<any>();
const SKILL_RANGE_TOLERANCE = 8;

function applyProfileToPlayer(player: RpgPlayer, profile: Profile, refill = false) {
  const stats = CLASS_STATS[profile.classId] || CLASS_STATS.novice;
  const derived = profile.derived || {};
  const maxHp = Math.max(1, Number(derived.MaxHP) || stats.hp);
  const maxSp = Math.max(1, Number(derived.MaxSP) || stats.sp);
  const attack = Math.max(1, Number(derived.ATK) || stats.atk);
  const defense = Math.max(0, Number(derived.DEF) || stats.pdef);

  player.name = profile.name;
  player.param[MAXHP] = maxHp;
  player.param[MAXSP] = maxSp;
  player.param[ATK] = attack;
  player.param[PDEF] = defense;
  player.speed = stats.speed;
  player.setVariable("greenvale.class.id", profile.classId);
  player.setVariable("greenvale.base.level", profile.baseLevel || 1);
  player.setVariable("greenvale.job.level", profile.jobLevel || 1);

  if (refill) {
    player.hp = maxHp;
    player.sp = maxSp;
  } else {
    player.hp = Math.min(maxHp, Math.max(1, Number(player.hp) || maxHp));
    player.sp = Math.min(maxSp, Math.max(0, Number(player.sp) || maxSp));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("greenvale:character-runtime", () => {
    if (!activePlayer) return;
    try {
      const profile = getProfile();
      applyProfileToPlayer(activePlayer, profile, false);
      const starterWeapon = STARTER_WEAPONS[profile.classId] || TrainingBlade;
      if ((activePlayer.getItem(starterWeapon.id)?.quantity() ?? 0) < 1) {
        activePlayer.addItem(starterWeapon, 1);
      }
      const equipped = (activePlayer as any).getEquippedWeapon?.();
      const equippedId = typeof equipped?.id === "function" ? equipped.id() : equipped?.id;
      if (equippedId !== starterWeapon.id) activePlayer.equip(starterWeapon.id);
    } catch (error) {
      console.warn("[Greenvale] Runtime character refresh failed", error);
    }
  });
}

const skillCooldowns = new Map<string, number>();
const activeSkillModifiers = new Map<string, { stat: string; amount: number; expiresAt: number; previous?: number }>();
const activeToggles = new Set<string>();

function skillArrayValue(values: readonly number[] | undefined, level: number): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return Number(values[Math.max(0, Math.min(values.length - 1, level - 1))]) || 0;
}

function entityCoord(entity: any, key: "x" | "y"): number {
  try {
    const value = entity?.[key];
    return Number(typeof value === "function" ? value.call(entity) : value) || 0;
  } catch {
    return 0;
  }
}

function entityNumber(entity: any, key: string): number {
  try {
    const value = entity?.[key];
    const resolved = typeof value === "function" ? value.call(entity) : value;
    const numeric = Number(resolved);
    return Number.isFinite(numeric) ? numeric : 0;
  } catch {
    return 0;
  }
}

function entityCombatRadius(entity: any): number {
  // Greenvale currently uses 30x38 for the player and 34x36 for wolves.
  // RPGJS coordinates represent the body position, while players judge range
  // from the visible sprite edges. Using a conservative radius prevents a
  // monster that is visibly touching the player from being reported as out of range.
  if (entity === activePlayer) return 18;
  return 20;
}

function combatDistance(a: any, b: any): number {
  const dx = entityCoord(a, "x") - entityCoord(b, "x");
  const dy = entityCoord(a, "y") - entityCoord(b, "y");
  const centerDistance = Math.hypot(dx, dy);
  return Math.max(0, centerDistance - entityCombatRadius(a) - entityCombatRadius(b));
}

function enemyCandidates(player: RpgPlayer): Array<{ event: any; distance: number }> {
  // Do not walk through getCurrentMap().getEvents() from a browser-dispatched
  // standalone event. On WebKit that bridge can expose the synchronized map
  // facade instead of the authoritative room, which has no getEvents().
  // Battle events register themselves here during server-side onInit instead.
  return Array.from(activeEnemies)
    .filter((event: any) => event?.battleAi && entityNumber(event, "hp") > 0)
    .map((event: any) => ({ event, distance: combatDistance(player, event) }))
    .sort((a: any, b: any) => a.distance - b.distance);
}

function enemyEvents(player: RpgPlayer, range: number): any[] {
  return enemyCandidates(player)
    .filter(({ distance }) => distance <= range + SKILL_RANGE_TOLERANCE)
    .map(({ event }) => event);
}


let lockedTarget: any | null = null;
let lastBasicAttackAt = 0;
let basicApproach: { token: number; target: any; timer?: number; mode: "moveTo" | "step"; lastDistance: number; lastProgressAt: number; startedAt: number } | null = null;
let basicApproachToken = 0;

function combatEventId(entity: any): string {
  return String(entity?.id || entity?.name || "target");
}

function dispatchCombat(type: string, detail: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function currentTarget(maxDistance = 760): any | null {
  if (!activePlayer) return null;
  if (
    lockedTarget &&
    activeEnemies.has(lockedTarget) &&
    entityNumber(lockedTarget, "hp") > 0 &&
    combatDistance(activePlayer, lockedTarget) <= maxDistance
  ) {
    return lockedTarget;
  }
  const nearest = enemyCandidates(activePlayer).find(({ distance }) => distance <= maxDistance)?.event ?? null;
  lockedTarget = nearest;
  return nearest;
}

function dispatchTargetState(target: any | null = currentTarget()) {
  if (!activePlayer) return;
  if (!target || entityNumber(target, "hp") <= 0) {
    lockedTarget = null;
    dispatchCombat("greenvale:target-state", { target: null });
    return;
  }
  dispatchCombat("greenvale:target-state", {
    target: {
      id: combatEventId(target),
      name: String(target?.name || "Target"),
      hp: entityNumber(target, "hp"),
      maxHp: Math.max(1, Number(target?.param?.[MAXHP]) || Number(WOLF_CONFIG.hp) || 90),
      distance: Math.round(combatDistance(activePlayer, target)),
      element: WOLF_CONFIG.element || "neutral",
      size: WOLF_CONFIG.size || "medium",
      race: WOLF_CONFIG.race || "beast",
    },
  });
}

function cycleCombatTarget() {
  if (!activePlayer) return;
  const candidates = enemyCandidates(activePlayer).filter(({ distance }) => distance <= 760);
  if (!candidates.length) {
    lockedTarget = null;
    dispatchTargetState(null);
    return;
  }
  const currentIndex = candidates.findIndex(({ event }) => event === lockedTarget);
  lockedTarget = candidates[(currentIndex + 1 + candidates.length) % candidates.length]!.event;
  dispatchTargetState(lockedTarget);
}

function applyEnemyCombatDamage(
  target: any,
  result: ReturnType<typeof resolveDamage>,
  metadata: Record<string, any>,
) {
  if (!activePlayer || !target) return;
  const before = entityNumber(target, "hp");
  const damage = Math.max(0, Number(result.damage) || 0);
  const after = Math.max(0, before - damage);

  if (damage > 0) {
    target.hp = after;
    try {
      target.battleAi?.handleDamage?.(activePlayer, {
        damage,
        defeated: after <= 0,
        raw: { damage, outcome: result.outcome },
        metadata: { ...metadata, greenvaleCombat: true, outcome: result.outcome },
      });
    } catch (error) {
      console.warn("[Greenvale] custom combat AI damage hook failed", error);
    }
  }

  dispatchCombat("greenvale:combat-result", {
    direction: "outgoing",
    outcome: result.outcome,
    damage,
    targetId: combatEventId(target),
    targetName: String(target?.name || "Target"),
    hp: after,
    maxHp: Math.max(1, Number(target?.param?.[MAXHP]) || Number(WOLF_CONFIG.hp) || 90),
    elementMultiplier: result.elementMultiplier,
    sizeMultiplier: result.sizeMultiplier,
    raceMultiplier: result.raceMultiplier,
    ...metadata,
  });

  if (after <= 0) {
    lockedTarget = null;
    dispatchTargetState(null);
  } else {
    lockedTarget = target;
    dispatchTargetState(target);
  }
}

function stopBasicApproach() {
  if (!basicApproach) return;
  if (basicApproach.timer) window.clearTimeout(basicApproach.timer);
  try { activePlayer?.stopMoveTo?.(); } catch {}
  basicApproach = null;
}

function startBasicApproach(target: any) {
  if (!activePlayer || !target) return;
  if (basicApproach?.target === target) return;
  stopBasicApproach();

  const profile = getProfile();
  const targetRange = Math.max(60, Number(profile.derived?.attackRange) || 64);
  const token = ++basicApproachToken;
  const startedAt = Date.now();
  const initialDistance = combatDistance(activePlayer, target);
  basicApproach = {
    token,
    target,
    mode: "moveTo",
    lastDistance: initialDistance,
    lastProgressAt: startedAt,
    startedAt,
  };

  try {
    activePlayer.moveTo(target);
  } catch {
    if (basicApproach) basicApproach.mode = "step";
  }

  dispatchCombat("greenvale:combat-approach", {
    targetId: combatEventId(target),
    targetName: String(target?.name || "Target"),
    distance: Math.round(initialDistance),
    range: targetRange,
  });

  const tick = () => {
    if (!activePlayer || !basicApproach || basicApproach.token !== token) return;
    if (entityNumber(target, "hp") <= 0) {
      stopBasicApproach();
      lockedTarget = null;
      return;
    }

    const now = Date.now();
    const distance = combatDistance(activePlayer, target);
    if (distance <= targetRange + SKILL_RANGE_TOLERANCE) {
      stopBasicApproach();
      executeBasicAttack("auto", true);
      return;
    }

    if (distance + 2 < basicApproach.lastDistance) {
      basicApproach.lastDistance = distance;
      basicApproach.lastProgressAt = now;
    } else if (now - basicApproach.lastProgressAt > 900) {
      basicApproach.mode = "step";
      try { activePlayer.stopMoveTo?.(); } catch {}
    }

    if (basicApproach.mode === "step") {
      const px = entityCoord(activePlayer, "x");
      const py = entityCoord(activePlayer, "y");
      const tx = entityCoord(target, "x");
      const ty = entityCoord(target, "y");
      const dx = tx - px;
      const dy = ty - py;
      const center = Math.max(.001, Math.hypot(dx, dy));
      const desired = targetRange + entityCombatRadius(activePlayer) + entityCombatRadius(target) - 4;
      const remaining = Math.max(0, center - desired);
      if (remaining > 0) {
        const step = Math.min(14, remaining);
        try {
          activePlayer.teleport({
            x: Math.max(24, Math.min(CAMP_WIDTH - 24, px + dx / center * step)),
            y: Math.max(24, Math.min(CAMP_HEIGHT - 24, py + dy / center * step)),
          });
        } catch {}
      }
    }

    if (now - startedAt > 9000 || distance > 920) {
      stopBasicApproach();
      dispatchCombat("greenvale:combat-result", {
        direction: "outgoing",
        outcome: "miss",
        damage: 0,
        reason: "out-of-range",
        targetId: combatEventId(target),
        targetName: String(target?.name || "Target"),
      });
      return;
    }
    basicApproach.timer = window.setTimeout(tick, basicApproach.mode === "step" ? 65 : 90);
  };

  basicApproach.timer = window.setTimeout(tick, 90);
}

function executeBasicAttack(source: "manual" | "auto" = "manual", approached = false) {
  if (!activePlayer) return;
  const profile = getProfile();
  const target = currentTarget();
  if (!target) {
    dispatchCombat("greenvale:combat-result", { direction: "outgoing", outcome: "miss", damage: 0, reason: "no-target", source });
    return;
  }

  const range = Math.max(60, Number(profile.derived?.attackRange) || 64);
  const distance = combatDistance(activePlayer, target);
  if (distance > range + SKILL_RANGE_TOLERANCE) {
    if (!approached) startBasicApproach(target);
    return;
  }

  const delay = basicAttackDelayMs(Number(profile.derived?.ASPD) || 1);
  const now = Date.now();
  if (now - lastBasicAttackAt < delay) return;
  lastBasicAttackAt = now;

  const result = resolveDamage(
    profileCombatStats(profile),
    wolfCombatStats(),
    {
      kind: "physical",
      powerPercent: 100,
      element: "neutral",
      weaponType: classWeaponType(profile.classId),
      targetSize: String(WOLF_CONFIG.size || "medium") as any,
      targetRace: String(WOLF_CONFIG.race || "beast") as any,
    },
  );
  applyEnemyCombatDamage(target, result, { source, attackType: "basic" });
}

function dispatchSkillState(type = "greenvale:skill-state", extra: Record<string, any> = {}) {
  if (typeof window === "undefined" || !activePlayer) return;
  window.dispatchEvent(new CustomEvent(type, {
    detail: {
      hp: Number(activePlayer.hp) || 0,
      maxHp: Number(activePlayer.param[MAXHP]) || 0,
      sp: Number(activePlayer.sp) || 0,
      maxSp: Number(activePlayer.param[MAXSP]) || 0,
      ...extra,
    },
  }));
}

function restoreModifier(skillId: string) {
  if (!activePlayer) return;
  const current = activeSkillModifiers.get(skillId);
  if (!current) return;
  if (current.stat === "ATK" && current.previous !== undefined) activePlayer.param[ATK] = current.previous;
  if (current.stat === "PDEF" && current.previous !== undefined) activePlayer.param[PDEF] = current.previous;
  if (current.stat === "MaxHP" && current.previous !== undefined) {
    activePlayer.param[MAXHP] = current.previous;
    activePlayer.hp = Math.min(activePlayer.hp, current.previous);
  }
  activeSkillModifiers.delete(skillId);
  activeToggles.delete(skillId);
}

function applySelfModifier(skill: any, level: number): boolean {
  if (!activePlayer) return false;
  const stat = String(skill.runtime?.stat || "");
  const amount = Math.max(0, Number(skill.runtime?.amountPerLevel) || 0) * Math.max(1, level);
  const duration = Math.max(0, Number(skill.runtime?.durationMs) || 0);

  if (skill.type === "toggle" && activeToggles.has(skill.id)) {
    restoreModifier(skill.id);
    return true;
  }

  restoreModifier(skill.id);
  let previous: number | undefined;
  if (stat === "ATK") {
    previous = Number(activePlayer.param[ATK]) || 0;
    activePlayer.param[ATK] = previous + amount;
  } else if (stat === "PDEF") {
    previous = Number(activePlayer.param[PDEF]) || 0;
    activePlayer.param[PDEF] = previous + amount;
  } else if (stat === "MaxHP") {
    previous = Number(activePlayer.param[MAXHP]) || 1;
    activePlayer.param[MAXHP] = previous + amount;
    activePlayer.hp = Math.min(activePlayer.param[MAXHP], activePlayer.hp + amount);
  }

  activeSkillModifiers.set(skill.id, { stat, amount, expiresAt: duration ? Date.now() + duration : Number.MAX_SAFE_INTEGER, previous });
  if (skill.type === "toggle") activeToggles.add(skill.id);
  if (duration > 0) window.setTimeout(() => restoreModifier(skill.id), duration);
  return true;
}

type RuntimeStatus = {
  id: string;
  stacks: number;
  expiresAt: number;
  timer?: number;
  restoreSpeed?: number;
};

const playerStatuses = new Map<string, RuntimeStatus>();
const enemyStatuses = new WeakMap<any, Map<string, RuntimeStatus>>();

function statusDefinition(id: string): any | null {
  return (statusData.statuses as any[]).find((entry) => entry.id === id) || null;
}

function dispatchPlayerStatuses() {
  dispatchCombat("greenvale:player-status", {
    statuses: Array.from(playerStatuses.values()).map((entry) => ({
      id: entry.id,
      stacks: entry.stacks,
      expiresAt: entry.expiresAt,
    })),
  });
}

function clearPlayerStatus(id: string) {
  const state = playerStatuses.get(id);
  if (!state) return;
  if (state.timer) window.clearInterval(state.timer);
  playerStatuses.delete(id);
  dispatchPlayerStatuses();
}

function applyPlayerStatus(id: string, durationOverride?: number, sourceLevel = 1) {
  if (!activePlayer) return;
  const def = statusDefinition(id);
  if (!def) return;
  const now = Date.now();
  const duration = Math.max(100, Number(durationOverride) || Number(def.durationMs) || 1000);
  const existing = playerStatuses.get(id);
  const stacks = def.stacking === "stack"
    ? Math.min(Number(def.maxStacks) || 1, (existing?.stacks || 0) + 1)
    : 1;

  if (existing?.timer) window.clearInterval(existing.timer);
  const state: RuntimeStatus = { id, stacks, expiresAt: now + duration };
  playerStatuses.set(id, state);

  const tickMs = Math.max(0, Number(def.tickMs) || 0);
  if (tickMs > 0) {
    state.timer = window.setInterval(() => {
      if (!activePlayer || Date.now() >= state.expiresAt) {
        clearPlayerStatus(id);
        return;
      }
      let damage = 0;
      if (def.tickKind === "percentMaxHp") {
        damage = Math.max(1, Math.round((Number(activePlayer.param[MAXHP]) || 1) * Number(def.tickValue) / 100));
      } else if (def.tickKind === "sourceLevel") {
        damage = Math.max(1, Math.round(Number(def.tickValue) * sourceLevel * state.stacks));
      } else if (def.tickKind === "flat") {
        damage = Math.max(1, Math.round(Number(def.tickValue) * state.stacks));
      }
      if (damage > 0 && Number(activePlayer.hp) > 0) {
        activePlayer.hp = Math.max(0, Number(activePlayer.hp) - damage);
        dispatchCombat("greenvale:combat-result", {
          direction: "incoming",
          outcome: "hit",
          damage,
          attackType: "status",
          statusId: id,
          hp: Number(activePlayer.hp) || 0,
          maxHp: Number(activePlayer.param[MAXHP]) || 0,
        });
        window.dispatchEvent(new CustomEvent("greenvale:player-hit", {
          detail: { damage, hp: Number(activePlayer.hp) || 0, maxHp: Number(activePlayer.param[MAXHP]) || 0, statusId: id },
        }));
      }
    }, tickMs);
  }
  window.setTimeout(() => {
    const current = playerStatuses.get(id);
    if (current && current.expiresAt <= Date.now()) clearPlayerStatus(id);
  }, duration + 30);
  dispatchPlayerStatuses();
}

function applyEnemyDotDamage(target: any, damage: number, statusId: string) {
  if (!activePlayer || !target || damage <= 0 || entityNumber(target, "hp") <= 0) return;
  const before = entityNumber(target, "hp");
  const after = Math.max(0, before - damage);
  target.hp = after;
  try {
    target.battleAi?.handleDamage?.(activePlayer, {
      damage,
      defeated: after <= 0,
      raw: { damage, statusId },
      metadata: { greenvaleCombat: true, statusId },
    });
  } catch {}
  dispatchCombat("greenvale:combat-result", {
    direction: "outgoing",
    outcome: "hit",
    damage,
    attackType: "status",
    statusId,
    targetId: combatEventId(target),
    targetName: String(target?.name || "Target"),
    hp: after,
    maxHp: Math.max(1, Number(target?.param?.[MAXHP]) || Number(WOLF_CONFIG.hp) || 90),
  });
}

function applyStatus(target: any, skill: any, level: number) {
  const status = skill.statusEffect;
  if (!status || Math.random() > Number(status.chance ?? 1)) return;
  const def = statusDefinition(String(status.id));
  if (!def) return;
  const duration = Math.max(100, Number(status.durationMs) || Number(def.durationMs) || 1000);
  let map = enemyStatuses.get(target);
  if (!map) {
    map = new Map();
    enemyStatuses.set(target, map);
  }
  const existing = map.get(def.id);
  const stacks = def.stacking === "stack"
    ? Math.min(Number(def.maxStacks) || 1, (existing?.stacks || 0) + 1)
    : 1;
  if (existing?.timer) window.clearInterval(existing.timer);
  if (existing?.restoreSpeed !== undefined) target.speed = existing.restoreSpeed;

  const state: RuntimeStatus = { id: def.id, stacks, expiresAt: Date.now() + duration };
  map.set(def.id, state);

  if (Number(def.speedMultiplier) !== 1) {
    const originalSpeed = Number(target.speed) || Number(WOLF_CONFIG.moveSpeed) || 1.35;
    state.restoreSpeed = originalSpeed;
    target.speed = Math.max(0, originalSpeed * Number(def.speedMultiplier));
  }
  if (def.blocksAction && target.battleAi?.stagger) {
    try { target.battleAi.stagger(duration, activePlayer); } catch {}
  }

  const tickMs = Math.max(0, Number(def.tickMs) || 0);
  if (tickMs > 0) {
    state.timer = window.setInterval(() => {
      if (!map || Date.now() >= state.expiresAt || entityNumber(target, "hp") <= 0) {
        if (state.timer) window.clearInterval(state.timer);
        if (state.restoreSpeed !== undefined && target) target.speed = state.restoreSpeed;
        map?.delete(def.id);
        return;
      }
      let damage = 0;
      if (def.tickKind === "percentMaxHp") {
        damage = Math.max(1, Math.round((Number(target?.param?.[MAXHP]) || Number(WOLF_CONFIG.hp) || 90) * Number(def.tickValue) / 100));
      } else if (def.tickKind === "sourceLevel") {
        damage = Math.max(1, Math.round(Number(def.tickValue) * level * state.stacks));
      } else if (def.tickKind === "flat") {
        damage = Math.max(1, Math.round(Number(def.tickValue) * state.stacks));
      }
      applyEnemyDotDamage(target, damage, def.id);
    }, tickMs);
  }

  window.setTimeout(() => {
    const current = map?.get(def.id);
    if (!current || current.expiresAt > Date.now()) return;
    if (current.timer) window.clearInterval(current.timer);
    if (current.restoreSpeed !== undefined && target) target.speed = current.restoreSpeed;
    map?.delete(def.id);
    dispatchCombat("greenvale:target-status", { targetId: combatEventId(target), statusId: def.id, active: false });
  }, duration + 30);

  dispatchCombat("greenvale:target-status", {
    targetId: combatEventId(target),
    statusId: def.id,
    active: true,
    stacks,
    expiresAt: state.expiresAt,
  });
}

const SKILL_ASSIST_MAX_DISTANCE = 900;
const SKILL_APPROACH_TIMEOUT_MS = 10000;
const SKILL_APPROACH_STUCK_MS = 1200;

let pendingSkillApproach: { skillId: string; token: number; timer?: number } | null = null;
let skillApproachToken = 0;

function stopSkillApproach() {
  if (!pendingSkillApproach) return;
  if (pendingSkillApproach.timer) window.clearTimeout(pendingSkillApproach.timer);
  try { activePlayer?.stopMoveTo?.(); } catch {}
  pendingSkillApproach = null;
}

function startSkillApproach(detail: any, skill: any, level: number, target: any, targetRange: number) {
  if (!activePlayer) return;
  stopSkillApproach();

  const token = ++skillApproachToken;
  const skillId = String(skill.id);
  const source = detail?.source === "auto" ? "auto" : "manual";
  const startedAt = Date.now();
  let lastDistance = combatDistance(activePlayer, target);
  let lastProgressAt = startedAt;
  let approachMode: "moveTo" | "step" = "moveTo";
  pendingSkillApproach = { skillId, token };

  const beginTrackingMove = () => {
    if (!activePlayer || approachMode === "step") return;
    try {
      // Normal server mode: use RPGJS SeekAvoid against the live target.
      activePlayer.moveTo(target);
    } catch (error) {
      // Standalone/browser mode can expose a synchronized map facade that has
      // no moveManager. Falling back to small synchronized steps keeps the
      // mobile skill assist playable without touching built-in hotbar sync.
      approachMode = "step";
      try { activePlayer.stopMoveTo?.(); } catch {}
      console.info("[Greenvale] moveTo unavailable; using standalone step assist", error);
    }
  };

  const stepTowardTarget = () => {
    if (!activePlayer || approachMode !== "step") return;
    const px = entityCoord(activePlayer, "x");
    const py = entityCoord(activePlayer, "y");
    const tx = entityCoord(target, "x");
    const ty = entityCoord(target, "y");
    const dx = tx - px;
    const dy = ty - py;
    const centerDistance = Math.hypot(dx, dy);
    if (!Number.isFinite(centerDistance) || centerDistance <= 0.001) return;

    const desiredCenterDistance =
      Math.max(0, targetRange + entityCombatRadius(activePlayer) + entityCombatRadius(target) - 4);
    const remaining = Math.max(0, centerDistance - desiredCenterDistance);
    if (remaining <= 0) return;

    const step = Math.min(16, remaining);
    const nextX = Math.max(24, Math.min(CAMP_WIDTH - 24, px + (dx / centerDistance) * step));
    const nextY = Math.max(24, Math.min(CAMP_HEIGHT - 24, py + (dy / centerDistance) * step));

    try {
      const result = activePlayer.teleport({ x: nextX, y: nextY });
      if (result && typeof (result as any).catch === "function") {
        void (result as Promise<unknown>).catch((error) => {
          console.warn("[Greenvale] Step assist teleport failed", error);
        });
      }
    } catch (error) {
      console.warn("[Greenvale] Step assist failed", error);
    }
  };

  const tick = () => {
    if (!activePlayer || !pendingSkillApproach || pendingSkillApproach.token !== token) return;

    if (entityNumber(target, "hp") <= 0) {
      const replacementTarget = enemyCandidates(activePlayer)[0];
      if (replacementTarget && replacementTarget.distance <= SKILL_ASSIST_MAX_DISTANCE) {
        stopSkillApproach();
        startSkillApproach(detail, skill, level, replacementTarget.event, targetRange);
        return;
      }
      stopSkillApproach();
      dispatchSkillState("greenvale:skill-result", { ok: false, reason: "no-target", skillId, source });
      return;
    }

    const now = Date.now();
    const distance = combatDistance(activePlayer, target);

    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")) {
      (window as any).__GV_APPROACH_DEBUG__ = {
        skillId,
        approachMode,
        elapsedMs: now - startedAt,
        distance: Math.round(distance * 10) / 10,
        targetRange,
        player: { x: entityCoord(activePlayer, "x"), y: entityCoord(activePlayer, "y") },
        target: { x: entityCoord(target, "x"), y: entityCoord(target, "y"), hp: entityNumber(target, "hp") },
      };
    }

    if (distance <= targetRange + SKILL_RANGE_TOLERANCE) {
      try { activePlayer.stopMoveTo?.(); } catch {}
      pendingSkillApproach = null;
      executeGreenvaleSkill({ ...detail, skillId, level, _approachRetry: true });
      return;
    }

    if (approachMode === "step") {
      stepTowardTarget();
    } else if (distance + 2 < lastDistance) {
      lastDistance = distance;
      lastProgressAt = now;
    } else if (now - lastProgressAt >= SKILL_APPROACH_STUCK_MS) {
      // RPGJS moveTo() can fail silently in the standalone/browser bridge:
      // it returns without throwing when no authoritative physics body is
      // available. Retrying moveTo would keep the player frozen forever and
      // end as "no target in range". After a short no-progress window, switch
      // to the bounded synchronized step assist instead.
      approachMode = "step";
      try { activePlayer.stopMoveTo?.(); } catch {}
      lastProgressAt = now;
      lastDistance = distance;
      stepTowardTarget();
    }

    if (now - startedAt > SKILL_APPROACH_TIMEOUT_MS || distance > SKILL_ASSIST_MAX_DISTANCE + 160) {
      stopSkillApproach();
      dispatchSkillState("greenvale:skill-result", {
        ok: false,
        reason: "no-target",
        skillId,
        source,
        targetDistance: Math.round(distance),
        targetRange,
        approachMode,
      });
      return;
    }

    pendingSkillApproach.timer = window.setTimeout(tick, approachMode === "step" ? 60 : 80);
  };

  dispatchSkillState("greenvale:skill-result", {
    ok: false,
    reason: "approaching",
    skillId,
    source,
    targetName: String(target?.name || "Target"),
    targetDistance: Math.round(lastDistance),
    targetRange,
    approachMode,
  });

  beginTrackingMove();
  pendingSkillApproach.timer = window.setTimeout(tick, 80);
}

function executeGreenvaleSkill(detail: any) {
  if (!activePlayer) return;
  const skillId = String(detail?.skillId || "");
  const source = detail?.source === "auto" ? "auto" : "manual";
  const skill = (skillsData.skills as any[]).find((entry) => entry.id === skillId);
  const profile = getProfile();
  const learnedLevel = Math.max(0, Math.floor(Number(profile.learnedSkills?.[skillId]) || 0));
  const requestedLevel = Math.max(1, Math.floor(Number(detail?.level) || learnedLevel));
  const level = Math.min(Number(skill?.maxLv) || 1, learnedLevel, requestedLevel);
  const fail = (reason: string) => dispatchSkillState("greenvale:skill-result", { ok: false, reason, skillId, source });

  if (!skill || level <= 0 || skill.type === "passive") return fail("locked");
  if (skill.classId !== "novice" && skill.classId !== profile.classId) return fail("locked");

  const now = Date.now();
  const readyAt = skillCooldowns.get(skillId) || 0;
  if (readyAt > now) return fail("cooldown");

  const spCost = skillArrayValue(skill.spCost, level);
  if (Number(activePlayer.sp) < spCost) return fail("no-sp");

  const kind = String(skill.runtime?.kind || "damage");
  let damageTotal = 0;
  let heal = 0;
  let targetName = "";

  if (kind === "heal") {
    const profilePower = Number(profile.derived?.MATK) || Number(profile.derived?.ATK) || 10;
    const percent = skillArrayValue(skill.healPercent, level);
    heal = Math.max(1, Math.round(profilePower * percent / 100));
    activePlayer.hp = Math.min(Number(activePlayer.param[MAXHP]) || 1, Number(activePlayer.hp) + heal);
  } else if (kind === "buff" || kind === "toggle") {
    applySelfModifier(skill, level);
  } else {
    const targetRange = Math.max(40, Number(skill.range) || 80);
    let targets = enemyEvents(activePlayer, targetRange);
    if (lockedTarget && targets.includes(lockedTarget)) {
      targets = [lockedTarget, ...targets.filter((entry) => entry !== lockedTarget)];
    }
    if (targets.length === 0) {
      // Mobile MMORPG assist: pressing an offensive skill without a selected
      // target acquires the nearest visible enemy and walks into legal range.
      // Damage is still applied only after the authoritative range check passes.
      const lockedCandidate = lockedTarget && entityNumber(lockedTarget, "hp") > 0
        ? { event: lockedTarget, distance: combatDistance(activePlayer, lockedTarget) }
        : null;
      const nearest = lockedCandidate ?? enemyCandidates(activePlayer)[0];
      const assistRange = Math.max(SKILL_ASSIST_MAX_DISTANCE, targetRange + 220);
      if (!detail?._approachRetry && nearest && nearest.distance <= assistRange) {
        startSkillApproach(detail, skill, level, nearest.event, targetRange);
        return;
      }

      const diagnostics = enemyCandidates(activePlayer).slice(0, 8).map(({ event, distance }) => ({
        id: String(event?.id || event?.name || "enemy"),
        hp: entityNumber(event, "hp"),
        x: entityCoord(event, "x"),
        y: entityCoord(event, "y"),
        distance: Math.round(distance * 10) / 10,
        hasBattleAi: !!event?.battleAi,
      }));
      dispatchSkillState("greenvale:skill-result", {
        ok: false,
        reason: "no-target",
        skillId,
        source,
        targetRange,
        activeEnemyCount: activeEnemies.size,
        playerPosition: { x: entityCoord(activePlayer, "x"), y: entityCoord(activePlayer, "y") },
        enemyDiagnostics: diagnostics,
      });
      return;
    }
    const shape = String(skill.area?.shape || "single");
    const limit = shape === "single" ? 1 : shape === "chain" ? 3 : 6;
    const selected = targets.slice(0, limit);
    const percent = skillArrayValue(skill.powerPercent, level);
    for (const target of selected) {
      targetName ||= String(target.name || "Target");
      let landed = true;
      if (percent > 0) {
        const result = resolveDamage(
          profileCombatStats(profile),
          wolfCombatStats(),
          {
            kind: skill.formula === "magical_basic" ? "magical" : "physical",
            powerPercent: percent,
            element: String(skill.element || "neutral") as any,
            weaponType: classWeaponType(profile.classId),
            targetSize: String(WOLF_CONFIG.size || "medium") as any,
            targetRace: String(WOLF_CONFIG.race || "beast") as any,
          },
        );
        landed = result.outcome !== "miss" && result.outcome !== "perfect-dodge";
        applyEnemyCombatDamage(target, result, {
          source,
          attackType: "skill",
          skillId,
          skillLevel: level,
          element: skill.element || "neutral",
        });
        damageTotal += Math.max(0, result.damage);
      }
      if (landed || percent <= 0) applyStatus(target, skill, level);
    }
  }

  activePlayer.sp = Math.max(0, Number(activePlayer.sp) - spCost);
  const nextReady = now + Math.max(0, Number(skill.cooldownMs) || 0);
  skillCooldowns.set(skillId, nextReady);
  dispatchSkillState("greenvale:skill-result", {
    ok: true,
    skillId,
    source,
    readyAt: nextReady,
    damage: damageTotal,
    heal,
    targetName,
    toggleActive: activeToggles.has(skillId),
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("greenvale:skill-cast", (event) => {
    executeGreenvaleSkill((event as CustomEvent).detail || {});
  });
  window.addEventListener("greenvale:skill-state-request", () => dispatchSkillState());

  // QA-only position hook. It is enabled only on ?debug=1 and exists so the
  // iPhone WebKit test can reproduce "enemy visible but outside skill range".
  window.addEventListener("greenvale:debug-player-position", (event) => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    const detail = (event as CustomEvent).detail || {};
    const x = Number(detail.x);
    const y = Number(detail.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    activePlayer.teleport({ x, y });
  });
}

function getProfile(): Profile {
  const fallback: Profile = { name: "Survivor", classId: "novice", started: true, kills: 0, completed: false };
  try {
    if (typeof localStorage === "undefined") return fallback;
    const data = JSON.parse(localStorage.getItem("greenvale.profile.v1") || "null");
    if (!data || typeof data !== "object") return fallback;
    return {
      ...fallback,
      name: String(data.name || fallback.name).slice(0, 18),
      classId: CLASS_STATS[data.classId] ? data.classId : "novice",
      kills: Math.min(3, Math.max(0, Number(data.kills) || 0)),
      completed: data.completed === true,
      baseLevel: Math.max(1, Number(data.baseLevel) || 1),
      jobLevel: Math.max(1, Number(data.jobLevel) || 1),
      derived: data.derived && typeof data.derived === "object" ? data.derived : undefined,
      learnedSkills: data.learnedSkills && typeof data.learnedSkills === "object" ? data.learnedSkills : {},
      combatSettings: data.combatSettings && typeof data.combatSettings === "object" ? data.combatSettings : { autoAttack: false, autoLoot: true, targetMode: "nearest" },
      lootBag: data.lootBag && typeof data.lootBag === "object" ? data.lootBag : {},
    };
  } catch {
    return fallback;
  }
}

function saveQuestProgress(kills: number, completed: boolean) {
  try {
    if (typeof localStorage === "undefined") return;
    const profile = getProfile();
    profile.kills = Math.min(3, Math.max(0, kills));
    profile.completed = completed;
    profile.updatedAt = Date.now();
    localStorage.setItem("greenvale.profile.v1", JSON.stringify(profile));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("greenvale:progress"));
    }
  } catch (error) {
    console.warn("[Greenvale] Could not persist quest progress", error);
  }
}

function onWolfDefeated(attacker?: any) {
  if (!attacker || typeof attacker.getVariable !== "function") return;

  // EXP progression is independent from the first quest. In standalone mode the
  // server and client share the browser, so the authoritative defeat hook emits
  // a narrow event that the versioned character save consumes.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("greenvale:experience", {
      detail: { baseExp: 18, jobExp: 8, source: "ashfang_wolf" },
    }));
  }

  if (attacker.getVariable("greenvale.quest.main") !== "first-hunt") return;
  const next = Math.min(3, Number(attacker.getVariable("greenvale.quest.kills") || 0) + 1);
  attacker.setVariable("greenvale.quest.kills", next);
  attacker.addItem(WolfFang, 1);
  const done = next >= 3;
  if (done) {
    attacker.setVariable("greenvale.quest.main", "first-hunt-complete");
    attacker.gold += 25;
    attacker.addItem(GreenvaleSaber, 1);
    attacker.equip(GreenvaleSaber.id);
    void attacker.showText("เควสสำเร็จ! รอยเขี้ยวในป่า\nได้รับ 25 Gold + Greenvale Saber\nกลับไปคุยกับ Mara ที่ค่าย");
  } else if (typeof attacker.showNotification === "function") {
    void attacker.showNotification("ภารกิจแรก: กำจัด Mutant Wolf " + next + "/3");
  }
  saveQuestProgress(next, done);
}

function MutantWolf(name: string, x: number, y: number): EventDefinition {
  return {
    name,
    onInit() {
      this.setGraphic("monster");
      this.name = "Mutant Wolf";
      this.speed = 1.35;
      this.through = false;
      this.initializeDefaultStats();
      this.param[MAXHP] = 90;
      this.param[MAXSP] = 20;
      this.param[ATK] = 13;
      this.param[PDEF] = 3;
      this.hp = 90;
      this.sp = 20;
      this.addItem(WolfClaw, 1);
      this.equip(WolfClaw.id);
      this.setHitbox(34, 36);
      this.teleport({ x, y });
      // BattleAi owns the wolf nameplate and HP bar; avoid duplicate overlays.

      activeEnemies.add(this);

      (this as any).battleAi = new BattleAi(this, {
        preset: "aggressive",
        enemyType: EnemyType.Aggressive,
        faction: "mutants",
        targets: "players",
        visionRange: 230,
        attackRange: 58,
        attackCooldown: 1650,
        dodgeChance: 0.08,
        attackPatterns: [AttackPattern.Melee],
        simpleBehavior: {
          when: [
            ifTargetInRange(useAttack(AttackPattern.Melee), 58),
          ],
          otherwise: chase(),
        },
        rewards: { exp: 18, gold: 4 },
        onDefeated: ({ attacker, reward }: any) => {
          if (attacker && typeof attacker.getVariable === "function") {
            reward.giveTo(attacker);
            onWolfDefeated(attacker);
          }
        },
        presentation: {
          role: "enemy",
          name: "Mutant Wolf",
          healthBar: {
            text: "Mutant Wolf",
            style: { width: 68, height: 6, fontSize: 11 },
            layout: { width: 76, marginBottom: 10 },
          },
        },
      });
    },
  };
}

const Mara: EventDefinition = {
  name: "Mara",
  onInit() {
    this.setGraphic("hero");
    this.name = "Mara";
    this.through = false;
    this.teleport({ x: 690, y: 390 });
    this.setComponentsTop(Components.text("Mara", { fontSize: 12, fill: "#fff0bb", stroke: "#1a231a" }), { width: 72, marginBottom: 12 });
  },
  async onAction(player: RpgPlayer) {
    const kills = Number(player.getVariable("greenvale.quest.kills") || 0);
    const done = player.getVariable("greenvale.quest.main") === "first-hunt-complete";
    await player.showText(
      done
        ? "Mara: เยี่ยมมาก! ค่ายปลอดภัยขึ้นแล้ว\nเส้นทางไป Forest Route จะเปิดในอัปเดตถัดไป"
        : "Mara: ยินดีต้อนรับสู่ Greenvale Camp\nภารกิจแรก: กำจัด Mutant Wolf 3 ตัว (" + kills + "/3)",
    );
  },
};

const player = {
  async onConnected(player: RpgPlayer) {
    const profile = getProfile();
    activePlayer = player;
    player.setGraphic("hero");
    player.initializeDefaultStats();
    applyProfileToPlayer(player, profile, true);
    player.setVariable("greenvale.quest.kills", profile.kills);
    player.setVariable("greenvale.quest.main", profile.completed ? "first-hunt-complete" : "first-hunt");
    player.setHitbox(30, 38);

    const starterWeapon = STARTER_WEAPONS[profile.classId] || TrainingBlade;
    player.addItem(starterWeapon, 1);
    player.equip(starterWeapon.id);



    // Render a single lightweight label rather than a compound UI layout.
    player.setComponentsTop(Components.hpBar({ width: 64, height: 5, fontSize: 10, fillColor: "#51c77b", bgColor: "#18251c", borderColor: "#e8edda" }, "{name}  {$current}/{$max}"), { width: 86, marginBottom: 10 });

    await player.changeMap(CAMP_MAP_ID, { x: 760, y: 720 });
    // Phase 0 stability gate: skill/hotbar definitions remain registered, but we
    // do not mutate the synchronized skill state while Safari is hydrating the
    // initial player/map snapshot. Skill assignment returns in Phase 3.
  },

  onInput(player: RpgPlayer, { action }: any) {
    if (["up", "down", "left", "right"].includes(String(action))) {
      stopSkillApproach();
    }
    if (action === "escape" || action === "back") {
      void player.callMainMenu({
        menus: [
          { id: "status", label: "rpg.menu.status" },
          { id: "items", label: "rpg.menu.items" },
          { id: "skills", label: "rpg.menu.skills" },
          { id: "options", label: "rpg.menu.options" },
          { id: "exit", label: "rpg.menu.exit" },
        ],
      });
    }
  },

  onDead(player: RpgPlayer) {
    // RPGJS v5 HP setter calls onDead BEFORE writing hpSignal=0.
    // Healing synchronously here is overwritten by that final zero write.
    if (player.getVariable("greenvale.respawning")) return;
    player.setVariable("greenvale.respawning", true);
    setTimeout(() => {
      try {
        const maxHp = Number(player.param[MAXHP]);
        const maxSp = Number(player.param[MAXSP]);
        player.hp = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 165;
        player.sp = Number.isFinite(maxSp) && maxSp > 0 ? maxSp : 85;
        player.teleport({ x: 760, y: 720 });
        void player.showText("คุณหมดสติและถูกพากลับ Greenvale Camp");
      } finally {
        player.setVariable("greenvale.respawning", false);
      }
    }, 0);
  },
};

export default createServer({
  providers: [
    provideActionBattle({
      visual: createActionBattleVisual("impact"),
      animations: { attack: { animationName: "attack2", repeat: 1 } },
      combat: {
        pvp: false,
        hooks: {
          beforeHit(context: any) {
            const attacker = context.attacker as any;
            const target = context.target as any;
            if (!attacker?.battleAi || typeof target?.getVariable !== "function") return;
            const hp = Number(target.hp);
            if (!Number.isFinite(hp) || hp <= 0) return false;
            const defense = Number(target.param?.[PDEF]);
            const safeDefense = Number.isFinite(defense) ? defense : 6;
            const damage = Math.max(4, Math.min(12, Math.round(10 - safeDefense * 0.25)));
            // Provide the damage object before RPGJS resolves damage; the engine's
            // default resolveDamage must not write invalid/zero HP first.
            context.damage = { damage, raw: damage, defeated: hp <= damage };
            context.metadata = { ...context.metadata, greenvaleHpBefore: hp };
            return context;
          },
          afterDamage(context: any) {
            const attacker = context.attacker as any;
            const target = context.target as any;
            if (!attacker?.battleAi || typeof target?.getVariable !== "function") return;
            const hp = Number(context.metadata?.greenvaleHpBefore);
            const damage = Number(context.damage?.damage);
            if (!Number.isFinite(hp) || hp <= 0 || !Number.isFinite(damage)) return;
            // Apply exactly one bounded hit, using the same number as the popup.
            target.hp = Math.max(0, hp - damage);
            if (typeof window !== "undefined" && target === activePlayer) {
              window.dispatchEvent(new CustomEvent("greenvale:player-hit", {
                detail: {
                  damage,
                  hp: Number(target.hp) || 0,
                  maxHp: Number(target.param?.[MAXHP]) || 0,
                },
              }));
            }
            return context;
          },
        },
        player: {
          combo: { bufferMs: 145, resetMs: 720 },
          dodge: { durationMs: 190, cooldownMs: 650, invincibilityMs: 225, additionalSpeed: 8 },
          softTargeting: { range: 155, coneDegrees: 170, directionWeight: 0.28, distanceWeight: 0.57, threatWeight: 0.15 },
        },
      },
      ui: {
        hotbar: false,
      },
      ai: {
        presets: {
          aggressive: {
            attackRange: 62,
            visionRange: 250,
            attackCooldown: 1650,
            simpleBehavior: {
              when: [
                ifTargetInRange(useAttack(AttackPattern.Melee), 58),
              ],
              otherwise: chase(),
            },
          },
        },
      },
    }),
    provideServerModules([
      {
        database: async () => ({
          [TrainingBlade.id]: TrainingBlade,
          [HunterKnife.id]: HunterKnife,
          [MedicBlade.id]: MedicBlade,
          [GuardianSword.id]: GuardianSword,
          [BeastSpear.id]: BeastSpear,
          [EngineerCutter.id]: EngineerCutter,
          [GreenvaleSaber.id]: GreenvaleSaber,
          [WolfFang.id]: WolfFang,
          [FieldPotion.id]: FieldPotion,
          [FocusSlash.id]: FocusSlash,
          [WolfClaw.id]: WolfClaw,
        }),
        player,
        maps: [
          {
            id: CAMP_MAP_ID,
            width: CAMP_WIDTH,
            height: CAMP_HEIGHT,
            hitboxes: CAMP_HITBOXES,
            events: [
              { event: Mara },
              { event: MutantWolf("wolf-a", 1030, 420) },
              { event: MutantWolf("wolf-b", 1180, 500) },
              { event: MutantWolf("wolf-c", 980, 710) },
            ],
          } as any,
        ],
      },
    ]),
  ],
});
