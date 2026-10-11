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
import statusEffectsData from "./data/status_effects.json" with { type: "json" };
import { combatConfig, calculateThreat, randomInt, resolveCombatHit, rollChance, type AttackKind, type CombatantStats } from "./core/combat.ts";

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
    HIT?: number;
    FLEE?: number;
    perfectDodge?: number;
    CRIT?: number;
    critResistance?: number;
    BLOCK?: number;
    blockReduction?: number;
    MaxHP?: number;
    MaxSP?: number;
    ASPD?: number;
    attackRange?: number;
  };
  learnedSkills?: Record<string, number>;
  combatSettings?: {
    autoAttack?: boolean;
    autoLoot?: boolean;
    autoLootRadius?: number;
  };
  lootInventory?: Record<string, number>;
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

let activePlayer: RpgPlayer | null = null;
const activeEnemies = new Set<any>();
const SKILL_RANGE_TOLERANCE = 8;

const ASHFANG_CONFIG = (monstersData.monsters as any[]).find((entry) => entry.id === "ashfang_wolf")!;
const ASHFANG_DROP_TABLE = (dropsData.dropTables as any[]).find((entry) => entry.id === "ashfang_wolf")!;
const STATUS_CONFIG = new Map((statusEffectsData.statuses as any[]).map((entry) => [entry.id, entry]));

const AshfangFangDrop = {
  id: "ashfang_fang",
  name: "Ashfang Fang",
  description: "เขี้ยวแข็งของหมาป่า Ashfang",
  price: 7,
  _type: "item" as const,
};

const FieldPatchDrop = {
  id: "field_patch",
  name: "Field Patch",
  description: "แผ่นปฐมพยาบาลฉุกเฉิน ฟื้น HP ได้ในระบบไอเทมถัดไป",
  price: 18,
  _type: "item" as const,
};

const DROP_ITEM_DEFINITIONS: Record<string, any> = {
  ashfang_fang: AshfangFangDrop,
  field_patch: FieldPatchDrop,
};

type PendingLoot = {
  token: string;
  items: Array<{ itemId: string; quantity: number }>;
  gold: number;
  x: number;
  y: number;
  expiresAt: number;
};

const pendingLoot = new Map<string, PendingLoot>();
const enemyThreat = new WeakMap<any, number>();
const activeStatuses = new WeakMap<any, Map<string, {
  id: string;
  stacks: number;
  expiresAt: number;
  originalSpeed?: number;
  interval?: number;
  timeout?: number;
}>>();
let pendingPlayerAttackContext: { skill?: any; level?: number; source?: string } | null = null;
let lastAutoAttackAt = 0;

function profileCombatStats(profile = getProfile()): CombatantStats {
  const derived = profile.derived || {};
  return {
    ATK: Math.max(1, Number(derived.ATK) || 10),
    MATK: Math.max(1, Number(derived.MATK) || Number(derived.ATK) || 10),
    DEF: Math.max(0, Number(derived.DEF) || 0),
    MDEF: Math.max(0, Number(derived.MDEF) || 0),
    HIT: Math.max(1, Number(derived.HIT) || (Number(profile.baseLevel) || 1) + 1),
    FLEE: Math.max(1, Number(derived.FLEE) || (Number(profile.baseLevel) || 1) + 1),
    perfectDodge: Math.max(0, Number(derived.perfectDodge) || 0),
    CRIT: Math.max(0, Number(derived.CRIT) || 1),
    critResistance: Math.max(0, Number(derived.critResistance) || 0),
    BLOCK: Math.max(0, Number(derived.BLOCK) || 0),
    blockReduction: Number(derived.blockReduction) || Number(combatConfig.blockDamageMultiplier) || .45,
    MaxHP: Math.max(1, Number(derived.MaxHP) || 100),
    MaxSP: Math.max(1, Number(derived.MaxSP) || 40),
    element: "neutral",
    size: "medium",
    race: "human",
  };
}

