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
    await player.showText("Mara: ยินดีต้อนรับสู่ Greenvale Camp");
  },
};

const player = {
  async onConnected(player: RpgPlayer) {
    player.name = "Survivor";
    player.setGraphic("hero");
    player.initializeDefaultStats();
    player.param[MAXHP] = 180;
    player.param[MAXSP] = 80;
    player.param[ATK] = 14;
    player.param[PDEF] = 6;
    player.hp = 180;
    player.sp = 80;
    player.setHitbox(30, 38);
    player.addItem(TrainingBlade);
    player.equip(TrainingBlade.id);
    player.setComponentsTop([
      Components.text("Survivor • Lv.{level}", {
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
      visual: { type: "impact" } as any,
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
