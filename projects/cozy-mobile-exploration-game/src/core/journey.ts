import { missingFor } from './inventory.ts';
import { COSTS, STARTER_STOCK } from './recipes.ts';
import {
  hasStarterStock,
  isFinaleComplete,
  type GameState,
} from './progression.ts';
import type { ResourceBundle } from './types.ts';

/**
 * The Journey is the game's entire guidance system: no quest log, no minimap,
 * no dialogue tree. One card, one step, derived fresh from saved state every
 * time it is asked. Because it is derived rather than stored, it can never
 * disagree with the save — including a save that was hand-edited or reset.
 */
export type JourneyStepId =
  | 'gather-starter'
  | 'find-core'
  | 'visit-merchant'
  | 'build-shelter'
  | 'rest-at-shelter'
  | 'befriend-companion'
  | 'restore-meadow-dawnspire'
  | 'find-grove-guardian'
  | 'explore-moonmere'
  | 'restore-moonmere-dawnspire'
  | 'explore-freely';

/**
 * Where the off-screen wisp should point. `nearest-resource` is resolved by the
 * presentation layer against live node state; everything else is a fixed place.
 */
export type JourneyTarget =
  | { kind: 'nearest-resource' }
  | { kind: 'nearest-creature'; species: 'thistlebur' }
  | { kind: 'place'; id: JourneyPlaceId }
  | { kind: 'none' };

export type JourneyPlaceId =
  | 'hollow-stump'
  | 'shelter-clearing'
  | 'hearthnest'
  | 'pim'
  | 'meadow-dawnspire'
  | 'bramblehorn-ring'
  | 'moonmere-dawnspire';

export interface JourneyCard {
  step: JourneyStepId;
  /** The single line on the card. Imperative, short, readable at a glance. */
  title: string;
  /** One supporting sentence. Never required to understand the title. */
  hint: string;
  target: JourneyTarget;
  /** Materials this step consumes, when it has a cost. */
  requirement?: ResourceBundle;
  /** What is still missing; empty/absent means the step is affordable now. */
  missing?: ResourceBundle;
  /** True when the step's materials are in hand (or it needs none). */
  ready: boolean;
  /** 1-based position in the guided arc, for the progress pips. */
  index: number;
  /** Total steps in the guided arc. `index === total` means post-finale. */
  total: number;
  /** True once the arc is finished and play is open-ended. */
  openEnded: boolean;
}

/** Canonical order of the guided arc, used for the progress pips. */
export const JOURNEY_ORDER: readonly JourneyStepId[] = [
  'gather-starter',
  'find-core',
  'visit-merchant',
  'build-shelter',
  'rest-at-shelter',
  'befriend-companion',
  'restore-meadow-dawnspire',
  'find-grove-guardian',
  'explore-moonmere',
  'restore-moonmere-dawnspire',
  'explore-freely',
];

interface StepCopy {
  title: string;
  hint: string;
  target: JourneyTarget;
}

