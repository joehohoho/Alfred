import { Group, Mesh, type Material } from 'three';
import {
  DODGE,
  buildSwing,
  canDodge,
  dodgeSpeedMultiplier,
  idleDodge,
  isDodging,
  isInvulnerable,
  startDodge,
  tickDodge,
  type AttackSwing,
  type DodgeState,
} from '../../core/combat.ts';
import { WEAPONS, type WeaponTier } from '../../core/recipes.ts';
import { clamp, damp, normalizeMoveInput, turnTowards, type Vec2 } from '../../core/vector.ts';
import { groundHeight } from '../../core/world/layout.ts';
import { CAMERA_YAW } from '../camera.ts';
import { makeChimeGeometry, makePlayerRig, type CharacterRig } from '../art/characters.ts';
import { createBlobShadow } from './blobShadow.ts';
import { resolveMove, type GateState } from './collision.ts';

/**
 * The player character.
 *
 * Movement is camera-relative: the joystick's "up" is always "away from the
 * camera", never world +Z. On a fixed isometric camera that is the only
 * mapping that does not feel wrong, and it is why `CAMERA_YAW` is imported here
 * rather than the controller working in world axes.
 */

export const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 4.7;
/** How fast the character turns to face the direction of travel, rad/s. */
const TURN_RATE = 13;

export interface PlayerInput {
  move: Vec2;
  attackHeld: boolean;
  dodgePressed: boolean;
}

export interface SwingEvent {
  swing: AttackSwing;
  origin: { x: number; y: number; z: number };
  facing: number;
}

export interface PlayerSystem {
  rig: CharacterRig;
  group: Group;
  position: { x: number; y: number; z: number };
  facing: number;
  /** 0..1 normalised movement speed, for camera lead and animation. */
  speed: number;
  dodge: DodgeState;
  /** Seconds of attack-button hold accumulated so far, 0 when not charging. */
  chargeSeconds: number;
  /** True while the swing animation is playing. */
  swinging: boolean;
  invulnerable: boolean;
  weapon: WeaponTier;
  setWeapon(tier: WeaponTier): void;
  setPosition(x: number, z: number): void;
  /** Advances one frame. Returns a swing when one lands this frame. */
  update(dt: number, input: PlayerInput, gates: GateState, canAct: boolean): SwingEvent | null;
  /** Plays the small recoil when the player is hit. */
  onHurt(): void;
  dispose(): void;
}

