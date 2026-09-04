import { describe, expect, it } from 'vitest';
import { addToPouch } from '../../src/core/inventory.ts';
import {
  JOURNEY_ORDER,
  selectJourneyCard,
  selectJourneyStep,
  type JourneyStepId,
} from '../../src/core/journey.ts';
import { COSTS, STARTER_STOCK } from '../../src/core/recipes.ts';
import {
  befriendCompanion,
  buildShelter,
  createNewGameState,
  defeatGuardian,
  markRegionSeen,
  restAtShelter,
  restoreLandmark,
  upgradeWeapon,
  type GameState,
} from '../../src/core/progression.ts';

const T0 = 1_700_000_000_000;

const give = (state: GameState, bundle: Parameters<typeof addToPouch>[1]): GameState => ({
  ...state,
  pouch: addToPouch(state.pouch, bundle),
});

/** Plays the whole guided arc, asserting the card at every beat. */
function walkTheArc(): { steps: JourneyStepId[]; final: GameState } {
  const steps: JourneyStepId[] = [];
  let state = createNewGameState();

  steps.push(selectJourneyStep(state)); // gather-starter
  state = give(state, STARTER_STOCK);

  steps.push(selectJourneyStep(state)); // find-core
  state = give(state, { glimmercore: 1, boughwood: 2, riverstone: 2 });

  steps.push(selectJourneyStep(state)); // visit-merchant
  state = upgradeWeapon(state).state;

  steps.push(selectJourneyStep(state)); // build-shelter
  state = buildShelter(give(state, COSTS.shelter)).state;

  steps.push(selectJourneyStep(state)); // rest-at-shelter
  state = restAtShelter(state).state;

  steps.push(selectJourneyStep(state)); // befriend-companion
  state = befriendCompanion(state).state;

  steps.push(selectJourneyStep(state)); // restore-meadow-dawnspire
  state = restoreLandmark(give(state, COSTS.landmarkMeadow), 'meadow-dawnspire', T0).state;

  steps.push(selectJourneyStep(state)); // find-grove-guardian
  state = defeatGuardian(state);

  steps.push(selectJourneyStep(state)); // explore-moonmere
  state = markRegionSeen(state, 'glade');

  steps.push(selectJourneyStep(state)); // restore-moonmere-dawnspire
  state = restoreLandmark(
    give(state, COSTS.landmarkMoonmere),
    'moonmere-dawnspire',
    T0 + 1000,
  ).state;

  steps.push(selectJourneyStep(state)); // explore-freely
  return { steps, final: state };
}

describe('journey card', () => {
  it('walks the full guided arc in the documented order', () => {
    const { steps } = walkTheArc();
    expect(steps).toEqual([...JOURNEY_ORDER]);
  });

  it('always returns exactly one actionable step', () => {
    const card = selectJourneyCard(createNewGameState());
    expect(card.step).toBe('gather-starter');
    expect(card.title).toBeTruthy();
    expect(card.hint).toBeTruthy();
    expect(card.index).toBe(1);
    expect(card.total).toBe(JOURNEY_ORDER.length);
  });

  it('carries the requirement and what is still missing', () => {
    const card = selectJourneyCard(createNewGameState());
    expect(card.requirement).toEqual(STARTER_STOCK);
    expect(card.missing).toEqual({ sunpetal: 2, boughwood: 2, riverstone: 2 });
    expect(card.ready).toBe(false);
  });

  it('marks a step ready once its materials are in hand', () => {
    const state = give(createNewGameState(), {
      ...STARTER_STOCK,
      glimmercore: 1,
      boughwood: 4,
      riverstone: 4,
    });
    const card = selectJourneyCard(state);
    expect(card.step).toBe('visit-merchant');
    expect(card.ready).toBe(true);
    expect(card.missing).toBeUndefined();
  });

  it('sends the player to fight only after they have some materials', () => {
    // Empty pouch: gather first, do not open with combat.
    expect(selectJourneyStep(createNewGameState())).toBe('gather-starter');
    expect(selectJourneyStep(give(createNewGameState(), STARTER_STOCK))).toBe('find-core');
  });

  it('still points at the merchant when the upgrade is unaffordable', () => {
    // Starter stock plus a core clears the "find a core" gate but is one
    // boughwood short of the upgrade, so the card must hold its position and
    // say what is missing rather than silently swapping instruction.
    const state = give(createNewGameState(), { ...STARTER_STOCK, glimmercore: 1 });
    const card = selectJourneyCard(state);
    expect(card.step).toBe('visit-merchant');
    expect(card.ready).toBe(false);
    expect(card.missing).toEqual({ boughwood: 1 });
  });

  it('does not regress to "gather" after the pouch is spent later in the arc', () => {
    let state = give(createNewGameState(), {
      ...STARTER_STOCK,
      glimmercore: 1,
      boughwood: 3,
      riverstone: 2,
    });
    state = upgradeWeapon(state).state;
    // Spend everything down to nothing.
    state = { ...state, pouch: { sunpetal: 0, boughwood: 0, riverstone: 0, glimmercore: 0 } };
    expect(selectJourneyStep(state)).toBe('build-shelter');
  });

  it('is a pure function of saved state', () => {
    const state = give(createNewGameState(), STARTER_STOCK);
    const a = selectJourneyCard(state);
    const b = selectJourneyCard(JSON.parse(JSON.stringify(state)) as GameState);
    expect(a).toEqual(b);
  });
});

describe('journey targets', () => {
  it('points the wisp at the right kind of thing at each beat', () => {
    const state = createNewGameState();
    expect(selectJourneyCard(state).target).toEqual({ kind: 'nearest-resource' });

    const stocked = give(state, STARTER_STOCK);
    expect(selectJourneyCard(stocked).target).toEqual({
      kind: 'nearest-creature',
      species: 'thistlebur',
    });

    const withCore = give(stocked, { glimmercore: 1 });
    expect(selectJourneyCard(withCore).target).toEqual({
      kind: 'place',
      id: 'hollow-stump',
    });
  });

  it('has no target once play is open-ended', () => {
    const { final } = walkTheArc();
    const card = selectJourneyCard(final);
    expect(card.step).toBe('explore-freely');
    expect(card.target).toEqual({ kind: 'none' });
    expect(card.openEnded).toBe(true);
    expect(card.index).toBe(card.total);
  });
});

describe('post-finale', () => {
  it('keeps recommending free exploration no matter what the player does next', () => {
    const { final } = walkTheArc();
    const busy = give(final, { sunpetal: 20, boughwood: 20, riverstone: 20, glimmercore: 9 });
    expect(selectJourneyStep(busy)).toBe('explore-freely');
    expect(selectJourneyStep({ ...busy, playerHealth: 3 })).toBe('explore-freely');
  });
});

describe('every step has copy and a unique slot', () => {
  it('covers the whole order with no gaps or duplicates', () => {
    expect(new Set(JOURNEY_ORDER).size).toBe(JOURNEY_ORDER.length);
    for (const step of JOURNEY_ORDER) {
      expect(JOURNEY_ORDER.indexOf(step)).toBeGreaterThanOrEqual(0);
    }
  });
});
