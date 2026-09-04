import { canAfford, missingFor } from '../../core/inventory.ts';
import { COSTS } from '../../core/recipes.ts';
import {
  LANDMARKS,
  isLandmarkRestored,
  type GameState,
  type LandmarkId,
} from '../../core/progression.ts';
import {
  formatCountdown,
  isNodeAvailable,
  msUntilRenewal,
  type ResourceNodeDef,
} from '../../core/resources.ts';
import { RESOURCES, type ResourceBundle } from '../../core/types.ts';
import { distanceXZ, type Vec3 } from '../../core/vector.ts';
import {
  GATHER_RADIUS,
  PLACES,
  RESOURCE_NODES,
  accessibleRegionsFor,
  groundHeight,
} from '../../core/world/layout.ts';

/**
 * What the interact button does, right now.
 *
 * There is exactly one interact button, and this module decides what it means
 * by looking at what the player is standing next to. That is the whole
 * interaction design: no menus, no context wheel, no "press X to open a panel".
 *
 * Prompts are produced even when the interaction is *not* currently possible —
 * a depleted node still says when it will return, an unaffordable restoration
 * still lists what it needs. Silence would leave the player guessing.
 */

export type InteractionKind =
  | 'gather'
  | 'upgrade-weapon'
  | 'build-shelter'
  | 'rest'
  | 'befriend'
  | 'restore';

export interface InteractPrompt {
  kind: InteractionKind;
  /** Node id, landmark id, or a fixed key such as `hollow-stump`. */
  id: string;
  /** Button label. Two words at most. */
  verb: string;
  /** What is being acted on. */
  subject: string;
  /** Optional second line: a countdown, a cost, a reason. */
  detail?: string;
  /** When set, the interaction cannot happen yet and the prompt is dimmed. */
  blocked?: string;
  cost?: ResourceBundle;
  missing?: ResourceBundle;
  position: Vec3;
  distance: number;
}

export interface InteractionContext {
  state: GameState;
  player: Vec3;
  nowMs: number;
  /** Where Pim currently is, so the "say hello" prompt tracks them. */
  companion: Vec3;
  companionBefriended: boolean;
}

const MERCHANT_RADIUS = 3.1;
const SHELTER_RADIUS = 3.4;
const COMPANION_RADIUS = 2.6;
const LANDMARK_RADIUS = 4.2;

function costDetail(cost: ResourceBundle, missing: ResourceBundle): string {
  const missingEntries = Object.entries(missing).filter(([, amount]) => (amount ?? 0) > 0);
  if (missingEntries.length === 0) {
    return Object.entries(cost)
      .filter(([, amount]) => (amount ?? 0) > 0)
      .map(([id, amount]) => `${amount} ${RESOURCES[id as keyof typeof RESOURCES].name}`)
      .join(' · ');
  }
  return `Still needs ${missingEntries
    .map(([id, amount]) => `${amount} ${RESOURCES[id as keyof typeof RESOURCES].name}`)
    .join(', ')}`;
}

