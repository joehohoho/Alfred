import { describe, expect, it } from 'vitest';
import {
  angleDelta,
  clamp,
  damp,
  distanceXZ,
  lerp,
  normalizeMoveInput,
  turnTowards,
  vec2,
  vec3,
} from '../../src/core/vector.ts';

const magnitude = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);

describe('normalizeMoveInput', () => {
  it('returns zero inside the deadzone', () => {
    expect(normalizeMoveInput(vec2(0, 0))).toEqual({ x: 0, y: 0 });
    expect(normalizeMoveInput(vec2(0.1, 0.1))).toEqual({ x: 0, y: 0 });
    expect(normalizeMoveInput(vec2(0.17, 0), 0.18)).toEqual({ x: 0, y: 0 });
  });

  it('never exceeds magnitude 1', () => {
    for (const raw of [vec2(1, 1), vec2(5, -5), vec2(-3, 0), vec2(0.7, 0.9)]) {
      expect(magnitude(normalizeMoveInput(raw))).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('scales a full diagonal down so diagonals are not faster than cardinals', () => {
    const diagonal = normalizeMoveInput(vec2(1, 1));
    const cardinal = normalizeMoveInput(vec2(1, 0));
    expect(magnitude(diagonal)).toBeCloseTo(1, 6);
    expect(magnitude(cardinal)).toBeCloseTo(1, 6);
    expect(diagonal.x).toBeCloseTo(diagonal.y, 6);
  });

  it('preserves direction exactly', () => {
    const raw = vec2(0.6, -0.8);
    const out = normalizeMoveInput(raw);
    expect(Math.atan2(out.y, out.x)).toBeCloseTo(Math.atan2(raw.y, raw.x), 9);
  });

  it('rescales the live band so movement starts from zero, not from the deadzone', () => {
    // Just past a 0.2 deadzone should be a crawl, not an instant 0.2 speed.
    const justPast = normalizeMoveInput(vec2(0.21, 0), 0.2);
    expect(magnitude(justPast)).toBeGreaterThan(0);
    expect(magnitude(justPast)).toBeLessThan(0.05);

    // Halfway through the live band should be about half speed.
    const halfway = normalizeMoveInput(vec2(0.6, 0), 0.2);
    expect(magnitude(halfway)).toBeCloseTo(0.5, 6);
  });

  it('is monotonic in magnitude', () => {
    let previous = -1;
    for (let m = 0.2; m <= 1.0001; m += 0.05) {
      const current = magnitude(normalizeMoveInput(vec2(m, 0), 0.18));
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  it('survives NaN and Infinity without producing NaN', () => {
    expect(normalizeMoveInput(vec2(NaN, NaN))).toEqual({ x: 0, y: 0 });
    const out = normalizeMoveInput(vec2(Infinity, 0));
    expect(Number.isFinite(out.x)).toBe(true);
    expect(Number.isFinite(out.y)).toBe(true);
  });

  it('clamps an absurd deadzone instead of dividing by zero', () => {
    const out = normalizeMoveInput(vec2(1, 0), 5);
    expect(Number.isFinite(out.x)).toBe(true);
    expect(magnitude(out)).toBeLessThanOrEqual(1);
  });
});

describe('angle helpers', () => {
  it('takes the short way around', () => {
    expect(angleDelta(0.1, -0.1)).toBeCloseTo(-0.2, 9);
    expect(angleDelta(-Math.PI + 0.05, Math.PI - 0.05)).toBeCloseTo(-0.1, 9);
    expect(Math.abs(angleDelta(0, Math.PI * 4))).toBeLessThan(1e-9);
  });

  it('turnTowards snaps when within one step', () => {
    expect(turnTowards(0, 0.05, 0.1)).toBe(0.05);
    expect(turnTowards(0, 1, 0.1)).toBeCloseTo(0.1, 9);
    expect(turnTowards(0, -1, 0.1)).toBeCloseTo(-0.1, 9);
  });
});

describe('scalar helpers', () => {
  it('clamps and lerps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('damp converges and is frame-rate independent', () => {
    // One 0.1s step vs ten 0.01s steps should land in the same place.
    const single = damp(0, 1, 8, 0.1);
    let stepped = 0;
    for (let i = 0; i < 10; i++) stepped = damp(stepped, 1, 8, 0.01);
    expect(single).toBeCloseTo(stepped, 9);
  });

  it('measures planar distance ignoring height', () => {
    expect(distanceXZ(vec3(0, 0, 0), vec3(3, 100, 4))).toBeCloseTo(5, 9);
  });
});
