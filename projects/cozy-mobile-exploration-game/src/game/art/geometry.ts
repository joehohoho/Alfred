import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createRng, type Rng } from '../../core/rng.ts';

/**
 * Geometry toolkit.
 *
 * Every mesh in the game is built here from primitives — there are no imported
 * models. Two conventions make that workable at scale:
 *
 *  - **Colour lives in the vertices.** One shared material can then draw the
 *    entire world, which keeps draw calls low on a phone. `paint()` is how a
 *    primitive gets its colour.
 *  - **Everything returns a `BufferGeometry`**, so parts compose with
 *    `mergeGeometries` into one prototype per prop kind, ready to instance.
 */

const scratch = new Matrix4();
const scratchColor = new Color();

/** Writes a flat colour into a geometry's vertex colours. */
export function paint(geometry: BufferGeometry, colour: number): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  const colours = new Float32Array(count * 3);
  // `setHex` already converts sRGB -> the linear working space, because
  // THREE.ColorManagement is enabled by default. Converting again here would
  // apply the transfer function twice and darken every authored colour.
  scratchColor.setHex(colour);
  for (let i = 0; i < count; i++) {
    colours[i * 3] = scratchColor.r;
    colours[i * 3 + 1] = scratchColor.g;
    colours[i * 3 + 2] = scratchColor.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  return geometry;
}

/**
 * Paints a vertical gradient between two colours. Used for canopies and stone,
 * where a slightly darker underside sells the form without a second light.
 */
export function paintGradient(
  geometry: BufferGeometry,
  bottom: number,
  top: number,
): BufferGeometry {
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  // Already linear — see the note in `paint`.
  const low = new Color(bottom);
  const high = new Color(top);

  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = maxY - minY || 1;

  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) - minY) / span;
    scratchColor.copy(low).lerp(high, t);
    colours[i * 3] = scratchColor.r;
    colours[i * 3 + 1] = scratchColor.g;
    colours[i * 3 + 2] = scratchColor.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  return geometry;
}

export function translate(geometry: BufferGeometry, x: number, y: number, z: number) {
  geometry.translate(x, y, z);
  return geometry;
}

export function rotateY(geometry: BufferGeometry, radians: number) {
  geometry.rotateY(radians);
  return geometry;
}

export function transform(
  geometry: BufferGeometry,
  options: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number] | number;
  },
): BufferGeometry {
  const { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = options;
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  geometry.scale(s[0], s[1], s[2]);
  if (rotation[0]) geometry.rotateX(rotation[0]);
  if (rotation[1]) geometry.rotateY(rotation[1]);
  if (rotation[2]) geometry.rotateZ(rotation[2]);
  geometry.translate(position[0], position[1], position[2]);
  return geometry;
}

/**
 * Nudges every vertex by a small random amount.
 *
 * This is the single biggest reason the world does not read as "primitives on a
 * plane": a jittered icosahedron is a rock, an un-jittered one is a die. The
 * jitter is seeded, so it is part of the deterministic world.
 */
export function jitter(geometry: BufferGeometry, amount: number, rng: Rng): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) + rng.range(-amount, amount),
      position.getY(i) + rng.range(-amount, amount),
      position.getZ(i) + rng.range(-amount, amount),
    );
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Squashes a geometry's lowest vertices flat, so a shape sits on the ground. */
export function flattenBase(geometry: BufferGeometry, threshold = 0.02): BufferGeometry {
  const position = geometry.getAttribute('position') as BufferAttribute;
  let minY = Infinity;
  for (let i = 0; i < position.count; i++) minY = Math.min(minY, position.getY(i));
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) - minY < threshold) position.setY(i, minY);
  }
  position.needsUpdate = true;
  return geometry;
}

/**
 * Combines parts into one geometry.
 *
 * Normalises indexing first. Three's primitives disagree: `CylinderGeometry`
 * and `PlaneGeometry` are indexed, `IcosahedronGeometry` is not, and
 * `mergeGeometries` refuses a mix. Since everything here is flat-shaded with
 * per-vertex colour, dropping the index costs a little memory and nothing
 * visually — and it means an artist can combine any two primitives without
 * having to know which camp each one is in.
 */
export function combine(parts: BufferGeometry[]): BufferGeometry {
  const usable = parts.filter((part) => part.getAttribute('position').count > 0);
  if (usable.length === 0) throw new Error('combine: nothing to combine');
  if (usable.length === 1) return usable[0]!;

  const needsFlattening = usable.some((part) => part.index !== null);
  const normalised = usable.map((part) => {
    if (!needsFlattening || part.index === null) return part;
    const flat = part.toNonIndexed();
    part.dispose();
    return flat;
  });

  const merged = mergeGeometries(normalised, false);
  if (!merged) throw new Error('combine: geometries have mismatched attributes');
  for (const part of normalised) if (part !== merged) part.dispose();
  return merged;
}

// ---------------------------------------------------------------------------
// Primitive shorthands. Low segment counts throughout — this is a low-poly
// game and every segment is a vertex a phone has to transform.
// ---------------------------------------------------------------------------

export const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);

export const cyl = (rTop: number, rBottom: number, h: number, sides = 6) =>
  new CylinderGeometry(rTop, rBottom, h, sides, 1);

export const cone = (r: number, h: number, sides = 7) => new ConeGeometry(r, h, sides, 1);

export const ball = (r: number, detail = 1) => new IcosahedronGeometry(r, detail);

export const sphere = (r: number, w = 8, h = 6) => new SphereGeometry(r, w, h);

export const capsule = (r: number, length: number, caps = 3, sides = 8) =>
  new CapsuleGeometry(r, length, caps, sides);

export const plane = (w: number, h: number, segW = 1, segH = 1) =>
  new PlaneGeometry(w, h, segW, segH);

export const ring = (r: number, tube: number, sides = 6, segments = 12) =>
  new TorusGeometry(r, tube, sides, segments);

/** A flat quad lying on the ground, facing up. */
export function groundQuad(w: number, h: number, segW = 1, segH = 1): BufferGeometry {
  const geometry = new PlaneGeometry(w, h, segW, segH);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * A tapered, slightly bent stalk — the base shape for grass, reeds and stems.
 * The bend is what stops a field of grass looking like a bed of nails.
 */
export function stalk(
  height: number,
  width: number,
  bend: number,
  segments = 3,
): BufferGeometry {
  const geometry = new PlaneGeometry(width, height, 1, segments);
  const position = geometry.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) + height / 2;
    const t = y / height;
    // Taper to a point and lean over, both quadratic in height.
    position.setX(i, position.getX(i) * (1 - t * 0.85));
    position.setZ(i, position.getZ(i) + bend * t * t);
  }
  position.needsUpdate = true;
  geometry.translate(0, height / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

/** A cross of two quads — cheap volumetric-looking foliage from 4 triangles. */
export function billboardCross(w: number, h: number): BufferGeometry {
  const a = new PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  return combine([a, b]);
}

/** Seeded RNG scoped to an art asset, so prototypes are reproducible. */
export function artRng(name: string, salt = 0): Rng {
  let hash = 0x811c9dc5 ^ salt;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return createRng(hash >>> 0);
}

export { scratch as scratchMatrix };
