import creation from "../data/character_creation.json";
import classesData from "../data/classes.json";
import { gameEvents } from "./event-bus";
import {
  applyExperience,
  calculateDerivedStats,
  changeJob,
  createInitialProgression,
  normalizeProgression,
  spendStatPoint,
  type BaseStats,
  type CharacterProgression,
  type StatKey,
} from "./character";
import {
  applySkillPassives,
  assignHotbar,
  defaultAutoBattle,
  learnSkillLevel,
  normalizeAutoBattle,
  normalizeHotbar,
  normalizeLearnedSkills,
  resetLearnedSkills,
  sanitizeHotbarForLearned,
  type AutoBattleSettings,
  type HotbarSlot,
  type LearnedSkills,
} from "./skills";

export const SAVE_KEY = "greenvale.save";
export const SAVE_VERSION = 4;
const LEGACY_PROFILE_KEY = "greenvale.profile.v1";

export type GenderId = "female" | "male";
export type PreviewDirection = "south" | "west" | "north" | "east";
export type PreviewAnimation = "idle" | "walk" | "attack";

export type CharacterAppearance = {
  gender: GenderId;
  hairStyle: string;
  hairColor: string;
  skinColor: string;
  outfit: string;
};

export type TutorialState = {
  step: number;
  completed: boolean;
  trainingPotionUsed: boolean;
};

export type CharacterSave = {
  id: string;
  slot: number;
  name: string;
  classId: string;
  baseLevel: number;
  baseExp: number;
  jobLevel: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  stats: BaseStats;
  appearance: CharacterAppearance;
  costumeId: string;
  learnedSkills: LearnedSkills;
  hotbar: HotbarSlot[];
  autoBattle: AutoBattleSettings;
  skillResetItems: number;
  renameCredits: number;
  cutsceneSeen: boolean;
  tutorial: TutorialState;
  quest: {
    kills: number;
    completed: boolean;
  };
  createdAt: number;
  updatedAt: number;
};

export type GreenvaleSave = {
  version: number;
  account: {
    mode: "guest";
    id: "guest-local";
  };
  selectedCharacterId: string | null;
  characters: Array<CharacterSave | null>;
  createdAt: number;
  updatedAt: number;
};

const slotCount = Number(creation.slots) || 3;
const validClassIds = new Set(classesData.classes.map((entry) => entry.id));
const validCostumeIds = new Set(classesData.costumes.map((entry) => entry.id));

function now(): number {
  return Date.now();
}

function defaultAppearance(): CharacterAppearance {
  return {
    gender: "female",
    hairStyle: creation.hairStyles[0]?.id ?? "crop",
    hairColor: creation.hairColors[0]?.id ?? "coal",
    skinColor: creation.skinColors[1]?.id ?? "warm",
    outfit: creation.outfits[0]?.id ?? "field",
  };
}

function emptySave(): GreenvaleSave {
  const time = now();
  return {
    version: SAVE_VERSION,
    account: { mode: "guest", id: "guest-local" },
    selectedCharacterId: null,
    characters: Array.from({ length: slotCount }, () => null),
    createdAt: time,
    updatedAt: time,
  };
}

