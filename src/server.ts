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
import dropsData from "./data/drops.json" with { type: "json" };
import statusData from "./data/status_effects.json" with { type: "json" };
import {
  basicAttackDelayMs,
  randomQuantity,
  resolveDamage,
  rollDrop,
  type CombatStats,
} from "./core/combat.ts";
import {
  bossPhaseIndex,
  difficultyColor,
  getMonsterConfig,
  spawnEntriesForMap,
  type MonsterConfig,
} from "./core/monsters.ts";

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

const WOLF_CONFIG = (getMonsterConfig("ashfang_wolf") || {
  id: "ashfang_wolf",
  name: "Ashfang Wolf",
  nameKey: "monster.ashfang_wolf.name",
  level: 3, hp: 90, atk: 13, def: 3, mdef: 1, hit: 12, flee: 8, moveSpeed: 1.35,
  element: "neutral", size: "medium", race: "beast", baseExp: 18, jobExp: 8,
  visionRange: 230, attackRange: 58, ai: "aggressive", skills: [], dropTableId: "ashfang_wolf",
  sprite: "placeholder_wolf", sound: "placeholder_wolf", respawnMs: 8000,
  crit: 3, critResistance: 1, perfectDodge: 1, blockChance: 2, blockReduction: .35,
  aggro: { memoryMs: 5000, leashRange: 420, assistRadius: 90 },
  basicAttack: { element: "neutral", statusEffect: { id: "bleed", chance: .12, durationMs: 4000 } },
  autoLootRadius: 120,
}) as MonsterConfig;

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

function monsterConfigForEntity(entity: any): MonsterConfig {
  return ((entity as any)?.greenvaleMonsterConfig as MonsterConfig) || WOLF_CONFIG;
}

function monsterCombatStats(source: any = WOLF_CONFIG): CombatStats {
  const config = ((source as any)?.greenvaleMonsterConfig || source || WOLF_CONFIG) as MonsterConfig;
  return {
    ATK: Number(config.atk) || 1,
    MATK: Math.max(1, (Number(config.atk) || 1) * .7),
    DEF: Number(config.def) || 0,
    MDEF: Number(config.mdef) || 0,
    HIT: Number(config.hit) || 1,
    FLEE: Number(config.flee) || 0,
    CRIT: Number(config.crit) || 0,
    critResistance: Number(config.critResistance) || 0,
    perfectDodge: Number(config.perfectDodge) || 0,
    blockChance: Number(config.blockChance) || 0,
    blockReduction: Number(config.blockReduction) || 0,
    element: String(config.element || "neutral") as any,
    size: String(config.size || "medium") as any,
    race: String(config.race || "beast") as any,
  };
}

function wolfCombatStats(): CombatStats {
  return monsterCombatStats(WOLF_CONFIG);
}


