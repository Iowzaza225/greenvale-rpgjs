import creation from "../data/character_creation.json";
import emotes from "../data/emotes.json";
import {
  STAT_KEYS,
  calculateDerivedStats,
  defaultStats,
  getAvailableFirstJobs,
  getBaseCurve,
  getClassConfig,
  getJobCurve,
  getStarterWeaponId,
  getStatPointCost,
  isJobChangeEligible,
  normalizeStats,
  type StatBlock,
  type StatKey,
} from "./progression";
import { gameEvents } from "./event-bus";

export const SAVE_KEY = "greenvale.save";
export const SAVE_VERSION = 3;
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
  stats: StatBlock;
  statPoints: number;
  skillPoints: number;
  equipment: {
    weaponId: string;
    armorDef: number;
    gearMdef: number;
  };
  costumeId: string;
  emoteFavorites: string[];
  jobHistory: string[];
  rebirthCount: number;
  appearance: CharacterAppearance;
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

export type ExperienceResult = {
  character: CharacterSave;
  baseLevelsGained: number;
  jobLevelsGained: number;
  statPointsGained: number;
  skillPointsGained: number;
  jobChangeReady: boolean;
};

const slotCount = Number(creation.slots) || 3;
const allowedClasses = new Set(["novice", ...getAvailableFirstJobs().map((entry) => entry.id)]);
const defaultEmotes = emotes.emotes.map((entry) => entry.id).slice(0, 8);

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

function defaultEquipment(classId: string) {
  return {
    weaponId: getStarterWeaponId(classId),
    armorDef: 0,
    gearMdef: 0,
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

function earnedStatPointsToLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < Math.min(99, Math.max(1, level)); current++) {
    total += Number(getBaseCurve(current).statPointsOnLevelUp) || 0;
  }
  return total;
}

function earnedSkillPointsToLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < Math.min(50, Math.max(1, level)); current++) {
    total += Number(getJobCurve(current).skillPointsOnLevelUp) || 0;
  }
  return total;
}

function normalizeClassId(raw: unknown): string {
  const id = String(raw || "novice");
  return allowedClasses.has(id) ? id : "novice";
}