function safeParse(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function progressionFromRaw(raw: any): CharacterProgression {
  const normalized = normalizeProgression({
    baseLevel: raw?.baseLevel,
    baseExp: raw?.baseExp,
    jobLevel: raw?.jobLevel,
    jobExp: raw?.jobExp,
    statPoints: raw?.statPoints,
    skillPoints: raw?.skillPoints,
    stats: raw?.stats,
  });

  // Version 2 had levels but no spendable progression pools. Give migrated
  // characters the points they would have earned so old saves are not penalized.
  if (raw && raw.stats == null && raw.statPoints == null && raw.skillPoints == null) {
    normalized.statPoints = Math.max(0, normalized.baseLevel - 1) * 3;
    normalized.skillPoints = Math.max(0, normalized.jobLevel - 1);
  }
  return normalized;
}

function normalizeCharacter(raw: any, slot: number): CharacterSave | null {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;
  const time = now();
  const progression = progressionFromRaw(raw);
  const classId = validClassIds.has(String(raw.classId)) ? String(raw.classId) : "novice";
  const costumeId = validCostumeIds.has(String(raw.costumeId)) ? String(raw.costumeId) : "none";
  const learnedSkills = normalizeLearnedSkills(raw.learnedSkills);
  const hotbar = sanitizeHotbarForLearned(normalizeHotbar(raw.hotbar), learnedSkills);

  return {
    id: String(raw.id || `local-${slot}-${raw.createdAt || time}`),
    slot,
    name: name.slice(0, Number(creation.nameRules.maxLength) || 12),
    classId,
    baseLevel: progression.baseLevel,
    baseExp: progression.baseExp,
    jobLevel: progression.jobLevel,
    jobExp: progression.jobExp,
    statPoints: progression.statPoints,
    skillPoints: progression.skillPoints,
    stats: progression.stats,
    appearance: {
      ...defaultAppearance(),
      ...(raw.appearance && typeof raw.appearance === "object" ? raw.appearance : {}),
    },
    costumeId,
    learnedSkills,
    hotbar,
    autoBattle: normalizeAutoBattle(raw.autoBattle),
    skillResetItems: Math.max(0, Math.floor(Number(raw.skillResetItems ?? 1) || 0)),
    renameCredits: Math.max(0, Number(raw.renameCredits ?? creation.freeRenames) || 0),
    cutsceneSeen: raw.cutsceneSeen === true,
    tutorial: {
      step: Math.max(0, Number(raw.tutorial?.step) || 0),
      completed: raw.tutorial?.completed === true,
      trainingPotionUsed: raw.tutorial?.trainingPotionUsed === true,
    },
    quest: {
      kills: Math.min(3, Math.max(0, Number(raw.quest?.kills) || 0)),
      completed: raw.quest?.completed === true,
    },
    createdAt: Number(raw.createdAt) || time,
    updatedAt: Number(raw.updatedAt) || time,
  };
}

function migrateLegacy(): GreenvaleSave {
  const save = emptySave();
  const legacy = safeParse(localStorage.getItem(LEGACY_PROFILE_KEY));
  if (!legacy?.name || legacy.started !== true) return save;

  const time = now();
  const progression = createInitialProgression();
  const character: CharacterSave = {
    id: `legacy-${time}`,
    slot: 0,
    name: String(legacy.name).trim().slice(0, Number(creation.nameRules.maxLength) || 12) || "Survivor",
    classId: validClassIds.has(String(legacy.classId)) ? String(legacy.classId) : "novice",
    baseLevel: progression.baseLevel,
    baseExp: progression.baseExp,
    jobLevel: progression.jobLevel,
    jobExp: progression.jobExp,
    statPoints: progression.statPoints,
    skillPoints: progression.skillPoints,
    stats: progression.stats,
    appearance: defaultAppearance(),
    costumeId: "none",
    learnedSkills: normalizeLearnedSkills(null),
    hotbar: normalizeHotbar(null),
    autoBattle: defaultAutoBattle(),
    skillResetItems: 1,
    renameCredits: Number(creation.freeRenames) || 1,
    cutsceneSeen: true,
    tutorial: { step: 4, completed: true, trainingPotionUsed: true },
    quest: {
      kills: Math.min(3, Math.max(0, Number(legacy.kills) || 0)),
      completed: legacy.completed === true,
    },
    createdAt: time,
    updatedAt: time,
  };
  save.characters[0] = character;
  save.selectedCharacterId = character.id;
  save.updatedAt = time;
  return save;
}

function normalizeSave(raw: any): GreenvaleSave {
  if (!raw || typeof raw !== "object") return migrateLegacy();

  const createdAt = Number(raw.createdAt) || now();
  const chars = Array.from({ length: slotCount }, (_, slot) =>
    normalizeCharacter(raw.characters?.[slot], slot),
  );
  const ids = new Set(chars.filter(Boolean).map((char) => char!.id));
  const selected = ids.has(String(raw.selectedCharacterId || ""))
    ? String(raw.selectedCharacterId)
    : null;

  return {
    version: SAVE_VERSION,
    account: { mode: "guest", id: "guest-local" },
    selectedCharacterId: selected,
    characters: chars,
    createdAt,
    updatedAt: Number(raw.updatedAt) || now(),
  };
}

function progressionOf(character: CharacterSave): CharacterProgression {
  return normalizeProgression(character);
}

function applyProgression(character: CharacterSave, next: CharacterProgression): void {
  character.baseLevel = next.baseLevel;
  character.baseExp = next.baseExp;
  character.jobLevel = next.jobLevel;
  character.jobExp = next.jobExp;
  character.statPoints = next.statPoints;
  character.skillPoints = next.skillPoints;
  character.stats = next.stats;
}

export function loadSave(): GreenvaleSave {
  const parsed = safeParse(localStorage.getItem(SAVE_KEY));
  const save = normalizeSave(parsed);
  if (!parsed || Number(parsed.version) !== SAVE_VERSION) {
    writeSave(save);
    gameEvents.emit("save:migrated", { from: Number(parsed?.version) || 0, to: SAVE_VERSION });
  }
  return save;
}

export function writeSave(save: GreenvaleSave): GreenvaleSave {
  const normalized = normalizeSave({ ...save, version: SAVE_VERSION, updatedAt: now() });
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalized));
  gameEvents.emit("save:changed", normalized);
  return normalized;
}

