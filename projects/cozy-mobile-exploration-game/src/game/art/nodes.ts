import type { BufferGeometry } from 'three';
import type { GatherableId, RegionId } from '../../core/types.ts';
import {
  artRng,
  ball,
  combine,
  cyl,
  flattenBase,
  jitter,
  paint,
  paintGradient,
  ring,
  stalk,
  transform,
} from './geometry.ts';
import { PALETTES, pickColour } from './palette.ts';

/**
 * Gathering nodes.
 *
 * Every node has two prototypes — **full** and **spent** — and the game swaps
 * between them. That is how a depleted node "visibly communicates that it is
 * unavailable", as the brief requires: the sunpetal bush loses its blooms, the
 * boughwood pile loses its branches, the riverstone loses its top pebbles.
 * A renewal countdown is shown separately by the HUD.
 */

function makeSunpetalNode(region: RegionId, variant: number, spent: boolean): BufferGeometry {
  const rng = artRng(`node-sunpetal-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];

  // The bush itself stays put whether or not it has bloomed.
  for (let i = 0; i < 3; i++) {
    const lump = ball(rng.range(0.26, 0.38), 0);
    transform(lump, {
      scale: [1.2, 0.8, 1.2],
      position: [rng.range(-0.24, 0.24), rng.range(0.2, 0.34), rng.range(-0.24, 0.24)],
    });
    jitter(lump, 0.06, rng);
    parts.push(
      paintGradient(
        lump,
        pickColour(palette.leaf, variant + i + 1),
        // Spent bushes go a shade duller, so the state reads even at distance
        // and even for a player who cannot distinguish the bloom colours.
        spent ? pickColour(palette.turf, variant + 3) : pickColour(palette.leaf, variant + i),
      ),
    );
  }

  if (!spent) {
    for (let i = 0; i < 5; i++) {
      const height = rng.range(0.52, 0.78);
      const x = rng.range(-0.26, 0.26);
      const z = rng.range(-0.26, 0.26);
      const stem = stalk(height, 0.04, 0.04, 2);
      stem.translate(x, 0.12, z);
      parts.push(paint(stem, pickColour(palette.turf, variant)));

      // Deliberately oversized relative to a wild flower tuft. A gather point
      // that reads as ordinary scenery is a gather point nobody walks to.
      const bloom = ball(rng.range(0.13, 0.18), 0);
      transform(bloom, { scale: [1.25, 0.72, 1.25], position: [x, 0.12 + height, z] });
      parts.push(paintGradient(bloom, pickColour(palette.bloom, variant + i), 0xfff8e4));
      const heart = ball(0.06, 0);
      heart.translate(x, 0.16 + height, z);
      parts.push(paint(heart, 0xfff3c8));
    }
  } else {
    // Bare stems left behind — the shape of what will come back.
    for (let i = 0; i < 3; i++) {
      const stem = stalk(rng.range(0.2, 0.3), 0.035, 0.02, 2);
      stem.translate(rng.range(-0.22, 0.22), 0.12, rng.range(-0.22, 0.22));
      parts.push(paint(stem, pickColour(palette.turf, variant + 2)));
    }
  }
  return flattenBase(combine(parts), 0.06);
}

function makeBoughwoodNode(region: RegionId, variant: number, spent: boolean): BufferGeometry {
  const rng = artRng(`node-boughwood-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];

  // A low stump base that stays behind when the branches are taken.
  const base = cyl(0.26, 0.32, 0.26, 6);
  base.translate(0, 0.13, 0);
  parts.push(paintGradient(base, pickColour(palette.bark, variant + 1), pickColour(palette.bark, variant)));

  const branchCount = spent ? 1 : 5;
  for (let i = 0; i < branchCount; i++) {
    const length = rng.range(0.7, 1.25);
    const branch = cyl(0.06, 0.09, length, 5);
    transform(branch, {
      rotation: [Math.PI / 2 - rng.range(0.05, 0.45), rng.range(0, Math.PI * 2), 0],
      position: [rng.range(-0.2, 0.2), rng.range(0.16, 0.34), rng.range(-0.2, 0.2)],
    });
    parts.push(paint(branch, pickColour(palette.bark, variant + i)));
  }

  if (!spent) {
    for (let i = 0; i < 3; i++) {
      const leaves = ball(rng.range(0.16, 0.22), 0);
      transform(leaves, {
        scale: [1.2, 0.7, 1.2],
        position: [rng.range(-0.4, 0.4), rng.range(0.36, 0.52), rng.range(-0.4, 0.4)],
      });
      parts.push(paint(leaves, pickColour(palette.leaf, variant + i)));
    }
  }
  return flattenBase(combine(parts), 0.06);
}

function makeRiverstoneNode(region: RegionId, variant: number, spent: boolean): BufferGeometry {
  const rng = artRng(`node-riverstone-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];

  // A shallow bed of embedded pebbles — always present.
  for (let i = 0; i < 4; i++) {
    const pebble = ball(rng.range(0.14, 0.22), 0);
    transform(pebble, {
      scale: [1.3, 0.5, 1.2],
      position: [rng.range(-0.3, 0.3), rng.range(0.05, 0.11), rng.range(-0.3, 0.3)],
      rotation: [0, rng.range(0, Math.PI), 0],
    });
    jitter(pebble, 0.03, rng);
    parts.push(paintGradient(pebble, pickColour(palette.stone, variant + i + 1), pickColour(palette.stone, variant + i)));
  }

  if (!spent) {
    // The loose pebbles on top are what the player actually takes.
    for (let i = 0; i < 4; i++) {
      const pebble = ball(rng.range(0.17, 0.25), 0);
      transform(pebble, {
        scale: [1.2, 0.8, 1.15],
        position: [rng.range(-0.24, 0.24), rng.range(0.24, 0.46), rng.range(-0.24, 0.24)],
        rotation: [rng.range(0, 1), rng.range(0, Math.PI), 0],
      });
      jitter(pebble, 0.03, rng);
      parts.push(paintGradient(pebble, 0xeef3f8, pickColour(palette.stone, variant + i)));
    }
  } else {
    // An empty hollow where they were.
    const hollow = ring(0.24, 0.05, 4, 10);
    hollow.rotateX(Math.PI / 2);
    hollow.translate(0, 0.05, 0);
    parts.push(paint(hollow, pickColour(palette.stone, variant + 2)));
  }
  return flattenBase(combine(parts), 0.04);
}

export function makeResourceNode(
  resource: GatherableId,
  region: RegionId,
  variant: number,
  spent: boolean,
): BufferGeometry {
  switch (resource) {
    case 'sunpetal':
      return makeSunpetalNode(region, variant, spent);
    case 'boughwood':
      return makeBoughwoodNode(region, variant, spent);
    case 'riverstone':
      return makeRiverstoneNode(region, variant, spent);
  }
}

/**
 * The mote that flies from a node to the player on a successful gather, and the
 * shape used for the Glimmercore drop.
 */
export function makePickupMote(): BufferGeometry {
  return ball(0.13, 0);
}

export function makeGlimmercore(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const core = ball(0.17, 1);
  parts.push(paint(core, 0x8ff0dc));
  const halo = ring(0.26, 0.035, 4, 12);
  halo.rotateX(Math.PI / 2.6);
  parts.push(paint(halo, 0xd8fff5));
  return combine(parts);
}
