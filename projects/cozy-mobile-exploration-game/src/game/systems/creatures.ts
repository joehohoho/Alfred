import { Group, Mesh, type Material } from 'three';
import {
  CREATURES,
  applyDamage,
  decideCreature,
  resolveArcAttack,
  selectTarget,
  type AttackSwing,
  type CreatureDef,
  type CreaturePhase,
  type CreatureSpecies,
  type HitCandidate,
} from '../../core/combat.ts';
import { clamp, damp, turnTowards, type Vec3 } from '../../core/vector.ts';
import type { RegionId } from '../../core/types.ts';
import {
  CREATURE_POSTS,
  groundHeight,
  isInsideSafeZone,
  type CreaturePost,
} from '../../core/world/layout.ts';
import { makeBramblehornRig, makeThistleburRig, type CharacterRig } from '../art/characters.ts';
import { createBlobShadow } from './blobShadow.ts';
import { resolveMove, type GateState } from './collision.ts';

/**
 * Creatures.
 *
 * The *decisions* live in `core/combat.ts` as a pure function; this file is
 * only the body around that brain — meshes, positions, animation and the
 * bookkeeping of who is currently settled. Keeping the split means the
 * forgiveness rules (never chase into a safe zone, always telegraph, one strike
 * per windup) are unit-tested without a scene.
 */

export interface CreatureInstance {
  id: string;
  post: CreaturePost;
  def: CreatureDef;
  rig: CharacterRig;
  group: Group;
  position: Vec3;
  facing: number;
  health: number;
  phase: CreaturePhase;
  phaseTime: number;
  /** Epoch ms when it lay down, or null while it is up. */
  settledAt: number | null;
  /** Counts down after a hit; drives the flinch. */
  hurtTimer: number;
  /** Counts up while settling, for the lie-down animation. */
  settleTimer: number;
  bobPhase: number;
}

export interface StrikeEvent {
  creature: CreatureInstance;
  damage: number;
}

export interface SettleEvent {
  creature: CreatureInstance;
  cores: number;
}

export interface CreatureSystem {
  group: Group;
  instances: CreatureInstance[];
  /** Creatures that are currently up and can be hit. */
  active(): CreatureInstance[];
  update(
    dt: number,
    nowMs: number,
    player: Vec3,
    playerIsSafe: boolean,
    gates: GateState,
    regions: ReadonlySet<RegionId>,
    guardianDefeated: boolean,
  ): StrikeEvent[];
  /** Applies a player swing. Returns whoever was hit and whoever settled. */
  applySwing(
    origin: Vec3,
    facing: number,
    swing: AttackSwing,
    nowMs: number,
  ): { hits: CreatureInstance[]; settled: SettleEvent[] };
  /** Nearest hittable creature, for the soft target assist. */
  nearestTarget(origin: Vec3, facing: number, range: number): CreatureInstance | null;
  /** Forces the guardian to be settled and gone. */
  removeGuardian(): void;
  /** Puts every creature back on its post. Used by the reset action. */
  resetAll(): void;
  dispose(): void;
}

const SETTLE_ANIMATION_SECONDS = 0.9;

