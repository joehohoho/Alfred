import type { ResourceBundle } from './types.ts';

/**
 * Every cost in the game, in one place.
 *
 * The brief fixes the two landmark costs (3/3/3 + 1 core, then 2/2/2 + 1 core);
 * the shelter and weapon costs are tuned around them so that the full route
 * needs roughly three creature encounters and a couple of gathering passes.
 */
export const COSTS = {
  /** Tinker Ossa turns the Willow Chime into the Bright Chime. */
  weaponUpgrade: { glimmercore: 1, boughwood: 3, riverstone: 2 } as ResourceBundle,
  /** Raising the Hearthnest on its clearing. */
  shelter: { boughwood: 4, riverstone: 3, sunpetal: 2 } as ResourceBundle,
  /** The Meadow Dawnspire — first restoration. */
  landmarkMeadow: {
    sunpetal: 3,
    boughwood: 3,
    riverstone: 3,
    glimmercore: 1,
  } as ResourceBundle,
  /** The Moonmere Dawnspire — the finale. */
  landmarkMoonmere: {
    sunpetal: 2,
    boughwood: 2,
    riverstone: 2,
    glimmercore: 1,
  } as ResourceBundle,
} as const;

/**
 * How much of each family the player should hold before the Journey stops
 * saying "gather" and starts pointing at the creatures. Deliberately small —
 * it is a nudge out of the tutorial, not a wall.
 */
export const STARTER_STOCK: ResourceBundle = {
  sunpetal: 2,
  boughwood: 2,
  riverstone: 2,
};

export type WeaponTier = 'willow-chime' | 'bright-chime';

export interface WeaponDef {
  id: WeaponTier;
  name: string;
  blurb: string;
  damage: number;
  /** Multiplier applied to `damage` for a fully charged swing. */
  chargeMultiplier: number;
  /** Reach of the attack arc, in world units. */
  range: number;
  /** Half-angle of the attack arc, in degrees. */
  arcDegrees: number;
  /** Seconds between swings when the attack button is held. */
  cooldown: number;
}

export const WEAPONS: Record<WeaponTier, WeaponDef> = {
  'willow-chime': {
    id: 'willow-chime',
    name: 'Willow Chime',
    blurb: 'A bent willow switch with three small bells. It asks politely.',
    damage: 10,
    chargeMultiplier: 2.2,
    range: 2.6,
    arcDegrees: 62,
    cooldown: 0.46,
  },
  'bright-chime': {
    id: 'bright-chime',
    name: 'Bright Chime',
    blurb: 'Ossa rewound it with riverstone and a sleeping spark. It insists.',
    damage: 18,
    chargeMultiplier: 2.4,
    range: 3.1,
    arcDegrees: 74,
    cooldown: 0.4,
  },
};
