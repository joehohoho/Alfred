import type { BufferGeometry } from 'three';
import type { RegionId } from '../../core/types.ts';
import {
  artRng,
  ball,
  billboardCross,
  combine,
  cone,
  cyl,
  flattenBase,
  groundQuad,
  jitter,
  paint,
  paintGradient,
  stalk,
  transform,
} from './geometry.ts';
import { PALETTES, pickColour } from './palette.ts';

/**
 * Plant life.
 *
 * Each builder returns one finished prototype geometry which is then drawn as
 * an `InstancedMesh`, so a meadow of 150 grass tufts is one draw call. Variety
 * comes from the `variant` parameter and from per-instance scale and rotation,
 * not from unique meshes.
 */

/** A broadleaf tree: a leaning trunk under two or three overlapping canopies. */
export function makeBroadleaf(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`broadleaf-${region}`, variant);
  const palette = PALETTES[region];
  const height = rng.range(2.6, 3.4);
  const parts: BufferGeometry[] = [];

  const trunk = cyl(0.16, 0.28, height, 6);
  trunk.translate(0, height / 2, 0);
  // A slight lean reads as growth rather than a fence post.
  trunk.rotateZ(rng.range(-0.07, 0.07));
  parts.push(paintGradient(trunk, pickColour(palette.bark, variant + 1), pickColour(palette.bark, variant)));

  const canopyCount = 2 + (variant % 2);
  for (let i = 0; i < canopyCount; i++) {
    const radius = rng.range(0.85, 1.25) * (1 - i * 0.14);
    const blob = ball(radius, 1);
    // Squash slightly so canopies read as domed rather than spherical.
    transform(blob, {
      scale: [1.15, 0.82, 1.15],
      position: [rng.range(-0.4, 0.4), height + rng.range(-0.15, 0.5), rng.range(-0.4, 0.4)],
    });
    jitter(blob, 0.09, rng);
    parts.push(
      paintGradient(blob, pickColour(palette.leaf, variant + i + 2), pickColour(palette.leaf, variant + i)),
    );
  }
  return combine(parts);
}

/** A conifer: stacked cones, wider at the bottom. */
export function makeConifer(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`conifer-${region}`, variant);
  const palette = PALETTES[region];
  const height = rng.range(3.4, 4.6);
  const parts: BufferGeometry[] = [];

  const trunk = cyl(0.12, 0.2, height * 0.42, 5);
  trunk.translate(0, height * 0.21, 0);
  parts.push(paint(trunk, pickColour(palette.bark, variant)));

  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const skirt = cone(rng.range(0.95, 1.2) * (1 - t * 0.42), height * 0.42, 7);
    skirt.translate(0, height * (0.32 + t * 0.26), 0);
    skirt.rotateY(rng.range(0, Math.PI));
    jitter(skirt, 0.05, rng);
    parts.push(
      paintGradient(skirt, pickColour(palette.leaf, variant + i + 1), pickColour(palette.leaf, variant + i)),
    );
  }
  return combine(parts);
}

/** A birch: a pale slender trunk with a light, airy crown. */
export function makeBirch(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`birch-${region}`, variant);
  const palette = PALETTES[region];
  const height = rng.range(3.2, 4.1);
  const parts: BufferGeometry[] = [];

  const trunk = cyl(0.09, 0.14, height, 5);
  trunk.translate(0, height / 2, 0);
  trunk.rotateZ(rng.range(-0.05, 0.05));
  parts.push(paintGradient(trunk, 0xd8cfc0, 0xf0ece2));

  // A couple of dark bark scars, the detail that says "birch" at a glance.
  for (let i = 0; i < 3; i++) {
    const scar = cyl(0.1, 0.1, 0.09, 5);
    scar.translate(0, rng.range(height * 0.25, height * 0.8), 0);
    parts.push(paint(scar, 0x6b6a63));
  }

  // The crown starts around two thirds of the way up and overlaps itself; a
  // canopy perched only at the very tip reads as a pole with a ball on it.
  for (let i = 0; i < 4; i++) {
    const blob = ball(rng.range(0.62, 0.95), 1);
    transform(blob, {
      scale: [1.15, 0.78, 1.15],
      position: [rng.range(-0.55, 0.55), height * rng.range(0.66, 0.98), rng.range(-0.55, 0.55)],
    });
    jitter(blob, 0.08, rng);
    parts.push(paintGradient(blob, pickColour(palette.leaf, variant + i), pickColour(palette.bloom, variant)));
  }
  return combine(parts);
}

