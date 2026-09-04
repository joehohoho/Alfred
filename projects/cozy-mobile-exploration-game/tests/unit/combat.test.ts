import { describe, expect, it } from 'vitest';
import {
  CHARGE_SECONDS,
  CREATURES,
  DODGE,
  applyDamage,
  buildSwing,
  canDodge,
  decideCreature,
  dodgeSpeedMultiplier,
  hitsToSettle,
  idleDodge,
  isDodging,
  isInvulnerable,
  resolveArcAttack,
  selectTarget,
  startDodge,
  tickDodge,
  type CreatureBrainInput,
  type CreaturePhase,
} from '../../src/core/combat.ts';
import { WEAPONS } from '../../src/core/recipes.ts';
import { vec3 } from '../../src/core/vector.ts';

/** Headings use atan2(x, z): 0 = +Z, PI/2 = +X. */
const NORTH = 0;
const EAST = Math.PI / 2;

describe('damage', () => {
  it('clamps at zero and reports how much actually landed', () => {
    expect(applyDamage(100, 100, 30)).toEqual({ health: 70, applied: 30, defeated: false });
    expect(applyDamage(10, 100, 999)).toEqual({ health: 0, applied: 10, defeated: true });
    expect(applyDamage(0, 100, 5)).toEqual({ health: 0, applied: 0, defeated: true });
  });

  it('ignores negative damage rather than healing with it', () => {
    expect(applyDamage(50, 100, -20).health).toBe(50);
  });
});

describe('swings', () => {
  it('a tap is a base swing, a hold is a charged one', () => {
    const tap = buildSwing('willow-chime', 0);
    expect(tap.charged).toBe(false);
    expect(tap.damage).toBe(WEAPONS['willow-chime'].damage);

    const held = buildSwing('willow-chime', CHARGE_SECONDS);
    expect(held.charged).toBe(true);
    expect(held.damage).toBeGreaterThan(tap.damage);
    expect(held.range).toBeGreaterThan(tap.range);
    expect(held.arcDegrees).toBeGreaterThan(tap.arcDegrees);
  });

  it('the upgrade is a clear improvement over the starter', () => {
    expect(buildSwing('bright-chime', 0).damage).toBeGreaterThan(
      buildSwing('willow-chime', 0).damage,
    );
    expect(WEAPONS['bright-chime'].cooldown).toBeLessThan(WEAPONS['willow-chime'].cooldown);
  });

  it('keeps the fight short enough to stay cosy', () => {
    // A thistlebur should never be a slog, and the upgrade should be felt.
    expect(hitsToSettle('thistlebur', 'willow-chime')).toBe(3);
    expect(hitsToSettle('thistlebur', 'bright-chime')).toBe(2);
    expect(hitsToSettle('thistlebur', 'bright-chime', true)).toBe(1);
    // The guardian is a real encounter but not a marathon.
    expect(hitsToSettle('bramblehorn', 'bright-chime')).toBeLessThanOrEqual(10);
    expect(hitsToSettle('bramblehorn', 'bright-chime', true)).toBeLessThanOrEqual(4);
  });
});

