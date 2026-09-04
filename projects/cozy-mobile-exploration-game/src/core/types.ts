import type { Vec3 } from './vector.ts';

/** The three renewable material families, plus the rare creature-drop core. */
export type ResourceId = 'sunpetal' | 'boughwood' | 'riverstone' | 'glimmercore';

/** Only these three are gathered from world nodes. Glimmercore drops from creatures. */
export type GatherableId = Extract<ResourceId, 'sunpetal' | 'boughwood' | 'riverstone'>;

export const GATHERABLE_IDS: readonly GatherableId[] = ['sunpetal', 'boughwood', 'riverstone'];
export const RESOURCE_IDS: readonly ResourceId[] = [...GATHERABLE_IDS, 'glimmercore'];

export interface ResourceDef {
  id: ResourceId;
  /** Display name, singular. */
  name: string;
  /** Display name, plural. */
  plural: string;
  /** One-line flavour shown in the pouch. */
  blurb: string;
  /** Hex colour used for the icon, pickup motes and node highlight. */
  tint: number;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  sunpetal: {
    id: 'sunpetal',
    name: 'Sunpetal',
    plural: 'Sunpetals',
    blurb: 'Warm petals that keep a little daylight inside them.',
    tint: 0xffc95e,
  },
  boughwood: {
    id: 'boughwood',
    name: 'Boughwood',
    plural: 'Boughwood',
    blurb: 'Soft fallen branches. They smell faintly of rain.',
    tint: 0xc08a52,
  },
  riverstone: {
    id: 'riverstone',
    name: 'Riverstone',
    plural: 'Riverstones',
    blurb: 'Smooth creek pebbles, humming very quietly.',
    tint: 0x9fb4c7,
  },
  glimmercore: {
    id: 'glimmercore',
    name: 'Glimmercore',
    plural: 'Glimmercores',
    blurb: 'A drowsy spark left behind by a settled creature.',
    tint: 0x86f0d8,
  },
};

/** A cost or a yield: resource id → count. Absent keys mean zero. */
export type ResourceBundle = Partial<Record<ResourceId, number>>;

export type RegionId = 'meadow' | 'grove' | 'glade';

export interface RegionDef {
  id: RegionId;
  name: string;
  /** Shown once, the first time the player crosses in. */
  subtitle: string;
}

export const REGIONS: Record<RegionId, RegionDef> = {
  meadow: {
    id: 'meadow',
    name: 'Sunmere Meadow',
    subtitle: 'Warm grass, and something sleeping under it.',
  },
  grove: {
    id: 'grove',
    name: 'Thornhollow Grove',
    subtitle: 'The brambles part. Something large is awake in here.',
  },
  glade: {
    id: 'glade',
    name: 'Moonmere Glade',
    subtitle: 'Cool light on still water.',
  },
};

/** Anything the player can walk up to and press Interact on. */
export type InteractableKind =
  | 'resource-node'
  | 'merchant'
  | 'shelter-site'
  | 'shelter'
  | 'companion'
  | 'landmark';

export interface InteractPromptSpec {
  kind: InteractableKind;
  id: string;
  /** Verb shown on the interact button, e.g. "Gather". */
  verb: string;
  /** Object of the verb, e.g. "Sunpetals". */
  subject: string;
  /** Reason the interaction is unavailable; when present the prompt is dimmed. */
  blockedReason?: string;
  position: Vec3;
  /** How close the player must be, in world units. */
  radius: number;
}

/** Coarse hostility zoning. Safe zones never spawn or hold hostile creatures. */
export interface SafeZone {
  id: string;
  centre: Vec3;
  radius: number;
}