export function listCharacters(): Array<CharacterSave | null> {
  return loadSave().characters;
}

export function getSelectedCharacter(): CharacterSave | null {
  const save = loadSave();
  return save.characters.find((char) => char?.id === save.selectedCharacterId) ?? null;
}

export function findCharacter(id: string): CharacterSave | null {
  return loadSave().characters.find((char) => char?.id === id) ?? null;
}

export function isNameTaken(name: string, exceptCharacterId?: string): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return loadSave().characters.some(
    (char) =>
      !!char &&
      char.id !== exceptCharacterId &&
      char.name.trim().toLocaleLowerCase() === normalized,
  );
}

export function createCharacter(
  slot: number,
  name: string,
  appearance: CharacterAppearance,
): CharacterSave {
  const save = loadSave();
  if (slot < 0 || slot >= slotCount) throw new Error("Invalid character slot");
  if (save.characters[slot]) throw new Error("Character slot is already occupied");
  const time = now();
  const progression = createInitialProgression();
  const character: CharacterSave = {
    id: `guest-${time.toString(36)}-${slot}`,
    slot,
    name: name.trim(),
    classId: "novice",
    baseLevel: progression.baseLevel,
    baseExp: progression.baseExp,
    jobLevel: progression.jobLevel,
    jobExp: progression.jobExp,
    statPoints: progression.statPoints,
    skillPoints: progression.skillPoints,
    stats: progression.stats,
    appearance: { ...appearance },
    costumeId: "none",
    learnedSkills: normalizeLearnedSkills(null),
    hotbar: normalizeHotbar(null),
    autoBattle: defaultAutoBattle(),
    skillResetItems: 1,
    renameCredits: Number(creation.freeRenames) || 1,
    cutsceneSeen: false,
    tutorial: { step: 0, completed: false, trainingPotionUsed: false },
    quest: { kills: 0, completed: false },
    createdAt: time,
    updatedAt: time,
  };
  save.characters[slot] = character;
  save.selectedCharacterId = character.id;
  writeSave(save);
  return character;
}

export function selectCharacter(id: string): CharacterSave {
  const save = loadSave();
  const character = save.characters.find((char) => char?.id === id);
  if (!character) throw new Error("Character not found");
  save.selectedCharacterId = character.id;
  writeSave(save);
  writeLegacyBridge(character);
  return character;
}

export function updateCharacter(
  id: string,
  updater: (character: CharacterSave) => CharacterSave | void,
): CharacterSave {
  const save = loadSave();
  const index = save.characters.findIndex((char) => char?.id === id);
  const current = index >= 0 ? save.characters[index] : null;
  if (!current) throw new Error("Character not found");
  const clone: CharacterSave = JSON.parse(JSON.stringify(current));
  const updated = updater(clone) || clone;
  updated.updatedAt = now();
  updated.slot = index;
  save.characters[index] = updated;
  writeSave(save);
  if (save.selectedCharacterId === updated.id) writeLegacyBridge(updated);
  return updated;
}

export function renameCharacter(id: string, newName: string): CharacterSave {
  return updateCharacter(id, (character) => {
    if (character.renameCredits <= 0) throw new Error("No free rename remaining");
    character.name = newName.trim();
    character.renameCredits -= 1;
    return character;
  });
}

export function deleteCharacter(id: string): void {
  const save = loadSave();
  const index = save.characters.findIndex((char) => char?.id === id);
  if (index < 0) return;
  save.characters[index] = null;
  if (save.selectedCharacterId === id) save.selectedCharacterId = null;
  writeSave(save);
}

export function gainSelectedExperience(baseExp: number, jobExp: number, source = "unknown"): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  let summary = { baseLevelsGained: 0, jobLevelsGained: 0 };
  const updated = updateCharacter(selected.id, (character) => {
    const result = applyExperience(progressionOf(character), baseExp, jobExp);
    applyProgression(character, result.progression);
    summary = {
      baseLevelsGained: result.baseLevelsGained,
      jobLevelsGained: result.jobLevelsGained,
    };
    return character;
  });
  gameEvents.emit("character:exp", {
    characterId: updated.id,
    source,
    baseExp,
    jobExp,
    ...summary,
    baseLevel: updated.baseLevel,
    jobLevel: updated.jobLevel,
  });
  return updated;
}

