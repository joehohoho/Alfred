import type { BufferGeometry } from 'three';
import {
  artRng,
  ball,
  box,
  combine,
  cone,
  cyl,
  flattenBase,
  groundQuad,
  jitter,
  paint,
  paintGradient,
  ring,
  stalk,
  transform,
} from './geometry.ts';
import { COLOURS, PALETTES } from './palette.ts';

/**
 * Built things and landmarks.
 *
 * These are the readability anchors of the world: the player should be able to
 * tell the Hollow Stump from the Hearthnest from a Dawnspire at a glance, from
 * across the meadow, at phone scale. So each one has a distinct **silhouette**
 * — a low wide dome, a peaked cottage, a tall thin spire — rather than relying
 * on colour or detail that vanishes at distance.
 */

/** Ossa's workshop: a huge hollowed stump with an awning and a counter. */
export function makeHollowStump(): BufferGeometry {
  const rng = artRng('hollow-stump');
  const parts: BufferGeometry[] = [];

  const trunk = cyl(1.5, 1.85, 2.3, 9);
  trunk.translate(0, 1.15, 0);
  jitter(trunk, 0.05, rng);
  parts.push(paintGradient(trunk, COLOURS.stumpWood, 0xc99a68));

  // The doorway: a shallow arch cut into the front face rather than a second
  // cylinder poking through the sides, which read as a pair of angry slits.
  const doorway = cyl(0.72, 0.72, 0.5, 10);
  transform(doorway, { rotation: [Math.PI / 2, 0, 0], position: [0, 1.35, 1.35] });
  parts.push(paint(doorway, 0x5f4028));
  const doorBase = box(1.3, 0.85, 0.5);
  doorBase.translate(0, 0.95, 1.35);
  parts.push(paint(doorBase, 0x5f4028));
  const lamp = ball(0.16, 0);
  lamp.translate(0.62, 1.75, 1.5);
  parts.push(paint(lamp, 0xffd98a));

  const counter = box(2.1, 0.18, 0.6);
  counter.translate(0, 1.0, 1.35);
  parts.push(paint(counter, COLOURS.stumpInner));

  // A leaf awning over the counter.
  const awning = cone(1.9, 0.75, 8);
  transform(awning, { scale: [1, 0.6, 1], position: [0, 2.5, 0.25] });
  parts.push(paintGradient(awning, COLOURS.stumpAwning, 0x7fae8a));

  // Toadstool cap on top, so it reads as "friendly workshop" from far away.
  const cap = ball(0.85, 1);
  transform(cap, { scale: [1.25, 0.55, 1.25], position: [0.35, 2.95, -0.3] });
  parts.push(paintGradient(cap, 0xe08a6a, 0xf5b48c));

  for (let i = 0; i < 5; i++) {
    const root = cyl(0.14, 0.24, 0.9, 5);
    transform(root, {
      rotation: [1.1, (i / 5) * Math.PI * 2, 0],
      position: [Math.sin((i / 5) * Math.PI * 2) * 1.5, 0.28, Math.cos((i / 5) * Math.PI * 2) * 1.5],
    });
    parts.push(paint(root, 0x8a6440));
  }
  return flattenBase(combine(parts), 0.1);
}

/**
 * The empty clearing before the shelter is built: pegs, a rope outline and a
 * stack of nothing. It has to read as "a place for something", not as debris.
 */
export function makeShelterSite(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  const outline = ring(1.9, 0.05, 4, 16);
  outline.rotateX(Math.PI / 2);
  outline.translate(0, 0.06, 0);
  parts.push(paint(outline, 0xd8c49a));

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const peg = cyl(0.05, 0.07, 0.55, 5);
    peg.translate(Math.sin(angle) * 1.9, 0.28, Math.cos(angle) * 1.9);
    parts.push(paint(peg, COLOURS.hearthBeam));
  }

  const groundPatch = groundQuad(4.4, 4.4);
  groundPatch.translate(0, 0.02, 0);
  parts.push(paint(groundPatch, 0xc4ab84));
  return combine(parts);
}

