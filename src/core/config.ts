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

  assertUniqueIds("classes", classes.classes);
  assertUniqueIds("skills", skills.skills);
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
