import { describe, expect, it } from 'vitest';
import {
  BLOCKING_PROP_KINDS,
  CREATURE_POSTS,
  GATES,
  PATHS,
  PLACES,
  PROPS,
  PROP_COLLISION_RADIUS,
  RESOURCE_NODES,
  RESOURCE_NODES_BY_ID,
  rebuildProps,
  rebuildResourceNodes,
  SAFE_ZONES,
  WORLD,
  distanceToAnyPath,
  groundHeight,
  isInsideSafeZone,
  regionAt,
} from '../../src/core/world/layout.ts';
import { GATHERABLE_IDS, type GatherableId, type RegionId } from '../../src/core/types.ts';
import { vec3 } from '../../src/core/vector.ts';

describe('world integrity', () => {
  it('produced a populated world', () => {
    expect(RESOURCE_NODES.length).toBeGreaterThan(60);
    expect(PROPS.length).toBeGreaterThan(600);
    expect(CREATURE_POSTS.length).toBeGreaterThan(5);
  });

  it('gives every node and prop a unique id', () => {
    expect(new Set(RESOURCE_NODES.map((n) => n.id)).size).toBe(RESOURCE_NODES.length);
    expect(new Set(PROPS.map((p) => p.id)).size).toBe(PROPS.length);
    expect(RESOURCE_NODES_BY_ID.size).toBe(RESOURCE_NODES.length);
  });

  it('keeps everything inside the world bounds', () => {
    for (const item of [...RESOURCE_NODES, ...PROPS]) {
      expect(item.position.x).toBeGreaterThanOrEqual(WORLD.minX);
      expect(item.position.x).toBeLessThanOrEqual(WORLD.maxX);
      expect(item.position.z).toBeGreaterThanOrEqual(WORLD.minZ);
      expect(item.position.z).toBeLessThanOrEqual(WORLD.maxZ);
    }
  });

  it('produces no NaN positions', () => {
    for (const item of [...RESOURCE_NODES, ...PROPS]) {
      expect(Number.isFinite(item.position.x)).toBe(true);
      expect(Number.isFinite(item.position.y)).toBe(true);
      expect(Number.isFinite(item.position.z)).toBe(true);
    }
  });

  it('regenerates byte-identically — the world is genuinely deterministic', () => {
    // Not just "the cached array equals itself": this runs the generators a
    // second time and compares every field.
    expect(rebuildResourceNodes()).toEqual([...RESOURCE_NODES]);
    expect(rebuildProps()).toEqual([...PROPS]);
    // And a third run still matches the second, ruling out generator state
    // that only settles after the first call.
    expect(rebuildResourceNodes()).toEqual(rebuildResourceNodes());
  });
});

describe('safe zones hold no hostiles', () => {
  it('places every creature post outside every safe zone', () => {
    for (const post of CREATURE_POSTS) {
      const offenders = SAFE_ZONES.filter((zone) => {
        const distance = Math.hypot(
          post.home.x - zone.centre.x,
          post.home.z - zone.centre.z,
        );
        return distance <= zone.radius;
      });
      expect(
        offenders.map((z) => `${post.id} inside ${z.id}`),
        `${post.id} must not sit in a safe zone`,
      ).toEqual([]);
    }
  });

  it('marks the home, merchant, waking stone and both spires as safe', () => {
    expect(isInsideSafeZone(PLACES.wakingStone)).toBe(true);
    expect(isInsideSafeZone(PLACES.hollowStump)).toBe(true);
    expect(isInsideSafeZone(PLACES.shelterClearing)).toBe(true);
    expect(isInsideSafeZone(PLACES.meadowDawnspire)).toBe(true);
    expect(isInsideSafeZone(PLACES.moonmereDawnspire)).toBe(true);
  });

  it('does not make the guardian ring safe — it is a combat space', () => {
    expect(isInsideSafeZone(PLACES.bramblehornRing)).toBe(false);
  });
});