export function spendSelectedStat(key: StatKey): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const updated = updateCharacter(selected.id, (character) => {
    const next = spendStatPoint(progressionOf(character), key);
    applyProgression(character, next);
    return character;
  });
  gameEvents.emit("character:stat-spent", { characterId: updated.id, key, value: updated.stats[key] });
  return updated;
}

export function changeSelectedJob(targetClassId: string): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const from = selected.classId;
  const updated = updateCharacter(selected.id, (character) => {
    const next = changeJob(character.classId, targetClassId, progressionOf(character));
    applyProgression(character, next);
    character.classId = targetClassId;
    return character;
  });
  gameEvents.emit("character:job-changed", { characterId: updated.id, from, to: targetClassId });
  return updated;
}

export function learnSelectedSkill(skillId: string): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const updated = updateCharacter(selected.id, (character) => {
    const result = learnSkillLevel(character.learnedSkills, character.classId, character.skillPoints, skillId);
    character.learnedSkills = result.learned;
    character.skillPoints = result.skillPoints;
    character.hotbar = sanitizeHotbarForLearned(character.hotbar, character.learnedSkills);
    return character;
  });
  gameEvents.emit("character:skill-learned", { characterId: updated.id, skillId, level: updated.learnedSkills[skillId] || 0 });
  return updated;
}

export function assignSelectedHotbar(slot: number, skillId: string | null): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const updated = updateCharacter(selected.id, (character) => {
    character.hotbar = assignHotbar(character.hotbar, character.learnedSkills, slot, skillId);
    return character;
  });
  gameEvents.emit("character:hotbar", { characterId: updated.id, slot, skillId });
  return updated;
}

export function resetSelectedSkills(): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  if (selected.skillResetItems <= 0) throw new Error("No skill reset item");
  const updated = updateCharacter(selected.id, (character) => {
    const reset = resetLearnedSkills(character.learnedSkills);
    character.learnedSkills = reset.learned;
    character.skillPoints += reset.refunded;
    character.skillResetItems -= 1;
    character.hotbar = sanitizeHotbarForLearned(character.hotbar, character.learnedSkills);
    return character;
  });
  gameEvents.emit("character:skills-reset", { characterId: updated.id });
  return updated;
}

export function updateSelectedAutoBattle(next: Partial<AutoBattleSettings>): CharacterSave | null {
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const updated = updateCharacter(selected.id, (character) => {
    character.autoBattle = normalizeAutoBattle({ ...character.autoBattle, ...next });
    return character;
  });
  gameEvents.emit("character:auto-battle", { characterId: updated.id, settings: updated.autoBattle });
  return updated;
}

export function equipSelectedCostume(costumeId: string): CharacterSave | null {
  if (!validCostumeIds.has(costumeId)) throw new Error("Invalid costume");
  const selected = getSelectedCharacter();
  if (!selected) return null;
  const updated = updateCharacter(selected.id, (character) => {
    character.costumeId = costumeId;
    return character;
  });
  gameEvents.emit("character:costume", { characterId: updated.id, costumeId });
  return updated;
}

export function triggerSelectedEmote(emoteId: string): void {
  const valid = classesData.emotes.some((entry) => entry.id === emoteId);
  if (!valid) throw new Error("Invalid emote");
  const selected = getSelectedCharacter();
  if (!selected) return;
  gameEvents.emit("character:emote", { characterId: selected.id, emoteId, at: now() });
  window.dispatchEvent(new CustomEvent("greenvale:emote", { detail: { emoteId } }));
}

export function writeLegacyBridge(character: CharacterSave): void {
  const derived = applySkillPassives(
    calculateDerivedStats(character.classId, progressionOf(character)),
    character.learnedSkills,
  );
  const legacy = {
    name: character.name,
    classId: character.classId,
    started: true,
    kills: character.quest.kills,
    completed: character.quest.completed,
    rewardClaimed: character.quest.completed,
    characterId: character.id,
    saveVersion: SAVE_VERSION,
    baseLevel: character.baseLevel,
    jobLevel: character.jobLevel,
    stats: character.stats,
    derived,
    costumeId: character.costumeId,
    learnedSkills: character.learnedSkills,
    hotbar: character.hotbar,
    autoBattle: character.autoBattle,
    updatedAt: now(),
  };
  localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(legacy));
}

export function syncSelectedFromLegacy(): void {
  const legacy = safeParse(localStorage.getItem(LEGACY_PROFILE_KEY));
  const selected = getSelectedCharacter();
  if (!legacy || !selected) return;
  updateCharacter(selected.id, (character) => {
    character.quest.kills = Math.min(3, Math.max(0, Number(legacy.kills) || 0));
    character.quest.completed = legacy.completed === true;
    return character;
  });
}
