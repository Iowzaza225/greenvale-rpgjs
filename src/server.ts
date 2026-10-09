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
import statusData from "./data/status_effects.json" with { type: "json" };
import { combatConfig, resolveCombatHit, threatAfterDamage } from "./core/combat.ts";

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
    perfectDodge?: number;
    CRIT?: number;
    critResistance?: number;
  };
  learnedSkills?: Record<string, number>;
  combatSettings?: { autoAttack?: boolean; autoLoot?: boolean; respawnMode?: "save-point" | "item" };
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
const threatByEnemy = new WeakMap<any, Map<string, number>>();
const playerStatusTokens = new Map<string, number>();
let pendingWolfFangs = 0;
let pendingCombatContext: null | {
  skillId?: string;
  source: "manual" | "auto" | "skill";
  multiplier: number;
  element: string;
  magical: boolean;
  profile: "melee" | "ranged" | "magic";
} = null;

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

const wolfConfig: any = (monstersData.monsters as any[]).find((entry) => entry.id === "ashfang_wolf") || {};

function dispatchCombatResult(detail: Record<string, any>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("greenvale:combat-result", { detail }));
}

function playerCombatStats(profile = getProfile()) {
  const d = profile.derived || {};
  return {
    ATK: Number(d.ATK) || Number(activePlayer?.param?.[ATK]) || 12,
    MATK: Number(d.MATK) || Math.max(1, Math.round((Number(d.ATK) || 12) * .7)),
    DEF: Number(d.DEF) || Number(activePlayer?.param?.[PDEF]) || 5,
    MDEF: Number(d.MDEF) || 3,
    HIT: Number(d.HIT) || 12,
    FLEE: Number(d.FLEE) || 8,
    perfectDodge: Number(d.perfectDodge) || 0,
    CRIT: Number(d.CRIT) || 1,
    critResistance: Number(d.critResistance) || 0,
    blockChance: profile.classId === "vanguard" ? 10 : 0,
  };
}

function wolfCombatStats() {
  return {
    ATK: Number(wolfConfig.atk) || 13,
    MATK: Math.max(1, Math.round((Number(wolfConfig.atk) || 13) * .6)),
    DEF: Number(wolfConfig.def) || 3,
    MDEF: Number(wolfConfig.mdef) || 1,
    HIT: Number(wolfConfig.hit) || 12,
    FLEE: Number(wolfConfig.flee) || 8,
    perfectDodge: Number(wolfConfig.perfectDodge) || 0,
    CRIT: Number(wolfConfig.crit) || 3,
    critResistance: Number(wolfConfig.critResistance) || 0,
    blockChance: Number(wolfConfig.blockChance) || 0,
  };
}

function applyPlayerStatus(statusId: string, durationOverride?: number) {
  if (!activePlayer || typeof window === "undefined") return;
  const definition: any = (statusData.statuses as any[]).find((entry) => entry.id === statusId);
  if (!definition) return;
  const duration = Math.max(100, Number(durationOverride ?? definition.durationMs) || 1000);
  const token = (playerStatusTokens.get(statusId) || 0) + 1;
  playerStatusTokens.set(statusId, token);
  window.dispatchEvent(new CustomEvent("greenvale:status-add", { detail: { id: statusId, durationMs: duration } }));

  const effect = definition.effect || {};
  const tickMs = Math.max(250, Number(definition.tickMs) || 0);
  if (tickMs > 0 && (effect.type === "dot-percent-maxhp" || effect.type === "dot-flat")) {
    const ticks = Math.max(1, Math.floor(duration / tickMs));
    for (let i = 1; i <= ticks; i++) {
      window.setTimeout(() => {
        if (!activePlayer || playerStatusTokens.get(statusId) !== token || Number(activePlayer.hp) <= 0) return;
        const maxHp = Number(activePlayer.param[MAXHP]) || 1;
        const damage = effect.type === "dot-percent-maxhp"
          ? Math.max(1, Math.round(maxHp * Number(effect.value || 1) / 100))
          : Math.max(1, Number(effect.value) || 1);
        activePlayer.hp = Math.max(0, Number(activePlayer.hp) - damage);
        dispatchCombatResult({ type: "player-hit", damage, statusId });
      }, i * tickMs);
    }
  }
  window.setTimeout(() => {
    if (playerStatusTokens.get(statusId) !== token) return;
    playerStatusTokens.delete(statusId);
    window.dispatchEvent(new CustomEvent("greenvale:status-remove", { detail: { id: statusId } }));
  }, duration);
}

function addThreat(target: any, damage: number) {
  if (!activePlayer || !target) return 0;
  const key = String((activePlayer as any).id || getProfile().name || "local-player");
  let table = threatByEnemy.get(target);
  if (!table) { table = new Map(); threatByEnemy.set(target, table); }
  const next = threatAfterDamage(table.get(key) || 0, damage, Number(wolfConfig.threatMultiplier) || 1);
  table.set(key, next);
  if (typeof target.setVariable === "function") target.setVariable("greenvale.threat.top", next);
  return next;
}

function runPlayerAttack(target: any, context: NonNullable<typeof pendingCombatContext>) {
  if (!activePlayer || !target?.battleAi?.takeDamage) return false;
  pendingCombatContext = context;
  try {
    target.battleAi.takeDamage(activePlayer);
    return true;
  } finally {
    pendingCombatContext = null;
  }
}