let activePlayer: RpgPlayer | null = null;
let activeMap: any | null = null;
const activeEnemies = new Set<any>();
const monsterEventPool = new Set<any>();
const SKILL_RANGE_TOLERANCE = 8;
const BASIC_ATTACK_RANGE_TOLERANCE = 3;

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
  const config = monsterConfigForEntity(target);
  const maxHp = Math.max(1, Number(target?.param?.[MAXHP]) || Number(config.hp) || 1);
  const hp = entityNumber(target, "hp");
  const phase = bossPhaseIndex(config, hp, maxHp);
  dispatchCombat("greenvale:target-state", {
    target: {
      id: combatEventId(target),
      monsterId: config.id,
      name: String(config.name || target?.name || "Target"),
      nameKey: config.nameKey,
      level: Number(config.level) || 1,
      hp,
      maxHp,
      distance: Math.round(combatDistance(activePlayer, target)),
      element: config.element || "neutral",
      size: config.size || "medium",
      race: config.race || "beast",
      ai: config.ai || "aggressive",
      difficultyColor: difficultyColor(Number(getProfile().baseLevel) || 1, Number(config.level) || 1),
      boss: !!config.boss,
      phase,
    },
  });
  if (config.boss?.bar) {
    dispatchCombat("greenvale:boss-state", {
      active: true,
      monsterId: config.id,
      name: String(config.name || target?.name || config.id),
      nameKey: config.nameKey,
      hp,
      maxHp,
      phase,
    });
  }
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
      const config = monsterConfigForEntity(target);
      if (config.ai === "assist" && activePlayer) {
        const assistRadius = Math.max(0, Number(config.aggro?.assistRadius) || 0);
        for (const ally of activeEnemies) {
          if (ally === target || entityNumber(ally, "hp") <= 0) continue;
          if (combatDistance(target, ally) > assistRadius) continue;
          ally.battleAi?.handleDamage?.(activePlayer, {
            damage: 0,
            defeated: false,
            raw: { damage: 0, outcome: "assist" },
            metadata: { greenvaleAssistAggro: true },
          });
        }
      }
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
    maxHp: Math.max(1, Number(target?.param?.[MAXHP]) || Number(monsterConfigForEntity(target).hp) || 1),
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
  const targetRange = Math.max(12, Number(profile.derived?.attackRange) || 18);
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
    if (distance <= targetRange + BASIC_ATTACK_RANGE_TOLERANCE) {
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

  const range = Math.max(12, Number(profile.derived?.attackRange) || 18);
  const distance = combatDistance(activePlayer, target);
  if (distance > range + BASIC_ATTACK_RANGE_TOLERANCE) {
    if (!approached) startBasicApproach(target);
    return;
  }

  const delay = basicAttackDelayMs(Number(profile.derived?.ASPD) || 1);
  const now = Date.now();
  if (now - lastBasicAttackAt < delay) return;
  lastBasicAttackAt = now;

  const result = resolveDamage(
    profileCombatStats(profile),
    monsterCombatStats(target),
    {
      kind: "physical",
      powerPercent: 100,
      element: "neutral",
      weaponType: classWeaponType(profile.classId),
      targetSize: String(monsterConfigForEntity(target).size || "medium") as any,
      targetRace: String(monsterConfigForEntity(target).race || "beast") as any,
    },
  );
  applyEnemyCombatDamage(target, result, { source, attackType: "basic", distance: Math.round(distance), range });
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
    maxHp: Math.max(1, Number(target?.param?.[MAXHP]) || Number(monsterConfigForEntity(target).hp) || 1),
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
        damage = Math.max(1, Math.round((Number(target?.param?.[MAXHP]) || Number(monsterConfigForEntity(target).hp) || 1) * Number(def.tickValue) / 100));
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
          monsterCombatStats(target),
          {
            kind: skill.formula === "magical_basic" ? "magical" : "physical",
            powerPercent: percent,
            element: String(skill.element || "neutral") as any,
            weaponType: classWeaponType(profile.classId),
            targetSize: String(monsterConfigForEntity(target).size || "medium") as any,
            targetRace: String(monsterConfigForEntity(target).race || "beast") as any,
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
  window.addEventListener("greenvale:basic-attack", () => executeBasicAttack("manual"));
  window.addEventListener("greenvale:target-cycle", () => cycleCombatTarget());
  window.addEventListener("greenvale:combat-state-request", () => {
    dispatchTargetState();
    dispatchPlayerStatuses();
  });

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
  window.addEventListener("greenvale:debug-nearest-enemy-hp", (event) => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    const target = enemyCandidates(activePlayer)[0]?.event;
    if (!target) return;
    const hp = Math.max(1, Math.floor(Number((event as CustomEvent).detail?.hp) || 1));
    target.hp = hp;
    lockedTarget = target;
    dispatchTargetState(target);
  });
  window.addEventListener("greenvale:debug-target-monster", (event) => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    const monsterId = String((event as CustomEvent).detail?.monsterId || "");
    const target = Array.from(monsterEventPool).find((entry: any) =>
      monsterConfigForEntity(entry).id === monsterId && entityNumber(entry, "hp") > 0
    );
    if (!target) {
      dispatchCombat("greenvale:debug-monster-target-result", { ok: false, monsterId, poolSize: monsterEventPool.size });
      return;
    }
    const config = monsterConfigForEntity(target);
    if (config.miniBoss && !(target as any).greenvaleSpawnActive) (target as any).greenvaleActivate?.();
    lockedTarget = target;
    dispatchTargetState(target);
    dispatchCombat("greenvale:debug-monster-target-result", {
      ok: true,
      monsterId: config.id,
      boss: !!config.boss,
      hp: entityNumber(target, "hp"),
    });
  });
  window.addEventListener("greenvale:debug-spawn-monster", (event) => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    const detail = (event as CustomEvent).detail || {};
    const monsterId = String(detail.monsterId || "");
    const config = getMonsterConfig(monsterId);
    const map = activeMap ?? activePlayer.getCurrentMap?.();
    if (!config || !map?.createDynamicEvent) {
      dispatchCombat("greenvale:debug-monster-spawn-result", { ok: false, monsterId });
      return;
    }
    const x = Number.isFinite(Number(detail.x)) ? Number(detail.x) : entityCoord(activePlayer, "x") + 90;
    const y = Number.isFinite(Number(detail.y)) ? Number(detail.y) : entityCoord(activePlayer, "y");
    const id = `qa-${monsterId}-${Date.now()}`;
    void Promise.resolve(map.createDynamicEvent({
      id,
      x,
      y,
      event: GreenvaleMonster(id, monsterId, x, y, 0),
    })).then(() => {
      dispatchCombat("greenvale:debug-monster-spawn-result", { ok: true, monsterId, id });
    }).catch((error: unknown) => {
      console.warn("[Greenvale] debug monster spawn failed", monsterId, error);
      dispatchCombat("greenvale:debug-monster-spawn-result", { ok: false, monsterId, error: String(error) });
    });
  });
  window.addEventListener("greenvale:debug-activate-miniboss", (event) => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const monsterId = String((event as CustomEvent).detail?.monsterId || "marrowtusk");
    const target = Array.from((globalThis as any).__GV_MINIBOSSES__ || []).find((entry: any) => monsterConfigForEntity(entry).id === monsterId);
    target?.greenvaleActivate?.();
  });
  window.addEventListener("greenvale:debug-monster-count", () => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const counts: Record<string, number> = {};
    for (const enemy of activeEnemies) {
      if (entityNumber(enemy, "hp") <= 0) continue;
      const id = monsterConfigForEntity(enemy).id;
      counts[id] = (counts[id] || 0) + 1;
    }
    dispatchCombat("greenvale:debug-monster-count-result", {
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
      counts,
    });
  });
  window.addEventListener("greenvale:debug-force-loot", () => {
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    dispatchCombat("greenvale:loot-drop", {
      sourceId: "debug",
      sourceName: "QA",
      drops: [{ itemId: "ashfang_fang", quantity: 1 }],
      autoLootRadius: 120,
    });
  });
  window.addEventListener("greenvale:debug-player-kill", () => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    activePlayer.hp = 0;
  });
  window.addEventListener("greenvale:debug-player-status", (event) => {
    if (!activePlayer || !new URLSearchParams(window.location.search).has("debug")) return;
    const detail = (event as CustomEvent).detail || {};
    applyPlayerStatus(String(detail.id || "bleed"), Number(detail.durationMs) || 1200, Number(detail.sourceLevel) || 1);
  });
  window.setInterval(() => {
    if (!activePlayer || Number(activePlayer.hp) <= 0) return;
    const profile = getProfile();
    if (profile.combatSettings?.autoAttack === true) {
      executeBasicAttack("auto");
    }
  }, 240);

  window.setInterval(() => {
    if (!activePlayer) return;
    for (const enemy of activeEnemies) {
      const config = monsterConfigForEntity(enemy);
      const maxHp = Math.max(1, Number(config.hp) || 1);
      const hp = entityNumber(enemy, "hp");
      if (config.ai === "coward" && hp > 0 && hp / maxHp <= Math.max(.05, Number(config.cowardThreshold) || .25)) {
        const ex = entityCoord(enemy, "x");
        const ey = entityCoord(enemy, "y");
        const px = entityCoord(activePlayer, "x");
        const py = entityCoord(activePlayer, "y");
        const dx = ex - px;
        const dy = ey - py;
        const len = Math.max(1, Math.hypot(dx, dy));
        try {
          enemy.teleport({
            x: Math.max(24, Math.min(CAMP_WIDTH - 24, ex + dx / len * 12)),
            y: Math.max(24, Math.min(CAMP_HEIGHT - 24, ey + dy / len * 12)),
          });
        } catch {}
      }
      if (config.boss?.bar && lockedTarget === enemy && hp > 0) {
        dispatchCombat("greenvale:boss-state", {
          active: true,
          monsterId: config.id,
          name: String(config.name || config.id),
          nameKey: config.nameKey,
          hp,
          maxHp,
          phase: bossPhaseIndex(config, hp, maxHp),
        });
      }
    }
  }, 420);
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

