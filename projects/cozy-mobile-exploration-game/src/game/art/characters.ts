import { Group, Mesh, Object3D, type BufferGeometry, type Material } from 'three';
import {
  artRng,
  ball,
  box,
  combine,
  cone,
  cyl,
  jitter,
  paint,
  paintGradient,
  ring,
  stalk,
  transform,
} from './geometry.ts';
import { COLOURS } from './palette.ts';

/**
 * Characters and creatures.
 *
 * Unlike scenery, these are **rigs**, not single geometries: each returns a
 * `Group` with named sub-objects so the animation system can bob a body, swing
 * a limb, or squash a creature on impact. All motion in this game is authored
 * procedurally in code — there is no skeletal animation and no imported clips.
 *
 * Every design here is built around a distinct silhouette at phone scale, and
 * none of them is dark: the brief specifically rules out unreadable dark
 * character silhouettes, so the darkest value on any character is `INK`, used
 * only for eyes.
 */

export interface CharacterRig {
  /** Add this to the scene. Position and rotation go here. */
  root: Group;
  /** Bobs and leans. Everything visual hangs off this. */
  body: Group;
  head: Object3D;
  armLeft?: Object3D;
  armRight?: Object3D;
  legLeft?: Object3D;
  legRight?: Object3D;
  /** The held item, if any — swapped when the weapon is upgraded. */
  tool?: Group;
  /** Approximate standing height, for nameplates and indicator anchoring. */
  height: number;
}

function mesh(geometry: BufferGeometry, material: Material): Mesh {
  const result = new Mesh(geometry, material);
  result.castShadow = false;
  result.receiveShadow = false;
  return result;
}

function partGroup(geometry: BufferGeometry, material: Material, y: number): Group {
  const group = new Group();
  group.position.y = y;
  group.add(mesh(geometry, material));
  return group;
}

// ---------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------

function makeWillowChime(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const shaft = cyl(0.03, 0.04, 0.95, 5);
  shaft.translate(0, 0.42, 0);
  parts.push(paint(shaft, 0xb08a5c));
  for (let i = 0; i < 3; i++) {
    const bell = cone(0.075, 0.13, 6);
    transform(bell, { rotation: [Math.PI, 0, 0], position: [0, 0.78 - i * 0.13, 0.05 * (i % 2 ? 1 : -1)] });
    parts.push(paint(bell, COLOURS.chimeMetal));
  }
  return combine(parts);
}

function makeBrightChime(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const shaft = cyl(0.035, 0.045, 1.05, 6);
  shaft.translate(0, 0.47, 0);
  parts.push(paintGradient(shaft, 0xb08a5c, 0xd8c39a));

  // Riverstone bindings, the visible part of Ossa's work.
  for (let i = 0; i < 3; i++) {
    const band = cyl(0.055, 0.055, 0.05, 6);
    band.translate(0, 0.25 + i * 0.22, 0);
    parts.push(paint(band, 0xa8b3bd));
  }

  const halo = ring(0.14, 0.025, 4, 12);
  transform(halo, { rotation: [Math.PI / 2, 0, 0], position: [0, 0.95, 0] });
  parts.push(paint(halo, COLOURS.chimeBright));

  for (let i = 0; i < 4; i++) {
    const bell = cone(0.08, 0.15, 6);
    const angle = (i / 4) * Math.PI * 2;
    transform(bell, {
      rotation: [Math.PI, 0, 0],
      position: [Math.sin(angle) * 0.1, 0.86 - (i % 2) * 0.1, Math.cos(angle) * 0.1],
    });
    parts.push(paintGradient(bell, COLOURS.chimeBright, COLOURS.chimeMetal));
  }
  return combine(parts);
}

export function makeChimeGeometry(upgraded: boolean): BufferGeometry {
  return upgraded ? makeBrightChime() : makeWillowChime();
}

/**
 * The player: a small hooded wanderer.
 *
 * The hood point plus the flared cloak is the whole silhouette — it stays
 * readable when the character is forty pixels tall on a phone, which a more
 * detailed humanoid would not.
 */
