import {
  Color,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  type BufferGeometry,
} from 'three';
import type { GatherableId, RegionId } from '../core/types.ts';
import {
  CREATURE_POSTS,
  GATES,
  PLACES,
  PROPS,
  RESOURCE_NODES,
  groundHeight,
  type PropInstance,
  type PropKind,
} from '../core/world/layout.ts';
import { createRng } from '../core/rng.ts';
import { makeResourceNode } from './art/nodes.ts';
import { makeCrystalShard, makeBoulder, makeRock } from './art/rocks.ts';
import {
  makeBirch,
  makeBroadleaf,
  makeConifer,
  makeFern,
  makeFlowerTuft,
  makeGrassTuft,
  makeLilypad,
  makeLog,
  makeMoonbloom,
  makeMushroom,
  makePalePine,
  makeReed,
  makeShrub,
  makeStump,
} from './art/foliage.ts';
import {
  makeBrambleGate,
  makeDawnspire,
  makeHearthFire,
  makeHearthnest,
  makeHollowStump,
  makeMistveil,
  makeShelterSite,
  makeWakingStone,
} from './art/structures.ts';
import { buildCreekGeometry, buildPoolGeometry, buildTerrainGeometry } from './art/terrain.ts';
import type { MaterialSet } from './art/materials.ts';

/**
 * Builds the visible world from the authored layout.
 *
 * The performance strategy in one line: **scenery is instanced, state-carrying
 * objects are not.** A hundred and fifty grass tufts are one draw call because
 * they never change; a gathering node is its own mesh because it has to swap
 * between full and spent, and 72 extra draw calls is a price worth paying for
 * that to be instant.
 */

/**
 * How many distinct geometries each prop kind gets.
 *
 * Trees earn three, because a repeated canopy arrangement is obvious on a
 * large silhouette. Ground cover gets one and takes its variety from
 * per-instance rotation, scale and colour tint, which is free.
 */
const PROTOTYPE_VARIANTS: Partial<Record<PropKind, number>> = {
  broadleaf: 3,
  conifer: 3,
  birch: 3,
  palePine: 3,
};

function buildPrototype(kind: PropKind, region: RegionId, variant: number): BufferGeometry {
  switch (kind) {
    case 'broadleaf':
      return makeBroadleaf(region, variant);
    case 'conifer':
      return makeConifer(region, variant);
    case 'birch':
      return makeBirch(region, variant);
    case 'palePine':
      return makePalePine(variant);
    case 'shrub':
      return makeShrub(region, variant);
    case 'fern':
      return makeFern(region, variant);
    case 'grassTuft':
      return makeGrassTuft(region, variant);
    case 'flowerTuft':
      return makeFlowerTuft(region, variant);
    case 'moonbloom':
      return makeMoonbloom(variant);
    case 'reed':
      return makeReed(region, variant);
    case 'lilypad':
      return makeLilypad(variant);
    case 'mushroom':
      return makeMushroom(region, variant);
    case 'rock':
      return makeRock(region, variant);
    case 'boulder':
      return makeBoulder(region, variant);
    case 'crystalShard':
      return makeCrystalShard(variant);
    case 'log':
      return makeLog(region, variant);
    case 'stump':
      return makeStump(region, variant);
    case 'thornArch':
      return makeShrub(region, variant);
  }
}

/** Prop kinds drawn with the wind-swaying material. */
const SWAYING: ReadonlySet<PropKind> = new Set<PropKind>([
  'shrub',
  'fern',
  'grassTuft',
  'flowerTuft',
  'moonbloom',
  'reed',
]);

/** Prop kinds that are foliage cards rather than solid volumes. */
const BLADE_LIKE: ReadonlySet<PropKind> = new Set<PropKind>(['grassTuft', 'fern', 'reed']);

export interface ResourceNodeView {
  id: string;
  resource: GatherableId;
  full: Mesh;
  spent: Mesh;
  /** Anchor for the interact prompt and the gather particles. */
  anchorY: number;
}

export interface WorldView {
  root: Group;
  /** Everything that never changes. Kept separate so it can be frustum-culled as a unit. */
  scenery: Group;
  nodes: Map<string, ResourceNodeView>;
  spires: Record<'meadow-dawnspire' | 'moonmere-dawnspire', { dormant: Group; restored: Group }>;
  brambleGate: { closed: Group; open: Group };
  mistveil: Group;
  hearthnest: { site: Group; built: Group; fire: Mesh };
  hollowStump: Group;
  wakingStone: Group;
  waterMeshes: Mesh[];
  dispose(): void;
}