function rollMonsterLoot(config: MonsterConfig) {
  const table = (dropsData.dropTables as any[]).find((entry) => entry.id === config.dropTableId);
  if (!table) return;
  const drops: Array<{ itemId: string; quantity: number }> = [];
  const rolls = Math.max(1, Math.floor(Number(table.rolls) || 1));
  for (let rollIndex = 0; rollIndex < rolls; rollIndex++) {
    for (const entry of table.entries || []) {
      if (!rollDrop(Number(entry.chance) || 0)) continue;
      const quantity = randomQuantity(Number(entry.min) || 1, Number(entry.max) || 1);
      if (quantity > 0) drops.push({ itemId: String(entry.itemId), quantity });
    }
  }
  if (!drops.length) return;
  dispatchCombat("greenvale:loot-drop", {
    sourceId: config.id,
    sourceName: String(config.name || config.id),
    drops,
    autoLootRadius: Number(config.autoLootRadius) || Number((dropsData as any).settings?.autoLootRadius) || 120,
  });
}

function scheduleMonsterRespawn(entity: any, config: MonsterConfig) {
  const spawn = entity?.greenvaleSpawn;
  if (!spawn) return;

  // BattleAi removes defeated RPGJS events after the death presentation.
  // Never resurrect that same synchronized object: on iPhone Safari it can
  // become a stale proxy after map.removeEvent(), which surfaced as JS ERROR
  // "removeEvent". Re-create the fixed spawn slot instead.
  const map = entity?.getCurrentMap?.() ?? activePlayer?.getCurrentMap?.();
  activeEnemies.delete(entity);
  monsterEventPool.delete(entity);
  const miniPool = (globalThis as any).__GV_MINIBOSSES__ as Set<any> | undefined;
  miniPool?.delete(entity);

  if (!map?.createDynamicEvent) return;

  const delay = config.miniBoss
    ? 2200
    : Math.max(1000, Number(config.respawnMs) || 8000);

  const recreate = async (attempt = 0) => {
    try {
      // A delayed death transition can keep the old id alive briefly.
      // Retry instead of touching the removed event instance.
      if (map.getEvent?.(spawn.eventName)) {
        if (attempt < 4) window.setTimeout(() => void recreate(attempt + 1), 750);
        return;
      }
      await map.createDynamicEvent({
        id: spawn.eventName,
        x: spawn.x,
        y: spawn.y,
        event: GreenvaleMonster(spawn.eventName, config.id, spawn.x, spawn.y, spawn.spawnIndex),
      });
    } catch (error) {
      console.warn("[Greenvale] monster respawn recreate failed", config.id, error);
    }
  };

  window.setTimeout(() => void recreate(), delay);
}

