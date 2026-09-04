import { addToPouch, canAfford, emptyPouch, spend, type Pouch } from './inventory.ts';
import { COSTS, STARTER_STOCK, type WeaponTier } from './recipes.ts';
import type { ResourceNodeStates } from './resources.ts';
import { DEFAULT_SETTINGS, type Settings } from './settings.ts';
import type { RegionId, ResourceBundle } from './types.ts';
import { vec3, type Vec3 } from './vector.ts';

export const SAVE_VERSION = 1;

/**
 * Every milestone the brief asks to persist. Booleans only — no partial
 * progress, no counters — so a save is trivially inspectable and every
 * transition is a single testable predicate.
 */
export interface ProgressionFlags {
  weaponUpgraded: boolean;
  shelterBuilt: boolean;
  restedAtShelter: boolean;
  companionBefriended: boolean;
  meadowLandmarkRestored: boolean;
  guardianDefeated: boolean;
  moonmereVisited: boolean;
  moonmereLandmarkRestored: boolean;
}

export function initialFlags(): ProgressionFlags {
  return {
    weaponUpgraded: false,
    shelterBuilt: false,
    restedAtShelter: false,
    companionBefriended: false,
    meadowLandmarkRestored: false,
    guardianDefeated: false,
    moonmereVisited: false,
    moonmereLandmarkRestored: false,
  };
}

export type ReturnPointId = 'meadow-waking-stone' | 'hearthnest';

export interface PlayerStats {
  gathersMade: number;
  creaturesSettled: number;
  timesRested: number;
  timesDefeated: number;
  /** Epoch ms of the finale, or null. Used for the completion card. */
  finaleAt: number | null;
}

export function initialStats(): PlayerStats {
  return {
    gathersMade: 0,
    creaturesSettled: 0,
    timesRested: 0,
    timesDefeated: 0,
    finaleAt: null,
  };
}

/** The complete saved model. Everything else is derived from this. */
export interface GameState {
  version: number;
  /** World generation seed. Fixed for the authored world; kept for debugging. */
  seed: number;
  pouch: Pouch;
  flags: ProgressionFlags;
  weapon: WeaponTier;
  nodes: ResourceNodeStates;
  returnPoint: ReturnPointId;
  playerPosition: Vec3;
  playerHealth: number;
  regionsSeen: RegionId[];
  settings: Settings;
  stats: PlayerStats;
  /** Epoch ms the save was last written. Only used for diagnostics. */
  savedAt: number;
}

export const PLAYER_MAX_HEALTH = 100;

/**
 * Return points stand *beside* their landmark, not on it.
 *
 * The Waking Stone and the Hearthnest are solid objects at
 * `PLACES.wakingStone` and `PLACES.shelterClearing`; spawning at those exact
 * coordinates puts the player inside the geometry.
 */
export const WAKING_STONE_POSITION: Vec3 = vec3(-14.2, 0, 16.6);
export const HEARTHNEST_POSITION: Vec3 = vec3(-2.1, 0, 22.7);

export const RETURN_POINTS: Record<ReturnPointId, { name: string; position: Vec3 }> = {
  'meadow-waking-stone': { name: 'the Waking Stone', position: WAKING_STONE_POSITION },
  hearthnest: { name: 'your Hearthnest', position: HEARTHNEST_POSITION },
};

export function createNewGameState(seed = 20260904): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    pouch: emptyPouch(),
    flags: initialFlags(),
    weapon: 'willow-chime',
    nodes: {},
    returnPoint: 'meadow-waking-stone',
    playerPosition: { ...WAKING_STONE_POSITION },
    playerHealth: PLAYER_MAX_HEALTH,
    regionsSeen: ['meadow'],
    settings: { ...DEFAULT_SETTINGS },
    stats: initialStats(),
    savedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Derived predicates
// ---------------------------------------------------------------------------

/** The grove gate opens only once the meadow Dawnspire is lit. */
export function isGroveUnlocked(state: GameState): boolean {
  return state.flags.meadowLandmarkRestored;
}

/** The mistveil to Moonmere parts only once Bramblehorn has settled. */
export function isGladeUnlocked(state: GameState): boolean {
  return state.flags.guardianDefeated;
}

export function accessibleRegions(state: GameState): Set<RegionId> {
  const regions = new Set<RegionId>(['meadow']);
  if (isGroveUnlocked(state)) regions.add('grove');
  if (isGladeUnlocked(state)) regions.add('glade');
  return regions;
}

/** True once the player holds the small starter stock of all three families. */
export function hasStarterStock(state: GameState): boolean {
  return canAfford(state.pouch, STARTER_STOCK);
}

/** The finale has happened; the game is now open-ended. */
export function isFinaleComplete(state: GameState): boolean {
  return state.flags.moonmereLandmarkRestored;
}

// ---------------------------------------------------------------------------
// Transitions
//
// Every one of these is a pure `state -> state` function returning a *new*
// object. Nothing here reads a clock or a random source; callers pass `nowMs`.
// That is what lets the whole progression arc be exercised in a unit test.
// ---------------------------------------------------------------------------

export interface TransitionResult {
  state: GameState;
  ok: boolean;
  /** Present when `ok` is false. */
  reason?: string;
}

const fail = (state: GameState, reason: string): TransitionResult => ({
  state,
  ok: false,
  reason,
});

export function collectResources(state: GameState, bundle: ResourceBundle): GameState {
  return {
    ...state,
    pouch: addToPouch(state.pouch, bundle),
    stats: { ...state.stats, gathersMade: state.stats.gathersMade + 1 },
  };
}

