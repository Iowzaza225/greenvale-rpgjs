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
import { CAMP_HEIGHT, CAMP_HITBOXES, CAMP_MAP_ID, CAMP_WIDTH } from "./shared";

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
  updatedAt?: number;
};

const CLASS_STATS: Record<string, { hp: number; sp: number; atk: number; pdef: number; speed: number }> = {
  scavenger:  { hp: 165, sp: 85,  atk: 14, pdef: 6,  speed: 3.1 },
  hunter:     { hp: 150, sp: 80,  atk: 18, pdef: 5,  speed: 3.7 },
  medic:      { hp: 145, sp: 125, atk: 12, pdef: 6,  speed: 3.0 },
  guardian:   { hp: 220, sp: 65,  atk: 15, pdef: 12, speed: 2.8 },
  beastmaster:{ hp: 185, sp: 95,  atk: 15, pdef: 7,  speed: 3.35 },
  engineer:   { hp: 165, sp: 110, atk: 15, pdef: 8,  speed: 3.15 },
};

const STARTER_WEAPONS: Record<string, any> = {
  scavenger: TrainingBlade,
  hunter: HunterKnife,
  medic: MedicBlade,
  guardian: GuardianSword,
  beastmaster: BeastSpear,
  engineer: EngineerCutter,
};

function getProfile(): Profile {
  const fallback: Profile = { name: "Survivor", classId: "scavenger", started: true, kills: 0, completed: false };
  try {
    if (typeof localStorage === "undefined") return fallback;
    const data = JSON.parse(localStorage.getItem("greenvale.profile.v1") || "null");
    if (!data || typeof data !== "object") return fallback;
    return {
      ...fallback,
      name: String(data.name || fallback.name).slice(0, 18),
      classId: CLASS_STATS[data.classId] ? data.classId : "scavenger",
      kills: Math.min(3, Math.max(0, Number(data.kills) || 0)),
      completed: data.completed === true,
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
    const stats = CLASS_STATS[profile.classId] || CLASS_STATS.scavenger;
    player.name = profile.name;
    player.setGraphic("hero");
    player.initializeDefaultStats();
    player.param[MAXHP] = stats.hp;
    player.param[MAXSP] = stats.sp;
    player.param[ATK] = stats.atk;
    player.param[PDEF] = stats.pdef;
    player.hp = stats.hp;
    player.sp = stats.sp;
    player.speed = stats.speed;
    player.setVariable("greenvale.class.id", profile.classId);
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