/** The glade's pale pine: silver trunk, cool blue-violet needles. */
export function makePalePine(variant: number): BufferGeometry {
  const rng = artRng('pale-pine', variant);
  const palette = PALETTES.glade;
  const height = rng.range(4, 5.4);
  const parts: BufferGeometry[] = [];

  const trunk = cyl(0.1, 0.19, height * 0.62, 5);
  trunk.translate(0, height * 0.31, 0);
  parts.push(paintGradient(trunk, 0x6f7590, 0xb8bdd4));

  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const skirt = cone(rng.range(0.72, 0.95) * (1 - t * 0.34), height * 0.36, 6);
    skirt.translate(0, height * (0.5 + t * 0.22), 0);
    skirt.rotateY(rng.range(0, Math.PI));
    jitter(skirt, 0.05, rng);
    // Only the cool half of the glade's bloom list — the warm accent in there
    // is for moonblooms, and on a pine canopy it reads as a dead tree.
    parts.push(
      paintGradient(skirt, pickColour(palette.leaf, variant + i), pickColour(palette.leaf, variant + i + 2)),
    );
  }
  return combine(parts);
}

/** A low rounded shrub. Three overlapping lumps. */
export function makeShrub(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`shrub-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const lump = ball(rng.range(0.34, 0.5), 0);
    transform(lump, {
      scale: [1.2, 0.82, 1.2],
      position: [rng.range(-0.3, 0.3), rng.range(0.24, 0.42), rng.range(-0.3, 0.3)],
    });
    jitter(lump, 0.07, rng);
    parts.push(
      paintGradient(lump, pickColour(palette.leaf, variant + i + 1), pickColour(palette.leaf, variant + i)),
    );
  }
  const merged = combine(parts);
  return flattenBase(merged, 0.06);
}

/** A fern: a fan of arching fronds. */
export function makeFern(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`fern-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  const fronds = 5;
  for (let i = 0; i < fronds; i++) {
    const frond = stalk(rng.range(0.5, 0.75), 0.22, rng.range(0.18, 0.3), 3);
    frond.rotateX(rng.range(0.25, 0.5));
    frond.rotateY((i / fronds) * Math.PI * 2 + rng.range(-0.2, 0.2));
    parts.push(paintGradient(frond, pickColour(palette.leaf, variant + 2), pickColour(palette.leaf, variant)));
  }
  return combine(parts);
}

/** A tuft of grass: a handful of thin blades. */
export function makeGrassTuft(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`grass-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  const blades = 5 + (variant % 3);
  for (let i = 0; i < blades; i++) {
    const blade = stalk(rng.range(0.34, 0.62), 0.13, rng.range(-0.18, 0.18), 2);
    blade.rotateY(rng.range(0, Math.PI * 2));
    blade.translate(rng.range(-0.14, 0.14), 0, rng.range(-0.14, 0.14));
    parts.push(paintGradient(blade, pickColour(palette.turf, variant + 2), pickColour(palette.leaf, variant)));
  }
  return combine(parts);
}

/** A clutch of small flowers on stems. */
export function makeFlowerTuft(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`flower-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  const count = 3 + (variant % 3);
  for (let i = 0; i < count; i++) {
    const height = rng.range(0.24, 0.4);
    const stem = stalk(height, 0.045, rng.range(-0.06, 0.06), 2);
    stem.translate(rng.range(-0.13, 0.13), 0, rng.range(-0.13, 0.13));
    const stemGeometry = paint(stem, pickColour(palette.turf, variant + 1));
    parts.push(stemGeometry);

    const head = ball(rng.range(0.07, 0.1), 0);
    const x = stem.getAttribute('position').getX(0);
    const z = stem.getAttribute('position').getZ(0);
    head.translate(x, height, z);
    parts.push(paint(head, pickColour(palette.bloom, variant + i)));
  }
  return combine(parts);
}

/** The glade's moonbloom: a pale six-petal star with a glowing centre. */
export function makeMoonbloom(variant: number): BufferGeometry {
  const rng = artRng('moonbloom', variant);
  const palette = PALETTES.glade;
  const parts: BufferGeometry[] = [];
  const height = rng.range(0.3, 0.46);

  const stem = stalk(height, 0.05, 0.03, 2);
  parts.push(paint(stem, 0x51739a));

  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const petal = stalk(0.16, 0.11, 0.05, 1);
    petal.rotateX(Math.PI / 2.3);
    petal.rotateY((i / petals) * Math.PI * 2);
    petal.translate(0, height, 0);
    parts.push(paintGradient(petal, pickColour(palette.bloom, variant + i), 0xf2ecff));
  }

  const centre = ball(0.055, 0);
  centre.translate(0, height + 0.02, 0);
  parts.push(paint(centre, palette.glow));
  return combine(parts);
}

