import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SaveStore,
  createMemoryAdapter,
  deserialize,
  serialize,
} from '../../src/core/save.ts';
import {
  PLAYER_MAX_HEALTH,
  createNewGameState,
  type GameState,
} from '../../src/core/progression.ts';
import { DEFAULT_SETTINGS } from '../../src/core/settings.ts';
import { renewalMs } from '../../src/core/resources.ts';

const T0 = 1_700_000_000_000;

describe('round trip', () => {
  it('preserves a fully-played save exactly', () => {
    const state: GameState = {
      ...createNewGameState(),
      pouch: { sunpetal: 4, boughwood: 2, riverstone: 7, glimmercore: 3 },
      flags: {
        weaponUpgraded: true,
        shelterBuilt: true,
        restedAtShelter: true,
        companionBefriended: true,
        meadowLandmarkRestored: true,
        guardianDefeated: true,
        moonmereVisited: true,
        moonmereLandmarkRestored: true,
      },
      weapon: 'bright-chime',
      nodes: { 'petal-waking-0': { depletedAt: T0 - 5000 } },
      returnPoint: 'hearthnest',
      playerPosition: { x: 12.5, y: 0.4, z: -6.25 },
      playerHealth: 63,
      regionsSeen: ['meadow', 'grove', 'glade'],
      stats: {
        gathersMade: 41,
        creaturesSettled: 9,
        timesRested: 3,
        timesDefeated: 2,
        finaleAt: T0 - 1000,
      },
    };

    const restored = deserialize(serialize(state, T0), T0);
    expect(restored.pouch).toEqual(state.pouch);
    expect(restored.flags).toEqual(state.flags);
    expect(restored.weapon).toBe('bright-chime');
    expect(restored.returnPoint).toBe('hearthnest');
    expect(restored.playerPosition).toEqual(state.playerPosition);
    expect(restored.playerHealth).toBe(63);
    expect(restored.regionsSeen).toEqual(['meadow', 'grove', 'glade']);
    expect(restored.stats).toEqual(state.stats);
    expect(restored.nodes['petal-waking-0']).toEqual({ depletedAt: T0 - 5000 });
  });

  it('keeps node renewal deadlines across a restart', () => {
    const state = {
      ...createNewGameState(),
      nodes: { 'petal-waking-0': { depletedAt: T0 } },
    };
    const raw = serialize(state, T0);

    // Restart 30 seconds later: still counting down from the original stamp.
    const soon = deserialize(raw, T0 + 30_000);
    expect(soon.nodes['petal-waking-0']).toEqual({ depletedAt: T0 });

    // Restart long after: the node has renewed and is dropped from the save.
    const later = deserialize(raw, T0 + renewalMs('sunpetal') + 1000);
    expect(later.nodes['petal-waking-0']).toEqual({ depletedAt: T0 });
  });
});

