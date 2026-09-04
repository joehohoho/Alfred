import { createRng, hashSeed } from '../rng.ts';
import type { ResourceNodeDef } from '../resources.ts';
import type { GatherableId, RegionId, SafeZone } from '../types.ts';
import { vec3, type Vec3 } from '../vector.ts';

/**
 * The authored world.
 *
 * Everything here is data, expanded deterministically from seeds at module
 * load. "Deterministic" is doing real work: it means the meadow in a
 * screenshot test is the meadow on the player's phone, and that a bug can be
 * reproduced from a seed rather than a save file.
 *
 * Layout reads south-west to north-east:
 *
 *      Moonmere Glade   (cool violet, unlocked by the guardian)
 *            ^
 *      Thornhollow Grove (unlocked by the first Dawnspire)
 *            ^
 *      Sunmere Meadow   (warm, where you wake up)
 */

export const WORLD = {
  /** Hard movement bounds. The camera never shows beyond this. */
  minX: -46,
  maxX: 78,
  minZ: -76,
  maxZ: 40,
  /** Ground plane height. The terrain undulates around it. */
  baseY: 0,
} as const;

// ---------------------------------------------------------------------------
// Named places
// ---------------------------------------------------------------------------

export const PLACES = {
  wakingStone: vec3(-16, 0, 14),
  hollowStump: vec3(-22.5, 0, -4),
  shelterClearing: vec3(-4.5, 0, 20.5),
  pimMeeting: vec3(-9.5, 0, 2.5),
  meadowDawnspire: vec3(18, 0, -4),
  groveGate: vec3(27, 0, -5.5),
  bramblehornRing: vec3(43, 0, -14),
  mistveil: vec3(49, 0, -29),
  moonmereDawnspire: vec3(52, 0, -46),
  moonmereShore: vec3(60, 0, -52),
} as const;

/**
 * Walking routes. These do three jobs at once: they are the readable exploration
 * lanes the brief asks for, the surface the path mesh is built from, and the
 * exclusion volume that keeps scattered scenery from growing across the road.
 */
export interface PathDef {
  id: string;
  region: RegionId;
  width: number;
  points: readonly Vec3[];
}

export const PATHS: readonly PathDef[] = [
  {
    id: 'waking-to-crossing',
    region: 'meadow',
    width: 2.7,
    points: [vec3(-16, 0, 14), vec3(-13.5, 0, 9), vec3(-10, 0, 4.5), vec3(-7.5, 0, 0.5)],
  },
  {
    id: 'crossing-to-stump',
    region: 'meadow',
    width: 2.4,
    points: [vec3(-7.5, 0, 0.5), vec3(-11, 0, -2.5), vec3(-16.5, 0, -4), vec3(-21, 0, -4)],
  },
  {
    id: 'crossing-to-clearing',
    region: 'meadow',
    width: 2.5,
    points: [vec3(-9, 0, 3.5), vec3(-7.5, 0, 10), vec3(-6, 0, 16), vec3(-4.8, 0, 20)],
  },
  {
    id: 'crossing-to-spire',
    region: 'meadow',
    width: 2.8,
    points: [vec3(-7.5, 0, 0.5), vec3(0, 0, -1.5), vec3(8, 0, -3), vec3(15.5, 0, -3.8)],
  },
  {
    id: 'spire-to-gate',
    region: 'meadow',
    width: 2.6,
    points: [vec3(19.5, 0, -4.2), vec3(23.5, 0, -4.8), vec3(27, 0, -5.5)],
  },
  {
    id: 'gate-to-ring',
    region: 'grove',
    width: 2.6,
    points: [vec3(27, 0, -5.5), vec3(32, 0, -8), vec3(37.5, 0, -11), vec3(42, 0, -13.5)],
  },
  {
    id: 'ring-to-mistveil',
    region: 'grove',
    width: 2.3,
    points: [vec3(44, 0, -16.5), vec3(46.5, 0, -22), vec3(48.5, 0, -27)],
  },
  {
    id: 'mistveil-to-spire',
    region: 'glade',
    width: 2.5,
    points: [vec3(49, 0, -30.5), vec3(50.5, 0, -36), vec3(51.5, 0, -41), vec3(52, 0, -44)],
  },
  {
    id: 'spire-to-shore',
    region: 'glade',
    width: 2.2,
    points: [vec3(53.5, 0, -47), vec3(57, 0, -49.5), vec3(60, 0, -52)],
  },
];

/**
 * The creek. Purely scenic (it is shallow and walkable) but it is the strongest
 * readability cue in the meadow, so it is authored rather than scattered.
 */
