import type { RegionId } from '../../core/types.ts';

/**
 * The colour system.
 *
 * Two rules hold the look together:
 *  1. Each region owns a small, closed set of hues. The meadow is warm
 *     (yellow-greens, honey, terracotta); the grove deepens and cools it; the
 *     glade swaps to violet-blue with a single warm accent so the player's own
 *     lantern still reads.
 *  2. Nothing is pure black or pure white. The darkest value in the game is
 *     `ink`, a very dark blue-green, so silhouettes never go muddy on a phone
 *     screen in daylight — which the brief calls out explicitly.
 */

export interface RegionPalette {
  /** Ambient sky colour feeding the hemisphere light. */
  sky: number;
  /** Bounce colour from the ground, the other half of the hemisphere light. */
  ground: number;
  /** Key light colour. */
  sun: number;
  /**
   * Distance fog. Matches the sky so the world fades rather than clips.
   *
   * These are calibrated against the camera's boom length: under orthographic
   * projection everything on screen sits at roughly the same camera distance,
   * so `fogNear` must be set just past the boom or the whole world greys out
   * at once. The visible gradient comes from the ~±15 units of depth across
   * the screen, which is exactly the gentle falloff we want.
   */
  fog: number;
  fogNear: number;
  fogFar: number;
  /** Base terrain greens, light to dark. */
  turf: readonly number[];
  /** Bare earth on the walking lanes. */
  path: number;
  /** Water surface. */
  water: number;
  /** Trunks and woody material. */
  bark: readonly number[];
  /** Canopy and leafy material. */
  leaf: readonly number[];
  /** Petals and small blooms. */
  bloom: readonly number[];
  /** Stone. */
  stone: readonly number[];
  /** The magical accent — glow, motes, restored light. */
  glow: number;
}

export const INK = 0x1b2a2b;

export const PALETTES: Record<RegionId, RegionPalette> = {
  meadow: {
    sky: 0xbfe4f2,
    ground: 0x93b268,
    sun: 0xfff2d0,
    fog: 0xd6ecf3,
    fogNear: 62,
    fogFar: 132,
    turf: [0xa4cd68, 0x98c45e, 0x8dba55, 0x81b04c],
    path: 0xb9a077,
    water: 0x76b8c6,
    bark: [0xb98a5e, 0xa2764c, 0xceaa7c],
    leaf: [0x86c25e, 0x76b350, 0x99cf6e, 0x66a244],
    bloom: [0xffc95e, 0xff9f68, 0xf5e07a, 0xe98fb0, 0xfff0c2],
    stone: [0xb3b5ad, 0xa1a39a, 0xc6c8bf],
    glow: 0x8ff0dc,
  },
  grove: {
    sky: 0xa8cfd6,
    ground: 0x74915a,
    sun: 0xf6ecc8,
    fog: 0xbcd8d2,
    fogNear: 60,
    fogFar: 126,
    turf: [0x86b356, 0x79a74b, 0x6d9b42, 0x608e3a],
    path: 0xa8926c,
    water: 0x6aa8b8,
    bark: [0x9c7550, 0x866040, 0xb08a62],
    leaf: [0x69ab4d, 0x5b9c41, 0x7bb95c, 0x4d8b36],
    bloom: [0xf2b95a, 0xdd8a63, 0xe8dc86],
    stone: [0x9ba396, 0x899184, 0xaeb5a8],
    glow: 0x8ff0dc,
  },
  glade: {
    // These are *light* colours, not paint. A hex as dark as 0x2c3a6b becomes
    // almost nothing once converted to linear space, which left the whole glade
    // near-black. Moonlit means cool and dim, not unreadable — so the lights
    // stay bright and the *palette* carries the night.
    sky: 0x6f81b8,
    ground: 0x55648e,
    sun: 0xcdd8ff,
    fog: 0x3d4a7e,
    fogNear: 56,
    fogFar: 118,
    turf: [0x6b86a8, 0x5f7a9c, 0x546e90, 0x496284],
    path: 0x7b84a6,
    water: 0x5f8cba,
    bark: [0x9498b8, 0x8185a2, 0xa9adc8],
    leaf: [0x6c8cbe, 0x5d7bab, 0x7f9dcf, 0x527099],
    bloom: [0xb7a8f0, 0x8fd8f0, 0xe4d6ff, 0xf0d89a],
    stone: [0x8a92ab, 0x78809a, 0x9da5bb],
    glow: 0xa9e8ff,
  },
};

/** Named colours used by characters, structures and UI-in-world elements. */
export const COLOURS = {
  playerCloak: 0x74a6e0,
  playerCloakDark: 0x5486bd,
  playerTunic: 0xf2e2c0,
  playerSkin: 0xe8b48c,
  playerSkinShade: 0xd09a72,
  playerHair: 0x8a5f42,
  playerBoot: 0x96754f,
  chimeMetal: 0xe8d18a,
  chimeBright: 0xa9f0e0,

  pimBody: 0xd8f4c8,
  pimGlow: 0xbdf5a8,
  pimEar: 0x9fd98a,
  pimEye: INK,

  thistleburBody: 0xa98ad0,
  thistleburSpine: 0x9179bd,
  thistleburBelly: 0xd6c4ec,
  thistleburEye: INK,

  bramblehornBody: 0x8a7259,
  bramblehornMoss: 0x5e8c4a,
  bramblehornHorn: 0xd8c9a8,
  bramblehornEye: 0xffd98a,

  ossaBody: 0xc98a5a,
  ossaApron: 0x7fb0a8,
  ossaSpine: 0xa06f47,

  hearthWall: 0xe0cba4,
  hearthBeam: 0x9a6f47,
  hearthRoof: 0xc4705a,
  hearthRoofDark: 0xa85c4a,
  hearthDoor: 0x9a6f47,
  hearthFire: 0xffa64d,

  stumpWood: 0xa9784e,
  stumpInner: 0xd8b98a,
  stumpAwning: 0x9fc4a8,

  spireDormant: 0x939ead,
  spireDormantDark: 0x717c8b,
  spireLit: 0xd8e8f0,
  spireCore: 0x8ff0dc,

  brambleThorn: 0x8a6c4c,
  brambleLeaf: 0x69a850,
  mistveil: 0xbdd4e8,

  wakingStone: 0x9aa8b4,
  wakingStoneMoss: 0x7aab52,
} as const;

/** A stable-but-varied pick from a palette list, driven by a prop's variant. */
export function pickColour(list: readonly number[], index: number): number {
  return list[Math.abs(index) % list.length]!;
}
