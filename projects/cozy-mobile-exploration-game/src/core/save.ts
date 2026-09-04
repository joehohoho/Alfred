import { toPouch } from './inventory.ts';
import {
  PLAYER_MAX_HEALTH,
  SAVE_VERSION,
  createNewGameState,
  initialFlags,
  initialStats,
  type GameState,
  type ProgressionFlags,
  type ReturnPointId,
} from './progression.ts';
import { normalizeNodeState, type ResourceNodeStates } from './resources.ts';
import { normalizeSettings } from './settings.ts';
import type { RegionId } from './types.ts';
import { clamp, vec3, type Vec3 } from './vector.ts';

export const SAVE_KEY = 'wispmere.save.v1';

/**
 * Storage port. The game never touches `localStorage` directly, so tests can
 * hand it an in-memory map and the iOS shell could later hand it Capacitor
 * Preferences without a single gameplay file changing.
 */
export interface SaveAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/** For tests, headless runs, and any environment where storage is unavailable. */
export function createMemoryAdapter(seed: Record<string, string> = {}): SaveAdapter {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    read: (key) => store.get(key) ?? null,
    write: (key, value) => void store.set(key, value),
    remove: (key) => void store.delete(key),
  };
}

/**
 * Wraps `localStorage`, degrading to memory rather than throwing.
 * Private browsing and a full quota both make `localStorage` throw on write;
 * losing a save is bad, but crashing the game is worse.
 */
export function createBrowserAdapter(): SaveAdapter {
  const fallback = createMemoryAdapter();
  let storage: Storage | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__wispmere_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      storage = localStorage;
    }
  } catch {
    storage = null;
  }
  if (!storage) return fallback;
  const live = storage;
  return {
    read: (key) => {
      try {
        return live.getItem(key);
      } catch {
        return fallback.read(key);
      }
    },
    write: (key, value) => {
      try {
        live.setItem(key, value);
      } catch {
        fallback.write(key, value);
      }
    },
    remove: (key) => {
      try {
        live.removeItem(key);
      } catch {
        fallback.remove(key);
      }
    },
  };
}

const REGION_IDS: readonly RegionId[] = ['meadow', 'grove', 'glade'];
const RETURN_POINT_IDS: readonly ReturnPointId[] = ['meadow-waking-stone', 'hearthnest'];

function readBool(value: unknown): boolean {
  return value === true;
}

function readVec3(value: unknown, fallback: Vec3): Vec3 {
  const v = value as Partial<Vec3> | undefined;
  if (
    !v ||
    typeof v.x !== 'number' ||
    typeof v.y !== 'number' ||
    typeof v.z !== 'number' ||
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y) ||
    !Number.isFinite(v.z)
  ) {
    return { ...fallback };
  }
  // Clamp to a sane world box so a corrupt position cannot strand the player.
  return vec3(clamp(v.x, -200, 200), clamp(v.y, -50, 50), clamp(v.z, -200, 200));
}

function readFlags(value: unknown): ProgressionFlags {
  const raw = (value ?? {}) as Partial<Record<keyof ProgressionFlags, unknown>>;
  const flags = initialFlags();
  for (const key of Object.keys(flags) as Array<keyof ProgressionFlags>) {
    flags[key] = readBool(raw[key]);
  }
  // Consistency repair: the arc cannot have a later flag without its gate.
  // A hand-edited or partially-written save is coerced back onto the rails
  // rather than dropping the player into a region with no way back.
  if (flags.moonmereLandmarkRestored && !flags.guardianDefeated) {
    flags.moonmereLandmarkRestored = false;
  }
  if (flags.guardianDefeated && !flags.meadowLandmarkRestored) {
    flags.meadowLandmarkRestored = true;
  }
  if (flags.restedAtShelter && !flags.shelterBuilt) flags.shelterBuilt = true;
  if (flags.moonmereVisited && !flags.guardianDefeated) flags.moonmereVisited = false;
  return flags;
}