/** The Hearthnest: a small round cottage with a turf roof and a lit window. */
export function makeHearthnest(): BufferGeometry {
  const rng = artRng('hearthnest');
  const parts: BufferGeometry[] = [];

  const walls = cyl(1.45, 1.65, 1.9, 10);
  walls.translate(0, 0.95, 0);
  parts.push(paintGradient(walls, 0xd0b894, COLOURS.hearthWall));

  const roof = cone(2.25, 1.5, 10);
  roof.translate(0, 2.6, 0);
  jitter(roof, 0.04, rng);
  parts.push(paintGradient(roof, COLOURS.hearthRoofDark, COLOURS.hearthRoof));

  // Turf on the roof — the detail that makes it feel grown rather than built.
  const turf = cone(1.75, 0.75, 10);
  transform(turf, { position: [0, 3.05, 0] });
  parts.push(paintGradient(turf, 0x6b9d42, 0x9dc95f));

  const door = box(0.75, 1.15, 0.14);
  door.translate(0, 0.6, 1.6);
  parts.push(paint(door, COLOURS.hearthDoor));

  const arch = cyl(0.38, 0.38, 0.14, 8);
  transform(arch, { rotation: [Math.PI / 2, 0, 0], position: [0, 1.18, 1.6] });
  parts.push(paint(arch, COLOURS.hearthDoor));

  const window = ball(0.3, 0);
  transform(window, { scale: [1, 1, 0.35], position: [-1.1, 1.25, 1.05] });
  parts.push(paint(window, 0xffd98a));

  const chimney = box(0.42, 0.85, 0.42);
  chimney.translate(0.85, 3.05, -0.55);
  parts.push(paint(chimney, 0xa8998a));

  // Beams around the base.
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const beam = cyl(0.09, 0.11, 1.95, 5);
    beam.translate(Math.sin(angle) * 1.55, 0.97, Math.cos(angle) * 1.55);
    parts.push(paint(beam, COLOURS.hearthBeam));
  }
  return flattenBase(combine(parts), 0.1);
}

/** The small campfire ring beside the Hearthnest, where resting happens. */
export function makeHearthFire(lit: boolean): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const stone = ball(0.16, 0);
    transform(stone, {
      scale: [1.2, 0.7, 1.2],
      position: [Math.sin(angle) * 0.52, 0.08, Math.cos(angle) * 0.52],
    });
    parts.push(paint(stone, 0xa8b3bd));
  }
  for (let i = 0; i < 3; i++) {
    const stick = cyl(0.04, 0.05, 0.6, 4);
    transform(stick, {
      rotation: [0.9, (i / 3) * Math.PI * 2, 0],
      position: [0, 0.16, 0],
    });
    parts.push(paint(stick, COLOURS.hearthBeam));
  }
  if (lit) {
    const flame = cone(0.22, 0.5, 6);
    flame.translate(0, 0.4, 0);
    parts.push(paintGradient(flame, COLOURS.hearthFire, 0xffe08a));
  }
  return combine(parts);
}

/**
 * A Dawnspire. Two prototypes: dormant (dark, cracked, leaning, ring fallen)
 * and restored (pale, upright, ring floating and lit).
 */
export function makeDawnspire(restored: boolean): BufferGeometry {
  const rng = artRng(`dawnspire-${restored ? 'lit' : 'dormant'}`);
  const parts: BufferGeometry[] = [];
  const bodyLow = restored ? COLOURS.spireLit : COLOURS.spireDormantDark;
  const bodyHigh = restored ? 0xf2f8ff : COLOURS.spireDormant;

  const base = cyl(1.25, 1.7, 0.6, 8);
  base.translate(0, 0.3, 0);
  jitter(base, 0.05, rng);
  parts.push(paintGradient(base, COLOURS.spireDormantDark, bodyLow));

  // Three stacked tapering segments, each slightly rotated: the silhouette that
  // makes a Dawnspire recognisable from anywhere in its region.
  let y = 0.6;
  for (let i = 0; i < 3; i++) {
    const height = 2.1 - i * 0.34;
    const rBottom = 0.82 - i * 0.19;
    const rTop = 0.66 - i * 0.19;
    const segment = cyl(rTop, rBottom, height, 7);
    transform(segment, {
      rotation: [0, rng.range(0, Math.PI), restored ? 0 : rng.range(-0.045, 0.045)],
      position: [0, y + height / 2, 0],
    });
    jitter(segment, 0.035, rng);
    parts.push(paintGradient(segment, bodyLow, bodyHigh));
    y += height - 0.12;
  }

  const tip = cone(0.34, 0.9, 6);
  tip.translate(0, y + 0.4, 0);
  parts.push(paintGradient(tip, bodyHigh, restored ? COLOURS.spireCore : COLOURS.spireDormant));

  // The ring: fallen and leaning against the base when dormant; floating and
  // glowing when restored. It is the single clearest "before / after" read.
  const halo = ring(restored ? 1.15 : 1.0, 0.11, 5, 18);
  if (restored) {
    transform(halo, { rotation: [Math.PI / 2.15, 0, 0], position: [0, y * 0.62, 0] });
    parts.push(paint(halo, COLOURS.spireCore));
  } else {
    transform(halo, { rotation: [0.35, 0.4, 0.9], position: [1.35, 0.75, 0.5] });
    parts.push(paint(halo, COLOURS.spireDormantDark));
  }

  if (restored) {
    const core = ball(0.42, 1);
    core.translate(0, y * 0.62, 0);
    parts.push(paint(core, COLOURS.spireCore));
  }

  // Broken shards around the foot. Fewer once it is awake.
  for (let i = 0; i < (restored ? 3 : 7); i++) {
    const shard = cone(rng.range(0.1, 0.2), rng.range(0.3, 0.62), 5);
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(1.5, 2.4);
    transform(shard, {
      rotation: [rng.range(-0.5, 0.5), angle, rng.range(-0.5, 0.5)],
      position: [Math.sin(angle) * distance, 0.2, Math.cos(angle) * distance],
    });
    parts.push(paint(shard, restored ? bodyLow : COLOURS.spireDormantDark));
  }
  return combine(parts);
}

