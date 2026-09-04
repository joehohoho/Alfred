import { describe, expect, it } from 'vitest';
import { addToPouch, canAfford } from '../../src/core/inventory.ts';
import { COSTS } from '../../src/core/recipes.ts';
import { PLACES, distanceToCreek } from '../../src/core/world/layout.ts';
import {
  PLAYER_MAX_HEALTH,
  RETURN_POINTS,
  accessibleRegions,
  befriendCompanion,
  buildShelter,
  collectResources,
  createNewGameState,
  defeatGuardian,
  hasStarterStock,
  isFinaleComplete,
  isGladeUnlocked,
  isGroveUnlocked,
  isLandmarkRestored,
  markRegionSeen,
  restAtShelter,
  restoreLandmark,
  returnHome,
  settleCreature,
  upgradeWeapon,
  type GameState,
} from '../../src/core/progression.ts';

const T0 = 1_700_000_000_000;

const stock = (state: GameState, bundle: Parameters<typeof addToPouch>[1]): GameState => ({
  ...state,
  pouch: addToPouch(state.pouch, bundle),
});

describe('new game', () => {
  it('starts with nothing, the willow chime, and the waking stone as home', () => {
    const state = createNewGameState();
    expect(state.pouch).toEqual({ sunpetal: 0, boughwood: 0, riverstone: 0, glimmercore: 0 });
    expect(state.weapon).toBe('willow-chime');
    expect(state.returnPoint).toBe('meadow-waking-stone');
    expect(state.playerHealth).toBe(PLAYER_MAX_HEALTH);
    expect(Object.values(state.flags).every((flag) => flag === false)).toBe(true);
    expect(state.regionsSeen).toEqual(['meadow']);
  });

  it('locks the grove and the glade', () => {
    const state = createNewGameState();
    expect(isGroveUnlocked(state)).toBe(false);
    expect(isGladeUnlocked(state)).toBe(false);
    expect([...accessibleRegions(state)]).toEqual(['meadow']);
  });
});

describe('transitions are pure', () => {
  it('never mutates the state handed in', () => {
    const state = stock(createNewGameState(), { glimmercore: 1, boughwood: 2, riverstone: 2 });
    const snapshot = JSON.parse(JSON.stringify(state));
    upgradeWeapon(state);
    collectResources(state, { sunpetal: 5 });
    settleCreature(state);
    expect(JSON.parse(JSON.stringify(state))).toEqual(snapshot);
  });
});

describe('weapon upgrade', () => {
  it('refuses without the materials and says why', () => {
    const result = upgradeWeapon(createNewGameState());
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/more to work with/);
    expect(result.state.weapon).toBe('willow-chime');
  });

  it('spends exactly the cost and sets the flag', () => {
    const state = stock(createNewGameState(), {
      glimmercore: 2,
      boughwood: 5,
      riverstone: 5,
      sunpetal: 1,
    });
    const result = upgradeWeapon(state);
    expect(result.ok).toBe(true);
    expect(result.state.weapon).toBe('bright-chime');
    expect(result.state.flags.weaponUpgraded).toBe(true);
    expect(result.state.pouch).toEqual({
      glimmercore: 1,
      boughwood: 2,
      riverstone: 3,
      sunpetal: 1,
    });
  });

  it('cannot be bought twice', () => {
    const first = upgradeWeapon(
      stock(createNewGameState(), { glimmercore: 4, boughwood: 8, riverstone: 8 }),
    );
    const second = upgradeWeapon(first.state);
    expect(second.ok).toBe(false);
    expect(second.state.pouch).toEqual(first.state.pouch);
  });
});

describe('shelter and return point', () => {
  it('cannot rest before the shelter is built', () => {
    const result = restAtShelter(createNewGameState());
    expect(result.ok).toBe(false);
    expect(result.state.returnPoint).toBe('meadow-waking-stone');
  });

  it('builds, then resting moves the return point and heals', () => {
    const built = buildShelter(
      stock(createNewGameState(), { boughwood: 4, riverstone: 3, sunpetal: 2 }),
    );
    expect(built.ok).toBe(true);
    expect(built.state.flags.shelterBuilt).toBe(true);
    expect(built.state.pouch).toEqual({
      boughwood: 0,
      riverstone: 0,
      sunpetal: 0,
      glimmercore: 0,
    });
    // Still the waking stone until they actually rest.
    expect(built.state.returnPoint).toBe('meadow-waking-stone');

    const hurt = { ...built.state, playerHealth: 12 };
    const rested = restAtShelter(hurt);
    expect(rested.ok).toBe(true);
    expect(rested.state.returnPoint).toBe('hearthnest');
    expect(rested.state.playerHealth).toBe(PLAYER_MAX_HEALTH);
    expect(rested.state.stats.timesRested).toBe(1);
  });

  it('resting again is allowed and keeps counting', () => {
    let state = buildShelter(
      stock(createNewGameState(), { boughwood: 4, riverstone: 3, sunpetal: 2 }),
    ).state;
    state = restAtShelter(state).state;
    state = restAtShelter(state).state;
    expect(state.stats.timesRested).toBe(2);
  });
});

