import { BufferAttribute, BufferGeometry, Color, PlaneGeometry, Shape, ShapeGeometry } from 'three';
import {
  BLOCKING_PROP_KINDS,
  CREEK,
  CREEK_WIDTH,
  MOONMERE_POOL,
  PROPS,
  PROP_COLLISION_RADIUS,
  WORLD,
  distanceToAnyPath,
  distanceToCreek,
  groundHeight,
} from '../../core/world/layout.ts';
import { clamp, type Vec3 } from '../../core/vector.ts';
import { PALETTES } from './palette.ts';

/**
 * The ground.
 *
 * One mesh for the whole world, vertex-coloured. That is a deliberate trade:
 * a single 13k-triangle draw call costs less on a phone than a tiled terrain
 * would, and — more importantly — it has **no seams**. The brief explicitly
 * rules out tiled terrain artifacts, and the cheapest way to guarantee none is
 * to have no tiles.
 *
 * Colour is computed per-vertex from three blended inputs: the region palette,
 * the walking lanes, and proximity to water.
 */

/**
 * Ground grid spacing, in world units.
 *
 * At 1.5 a two-unit-wide feature spans barely one vertex, so the path and creek
 * colour ramps landed on the lattice and stair-stepped — the tiling artifact
 * the brief rules out. One unit gives every feature several vertices to fade
 * across. The cost is ~28k triangles, which is still a single draw call.
 */
const RESOLUTION = 1;

/**
 * How far the ground mesh extends past the playable bounds.
 *
 * The player is fenced in by `resolveMove`, but the *camera* can see roughly
 * 18 units past them at maximum zoom. Without a skirt the world visibly ends
 * mid-frame. The skirt is plain terrain with no props, which is exactly right:
 * it reads as "more meadow, over there".
 */
const TERRAIN_MARGIN = 26;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * How much of each region's palette applies at a point.
 *
 * The glade blend is gated on **both** axes. Gating on `z` alone would tint the
 * northern edge of the meadow violet, because the meadow reaches z = -30 too.
 */
export function regionBlend(x: number, z: number): { grove: number; glade: number } {
  const grove = smoothstep(19, 31, x) * smoothstep(14, 6, z);
  const glade = smoothstep(-24, -38, z) * smoothstep(30, 41, x);
  return { grove: clamp(grove - glade, 0, 1), glade };
}

const meadow = PALETTES.meadow;
const grove = PALETTES.grove;
const glade = PALETTES.glade;

const scratchA = new Color();
const scratchB = new Color();
const scratchC = new Color();

/** Blends the three region palettes for one channel of the palette. */
function blendedColour(
  x: number,
  z: number,
  pick: (palette: typeof meadow) => number,
  shade: number,
): Color {
  const { grove: g, glade: m } = regionBlend(x, z);
  scratchA.setHex(pick(meadow));
  scratchB.setHex(pick(grove));
  scratchC.setHex(pick(glade));
  scratchA.lerp(scratchB, g).lerp(scratchC, m);
  // A gentle per-vertex value shift breaks up large flat expanses of turf.
  scratchA.offsetHSL(0, 0, shade);
  // Already in the linear working space — `setHex` converted it. See `paint`.
  return scratchA;
}

/** Cheap deterministic hash. */
function hash2(x: number, z: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smooth value noise.
 *
 * The first pass used raw hash noise per vertex. Because the terrain is
 * Gouraud-shaded, neighbouring random values interpolate into large soft
 * blotches — the ground read as camouflage. Correlating neighbours turns the
 * same variation into gentle undulating tone, which is what a meadow looks like.
 */
function valueNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const n00 = hash2(xi, zi);
  const n10 = hash2(xi + 1, zi);
  const n01 = hash2(xi, zi + 1);
  const n11 = hash2(xi + 1, zi + 1);
  return (n00 + (n10 - n00) * u) * (1 - v) + (n01 + (n11 - n01) * u) * v;
}

/**
 * Baked contact shadows.
 *
 * The game deliberately ships no real-time shadow maps — on a mid-range phone
 * they are the single most expensive thing a scene this simple could ask for.
 * Instead the ground is darkened once, at load, underneath every tree and
 * boulder. It costs nothing at runtime and it is what stops the canopy looking
 * like it is hovering above the grass.
 *
 * A uniform grid keeps this near-linear: without it, 13k vertices against 200
 * props would be 2.6M distance tests.
 */
interface ShadowCaster {
  x: number;
  z: number;
  radius: number;
}

const SHADOW_CELL = 6;