function onMonsterDefeated(entity: any, attacker?: any) {
  const config = monsterConfigForEntity(entity);
  activeEnemies.delete(entity);
  monsterEventPool.delete(entity);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("greenvale:experience", {
      detail: { baseExp: Number(config.baseExp) || 0, jobExp: Number(config.jobExp) || 0, source: config.id },
    }));
    dispatchCombat("greenvale:monster-defeated", {
      monsterId: config.id,
      name: String(config.name || config.id),
      level: Number(config.level) || 1,
      boss: !!config.boss,
    });
    if (config.boss?.bar) {
      dispatchCombat("greenvale:boss-state", { active: false, monsterId: config.id, hp: 0, maxHp: Number(config.hp) || 1 });
    }
  }
  rollMonsterLoot(config);
  if (lockedTarget === entity) {
    lockedTarget = null;
    dispatchTargetState(null);
  }

  if (config.id === "ashfang_wolf" && attacker && typeof attacker.getVariable === "function" && attacker.getVariable("greenvale.quest.main") === "first-hunt") {
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
      void attacker.showNotification("ภารกิจแรก: กำจัด Ashfang Wolf " + next + "/3");
    }
    saveQuestProgress(next, done);
  }
  scheduleMonsterRespawn(entity, config);
}

function monsterAttackCooldown(config: MonsterConfig): number {
  if (config.ai === "ranged") return 1950;
  if (config.ai === "boss") return 1450;
  if (config.ai === "coward") return 1750;
  return Math.max(1200, 1850 - Math.round((Number(config.moveSpeed) || 1) * 140));
}