export function makePlayerRig(material: Material, upgraded: boolean): CharacterRig {
  const root = new Group();
  const body = new Group();
  root.add(body);

  const torso = cyl(0.24, 0.3, 0.5, 8);
  torso.translate(0, 0.62, 0);
  body.add(mesh(paintGradient(torso, COLOURS.playerCloakDark, COLOURS.playerTunic), material));

  // The cloak: a cone that flares out below the waist.
  const cloak = cone(0.42, 0.72, 9);
  cloak.translate(0, 0.44, -0.03);
  body.add(mesh(paintGradient(cloak, COLOURS.playerCloakDark, COLOURS.playerCloak), material));

  const head = new Group();
  head.position.y = 0.96;
  body.add(head);

  const skull = ball(0.22, 1);
  transform(skull, { scale: [1, 1.05, 0.95] });
  head.add(mesh(paint(skull, COLOURS.playerSkin), material));

  const hood = cone(0.29, 0.44, 8);
  transform(hood, { position: [0, 0.14, -0.05], rotation: [-0.12, 0, 0] });
  head.add(mesh(paintGradient(hood, COLOURS.playerCloakDark, COLOURS.playerCloak), material));

  const fringe = ball(0.2, 0);
  transform(fringe, { scale: [1.02, 0.6, 1.02], position: [0, 0.1, 0.02] });
  head.add(mesh(paint(fringe, COLOURS.playerHair), material));

  for (const side of [-1, 1]) {
    const eye = ball(0.038, 0);
    transform(eye, { scale: [1, 1.25, 0.6], position: [side * 0.082, 0.01, 0.196] });
    head.add(mesh(paint(eye, COLOURS.pimEye), material));
  }

  const armLeft = new Group();
  armLeft.position.set(-0.28, 0.8, 0);
  const armGeometry = capsuleArm(COLOURS.playerCloak);
  armLeft.add(mesh(armGeometry, material));
  body.add(armLeft);

  const armRight = new Group();
  armRight.position.set(0.28, 0.8, 0);
  armRight.add(mesh(capsuleArm(COLOURS.playerCloak), material));
  body.add(armRight);

  const tool = new Group();
  tool.position.set(0.06, -0.3, 0.08);
  tool.rotation.set(-0.35, 0, -0.25);
  tool.add(mesh(makeChimeGeometry(upgraded), material));
  armRight.add(tool);

  const legLeft = partGroup(capsuleLeg(), material, 0.3);
  legLeft.position.x = -0.11;
  body.add(legLeft);
  const legRight = partGroup(capsuleLeg(), material, 0.3);
  legRight.position.x = 0.11;
  body.add(legRight);

  return { root, body, head, armLeft, armRight, legLeft, legRight, tool, height: 1.25 };
}

function capsuleArm(colour: number): BufferGeometry {
  const arm = cyl(0.07, 0.08, 0.42, 6);
  arm.translate(0, -0.2, 0);
  const hand = ball(0.085, 0);
  hand.translate(0, -0.42, 0);
  return combine([paint(arm, colour), paint(hand, COLOURS.playerSkinShade)]);
}

function capsuleLeg(): BufferGeometry {
  const leg = cyl(0.075, 0.085, 0.3, 6);
  leg.translate(0, -0.15, 0);
  const boot = ball(0.1, 0);
  transform(boot, { scale: [1, 0.7, 1.35], position: [0, -0.3, 0.03] });
  return combine([paint(leg, COLOURS.playerCloakDark), paint(boot, COLOURS.playerBoot)]);
}

// ---------------------------------------------------------------------------
// Pim, the wisplet companion
// ---------------------------------------------------------------------------

/**
 * Pim floats, so there are no legs and the whole rig hangs from `body`, which
 * the companion system bobs on a sine. The lantern tail is the guidance cue:
 * it brightens when Pim is pointing at something.
 */
