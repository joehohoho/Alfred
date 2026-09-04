import { Group, Mesh, MeshBasicMaterial, PointLight, type Material } from 'three';
import {
  findGuidanceTarget,
  formatCountdown,
  isNodeAvailable,
  type NearestNodeResult,
  type ResourceNodeStates,
} from '../../core/resources.ts';
import { RESOURCES, type RegionId } from '../../core/types.ts';
import { clamp, damp, turnTowards, type Vec3 } from '../../core/vector.ts';
import { PLACES, RESOURCE_NODES, groundHeight } from '../../core/world/layout.ts';
import { makePimRig, type CharacterRig } from '../art/characters.ts';

/**
 * Pim, the wisplet.
 *
 * Scope is deliberately tiny, and the brief is explicit about why: no combat,
 * no breeding, no inventory, no collection. Pim does exactly two things —
 * follows you, and looks at the nearest thing worth gathering. When nothing is
 * ready, Pim looks at whatever comes back soonest and the HUD says when.
 *
 * Before befriending, Pim waits at a fixed spot and watches the player, which
 * is the entire "small, clear interaction" the brief asks for.
 */

export interface CompanionGuidance {
  /** The node Pim is indicating, or null when there is nothing at all. */
  target: NearestNodeResult | null;
  /** One short line for the HUD, or null when Pim has nothing to say. */
  caption: string | null;
}

export interface CompanionSystem {
  group: Group;
  position: Vec3;
  /** True once Pim is following. Mirrors the saved flag. */
  befriended: boolean;
  setBefriended(value: boolean): void;
  /** Where the player must stand to say hello. */
  meetingPoint: Vec3;
  guidance: CompanionGuidance;
  update(
    dt: number,
    nowMs: number,
    player: Vec3,
    playerFacing: number,
    nodeStates: ResourceNodeStates,
    regions: ReadonlySet<RegionId>,
    reducedMotion: boolean,
  ): void;
  /** A little hop, played when Pim has something to show or to celebrate. */
  cheer(): void;
  dispose(): void;
}

/** How far behind the player Pim settles. */
const FOLLOW_DISTANCE = 2.1;
/** Pim re-picks a guidance target at most this often, in seconds. */
const GUIDANCE_INTERVAL = 0.75;

export function createCompanion(material: Material, befriended: boolean): CompanionSystem {
  const rig: CharacterRig = makePimRig(material);
  const group = new Group();
  group.name = 'pim';
  group.add(rig.root);

  // Pim's own small light. It is the guidance cue and it also means the player
  // is never walking through the glade with nothing warm nearby.
  const lantern = new PointLight(0xfff0c0, 0.45, 6, 2);
  lantern.position.set(0, 0.55, -0.25);
  group.add(lantern);

  const meeting: Vec3 = {
    x: PLACES.pimMeeting.x,
    y: groundHeight(PLACES.pimMeeting.x, PLACES.pimMeeting.z),
    z: PLACES.pimMeeting.z,
  };
  const position: Vec3 = { ...meeting };
  group.position.set(position.x, position.y, position.z);

  let following = befriended;
  let facing = 0;
  let bob = 0;
  let cheerTimer = 0;
  let guidanceTimer = 0;
  let guidance: CompanionGuidance = { target: null, caption: null };

  const captionFor = (result: NearestNodeResult | null, nowMs: number): string | null => {
    if (!result) return null;
    const name = RESOURCES[result.def.resource].plural;
    if (isNodeAvailable(result.def, undefined, nowMs) && result.available) {
      return `Pim has found ${name.toLowerCase()} nearby.`;
    }
    return `Pim says the ${name.toLowerCase()} come back in ${formatCountdown(result.renewInMs)}.`;
  };

  return {
    group,
    position,
    meetingPoint: meeting,
    get befriended() {
      return following;
    },
    get guidance() {
      return guidance;
    },

    setBefriended(value) {
      following = value;
      if (value) cheerTimer = 0.9;
    },

    update(dt, nowMs, player, playerFacing, nodeStates, regions, reducedMotion) {
      bob += dt * (reducedMotion ? 1.1 : 2.4);
      cheerTimer = Math.max(0, cheerTimer - dt);

      guidanceTimer -= dt;
      if (guidanceTimer <= 0) {
        guidanceTimer = GUIDANCE_INTERVAL;
        const target = following
          ? findGuidanceTarget(RESOURCE_NODES, nodeStates, player, nowMs, regions)
          : null;
        guidance = { target, caption: captionFor(target, nowMs) };
      }

      let goalX: number;
      let goalZ: number;
      let lookX: number;
      let lookZ: number;

      if (!following) {
        // Waiting: hover over the meeting spot and watch whoever comes near.
        goalX = meeting.x;
        goalZ = meeting.z;
        lookX = player.x;
        lookZ = player.z;
      } else {
        // Follow just behind and to one side, so Pim never occludes the player.
        const behind = playerFacing + Math.PI * 0.78;
        goalX = player.x + Math.sin(behind) * FOLLOW_DISTANCE;
        goalZ = player.z + Math.cos(behind) * FOLLOW_DISTANCE;

        // When a resource is close by, drift toward it instead — that drift is
        // the guidance. Pim never leaves the player's side to do it.
        const target = guidance.target;
        if (target && target.available && target.distance < 14) {
          const pull = clamp(1 - target.distance / 14, 0, 1) * 0.55;
          goalX += (target.def.position.x - goalX) * pull;
          goalZ += (target.def.position.z - goalZ) * pull;
          lookX = target.def.position.x;
          lookZ = target.def.position.z;
        } else {
          lookX = player.x;
          lookZ = player.z;
        }
      }

      const rate = following ? 4.2 : 2.4;
      position.x = damp(position.x, goalX, rate, dt);
      position.z = damp(position.z, goalZ, rate, dt);
      const hover = 0.65 + Math.sin(bob) * (reducedMotion ? 0.03 : 0.11) + (cheerTimer > 0 ? Math.sin(cheerTimer * 12) * 0.22 : 0);
      position.y = damp(position.y, groundHeight(position.x, position.z) + hover, 8, dt);

      group.position.set(position.x, position.y, position.z);
      facing = turnTowards(facing, Math.atan2(lookX - position.x, lookZ - position.z), 6 * dt);
      group.rotation.y = facing;

      // The lantern brightens when Pim is actually pointing at something ready.
      const pointing = following && guidance.target?.available === true;
      lantern.intensity = damp(lantern.intensity, pointing ? 0.85 : 0.4, 4, dt);
      rig.body.rotation.z = Math.sin(bob * 0.7) * (reducedMotion ? 0.02 : 0.08);
      if (rig.tool) rig.tool.rotation.x = Math.sin(bob * 1.3) * 0.18;
    },

    cheer() {
      cheerTimer = 0.9;
    },

    dispose() {
      group.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          if (child.material instanceof MeshBasicMaterial) child.material.dispose();
        }
      });
      group.clear();
    },
  };
}