describe('arc attack', () => {
  const target = (id: string, x: number, z: number, bodyRadius = 0.5) => ({
    id,
    position: vec3(x, 0, z),
    bodyRadius,
  });
  const swing = buildSwing('willow-chime', 0);

  it('hits what is in front and misses what is behind', () => {
    const hits = resolveArcAttack(
      vec3(0, 0, 0),
      NORTH,
      swing,
      [target('front', 0, 2), target('behind', 0, -2)],
    );
    expect(hits).toEqual(['front']);
  });

  it('misses anything out of reach', () => {
    const hits = resolveArcAttack(vec3(0, 0, 0), NORTH, swing, [target('far', 0, 20)]);
    expect(hits).toEqual([]);
  });

  it('counts the target body radius toward reach so big creatures are hittable', () => {
    const justPast = swing.range + 0.4;
    expect(
      resolveArcAttack(vec3(0, 0, 0), NORTH, swing, [target('small', 0, justPast, 0.1)]),
    ).toEqual([]);
    expect(
      resolveArcAttack(vec3(0, 0, 0), NORTH, swing, [target('big', 0, justPast, 1.2)]),
    ).toEqual(['big']);
  });

  it('respects the arc width', () => {
    const wide = buildSwing('willow-chime', CHARGE_SECONDS);
    // 35 degrees off-centre: outside the 62-degree tap arc (31 deg half-angle),
    // inside the 77.5-degree charged arc (38.75 deg half-angle).
    const angle = (35 * Math.PI) / 180;
    const spot = target('side', Math.sin(angle) * 2, Math.cos(angle) * 2);
    expect(resolveArcAttack(vec3(0, 0, 0), NORTH, swing, [spot])).toEqual([]);
    expect(resolveArcAttack(vec3(0, 0, 0), NORTH, wide, [spot])).toEqual(['side']);
  });

  it('always hits something standing on top of the player', () => {
    expect(
      resolveArcAttack(vec3(0, 0, 0), NORTH, swing, [target('hug', 0.01, 0.01)]),
    ).toEqual(['hug']);
  });

  it('hits everything in the cone, not just the nearest', () => {
    const hits = resolveArcAttack(
      vec3(0, 0, 0),
      EAST,
      swing,
      [target('a', 1, 0), target('b', 2, 0.3), target('c', -1, 0)],
    );
    expect(hits.sort()).toEqual(['a', 'b']);
  });
});

describe('target selection', () => {
  const t = (id: string, x: number, z: number) => ({ id, position: vec3(x, 0, z), bodyRadius: 0.5 });

  it('prefers what the player is facing over what is closer behind', () => {
    const picked = selectTarget(vec3(0, 0, 0), NORTH, [t('behind', 0, -1), t('ahead', 0, 3)], 8);
    expect(picked).toBe('ahead');
  });

  it('breaks ties on distance within the cone', () => {
    expect(selectTarget(vec3(0, 0, 0), NORTH, [t('far', 0, 5), t('near', 0, 2)], 8)).toBe('near');
  });

  it('falls back to something behind when nothing is ahead', () => {
    expect(selectTarget(vec3(0, 0, 0), NORTH, [t('behind', 0, -3)], 8)).toBe('behind');
  });

  it('returns null when everything is out of range', () => {
    expect(selectTarget(vec3(0, 0, 0), NORTH, [t('far', 0, 40)], 8)).toBeNull();
    expect(selectTarget(vec3(0, 0, 0), NORTH, [], 8)).toBeNull();
  });
});

describe('dodge', () => {
  it('grants invulnerability for the readable part of the roll', () => {
    const rolling = startDodge(idleDodge(), NORTH);
    expect(isDodging(rolling)).toBe(true);
    expect(isInvulnerable(rolling)).toBe(true);

    const late = tickDodge(rolling, DODGE.invulnerableSeconds + 0.01);
    expect(isInvulnerable(late)).toBe(false);
    expect(isDodging(late)).toBe(true);
  });

  it('covers most of the roll with i-frames, which is the forgiving part', () => {
    expect(DODGE.invulnerableSeconds / DODGE.durationSeconds).toBeGreaterThan(0.6);
  });

  it('cannot be spammed', () => {
    let dodge = startDodge(idleDodge(), NORTH);
    expect(canDodge(dodge)).toBe(false);
    dodge = tickDodge(dodge, DODGE.durationSeconds);
    expect(isDodging(dodge)).toBe(false);
    // Still cooling down right after the roll ends.
    expect(canDodge(dodge)).toBe(false);
    dodge = tickDodge(dodge, DODGE.cooldownSeconds);
    expect(canDodge(dodge)).toBe(true);
  });

  it('ignores a dodge request mid-roll', () => {
    const rolling = startDodge(idleDodge(), NORTH);
    const again = startDodge(rolling, EAST);
    expect(again.heading).toBe(NORTH);
    expect(again).toBe(rolling);
  });

  it('bursts fast then eases out', () => {
    const rolling = startDodge(idleDodge(), NORTH);
    const start = dodgeSpeedMultiplier(rolling);
    const middle = dodgeSpeedMultiplier(tickDodge(rolling, DODGE.durationSeconds / 2));
    const end = dodgeSpeedMultiplier(tickDodge(rolling, DODGE.durationSeconds));
    expect(start).toBeCloseTo(DODGE.speedMultiplier, 6);
    expect(middle).toBeLessThan(start);
    expect(middle).toBeGreaterThan(end);
    expect(end).toBe(1);
  });
});

