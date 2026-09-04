import { RESOURCE_IDS, type ResourceBundle, type ResourceId } from './types.ts';

/** A pouch is a total function: every resource id has a count, defaulting to 0. */
export type Pouch = Record<ResourceId, number>;

export function emptyPouch(): Pouch {
  return { sunpetal: 0, boughwood: 0, riverstone: 0, glimmercore: 0 };
}

/** Builds a pouch from a partial bundle, filling gaps with zero and clamping negatives. */
export function toPouch(bundle: ResourceBundle | undefined): Pouch {
  const pouch = emptyPouch();
  if (!bundle) return pouch;
  for (const id of RESOURCE_IDS) {
    const value = bundle[id];
    pouch[id] = Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
  }
  return pouch;
}

export function addToPouch(pouch: Pouch, bundle: ResourceBundle): Pouch {
  const next = { ...pouch };
  for (const id of RESOURCE_IDS) {
    const delta = bundle[id];
    if (delta) next[id] = Math.max(0, next[id] + Math.floor(delta));
  }
  return next;
}

/** True when the pouch holds at least every amount named in `cost`. */
export function canAfford(pouch: Pouch, cost: ResourceBundle): boolean {
  return RESOURCE_IDS.every((id) => pouch[id] >= (cost[id] ?? 0));
}

/**
 * Amounts still needed to afford `cost`. Empty object means affordable.
 * This is what the Journey card turns into "2 more Boughwood".
 */
export function missingFor(pouch: Pouch, cost: ResourceBundle): ResourceBundle {
  const missing: ResourceBundle = {};
  for (const id of RESOURCE_IDS) {
    const shortfall = (cost[id] ?? 0) - pouch[id];
    if (shortfall > 0) missing[id] = shortfall;
  }
  return missing;
}

/**
 * Deducts `cost` from the pouch.
 * @throws if the pouch cannot afford it — callers must check `canAfford` first,
 *   which keeps "can I?" and "do it" as two explicit, testable steps.
 */
export function spend(pouch: Pouch, cost: ResourceBundle): Pouch {
  if (!canAfford(pouch, cost)) {
    throw new Error(`spend: cannot afford ${JSON.stringify(cost)}`);
  }
  const next = { ...pouch };
  for (const id of RESOURCE_IDS) {
    next[id] -= cost[id] ?? 0;
  }
  return next;
}

export function totalCarried(pouch: Pouch): number {
  return RESOURCE_IDS.reduce((sum, id) => sum + pouch[id], 0);
}

/** Non-zero entries, in canonical display order. */
export function bundleEntries(bundle: ResourceBundle): Array<[ResourceId, number]> {
  return RESOURCE_IDS.filter((id) => (bundle[id] ?? 0) > 0).map((id) => [id, bundle[id]!]);
}
