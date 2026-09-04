/**
 * Minimal vector maths for the deterministic core.
 *
 * The core deliberately does not import three.js, so it carries its own tiny
 * vector types. Gameplay happens on the XZ plane; Y is height.
 */
export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y });
export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export function length2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Squared planar (XZ) distance. Cheaper than `distanceXZ` for comparisons. */
export function distanceSqXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function distanceXZ(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSqXZ(a, b));
}

/**
 * Converts a raw stick/joystick reading into a movement vector.
 *
 * Three things happen here, and all three are load-bearing for feel:
 *
 *  1. **Deadzone** — readings inside `deadzone` become exactly zero, so a
 *     resting thumb or a drifting gamepad does not creep the player forward.
 *  2. **Rescale** — the remaining range is stretched back to 0..1, so the very
 *     first pixel of real movement past the deadzone is a slow walk rather than
 *     an abrupt jump to `deadzone` speed.
 *  3. **Clamp, not normalize** — magnitude is capped at 1 but *not* forced to 1.
 *     Analogue input keeps its gradient (a gentle push is a gentle walk), while
 *     diagonal keyboard input, which arrives as (1, 1) with magnitude 1.41,
 *     is scaled down so diagonals are not faster than the cardinals.
 *
 * @param deadzone Fraction of the stick range ignored near centre, 0..1.
 * @returns A vector with magnitude in [0, 1].
 */
export function normalizeMoveInput(raw: Vec2, deadzone = 0.18): Vec2 {
  const x = Number.isFinite(raw.x) ? raw.x : 0;
  const y = Number.isFinite(raw.y) ? raw.y : 0;
  const magnitude = Math.hypot(x, y);

  if (magnitude <= deadzone || magnitude === 0) return { x: 0, y: 0 };

  const clampedDeadzone = Math.min(Math.max(deadzone, 0), 0.95);
  // Rescale the live band (deadzone..1) onto (0..1), then cap at 1.
  const scaled = Math.min((magnitude - clampedDeadzone) / (1 - clampedDeadzone), 1);
  const inverse = scaled / magnitude;
  return { x: x * inverse, y: y * inverse };
}

/** Shortest signed angular difference between two headings, in radians. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** Frame-rate independent exponential approach. `rate` is "per second". */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Rotates a heading towards a target by at most `maxStep` radians. */
export function turnTowards(current: number, target: number, maxStep: number): number {
  const delta = angleDelta(current, target);
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