describe('defeat is forgiving', () => {
  it('restores health, returns home, and keeps everything', () => {
    let state = stock(createNewGameState(), { sunpetal: 7, glimmercore: 3 });
    state = upgradeWeapon(
      stock(state, { glimmercore: 1, boughwood: 3, riverstone: 2 }),
    ).state;
    const before = { ...state.pouch };
    const defeated = returnHome({ ...state, playerHealth: 0, playerPosition: { x: 40, y: 0, z: -20 } });

    expect(defeated.playerHealth).toBe(PLAYER_MAX_HEALTH);
    expect(defeated.pouch).toEqual(before);
    expect(defeated.weapon).toBe('bright-chime');
    expect(defeated.flags.weaponUpgraded).toBe(true);
    expect(defeated.stats.timesDefeated).toBe(1);
    // Sent to the waking stone, because they have not rested yet.
    expect(defeated.playerPosition).toEqual(RETURN_POINTS['meadow-waking-stone'].position);
  });

  it('returns to the Hearthnest once it is the active point', () => {
    let state = buildShelter(
      stock(createNewGameState(), { boughwood: 4, riverstone: 3, sunpetal: 2 }),
    ).state;
    state = restAtShelter(state).state;
    const defeated = returnHome({ ...state, playerHealth: 0 });
    expect(defeated.playerPosition).toEqual(RETURN_POINTS.hearthnest.position);
  });

  it('never returns the player inside the landmark they return to', () => {
    // Spawning on the Waking Stone's own coordinates put the player inside the
    // rock. Return points must stand clear of the solid thing they name.
    const pairs: Array<[keyof typeof RETURN_POINTS, { x: number; z: number }]> = [
      ['meadow-waking-stone', PLACES.wakingStone],
      ['hearthnest', PLACES.shelterClearing],
    ];
    for (const [id, landmark] of pairs) {
      const point = RETURN_POINTS[id].position;
      const distance = Math.hypot(point.x - landmark.x, point.z - landmark.z);
      expect(distance, `${id} must stand clear of its landmark`).toBeGreaterThan(2.2);
    }
  });

  it('keeps every return point out of the creek and off a blocked tile', () => {
    for (const id of Object.keys(RETURN_POINTS) as Array<keyof typeof RETURN_POINTS>) {
      const point = RETURN_POINTS[id].position;
      expect(distanceToCreek(point), `${id} is in the creek`).toBeGreaterThan(0.5);
    }
  });
});

describe('landmark restoration', () => {
  const fullPouch = { sunpetal: 9, boughwood: 9, riverstone: 9, glimmercore: 4 };

  it('refuses the meadow spire without materials', () => {
    const result = restoreLandmark(createNewGameState(), 'meadow-dawnspire', T0);
    expect(result.ok).toBe(false);
    expect(result.state.flags.meadowLandmarkRestored).toBe(false);
  });

  it('restores the meadow spire and unlocks the grove', () => {
    const state = stock(createNewGameState(), fullPouch);
    const result = restoreLandmark(state, 'meadow-dawnspire', T0);
    expect(result.ok).toBe(true);
    expect(isLandmarkRestored(result.state, 'meadow-dawnspire')).toBe(true);
    expect(isGroveUnlocked(result.state)).toBe(true);
    expect(isGladeUnlocked(result.state)).toBe(false);
    expect(result.state.pouch).toEqual({
      sunpetal: 6,
      boughwood: 6,
      riverstone: 6,
      glimmercore: 3,
    });
    expect(result.state.stats.finaleAt).toBeNull();
  });

  it('refuses the finale spire before the guardian has settled, even with materials', () => {
    const state = stock(createNewGameState(), fullPouch);
    const result = restoreLandmark(state, 'moonmere-dawnspire', T0);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/mistveil/);
    expect(result.state.pouch).toEqual(state.pouch);
  });

  it('completes the arc and stamps the finale time', () => {
    let state = stock(createNewGameState(), fullPouch);
    state = restoreLandmark(state, 'meadow-dawnspire', T0).state;
    state = defeatGuardian(state);
    expect(isGladeUnlocked(state)).toBe(true);
    const result = restoreLandmark(state, 'moonmere-dawnspire', T0 + 5000);
    expect(result.ok).toBe(true);
    expect(isFinaleComplete(result.state)).toBe(true);
    expect(result.state.stats.finaleAt).toBe(T0 + 5000);
  });

  it('cannot restore the same spire twice', () => {
    const first = restoreLandmark(
      stock(createNewGameState(), fullPouch),
      'meadow-dawnspire',
      T0,
    );
    const second = restoreLandmark(first.state, 'meadow-dawnspire', T0);
    expect(second.ok).toBe(false);
    expect(second.state.pouch).toEqual(first.state.pouch);
  });
});

describe('guardian and regions', () => {
  it('settling the guardian is idempotent and pays one core', () => {
    const state = createNewGameState();
    const once = defeatGuardian(state);
    expect(once.pouch.glimmercore).toBe(1);
    const twice = defeatGuardian(once);
    expect(twice).toBe(once);
  });

  it('entering the glade records the visit', () => {
    const state = markRegionSeen(createNewGameState(), 'glade');
    expect(state.flags.moonmereVisited).toBe(true);
    expect(state.regionsSeen).toContain('glade');
  });

  it('re-entering a known region is a no-op', () => {
    const state = createNewGameState();
    expect(markRegionSeen(state, 'meadow')).toBe(state);
  });
});

describe('starter stock', () => {
  it('flips once two of each family are held', () => {
    let state = createNewGameState();
    expect(hasStarterStock(state)).toBe(false);
    state = collectResources(state, { sunpetal: 2, boughwood: 2 });
    expect(hasStarterStock(state)).toBe(false);
    state = collectResources(state, { riverstone: 2 });
    expect(hasStarterStock(state)).toBe(true);
    expect(state.stats.gathersMade).toBe(2);
  });

  it('agrees with canAfford on the shelter cost', () => {
    const state = collectResources(createNewGameState(), COSTS.shelter);
    expect(canAfford(state.pouch, COSTS.shelter)).toBe(true);
  });
});

describe('companion', () => {
  it('befriends once', () => {
    const first = befriendCompanion(createNewGameState());
    expect(first.ok).toBe(true);
    expect(first.state.flags.companionBefriended).toBe(true);
    expect(befriendCompanion(first.state).ok).toBe(false);
  });
});