interface PropGroup {
  kind: PropKind;
  region: RegionId;
  variant: number;
  instances: PropInstance[];
}

function groupProps(): PropGroup[] {
  const groups = new Map<string, PropGroup>();
  for (const prop of PROPS) {
    const variantCount = PROTOTYPE_VARIANTS[prop.kind] ?? 1;
    const variant = prop.variant % variantCount;
    const key = `${prop.kind}|${prop.region}|${variant}`;
    let group = groups.get(key);
    if (!group) {
      group = { kind: prop.kind, region: prop.region, variant, instances: [] };
      groups.set(key, group);
    }
    group.instances.push(prop);
  }
  return [...groups.values()];
}

const dummy = new Object3D();
const tintColour = new Color();

export function buildWorldView(materials: MaterialSet): WorldView {
  const root = new Group();
  root.name = 'wispmere-world';
  const scenery = new Group();
  scenery.name = 'scenery';
  root.add(scenery);

  const disposables: BufferGeometry[] = [];
  const waterMeshes: Mesh[] = [];

  // --- Ground and water ----------------------------------------------------
  const terrainGeometry = buildTerrainGeometry();
  disposables.push(terrainGeometry);
  const terrain = new Mesh(terrainGeometry, materials.solid);
  terrain.name = 'terrain';
  terrain.receiveShadow = true;
  scenery.add(terrain);

  const creekGeometry = buildCreekGeometry();
  disposables.push(creekGeometry);
  const creek = new Mesh(creekGeometry, materials.water);
  creek.name = 'creek';
  scenery.add(creek);
  waterMeshes.push(creek);

  const poolGeometry = buildPoolGeometry();
  disposables.push(poolGeometry);
  const pool = new Mesh(poolGeometry, materials.water);
  pool.name = 'moonmere-pool';
  scenery.add(pool);
  waterMeshes.push(pool);

  // --- Instanced scenery ---------------------------------------------------
  for (const group of groupProps()) {
    const geometry = buildPrototype(group.kind, group.region, group.variant);
    disposables.push(geometry);
    const material = SWAYING.has(group.kind)
      ? BLADE_LIKE.has(group.kind)
        ? materials.blade
        : materials.foliage
      : materials.solid;

    const instanced = new InstancedMesh(geometry, material, group.instances.length);
    instanced.name = `${group.kind}-${group.region}-${group.variant}`;
    // A seeded tint per group keeps the variation deterministic.
    const rng = createRng(instanced.name.length * 7919 + group.variant * 104729);

    group.instances.forEach((prop, index) => {
      dummy.position.set(prop.position.x, prop.position.y, prop.position.z);
      dummy.rotation.set(0, prop.rotation, 0);
      dummy.scale.setScalar(prop.scale);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);

      // Per-instance value shift: no two bushes are quite the same green.
      const shift = rng.range(-0.09, 0.09);
      tintColour.setRGB(1, 1, 1).offsetHSL(rng.range(-0.012, 0.012), 0, shift);
      instanced.setColorAt(index, tintColour);
    });

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.frustumCulled = false;
    scenery.add(instanced);
  }

  // --- Gathering nodes -----------------------------------------------------
  // Prototypes are shared by (resource, region, variant, state); only the Mesh
  // wrappers are per-node, so 72 nodes cost 18 geometries.
  const nodePrototypes = new Map<string, BufferGeometry>();
  const nodeGeometry = (
    resource: GatherableId,
    region: RegionId,
    variant: number,
    spent: boolean,
  ): BufferGeometry => {
    const key = `${resource}|${region}|${variant}|${spent}`;
    let geometry = nodePrototypes.get(key);
    if (!geometry) {
      geometry = makeResourceNode(resource, region, variant, spent);
      nodePrototypes.set(key, geometry);
      disposables.push(geometry);
    }
    return geometry;
  };

  const nodesGroup = new Group();
  nodesGroup.name = 'resource-nodes';
  root.add(nodesGroup);

  const nodes = new Map<string, ResourceNodeView>();
  for (const def of RESOURCE_NODES) {
    const full = new Mesh(nodeGeometry(def.resource, def.region, def.variant, false), materials.solid);
    const spent = new Mesh(nodeGeometry(def.resource, def.region, def.variant, true), materials.solid);
    for (const node of [full, spent]) {
      node.position.set(def.position.x, def.position.y, def.position.z);
      node.rotation.y = def.rotation;
      node.scale.setScalar(def.scale);
      nodesGroup.add(node);
    }
    spent.visible = false;
    nodes.set(def.id, { id: def.id, resource: def.resource, full, spent, anchorY: 0.85 * def.scale });
  }

  // --- Structures ----------------------------------------------------------
  const structures = new Group();
  structures.name = 'structures';
  root.add(structures);

  const place = (geometry: BufferGeometry, x: number, z: number, rotation = 0): Group => {
    disposables.push(geometry);
    const group = new Group();
    group.add(new Mesh(geometry, materials.solid));
    group.position.set(x, groundHeight(x, z), z);
    group.rotation.y = rotation;
    structures.add(group);
    return group;
  };

  const wakingStone = place(makeWakingStone(), PLACES.wakingStone.x, PLACES.wakingStone.z);
  const hollowStump = place(
    makeHollowStump(),
    PLACES.hollowStump.x,
    PLACES.hollowStump.z,
    Math.PI * 0.15,
  );

  const shelterSite = place(makeShelterSite(), PLACES.shelterClearing.x, PLACES.shelterClearing.z);
  const hearthnestBuilt = place(
    makeHearthnest(),
    PLACES.shelterClearing.x,
    PLACES.shelterClearing.z,
    -0.3,
  );
  hearthnestBuilt.visible = false;

  const fireGeometry = makeHearthFire(true);
  disposables.push(fireGeometry);
  const fire = new Mesh(fireGeometry, materials.solid);
  fire.position.set(
    PLACES.shelterClearing.x + 2.6,
    groundHeight(PLACES.shelterClearing.x + 2.6, PLACES.shelterClearing.z + 1.4),
    PLACES.shelterClearing.z + 1.4,
  );
  fire.visible = false;
  structures.add(fire);

  const spires = {
    'meadow-dawnspire': {
      dormant: place(makeDawnspire(false), PLACES.meadowDawnspire.x, PLACES.meadowDawnspire.z),
      restored: place(makeDawnspire(true), PLACES.meadowDawnspire.x, PLACES.meadowDawnspire.z),
    },
    'moonmere-dawnspire': {
      dormant: place(makeDawnspire(false), PLACES.moonmereDawnspire.x, PLACES.moonmereDawnspire.z),
      restored: place(makeDawnspire(true), PLACES.moonmereDawnspire.x, PLACES.moonmereDawnspire.z),
    },
  } as const;
  spires['meadow-dawnspire'].restored.visible = false;
  spires['moonmere-dawnspire'].restored.visible = false;

  const gateDef = GATES[0]!;
  const brambleGate = {
    closed: place(makeBrambleGate(false), gateDef.position.x, gateDef.position.z, gateDef.facing),
    open: place(makeBrambleGate(true), gateDef.position.x, gateDef.position.z, gateDef.facing),
  };
  brambleGate.open.visible = false;

  const veilDef = GATES[1]!;
  const veilGeometry = makeMistveil();
  disposables.push(veilGeometry);
  const mistveil = new Group();
  mistveil.add(new Mesh(veilGeometry, materials.glow));
  mistveil.position.set(veilDef.position.x, groundHeight(veilDef.position.x, veilDef.position.z), veilDef.position.z);
  mistveil.rotation.y = veilDef.facing;
  structures.add(mistveil);

  return {
    root,
    scenery,
    nodes,
    spires,
    brambleGate,
    mistveil,
    hearthnest: { site: shelterSite, built: hearthnestBuilt, fire },
    hollowStump,
    wakingStone,
    waterMeshes,
    dispose() {
      for (const geometry of disposables) geometry.dispose();
      root.clear();
    },
  };
}

/** Where each creature post sits, resolved to ground height. */
export function creaturePostPositions(): Map<string, { x: number; y: number; z: number }> {
  return new Map(
    CREATURE_POSTS.map((post) => [
      post.id,
      { x: post.home.x, y: groundHeight(post.home.x, post.home.z), z: post.home.z },
    ]),
  );
}
