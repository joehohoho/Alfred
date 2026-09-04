import type { GatherableId, RegionId } from './types.ts';
import type { Vec3 } from './vector.ts';

/**
 * A gathering node placed in the world. Nodes are authored, never generated at
 * runtime, so the meadow is the same meadow every session.
 */
export interface ResourceNodeDef {
  id: string;
  resource: GatherableId;
  region: RegionId;
  position: Vec3;
  /** Inclusive yield range, rolled once per gather. */
  yieldMin: number;
  yieldMax: number;
  /** Art variation index, so a row of bushes is not a row of clones. */
  variant: number;
  /** Rotation about Y, radians. */
  rotation: number;
  /** Uniform scale multiplier. */
  scale: number;
}

/** Persisted per-node state. Absent from the map means "never gathered". */
export interface ResourceNodeState {
  /** Epoch milliseconds when the node was emptied, or null when it is full. */
  depletedAt: number | null;
}

export type ResourceNodeStates = Record<string, ResourceNodeState>;

/**
 * How long each family takes to come back, in seconds.
 *
 * Tuned for the brief's five-minute session: petals return within a single
 * session, stone takes long enough that the player is nudged to wander.
 */
export const RENEWAL_SECONDS: Record<GatherableId, number> = {
  sunpetal: 90,
  boughwood: 150,
  riverstone: 210,
};

export function renewalMs(resource: GatherableId): number {
  return RENEWAL_SECONDS[resource] * 1000;
}

/**
 * Repairs node state that a clock change could have made nonsensical.
 *
 * Renewal is measured against the wall clock so that nodes come back while the
 * app is closed — which is the cosy behaviour, but it means a device clock that
 * jumps backwards could leave a node "depleted in the future" and effectively
 * frozen. Clamping a future timestamp to now costs the player at most one
 * renewal period and can never soft-lock a node.
 */
export function normalizeNodeState(
  state: ResourceNodeState | undefined,
  nowMs: number,
): ResourceNodeState {
  if (!state || state.depletedAt === null || !Number.isFinite(state.depletedAt)) {
    return { depletedAt: null };
  }
  if (state.depletedAt > nowMs) return { depletedAt: nowMs };
  return { depletedAt: state.depletedAt };
}

export function isNodeAvailable(
  def: ResourceNodeDef,
  state: ResourceNodeState | undefined,
  nowMs: number,
): boolean {
  const normalized = normalizeNodeState(state, nowMs);
  if (normalized.depletedAt === null) return true;
  return nowMs - normalized.depletedAt >= renewalMs(def.resource);
}

/** Milliseconds until the node refills. 0 when it is already available. */
export function msUntilRenewal(
  def: ResourceNodeDef,
  state: ResourceNodeState | undefined,
  nowMs: number,
): number {
  const normalized = normalizeNodeState(state, nowMs);
  if (normalized.depletedAt === null) return 0;
  const remaining = renewalMs(def.resource) - (nowMs - normalized.depletedAt);
  return remaining > 0 ? remaining : 0;
}

/** 0 = just depleted, 1 = fully renewed. Drives the node's regrowth animation. */
export function renewalProgress(
  def: ResourceNodeDef,
  state: ResourceNodeState | undefined,
  nowMs: number,
): number {
  const total = renewalMs(def.resource);
  const remaining = msUntilRenewal(def, state, nowMs);
  if (remaining <= 0) return 1;
  return 1 - remaining / total;
}

/** "1:20" / "45s" — what the depleted node and the companion both display. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface GatherOutcome {
  ok: boolean;
  resource: GatherableId;
  amount: number;
  /** Node state to persist after a successful gather. */
  nextState: ResourceNodeState;
  /** Present when `ok` is false. */
  reason?: 'depleted';
  /** Milliseconds until it can be gathered again; 0 when it just succeeded... */
  renewInMs: number;
}

/**
 * Resolves one gather attempt.
 *
 * Pure: the caller supplies `nowMs` and a roll in [0,1) rather than this
 * reaching for `Date.now()` or `Math.random()`, which is what makes gathering
 * testable without a clock or a scene.
 */
export function gather(
  def: ResourceNodeDef,
  state: ResourceNodeState | undefined,
  nowMs: number,
  roll: number,
): GatherOutcome {
  if (!isNodeAvailable(def, state, nowMs)) {
    return {
      ok: false,
      resource: def.resource,
      amount: 0,
      nextState: normalizeNodeState(state, nowMs),
      reason: 'depleted',
      renewInMs: msUntilRenewal(def, state, nowMs),
    };
  }
  const span = def.yieldMax - def.yieldMin + 1;
  const clampedRoll = Math.min(Math.max(roll, 0), 0.999999);
  const amount = def.yieldMin + Math.floor(clampedRoll * span);
  return {
    ok: true,
    resource: def.resource,
    amount,
    nextState: { depletedAt: nowMs },
    renewInMs: renewalMs(def.resource),
  };
}

export interface NearestNodeResult {
  def: ResourceNodeDef;
  distance: number;
  available: boolean;
  renewInMs: number;
}

/**
 * What the companion points at.
 *
 * Prefers the nearest *available* node. If nothing in range is ready, it falls
 * back to whichever node will renew soonest — the brief's "indicate the nearest
 * renewal timer instead" — so the companion is never silent.
 */
export function findGuidanceTarget(
  defs: readonly ResourceNodeDef[],
  states: ResourceNodeStates,
  origin: Vec3,
  nowMs: number,
  allowedRegions: ReadonlySet<RegionId>,
): NearestNodeResult | null {
  let nearestAvailable: NearestNodeResult | null = null;
  let soonestRenewing: NearestNodeResult | null = null;

  for (const def of defs) {
    if (!allowedRegions.has(def.region)) continue;
    const dx = def.position.x - origin.x;
    const dz = def.position.z - origin.z;
    const distance = Math.hypot(dx, dz);
    const available = isNodeAvailable(def, states[def.id], nowMs);
    const renewInMs = msUntilRenewal(def, states[def.id], nowMs);
    const candidate: NearestNodeResult = { def, distance, available, renewInMs };

    if (available) {
      if (!nearestAvailable || distance < nearestAvailable.distance) {
        nearestAvailable = candidate;
      }
    } else if (
      !soonestRenewing ||
      renewInMs < soonestRenewing.renewInMs ||
      (renewInMs === soonestRenewing.renewInMs && distance < soonestRenewing.distance)
    ) {
      soonestRenewing = candidate;
    }
  }

  return nearestAvailable ?? soonestRenewing;
}
