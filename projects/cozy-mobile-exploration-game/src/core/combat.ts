import { WEAPONS, type WeaponTier } from './recipes.ts';
import { angleDelta, distanceXZ, type Vec3 } from './vector.ts';

/**
 * Combat rules.
 *
 * The brief's constraint — "simple, readable and forgiving, never punishing" —
 * shows up here as: generous arcs, generous invulnerability on the dodge, a
 * hard cap on how often a creature may land a hit, and no loss of anything on
 * defeat. There is no crit, no status effect, no stagger lock.
 */

export type CreatureSpecies = 'thistlebur' | 'bramblehorn';

export interface CreatureDef {
  species: CreatureSpecies;
  name: string;
  maxHealth: number;
  contactDamage: number;
  moveSpeed: number;
  /** Distance at which it notices the player. */
  noticeRadius: number;
  /** Distance at which it stops approaching and winds up. */
  strikeRange: number;
  /** Seconds of readable telegraph before the hit lands. */
  windupSeconds: number;
  /** Seconds it stands around afterwards, the player's free window. */
  recoverySeconds: number;
  /** Distance from its home post beyond which it gives up and walks back. */
  leashRadius: number;
  /** Glimmercores left behind when it settles. */
  coreDrop: number;
  /** Radius used for hit tests and the soft body-block. */
  bodyRadius: number;
}