export function createCreatures(material: Material): CreatureSystem {
  const group = new Group();
  group.name = 'creatures';

  const instances: CreatureInstance[] = CREATURE_POSTS.map((post) => {
    const def = CREATURES[post.species as CreatureSpecies];
    const rig = post.species === 'bramblehorn' ? makeBramblehornRig(material) : makeThistleburRig(material);
    const holder = new Group();
    holder.add(rig.root);
    holder.add(createBlobShadow(def.bodyRadius * 1.15));
    holder.position.set(post.home.x, groundHeight(post.home.x, post.home.z), post.home.z);
    group.add(holder);

    return {
      id: post.id,
      post,
      def,
      rig,
      group: holder,
      position: { x: post.home.x, y: groundHeight(post.home.x, post.home.z), z: post.home.z },
      facing: 0,
      health: def.maxHealth,
      phase: 'dormant' as CreaturePhase,
      phaseTime: 0,
      settledAt: null,
      hurtTimer: 0,
      settleTimer: 0,
      bobPhase: Math.random() * Math.PI * 2,
    };
  });

  const byId = new Map(instances.map((instance) => [instance.id, instance]));

  const revive = (instance: CreatureInstance) => {
    instance.health = instance.def.maxHealth;
    instance.phase = 'dormant';
    instance.phaseTime = 0;
    instance.settledAt = null;
    instance.settleTimer = 0;
    instance.hurtTimer = 0;
    instance.position = {
      x: instance.post.home.x,
      y: groundHeight(instance.post.home.x, instance.post.home.z),
      z: instance.post.home.z,
    };
    instance.group.position.set(instance.position.x, instance.position.y, instance.position.z);
    instance.group.visible = true;
    instance.rig.body.rotation.set(0, 0, 0);
    instance.rig.body.position.y = instance.def.species === 'bramblehorn' ? 1.05 : 0.42;
  };

  const isPresent = (
    instance: CreatureInstance,
    regions: ReadonlySet<RegionId>,
    guardianDefeated: boolean,
  ): boolean => {
    if (!regions.has(instance.post.region)) return false;
    // The guardian is a one-time encounter, not a respawning enemy.
    if (instance.def.species === 'bramblehorn' && guardianDefeated) return false;
    return true;
  };

  const animate = (instance: CreatureInstance, dt: number, moving: boolean) => {
    const { rig, def } = instance;
    instance.bobPhase += dt * (moving ? 9 : 3.4);

    if (instance.settledAt !== null) {
      // Settling: sink, tip over, and go still. Never a death animation.
      const t = clamp(instance.settleTimer / SETTLE_ANIMATION_SECONDS, 0, 1);
      const eased = 1 - (1 - t) * (1 - t);
      rig.body.rotation.z = eased * 0.85;
      rig.body.position.y = (def.species === 'bramblehorn' ? 1.05 : 0.42) - eased * 0.3;
      instance.group.scale.setScalar(1 - eased * 0.12);
      return;
    }

    instance.group.scale.setScalar(1);
    const windup = instance.phase === 'windup' ? clamp(instance.phaseTime / def.windupSeconds, 0, 1) : 0;
    const recovering = instance.phase === 'recover';

    // The windup is the whole readability contract: rear back, then snap.
    rig.body.rotation.x = -windup * 0.55 + (recovering ? 0.4 : 0);
    rig.body.position.y =
      (def.species === 'bramblehorn' ? 1.05 : 0.42) +
      Math.abs(Math.sin(instance.bobPhase)) * (moving ? 0.09 : 0.035) +
      windup * 0.18;
    rig.body.rotation.z = instance.hurtTimer > 0 ? Math.sin(instance.hurtTimer * 46) * 0.16 : 0;

    const swing = Math.sin(instance.bobPhase) * (moving ? 0.65 : 0.18);
    if (rig.legLeft) rig.legLeft.rotation.x = swing;
    if (rig.legRight) rig.legRight.rotation.x = -swing;
    if (rig.armLeft) rig.armLeft.rotation.x = -swing;
    if (rig.armRight) rig.armRight.rotation.x = swing;
  };

  return {
    group,
    instances,

    active() {
      return instances.filter((instance) => instance.settledAt === null && instance.group.visible);
    },

    update(dt, nowMs, player, playerIsSafe, gates, regions, guardianDefeated) {
      const strikes: StrikeEvent[] = [];

      for (const instance of instances) {
        const present = isPresent(instance, regions, guardianDefeated);
        if (!present) {
          instance.group.visible = false;
          continue;
        }

        // Respawn. `respawnSeconds === 0` means "never" — that is the guardian.
        if (instance.settledAt !== null) {
          instance.settleTimer += dt;
          animate(instance, dt, false);
          const respawnMs = instance.post.respawnSeconds * 1000;
          if (respawnMs > 0 && nowMs - instance.settledAt >= respawnMs) {
            // Do not pop back into existence in the player's face.
            const distance = Math.hypot(
              player.x - instance.post.home.x,
              player.z - instance.post.home.z,
            );
            if (distance > instance.def.noticeRadius * 1.3) revive(instance);
          } else if (nowMs - instance.settledAt > SETTLE_ANIMATION_SECONDS * 1000 + 600) {
            instance.group.visible = respawnMs > 0;
          }
          continue;
        }

        instance.group.visible = true;
        instance.hurtTimer = Math.max(0, instance.hurtTimer - dt);

        const distanceToPlayer = Math.hypot(player.x - instance.position.x, player.z - instance.position.z);
        const distanceToHome = Math.hypot(
          instance.post.home.x - instance.position.x,
          instance.post.home.z - instance.position.z,
        );

        const decision = decideCreature({
          def: instance.def,
          phase: instance.phase,
          phaseTime: instance.phaseTime,
          distanceToPlayer,
          distanceToHome,
          health: instance.health,
          playerIsSafe,
        });

        if (decision.phase !== instance.phase) {
          instance.phase = decision.phase;
          instance.phaseTime = 0;
        } else {
          instance.phaseTime += dt;
        }

        if (decision.strikes) strikes.push({ creature: instance, damage: instance.def.contactDamage });

        let moving = false;
        if (decision.chases || decision.goesHome) {
          const targetX = decision.chases ? player.x : instance.post.home.x;
          const targetZ = decision.chases ? player.z : instance.post.home.z;
          const dx = targetX - instance.position.x;
          const dz = targetZ - instance.position.z;
          const length = Math.hypot(dx, dz);
          if (length > 0.05) {
            moving = true;
            const speed = instance.def.moveSpeed * (decision.goesHome ? 0.7 : 1);
            const resolved = resolveMove(
              instance.position,
              instance.position.x + (dx / length) * speed * dt,
              instance.position.z + (dz / length) * speed * dt,
              instance.def.bodyRadius,
              gates,
            );
            // A creature must never walk into a safe zone, even chasing.
            const wouldEnterSafety = isInsideSafeZone({ x: resolved.x, y: 0, z: resolved.z });
            if (!wouldEnterSafety) {
              instance.position.x = resolved.x;
              instance.position.z = resolved.z;
            }
            instance.facing = turnTowards(instance.facing, Math.atan2(dx, dz), 7 * dt);
          }
        } else if (decision.phase === 'windup' || decision.phase === 'recover') {
          instance.facing = turnTowards(
            instance.facing,
            Math.atan2(player.x - instance.position.x, player.z - instance.position.z),
            5 * dt,
          );
        }

        instance.position.y = damp(
          instance.position.y,
          groundHeight(instance.position.x, instance.position.z),
          18,
          dt,
        );
        instance.group.position.set(instance.position.x, instance.position.y, instance.position.z);
        instance.group.rotation.y = instance.facing;
        animate(instance, dt, moving);
      }

      return strikes;
    },

    applySwing(origin, facing, swing, nowMs) {
      const candidates: HitCandidate[] = this.active().map((instance) => ({
        id: instance.id,
        position: instance.position,
        bodyRadius: instance.def.bodyRadius,
      }));
      const hitIds = resolveArcAttack(origin, facing, swing, candidates);

      const hits: CreatureInstance[] = [];
      const settled: SettleEvent[] = [];
      for (const id of hitIds) {
        const instance = byId.get(id);
        if (!instance || instance.settledAt !== null) continue;
        const result = applyDamage(instance.health, instance.def.maxHealth, swing.damage);
        instance.health = result.health;
        instance.hurtTimer = 0.24;
        hits.push(instance);
        if (result.defeated) {
          instance.settledAt = nowMs;
          instance.settleTimer = 0;
          instance.phase = 'settled';
          settled.push({ creature: instance, cores: instance.def.coreDrop });
        }
      }
      return { hits, settled };
    },

    nearestTarget(origin, facing, range) {
      const candidates: HitCandidate[] = this.active().map((instance) => ({
        id: instance.id,
        position: instance.position,
        bodyRadius: instance.def.bodyRadius,
      }));
      const id = selectTarget(origin, facing, candidates, range);
      return id ? (byId.get(id) ?? null) : null;
    },

    removeGuardian() {
      const guardian = instances.find((instance) => instance.def.species === 'bramblehorn');
      if (guardian) {
        guardian.health = 0;
        guardian.phase = 'settled';
        guardian.group.visible = false;
      }
    },

    resetAll() {
      for (const instance of instances) revive(instance);
    },

    dispose() {
      for (const instance of instances) {
        instance.group.traverse((child) => {
          if (child instanceof Mesh) child.geometry.dispose();
        });
      }
      group.clear();
    },
  };
}