function respawnPlayer(mode: "save-point" | "item") {
  if (!activePlayer) return;
  const player = activePlayer;
  const maxHp = Math.max(1, Number(player.param[MAXHP]) || 120);
  const maxSp = Math.max(1, Number(player.param[MAXSP]) || 50);
  player.hp = mode === "item" ? Math.max(1, Math.ceil(maxHp * .5)) : maxHp;
  player.sp = mode === "item" ? Math.ceil(maxSp * .5) : maxSp;
  if (mode === "save-point") player.teleport({ x: 760, y: 720 });
  player.setVariable("greenvale.dead", false);
  player.setVariable("greenvale.respawning", false);
  player.setVariable("greenvale.invulnerableUntil", Date.now() + Number(combatConfig().respawnInvulnerabilityMs || 3000));
  applyPlayerStatus("revive_guard", Number(combatConfig().respawnInvulnerabilityMs || 3000));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("greenvale:respawned", { detail: { mode } }));
    dispatchSkillState();
  }
}

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

function enemyEvents(player: RpgPlayer, range: number): any[] {
  // Do not walk through getCurrentMap().getEvents() from a browser-dispatched
  // standalone event. On WebKit that bridge can expose the synchronized map
  // facade instead of the authoritative room, which has no getEvents().
  // Battle events register themselves here during server-side onInit instead.
  const px = entityCoord(player, "x");
  const py = entityCoord(player, "y");
  return Array.from(activeEnemies)
    .filter((event: any) => event?.battleAi && entityNumber(event, "hp") > 0)
    .map((event: any) => {
      const dx = entityCoord(event, "x") - px;
      const dy = entityCoord(event, "y") - py;
      return { event, distance: Math.hypot(dx, dy) };
    })
    .filter(({ distance }: any) => distance <= range)
    .sort((a: any, b: any) => a.distance - b.distance)
    .map(({ event }: any) => event);
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
  if (stat === "PDEF") applyPlayerStatus("guard", duration || 60000);
  if (duration > 0) window.setTimeout(() => restoreModifier(skill.id), duration);
  return true;
}

function applyStatus(target: any, skill: any, level: number) {
  const status = skill.statusEffect;
  if (!status || Math.random() > Number(status.chance ?? 1)) return;
  const duration = Math.max(100, Number(status.durationMs) || 1000);
  if (status.id === "slow") {
    const speed = Number(target.speed) || 1;
    target.speed = Math.max(.35, speed * .55);
    window.setTimeout(() => { if (target) target.speed = speed; }, duration);
  } else if (status.id === "stun") {
    const speed = Number(target.speed) || 1;
    target.speed = 0;
    window.setTimeout(() => { if (target) target.speed = speed; }, duration);
  } else if (status.id === "bleed") {
    const ticks = Math.max(1, Math.floor(duration / 1000));
    for (let tick = 1; tick <= ticks; tick++) {
      window.setTimeout(() => {
        if (!target || entityNumber(target, "hp") <= 0) return;
        const damage = Math.max(1, level * 2);
        target.hp = Math.max(0, entityNumber(target, "hp") - damage);
      }, tick * 1000);
    }
  }
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
      const diagnostics = Array.from(activeEnemies).slice(0, 8).map((event: any) => {
        const px = entityCoord(activePlayer, "x");
        const py = entityCoord(activePlayer, "y");
        const ex = entityCoord(event, "x");
        const ey = entityCoord(event, "y");
        return {
          id: String(event?.id || event?.name || "enemy"),
          hp: entityNumber(event, "hp"),
          x: ex,
          y: ey,
          distance: Math.round(Math.hypot(ex - px, ey - py) * 10) / 10,
          hasBattleAi: !!event?.battleAi,
        };
      });
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
      if (percent > 0) {
        const before = entityNumber(target, "hp");
        runPlayerAttack(target, {
          skillId,
          source: "skill",
          multiplier: Math.max(0, percent) / 100,
          element: String(skill.element || "neutral"),
          magical: skill.formula === "magical_basic",
          profile: skill.formula === "magical_basic" ? "magic" : (Number(skill.range) >= 140 ? "ranged" : "melee"),
        });
        damageTotal += Math.max(0, before - entityNumber(target, "hp"));
      }
      applyStatus(target, skill, level);
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
  window.addEventListener("greenvale:auto-attack", () => {
    if (!activePlayer || activePlayer.getVariable("greenvale.dead")) return;
    const target = enemyEvents(activePlayer, Number(combatConfig().autoAttackRange || 82))[0];
    if (!target) return;
    runPlayerAttack(target, { source: "auto", multiplier: 1, element: "neutral", magical: false, profile: "melee" });
  });
  window.addEventListener("greenvale:loot-pickup", () => {
    if (!activePlayer || pendingWolfFangs <= 0) return;
    activePlayer.addItem(WolfFang, pendingWolfFangs);
    pendingWolfFangs = 0;
  });
  window.addEventListener("greenvale:respawn", (event) => {
    const mode = (event as CustomEvent).detail?.mode === "item" ? "item" : "save-point";
    respawnPlayer(mode);
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
      combatSettings: {
        autoAttack: data.combatSettings?.autoAttack === true,
        autoLoot: data.combatSettings?.autoLoot !== false,
        respawnMode: data.combatSettings?.respawnMode === "item" ? "item" : "save-point",
      },
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
  const profile = getProfile();
  const autoLoot = profile.combatSettings?.autoLoot !== false;
  if (autoLoot) attacker.addItem(WolfFang, 1);
  else pendingWolfFangs += 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("greenvale:loot-drop", { detail: { id: "wolf-fang", count: 1, auto: autoLoot } }));
  }
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
    if (player.getVariable("greenvale.dead")) return;
    player.setVariable("greenvale.dead", true);
    player.setVariable("greenvale.respawning", true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("greenvale:death", { detail: { source: "combat" } }));
    }
    // Safety fallback: never leave a mobile session permanently stuck if the UI
    // is interrupted by Safari. Manual choice remains available for 30 seconds.
    setTimeout(() => {
      if (player.getVariable("greenvale.dead")) respawnPlayer("save-point");
    }, 30000);
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