describe('tolerating bad input', () => {
  it('returns a new game for null, junk, and non-objects', () => {
    for (const raw of [null, '', 'not json', '[]', '"string"', '42', '{']) {
      const state = deserialize(raw as string | null, T0);
      expect(state.flags.weaponUpgraded).toBe(false);
      expect(state.pouch.sunpetal).toBe(0);
    }
  });

  it('discards a save from a newer build rather than half-reading it', () => {
    const future = JSON.stringify({ ...createNewGameState(), version: 99, pouch: { sunpetal: 5 } });
    expect(deserialize(future, T0).pouch.sunpetal).toBe(0);
  });

  it('coerces nonsense fields to safe values', () => {
    const raw = JSON.stringify({
      version: 1,
      pouch: { sunpetal: 'lots', boughwood: -3, riverstone: 2.9 },
      flags: { weaponUpgraded: 'yes', shelterBuilt: 1 },
      playerHealth: 9999,
      playerPosition: { x: 'far', y: null, z: 3 },
      regionsSeen: ['meadow', 'atlantis'],
      returnPoint: 'nowhere',
      settings: { sound: 'loud', uiScale: 99, quality: 'ultra' },
      stats: { gathersMade: -5, creaturesSettled: 'many' },
    });
    const state = deserialize(raw, T0);

    expect(state.pouch).toEqual({ sunpetal: 0, boughwood: 0, riverstone: 2, glimmercore: 0 });
    // Non-boolean truthy values are not treated as set flags.
    expect(state.flags.weaponUpgraded).toBe(false);
    expect(state.flags.shelterBuilt).toBe(false);
    expect(state.playerHealth).toBe(PLAYER_MAX_HEALTH);
    expect(state.playerPosition).toEqual(createNewGameState().playerPosition);
    expect(state.regionsSeen).toEqual(['meadow']);
    expect(state.returnPoint).toBe('meadow-waking-stone');
    expect(state.settings.sound).toBe(DEFAULT_SETTINGS.sound);
    expect(state.settings.uiScale).toBe(1.4);
    expect(state.settings.quality).toBe('auto');
    expect(state.stats.gathersMade).toBe(0);
    expect(state.stats.creaturesSettled).toBe(0);
  });

  it('never loads the player in at zero health with no way to act', () => {
    const raw = JSON.stringify({ ...createNewGameState(), playerHealth: 0 });
    expect(deserialize(raw, T0).playerHealth).toBe(PLAYER_MAX_HEALTH);
  });

  it('clamps a wildly out-of-bounds position', () => {
    const raw = JSON.stringify({
      ...createNewGameState(),
      playerPosition: { x: 1e9, y: 0, z: -1e9 },
    });
    const state = deserialize(raw, T0);
    expect(Math.abs(state.playerPosition.x)).toBeLessThanOrEqual(200);
    expect(Math.abs(state.playerPosition.z)).toBeLessThanOrEqual(200);
  });
});

describe('flag repair', () => {
  const withFlags = (flags: Record<string, boolean>) =>
    deserialize(JSON.stringify({ version: 1, flags }), T0).flags;

  it('cannot have the finale without the guardian', () => {
    expect(withFlags({ moonmereLandmarkRestored: true }).moonmereLandmarkRestored).toBe(false);
  });

  it('back-fills the meadow spire when the guardian is already down', () => {
    const flags = withFlags({ guardianDefeated: true, meadowLandmarkRestored: false });
    expect(flags.meadowLandmarkRestored).toBe(true);
  });

  it('back-fills the shelter when the player has rested', () => {
    expect(withFlags({ restedAtShelter: true }).shelterBuilt).toBe(true);
  });

  it('cannot have visited Moonmere before it opened', () => {
    expect(withFlags({ moonmereVisited: true }).moonmereVisited).toBe(false);
  });

  it('keeps the weapon consistent with its flag', () => {
    const raw = JSON.stringify({ version: 1, flags: {}, weapon: 'bright-chime' });
    expect(deserialize(raw, T0).weapon).toBe('willow-chime');
  });
});

describe('SaveStore', () => {
  it('persists, reloads and resets', () => {
    const adapter = createMemoryAdapter();
    const store = new SaveStore(adapter);
    expect(store.hasSave()).toBe(false);

    const state = { ...createNewGameState(), pouch: { sunpetal: 5, boughwood: 0, riverstone: 0, glimmercore: 0 } };
    store.save(state, T0);
    expect(store.hasSave()).toBe(true);
    expect(store.load(T0).pouch.sunpetal).toBe(5);

    const fresh = store.reset();
    expect(fresh.pouch.sunpetal).toBe(0);
    expect(store.hasSave()).toBe(false);
    expect(store.load(T0).pouch.sunpetal).toBe(0);
  });

  it('writes under the documented key', () => {
    const adapter = createMemoryAdapter();
    new SaveStore(adapter).save(createNewGameState(), T0);
    expect(adapter.read(SAVE_KEY)).toBeTruthy();
  });

  it('stamps the save time', () => {
    const adapter = createMemoryAdapter();
    new SaveStore(adapter).save(createNewGameState(), T0);
    expect(JSON.parse(adapter.read(SAVE_KEY)!).savedAt).toBe(T0);
  });
});
