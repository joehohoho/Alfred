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
 * Whether each step counts as finished.
 *
 * Note that later milestones imply earlier ones. That is not tidiness — the
 * merchant is genuinely skippable: nothing in the game *requires* the Bright
 * Chime, so a player can gather 3/3/3, settle a thistlebur for a core, and wake
 * the Meadow Dawnspire having never met Ossa. With a naive first-unmet-flag
 * chain the card would then say "Visit Ossa" forever, through the guardian,
 * through the finale, and into the open-ended state. Implication closes that.
 */
function isStepDone(step: JourneyStepId, state: GameState): boolean {
  const { flags, pouch } = state;
  // Anything from the first spire onward means the whole opening is behind us.
  const pastOpening = flags.meadowLandmarkRestored || flags.guardianDefeated;

  switch (step) {
    case 'gather-starter':
      return hasStarterStock(state) || flags.weaponUpgraded || flags.shelterBuilt || pastOpening;
    case 'find-core':
      return pouch.glimmercore >= 1 || flags.weaponUpgraded || flags.shelterBuilt || pastOpening;
    case 'visit-merchant':
      return flags.weaponUpgraded || pastOpening;
    case 'build-shelter':
      return flags.shelterBuilt;
    case 'rest-at-shelter':
      return flags.restedAtShelter;
    case 'befriend-companion':
      return flags.companionBefriended;
    case 'restore-meadow-dawnspire':
      return flags.meadowLandmarkRestored;
    case 'find-grove-guardian':
      return flags.guardianDefeated;
    case 'explore-moonmere':
      return flags.moonmereVisited;
    case 'restore-moonmere-dawnspire':
      return flags.moonmereLandmarkRestored;
    case 'explore-freely':
      // The arc never completes; after the finale this is the standing answer.
      return false;
  }
}

/** The materials a step consumes, if any. */
function requirementFor(step: JourneyStepId): ResourceBundle | undefined {
  switch (step) {
    case 'gather-starter':
      return STARTER_STOCK;
    case 'visit-merchant':
      return COSTS.weaponUpgrade;
    case 'build-shelter':
      return COSTS.shelter;
    case 'restore-meadow-dawnspire':
      return COSTS.landmarkMeadow;
    case 'restore-moonmere-dawnspire':
      return COSTS.landmarkMoonmere;
    default:
      return undefined;
  }
}

/**
 * Picks the one next step: the earliest in `JOURNEY_ORDER` that is not done.
 *
 * A step with a cost is still shown when the player cannot yet afford it; the
 * card carries `missing` so the UI can say "1 more Boughwood" rather than
 * silently swapping instruction and losing the thread.
 */
export function selectJourneyCard(state: GameState): JourneyCard {
  // The finale ends the guided arc outright, even if optional beats were
  // skipped along the way — the shelter, the rest, and Pim are all skippable,
  // and a card still nagging about the Hearthnest after both spires are lit
  // would contradict the completion state the brief asks for. Those things stay
  // available; the world advertises them on its own.
  if (isFinaleComplete(state)) return card(state, 'explore-freely');

  for (const step of JOURNEY_ORDER) {
    if (!isStepDone(step, state)) return card(state, step, requirementFor(step));
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
