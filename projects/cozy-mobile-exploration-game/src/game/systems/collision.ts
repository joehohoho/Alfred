import {
  BLOCKING_PROP_KINDS,
  GATES,
  PROPS,
  PROP_COLLISION_RADIUS,
  WORLD,
  type GateDef,
} from '../../core/world/layout.ts';
import { clamp, type Vec3 } from '../../core/vector.ts';

/**
 * Movement blocking.
 *
 * Three things stop the player: the world edge, solid scenery, and a locked
 * gate. All three resolve by *sliding* rather than stopping — walking into a
 * tree at an angle should carry you around it. A cosy game that catches the
 * player on geometry has failed at the one thing it is for.
 */

export interface Blocker {
  x: number;
  z: number;
  radius: number;
}

const CELL = 4;

function cellKey(x: number, z: number): string {
  return `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
}

function buildBlockerGrid(): Map<string, Blocker[]> {
  const grid = new Map<string, Blocker[]>();
  for (const prop of PROPS) {
    if (!BLOCKING_PROP_KINDS.has(prop.kind)) continue;
    const blocker: Blocker = {
      x: prop.position.x,
      z: prop.position.z,
      radius: (PROP_COLLISION_RADIUS[prop.kind] ?? 0.7) * prop.scale,
    };
    const reach = Math.ceil((blocker.radius + 1) / CELL);
    const cx = Math.floor(blocker.x / CELL);
    const cz = Math.floor(blocker.z / CELL);
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(blocker);
        else grid.set(key, [blocker]);
      }
    }
  }
  return grid;
}

const BLOCKER_GRID = buildBlockerGrid();

export function blockersNear(x: number, z: number): Blocker[] {
  return BLOCKER_GRID.get(cellKey(x, z)) ?? [];
}

export interface GateState {
  brambleGateOpen: boolean;
  mistveilOpen: boolean;
}

function isGateOpen(gate: GateDef, gates: GateState): boolean {
  return gate.id === 'bramble-gate' ? gates.brambleGateOpen : gates.mistveilOpen;
}

/**
 * Signed distance from a gate's plane, positive on the far side.
 * Also reports how far along the barrier the point is, so a player walking
 * around the *end* of the barrier is not blocked by it.
 */
function gateOffsets(gate: GateDef, x: number, z: number): { through: number; along: number } {
  const nx = Math.sin(gate.facing);
  const nz = Math.cos(gate.facing);
  const dx = x - gate.position.x;
  const dz = z - gate.position.z;
  return { through: dx * nx + dz * nz, along: dx * -nz + dz * nx };
}

export interface MoveResult {
  x: number;
  z: number;
  /** True when a locked gate is what stopped the move. */
  blockedByGate: GateDef | null;
}

/**
 * Resolves a desired move to a legal one.
 *
 * @param radius The player's body radius.
 */
export function resolveMove(
  from: Vec3,
  desiredX: number,
  desiredZ: number,
  radius: number,
  gates: GateState,
): MoveResult {
  let x = clamp(desiredX, WORLD.minX + radius, WORLD.maxX - radius);
  let z = clamp(desiredZ, WORLD.minZ + radius, WORLD.maxZ - radius);

  // Scenery: push out of anything overlapped, which produces sliding for free.
  // Two passes settle the common case of being wedged between two trunks.
  for (let pass = 0; pass < 2; pass++) {
    for (const blocker of blockersNear(x, z)) {
      const dx = x - blocker.x;
      const dz = z - blocker.z;
      const overlap = blocker.radius + radius - Math.hypot(dx, dz);
      if (overlap <= 0) continue;
      const distance = Math.hypot(dx, dz) || 0.0001;
      x += (dx / distance) * overlap;
      z += (dz / distance) * overlap;
    }
  }

  // Locked gates behave as a wall, but only across their own width.
  let blockedByGate: GateDef | null = null;
  for (const gate of GATES) {
    if (isGateOpen(gate, gates)) continue;
    const before = gateOffsets(gate, from.x, from.z);
    const after = gateOffsets(gate, x, z);
    if (Math.abs(after.along) > gate.halfWidth) continue;
    // Only block travel in the forward direction; leaving is always allowed.
    if (before.through < radius && after.through > before.through) {
      const push = radius - after.through;
      if (push > 0) {
        x -= Math.sin(gate.facing) * push;
        z -= Math.cos(gate.facing) * push;
        blockedByGate = gate;
      }
    }
  }

  return { x, z, blockedByGate };
}

/** Which gate, if any, the point is standing right in front of. */
export function gateInFrontOf(x: number, z: number, gates: GateState): GateDef | null {
  for (const gate of GATES) {
    if (isGateOpen(gate, gates)) continue;
    const { through, along } = gateOffsets(gate, x, z);
    if (Math.abs(along) <= gate.halfWidth && through > -5 && through < 1.5) return gate;
  }
  return null;
}