describe('creature brain', () => {
  const base = (over: Partial<CreatureBrainInput> = {}): CreatureBrainInput => ({
    def: CREATURES.thistlebur,
    phase: 'dormant',
    phaseTime: 0,
    distanceToPlayer: 100,
    distanceToHome: 0,
    health: 30,
    playerIsSafe: false,
    ...over,
  });

  it('sleeps until the player comes close', () => {
    expect(decideCreature(base()).phase).toBe('dormant');
    expect(decideCreature(base({ distanceToPlayer: 5 })).phase).toBe('approach');
  });

  it('never pursues a player standing in a safe zone', () => {
    const decision = decideCreature(
      base({ phase: 'approach', distanceToPlayer: 1, playerIsSafe: true, distanceToHome: 5 }),
    );
    expect(decision.phase).toBe('return');
    expect(decision.chases).toBe(false);
    expect(decision.goesHome).toBe(true);
  });

  it('will not wake up at all for a player inside a safe zone', () => {
    expect(decideCreature(base({ distanceToPlayer: 1, playerIsSafe: true })).chases).toBe(false);
  });

  it('gives up past its leash and walks home', () => {
    const decision = decideCreature(
      base({ phase: 'approach', distanceToPlayer: 2, distanceToHome: 99 }),
    );
    expect(decision.phase).toBe('return');
    expect(decision.goesHome).toBe(true);
  });

  it('telegraphs, then lands exactly one strike, then recovers', () => {
    const winding = decideCreature(base({ phase: 'approach', distanceToPlayer: 1 }));
    expect(winding.phase).toBe('windup');
    expect(winding.strikes).toBe(false);

    const midWindup = decideCreature(
      base({ phase: 'windup', phaseTime: 0.2, distanceToPlayer: 1 }),
    );
    expect(midWindup.strikes).toBe(false);

    const landing = decideCreature(
      base({ phase: 'windup', phaseTime: CREATURES.thistlebur.windupSeconds, distanceToPlayer: 1 }),
    );
    expect(landing.strikes).toBe(true);
    expect(landing.phase).toBe('recover');

    const recovering = decideCreature(base({ phase: 'recover', phaseTime: 0.1 }));
    expect(recovering.strikes).toBe(false);
    expect(recovering.chases).toBe(false);
  });

  it('whiffs when the player dodged out of reach, but still commits to the windup', () => {
    const decision = decideCreature(
      base({
        phase: 'windup',
        phaseTime: CREATURES.thistlebur.windupSeconds,
        distanceToPlayer: 9,
      }),
    );
    expect(decision.strikes).toBe(false);
    expect(decision.phase).toBe('recover');
  });

  it('cannot strike a player who reached safety during the windup', () => {
    const decision = decideCreature(
      base({
        phase: 'windup',
        phaseTime: CREATURES.thistlebur.windupSeconds,
        distanceToPlayer: 1,
        playerIsSafe: true,
      }),
    );
    expect(decision.strikes).toBe(false);
  });

  it('settles at zero health from any phase', () => {
    const phases: CreaturePhase[] = ['dormant', 'approach', 'windup', 'recover', 'return'];
    for (const phase of phases) {
      expect(decideCreature(base({ phase, health: 0 })).phase).toBe('settled');
    }
  });

  it('stays settled', () => {
    expect(decideCreature(base({ phase: 'settled', health: 30, distanceToPlayer: 0 })).phase).toBe(
      'settled',
    );
  });

  it('reaches home and goes dormant', () => {
    expect(decideCreature(base({ phase: 'return', distanceToHome: 0.1 })).phase).toBe('dormant');
    expect(decideCreature(base({ phase: 'return', distanceToHome: 8 })).goesHome).toBe(true);
  });
});