export const CREEK: readonly Vec3[] = [
  vec3(-40, 0, -18),
  vec3(-31, 0, -12),
  vec3(-24, 0, -6.5),
  vec3(-17, 0, 1),
  vec3(-12.5, 0, 8),
  vec3(-10, 0, 15),
  vec3(-8.5, 0, 23),
  vec3(-9, 0, 31),
];

export const CREEK_WIDTH = 3.6;

/** The still water Moonmere is named for. */
export const MOONMERE_POOL = { centre: vec3(58, 0, -50), radiusX: 11, radiusZ: 8 };

// ---------------------------------------------------------------------------
// Safe zones — the brief requires that these never hold hostile creatures
// ---------------------------------------------------------------------------

export const SAFE_ZONES: readonly SafeZone[] = [
  { id: 'waking-stone', centre: PLACES.wakingStone, radius: 8 },
  { id: 'hollow-stump', centre: PLACES.hollowStump, radius: 10 },
  { id: 'hearthnest', centre: PLACES.shelterClearing, radius: 11 },
  { id: 'meadow-dawnspire', centre: PLACES.meadowDawnspire, radius: 9 },
  { id: 'moonmere-dawnspire', centre: PLACES.moonmereDawnspire, radius: 10 },
];

export function isInsideSafeZone(position: Vec3, padding = 0): boolean {
  return SAFE_ZONES.some((zone) => {
    const dx = position.x - zone.centre.x;
    const dz = position.z - zone.centre.z;
    return Math.hypot(dx, dz) <= zone.radius + padding;
  });
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Shortest distance from a point to a polyline, on the XZ plane. */
export function distanceToPolyline(point: Vec3, polyline: readonly Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const lengthSq = abx * abx + abz * abz;
    const t =
      lengthSq === 0
        ? 0
        : Math.min(Math.max(((point.x - a.x) * abx + (point.z - a.z) * abz) / lengthSq, 0), 1);
    const distance = Math.hypot(point.x - (a.x + abx * t), point.z - (a.z + abz * t));
    if (distance < best) best = distance;
  }
  return best;
}

export function distanceToAnyPath(point: Vec3): number {
  let best = Infinity;
  for (const path of PATHS) {
    const d = distanceToPolyline(point, path.points) - path.width / 2;
    if (d < best) best = d;
  }
  return best;
}

export function distanceToCreek(point: Vec3): number {
  return distanceToPolyline(point, CREEK) - CREEK_WIDTH / 2;
}

/**
 * Gentle terrain height. Kept as one analytic function rather than a heightmap
 * so that core, renderer, and any future physics all agree exactly on where the
 * ground is, with no sampling mismatch.
 */
export function terrainHeight(x: number, z: number): number {
  const rolling =
    Math.sin(x * 0.058) * 0.85 +
    Math.cos(z * 0.049) * 0.75 +
    Math.sin((x + z) * 0.031) * 0.55;
  // The glade sits in a shallow bowl; the grove rises onto a shoulder.
  const gladeBowl = -1.6 * Math.exp(-((x - 54) ** 2 + (z + 46) ** 2) / 620);
  const groveRise = 1.5 * Math.exp(-((x - 40) ** 2 + (z + 12) ** 2) / 760);
  // Paths and the creek are flattened so nothing important sits on a slope.
  return rolling * 0.55 + gladeBowl + groveRise;
}

/** Ground height with paths and the creek bed levelled in. */
export function groundHeight(x: number, z: number): number {
  const point = vec3(x, 0, z);
  const base = terrainHeight(x, z);
  const pathDistance = distanceToAnyPath(point);
  const creekDistance = distanceToCreek(point);

  let height = base;
  // Carve the creek first, then flatten the paths on top of the result. Order
  // matters: where a path crosses the creek the player should walk over a level
  // ford, not drop into the channel.
  if (creekDistance < 2.2) {
    const depth = 1 - Math.min(Math.max(creekDistance / 2.2, 0), 1);
    height -= depth * 0.55;
  }
  if (pathDistance < 2.5) {
    const flatten = 1 - Math.min(Math.max(pathDistance / 2.5, 0), 1);
    height = height * (1 - flatten * 0.85);
  }
  return height;
}

// ---------------------------------------------------------------------------
// Region classification
// ---------------------------------------------------------------------------