describe('play lanes stay clear', () => {
  it('keeps large blocking scenery well off the paths', () => {
    const onPath = PROPS.filter(
      (prop) => BLOCKING_PROP_KINDS.has(prop.kind) && distanceToAnyPath(prop.position) < 1.4,
    );
    expect(onPath.map((p) => p.id)).toEqual([]);
  });

  it('keeps gathering nodes off the paths too', () => {
    const onPath = RESOURCE_NODES.filter((node) => distanceToAnyPath(node.position) < 1.2);
    expect(onPath.map((n) => n.id)).toEqual([]);
  });

  it('leaves the centre of the starter route walkable', () => {
    // Sample along the meadow's main route; nothing blocking should be within
    // a body's width of the centre line.
    const route = PATHS.find((p) => p.id === 'crossing-to-spire')!;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const a = route.points[0]!;
      const b = route.points[route.points.length - 1]!;
      const point = vec3(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
      const blocked = PROPS.some((prop) => {
        if (!BLOCKING_PROP_KINDS.has(prop.kind)) return false;
        const radius = (PROP_COLLISION_RADIUS[prop.kind] ?? 0.7) * prop.scale;
        return Math.hypot(prop.position.x - point.x, prop.position.z - point.z) < radius + 0.55;
      });
      expect(blocked, `blocked at t=${t.toFixed(2)}`).toBe(false);
    }
  });

  it('gives every blocking prop kind a collision radius', () => {
    for (const kind of BLOCKING_PROP_KINDS) {
      expect(PROP_COLLISION_RADIUS[kind], `${kind} needs a radius`).toBeGreaterThan(0);
    }
  });
});

describe('resource distribution', () => {
  const countBy = (region: RegionId, resource: GatherableId) =>
    RESOURCE_NODES.filter((n) => n.region === region && n.resource === resource).length;

  it('offers all three families in every region', () => {
    for (const region of ['meadow', 'grove', 'glade'] as RegionId[]) {
      for (const resource of GATHERABLE_IDS) {
        expect(countBy(region, resource), `${region}/${resource}`).toBeGreaterThan(0);
      }
    }
  });

  it('front-loads the meadow so the starter loop is never short', () => {
    const meadow = RESOURCE_NODES.filter((n) => n.region === 'meadow');
    expect(meadow.length).toBeGreaterThanOrEqual(40);
  });

  it('spaces nodes far enough apart to read as a cluster, not a pile', () => {
    for (let i = 0; i < RESOURCE_NODES.length; i++) {
      for (let j = i + 1; j < RESOURCE_NODES.length; j++) {
        const a = RESOURCE_NODES[i]!;
        const b = RESOURCE_NODES[j]!;
        const distance = Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
        expect(distance, `${a.id} vs ${b.id}`).toBeGreaterThan(1.1);
      }
    }
  });

  it('sits every node on the ground', () => {
    for (const node of RESOURCE_NODES) {
      expect(node.position.y).toBeCloseTo(groundHeight(node.position.x, node.position.z), 6);
    }
  });
});

describe('regions and gates', () => {
  it('classifies the named places into the right regions', () => {
    expect(regionAt(PLACES.wakingStone)).toBe('meadow');
    expect(regionAt(PLACES.hollowStump)).toBe('meadow');
    expect(regionAt(PLACES.meadowDawnspire)).toBe('meadow');
    expect(regionAt(PLACES.bramblehornRing)).toBe('grove');
    expect(regionAt(PLACES.moonmereDawnspire)).toBe('glade');
    expect(regionAt(PLACES.moonmereShore)).toBe('glade');
  });

  it('has one gate per region boundary, in route order', () => {
    expect(GATES.map((g) => [g.from, g.to])).toEqual([
      ['meadow', 'grove'],
      ['grove', 'glade'],
    ]);
    for (const gate of GATES) {
      expect(gate.lockedMessage.length).toBeGreaterThan(10);
      expect(gate.halfWidth).toBeGreaterThan(4);
    }
  });
});

describe('terrain', () => {
  it('is smooth — no cliff between neighbouring samples', () => {
    for (let x = WORLD.minX + 1; x < WORLD.maxX - 1; x += 3) {
      for (let z = WORLD.minZ + 1; z < WORLD.maxZ - 1; z += 3) {
        const delta = Math.abs(groundHeight(x, z) - groundHeight(x + 0.5, z + 0.5));
        expect(delta, `step at ${x},${z}`).toBeLessThan(0.6);
      }
    }
  });

  it('flattens the walking routes', () => {
    for (const path of PATHS) {
      for (const point of path.points) {
        expect(Math.abs(groundHeight(point.x, point.z))).toBeLessThan(0.55);
      }
    }
  });
});
