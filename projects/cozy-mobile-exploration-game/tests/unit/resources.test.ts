import { describe, expect, it } from 'vitest';
import {
  RENEWAL_SECONDS,
  findGuidanceTarget,
  formatCountdown,
  gather,
  isNodeAvailable,
  msUntilRenewal,
  normalizeNodeState,
  renewalMs,
  renewalProgress,
  type ResourceNodeDef,
  type ResourceNodeStates,
} from '../../src/core/resources.ts';
import type { RegionId } from '../../src/core/types.ts';
import { vec3 } from '../../src/core/vector.ts';

const node = (over: Partial<ResourceNodeDef> = {}): ResourceNodeDef => ({
  id: 'n1',
  resource: 'sunpetal',
  region: 'meadow',
  position: vec3(0, 0, 0),
  yieldMin: 1,
  yieldMax: 2,
  variant: 0,
  rotation: 0,
  scale: 1,
  ...over,
});

const T0 = 1_700_000_000_000;
const ALL: ReadonlySet<RegionId> = new Set<RegionId>(['meadow', 'grove', 'glade']);
const MEADOW_ONLY: ReadonlySet<RegionId> = new Set<RegionId>(['meadow']);

describe('renewal timing', () => {
  it('a never-gathered node is available', () => {
    expect(isNodeAvailable(node(), undefined, T0)).toBe(true);
    expect(msUntilRenewal(node(), undefined, T0)).toBe(0);
  });

  it('is unavailable for exactly its renewal window, then available again', () => {
    const def = node({ resource: 'boughwood' });
    const state = { depletedAt: T0 };
    const window = renewalMs('boughwood');
    expect(window).toBe(RENEWAL_SECONDS.boughwood * 1000);

    expect(isNodeAvailable(def, state, T0)).toBe(false);
    expect(isNodeAvailable(def, state, T0 + window - 1)).toBe(false);
    // The boundary is inclusive: at exactly the window it is back.
    expect(isNodeAvailable(def, state, T0 + window)).toBe(true);
    expect(isNodeAvailable(def, state, T0 + window + 60_000)).toBe(true);
  });

  it('counts down and never goes negative', () => {
    const def = node();
    const state = { depletedAt: T0 };
    expect(msUntilRenewal(def, state, T0)).toBe(renewalMs('sunpetal'));
    expect(msUntilRenewal(def, state, T0 + 30_000)).toBe(renewalMs('sunpetal') - 30_000);
    expect(msUntilRenewal(def, state, T0 + 10_000_000)).toBe(0);
  });

  it('renews while the app is closed, because it uses the wall clock', () => {
    const def = node({ resource: 'riverstone' });
    const state = { depletedAt: T0 };
    // Player quits, comes back an hour later.
    expect(isNodeAvailable(def, state, T0 + 3_600_000)).toBe(true);
  });

  it('reports progress from 0 to 1', () => {
    const def = node();
    const state = { depletedAt: T0 };
    expect(renewalProgress(def, state, T0)).toBeCloseTo(0, 6);
    expect(renewalProgress(def, state, T0 + renewalMs('sunpetal') / 2)).toBeCloseTo(0.5, 6);
    expect(renewalProgress(def, state, T0 + renewalMs('sunpetal'))).toBe(1);
    expect(renewalProgress(def, undefined, T0)).toBe(1);
  });

  it('clamps a future timestamp so a backwards clock cannot freeze a node', () => {
    const def = node();
    const future = { depletedAt: T0 + 999_999_999 };
    expect(normalizeNodeState(future, T0)).toEqual({ depletedAt: T0 });
    // Worst case the player waits one normal window, never forever.
    expect(msUntilRenewal(def, future, T0)).toBe(renewalMs('sunpetal'));
  });

  it('treats a corrupt timestamp as available', () => {
    expect(normalizeNodeState({ depletedAt: NaN }, T0)).toEqual({ depletedAt: null });
    expect(isNodeAvailable(node(), { depletedAt: NaN }, T0)).toBe(true);
  });
});