function buildShadowGrid(): Map<string, ShadowCaster[]> {
  const grid = new Map<string, ShadowCaster[]>();
  for (const prop of PROPS) {
    if (!BLOCKING_PROP_KINDS.has(prop.kind)) continue;
    // Canopies are much wider than the trunk they collide with.
    const spread = prop.kind === 'boulder' || prop.kind === 'stump' ? 1.25 : 2.4;
    const caster: ShadowCaster = {
      x: prop.position.x,
      z: prop.position.z,
      radius: (PROP_COLLISION_RADIUS[prop.kind] ?? 0.7) * prop.scale * spread,
    };
    const cx = Math.floor(caster.x / SHADOW_CELL);
    const cz = Math.floor(caster.z / SHADOW_CELL);
    // Register in every cell the shadow can reach, so lookup is a single cell.
    const reach = Math.ceil(caster.radius / SHADOW_CELL);
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(caster);
        else grid.set(key, [caster]);
      }
    }
  }
  return grid;
}

/** 0 = fully shaded, 1 = open ground. */
function shadowAt(grid: Map<string, ShadowCaster[]>, x: number, z: number): number {
  const bucket = grid.get(`${Math.floor(x / SHADOW_CELL)},${Math.floor(z / SHADOW_CELL)}`);
  if (!bucket) return 1;
  let darkest = 1;
  for (const caster of bucket) {
    const distance = Math.hypot(x - caster.x, z - caster.z);
    if (distance >= caster.radius) continue;
    // Soft-edged, and never fully black — the darkest the ground ever gets is
    // 81% of its lit value, which keeps detail readable in shade.
    const strength = 1 - smoothstep(0, caster.radius, distance);
    darkest = Math.min(darkest, 1 - strength * 0.19);
  }
  return darkest;
}

export function buildTerrainGeometry(): BufferGeometry {
  const shadowGrid = buildShadowGrid();
  const minX = WORLD.minX - TERRAIN_MARGIN;
  const maxX = WORLD.maxX + TERRAIN_MARGIN;
  const minZ = WORLD.minZ - TERRAIN_MARGIN;
  const maxZ = WORLD.maxZ + TERRAIN_MARGIN;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  // The skirt is sampled coarsely; it only ever appears at the far edge of the
  // frame, so spending the same vertex density on it would be waste.
  const segmentsX = Math.round((WORLD.maxX - WORLD.minX) / RESOLUTION) + TERRAIN_MARGIN;
  const segmentsZ = Math.round((WORLD.maxZ - WORLD.minZ) / RESOLUTION) + TERRAIN_MARGIN;

  const geometry = new PlaneGeometry(width, depth, segmentsX, segmentsZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(minX + width / 2, 0, minZ + depth / 2);

  const position = geometry.getAttribute('position') as BufferAttribute;
  const colours = new Float32Array(position.count * 3);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, groundHeight(x, z));

    const pathDistance = distanceToAnyPath({ x, y: 0, z });
    const creekDistance = distanceToCreek({ x, y: 0, z });
    const shade = (valueNoise(x * 0.42, z * 0.42) - 0.5) * 0.05;

    // Two neighbouring greens from the palette, mixed by low-frequency noise.
    // Picking freely from all four produced hue jumps large enough to read as
    // patches; adjacent pairs keep the variation as tone, not pattern.
    const band = valueNoise(x * 0.11, z * 0.11) * (meadow.turf.length - 1);
    const lowIndex = Math.min(Math.floor(band), meadow.turf.length - 2);
    const mix = band - lowIndex;
    const colour = blendedColour(x, z, (p) => p.turf[lowIndex]!, shade);
    colour.lerp(blendedColour(x, z, (p) => p.turf[lowIndex + 1]!, shade), mix);

    // Walking lanes fade in as bare earth, with a soft shoulder rather than a
    // hard edge — a hard edge is exactly what reads as a "tile".
    // Walking lanes. The ramp is deliberately wide — a sharp edge on a vertex
    // grid reads as a tile boundary, a wide one reads as a worn verge.
    if (pathDistance < 1.5) {
      const t = 1 - smoothstep(-0.5, 1.5, pathDistance);
      colour.lerp(blendedColour(x, z, (p) => p.path, shade), t * 0.78);
    }

    // Damp earth along the creek. This used to tint toward the *water* colour,
    // which put a second, coarser blue band around the creek ribbon and made
    // the channel look several times wider than it is. Damp ground is darker
    // earth, not water.
    if (creekDistance < 2.2) {
      const t = 1 - smoothstep(-1.6, 2.2, creekDistance);
      scratchB.copy(colour).multiplyScalar(0.72);
      colour.lerp(scratchB, t * 0.85);
    }

    const poolDx = (x - MOONMERE_POOL.centre.x) / (MOONMERE_POOL.radiusX + 2.5);
    const poolDz = (z - MOONMERE_POOL.centre.z) / (MOONMERE_POOL.radiusZ + 2.5);
    const poolDistance = Math.hypot(poolDx, poolDz);
    if (poolDistance < 1.05) {
      scratchB.copy(colour).multiplyScalar(0.66);
      colour.lerp(scratchB, 1 - smoothstep(0.45, 1.05, poolDistance));
    }

    const shade2 = shadowAt(shadowGrid, x, z);
    colours[i * 3] = colour.r * shade2;
    colours[i * 3 + 1] = colour.g * shade2;
    colours[i * 3 + 2] = colour.b * shade2;
  }

  position.needsUpdate = true;
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The creek surface: a ribbon of quads following the authored polyline, sitting
 * just above the carved channel so the water material can ripple over it.
 */