function monsterCombatStats(event: any): CombatantStats {
  const config = event?.__greenvaleMonsterConfig || ASHFANG_CONFIG;
  return {
    ATK: Math.max(1, Number(config.atk) || 1),
    MATK: Math.max(1, Number(config.matk) || Math.floor((Number(config.atk) || 1) * .65)),
    DEF: Math.max(0, Number(config.def) || 0),
    MDEF: Math.max(0, Number(config.mdef) || 0),
    HIT: Math.max(1, Number(config.hit) || Number(config.level) + 8),
    FLEE: Math.max(0, Number(config.flee) || 0),
    perfectDodge: Math.max(0, Number(config.perfectDodge) || 0),
    CRIT: Math.max(0, Number(config.crit) || 0),
    critResistance: Math.max(0, Number(config.critResistance) || 0),
    BLOCK: Math.max(0, Number(config.block) || 0),
    blockReduction: Number(config.blockReduction) || Number(combatConfig.blockDamageMultiplier) || .45,
    MaxHP: Math.max(1, Number(config.hp) || 1),
    MaxSP: Math.max(0, Number(config.sp) || 0),
    element: String(config.element || "neutral") as any,
    size: String(config.size || "medium") as any,
    race: String(config.race || "beast") as any,
  };
}

function dispatchCombatEvent(detail: Record<string, any>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("greenvale:combat-event", { detail }));
}

function setTargetHud(target: any | null, extra: Record<string, any> = {}) {
  if (typeof window === "undefined") return;
  if (!target) {
    window.dispatchEvent(new CustomEvent("greenvale:target", { detail: { active: false, ...extra } }));
    return;
  }
  const config = target.__greenvaleMonsterConfig || ASHFANG_CONFIG;
  window.dispatchEvent(new CustomEvent("greenvale:target", {
    detail: {
      active: true,
      id: String(target.id || config.id || "enemy"),
      name: String(target.name || "Enemy"),
      hp: Math.max(0, entityNumber(target, "hp")),
      maxHp: Math.max(1, entityNumber(target, "param") ? Number(target.param?.[MAXHP]) || Number(config.hp) : Number(config.hp)),
      level: Number(config.level) || 1,
      element: String(config.element || "neutral"),
      race: String(config.race || "beast"),
      size: String(config.size || "medium"),
      statuses: Array.from(activeStatuses.get(target)?.keys() || []),
      threat: enemyThreat.get(target) || 0,
      ...extra,
    },
  }));
}

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

function clearCombatStatus(target: any, statusId: string) {
  const map = activeStatuses.get(target);
  const current = map?.get(statusId);
  if (!current) return;
  if (current.interval) window.clearInterval(current.interval);
  if (current.timeout) window.clearTimeout(current.timeout);
  if (current.originalSpeed !== undefined && target) target.speed = current.originalSpeed;
  map?.delete(statusId);
  setTargetHud(target);
  dispatchCombatEvent({ type: "status-end", targetName: String(target?.name || "Target"), statusId });
}