function normalizeCharacter(raw: any, slot: number): CharacterSave | null {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;

  const time = now();
  const classId = normalizeClassId(raw.classId);
  const baseLevel = Math.min(99, Math.max(1, Math.floor(Number(raw.baseLevel) || 1)));
  const classConfig = getClassConfig(classId);
  const jobMax = Number(classConfig.jobMaxLevel) || (classId === "novice" ? 10 : 50);
  const jobLevel = Math.min(jobMax, Math.max(1, Math.floor(Number(raw.jobLevel) || 1)));
  const stats = normalizeStats(raw.stats);
  const equipment = raw.equipment && typeof raw.equipment === "object"
    ? {
        weaponId: String(raw.equipment.weaponId || getStarterWeaponId(classId)),
        armorDef: Math.max(0, Number(raw.equipment.armorDef) || 0),
        gearMdef: Math.max(0, Number(raw.equipment.gearMdef) || 0),
      }
    : defaultEquipment(classId);

  return {
    id: String(raw.id || `local-${slot}-${raw.createdAt || time}`),
    slot,
    name: name.slice(0, Number(creation.nameRules.maxLength) || 12),
    classId,
    baseLevel,
    baseExp: Math.max(0, Math.floor(Number(raw.baseExp) || 0)),
    jobLevel,
    jobExp: Math.max(0, Math.floor(Number(raw.jobExp) || 0)),
    stats,
    statPoints: Math.max(
      0,
      Math.floor(
        Number.isFinite(Number(raw.statPoints))
          ? Number(raw.statPoints)
          : earnedStatPointsToLevel(baseLevel),
      ),
    ),
    skillPoints: Math.max(
      0,
      Math.floor(
        Number.isFinite(Number(raw.skillPoints))
          ? Number(raw.skillPoints)
          : earnedSkillPointsToLevel(jobLevel),
      ),
    ),
    equipment,
    costumeId: String(raw.costumeId || "none"),
    emoteFavorites: Array.isArray(raw.emoteFavorites)
      ? raw.emoteFavorites.map(String).filter((id: string) => defaultEmotes.includes(id)).slice(0, 8)
      : [...defaultEmotes],
    jobHistory: Array.isArray(raw.jobHistory)
      ? raw.jobHistory.map(String).filter((id: string) => allowedClasses.has(id))
      : classId === "novice" ? ["novice"] : ["novice", classId],
    rebirthCount: Math.max(0, Math.floor(Number(raw.rebirthCount) || 0)),
    appearance: {
      ...defaultAppearance(),
      ...(raw.appearance && typeof raw.appearance === "object" ? raw.appearance : {}),
    },
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
  const character = normalizeCharacter(
    {
      id: `legacy-${time}`,
      slot: 0,
      name: String(legacy.name).trim().slice(0, Number(creation.nameRules.maxLength) || 12) || "Survivor",
      classId: normalizeClassId(legacy.classId),
      baseLevel: Number(legacy.baseLevel) || 1,
      baseExp: Number(legacy.baseExp) || 0,
      jobLevel: Number(legacy.jobLevel) || 1,
      jobExp: Number(legacy.jobExp) || 0,
      stats: legacy.stats || defaultStats(),
      statPoints: legacy.statPoints,
      skillPoints: legacy.skillPoints,
      equipment: legacy.equipment,
      costumeId: legacy.costumeId || "none",
      appearance: defaultAppearance(),
      renameCredits: Number(creation.freeRenames) || 1,
      cutsceneSeen: true,
      tutorial: { step: 4, completed: true, trainingPotionUsed: true },
      quest: {
        kills: Math.min(3, Math.max(0, Number(legacy.kills) || 0)),
        completed: legacy.completed === true,
      },
      createdAt: time,
      updatedAt: time,
    },
    0,
  );

  if (character) {
    save.characters[0] = character;
    save.selectedCharacterId = character.id;
    save.updatedAt = time;
  }
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
  const character: CharacterSave = {
    id: `guest-${time.toString(36)}-${slot}`,
    slot,
    name: name.trim(),
    classId: "novice",
    baseLevel: 1,
    baseExp: 0,
    jobLevel: 1,
    jobExp: 0,
    stats: defaultStats(),
    statPoints: 0,
    skillPoints: 0,
    equipment: defaultEquipment("novice"),
    costumeId: "none",
    emoteFavorites: [...defaultEmotes],
    jobHistory: ["novice"],
    rebirthCount: 0,
    appearance: { ...appearance },
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
  const updated = normalizeCharacter(updater(clone) || clone, index);
  if (!updated) throw new Error("Character update became invalid");
  updated.updatedAt = now();
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

export function allocateStat(id: string, stat: StatKey): CharacterSave {
  if (!STAT_KEYS.includes(stat)) throw new Error("Invalid stat");
  return updateCharacter(id, (character) => {
    const current = character.stats[stat];
    if (current >= 99) throw new Error("Stat is already at maximum");
    const cost = getStatPointCost(current);
    if (character.statPoints < cost) throw new Error("Not enough stat points");
    character.statPoints -= cost;
    character.stats[stat] = current + 1;
    return character;
  });
}

export function gainExperience(id: string, baseGain: number, jobGain: number): ExperienceResult {
  const before = findCharacter(id);
  if (!before) throw new Error("Character not found");

  let baseLevelsGained = 0;
  let jobLevelsGained = 0;
  let statPointsGained = 0;
  let skillPointsGained = 0;

  const character = updateCharacter(id, (draft) => {
    draft.baseExp += Math.max(0, Math.floor(baseGain));
    while (draft.baseLevel < 99) {
      const row = getBaseCurve(draft.baseLevel);
      const required = Number(row.expToNext);
      if (!Number.isFinite(required) || required <= 0 || draft.baseExp < required) break;
      draft.baseExp -= required;
      const reward = Number(row.statPointsOnLevelUp) || 0;
      draft.baseLevel += 1;
      draft.statPoints += reward;
      baseLevelsGained += 1;
      statPointsGained += reward;
    }
    if (draft.baseLevel >= 99) draft.baseExp = 0;

    draft.jobExp += Math.max(0, Math.floor(jobGain));
    const jobMax = Number(getClassConfig(draft.classId).jobMaxLevel) || (draft.classId === "novice" ? 10 : 50);
    while (draft.jobLevel < jobMax) {
      const row = getJobCurve(draft.jobLevel);
      const required = Number(row.expToNext);
      if (!Number.isFinite(required) || required <= 0 || draft.jobExp < required) break;
      draft.jobExp -= required;
      const reward = Number(row.skillPointsOnLevelUp) || 0;
      draft.jobLevel += 1;
      draft.skillPoints += reward;
      jobLevelsGained += 1;
      skillPointsGained += reward;
    }
    if (draft.jobLevel >= jobMax) draft.jobExp = 0;
    return draft;
  });

  const result = {
    character,
    baseLevelsGained,
    jobLevelsGained,
    statPointsGained,
    skillPointsGained,
    jobChangeReady: isJobChangeEligible(character.classId, character.jobLevel),
  };
  gameEvents.emit("progression:experience", result);
  return result;
}

export function changeJob(id: string, targetClassId: string): CharacterSave {
  const allowed = getAvailableFirstJobs().some((entry) => entry.id === targetClassId);
  if (!allowed) throw new Error("Target class is not a first job");

  const current = findCharacter(id);
  if (!current || !isJobChangeEligible(current.classId, current.jobLevel)) {
    throw new Error("Job change requirements are not met");
  }

  const character = updateCharacter(id, (draft) => {
    draft.classId = targetClassId;
    draft.jobLevel = 1;
    draft.jobExp = 0;
    draft.equipment.weaponId = getStarterWeaponId(targetClassId);
    if (!draft.jobHistory.includes(targetClassId)) draft.jobHistory.push(targetClassId);
    return draft;
  });
  gameEvents.emit("progression:job-changed", { characterId: id, classId: targetClassId });
  return character;
}

export function setCostume(id: string, costumeId: string): CharacterSave {
  return updateCharacter(id, (character) => {
    character.costumeId = costumeId;
    return character;
  });
}

export function writeLegacyBridge(character: CharacterSave): void {
  const derived = calculateDerivedStats(character);
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
    baseExp: character.baseExp,
    jobLevel: character.jobLevel,
    jobExp: character.jobExp,
    stats: character.stats,
    statPoints: character.statPoints,
    skillPoints: character.skillPoints,
    equipment: character.equipment,
    costumeId: character.costumeId,
    derived,
    updatedAt: now(),
  };
  localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(legacy));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("greenvale:profile-updated", { detail: legacy }));
  }
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