export function createPlayer(
  material: Material,
  weapon: WeaponTier,
  startX: number,
  startZ: number,
): PlayerSystem {
  const rig = makePlayerRig(material, weapon === 'bright-chime');
  const group = new Group();
  group.add(rig.root);
  group.add(createBlobShadow(0.44));

  const position = { x: startX, y: groundHeight(startX, startZ), z: startZ };
  group.position.set(position.x, position.y, position.z);

  let facing = 0;
  let speed = 0;
  let dodge = idleDodge();
  let chargeSeconds = 0;
  let attackCooldown = 0;
  let swingTimer = 0;
  let hurtTimer = 0;
  let bobPhase = 0;
  let currentWeapon = weapon;
  let wasAttackHeld = false;

  const swapChime = (tier: WeaponTier) => {
    const tool = rig.tool;
    if (!tool) return;
    const held = tool.children[0];
    if (held instanceof Mesh) {
      held.geometry.dispose();
      held.geometry = makeChimeGeometry(tier === 'bright-chime');
    }
  };

  return {
    rig,
    group,
    position,
    get facing() {
      return facing;
    },
    get speed() {
      return speed;
    },
    get dodge() {
      return dodge;
    },
    get chargeSeconds() {
      return chargeSeconds;
    },
    get swinging() {
      return swingTimer > 0;
    },
    get invulnerable() {
      return isInvulnerable(dodge);
    },
    get weapon() {
      return currentWeapon;
    },

    setWeapon(tier) {
      if (tier === currentWeapon) return;
      currentWeapon = tier;
      swapChime(tier);
    },

    setPosition(x, z) {
      position.x = x;
      position.z = z;
      position.y = groundHeight(x, z);
      group.position.set(position.x, position.y, position.z);
      speed = 0;
      dodge = idleDodge();
      chargeSeconds = 0;
      swingTimer = 0;
    },

    update(dt, input, gates, canAct) {
      dodge = tickDodge(dodge, dt);
      attackCooldown = Math.max(0, attackCooldown - dt);
      swingTimer = Math.max(0, swingTimer - dt);
      hurtTimer = Math.max(0, hurtTimer - dt);

      const move = canAct ? normalizeMoveInput(input.move) : { x: 0, y: 0 };
      const magnitude = Math.hypot(move.x, move.y);

      // Screen-space input into world-space direction, using the fixed camera
      // yaw. Screen "up" is away from the camera.
      const cos = Math.cos(CAMERA_YAW);
      const sin = Math.sin(CAMERA_YAW);
      let dirX = move.x * cos - move.y * sin;
      let dirZ = -move.x * sin - move.y * cos;

      if (canAct && input.dodgePressed && canDodge(dodge)) {
        // Dodging with no stick input rolls the way the player is looking,
        // which is what everyone expects and is easier on a phone.
        const heading = magnitude > 0.01 ? Math.atan2(dirX, dirZ) : facing;
        dodge = startDodge(dodge, heading);
        chargeSeconds = 0;
      }

      let stepSpeed = WALK_SPEED * magnitude;
      if (isDodging(dodge)) {
        dirX = Math.sin(dodge.heading);
        dirZ = Math.cos(dodge.heading);
        stepSpeed = WALK_SPEED * dodgeSpeedMultiplier(dodge);
        facing = dodge.heading;
      } else if (magnitude > 0.01) {
        facing = turnTowards(facing, Math.atan2(dirX, dirZ), TURN_RATE * dt);
      }

      // Swinging roots the player briefly. It is short — 0.16s — because a
      // cosy game should never feel like it took the controls away.
      const rooted = swingTimer > 0.001 && !isDodging(dodge);
      if (rooted) stepSpeed = 0;

      if (stepSpeed > 0) {
        const resolved = resolveMove(
          position,
          position.x + dirX * stepSpeed * dt,
          position.z + dirZ * stepSpeed * dt,
          PLAYER_RADIUS,
          gates,
        );
        position.x = resolved.x;
        position.z = resolved.z;
      }
      position.y = groundHeight(position.x, position.z);
      group.position.set(position.x, position.y, position.z);
      group.rotation.y = facing;

      speed = damp(speed, isDodging(dodge) ? 1 : magnitude, 14, dt);

      // --- Attack -----------------------------------------------------------
      let event: SwingEvent | null = null;
      const attackHeld = canAct && input.attackHeld && !isDodging(dodge);

      if (attackHeld) {
        chargeSeconds += dt;
      }

      const released = wasAttackHeld && !attackHeld;
      // Hold-to-repeat: a held button keeps swinging on the weapon's cadence,
      // so the player never has to tap quickly. A release fires immediately if
      // a charge was building, which is what makes charging feel deliberate.
      const wantsSwing = attackHeld || released;

      if (wantsSwing && attackCooldown <= 0) {
        const swing = buildSwing(currentWeapon, chargeSeconds);
        event = {
          swing,
          origin: { x: position.x, y: position.y + 0.8, z: position.z },
          facing,
        };
        attackCooldown = swing.cooldown;
        swingTimer = 0.16;
        chargeSeconds = 0;
      } else if (!attackHeld) {
        chargeSeconds = 0;
      }
      wasAttackHeld = attackHeld;

      // --- Animation --------------------------------------------------------
      const stride = speed;
      bobPhase += dt * (5.5 + stride * 5.5);

      const rolling = isDodging(dodge);
      const rollT = rolling ? dodge.elapsed / DODGE.durationSeconds : 0;

      rig.body.position.y = rolling
        ? -0.25 + Math.sin(rollT * Math.PI) * 0.1
        : Math.abs(Math.sin(bobPhase)) * 0.045 * stride;
      // The roll is a forward tuck rather than a full somersault — readable at
      // a glance and it never hides the character's face for long.
      rig.body.rotation.x = rolling ? Math.sin(rollT * Math.PI) * 1.5 : stride * 0.11;
      rig.body.rotation.z = rolling ? 0 : Math.sin(bobPhase) * 0.03 * stride;

      const swingT = swingTimer > 0 ? 1 - swingTimer / 0.16 : -1;
      if (rig.armRight) {
        rig.armRight.rotation.x =
          swingT >= 0
            ? -2.1 + swingT * 3.1
            : clamp(-0.5 - chargeSeconds * 1.6, -1.9, -0.5) - Math.sin(bobPhase) * 0.35 * stride;
        rig.armRight.rotation.z = swingT >= 0 ? -0.5 + swingT * 0.9 : -0.15;
      }
      if (rig.armLeft) {
        rig.armLeft.rotation.x = Math.sin(bobPhase) * 0.55 * stride + (hurtTimer > 0 ? -0.6 : 0);
        rig.armLeft.rotation.z = 0.12;
      }
      if (rig.legLeft) rig.legLeft.rotation.x = Math.sin(bobPhase) * 0.7 * stride;
      if (rig.legRight) rig.legRight.rotation.x = -Math.sin(bobPhase) * 0.7 * stride;

      // A charged swing tilts the head down, telegraphing it to the player.
      rig.head.rotation.x = -chargeSeconds * 0.35 + (hurtTimer > 0 ? 0.35 : 0);
      rig.root.visible = !(isInvulnerable(dodge) && Math.floor(dodge.elapsed * 30) % 2 === 0);

      return event;
    },

    onHurt() {
      hurtTimer = 0.32;
    },

    dispose() {
      group.clear();
    },
  };
}

/** Reach used for the soft target assist, slightly beyond the weapon's arc. */
export function assistRange(weapon: WeaponTier): number {
  return WEAPONS[weapon].range + 1.2;
}