function applyStatus(target: any, skill: any, level: number) {
  const ref = skill.statusEffect;
  if (!ref) return;
  const config = STATUS_CONFIG.get(String(ref.id)) as any;
  if (!config) return;

  const targetConfig = target?.__greenvaleMonsterConfig || {};
  const resist = Math.max(0, Math.min(.9, Number(targetConfig.statusResist?.[config.id]) || 0));
  const chance = Math.max(0, Math.min(1, Number(ref.chance ?? 1) * (1 - resist)));
  if (!rollChance(chance)) return;

  let map = activeStatuses.get(target);
  if (!map) {
    map = new Map();
    activeStatuses.set(target, map);
  }

  const existing = map.get(config.id);
  const maxStacks = Math.max(1, Number(config.maxStacks) || 1);
  const stacks = config.stacking === "stack"
    ? Math.min(maxStacks, (existing?.stacks || 0) + 1)
    : 1;
  if (existing) clearCombatStatus(target, config.id);

  const duration = Math.max(100, Number(ref.durationMs) || Number(config.durationMs) || 1000);
  const state: any = {
    id: config.id,
    stacks,
    expiresAt: Date.now() + duration,
  };

  const effect = config.effect || {};
  if (effect.kind === "speed_multiplier" || effect.kind === "stun") {
    const speed = Math.max(.1, Number(target.speed) || 1);
    state.originalSpeed = speed;
    target.speed = effect.kind === "stun" ? 0 : Math.max(.25, speed * Number(effect.value || .55));
  }

  const tickMs = Math.max(0, Number(config.tickMs) || 0);
  if (tickMs > 0 && ["dot_max_hp", "dot_source_atk", "dot_source_matk", "hot_max_hp"].includes(String(effect.kind))) {
    state.interval = window.setInterval(() => {
      if (!target || entityNumber(target, "hp") <= 0) return;
      const source = profileCombatStats();
      const maxHp = target === activePlayer
        ? Math.max(1, Number(activePlayer?.param[MAXHP]) || source.MaxHP || 1)
        : Math.max(1, Number(target.param?.[MAXHP]) || Number(targetConfig.hp) || 1);
      let amount = 1;
      if (effect.kind === "dot_max_hp") amount = Math.max(1, Math.round(maxHp * Number(effect.value || .01) * stacks));
      if (effect.kind === "dot_source_atk") amount = Math.max(1, Math.round(source.ATK * Number(effect.value || .08) * stacks));
      if (effect.kind === "dot_source_matk") amount = Math.max(1, Math.round(source.MATK * Number(effect.value || .1) * stacks));
      if (effect.kind === "hot_max_hp") {
        amount = Math.max(1, Math.round(maxHp * Number(effect.value || .02) * stacks));
        target.hp = Math.min(maxHp, entityNumber(target, "hp") + amount);
        dispatchCombatEvent({ type: "status-heal", statusId: config.id, amount, targetName: String(target.name || "Target") });
        setTargetHud(target);
        return;
      }
      const before = entityNumber(target, "hp");
      target.hp = Math.max(0, before - amount);
      dispatchCombatEvent({
        type: "status-damage",
        statusId: config.id,
        damage: amount,
        outcome: "dot",
        targetName: String(target.name || "Target"),
        hp: entityNumber(target, "hp"),
        maxHp,
      });
      setTargetHud(target);
    }, tickMs);
  }

  state.timeout = window.setTimeout(() => clearCombatStatus(target, config.id), duration);
  map.set(config.id, state);
  setTargetHud(target);
  dispatchCombatEvent({
    type: "status-start",
    statusId: config.id,
    stacks,
    durationMs: duration,
    targetName: String(target?.name || "Target"),
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
    const targets = enemyEvents(activePlayer, targetRange);
    if (targets.length === 0) {
      // Mobile MMORPG assist: pressing an offensive skill without a selected
      // target acquires the nearest visible enemy and walks into legal range.
      // Damage is still applied only after the authoritative range check passes.
      const nearest = enemyCandidates(activePlayer)[0];
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
      const before = entityNumber(target, "hp");
      if (percent > 0) {
        if (target.battleAi?.takeDamage) {
          pendingPlayerAttackContext = { skill, level, source };
          try {
            target.battleAi.takeDamage(activePlayer);
          } finally {
            pendingPlayerAttackContext = null;
          }
        } else {
          const attackKind: AttackKind = skill.formula === "magical_basic"
            ? "magic"
            : Number(skill.range) >= 120 ? "ranged" : "melee";
          const result = resolveCombatHit({
            attacker: profileCombatStats(profile),
            defender: monsterCombatStats(target),
            attackKind,
            skillPowerPercent: percent,
            attackElement: String(skill.element || "neutral") as any,
          });
          target.hp = Math.max(0, before - result.damage);
          dispatchCombatEvent({
            type: "damage",
            source: "player",
            skillId,
            targetName: String(target.name || "Target"),
            ...result,
            hp: entityNumber(target, "hp"),
            maxHp: Number(target.param?.[MAXHP]) || Number(target.__greenvaleMonsterConfig?.hp) || 1,
          });
        }
      }
      const dealt = Math.max(0, before - entityNumber(target, "hp"));
      damageTotal += dealt;
      if (dealt > 0 || percent <= 0) {
        applyStatus(target, skill, level);
        const threat = (enemyThreat.get(target) || 0) + calculateThreat(dealt, 0, 1);
        enemyThreat.set(target, threat);
      }
      setTargetHud(target);
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
      combatSettings: data.combatSettings && typeof data.combatSettings === "object" ? data.combatSettings : { autoAttack: false, autoLoot: true, autoLootRadius: 220 },
      lootInventory: data.lootInventory && typeof data.lootInventory === "object" ? data.lootInventory : {},
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
            const monsterToPlayer = !!attacker?.battleAi && target === activePlayer;
            const playerToMonster = attacker === activePlayer && !!target?.battleAi;
            if (!monsterToPlayer && !playerToMonster) return;

            const hp = Number(target.hp);
            if (!Number.isFinite(hp) || hp <= 0) return false;

            const profile = getProfile();
            const skill = playerToMonster ? pendingPlayerAttackContext?.skill : null;
            const level = Math.max(1, Number(pendingPlayerAttackContext?.level) || 1);
            const powerPercent = skill ? skillArrayValue(skill.powerPercent, level) : 100;
            const attackKind: AttackKind = monsterToPlayer
              ? "melee"
              : skill?.formula === "magical_basic"
                ? "magic"
                : Number(skill?.range || profile.derived?.attackRange || 64) >= 120
                  ? "ranged"
                  : "melee";

            const result = resolveCombatHit({
              attacker: monsterToPlayer ? monsterCombatStats(attacker) : profileCombatStats(profile),
              defender: monsterToPlayer ? profileCombatStats(profile) : monsterCombatStats(target),
              attackKind,
              skillPowerPercent: powerPercent,
              attackElement: monsterToPlayer
                ? String(attacker.__greenvaleMonsterConfig?.attackElement || attacker.__greenvaleMonsterConfig?.element || "neutral") as any
                : String(skill?.element || "neutral") as any,
            });

            context.damage = {
              damage: result.damage,
              raw: result.rawDamage,
              defeated: result.damage > 0 && hp <= result.damage,
            };
            context.metadata = {
              ...context.metadata,
              greenvaleHpBefore: hp,
              greenvaleCombatResult: result,
              greenvaleDirection: monsterToPlayer ? "monster-player" : "player-monster",
              greenvaleSkillId: skill?.id || null,
              greenvaleSource: pendingPlayerAttackContext?.source || "basic",
            };
            return context;
          },
          afterDamage(context: any) {
            const attacker = context.attacker as any;
            const target = context.target as any;
            const direction = String(context.metadata?.greenvaleDirection || "");
            if (!direction) return;

            const hp = Number(context.metadata?.greenvaleHpBefore);
            const damage = Math.max(0, Number(context.damage?.damage) || 0);
            const result = context.metadata?.greenvaleCombatResult || {};
            if (!Number.isFinite(hp) || hp <= 0) return;

            // RPGJS may already resolve damage internally. Reset to the captured
            // authoritative pre-hit HP and apply exactly one Greenvale result.
            target.hp = Math.max(0, hp - damage);

            if (direction === "monster-player") {
              dispatchCombatEvent({
                type: "damage",
                source: "monster",
                target: "player",
                attackerName: String(attacker.name || "Enemy"),
                damage,
                hp: Number(target.hp) || 0,
                maxHp: Number(target.param?.[MAXHP]) || 0,
                ...result,
              });
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("greenvale:player-hit", {
                  detail: {
                    damage,
                    outcome: result.outcome || "hit",
                    hp: Number(target.hp) || 0,
                    maxHp: Number(target.param?.[MAXHP]) || 0,
                  },
                }));
              }
            } else {
              const skillId = context.metadata?.greenvaleSkillId || null;
              const threat = (enemyThreat.get(target) || 0) + calculateThreat(damage, 0, 1);
              enemyThreat.set(target, threat);
              dispatchCombatEvent({
                type: "damage",
                source: "player",
                target: "monster",
                skillId,
                targetName: String(target.name || "Enemy"),
                damage,
                hp: Number(target.hp) || 0,
                maxHp: Number(target.param?.[MAXHP]) || Number(target.__greenvaleMonsterConfig?.hp) || 1,
                threat,
                ...result,
              });
              setTargetHud(target);
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