/** A creature settles down and leaves a Glimmercore behind. */
export function settleCreature(state: GameState, cores = 1): GameState {
  return {
    ...state,
    pouch: addToPouch(state.pouch, { glimmercore: cores }),
    stats: { ...state.stats, creaturesSettled: state.stats.creaturesSettled + 1 },
  };
}

export function upgradeWeapon(state: GameState): TransitionResult {
  if (state.flags.weaponUpgraded) return fail(state, 'The Bright Chime is already yours.');
  if (!canAfford(state.pouch, COSTS.weaponUpgrade)) {
    return fail(state, 'Ossa needs a little more to work with.');
  }
  return {
    ok: true,
    state: {
      ...state,
      pouch: spend(state.pouch, COSTS.weaponUpgrade),
      weapon: 'bright-chime',
      flags: { ...state.flags, weaponUpgraded: true },
    },
  };
}

export function buildShelter(state: GameState): TransitionResult {
  if (state.flags.shelterBuilt) return fail(state, 'Your Hearthnest already stands here.');
  if (!canAfford(state.pouch, COSTS.shelter)) {
    return fail(state, 'The clearing needs more to build with.');
  }
  return {
    ok: true,
    state: {
      ...state,
      pouch: spend(state.pouch, COSTS.shelter),
      flags: { ...state.flags, shelterBuilt: true },
    },
  };
}

/**
 * Resting restores health and makes the Hearthnest the active return point.
 * It is repeatable — a rest is also just a nice thing to do.
 */
export function restAtShelter(state: GameState): TransitionResult {
  if (!state.flags.shelterBuilt) return fail(state, 'There is nowhere to rest yet.');
  return {
    ok: true,
    state: {
      ...state,
      flags: { ...state.flags, restedAtShelter: true },
      returnPoint: 'hearthnest',
      playerHealth: PLAYER_MAX_HEALTH,
      stats: { ...state.stats, timesRested: state.stats.timesRested + 1 },
    },
  };
}

export function befriendCompanion(state: GameState): TransitionResult {
  if (state.flags.companionBefriended) return fail(state, 'Pim is already with you.');
  return {
    ok: true,
    state: { ...state, flags: { ...state.flags, companionBefriended: true } },
  };
}

export type LandmarkId = 'meadow-dawnspire' | 'moonmere-dawnspire';

export const LANDMARKS: Record<
  LandmarkId,
  { name: string; region: RegionId; cost: ResourceBundle; position: Vec3 }
> = {
  'meadow-dawnspire': {
    name: 'the Meadow Dawnspire',
    region: 'meadow',
    cost: COSTS.landmarkMeadow,
    position: vec3(18, 0, -4),
  },
  'moonmere-dawnspire': {
    name: 'the Moonmere Dawnspire',
    region: 'glade',
    cost: COSTS.landmarkMoonmere,
    position: vec3(52, 0, -46),
  },
};

export function isLandmarkRestored(state: GameState, id: LandmarkId): boolean {
  return id === 'meadow-dawnspire'
    ? state.flags.meadowLandmarkRestored
    : state.flags.moonmereLandmarkRestored;
}

export function restoreLandmark(
  state: GameState,
  id: LandmarkId,
  nowMs: number,
): TransitionResult {
  if (isLandmarkRestored(state, id)) return fail(state, 'This spire is already awake.');

  // The finale spire cannot be lit before the grove guardian has settled,
  // because Moonmere is not reachable until then. Guarding it here as well as
  // in the world layout means a hand-edited save cannot skip the arc.
  if (id === 'moonmere-dawnspire' && !state.flags.guardianDefeated) {
    return fail(state, 'Moonmere is still behind the mistveil.');
  }
  const cost = LANDMARKS[id].cost;
  if (!canAfford(state.pouch, cost)) return fail(state, 'The spire is still hungry.');

  const flags: ProgressionFlags = { ...state.flags };
  if (id === 'meadow-dawnspire') flags.meadowLandmarkRestored = true;
  else flags.moonmereLandmarkRestored = true;

  return {
    ok: true,
    state: {
      ...state,
      pouch: spend(state.pouch, cost),
      flags,
      stats: {
        ...state.stats,
        finaleAt: id === 'moonmere-dawnspire' ? nowMs : state.stats.finaleAt,
      },
    },
  };
}

export function defeatGuardian(state: GameState): GameState {
  if (state.flags.guardianDefeated) return state;
  return {
    ...state,
    pouch: addToPouch(state.pouch, { glimmercore: 1 }),
    flags: { ...state.flags, guardianDefeated: true },
    stats: { ...state.stats, creaturesSettled: state.stats.creaturesSettled + 1 },
  };
}

export function markRegionSeen(state: GameState, region: RegionId): GameState {
  const flags =
    region === 'glade' && !state.flags.moonmereVisited
      ? { ...state.flags, moonmereVisited: true }
      : state.flags;
  if (state.regionsSeen.includes(region) && flags === state.flags) return state;
  return {
    ...state,
    flags,
    regionsSeen: state.regionsSeen.includes(region)
      ? state.regionsSeen
      : [...state.regionsSeen, region],
  };
}

/**
 * Defeat is deliberately gentle: full health, back to the active return point,
 * and **nothing is lost** — no pouch drop, no durability, no retrieval run.
 * The only cost is the walk back.
 */
export function returnHome(state: GameState): GameState {
  const point = RETURN_POINTS[state.returnPoint];
  return {
    ...state,
    playerHealth: PLAYER_MAX_HEALTH,
    playerPosition: { ...point.position },
    stats: { ...state.stats, timesDefeated: state.stats.timesDefeated + 1 },
  };
}