/** The glowing disc of ground around a restored Dawnspire. */
export function makeSpireBloomRing(radius: number): BufferGeometry {
  const disc = groundQuad(radius * 2, radius * 2, 1, 1);
  disc.translate(0, 0.03, 0);
  return paint(disc, PALETTES.meadow.glow);
}

/** The Bramble Gate. Closed: a knot of thorns. Open: an arch to walk under. */
export function makeBrambleGate(open: boolean): BufferGeometry {
  const rng = artRng(`bramble-gate-${open ? 'open' : 'closed'}`);
  const parts: BufferGeometry[] = [];
  const halfWidth = 4.2;

  // Two gnarled posts, present either way.
  for (const side of [-1, 1]) {
    const post = cyl(0.42, 0.6, 4.2, 6);
    transform(post, {
      rotation: [0, 0, side * 0.06],
      position: [side * halfWidth, 2.1, 0],
    });
    jitter(post, 0.07, rng);
    parts.push(paintGradient(post, 0x6f5238, COLOURS.brambleThorn));
  }

  if (open) {
    // An arch of vines overhead — the way through is obvious.
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = (t * 2 - 1) * halfWidth;
      const y = 4.2 + Math.sin(t * Math.PI) * 1.1;
      const link = ball(rng.range(0.25, 0.4), 0);
      transform(link, { scale: [1.3, 0.8, 1.1], position: [x, y, 0] });
      parts.push(paint(link, COLOURS.brambleLeaf));
    }
  } else {
    // A dense lattice filling the gap. Reads as "not yet", not as a wall.
    for (let i = 0; i < 26; i++) {
      const vine = cyl(0.07, 0.1, rng.range(2.2, 4.4), 4);
      transform(vine, {
        rotation: [rng.range(-0.35, 0.35), rng.range(-0.3, 0.3), rng.range(-1.3, 1.3)],
        position: [rng.range(-halfWidth, halfWidth), rng.range(0.8, 3.6), rng.range(-0.4, 0.4)],
      });
      parts.push(paint(vine, COLOURS.brambleThorn));
    }
    for (let i = 0; i < 16; i++) {
      const leaf = ball(rng.range(0.16, 0.3), 0);
      transform(leaf, {
        scale: [1.3, 0.7, 1],
        position: [rng.range(-halfWidth, halfWidth), rng.range(0.6, 3.8), rng.range(-0.3, 0.3)],
      });
      parts.push(paint(leaf, COLOURS.brambleLeaf));
    }
  }
  return combine(parts);
}

/** The Mistveil, a cold wall of fog between grove and glade. */
export function makeMistveil(): BufferGeometry {
  const rng = artRng('mistveil');
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 22; i++) {
    const puff = ball(rng.range(0.9, 1.7), 0);
    transform(puff, {
      scale: [1.4, 0.8, 0.6],
      position: [rng.range(-7.5, 7.5), rng.range(0.6, 3.6), rng.range(-0.5, 0.5)],
    });
    parts.push(paint(puff, COLOURS.mistveil));
  }
  return combine(parts);
}

/** The Waking Stone: where the player starts, and the first return point. */
export function makeWakingStone(): BufferGeometry {
  const rng = artRng('waking-stone');
  const parts: BufferGeometry[] = [];

  const slab = cyl(1.0, 1.25, 0.9, 7);
  slab.translate(0, 0.45, 0);
  jitter(slab, 0.07, rng);
  parts.push(paintGradient(slab, 0x7f8a95, COLOURS.wakingStone));

  const cap = ball(0.95, 0);
  transform(cap, { scale: [1.1, 0.3, 1.1], position: [0, 0.95, 0] });
  jitter(cap, 0.05, rng);
  parts.push(paint(cap, COLOURS.wakingStoneMoss));

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const marker = cyl(0.13, 0.18, rng.range(0.5, 0.85), 5);
    transform(marker, {
      rotation: [0, 0, rng.range(-0.12, 0.12)],
      position: [Math.sin(angle) * 1.9, 0.34, Math.cos(angle) * 1.9],
    });
    parts.push(paint(marker, 0x8a95a0));
  }

  // A few blades sprouting from the cap, so it looks slept-on.
  for (let i = 0; i < 6; i++) {
    const blade = stalk(rng.range(0.2, 0.35), 0.06, 0.08, 2);
    blade.rotateY(rng.range(0, Math.PI * 2));
    blade.translate(rng.range(-0.55, 0.55), 1.0, rng.range(-0.55, 0.55));
    parts.push(paint(blade, 0x8bbb52));
  }
  return flattenBase(combine(parts), 0.08);
}