function attachMonsterAi(entity: any, config: MonsterConfig) {
  const passive = config.ai === "passive";
  const ranged = config.ai === "ranged";
  const attackRange = Math.max(42, Number(config.attackRange) || 58);
  entity.battleAi = new BattleAi(entity, {
    preset: "aggressive",
    enemyType: EnemyType.Aggressive,
    faction: "mutants",
    targets: "players",
    visionRange: passive ? 1 : Math.max(60, Number(config.visionRange) || 180),
    attackRange,
    attackCooldown: monsterAttackCooldown(config),
    dodgeChance: Math.max(0, Math.min(.35, Number(config.perfectDodge || 0) / 100)),
    attackPatterns: [AttackPattern.Melee],
    simpleBehavior: {
      when: [ifTargetInRange(useAttack(AttackPattern.Melee), ranged ? attackRange + 4 : attackRange)],
      otherwise: chase(),
    },
    rewards: { exp: Number(config.baseExp) || 0, gold: Math.max(1, Math.round((Number(config.level) || 1) * .8)) },
    onDefeated: ({ attacker, reward }: any) => {
      if (attacker && typeof attacker.getVariable === "function") reward.giveTo(attacker);
      onMonsterDefeated(entity, attacker);
    },
    presentation: {
      role: "enemy",
      name: String(config.name || config.id),
      healthBar: {
        text: String(config.name || config.id),
        style: { width: config.boss ? 92 : 68, height: config.boss ? 8 : 6, fontSize: config.boss ? 12 : 11 },
        layout: { width: config.boss ? 104 : 76, marginBottom: 10 },
      },
    },
  });
}

function activateMiniBoss(entity: any, config: MonsterConfig) {
  const spawn = entity?.greenvaleSpawn;
  if (!spawn || entity?.greenvaleSpawnActive) return;
  entity.greenvaleSpawnActive = true;
  entity.through = false;
  entity.hp = Math.max(1, Number(config.hp) || 1);
  entity.teleport({ x: spawn.x, y: spawn.y });
  activeEnemies.add(entity);
  attachMonsterAi(entity, config);
  dispatchCombat("greenvale:monster-announce", { monsterId: config.id, name: String(config.name || config.id), nameKey: config.nameKey });
}

function scheduleMiniBoss(entity: any, config: MonsterConfig) {
  const min = Math.max(60_000, Number(config.miniBoss?.randomSpawnMinMs) || 1_800_000);
  const max = Math.max(min, Number(config.miniBoss?.randomSpawnMaxMs) || 3_600_000);
  const delay = min + Math.floor(Math.random() * (max - min + 1));
  window.setTimeout(() => activateMiniBoss(entity, config), delay);
}