/** A reed clump for creek and pool edges. */
export function makeReed(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`reed-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 4 + (variant % 3); i++) {
    const height = rng.range(0.6, 1.05);
    const shaft = stalk(height, 0.12, rng.range(-0.12, 0.12), 3);
    shaft.rotateY(rng.range(0, Math.PI * 2));
    shaft.translate(rng.range(-0.16, 0.16), 0, rng.range(-0.16, 0.16));
    parts.push(paintGradient(shaft, pickColour(palette.leaf, variant), 0xdcc98a));

    if (i % 2 === 0) {
      const head = cyl(0.035, 0.045, 0.16, 5);
      head.translate(0, height + 0.05, 0);
      parts.push(paint(head, 0x8a6c3f));
    }
  }
  return combine(parts);
}

/** A lily pad floating on the Moonmere. */
export function makeLilypad(variant: number): BufferGeometry {
  const rng = artRng('lilypad', variant);
  const pad = groundQuad(rng.range(0.5, 0.8), rng.range(0.5, 0.8), 1, 1);
  pad.rotateY(rng.range(0, Math.PI));
  const parts = [paint(pad, 0x7fae9c)];
  if (variant % 2 === 0) {
    const bud = ball(0.09, 0);
    bud.translate(rng.range(-0.15, 0.15), 0.08, rng.range(-0.15, 0.15));
    parts.push(paint(bud, 0xe0d0ff));
  }
  return combine(parts);
}

/** A little mushroom cluster. */
export function makeMushroom(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`mushroom-${region}`, variant);
  const palette = PALETTES[region];
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 2 + (variant % 2); i++) {
    const height = rng.range(0.12, 0.22);
    const x = rng.range(-0.13, 0.13);
    const z = rng.range(-0.13, 0.13);

    const stem = cyl(0.035, 0.05, height, 5);
    stem.translate(x, height / 2, z);
    parts.push(paint(stem, 0xf0e4cf));

    const cap = ball(rng.range(0.09, 0.13), 0);
    transform(cap, { scale: [1, 0.66, 1], position: [x, height, z] });
    parts.push(paintGradient(cap, pickColour(palette.bloom, variant + i), 0xffe9c2));
  }
  return combine(parts);
}

/** A fallen log. */
export function makeLog(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`log-${region}`, variant);
  const palette = PALETTES[region];
  const length = rng.range(1.6, 2.6);
  const trunk = cyl(0.22, 0.26, length, 7);
  trunk.rotateZ(Math.PI / 2);
  trunk.rotateY(rng.range(0, Math.PI));
  trunk.translate(0, 0.24, 0);
  const parts = [paintGradient(trunk, pickColour(palette.bark, variant + 1), pickColour(palette.bark, variant))];

  // A little moss on the upper side.
  const moss = ball(0.2, 0);
  transform(moss, { scale: [length * 0.28, 0.14, 0.7], position: [rng.range(-0.4, 0.4), 0.4, 0] });
  parts.push(paint(moss, pickColour(palette.leaf, variant)));
  return combine(parts);
}

/** A cut stump with a pale ring top. */
export function makeStump(region: RegionId, variant: number): BufferGeometry {
  const rng = artRng(`stump-${region}`, variant);
  const palette = PALETTES[region];
  const height = rng.range(0.42, 0.66);
  const body = cyl(0.34, 0.42, height, 7);
  body.translate(0, height / 2, 0);
  const parts = [paintGradient(body, pickColour(palette.bark, variant + 1), pickColour(palette.bark, variant))];

  const top = cyl(0.33, 0.33, 0.05, 7);
  top.translate(0, height, 0);
  parts.push(paint(top, 0xdcc39a));

  if (variant % 2 === 0) {
    const sprout = billboardCross(0.34, 0.3);
    sprout.translate(rng.range(-0.15, 0.15), height, rng.range(-0.15, 0.15));
    parts.push(paint(sprout, pickColour(palette.leaf, variant)));
  }
  return combine(parts);
}