export const CREATURES: Record<CreatureSpecies, CreatureDef> = {
  thistlebur: {
    species: 'thistlebur',
    name: 'Thistlebur',
    maxHealth: 30,
    contactDamage: 8,
    moveSpeed: 2.3,
    noticeRadius: 9,
    strikeRange: 1.8,
    windupSeconds: 0.55,
    recoverySeconds: 0.95,
    leashRadius: 16,
    coreDrop: 1,
    bodyRadius: 0.62,
  },
  bramblehorn: {
    species: 'bramblehorn',
    name: 'Bramblehorn',
    maxHealth: 170,
    contactDamage: 14,
    moveSpeed: 2.9,
    noticeRadius: 15,
    strikeRange: 2.7,
    windupSeconds: 0.78,
    recoverySeconds: 1.15,
    leashRadius: 26,
    coreDrop: 1,
    bodyRadius: 1.15,
  },
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface DamageResult {
  health: number;
  applied: number;
  defeated: boolean;
}

export function applyDamage(health: number, maxHealth: number, amount: number): DamageResult {
  const requested = Math.max(0, amount);
  const next = Math.min(Math.max(health - requested, 0), maxHealth);
  return { health: next, applied: health - next, defeated: next <= 0 };
}

export function healTo(maxHealth: number): number {
  return maxHealth;
}

// ---------------------------------------------------------------------------
// Player attack
// ---------------------------------------------------------------------------

/** How long the attack button must be held before the swing counts as charged. */
export const CHARGE_SECONDS = 0.55;

export interface AttackSwing {
  damage: number;
  charged: boolean;
  range: number;
  arcDegrees: number;
  cooldown: number;
}

/**
 * Builds one swing.
 * @param heldSeconds How long the attack button was held. A tap is 0.
 */
export function buildSwing(weapon: WeaponTier, heldSeconds: number): AttackSwing {
  const def = WEAPONS[weapon];
  const charged = heldSeconds >= CHARGE_SECONDS;
  return {
    damage: charged ? Math.round(def.damage * def.chargeMultiplier) : def.damage,
    charged,
    // A charged swing also reaches a little further and wider, so the extra
    // commitment is visible in the world rather than only in the damage number.
    range: charged ? def.range * 1.18 : def.range,
    arcDegrees: charged ? def.arcDegrees * 1.25 : def.arcDegrees,
    cooldown: def.cooldown,
  };
}

export interface HitCandidate {
  id: string;
  position: Vec3;
  bodyRadius: number;
}

/**
 * Everything inside the swing's cone. The candidate's body radius counts toward
 * reach, so a big creature is hit at the edge of its body rather than its
 * centre — otherwise Bramblehorn would feel unhittable.
 */
export function resolveArcAttack(
  origin: Vec3,
  facingRadians: number,
  swing: AttackSwing,
  candidates: readonly HitCandidate[],
): string[] {
  const halfArc = (swing.arcDegrees * Math.PI) / 180 / 2;
  const hits: string[] = [];
  for (const candidate of candidates) {
    const distance = distanceXZ(origin, candidate.position) - candidate.bodyRadius;
    if (distance > swing.range) continue;
    // A target essentially on top of the player is always in the arc; the angle
    // to it is numerically meaningless at that distance.
    if (distance <= 0.05) {
      hits.push(candidate.id);
      continue;
    }
    const toTarget = Math.atan2(
      candidate.position.x - origin.x,
      candidate.position.z - origin.z,
    );
    if (Math.abs(angleDelta(facingRadians, toTarget)) <= halfArc) hits.push(candidate.id);
  }
  return hits;
}

/**
 * Nearest-target assist for the attack button and the soft lock-on.
 *
 * Targets inside the facing cone always beat targets behind the player, so
 * pressing attack does the thing the player is looking at. Ties break on
 * distance.
 */
export function selectTarget(
  origin: Vec3,
  facingRadians: number,
  candidates: readonly HitCandidate[],
  maxRange: number,
  coneDegrees = 120,
): string | null {
  const halfCone = (coneDegrees * Math.PI) / 180 / 2;
  let best: { id: string; inCone: boolean; distance: number } | null = null;

  for (const candidate of candidates) {
    const distance = distanceXZ(origin, candidate.position) - candidate.bodyRadius;
    if (distance > maxRange) continue;
    const toTarget = Math.atan2(
      candidate.position.x - origin.x,
      candidate.position.z - origin.z,
    );
    const inCone =
      distance <= 0.05 || Math.abs(angleDelta(facingRadians, toTarget)) <= halfCone;

    if (
      !best ||
      (inCone && !best.inCone) ||
      (inCone === best.inCone && distance < best.distance)
    ) {
      best = { id: candidate.id, inCone, distance };
    }
  }
  return best ? best.id : null;
}

// ---------------------------------------------------------------------------
// Dodge
// ---------------------------------------------------------------------------

export const DODGE = {
  /** Total length of the roll. */
  durationSeconds: 0.34,
  /** Invulnerable from t=0 to here. Covers most of the roll on purpose. */
  invulnerableSeconds: 0.24,
  /** Time after the roll ends before another may start. */
  cooldownSeconds: 0.42,
  /** Peak speed multiplier during the roll. */
  speedMultiplier: 3.1,
} as const;

export interface DodgeState {
  /** Seconds since the roll began; >= durationSeconds means not rolling. */
  elapsed: number;
  /** Seconds remaining before another roll is allowed. */
  cooldown: number;
  /** Direction of the roll, radians. */
  heading: number;
}

export function idleDodge(): DodgeState {
  return { elapsed: DODGE.durationSeconds, cooldown: 0, heading: 0 };
}

export function isDodging(dodge: DodgeState): boolean {
  return dodge.elapsed < DODGE.durationSeconds;
}

export function isInvulnerable(dodge: DodgeState): boolean {
  return dodge.elapsed < DODGE.invulnerableSeconds;
}

export function canDodge(dodge: DodgeState): boolean {
  return !isDodging(dodge) && dodge.cooldown <= 0;
}

export function startDodge(dodge: DodgeState, heading: number): DodgeState {
  if (!canDodge(dodge)) return dodge;
  return { elapsed: 0, cooldown: DODGE.durationSeconds + DODGE.cooldownSeconds, heading };
}

export function tickDodge(dodge: DodgeState, dt: number): DodgeState {
  return {
    elapsed: Math.min(dodge.elapsed + dt, DODGE.durationSeconds),
    cooldown: Math.max(dodge.cooldown - dt, 0),
    heading: dodge.heading,
  };
}

/** Eased speed multiplier across the roll: fast start, soft landing. */
export function dodgeSpeedMultiplier(dodge: DodgeState): number {
  if (!isDodging(dodge)) return 1;
  const t = dodge.elapsed / DODGE.durationSeconds;
  return 1 + (DODGE.speedMultiplier - 1) * (1 - t) * (1 - t);
}

// ---------------------------------------------------------------------------
// Creature behaviour
// ---------------------------------------------------------------------------

export type CreaturePhase = 'dormant' | 'approach' | 'windup' | 'recover' | 'return' | 'settled';

export interface CreatureBrainInput {
  def: CreatureDef;
  phase: CreaturePhase;
  /** Seconds spent in the current phase. */
  phaseTime: number;
  distanceToPlayer: number;
  distanceToHome: number;
  health: number;
  /** True while the player stands inside a safe zone. */
  playerIsSafe: boolean;
}

export interface CreatureDecision {
  phase: CreaturePhase;
  /** True on the single frame the strike lands. */
  strikes: boolean;
  /** True while it should walk toward the player. */
  chases: boolean;
  /** True while it should walk back to its post. */
  goesHome: boolean;
}

/**
 * One tick of creature behaviour, as a pure function.
 *
 * Three forgiveness rules are baked in and are the reason this is worth having
 * as a testable unit rather than inline in the update loop:
 *
 *  1. A creature never pursues a player standing in a safe zone — it turns for
 *     home instead. Safe places genuinely are safe.
 *  2. Past its leash radius it gives up and walks back, so nothing follows the
 *     player across the map.
 *  3. The strike lands on exactly one frame, at the end of a visible windup,
 *     and is always followed by a recovery window with no attack in it.
 */
export function decideCreature(input: CreatureBrainInput): CreatureDecision {
  const { def, phase, phaseTime, distanceToPlayer, distanceToHome, playerIsSafe } = input;

  if (input.health <= 0) {
    return { phase: 'settled', strikes: false, chases: false, goesHome: false };
  }

  const abandon = playerIsSafe || distanceToHome > def.leashRadius;

  switch (phase) {
    case 'settled':
      return { phase: 'settled', strikes: false, chases: false, goesHome: false };

    case 'dormant':
      if (!abandon && distanceToPlayer <= def.noticeRadius) {
        return { phase: 'approach', strikes: false, chases: true, goesHome: false };
      }
      return {
        phase: distanceToHome > 0.6 ? 'return' : 'dormant',
        strikes: false,
        chases: false,
        goesHome: distanceToHome > 0.6,
      };

    case 'approach':
      if (abandon) return { phase: 'return', strikes: false, chases: false, goesHome: true };
      if (distanceToPlayer > def.noticeRadius * 1.6) {
        return { phase: 'return', strikes: false, chases: false, goesHome: true };
      }
      if (distanceToPlayer <= def.strikeRange) {
        return { phase: 'windup', strikes: false, chases: false, goesHome: false };
      }
      return { phase: 'approach', strikes: false, chases: true, goesHome: false };

    case 'windup': {
      // Committed: even if the player steps away the windup plays out, so the
      // dodge always has something readable to beat.
      if (phaseTime >= def.windupSeconds) {
        return {
          phase: 'recover',
          strikes: distanceToPlayer <= def.strikeRange * 1.25 && !playerIsSafe,
          chases: false,
          goesHome: false,
        };
      }
      return { phase: 'windup', strikes: false, chases: false, goesHome: false };
    }

    case 'recover':
      if (phaseTime < def.recoverySeconds) {
        return { phase: 'recover', strikes: false, chases: false, goesHome: false };
      }
      if (abandon) return { phase: 'return', strikes: false, chases: false, goesHome: true };
      return { phase: 'approach', strikes: false, chases: true, goesHome: false };

    case 'return':
      if (distanceToHome <= 0.6) {
        return { phase: 'dormant', strikes: false, chases: false, goesHome: false };
      }
      if (!abandon && distanceToPlayer <= def.noticeRadius * 0.7) {
        return { phase: 'approach', strikes: false, chases: true, goesHome: false };
      }
      return { phase: 'return', strikes: false, chases: false, goesHome: true };
  }
}

/** Number of clean hits a creature needs, for tuning checks in tests. */
export function hitsToSettle(species: CreatureSpecies, weapon: WeaponTier, charged = false): number {
  const swing = buildSwing(weapon, charged ? CHARGE_SECONDS : 0);
  return Math.ceil(CREATURES[species].maxHealth / swing.damage);
}