export function buildCreekGeometry(): BufferGeometry {
  const half = CREEK_WIDTH / 2;
  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  const surface = new Color(meadow.water);
  const deep = new Color(0x4f9fb8);

  // Resample the authored polyline.
  //
  // The creek is authored with eight control points across ~55 units. Drawing
  // the ribbon straight between them left ~8-unit spans of flat quad over
  // undulating ground, and the terrain simply poked through — the creek
  // vanished. Resampling to roughly the terrain's own vertex spacing lets the
  // water follow the channel it is carved into.
  const spine: Vec3[] = [];
  const STEP = 1.2;
  for (let i = 0; i < CREEK.length - 1; i++) {
    const a = CREEK[i]!;
    const b = CREEK[i + 1]!;
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.round(span / STEP));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      spine.push({ x: a.x + (b.x - a.x) * t, y: 0, z: a.z + (b.z - a.z) * t });
    }
  }
  spine.push(CREEK[CREEK.length - 1]!);

  for (let i = 0; i < spine.length; i++) {
    const point = spine[i]!;
    const previous = spine[Math.max(i - 1, 0)]!;
    const next = spine[Math.min(i + 1, spine.length - 1)]!;
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    // Perpendicular in the XZ plane.
    const nx = -dz / length;
    const nz = dx / length;
    // Taper the first and last few samples so the creek fades into the world
    // rather than stopping dead at a visible rectangular cap.
    const fade = Math.min(i, spine.length - 1 - i) / 6;
    const taper = 0.3 + 0.7 * Math.min(fade, 1);
    const leftX = point.x + nx * half * taper;
    const leftZ = point.z + nz * half * taper;
    const rightX = point.x - nx * half * taper;
    const rightZ = point.z - nz * half * taper;

    // Clear the highest point of the whole cross-section, not just the spine.
    //
    // Path flattening runs *after* the creek carve, so wherever a trail passes
    // near the creek it lifts one bank more than the channel centre. Using only
    // the spine's height sank the ribbon's outer edge into that bank and the
    // creek disappeared over long stretches. Taking the maximum keeps the water
    // surface level across its width and always above the ground it sits in.
    const y =
      Math.max(
        groundHeight(point.x, point.z),
        groundHeight(leftX, leftZ),
        groundHeight(rightX, rightZ),
      ) + 0.11;

    positions.push(leftX, y, leftZ);
    colours.push(surface.r, surface.g, surface.b);
    positions.push(rightX, y, rightZ);
    colours.push(deep.r, deep.g, deep.b);

    if (i < spine.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The still water of the Moonmere. */
export function buildPoolGeometry(): BufferGeometry {
  const shape = new Shape();
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    // A little wobble keeps the shoreline from reading as a perfect ellipse.
    const wobble = 1 + Math.sin(angle * 3) * 0.05 + Math.cos(angle * 5) * 0.03;
    const x = Math.cos(angle) * MOONMERE_POOL.radiusX * wobble;
    const y = Math.sin(angle) * MOONMERE_POOL.radiusZ * wobble;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const geometry = new ShapeGeometry(shape, 12);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(
    MOONMERE_POOL.centre.x,
    groundHeight(MOONMERE_POOL.centre.x, MOONMERE_POOL.centre.z) + 0.12,
    MOONMERE_POOL.centre.z,
  );

  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  const shallow = new Color(glade.water);
  const deep = new Color(0x2f5a8c);
  for (let i = 0; i < position.count; i++) {
    const dx = (position.getX(i) - MOONMERE_POOL.centre.x) / MOONMERE_POOL.radiusX;
    const dz = (position.getZ(i) - MOONMERE_POOL.centre.z) / MOONMERE_POOL.radiusZ;
    scratchA.copy(deep).lerp(shallow, clamp(Math.hypot(dx, dz), 0, 1));
    colours[i * 3] = scratchA.r;
    colours[i * 3 + 1] = scratchA.g;
    colours[i * 3 + 2] = scratchA.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  return geometry;
}