export interface RegionBounds {
  region: RegionId;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const REGION_BOUNDS: readonly RegionBounds[] = [
  { region: 'glade', minX: 33, maxX: 78, minZ: -76, maxZ: -30 },
  { region: 'grove', minX: 25, maxX: 62, minZ: -30, maxZ: 10 },
  { region: 'meadow', minX: -46, maxX: 30, minZ: -30, maxZ: 40 },
];

export function regionAt(position: Vec3): RegionId {
  for (const bounds of REGION_BOUNDS) {
    if (
      position.x >= bounds.minX &&
      position.x <= bounds.maxX &&
      position.z >= bounds.minZ &&
      position.z <= bounds.maxZ
    ) {
      return bounds.region;
    }
  }
  return 'meadow';
}

/**
 * Gates between regions. Each is a line segment the player cannot cross until
 * its flag is set; the presentation draws a bramble arch / mistveil across it.
 */
export interface GateDef {
  id: 'bramble-gate' | 'mistveil';
  name: string;
  /** Centre of the barrier. */
  position: Vec3;
  /** Half-width of the barrier, perpendicular to `facing`. */
  halfWidth: number;
  /** Direction the player travels through the gate, radians (atan2(x, z)). */
  facing: number;
  from: RegionId;
  to: RegionId;
  lockedMessage: string;
}

export const GATES: readonly GateDef[] = [
  {
    id: 'bramble-gate',
    name: 'the Bramble Gate',
    position: PLACES.groveGate,
    halfWidth: 9,
    facing: Math.atan2(1, -0.2),
    from: 'meadow',
    to: 'grove',
    lockedMessage: 'The brambles are still knotted shut. Something has to wake first.',
  },
  {
    id: 'mistveil',
    name: 'the Mistveil',
    position: PLACES.mistveil,
    halfWidth: 8,
    facing: Math.atan2(0.2, -1),
    from: 'grove',
    to: 'glade',
    lockedMessage: 'Cold mist, too thick to walk through. The grove is not settled yet.',
  },
];

// ---------------------------------------------------------------------------
// Resource nodes — authored clusters, deterministically expanded
// ---------------------------------------------------------------------------

interface NodeClusterDef {
  id: string;
  resource: GatherableId;
  region: RegionId;
  centre: Vec3;
  radius: number;
  count: number;
  yieldMin: number;
  yieldMax: number;
}

/**
 * Clusters, not lone props. The brief asks for "rich resource clusters rather
 * than isolated placeholder objects", so a gathering spot is 3–6 nodes the
 * player can work through in one stop.
 */
const NODE_CLUSTERS: readonly NodeClusterDef[] = [
  // --- Sunmere Meadow: the starter loop, all within sight of the paths -----
  { id: 'petal-waking', resource: 'sunpetal', region: 'meadow', centre: vec3(-19.5, 0, 9), radius: 3.6, count: 4, yieldMin: 1, yieldMax: 2 },
  { id: 'petal-creekbend', resource: 'sunpetal', region: 'meadow', centre: vec3(-13.5, 0, -3.5), radius: 4.2, count: 5, yieldMin: 1, yieldMax: 2 },
  { id: 'petal-eastrise', resource: 'sunpetal', region: 'meadow', centre: vec3(9.5, 0, 3.5), radius: 4.4, count: 5, yieldMin: 1, yieldMax: 2 },
  { id: 'petal-southfield', resource: 'sunpetal', region: 'meadow', centre: vec3(-1, 0, 26), radius: 4.6, count: 4, yieldMin: 1, yieldMax: 3 },

  { id: 'wood-birchstand', resource: 'boughwood', region: 'meadow', centre: vec3(-24, 0, 13), radius: 4.4, count: 4, yieldMin: 1, yieldMax: 2 },
  { id: 'wood-hollowrow', resource: 'boughwood', region: 'meadow', centre: vec3(-16, 0, -13), radius: 4.6, count: 5, yieldMin: 1, yieldMax: 2 },
  { id: 'wood-eastcopse', resource: 'boughwood', region: 'meadow', centre: vec3(12, 0, -13.5), radius: 4.8, count: 5, yieldMin: 1, yieldMax: 2 },
  { id: 'wood-nestcopse', resource: 'boughwood', region: 'meadow', centre: vec3(3, 0, 18), radius: 4.2, count: 4, yieldMin: 1, yieldMax: 2 },

  { id: 'stone-creekmouth', resource: 'riverstone', region: 'meadow', centre: vec3(-22, 0, -8.5), radius: 3.8, count: 4, yieldMin: 1, yieldMax: 2 },
  { id: 'stone-fordbank', resource: 'riverstone', region: 'meadow', centre: vec3(-11.5, 0, 25.5), radius: 3.4, count: 4, yieldMin: 1, yieldMax: 2 },
  { id: 'stone-spirefoot', resource: 'riverstone', region: 'meadow', centre: vec3(21, 0, 2.5), radius: 4.2, count: 4, yieldMin: 1, yieldMax: 2 },
  { id: 'stone-southshelf', resource: 'riverstone', region: 'meadow', centre: vec3(-27, 0, 21), radius: 4.4, count: 4, yieldMin: 1, yieldMax: 2 },

  // --- Thornhollow Grove: denser, slightly richer -------------------------
  { id: 'petal-groveedge', resource: 'sunpetal', region: 'grove', centre: vec3(33, 0, -2), radius: 4, count: 4, yieldMin: 1, yieldMax: 3 },
  { id: 'wood-thornfall', resource: 'boughwood', region: 'grove', centre: vec3(37, 0, -19), radius: 4.6, count: 5, yieldMin: 2, yieldMax: 3 },
  { id: 'stone-groveshelf', resource: 'riverstone', region: 'grove', centre: vec3(50, 0, -10), radius: 4.4, count: 4, yieldMin: 1, yieldMax: 3 },

  // --- Moonmere Glade: the richest, and the reason to come back ------------
  { id: 'petal-moonbloom', resource: 'sunpetal', region: 'glade', centre: vec3(44, 0, -42), radius: 4.4, count: 5, yieldMin: 2, yieldMax: 3 },
  { id: 'wood-palewood', resource: 'boughwood', region: 'glade', centre: vec3(62, 0, -40), radius: 4.6, count: 4, yieldMin: 2, yieldMax: 3 },
  { id: 'stone-mereshore', resource: 'riverstone', region: 'glade', centre: vec3(63, 0, -57), radius: 4.8, count: 5, yieldMin: 2, yieldMax: 3 },
  { id: 'petal-southmere', resource: 'sunpetal', region: 'glade', centre: vec3(46, 0, -58), radius: 4.2, count: 4, yieldMin: 2, yieldMax: 3 },
];

/**
 * Expands clusters into individual nodes.
 *
 * Placement retries a few times per node to keep nodes off the walking lanes —
 * a gathering prop standing in the road reads as an obstacle, not an invitation.
 */
/**
 * Walks a point away from the nearest walking lane until it has `minClearance`.
 *
 * A safety net rather than the main mechanism: cluster sampling handles the
 * normal case, but this guarantees the invariant holds even if someone later
 * drops a cluster centre right on a path. Uses a numeric gradient of
 * `distanceToAnyPath`, which is cheap here because it runs once at module load.
 */
function pushOffPath(position: Vec3, minClearance: number): Vec3 {
  let current = position;
  for (let step = 0; step < 12; step++) {
    const clearance = distanceToAnyPath(current);
    if (clearance >= minClearance) return current;
    const eps = 0.15;
    const gx =
      (distanceToAnyPath(vec3(current.x + eps, 0, current.z)) -
        distanceToAnyPath(vec3(current.x - eps, 0, current.z))) /
      (2 * eps);
    const gz =
      (distanceToAnyPath(vec3(current.x, 0, current.z + eps)) -
        distanceToAnyPath(vec3(current.x, 0, current.z - eps))) /
      (2 * eps);
    const magnitude = Math.hypot(gx, gz);
    // On the exact centre line the gradient vanishes; step sideways instead.
    if (magnitude < 1e-4) {
      current = vec3(current.x + 0.4, 0, current.z + 0.4);
      continue;
    }
    const advance = Math.min(minClearance - clearance + 0.1, 0.9);
    current = vec3(current.x + (gx / magnitude) * advance, 0, current.z + (gz / magnitude) * advance);
  }
  return current;
}

function buildResourceNodes(): ResourceNodeDef[] {
  const nodes: ResourceNodeDef[] = [];

  for (const cluster of NODE_CLUSTERS) {
    const rng = createRng(hashSeed(`node:${cluster.id}`));
    const placed: Vec3[] = [];

    for (let i = 0; i < cluster.count; i++) {
      let position: Vec3 | null = null;
      // Best spacing-legal candidate seen so far, scored by clearance from the
      // walking lanes. Sampling can fail 40 times in a tight cluster, and a
      // node dumped in the middle of the road reads as an obstacle rather than
      // an invitation — so the fallback is "furthest from a path we managed to
      // find", never a blind offset from the cluster centre.
      let best: { position: Vec3; clearance: number } | null = null;

      for (let attempt = 0; attempt < 40 && !position; attempt++) {
        const angle = rng.range(0, Math.PI * 2);
        // sqrt keeps the scatter area-uniform instead of bunched at the centre.
        const distance = Math.sqrt(rng.next()) * cluster.radius;
        const candidate = vec3(
          cluster.centre.x + Math.cos(angle) * distance,
          0,
          cluster.centre.z + Math.sin(angle) * distance,
        );
        if (placed.some((p) => Math.hypot(p.x - candidate.x, p.z - candidate.z) < 1.9)) continue;

        const clearance = distanceToAnyPath(candidate);
        if (clearance >= 1.5) {
          position = candidate;
          break;
        }
        if (!best || clearance > best.clearance) best = { position: candidate, clearance };
      }
      if (!position) position = pushOffPath(best ? best.position : { ...cluster.centre }, 1.5);

      placed.push(position);
      nodes.push({
        id: `${cluster.id}-${i}`,
        resource: cluster.resource,
        region: cluster.region,
        position: vec3(position.x, groundHeight(position.x, position.z), position.z),
        yieldMin: cluster.yieldMin,
        yieldMax: cluster.yieldMax,
        variant: rng.int(0, 2),
        rotation: rng.range(0, Math.PI * 2),
        scale: rng.range(0.88, 1.18),
      });
    }
  }

  return nodes;
}

export const RESOURCE_NODES: readonly ResourceNodeDef[] = buildResourceNodes();

/**
 * Regenerates the node set from scratch. Exists so tests can prove the world is
 * genuinely deterministic — that a second generation is byte-identical to the
 * first — rather than merely reading the same cached array twice.
 */
export function rebuildResourceNodes(): ResourceNodeDef[] {
  return buildResourceNodes();
}

export const RESOURCE_NODES_BY_ID: ReadonlyMap<string, ResourceNodeDef> = new Map(
  RESOURCE_NODES.map((node) => [node.id, node]),
);

/** How close the player must stand to gather. */
export const GATHER_RADIUS = 2.4;

// ---------------------------------------------------------------------------
// Creature posts
// ---------------------------------------------------------------------------

export interface CreaturePost {
  id: string;
  species: 'thistlebur' | 'bramblehorn';
  region: RegionId;
  home: Vec3;
  /** Seconds before a settled creature wanders back. */
  respawnSeconds: number;
}

/**
 * Every post is checked against `isInsideSafeZone` at module load — the brief
 * requires safe places to never hold hostiles, and a unit test asserts it, so a
 * future edit that drags a post onto the Hearthnest fails the build rather than
 * shipping.
 */
export const CREATURE_POSTS: readonly CreaturePost[] = [
  { id: 'thistle-longgrass-a', species: 'thistlebur', region: 'meadow', home: vec3(2.5, 0, 8.5), respawnSeconds: 105 },
  { id: 'thistle-longgrass-b', species: 'thistlebur', region: 'meadow', home: vec3(6, 0, 11.5), respawnSeconds: 105 },
  { id: 'thistle-hollowrow', species: 'thistlebur', region: 'meadow', home: vec3(-15.5, 0, -17.5), respawnSeconds: 120 },
  { id: 'thistle-eastcopse', species: 'thistlebur', region: 'meadow', home: vec3(13.5, 0, -17), respawnSeconds: 120 },
  { id: 'thistle-southfield', species: 'thistlebur', region: 'meadow', home: vec3(-16, 0, 27), respawnSeconds: 130 },
  { id: 'thistle-grove-a', species: 'thistlebur', region: 'grove', home: vec3(34, 0, -16), respawnSeconds: 110 },
  { id: 'thistle-grove-b', species: 'thistlebur', region: 'grove', home: vec3(48, 0, -18.5), respawnSeconds: 110 },
  { id: 'thistle-glade-a', species: 'thistlebur', region: 'glade', home: vec3(43, 0, -52), respawnSeconds: 115 },
  { id: 'thistle-glade-b', species: 'thistlebur', region: 'glade', home: vec3(64, 0, -46), respawnSeconds: 115 },
  { id: 'bramblehorn', species: 'bramblehorn', region: 'grove', home: PLACES.bramblehornRing, respawnSeconds: 0 },
];

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

export type PropKind =
  | 'broadleaf'
  | 'conifer'
  | 'birch'
  | 'shrub'
  | 'fern'
  | 'grassTuft'
  | 'flowerTuft'
  | 'rock'
  | 'boulder'
  | 'log'
  | 'stump'
  | 'reed'
  | 'lilypad'
  | 'mushroom'
  | 'moonbloom'
  | 'palePine'
  | 'crystalShard'
  | 'thornArch';

export interface PropInstance {
  id: string;
  kind: PropKind;
  region: RegionId;
  position: Vec3;
  rotation: number;
  scale: number;
  variant: number;
}

interface ScatterDef {
  id: string;
  kind: PropKind;
  region: RegionId;
  centre: Vec3;
  radiusX: number;
  radiusZ: number;
  count: number;
  scaleMin: number;
  scaleMax: number;
  /** Keeps the prop this far clear of walking lanes. */
  pathClearance: number;
  /** When set, the prop must be within this distance of the creek. */
  hugCreek?: number;
  /** When set, the prop must be inside the Moonmere pool. */
  inPool?: boolean;
  /** Skip positions inside a safe zone (used for large blocking scenery). */
  avoidSafeZones?: boolean;
}

const SCATTERS: readonly ScatterDef[] = [
  // --- Meadow canopy: kept off-centre so the play lane stays open ---------
  { id: 'meadow-broadleaf-west', kind: 'broadleaf', region: 'meadow', centre: vec3(-31, 0, 4), radiusX: 13, radiusZ: 17, count: 22, scaleMin: 0.85, scaleMax: 1.35, pathClearance: 3.4, avoidSafeZones: true },
  { id: 'meadow-broadleaf-north', kind: 'broadleaf', region: 'meadow', centre: vec3(-4, 0, -22), radiusX: 20, radiusZ: 7, count: 20, scaleMin: 0.85, scaleMax: 1.3, pathClearance: 3.4, avoidSafeZones: true },
  { id: 'meadow-broadleaf-south', kind: 'broadleaf', region: 'meadow', centre: vec3(-14, 0, 33), radiusX: 22, radiusZ: 6, count: 18, scaleMin: 0.9, scaleMax: 1.3, pathClearance: 3.4, avoidSafeZones: true },
  { id: 'meadow-birch', kind: 'birch', region: 'meadow', centre: vec3(-24, 0, 14), radiusX: 8, radiusZ: 8, count: 14, scaleMin: 0.9, scaleMax: 1.25, pathClearance: 3, avoidSafeZones: true },
  { id: 'meadow-birch-east', kind: 'birch', region: 'meadow', centre: vec3(14, 0, 14), radiusX: 10, radiusZ: 9, count: 13, scaleMin: 0.9, scaleMax: 1.2, pathClearance: 3, avoidSafeZones: true },
  { id: 'meadow-shrub', kind: 'shrub', region: 'meadow', centre: vec3(-5, 0, 4), radiusX: 30, radiusZ: 26, count: 54, scaleMin: 0.7, scaleMax: 1.15, pathClearance: 2.2 },
  { id: 'meadow-fern', kind: 'fern', region: 'meadow', centre: vec3(-18, 0, 6), radiusX: 20, radiusZ: 22, count: 46, scaleMin: 0.7, scaleMax: 1.1, pathClearance: 1.9 },
  { id: 'meadow-grass', kind: 'grassTuft', region: 'meadow', centre: vec3(-6, 0, 6), radiusX: 34, radiusZ: 30, count: 150, scaleMin: 0.6, scaleMax: 1.15, pathClearance: 1.5 },
  { id: 'meadow-flowers', kind: 'flowerTuft', region: 'meadow', centre: vec3(-6, 0, 6), radiusX: 32, radiusZ: 28, count: 96, scaleMin: 0.65, scaleMax: 1.1, pathClearance: 1.4 },
  { id: 'meadow-rocks', kind: 'rock', region: 'meadow', centre: vec3(-8, 0, 2), radiusX: 30, radiusZ: 26, count: 42, scaleMin: 0.6, scaleMax: 1.2, pathClearance: 2 },
  { id: 'meadow-boulders', kind: 'boulder', region: 'meadow', centre: vec3(-20, 0, -12), radiusX: 16, radiusZ: 12, count: 9, scaleMin: 0.9, scaleMax: 1.5, pathClearance: 4, avoidSafeZones: true },
  { id: 'meadow-logs', kind: 'log', region: 'meadow', centre: vec3(-12, 0, 16), radiusX: 22, radiusZ: 18, count: 11, scaleMin: 0.85, scaleMax: 1.2, pathClearance: 3 },
  { id: 'meadow-stumps', kind: 'stump', region: 'meadow', centre: vec3(0, 0, -10), radiusX: 24, radiusZ: 16, count: 10, scaleMin: 0.8, scaleMax: 1.15, pathClearance: 2.6 },
  { id: 'meadow-mushrooms', kind: 'mushroom', region: 'meadow', centre: vec3(-22, 0, 2), radiusX: 18, radiusZ: 20, count: 26, scaleMin: 0.7, scaleMax: 1.1, pathClearance: 1.8 },
  { id: 'meadow-reeds', kind: 'reed', region: 'meadow', centre: vec3(-14, 0, 6), radiusX: 26, radiusZ: 26, count: 40, scaleMin: 0.8, scaleMax: 1.2, pathClearance: 1.2, hugCreek: 2.6 },

  // --- Thornhollow Grove: taller, tighter, a little more shadowed ----------
  { id: 'grove-conifer', kind: 'conifer', region: 'grove', centre: vec3(40, 0, -8), radiusX: 15, radiusZ: 14, count: 26, scaleMin: 1, scaleMax: 1.55, pathClearance: 3.6, avoidSafeZones: true },
  { id: 'grove-conifer-north', kind: 'conifer', region: 'grove', centre: vec3(45, 0, -24), radiusX: 13, radiusZ: 8, count: 18, scaleMin: 1, scaleMax: 1.5, pathClearance: 3.4, avoidSafeZones: true },
  { id: 'grove-shrub', kind: 'shrub', region: 'grove', centre: vec3(40, 0, -12), radiusX: 16, radiusZ: 15, count: 38, scaleMin: 0.75, scaleMax: 1.25, pathClearance: 2.2 },
  { id: 'grove-fern', kind: 'fern', region: 'grove', centre: vec3(39, 0, -13), radiusX: 15, radiusZ: 14, count: 34, scaleMin: 0.8, scaleMax: 1.2, pathClearance: 1.9 },
  { id: 'grove-grass', kind: 'grassTuft', region: 'grove', centre: vec3(41, 0, -12), radiusX: 17, radiusZ: 16, count: 70, scaleMin: 0.6, scaleMax: 1.1, pathClearance: 1.5 },
  { id: 'grove-rocks', kind: 'rock', region: 'grove', centre: vec3(44, 0, -14), radiusX: 15, radiusZ: 14, count: 24, scaleMin: 0.65, scaleMax: 1.25, pathClearance: 2 },
  { id: 'grove-mushrooms', kind: 'mushroom', region: 'grove', centre: vec3(38, 0, -16), radiusX: 12, radiusZ: 12, count: 22, scaleMin: 0.75, scaleMax: 1.2, pathClearance: 1.8 },
  { id: 'grove-logs', kind: 'log', region: 'grove', centre: vec3(43, 0, -19), radiusX: 12, radiusZ: 10, count: 7, scaleMin: 0.9, scaleMax: 1.25, pathClearance: 3 },

  // --- Moonmere Glade: pale trunks, cool blooms, quartz ---------------------
  { id: 'glade-palepine', kind: 'palePine', region: 'glade', centre: vec3(52, 0, -44), radiusX: 19, radiusZ: 19, count: 30, scaleMin: 1, scaleMax: 1.6, pathClearance: 3.6, avoidSafeZones: true },
  { id: 'glade-palepine-far', kind: 'palePine', region: 'glade', centre: vec3(64, 0, -62), radiusX: 12, radiusZ: 10, count: 16, scaleMin: 1, scaleMax: 1.5, pathClearance: 3.4 },
  { id: 'glade-moonbloom', kind: 'moonbloom', region: 'glade', centre: vec3(52, 0, -47), radiusX: 20, radiusZ: 18, count: 62, scaleMin: 0.7, scaleMax: 1.2, pathClearance: 1.4 },
  { id: 'glade-crystal', kind: 'crystalShard', region: 'glade', centre: vec3(55, 0, -45), radiusX: 18, radiusZ: 17, count: 20, scaleMin: 0.7, scaleMax: 1.4, pathClearance: 2.4 },
  { id: 'glade-grass', kind: 'grassTuft', region: 'glade', centre: vec3(53, 0, -47), radiusX: 20, radiusZ: 19, count: 76, scaleMin: 0.6, scaleMax: 1.1, pathClearance: 1.5 },
  { id: 'glade-rocks', kind: 'rock', region: 'glade', centre: vec3(56, 0, -50), radiusX: 17, radiusZ: 15, count: 22, scaleMin: 0.65, scaleMax: 1.2, pathClearance: 2 },
  { id: 'glade-lilypad', kind: 'lilypad', region: 'glade', centre: MOONMERE_POOL.centre, radiusX: 9, radiusZ: 6.5, count: 16, scaleMin: 0.75, scaleMax: 1.25, pathClearance: 0, inPool: true },
  { id: 'glade-reeds', kind: 'reed', region: 'glade', centre: MOONMERE_POOL.centre, radiusX: 12.5, radiusZ: 9.5, count: 26, scaleMin: 0.85, scaleMax: 1.25, pathClearance: 1 },
];

function insideMoonmerePool(position: Vec3): boolean {
  const dx = (position.x - MOONMERE_POOL.centre.x) / MOONMERE_POOL.radiusX;
  const dz = (position.z - MOONMERE_POOL.centre.z) / MOONMERE_POOL.radiusZ;
  return dx * dx + dz * dz <= 1;
}

/** Nodes and named places both reject scenery, so nothing buries a gather point. */
const RESERVED_POINTS: readonly { position: Vec3; radius: number }[] = [
  ...Object.values(PLACES).map((position) => ({ position, radius: 3.4 })),
  ...RESOURCE_NODES.map((node) => ({ position: node.position, radius: 1.7 })),
  ...CREATURE_POSTS.map((post) => ({ position: post.home, radius: 2.2 })),
];

function buildProps(): PropInstance[] {
  const props: PropInstance[] = [];

  for (const scatter of SCATTERS) {
    const rng = createRng(hashSeed(`prop:${scatter.id}`));
    const placed: Vec3[] = [];
    // Bigger scenery needs more elbow room than a grass tuft.
    const spacing =
      scatter.kind === 'grassTuft' || scatter.kind === 'flowerTuft' || scatter.kind === 'moonbloom'
        ? 1.1
        : scatter.scaleMax > 1.3
          ? 3.2
          : 1.9;

    for (let i = 0; i < scatter.count; i++) {
      for (let attempt = 0; attempt < 26; attempt++) {
        const angle = rng.range(0, Math.PI * 2);
        const distance = Math.sqrt(rng.next());
        const candidate = vec3(
          scatter.centre.x + Math.cos(angle) * distance * scatter.radiusX,
          0,
          scatter.centre.z + Math.sin(angle) * distance * scatter.radiusZ,
        );

        if (candidate.x < WORLD.minX + 2 || candidate.x > WORLD.maxX - 2) continue;
        if (candidate.z < WORLD.minZ + 2 || candidate.z > WORLD.maxZ - 2) continue;
        if (distanceToAnyPath(candidate) < scatter.pathClearance) continue;
        if (scatter.avoidSafeZones && isInsideSafeZone(candidate, -1.5)) continue;
        if (scatter.hugCreek !== undefined && distanceToCreek(candidate) > scatter.hugCreek) continue;
        if (scatter.hugCreek === undefined && distanceToCreek(candidate) < -0.4) continue;
        if (scatter.inPool && !insideMoonmerePool(candidate)) continue;
        if (!scatter.inPool && scatter.kind !== 'reed' && insideMoonmerePool(candidate)) continue;
        if (
          RESERVED_POINTS.some(
            (reserved) =>
              Math.hypot(
                reserved.position.x - candidate.x,
                reserved.position.z - candidate.z,
              ) < reserved.radius,
          )
        ) {
          continue;
        }
        if (placed.some((p) => Math.hypot(p.x - candidate.x, p.z - candidate.z) < spacing)) {
          continue;
        }

        placed.push(candidate);
        props.push({
          id: `${scatter.id}-${i}`,
          kind: scatter.kind,
          region: scatter.region,
          position: vec3(
            candidate.x,
            scatter.inPool ? -0.12 : groundHeight(candidate.x, candidate.z),
            candidate.z,
          ),
          rotation: rng.range(0, Math.PI * 2),
          scale: rng.range(scatter.scaleMin, scatter.scaleMax),
          variant: rng.int(0, 3),
        });
        break;
      }
    }
  }

  return props;
}

export const PROPS: readonly PropInstance[] = buildProps();

/** Regenerates the scenery. See `rebuildResourceNodes`. */
export function rebuildProps(): PropInstance[] {
  return buildProps();
}

/** Props that physically stop the player, with their collision radius. */
export const BLOCKING_PROP_KINDS: ReadonlySet<PropKind> = new Set<PropKind>([
  'broadleaf',
  'conifer',
  'birch',
  'palePine',
  'boulder',
  'stump',
]);

export const PROP_COLLISION_RADIUS: Partial<Record<PropKind, number>> = {
  broadleaf: 0.78,
  conifer: 0.7,
  birch: 0.52,
  palePine: 0.66,
  boulder: 1.05,
  stump: 0.72,
};