export function makePimRig(material: Material): CharacterRig {
  const root = new Group();
  const body = new Group();
  body.position.y = 0.75;
  root.add(body);

  const head = new Group();
  body.add(head);

  const blob = ball(0.28, 1);
  transform(blob, { scale: [1, 0.92, 1] });
  head.add(mesh(paintGradient(blob, COLOURS.pimGlow, COLOURS.pimBody), material));

  // Leaf ears.
  for (const side of [-1, 1]) {
    const ear = stalk(0.34, 0.17, 0.06, 2);
    transform(ear, {
      rotation: [-0.25, 0, side * 0.55],
      position: [side * 0.16, 0.16, -0.03],
    });
    head.add(mesh(paintGradient(ear, COLOURS.pimEar, COLOURS.pimGlow), material));
  }

  for (const side of [-1, 1]) {
    const eye = ball(0.045, 0);
    transform(eye, { scale: [1, 1.15, 0.6], position: [side * 0.1, 0.03, 0.245] });
    head.add(mesh(paint(eye, COLOURS.pimEye), material));
  }

  const cheekLeft = ball(0.05, 0);
  transform(cheekLeft, { scale: [1.2, 0.7, 0.4], position: [-0.16, -0.05, 0.22] });
  head.add(mesh(paint(cheekLeft, 0xf2b0a8), material));
  const cheekRight = cheekLeft.clone();
  transform(cheekRight, { position: [0.32, 0, 0] });
  head.add(mesh(paint(cheekRight, 0xf2b0a8), material));

  // The lantern tail.
  const tail = new Group();
  tail.position.set(0, -0.12, -0.26);
  const stemGeometry = cyl(0.02, 0.03, 0.26, 4);
  stemGeometry.translate(0, -0.1, -0.06);
  tail.add(mesh(paint(stemGeometry, COLOURS.pimEar), material));
  const lantern = ball(0.11, 0);
  lantern.translate(0, -0.24, -0.12);
  tail.add(mesh(paint(lantern, 0xfff2b8), material));
  body.add(tail);

  return { root, body, head, tool: tail, height: 1.0 };
}

// ---------------------------------------------------------------------------
// Creatures
// ---------------------------------------------------------------------------

/**
 * A thistlebur: a round burr with a grumpy face and two stubby feet.
 * Soft shapes, warm violet, big eyes — hostile in behaviour but never in look.
 */
export function makeThistleburRig(material: Material): CharacterRig {
  const rng = artRng('thistlebur');
  const root = new Group();
  const body = new Group();
  body.position.y = 0.42;
  root.add(body);

  const head = new Group();
  body.add(head);

  const burr = ball(0.4, 1);
  transform(burr, { scale: [1, 0.9, 1] });
  jitter(burr, 0.03, rng);
  head.add(mesh(paintGradient(burr, COLOURS.thistleburBelly, COLOURS.thistleburBody), material));

  // Spines — blunt cones, deliberately not sharp-looking.
  for (let i = 0; i < 16; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const pitch = rng.range(-0.5, 1.2);
    const spine = cone(0.055, rng.range(0.16, 0.26), 5);
    transform(spine, {
      rotation: [Math.PI / 2 - pitch, angle, 0],
      position: [
        Math.sin(angle) * Math.cos(pitch) * 0.38,
        Math.sin(pitch) * 0.36,
        Math.cos(angle) * Math.cos(pitch) * 0.38,
      ],
    });
    head.add(mesh(paint(spine, COLOURS.thistleburSpine), material));
  }

  for (const side of [-1, 1]) {
    const eye = ball(0.075, 0);
    transform(eye, { scale: [1, 1.1, 0.55], position: [side * 0.14, 0.06, 0.34] });
    head.add(mesh(paint(eye, 0xfdf6ec), material));
    const pupil = ball(0.04, 0);
    transform(pupil, { scale: [1, 1.2, 0.5], position: [side * 0.14, 0.05, 0.38] });
    head.add(mesh(paint(pupil, COLOURS.thistleburEye), material));
    // A low brow is the whole personality.
    const brow = box(0.13, 0.035, 0.03);
    transform(brow, { rotation: [0, 0, side * -0.35], position: [side * 0.14, 0.16, 0.36] });
    head.add(mesh(paint(brow, COLOURS.thistleburSpine), material));
  }

  const legLeft = partGroup(stubbyFoot(), material, -0.3);
  legLeft.position.x = -0.16;
  body.add(legLeft);
  const legRight = partGroup(stubbyFoot(), material, -0.3);
  legRight.position.x = 0.16;
  body.add(legRight);

  return { root, body, head, legLeft, legRight, height: 0.9 };
}

