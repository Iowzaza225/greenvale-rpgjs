import monstersData from "../data/monsters.json" with { type: "json" };
import mapsData from "../data/maps.json" with { type: "json" };

export type MonsterAiType = "passive" | "aggressive" | "assist" | "ranged" | "coward" | "boss";

export type MonsterConfig = {
  id: string;
  nameKey: string;
  name?: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  moveSpeed: number;
  element: string;
  size: string;
  race: string;
  baseExp: number;
  jobExp: number;
  visionRange: number;
  attackRange: number;
  ai: MonsterAiType;
  skills: string[];
  dropTableId: string;
  sprite: string;
  sound: string;
  respawnMs: number;
  crit?: number;
  critResistance?: number;
  perfectDodge?: number;
  blockChance?: number;
  blockReduction?: number;
  aggro?: { memoryMs?: number; leashRange?: number; assistRadius?: number };
  basicAttack?: { element?: string; statusEffect?: { id: string; chance: number; durationMs?: number } };
  autoLootRadius?: number;
  cowardThreshold?: number;
  boss?: { fieldBoss?: boolean; bar?: boolean; phases?: Array<{ atHpRatio: number; skills?: string[]; enrage?: number }> };
  miniBoss?: { randomSpawnMinMs?: number; randomSpawnMaxMs?: number; announce?: boolean };
  bestiary?: { revealKills?: number; rewardKills?: number; rewardItemId?: string };
};

export type MonsterSpawn = {
  eventName: string;
  monsterId: string;
  zoneId: string;
  spawnIndex: number;
  x: number;
  y: number;
};

const monsters = (monstersData.monsters ?? []) as MonsterConfig[];

export function allMonsters(): MonsterConfig[] {
  return monsters.slice();
}

export function getMonsterConfig(id: string): MonsterConfig | null {
  return monsters.find(entry => entry.id === id) ?? null;
}

export function spawnEntriesForMap(mapId: string): MonsterSpawn[] {
  const map = (mapsData.maps as any[]).find(entry => entry.id === mapId);
  const zones = Array.isArray(map?.spawnZones) ? map.spawnZones : [];
  const result: MonsterSpawn[] = [];

  for (const zone of zones) {
    let used = 0;
    const maxAlive = Math.max(0, Number(zone.maxAlive) || 0);
    for (const entry of zone.entries ?? []) {
      const config = getMonsterConfig(String(entry.monsterId));
      if (!config) continue;
      const count = Math.max(0, Math.floor(Number(entry.count) || 0));
      const points = Array.isArray(entry.points) ? entry.points : [];
      for (let i = 0; i < count && used < maxAlive; i++, used++) {
        const point = points[i] ?? points[points.length - 1] ?? [760, 720];
        result.push({
          eventName: `${zone.id}-${config.id}-${i + 1}`,
          monsterId: config.id,
          zoneId: String(zone.id),
          spawnIndex: i,
          x: Number(point?.[0]) || 760,
          y: Number(point?.[1]) || 720,
        });
      }
    }
  }

  return result;
}

export function difficultyBand(playerLevel: number, monsterLevel: number): "trivial" | "easy" | "even" | "hard" | "deadly" {
  const delta = monsterLevel - playerLevel;
  if (delta <= -8) return "trivial";
  if (delta <= -3) return "easy";
  if (delta <= 3) return "even";
  if (delta <= 8) return "hard";
  return "deadly";
}

export function difficultyColor(playerLevel: number, monsterLevel: number): string {
  const band = difficultyBand(playerLevel, monsterLevel);
  if (band === "trivial") return "#9aa4aa";
  if (band === "easy") return "#7fd27d";
  if (band === "even") return "#f4e48a";
  if (band === "hard") return "#f2aa63";
  return "#ff6e6e";
}

export function bossPhaseIndex(config: MonsterConfig, hp: number, maxHp: number): number {
  const phases = config.boss?.phases ?? [];
  if (!phases.length || maxHp <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  let index = 0;
  for (let i = 0; i < phases.length; i++) {
    if (ratio <= Number(phases[i]?.atHpRatio ?? 0)) index = i + 1;
  }
  return index;
}

export function bestiaryProgress(config: MonsterConfig, kills: number) {
  const revealKills = Math.max(1, Number(config.bestiary?.revealKills) || 3);
  const rewardKills = Math.max(revealKills, Number(config.bestiary?.rewardKills) || 20);
  return {
    kills: Math.max(0, Math.floor(kills)),
    revealed: kills >= revealKills,
    rewardReady: kills >= rewardKills,
    revealKills,
    rewardKills,
    rewardItemId: config.bestiary?.rewardItemId ?? null,
  };
}