function readNodes(value: unknown, nowMs: number): ResourceNodeStates {
  const nodes: ResourceNodeStates = {};
  if (!value || typeof value !== 'object') return nodes;
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    const depletedAt = (entry as { depletedAt?: unknown })?.depletedAt;
    const normalized = normalizeNodeState(
      { depletedAt: typeof depletedAt === 'number' ? depletedAt : null },
      nowMs,
    );
    // Nodes that have fully renewed are dropped; the default is "available",
    // so keeping them would only grow the save forever.
    if (normalized.depletedAt !== null) nodes[id] = normalized;
  }
  return nodes;
}

/**
 * Turns whatever is in storage into a valid `GameState`.
 * Never throws and never returns a partially-populated state: anything it
 * cannot understand falls back to the corresponding new-game value.
 */
export function deserialize(raw: string | null, nowMs: number): GameState {
  const fresh = createNewGameState();
  if (!raw) return fresh;

  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fresh;
    parsed = value as Record<string, unknown>;
  } catch {
    return fresh;
  }

  // Only version 1 exists today. A save from a *newer* build is discarded
  // rather than half-read, which is the safe direction to fail.
  const version = typeof parsed.version === 'number' ? parsed.version : 0;
  if (version < 1 || version > SAVE_VERSION) return fresh;

  const flags = readFlags(parsed.flags);
  const statsRaw = (parsed.stats ?? {}) as Record<string, unknown>;
  const stats = initialStats();
  for (const key of ['gathersMade', 'creaturesSettled', 'timesRested', 'timesDefeated'] as const) {
    const n = statsRaw[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) stats[key] = Math.floor(n);
  }
  if (typeof statsRaw.finaleAt === 'number' && Number.isFinite(statsRaw.finaleAt)) {
    stats.finaleAt = statsRaw.finaleAt;
  }

  const regionsSeen = Array.isArray(parsed.regionsSeen)
    ? REGION_IDS.filter((id) => (parsed.regionsSeen as unknown[]).includes(id))
    : ['meadow' as RegionId];

  const returnPoint = RETURN_POINT_IDS.includes(parsed.returnPoint as ReturnPointId)
    ? (parsed.returnPoint as ReturnPointId)
    : fresh.returnPoint;

  const health =
    typeof parsed.playerHealth === 'number' && Number.isFinite(parsed.playerHealth)
      ? clamp(parsed.playerHealth, 0, PLAYER_MAX_HEALTH)
      : PLAYER_MAX_HEALTH;

  return {
    version: SAVE_VERSION,
    seed: typeof parsed.seed === 'number' && Number.isFinite(parsed.seed) ? parsed.seed : fresh.seed,
    pouch: toPouch(parsed.pouch as never),
    flags,
    weapon: flags.weaponUpgraded ? 'bright-chime' : 'willow-chime',
    nodes: readNodes(parsed.nodes, nowMs),
    // A save written mid-defeat would restore the player at 0 health with no
    // way to act; anyone loading in at zero simply wakes up at their return point.
    returnPoint,
    playerPosition: readVec3(parsed.playerPosition, fresh.playerPosition),
    playerHealth: health > 0 ? health : PLAYER_MAX_HEALTH,
    regionsSeen: regionsSeen.length > 0 ? regionsSeen : ['meadow'],
    settings: normalizeSettings(parsed.settings),
    stats,
    savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
  };
}

export function serialize(state: GameState, nowMs: number): string {
  return JSON.stringify({ ...state, version: SAVE_VERSION, savedAt: nowMs });
}

/**
 * Loads, saves and resets. Writes are debounced by the caller (the game writes
 * on milestones and on a slow timer, not every frame).
 */
export class SaveStore {
  constructor(
    private readonly adapter: SaveAdapter,
    private readonly key: string = SAVE_KEY,
  ) {}

  load(nowMs: number): GameState {
    return deserialize(this.adapter.read(this.key), nowMs);
  }

  save(state: GameState, nowMs: number): void {
    this.adapter.write(this.key, serialize(state, nowMs));
  }

  /** The visible development/reset action. Restores the new-player route. */
  reset(): GameState {
    this.adapter.remove(this.key);
    return createNewGameState();
  }

  hasSave(): boolean {
    return this.adapter.read(this.key) !== null;
  }
}