function stubbyFoot(): BufferGeometry {
  const foot = ball(0.11, 0);
  transform(foot, { scale: [1, 0.75, 1.4] });
  return paint(foot, COLOURS.thistleburSpine);
}

/**
 * Bramblehorn: the grove guardian. Four legs, a mossy back, and heavy curved
 * horns. Bigger and slower-reading than a thistlebur so the encounter feels
 * like an event without ever looking frightening.
 */
export function makeBramblehornRig(material: Material): CharacterRig {
  const rng = artRng('bramblehorn');
  const root = new Group();
  const body = new Group();
  body.position.y = 1.05;
  root.add(body);

  const barrel = ball(0.95, 1);
  transform(barrel, { scale: [1, 0.85, 1.5] });
  jitter(barrel, 0.06, rng);
  body.add(mesh(paintGradient(barrel, 0x8a7460, COLOURS.bramblehornBody), material));

  // Moss and small growth along the spine — it has been asleep a long time.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const moss = ball(rng.range(0.2, 0.34), 0);
    transform(moss, {
      scale: [1.2, 0.55, 1.1],
      position: [rng.range(-0.2, 0.2), 0.7 + rng.range(-0.05, 0.08), (t - 0.5) * 2.4],
    });
    body.add(mesh(paint(moss, COLOURS.bramblehornMoss), material));
  }
  for (let i = 0; i < 5; i++) {
    const sprout = stalk(rng.range(0.22, 0.4), 0.09, 0.08, 2);
    sprout.rotateY(rng.range(0, Math.PI * 2));
    sprout.translate(rng.range(-0.3, 0.3), 0.82, rng.range(-1, 1));
    body.add(mesh(paint(sprout, 0x7fb85a), material));
  }

  const head = new Group();
  head.position.set(0, 0.15, 1.5);
  body.add(head);

  const skull = ball(0.52, 1);
  transform(skull, { scale: [1, 0.9, 1.15] });
  jitter(skull, 0.04, rng);
  head.add(mesh(paintGradient(skull, 0x8a7460, COLOURS.bramblehornBody), material));

  const snout = ball(0.3, 0);
  transform(snout, { scale: [1, 0.8, 1.2], position: [0, -0.14, 0.42] });
  head.add(mesh(paint(snout, 0x9a8470), material));

  // Horns: two curved segment chains, the guardian's whole read at distance.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const segment = cone(0.16 - t * 0.03, 0.32, 6);
      transform(segment, {
        rotation: [-0.5 + t * 1.5, 0, side * (0.5 - t * 0.35)],
        position: [side * (0.35 + t * 0.4), 0.42 + t * 0.34 - t * t * 0.24, -t * 0.24],
      });
      head.add(mesh(paintGradient(segment, 0xb5a382, COLOURS.bramblehornHorn), material));
    }
  }

  for (const side of [-1, 1]) {
    const eye = ball(0.085, 0);
    transform(eye, { scale: [1, 0.85, 0.6], position: [side * 0.26, 0.1, 0.4] });
    head.add(mesh(paint(eye, COLOURS.bramblehornEye), material));
    const pupil = ball(0.04, 0);
    transform(pupil, { scale: [0.7, 1, 0.5], position: [side * 0.26, 0.1, 0.45] });
    head.add(mesh(paint(pupil, COLOURS.pimEye), material));
  }

  const legs: Group[] = [];
  for (const side of [-1, 1]) {
    for (const front of [1, -1]) {
      const leg = partGroup(heavyLeg(), material, -0.55);
      leg.position.set(side * 0.55, -0.55, front * 0.85);
      body.add(leg);
      legs.push(leg);
    }
  }

  return {
    root,
    body,
    head,
    legLeft: legs[0],
    legRight: legs[2],
    armLeft: legs[1],
    armRight: legs[3],
    height: 2.1,
  };
}

