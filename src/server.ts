import {
  AGI,
  ATK,
  Components,
  DEX,
  INT,
  LocalStorageSaveStorageStrategy,
  MAXHP,
  MAXSP,
  PDEF,
  STR,
  RpgPlayer,
  createServer,
  provideAutoSave,
  provideSaveStorage,
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

const VIT = "vit";
const LUK = "luk";

const RustyBlade = {
  id: "rusty-blade",
  name: "Rusty Blade",
  description: "ดาบเก่าจาก Camp • อาวุธเริ่มต้น",
  atk: 13,
  knockbackForce: 34,
  _type: "weapon" as const,
};

const HunterKnife = {
  id: "hunter-knife",
  name: "Hunter Knife",
  description: "มีดล่าสัตว์น้ำหนักเบา • DEX +2",
  atk: 12,
  knockbackForce: 30,
  paramsModifier: { [DEX]: { value: 2 } },
  _type: "weapon" as const,
};

const GuardSword = {
  id: "guard-sword",
  name: "Guard Sword",
  description: "ดาบหนักของแนวหน้า • STR +2",
  atk: 15,
  knockbackForce: 42,
  paramsModifier: { [STR]: { value: 2 } },
  _type: "weapon" as const,
};

const ScrapCutter = {
  id: "scrap-cutter",
  name: "Scrap Cutter",
  description: "ใบตัดดัดแปลงจาก Workshop • INT +1 / DEX +1",
  atk: 13,
  knockbackForce: 32,
  paramsModifier: { [INT]: { value: 1 }, [DEX]: { value: 1 } },
  _type: "weapon" as const,
};

const ScavengerCoat = {
  id: "scavenger-coat",
  name: "Scavenger Coat",
  description: "เสื้อคลุมหาของ • LUK +2",
  pdef: 4,
  paramsModifier: { [LUK]: { value: 2 } },
  _type: "armor" as const,
};

const RangerVest = {
  id: "ranger-vest",
  name: "Ranger Vest",
  description: "เสื้อคล่องตัวของ Hunter • AGI +2",
  pdef: 4,
  paramsModifier: { [AGI]: { value: 2 } },
  _type: "armor" as const,
};

const MedicCoat = {
  id: "medic-coat",
  name: "Medic Coat",
  description: "เสื้อสนามของ Medic • INT +2",
  pdef: 5,
  paramsModifier: { [INT]: { value: 2 } },
  _type: "armor" as const,
};

const ReinforcedVest = {
  id: "reinforced-vest",
  name: "Reinforced Vest",
  description: "เกราะเสริมแผ่นเหล็ก • VIT +2",
  pdef: 8,
  paramsModifier: { [VIT]: { value: 2 } },
  _type: "armor" as const,
};

const BeastHideCoat = {
  id: "beast-hide-coat",
  name: "Beast Hide Coat",
  description: "เสื้อหนังสำหรับ Beastmaster • VIT +1 / AGI +1",
  pdef: 5,
  paramsModifier: { [VIT]: { value: 1 }, [AGI]: { value: 1 } },
  _type: "armor" as const,
};

const MechanicVest = {
  id: "mechanic-vest",
  name: "Mechanic Vest",
  description: "เสื้อช่างกระเป๋าเยอะ • INT +1 / DEX +1",
  pdef: 5,
  paramsModifier: { [INT]: { value: 1 }, [DEX]: { value: 1 } },
  _type: "armor" as const,
};

const GreenvaleSaber = {
  id: "greenvale-saber",
  name: "Greenvale Saber",
  description: "รางวัลเควสแรก • ดาบที่ Mara เก็บไว้ให้ผู้รอดชีวิต",
  atk: 18,
  knockbackForce: 40,
  paramsModifier: { [STR]: { value: 1 }, [DEX]: { value: 1 } },
  _type: "weapon" as const,
};

const FieldPotion = {
  id: "field-potion",
  name: "Field Potion",
  description: "ฟื้น HP 45",
  icon: "potion",
  consumable: true,
  hpValue: 45,
  price: 18,
  _type: "item" as const,
};

const WolfFang = {
  id: "wolf-fang",
  name: "Wolf Fang",
  description: "เขี้ยวจากหมาป่ากลายพันธุ์ — วัตถุดิบ Greenvale",
  price: 7,
  _type: "item" as const,
};

const FocusSlash = {
  id: "focus-slash",
  name: "Focus Slash",
  description: "ฟันแรงระยะสั้น ใช้ SP 8",
  icon: "potion",
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

const EnemyClaw = {
  id: "enemy-claw",
  name: "Mutant Claw",
  atk: 8,
  knockbackForce: 22,
  _type: "weapon" as const,
};

const classDefs = {
  scavenger: {
    id: "scavenger",
    name: "Scavenger",
    description: "นักสำรวจและเก็บทรัพยากร • LUK สูง • เหมาะกับการหา Loot",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
  hunter: {
    id: "hunter",
    name: "Hunter",
    description: "นักล่าเคลื่อนที่ไว • DEX/AGI สูง • เหมาะกับการไล่มอน",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
  medic: {
    id: "medic",
    name: "Medic",
    description: "ผู้รอดชีวิตสายสนับสนุน • INT/SP สูง • เตรียมต่อยอด Heal Skill",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
  guardian: {
    id: "guardian",
    name: "Guardian",
    description: "แนวหน้าของ Camp • HP/VIT/PDEF สูง • รับการโจมตีได้ดีที่สุด",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
  beastmaster: {
    id: "beastmaster",
    name: "Beastmaster",
    description: "สายคู่หูสัตว์ • VIT/AGI สมดุล • เตรียมต่อยอดระบบ Pet",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
  engineer: {
    id: "engineer",
    name: "Engineer",
    description: "สายอุปกรณ์และ Forge • INT/DEX สูง • เตรียมต่อยอด Trap/Turret",
    skillsToLearn: [{ level: 1, skill: FocusSlash }],
  },
} as const;

function makeActor(
  id: keyof typeof classDefs,
  params: Record<string, { start: number; end: number }>,
  startingEquipment: any[],
) {
  const cls = classDefs[id];
  return {
    id: `greenvale-${id}`,
    name: cls.name,
    description: cls.description,
    graphic: "hero",
    className: cls.name,
    classDescription: cls.description,
    class: cls,
    initialLevel: 1,
    finalLevel: 60,
    expCurve: { basis: 30, extra: 20, accelerationA: 30, accelerationB: 30 },
    parameters: params,
    startingEquipment,
    hitbox: { width: 30, height: 38 },
  };
}

const actors = {
  scavenger: makeActor("scavenger", {
    [MAXHP]: { start: 142, end: 860 }, [MAXSP]: { start: 72, end: 390 },
    [ATK]: { start: 13, end: 95 }, [PDEF]: { start: 6, end: 62 },
    [STR]: { start: 7, end: 44 }, [AGI]: { start: 8, end: 48 }, [INT]: { start: 6, end: 42 }, [DEX]: { start: 8, end: 48 },
    [VIT]: { start: 7, end: 45 }, [LUK]: { start: 12, end: 65 },
  }, [RustyBlade, ScavengerCoat]),
  hunter: makeActor("hunter", {
    [MAXHP]: { start: 136, end: 810 }, [MAXSP]: { start: 70, end: 380 },
    [ATK]: { start: 14, end: 102 }, [PDEF]: { start: 5, end: 55 },
    [STR]: { start: 7, end: 46 }, [AGI]: { start: 12, end: 68 }, [INT]: { start: 5, end: 36 }, [DEX]: { start: 12, end: 70 },
    [VIT]: { start: 6, end: 40 }, [LUK]: { start: 8, end: 50 },
  }, [HunterKnife, RangerVest]),
  medic: makeActor("medic", {
    [MAXHP]: { start: 130, end: 770 }, [MAXSP]: { start: 105, end: 570 },
    [ATK]: { start: 11, end: 82 }, [PDEF]: { start: 5, end: 55 },
    [STR]: { start: 5, end: 34 }, [AGI]: { start: 7, end: 44 }, [INT]: { start: 13, end: 74 }, [DEX]: { start: 8, end: 50 },
    [VIT]: { start: 7, end: 44 }, [LUK]: { start: 8, end: 52 },
  }, [RustyBlade, MedicCoat]),
  guardian: makeActor("guardian", {
    [MAXHP]: { start: 178, end: 1040 }, [MAXSP]: { start: 58, end: 320 },
    [ATK]: { start: 14, end: 98 }, [PDEF]: { start: 10, end: 86 },
    [STR]: { start: 12, end: 66 }, [AGI]: { start: 5, end: 36 }, [INT]: { start: 4, end: 30 }, [DEX]: { start: 6, end: 40 },
    [VIT]: { start: 14, end: 78 }, [LUK]: { start: 5, end: 34 },
  }, [GuardSword, ReinforcedVest]),
  beastmaster: makeActor("beastmaster", {
    [MAXHP]: { start: 154, end: 900 }, [MAXSP]: { start: 78, end: 430 },
    [ATK]: { start: 13, end: 94 }, [PDEF]: { start: 7, end: 64 },
    [STR]: { start: 8, end: 48 }, [AGI]: { start: 10, end: 58 }, [INT]: { start: 7, end: 46 }, [DEX]: { start: 8, end: 48 },
    [VIT]: { start: 10, end: 60 }, [LUK]: { start: 9, end: 54 },
  }, [RustyBlade, BeastHideCoat]),
  engineer: makeActor("engineer", {
    [MAXHP]: { start: 145, end: 835 }, [MAXSP]: { start: 88, end: 500 },
    [ATK]: { start: 12, end: 89 }, [PDEF]: { start: 6, end: 60 },
    [STR]: { start: 6, end: 40 }, [AGI]: { start: 7, end: 46 }, [INT]: { start: 12, end: 70 }, [DEX]: { start: 11, end: 64 },
    [VIT]: { start: 8, end: 50 }, [LUK]: { start: 7, end: 46 },
  }, [ScrapCutter, MechanicVest]),
} as const;

const actorList = Object.values(actors);

function getClassId(player: RpgPlayer): keyof typeof classDefs {
  const raw = player.getVariable<string>("greenvale.class.id") as keyof typeof classDefs | undefined;
  return raw && classDefs[raw] ? raw : "scavenger";
}

function questLine(player: RpgPlayer) {
  const quest = player.getVariable<string>("greenvale.quest.main");
  const kills = Number(player.getVariable<number>("greenvale.quest.wolves") ?? 0);
  if (quest === "first-hunt-complete") return "MAIN QUEST ✓ รอยเขี้ยวในป่า — สำเร็จ";
  return `MAIN QUEST • กำจัด Mutant Wolf ${kills}/3`;
}

function refreshPlayerOverlay(player: RpgPlayer) {
  const classId = getClassId(player);
  const cls = classDefs[classId];
  player.setComponentsTop([
    Components.text(`${cls.name} • Lv.{level}`, {
      fill: "#fff2c7", fontSize: 12, fontWeight: "700", stroke: "#142018",
    }),
    Components.hpBar({ width: 104, height: 7, fillColor: "#55b85a", bgColor: "#17251b" }, null),
  ], { width: 118, height: 42, marginBottom: 7 });

  player.setComponentsBottom([
    Components.text(questLine(player), {
      fill: "#f4e2a0", fontSize: 10, fontWeight: "700", stroke: "#0b1510",
    }),
    Components.text("STR {param.str} • AGI {param.agi} • VIT {param.vit} • LUK {param.luk}", {
      fill: "#d8e7df", fontSize: 8, stroke: "#0b1510",
    }),
  ], { width: 270, height: 35, marginTop: 8 });
}

function applyClassRuntime(player: RpgPlayer) {
  const agi = Number(player.param[AGI] ?? 0);
  player.speed = Math.max(2.75, Math.min(4.25, 2.85 + agi * 0.035));
}

function updateQuestAfterWolf(attacker?: any) {
  if (!attacker || typeof attacker.getVariable !== "function") return;
  const quest = attacker.getVariable<string>("greenvale.quest.main");
  if (quest !== "first-hunt") return;

  const current = Number(attacker.getVariable<number>("greenvale.quest.wolves") ?? 0);
  const next = Math.min(3, current + 1);
  attacker.setVariable("greenvale.quest.wolves", next);
  attacker.addItem(WolfFang, 1);

  const luk = Number(attacker.param?.[LUK] ?? 0);
  const extraChance = Math.min(0.35, luk * 0.012);
  if (Math.random() < extraChance) attacker.addItem(WolfFang, 1);

  if (next < 3) {
    refreshPlayerOverlay(attacker);
    void attacker.showNotification(`ภารกิจ: Mutant Wolf ${next}/3`);
    return;
  }

  attacker.setVariable("greenvale.quest.main", "first-hunt-complete");
  attacker.gold += 25;
  attacker.addItem(FieldPotion, 2);
  attacker.addItem(GreenvaleSaber, 1);
  refreshPlayerOverlay(attacker);
  void attacker.showText(
    "ภารกิจสำเร็จ: รอยเขี้ยวในป่า\nได้รับ 25 Gold + Field Potion x2 + Greenvale Saber\nกด MENU เพื่อเปิด Inventory และ Equip ดาบใหม่ได้ทันที",
  );
}

function MutantWolf(id: string, x: number, y: number): EventDefinition {
  return {
    name: `Mutant Wolf ${id}`,
    onInit() {
      this.setGraphic("monster");
      this.name = "Mutant Wolf";
      this.speed = 2.35;
      this.through = false;
      this.param[MAXHP] = 92;
      this.param[MAXSP] = 20;
      this.param[ATK] = 10;
      this.param[PDEF] = 3;
      this.hp = 92;
      this.sp = 20;
      this.addItem(EnemyClaw);
      this.equip(EnemyClaw.id);
      this.teleport({ x, y });
      this.setComponentsTop([
        Components.text("Mutant Wolf", { fill: "#fff4d6", fontSize: 11, fontWeight: "700", stroke: "#182018" }),
        Components.hpBar({ width: 74, height: 6, fillColor: "#d85f54", bgColor: "#251514" }, null),
      ], { width: 82, height: 34, marginBottom: 7 });
      (this as any).battleAi = new BattleAi(this, {
        preset: "aggressive",
        enemyType: EnemyType.Aggressive,
        faction: "mutants",
        targets: "players",
        visionRange: 235,
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
        onDefeated: ({ attacker }: any) => updateQuestAfterWolf(attacker),
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
      Components.text("Mara • Camp Leader", { fill: "#f3e2a6", fontSize: 11, fontWeight: "700", stroke: "#203329" }),
    ], { width: 130, height: 22, marginBottom: 6 });
  },
  async onAction(player: RpgPlayer) {
    const quest = player.getVariable<string>("greenvale.quest.main");
    if (quest === "first-hunt-complete") {
      await player.showText("Mara: ดีมาก คืนนี้ Camp ปลอดภัยขึ้นแล้ว\nForest Route จะเป็นเป้าหมายใน Milestone ถัดไป");
      return;
    }
    const kills = Number(player.getVariable<number>("greenvale.quest.wolves") ?? 0);
    await player.showText(`Mara: หมาป่ากลายพันธุ์วนอยู่รอบ Camp\nกำจัดพวกมัน 3 ตัวก่อนมืด (${kills}/3)`);
  },
};

const player = {
  async onConnected(player: RpgPlayer) {
    let classId = player.getVariable<string>("greenvale.class.id") as keyof typeof actors | undefined;
    if (!classId || !actors[classId]) {
      const actor = await player.showCharacterSelect(actorList as any, {
        title: "GREENVALE — เลือกผู้รอดชีวิต",
        subtitle: "แต่ละ Class มี Stat เริ่มต้นและ Equipment ต่างกัน",
        selectedActorId: actors.scavenger.id,
        allowCancel: false,
      });
      if (!actor) return;
      player.setActor(actor as any);
      classId = (String((actor as any).id).replace("greenvale-", "") || "scavenger") as keyof typeof actors;
      player.setVariable("greenvale.class.id", classId);
      player.hp = player.param[MAXHP];
      player.sp = player.param[MAXSP];
    } else {
      player.changeActor(actors[classId] as any);
    }

    player.setGraphic("hero");
    player.setHitbox(30, 38);
    applyClassRuntime(player);

    if (!player.getSkill(FocusSlash as any)) player.learnSkill(FocusSlash as any);
    if ((player.getItem(FieldPotion.id)?.quantity() ?? 0) < 3) player.addItem(FieldPotion, 3);

    if (!player.getVariable("greenvale.quest.main")) {
      player.setVariable("greenvale.quest.main", "first-hunt");
      player.setVariable("greenvale.quest.wolves", 0);
    }

    player.initializeHotbar([
      { type: "skill", id: FocusSlash.id },
      { type: "item", id: FieldPotion.id },
    ]);
    player.configureHotbar({ capacity: 4, allowedEntryTypes: ["skill", "item"] });
    await player.showHotbar();

    if (player.getCurrentMap()?.id !== CAMP_MAP_ID) {
      await player.changeMap(CAMP_MAP_ID, { x: 760, y: 720 });
    }

    refreshPlayerOverlay(player);
    const introSeen = player.getVariable<boolean>("greenvale.v2IntroSeen");
    if (!introSeen) {
      player.setVariable("greenvale.v2IntroSeen", true);
      await player.showText(
        `GREENVALE: AFTER THE FALL — RPGJS V2.2\nClass: ${classDefs[getClassId(player)].name}\nภารกิจแรก: กำจัด Mutant Wolf รอบ Camp 3 ตัว\nมือถือ: A = Action/Attack • D = Dodge • B = MENU`,
      );
    }
  },

  onJoinMap(player: RpgPlayer) {
    player.setGraphic("hero");
    applyClassRuntime(player);
    refreshPlayerOverlay(player);
  },

  onInput(player: RpgPlayer, { action }: any) {
    if (action === "escape" || action === "back") {
      void player.callMainMenu({
        menus: [
          { id: "status", label: "rpg.menu.status" },
          { id: "items", label: "rpg.menu.items" },
          { id: "skills", label: "rpg.menu.skills" },
          { id: "equip", label: "rpg.menu.equip" },
          { id: "save", label: "rpg.menu.save" },
          { id: "options", label: "rpg.menu.options" },
          { id: "exit", label: "rpg.menu.exit" },
        ],
      });
    }
  },

  async onDead(player: RpgPlayer) {
    player.hp = player.param[MAXHP];
    player.sp = player.param[MAXSP];
    await player.changeMap(CAMP_MAP_ID, { x: 760, y: 720 });
    refreshPlayerOverlay(player);
    await player.showText("คุณหมดสติและถูกพากลับ Camp");
  },
};

export default createServer({
  providers: [
    provideActionBattle({
      preset: "adventure",
      visual: createActionBattleVisual("impact"),
      combat: {
        pvp: false,
        player: {
          combo: { bufferMs: 145, resetMs: 720 },
          dodge: { durationMs: 190, cooldownMs: 650, invincibilityMs: 225, additionalSpeed: 8 },
          softTargeting: { range: 118, coneDegrees: 115 },
        },
      },
      ui: {
        hotbar: { enabled: true, autoOpen: true, capacity: 4, allowedEntryTypes: ["skill", "item"] },
      },
    }),
    provideSaveStorage(new LocalStorageSaveStorageStrategy({ key: "greenvale-rpgjs-v2" })),
    provideAutoSave({ canSave: () => true, getDefaultSlot: () => 0 }),
    provideServerModules([
      {
        database: async () => ({
          [RustyBlade.id]: RustyBlade,
          [HunterKnife.id]: HunterKnife,
          [GuardSword.id]: GuardSword,
          [ScrapCutter.id]: ScrapCutter,
          [ScavengerCoat.id]: ScavengerCoat,
          [RangerVest.id]: RangerVest,
          [MedicCoat.id]: MedicCoat,
          [ReinforcedVest.id]: ReinforcedVest,
          [BeastHideCoat.id]: BeastHideCoat,
          [MechanicVest.id]: MechanicVest,
          [GreenvaleSaber.id]: GreenvaleSaber,
          [FieldPotion.id]: FieldPotion,
          [WolfFang.id]: WolfFang,
          [FocusSlash.id]: FocusSlash,
          [EnemyClaw.id]: EnemyClaw,
          ...Object.fromEntries(Object.entries(classDefs).map(([id, def]) => [id, def])),
          ...Object.fromEntries(Object.values(actors).map((actor) => [actor.id, actor])),
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
              { event: MutantWolf("a", 1030, 420) },
              { event: MutantWolf("b", 1180, 500) },
              { event: MutantWolf("c", 980, 710) },
            ],
          } as any,
        ],
      },
    ]),
  ],
});