function GreenvaleMonster(eventName: string, monsterId: string, x: number, y: number, spawnIndex = 0): EventDefinition {
  const config = getMonsterConfig(monsterId) || WOLF_CONFIG;
  return {
    name: eventName,
    onInit() {
      const entity = this as any;
      activeMap = entity.getCurrentMap?.() ?? activeMap;
      monsterEventPool.add(entity);
      entity.greenvaleMonsterConfig = config;
      entity.greenvaleSpawn = { x, y, spawnIndex, eventName };
      entity.greenvaleSpawnActive = !config.miniBoss;
      entity.setGraphic("monster");
      entity.name = String(config.name || config.id);
      entity.speed = Math.max(.4, Number(config.moveSpeed) || 1);
      entity.through = false;
      entity.initializeDefaultStats();
      entity.param[MAXHP] = Math.max(1, Number(config.hp) || 1);
      entity.param[MAXSP] = 20;
      entity.param[ATK] = Math.max(1, Number(config.atk) || 1);
      entity.param[PDEF] = Math.max(0, Number(config.def) || 0);
      entity.hp = Math.max(1, Number(config.hp) || 1);
      entity.sp = 20;
      entity.addItem(WolfClaw, 1);
      entity.equip(WolfClaw.id);
      entity.setHitbox(config.size === "large" ? 42 : config.size === "small" ? 28 : 34, config.size === "large" ? 44 : 36);

      if (config.miniBoss) {
        entity.through = true;
        entity.teleport({ x: -180, y: -180 });
        entity.greenvaleActivate = () => activateMiniBoss(entity, config);
        const pool = ((globalThis as any).__GV_MINIBOSSES__ ||= new Set<any>());
        pool.add(entity);
        scheduleMiniBoss(entity, config);
        return;
      }

      entity.teleport({ x, y });
      activeEnemies.add(entity);
      attachMonsterAi(entity, config);
    },
  };
}

const PHASE5_SPAWNS = spawnEntriesForMap(CAMP_MAP_ID);

