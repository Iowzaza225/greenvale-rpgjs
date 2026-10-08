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
  ifHpBelow,
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
    void attacker.showText("เควสสำเร็จ! รอยเขี้ยวในป่า\\nได้รับ 25 Gold + Greenvale Saber\\nกลับไปคุยกับ Mara ที่ค่าย");
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
      this.speed = 2.2;
      this.through = false;
      this.param[MAXHP] = 90;
      this.param[MAXSP] = 20;
      this.param[ATK] = 10;
      this.param[PDEF] = 3;
      this.hp = 90;
      this.sp = 20;
      this.addItem(WolfClaw);
      this.equip(WolfClaw.id);
      this.teleport({ x, y });
      this.setComponentsTop([
        Components.text("Mutant Wolf", {
          fill: "#fff4d6",
          fontSize: 11,
          fontWeight: "700",
          stroke: "#182018",
        }),
        Components.hpBar(
          { width: 74, height: 6, fillColor: "#d85f54", bgColor: "#251514" },
          null,
        ),
      ], { width: 82, height: 34, marginBottom: 7 });

      (this as any).battleAi = new BattleAi(this, {
        preset: "aggressive",
        enemyType: EnemyType.Aggressive,
        faction: "mutants",
        targets: "players",
        visionRange: 230,
        attackRange: 58,
        attackCooldown: 850,
        dodgeChance: 0.08,
        attackPatterns: [AttackPattern.Melee, AttackPattern.Combo],
        simpleBehavior: {
          when: [
            ifHpBelow(0.14, useAttack(AttackPattern.Charged)),
            ifTargetInRange(useAttack(AttackPattern.Combo), 62),
          ],
          otherwise: chase(),
        },
        rewards: { exp: 18, gold: 4 },
        onDefeated: ({ attacker }: any) => onWolfDefeated(attacker),
        presentation: { role: "enemy", name: "Mutant Wolf", healthBar: true },
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
    this.setComponentsTop([
      Components.text("Mara", {
        fill: "#f3e2a6",
        fontSize: 11,
        fontWeight: "700",
        stroke: "#203329",
      }),
    ], { width: 80, height: 22, marginBottom: 6 });
  },
  async onAction(player: RpgPlayer) {
    const kills = Number(player.getVariable("greenvale.quest.kills") || 0);
    const done = player.getVariable("greenvale.quest.main") === "first-hunt-complete";
    await player.showText(
      done
        ? "Mara: เยี่ยมมาก! ค่ายปลอดภัยขึ้นแล้ว\\nเส้นทางไป Forest Route จะเปิดในอัปเดตถัดไป"
        : "Mara: ยินดีต้อนรับสู่ Greenvale Camp\\nภารกิจแรก: กำจัด Mutant Wolf 3 ตัว (" + kills + "/3)",
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
    player.addItem(TrainingBlade);
    player.equip(TrainingBlade.id);
    if (profile.completed) {
      player.addItem(GreenvaleSaber, 1);
      player.equip(GreenvaleSaber.id);
    }
    player.setComponentsTop([
      Components.text(profile.name + " · " + profile.classId + " • Lv.{level}", {
        fill: "#fff2c7",
        fontSize: 11,
        fontWeight: "700",
        stroke: "#142018",
      }),
      Components.hpBar(
        { width: 96, height: 7, fillColor: "#55b85a", bgColor: "#17251b" },
        null,
      ),
    ], { width: 110, height: 38, marginBottom: 7 });

    await player.changeMap(CAMP_MAP_ID, { x: 760, y: 720 });
  },
};

export default createServer({
  providers: [
    provideActionBattle({
      visual: createActionBattleVisual("impact"),
      combat: { pvp: false },
      ai: {
        presets: {
          aggressive: {
            attackRange: 62,
            visionRange: 250,
            attackCooldown: 800,
            simpleBehavior: {
              when: [
                ifHpBelow(0.12, useAttack(AttackPattern.Charged)),
                ifTargetInRange(useAttack(AttackPattern.Combo), 66),
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
          [GreenvaleSaber.id]: GreenvaleSaber,
          [WolfFang.id]: WolfFang,
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
