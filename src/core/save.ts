import creation from "../data/character_creation.json";
import { gameEvents } from "./event-bus";

export const SAVE_KEY = "greenvale.save";
export const SAVE_VERSION = 2;
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
  classId: "novice";
  baseLevel: number;
  jobLevel: number;
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

const slotCount = Number(creation.slots) || 3;

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

function normalizeCharacter(raw: any, slot: number): CharacterSave | null {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim();
  if (!name) return null;
  const time = now();
  return {
    id: String(raw.id || `local-${slot}-${raw.createdAt || time}`),
    slot,
    name: name.slice(0, Number(creation.nameRules.maxLength) || 12),
    classId: "novice",
    baseLevel: Math.max(1, Number(raw.baseLevel) || 1),
    jobLevel: Math.max(1, Number(raw.jobLevel) || 1),
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
  const character: CharacterSave = {
    id: `legacy-${time}`,
    slot: 0,
    name: String(legacy.name).trim().slice(0, Number(creation.nameRules.maxLength) || 12) || "Survivor",
    classId: "novice",
    baseLevel: 1,
    jobLevel: 1,
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
  return (
    save.characters.find((char) => char?.id === save.selectedCharacterId) ??
    null
  );
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
    jobLevel: 1,
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

export function writeLegacyBridge(character: CharacterSave): void {
  const legacy = {
    name: character.name,
    classId: "novice",
    started: true,
    kills: character.quest.kills,
    completed: character.quest.completed,
    rewardClaimed: character.quest.completed,
    characterId: character.id,
    saveVersion: SAVE_VERSION,
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
