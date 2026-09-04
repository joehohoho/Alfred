import type { BufferGeometry } from 'three';
import type { RegionId } from '../../core/types.ts';
import {
  artRng,
  ball,
  combine,
  cone,
  flattenBase,
  jitter,
  paint,
  paintGradient,
  transform,
} from './geometry.ts';
import { PALETTES, pickColour } from './palette.ts';

/**
 * Stone.
 *
 * A rock is an icosahedron that has been squashed, jittered, and had its base
 * flattened so it sits on the ground rather than floating or intersecting. The
 * flattening is the part that matters: an un-flattened ball reads as a marble
 * dropped on the lawn.
 */

export function makeRock(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`rock-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  const lumps = 1 + (variant % 3);

  for (let i = 0; i < lumps; i++) {
    const lump = ball(rng.range(0.22, 0.38), 0);
    transform(lump, {
      scale: [rng.range(1, 1.5), rng.range(0.55, 0.85), rng.range(1, 1.4)],
      position: [rng.range(-0.22, 0.22), rng.range(0.1, 0.2), rng.range(-0.22, 0.22)],
      rotation: [0, rng.range(0, Math.PI), 0],
    });
    jitter(lump, 0.06, rng);
    parts.push(
      paintGradient(lump, pickColour(palette.stone, variant + i + 1), pickColour(palette.stone, variant + i)),
    );
  }
  return flattenBase(combine(parts), 0.08);
}

/** A boulder — big enough to block, so it also reads as a landmark. */
export function makeBoulder(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`boulder-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];

  const body = ball(rng.range(0.85, 1.15), 1);
  transform(body, {
    scale: [rng.range(1, 1.3), rng.range(0.7, 0.95), rng.range(1, 1.25)],
    position: [0, rng.range(0.45, 0.6), 0],
    rotation: [0, rng.range(0, Math.PI), 0],
  });
  jitter(body, 0.11, rng);
  parts.push(paintGradient(body, pickColour(palette.stone, variant + 1), pickColour(palette.stone, variant)));

  // A cap of moss on top, which is what makes a grey lump feel inhabited.
  if (region !== 'glade') {
    const moss = ball(rng.range(0.5, 0.72), 0);
    transform(moss, {
      scale: [1.1, 0.28, 1.1],
      position: [rng.range(-0.2, 0.2), rng.range(0.95, 1.15), rng.range(-0.2, 0.2)],
    });
    jitter(moss, 0.05, rng);
    parts.push(paint(moss, pickColour(palette.leaf, variant)));
  }
  return flattenBase(combine(parts), 0.12);
}

/** A quartz shard, glade only. Angular, cool, faintly luminous at the tip. */
export function makeCrystalShard(variant: number): BufferGeometry {
  const rng = artRng('crystal', variant);
  const palette = PALETTES.glade;
  const parts: BufferGeometry[] = [];
  const shards = 2 + (variant % 2);

  for (let i = 0; i < shards; i++) {
    const height = rng.range(0.5, 1.05);
    const shard = cone(rng.range(0.12, 0.2), height, 5);
    transform(shard, {
      position: [rng.range(-0.22, 0.22), height / 2, rng.range(-0.22, 0.22)],
      rotation: [rng.range(-0.22, 0.22), rng.range(0, Math.PI), rng.range(-0.22, 0.22)],
    });
    parts.push(paintGradient(shard, 0x5f6d9c, palette.glow));
  }

  const base = ball(0.26, 0);
  transform(base, { scale: [1.3, 0.42, 1.3], position: [0, 0.09, 0] });
  jitter(base, 0.05, rng);
  parts.push(paint(base, pickColour(palette.stone, variant)));
  return flattenBase(combine(parts), 0.06);
}