/** Every prompt in range, nearest first. The HUD only ever shows the first. */
export function findPrompts(context: InteractionContext): InteractPrompt[] {
  const { state, player, nowMs } = context;
  const prompts: InteractPrompt[] = [];
  const regions = accessibleRegionsFor(
    state.flags.meadowLandmarkRestored,
    state.flags.guardianDefeated,
  );

  // --- Gathering nodes ----------------------------------------------------
  let nearestNode: { def: ResourceNodeDef; distance: number } | null = null;
  for (const def of RESOURCE_NODES) {
    if (!regions.has(def.region)) continue;
    const distance = distanceXZ(player, def.position);
    if (distance > GATHER_RADIUS) continue;
    if (!nearestNode || distance < nearestNode.distance) nearestNode = { def, distance };
  }
  if (nearestNode) {
    const { def, distance } = nearestNode;
    const available = isNodeAvailable(def, state.nodes[def.id], nowMs);
    const resource = RESOURCES[def.resource];
    prompts.push({
      kind: 'gather',
      id: def.id,
      verb: 'Gather',
      subject: resource.plural,
      distance,
      position: def.position,
      ...(available
        ? {}
        : {
            blocked: 'Still growing back',
            detail: `Returns in ${formatCountdown(msUntilRenewal(def, state.nodes[def.id], nowMs))}`,
          }),
    });
  }

  // --- Ossa at the Hollow Stump -------------------------------------------
  const stumpDistance = distanceXZ(player, PLACES.hollowStump);
  if (stumpDistance <= MERCHANT_RADIUS) {
    const missing = missingFor(state.pouch, COSTS.weaponUpgrade);
    const already = state.flags.weaponUpgraded;
    prompts.push({
      kind: 'upgrade-weapon',
      id: 'hollow-stump',
      verb: already ? 'Greet' : 'Rewind',
      subject: already ? 'Ossa' : 'your chime',
      distance: stumpDistance,
      position: PLACES.hollowStump,
      ...(already
        ? { detail: 'She has nothing else to offer, and says so kindly.' }
        : {
            cost: COSTS.weaponUpgrade,
            missing,
            detail: costDetail(COSTS.weaponUpgrade, missing),
            ...(canAfford(state.pouch, COSTS.weaponUpgrade) ? {} : { blocked: 'Not enough yet' }),
          }),
    });
  }

  // --- The Hearthnest -----------------------------------------------------
  const clearingDistance = distanceXZ(player, PLACES.shelterClearing);
  if (clearingDistance <= SHELTER_RADIUS) {
    if (!state.flags.shelterBuilt) {
      const missing = missingFor(state.pouch, COSTS.shelter);
      prompts.push({
        kind: 'build-shelter',
        id: 'shelter-clearing',
        verb: 'Build',
        subject: 'your Hearthnest',
        distance: clearingDistance,
        position: PLACES.shelterClearing,
        cost: COSTS.shelter,
        missing,
        detail: costDetail(COSTS.shelter, missing),
        ...(canAfford(state.pouch, COSTS.shelter) ? {} : { blocked: 'Not enough yet' }),
      });
    } else {
      prompts.push({
        kind: 'rest',
        id: 'hearthnest',
        verb: 'Rest',
        subject: 'at your Hearthnest',
        distance: clearingDistance,
        position: PLACES.shelterClearing,
        detail: state.returnPoint === 'hearthnest'
          ? 'You will always come back here.'
          : 'Resting makes this your return point.',
      });
    }
  }

  // --- Pim ----------------------------------------------------------------
  if (!context.companionBefriended) {
    const pimDistance = distanceXZ(player, context.companion);
    if (pimDistance <= COMPANION_RADIUS) {
      prompts.push({
        kind: 'befriend',
        id: 'pim',
        verb: 'Say hello',
        subject: 'to the wisplet',
        distance: pimDistance,
        position: context.companion,
        detail: 'It has been following you at a polite distance.',
      });
    }
  }

  // --- Dawnspires ---------------------------------------------------------
  for (const id of Object.keys(LANDMARKS) as LandmarkId[]) {
    const landmark = LANDMARKS[id];
    if (!regions.has(landmark.region)) continue;
    const distance = distanceXZ(player, landmark.position);
    if (distance > LANDMARK_RADIUS) continue;

    if (isLandmarkRestored(state, id)) {
      prompts.push({
        kind: 'restore',
        id,
        verb: 'Listen',
        subject: `to ${landmark.name}`,
        distance,
        position: landmark.position,
        blocked: 'Already awake',
        detail: 'It hums, very quietly, and the grass around it leans in.',
      });
      continue;
    }

    const missing = missingFor(state.pouch, landmark.cost);
    const gated = id === 'moonmere-dawnspire' && !state.flags.guardianDefeated;
    prompts.push({
      kind: 'restore',
      id,
      verb: 'Wake',
      subject: landmark.name,
      distance,
      position: landmark.position,
      cost: landmark.cost,
      missing,
      detail: costDetail(landmark.cost, missing),
      ...(gated
        ? { blocked: 'Not yet' }
        : canAfford(state.pouch, landmark.cost)
          ? {}
          : { blocked: 'Not enough yet' }),
    });
  }

  return prompts.sort(comparePrompts);
}

/**
 * Ranking, most important first.
 *
 * Gathering is deliberately last. It is the one repeatable interaction — the
 * bush will still be there in a minute — whereas building the Hearthnest or
 * waking a Dawnspire is the thing the player walked over here to do. Ranking
 * purely by distance meant a sunpetal bush growing near the clearing quietly
 * stole the Build prompt, and the player pressed Interact and picked a flower.
 */
const KIND_PRIORITY: Record<InteractionKind, number> = {
  restore: 0,
  'build-shelter': 1,
  rest: 1,
  'upgrade-weapon': 2,
  befriend: 2,
  gather: 3,
};

function comparePrompts(a: InteractPrompt, b: InteractPrompt): number {
  // An actionable prompt beats a blocked one, so standing between a spent node
  // and a live one offers the live one.
  const blocked = Number(Boolean(a.blocked)) - Number(Boolean(b.blocked));
  if (blocked !== 0) return blocked;
  const priority = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
  if (priority !== 0) return priority;
  return a.distance - b.distance;
}

/** The single prompt the interact button is bound to, or null. */
export function findPrompt(context: InteractionContext): InteractPrompt | null {
  return findPrompts(context)[0] ?? null;
}

/** Ground-anchored position for the on-screen prompt marker. */
export function promptAnchor(prompt: InteractPrompt): Vec3 {
  return {
    x: prompt.position.x,
    y: groundHeight(prompt.position.x, prompt.position.z) + 1.4,
    z: prompt.position.z,
  };
}