const Mara: EventDefinition = {
  name: "Mara",
  onInit() {
    activeMap = (this as any).getCurrentMap?.() ?? activeMap;
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
        : "Mara: ยินดีต้อนรับสู่ Greenvale Camp\nภารกิจแรก: กำจัด Ashfang Wolf 3 ตัว (" + kills + "/3)",
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
      stopBasicApproach();
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
    // The HP setter completes after onDead, so revive must remain asynchronous.
    if (player.getVariable("greenvale.respawning")) return;
    player.setVariable("greenvale.respawning", true);
    player.setVariable("greenvale.invulnerable", true);
    stopSkillApproach();
    stopBasicApproach();
    lockedTarget = null;
    dispatchTargetState(null);
    dispatchCombat("greenvale:player-dead", { respawnMs: 1800 });
    for (const id of Array.from(playerStatuses.keys())) clearPlayerStatus(id);

    setTimeout(() => {
      try {
        const maxHp = Number(player.param[MAXHP]);
        const maxSp = Number(player.param[MAXSP]);
        player.hp = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 165;
        player.sp = Number.isFinite(maxSp) && maxSp > 0 ? maxSp : 85;
        player.teleport({ x: 760, y: 720 });
        dispatchCombat("greenvale:player-respawn", {
          hp: Number(player.hp) || 0,
          maxHp: Number(player.param[MAXHP]) || 0,
          invulnerableMs: 2200,
        });
      } finally {
        player.setVariable("greenvale.respawning", false);
        setTimeout(() => player.setVariable("greenvale.invulnerable", false), 2200);
      }
    }, 1800);
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
            const hp = Number(target?.hp);
            if (!Number.isFinite(hp) || hp <= 0) return false;

            if (attacker === activePlayer && target?.battleAi) {
              const profile = getProfile();
              const targetConfig = monsterConfigForEntity(target);
              const result = resolveDamage(
                profileCombatStats(profile),
                monsterCombatStats(target),
                {
                  kind: "physical",
                  powerPercent: 100,
                  element: "neutral",
                  weaponType: classWeaponType(profile.classId),
                  targetSize: String(targetConfig.size || "medium") as any,
                  targetRace: String(targetConfig.race || "beast") as any,
                },
              );
              lockedTarget = target;
              if (result.outcome === "miss" || result.outcome === "perfect-dodge") {
                dispatchCombat("greenvale:combat-result", {
                  direction: "outgoing",
                  outcome: result.outcome,
                  damage: 0,
                  attackType: "basic",
                  targetId: combatEventId(target),
                  targetName: String(target?.name || "Ashfang Wolf"),
                  hp,
                  maxHp: Number(target.param?.[MAXHP]) || Number(monsterConfigForEntity(target).hp) || 1,
                });
                dispatchTargetState(target);
                return false;
              }
              context.damage = { damage: result.damage, raw: result.raw, defeated: hp <= result.damage };
              context.metadata = {
                ...context.metadata,
                greenvaleDirection: "outgoing",
                greenvaleHpBefore: hp,
                greenvaleCombatResult: result,
              };
              return context;
            }

            if (attacker?.battleAi && typeof target?.getVariable === "function") {
              if (target.getVariable("greenvale.invulnerable")) return false;
              const attackerConfig = monsterConfigForEntity(attacker);
              const result = resolveDamage(
                monsterCombatStats(attacker),
                profileCombatStats(getProfile()),
                {
                  kind: "physical",
                  powerPercent: 100,
                  element: String(attackerConfig.basicAttack?.element || attackerConfig.element || "neutral") as any,
                  targetSize: "medium",
                  targetRace: "human",
                },
              );
              if (result.outcome === "miss" || result.outcome === "perfect-dodge") {
                dispatchCombat("greenvale:combat-result", {
                  direction: "incoming",
                  outcome: result.outcome,
                  damage: 0,
                  attackType: "basic",
                  attackerName: String(monsterConfigForEntity(attacker).name || attacker?.name || "Monster"),
                  hp,
                  maxHp: Number(target.param?.[MAXHP]) || 0,
                });
                return false;
              }
              context.damage = { damage: result.damage, raw: result.raw, defeated: hp <= result.damage };
              context.metadata = {
                ...context.metadata,
                greenvaleDirection: "incoming",
                greenvaleHpBefore: hp,
                greenvaleCombatResult: result,
              };
              return context;
            }
          },
          afterDamage(context: any) {
            const attacker = context.attacker as any;
            const target = context.target as any;
            const hp = Number(context.metadata?.greenvaleHpBefore);
            const result = context.metadata?.greenvaleCombatResult;
            const direction = context.metadata?.greenvaleDirection;
            const damage = Number(context.damage?.damage);
            if (!direction || !Number.isFinite(hp) || hp <= 0 || !Number.isFinite(damage)) return;

            target.hp = Math.max(0, hp - damage);

            if (direction === "outgoing" && attacker === activePlayer && target?.battleAi) {
              lockedTarget = target;
              dispatchCombat("greenvale:combat-result", {
                direction: "outgoing",
                outcome: result?.outcome || "hit",
                damage,
                attackType: "basic",
                targetId: combatEventId(target),
                targetName: String(target?.name || "Ashfang Wolf"),
                hp: Number(target.hp) || 0,
                maxHp: Number(target.param?.[MAXHP]) || Number(monsterConfigForEntity(target).hp) || 1,
                elementMultiplier: result?.elementMultiplier ?? 1,
                sizeMultiplier: result?.sizeMultiplier ?? 1,
                raceMultiplier: result?.raceMultiplier ?? 1,
              });
              dispatchTargetState(Number(target.hp) > 0 ? target : null);
              return context;
            }

            if (direction === "incoming" && target === activePlayer) {
              dispatchCombat("greenvale:combat-result", {
                direction: "incoming",
                outcome: result?.outcome || "hit",
                damage,
                attackType: "basic",
                attackerName: String(monsterConfigForEntity(attacker).name || attacker?.name || "Monster"),
                hp: Number(target.hp) || 0,
                maxHp: Number(target.param?.[MAXHP]) || 0,
              });
              window.dispatchEvent(new CustomEvent("greenvale:player-hit", {
                detail: {
                  damage,
                  hp: Number(target.hp) || 0,
                  maxHp: Number(target.param?.[MAXHP]) || 0,
                  outcome: result?.outcome || "hit",
                },
              }));
              const attackerConfig = monsterConfigForEntity(attacker);
              const status = attackerConfig.basicAttack?.statusEffect;
              if (status?.id && Math.random() < Number(status.chance || 0)) {
                applyPlayerStatus(String(status.id), Number(status.durationMs) || undefined, Number(attackerConfig.level) || 1);
              }
              return context;
            }
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
              ...PHASE5_SPAWNS.map((spawn) => ({
                event: GreenvaleMonster(spawn.eventName, spawn.monsterId, spawn.x, spawn.y, spawn.spawnIndex),
              })),
            ],
          } as any,
        ],
      },
    ]),
  ],
});