function heavyLeg(): BufferGeometry {
  const leg = cyl(0.15, 0.2, 0.62, 6);
  leg.translate(0, -0.31, 0);
  const hoof = ball(0.19, 0);
  transform(hoof, { scale: [1, 0.6, 1.2], position: [0, -0.62, 0.02] });
  return combine([paint(leg, COLOURS.bramblehornBody), paint(hoof, 0x4f4034)]);
}

/** Ossa the tinker: a round, spiny, apron-wearing crafter. */
export function makeOssaRig(material: Material): CharacterRig {
  const rng = artRng('ossa');
  const root = new Group();
  const body = new Group();
  body.position.y = 0.5;
  root.add(body);

  const torso = ball(0.42, 1);
  transform(torso, { scale: [1, 0.95, 1] });
  body.add(mesh(paintGradient(torso, 0xdaa06c, COLOURS.ossaBody), material));

  const apron = cone(0.44, 0.55, 8);
  transform(apron, { position: [0, -0.1, 0.06] });
  body.add(mesh(paintGradient(apron, 0x5f9088, COLOURS.ossaApron), material));

  // Spines over the back only, so the face stays open and friendly.
  for (let i = 0; i < 14; i++) {
    const angle = rng.range(Math.PI * 0.35, Math.PI * 1.65);
    const pitch = rng.range(0, 1.1);
    const spine = cone(0.045, rng.range(0.14, 0.24), 5);
    transform(spine, {
      rotation: [Math.PI / 2 - pitch, angle, 0],
      position: [
        Math.sin(angle) * Math.cos(pitch) * 0.4,
        Math.sin(pitch) * 0.4 + 0.05,
        Math.cos(angle) * Math.cos(pitch) * 0.4,
      ],
    });
    body.add(mesh(paint(spine, COLOURS.ossaSpine), material));
  }

  const head = new Group();
  head.position.set(0, 0.34, 0.16);
  body.add(head);

  const face = ball(0.26, 1);
  transform(face, { scale: [1, 0.92, 1.1] });
  head.add(mesh(paint(face, 0xe8b98a), material));

  const snout = cone(0.11, 0.22, 6);
  transform(snout, { rotation: [Math.PI / 2, 0, 0], position: [0, -0.05, 0.28] });
  head.add(mesh(paint(snout, 0xd8a678), material));

  const nose = ball(0.045, 0);
  nose.translate(0, -0.05, 0.4);
  head.add(mesh(paint(nose, COLOURS.pimEye), material));

  for (const side of [-1, 1]) {
    const eye = ball(0.04, 0);
    transform(eye, { scale: [1, 1.2, 0.6], position: [side * 0.11, 0.04, 0.23] });
    head.add(mesh(paint(eye, COLOURS.pimEye), material));
  }

  // Spectacles: the clearest "this one is a crafter, talk to them" signal.
  for (const side of [-1, 1]) {
    const lens = ring(0.06, 0.014, 4, 10);
    transform(lens, { position: [side * 0.11, 0.04, 0.25] });
    head.add(mesh(paint(lens, 0xd8c39a), material));
  }

  const armLeft = new Group();
  armLeft.position.set(-0.36, 0.12, 0.1);
  armLeft.add(mesh(paint(cyl(0.06, 0.07, 0.3, 5).translate(0, -0.15, 0), COLOURS.ossaBody), material));
  body.add(armLeft);

  const armRight = new Group();
  armRight.position.set(0.36, 0.12, 0.1);
  armRight.add(mesh(paint(cyl(0.06, 0.07, 0.3, 5).translate(0, -0.15, 0), COLOURS.ossaBody), material));
  body.add(armRight);

  return { root, body, head, armLeft, armRight, height: 1.05 };
}