const COPY: Record<JourneyStepId, StepCopy> = {
  'gather-starter': {
    title: 'Gather what the meadow offers',
    hint: 'Sunpetals, boughwood and riverstone are all within a short walk.',
    target: { kind: 'nearest-resource' },
  },
  'find-core': {
    title: 'Settle a thistlebur',
    hint: 'The grumpy ones out in the long grass leave a glimmercore behind.',
    target: { kind: 'nearest-creature', species: 'thistlebur' },
  },
  'visit-merchant': {
    title: 'Visit Ossa at the Hollow Stump',
    hint: 'She can rewind your willow chime into something brighter.',
    target: { kind: 'place', id: 'hollow-stump' },
  },
  'build-shelter': {
    title: 'Raise your Hearthnest',
    hint: 'The flat clearing by the creek has been waiting for someone.',
    target: { kind: 'place', id: 'shelter-clearing' },
  },
  'rest-at-shelter': {
    title: 'Rest at your Hearthnest',
    hint: 'Resting sets it as the place you will always come back to.',
    target: { kind: 'place', id: 'hearthnest' },
  },
  'befriend-companion': {
    title: 'Say hello to the wisplet',
    hint: 'A small round light has been following you at a polite distance.',
    target: { kind: 'place', id: 'pim' },
  },
  'restore-meadow-dawnspire': {
    title: 'Wake the Meadow Dawnspire',
    hint: 'The tall dark spire on the eastern rise has been asleep a long while.',
    target: { kind: 'place', id: 'meadow-dawnspire' },
  },
  'find-grove-guardian': {
    title: 'Find what guards Thornhollow Grove',
    hint: 'The brambles opened. Something large is pacing in there.',
    target: { kind: 'place', id: 'bramblehorn-ring' },
  },
  'explore-moonmere': {
    title: 'Follow the pale path to Moonmere',
    hint: 'The mistveil thinned when Bramblehorn lay down.',
    target: { kind: 'place', id: 'moonmere-dawnspire' },
  },
  'restore-moonmere-dawnspire': {
    title: 'Wake the Moonmere Dawnspire',
    hint: 'The last sleeping spire. Both meadow and glade have what it needs.',
    target: { kind: 'place', id: 'moonmere-dawnspire' },
  },
  'explore-freely': {
    title: 'Wander Wispmere as you please',
    hint: 'Everything is awake. Gather, visit Pim, or just walk about.',
    target: { kind: 'none' },
  },
};

function card(
  state: GameState,
  step: JourneyStepId,
  requirement?: ResourceBundle,
): JourneyCard {
  const copy = COPY[step];
  const missing = requirement ? missingFor(state.pouch, requirement) : {};
  const ready = Object.keys(missing).length === 0;
  return {
    step,
    title: copy.title,
    hint: copy.hint,
    target: copy.target,
    ...(requirement ? { requirement } : {}),
    ...(requirement && !ready ? { missing } : {}),
    ready,
    index: JOURNEY_ORDER.indexOf(step) + 1,
    total: JOURNEY_ORDER.length,
    openEnded: step === 'explore-freely',
  };
}

/**
 * Picks the one next step.
 *
 * The chain is ordered by dependency, and the *first* unmet condition wins, so
 * the card is always the earliest thing the player can actually act on. Two
 * details are deliberate:
 *
 *  - The three pre-merchant steps are nested inside `!weaponUpgraded`. Without
 *    that nesting, a player who later spends their pouch down to nothing would
 *    be told to "gather what the meadow offers" again, long after that step
 *    stopped being the point.
 *  - A step with a cost is still shown when the player cannot yet afford it;
 *    the card carries `missing` so the UI can say "2 more boughwood" instead of
 *    silently swapping to a different instruction and losing the thread.
 */
export function selectJourneyCard(state: GameState): JourneyCard {
  const { flags } = state;

  if (!flags.weaponUpgraded) {
    if (!hasStarterStock(state)) return card(state, 'gather-starter', STARTER_STOCK);
    if (state.pouch.glimmercore < 1) return card(state, 'find-core');
    return card(state, 'visit-merchant', COSTS.weaponUpgrade);
  }

  if (!flags.shelterBuilt) return card(state, 'build-shelter', COSTS.shelter);
  if (!flags.restedAtShelter) return card(state, 'rest-at-shelter');
  if (!flags.companionBefriended) return card(state, 'befriend-companion');
  if (!flags.meadowLandmarkRestored) {
    return card(state, 'restore-meadow-dawnspire', COSTS.landmarkMeadow);
  }
  if (!flags.guardianDefeated) return card(state, 'find-grove-guardian');
  if (!flags.moonmereVisited) return card(state, 'explore-moonmere');
  if (!flags.moonmereLandmarkRestored) {
    return card(state, 'restore-moonmere-dawnspire', COSTS.landmarkMoonmere);
  }
  return card(state, 'explore-freely');
}

/** Convenience for tests and the dev overlay. */
export function selectJourneyStep(state: GameState): JourneyStepId {
  return selectJourneyCard(state).step;
}

/** Post-finale the arc is complete; the UI switches to a calmer presentation. */
export function isJourneyComplete(state: GameState): boolean {
  return isFinaleComplete(state);
}
