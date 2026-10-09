import classes from "../data/classes.json";
import skills from "../data/skills.json";
import monsters from "../data/monsters.json";
import items from "../data/items.json";
import quests from "../data/quests.json";
import maps from "../data/maps.json";
import shop from "../data/shop.json";
import statusEffects from "../data/status_effects.json";
import drops from "../data/drops.json";
import formulas from "../data/formulas.json";
import effects from "../data/effects.json";
import characterCreation from "../data/character_creation.json";
import cutscene from "../data/cutscene.json";

type Dataset = { schemaVersion?: number; [key: string]: unknown };

const datasets: Record<string, Dataset> = {
  classes,
  skills,
  monsters,
  items,
  quests,
  maps,
  shop,
  statusEffects,
  drops,
  formulas,
  effects,
  characterCreation,
  cutscene,
};

function assertArray(name: string, value: unknown): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Config "${name}" must be an array`);
  }
}

function assertUniqueIds(name: string, values: unknown[]): void {
  const seen = new Set<string>();
  for (const entry of values) {
    const id = (entry as { id?: unknown })?.id;
    if (typeof id !== "string" || !id.trim()) {
      throw new Error(`Config "${name}" contains an entry without a valid id`);
    }
    if (seen.has(id)) {
      throw new Error(`Config "${name}" contains duplicate id "${id}"`);
    }
    seen.add(id);
  }
}

export function validateGameConfig(): void {
  for (const [name, dataset] of Object.entries(datasets)) {
    if (dataset.schemaVersion !== 1) {
      throw new Error(`Config "${name}" has unsupported schemaVersion ${String(dataset.schemaVersion)}`);
    }
  }

  assertArray("classes.classes", classes.classes);
  assertArray("skills.skills", skills.skills);
  assertArray("monsters.monsters", monsters.monsters);
  assertArray("items.items", items.items);
  assertArray("quests.quests", quests.quests);
  assertArray("maps.maps", maps.maps);
  assertArray("shop.shops", shop.shops);
  assertArray("status_effects.statuses", statusEffects.statuses);
  assertArray("drops.dropTables", drops.dropTables);
  assertArray("effects.effects", effects.effects);
  assertArray("character_creation.genders", characterCreation.genders);
  assertArray("character_creation.hairStyles", characterCreation.hairStyles);
  assertArray("character_creation.hairColors", characterCreation.hairColors);
  assertArray("character_creation.skinColors", characterCreation.skinColors);
  assertArray("character_creation.outfits", characterCreation.outfits);
  assertArray("cutscene.frames", cutscene.frames);
  assertArray("classes.emotes", classes.emotes);
  assertArray("classes.costumes", classes.costumes);
  if (!Array.isArray(formulas.expTables?.base) || formulas.expTables.base.length !== 99) {
    throw new Error('Config "formulas.expTables.base" must contain 99 entries');
  }
  if (!Array.isArray(formulas.expTables?.job) || formulas.expTables.job.length !== 50) {
    throw new Error('Config "formulas.expTables.job" must contain 50 entries');
  }
  if ((formulas as any).combat?.pvp !== false) {
    throw new Error('Config "formulas.combat.pvp" must remain false for Phase 4');
  }
  for (const element of formulas.elements) {
    if (!(formulas as any).elementMultipliers?.[element]) {
      throw new Error(`Missing element multiplier row "${element}"`);
    }
  }
  const requiredStatuses = ["poison","bleed","stun","slow","freeze","sleep","silence","blind","confusion"];
  for (const statusId of requiredStatuses) {
    if (!(statusEffects.statuses as any[]).some((entry) => entry.id === statusId)) {
      throw new Error(`Missing required status "${statusId}"`);
    }
  }

  assertUniqueIds("classes", classes.classes);
  assertUniqueIds("skills", skills.skills);

  const skillIds = new Set(skills.skills.map((skill) => skill.id));
  const effectIds = new Set(effects.effects.map((effect) => effect.id));
  const statusIds = new Set(statusEffects.statuses.map((status) => status.id));
  for (const skill of skills.skills as any[]) {
    if (!skill.classId || !classes.classes.some((entry) => entry.id === skill.classId)) {
      throw new Error(`Skill "${skill.id}" references invalid classId`);
    }
    if (!Number.isInteger(skill.maxLv) || skill.maxLv < 1) {
      throw new Error(`Skill "${skill.id}" has invalid maxLv`);
    }
    if (!Array.isArray(skill.spCost) || skill.spCost.length !== skill.maxLv) {
      throw new Error(`Skill "${skill.id}" spCost must match maxLv`);
    }
    if (!Array.isArray(skill.powerPercent) || skill.powerPercent.length !== skill.maxLv) {
      throw new Error(`Skill "${skill.id}" powerPercent must match maxLv`);
    }
    if (!Array.isArray(skill.healPercent) || skill.healPercent.length !== skill.maxLv) {
      throw new Error(`Skill "${skill.id}" healPercent must match maxLv`);
    }
    if (!skill.formula || !skill.effectId || !skill.soundId || !skill.iconId) {
      throw new Error(`Skill "${skill.id}" is missing formula/effect/sound/icon references`);
    }
    if (!effectIds.has(skill.effectId)) {
      throw new Error(`Skill "${skill.id}" references missing effect "${skill.effectId}"`);
    }
    for (const prerequisite of skill.prerequisites ?? []) {
      if (!skillIds.has(prerequisite.skillId)) {
        throw new Error(`Skill "${skill.id}" references missing prerequisite "${prerequisite.skillId}"`);
      }
    }
    if (skill.statusEffect?.id && !statusIds.has(skill.statusEffect.id)) {
      throw new Error(`Skill "${skill.id}" references missing status "${skill.statusEffect.id}"`);
    }
  }
  const noviceSkillCount = skills.skills.filter((skill) => skill.classId === "novice").length;
  if (noviceSkillCount < 3) throw new Error("Novice requires at least 3 skills");
  for (const classEntry of classes.classes.filter((entry) => entry.id !== "novice")) {
    const count = skills.skills.filter((skill) => skill.classId === classEntry.id).length;
    if (count < 8) throw new Error(`Class "${classEntry.id}" requires at least 8 skills`);
  }
  assertUniqueIds("monsters", monsters.monsters);
  assertUniqueIds("items", items.items);
  assertUniqueIds("quests", quests.quests);
  assertUniqueIds("maps", maps.maps);
  assertUniqueIds("shops", shop.shops);
  assertUniqueIds("statuses", statusEffects.statuses);
  assertUniqueIds("dropTables", drops.dropTables);
  assertUniqueIds("effects", effects.effects);
  assertUniqueIds("genders", characterCreation.genders);
  assertUniqueIds("hairStyles", characterCreation.hairStyles);
  assertUniqueIds("hairColors", characterCreation.hairColors);
  assertUniqueIds("skinColors", characterCreation.skinColors);
  assertUniqueIds("outfits", characterCreation.outfits);
  assertUniqueIds("cutsceneFrames", cutscene.frames);
  assertUniqueIds("emotes", classes.emotes);
  assertUniqueIds("costumes", classes.costumes);
}

export const gameConfig = Object.freeze({
  classes,
  skills,
  monsters,
  items,
  quests,
  maps,
  shop,
  statusEffects,
  drops,
  formulas,
  effects,
  characterCreation,
  cutscene,
});

export type GameConfig = typeof gameConfig;

export function loadGameConfig(): GameConfig {
  validateGameConfig();
  return gameConfig;
}