describe('gather', () => {
  it('yields within the authored range and depletes the node', () => {
    const def = node({ yieldMin: 1, yieldMax: 3 });
    for (const roll of [0, 0.33, 0.34, 0.66, 0.67, 0.999999]) {
      const outcome = gather(def, undefined, T0, roll);
      expect(outcome.ok).toBe(true);
      expect(outcome.amount).toBeGreaterThanOrEqual(1);
      expect(outcome.amount).toBeLessThanOrEqual(3);
      expect(outcome.nextState).toEqual({ depletedAt: T0 });
    }
  });

  it('covers the whole yield range across the roll space', () => {
    const def = node({ yieldMin: 1, yieldMax: 3 });
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) seen.add(gather(def, undefined, T0, i / 300).amount);
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('clamps an out-of-range roll rather than yielding out of range', () => {
    const def = node({ yieldMin: 2, yieldMax: 2 });
    expect(gather(def, undefined, T0, 1).amount).toBe(2);
    expect(gather(def, undefined, T0, -1).amount).toBe(2);
  });

  it('refuses a depleted node and reports the wait', () => {
    const def = node();
    const outcome = gather(def, { depletedAt: T0 }, T0 + 1000, 0.5);
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe('depleted');
    expect(outcome.amount).toBe(0);
    expect(outcome.renewInMs).toBe(renewalMs('sunpetal') - 1000);
  });
});

describe('formatCountdown', () => {
  it('formats seconds and minutes readably', () => {
    expect(formatCountdown(0)).toBe('0s');
    expect(formatCountdown(1)).toBe('1s');
    expect(formatCountdown(45_000)).toBe('45s');
    // 59.999s rounds up to a full minute, and reads better as 1:00 than 60s.
    expect(formatCountdown(59_999)).toBe('1:00');
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(80_000)).toBe('1:20');
    expect(formatCountdown(125_000)).toBe('2:05');
    expect(formatCountdown(-500)).toBe('0s');
  });
});

describe('companion guidance target', () => {
  const defs = [
    node({ id: 'near-available', position: vec3(2, 0, 0) }),
    node({ id: 'far-available', position: vec3(20, 0, 0) }),
    node({ id: 'locked-region', region: 'glade', position: vec3(1, 0, 0) }),
  ];

  it('points at the nearest available node', () => {
    const result = findGuidanceTarget(defs, {}, vec3(0, 0, 0), T0, MEADOW_ONLY);
    expect(result?.def.id).toBe('near-available');
    expect(result?.available).toBe(true);
  });

  it('ignores nodes in regions the player cannot reach', () => {
    // The glade node is the closest of the three, so if the region filter were
    // ignored it would win — which is exactly the bug this guards against.
    expect(findGuidanceTarget(defs, {}, vec3(0, 0, 0), T0, ALL)?.def.id).toBe('locked-region');
    const result = findGuidanceTarget(defs, {}, vec3(0, 0, 0), T0, MEADOW_ONLY);
    expect(result?.def.id).toBe('near-available');
    expect(result?.def.region).toBe('meadow');
  });

  it('falls back to the soonest renewal when nothing is ready', () => {
    const states: ResourceNodeStates = {
      'near-available': { depletedAt: T0 },
      'far-available': { depletedAt: T0 - 60_000 },
      'locked-region': { depletedAt: T0 },
    };
    const result = findGuidanceTarget(defs, states, vec3(0, 0, 0), T0, ALL);
    // far-available was depleted a minute earlier, so it comes back sooner.
    expect(result?.def.id).toBe('far-available');
    expect(result?.available).toBe(false);
    expect(result?.renewInMs).toBe(renewalMs('sunpetal') - 60_000);
  });

  it('prefers any available node over a sooner-renewing one', () => {
    const states: ResourceNodeStates = { 'near-available': { depletedAt: T0 - 1000 } };
    const result = findGuidanceTarget(defs, states, vec3(0, 0, 0), T0, MEADOW_ONLY);
    expect(result?.def.id).toBe('far-available');
    expect(result?.available).toBe(true);
  });

  it('returns null only when there is genuinely nothing to point at', () => {
    expect(findGuidanceTarget([], {}, vec3(0, 0, 0), T0, ALL)).toBeNull();
  });
});
