import { describe, expect, it } from 'vitest';
import {
  addToPouch,
  bundleEntries,
  canAfford,
  emptyPouch,
  missingFor,
  spend,
  toPouch,
  totalCarried,
} from '../../src/core/inventory.ts';
import { COSTS } from '../../src/core/recipes.ts';

describe('pouch', () => {
  it('starts empty with every resource present', () => {
    expect(emptyPouch()).toEqual({
      sunpetal: 0,
      boughwood: 0,
      riverstone: 0,
      glimmercore: 0,
    });
  });

  it('coerces junk from storage into a valid pouch', () => {
    const pouch = toPouch({ sunpetal: 2.7, boughwood: -5, riverstone: NaN } as never);
    expect(pouch).toEqual({ sunpetal: 2, boughwood: 0, riverstone: 0, glimmercore: 0 });
    expect(toPouch(undefined)).toEqual(emptyPouch());
  });

  it('adds without mutating the original', () => {
    const before = emptyPouch();
    const after = addToPouch(before, { sunpetal: 3 });
    expect(before.sunpetal).toBe(0);
    expect(after.sunpetal).toBe(3);
  });

  it('never lets a negative delta push a count below zero', () => {
    expect(addToPouch(emptyPouch(), { sunpetal: -4 }).sunpetal).toBe(0);
  });
});

describe('costs', () => {
  const stocked = addToPouch(emptyPouch(), {
    sunpetal: 3,
    boughwood: 3,
    riverstone: 3,
    glimmercore: 1,
  });

  it('affords the first landmark exactly', () => {
    expect(canAfford(stocked, COSTS.landmarkMeadow)).toBe(true);
    expect(missingFor(stocked, COSTS.landmarkMeadow)).toEqual({});
  });

  it('reports precisely what is missing', () => {
    const short = addToPouch(emptyPouch(), { sunpetal: 1, glimmercore: 1 });
    expect(missingFor(short, COSTS.landmarkMeadow)).toEqual({
      sunpetal: 2,
      boughwood: 3,
      riverstone: 3,
    });
  });

  it('spends exactly the cost and leaves the rest', () => {
    const after = spend(stocked, COSTS.landmarkMoonmere);
    expect(after).toEqual({ sunpetal: 1, boughwood: 1, riverstone: 1, glimmercore: 0 });
    expect(totalCarried(stocked)).toBe(10);
  });

  it('refuses to spend what is not there', () => {
    expect(() => spend(emptyPouch(), COSTS.shelter)).toThrow(/cannot afford/);
  });

  it('lists non-zero entries in canonical order', () => {
    expect(bundleEntries(COSTS.landmarkMeadow)).toEqual([
      ['sunpetal', 3],
      ['boughwood', 3],
      ['riverstone', 3],
      ['glimmercore', 1],
    ]);
    expect(bundleEntries({ sunpetal: 0 })).toEqual([]);
  });
});
