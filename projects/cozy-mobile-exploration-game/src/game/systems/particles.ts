import { Color, Group, InstancedMesh, Object3D, OctahedronGeometry, type Material } from 'three';
import { createRng, type Rng } from '../../core/rng.ts';
import type { RegionId } from '../../core/types.ts';
import { clamp, type Vec3 } from '../../core/vector.ts';
import { WORLD, groundHeight } from '../../core/world/layout.ts';
import { PALETTES } from '../art/palette.ts';

/**
 * Particles.
 *
 * One `InstancedMesh` and a fixed-size CPU pool. Every effect in the game —
 * drifting motes, a gather burst, a creature settling, a Dawnspire waking —
 * comes out of the same pool, so the total particle cost is a constant the
 * quality tier can set and can never spike during a busy moment.
 *
 * Dead particles are parked at zero scale rather than removed, because
 * resizing an InstancedMesh means reallocating its buffers.
 */

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  drag: number;
  gravity: number;
  colour: Color;
  /** When set, the particle homes toward this point — used for gather motes. */
  homeTo: Vec3 | null;
  homeStrength: number;
  spin: number;
}

export interface ParticleSystem {
  group: Group;
  /** Slow drifting motes that follow the player around. */
  setAmbient(region: RegionId, enabled: boolean): void;
  /** Motes leaving a gathered node and flying to the player. */
  gatherBurst(from: Vec3, to: Vec3, tint: number, count?: number): void;
  /** A soft puff where a creature lies down. */
  settlePuff(at: Vec3, tint: number): void;
  /** A hit spark. Small, warm, never red. */
  hitSpark(at: Vec3, charged: boolean): void;
  /** The big one: a Dawnspire waking. */
  restorationBurst(at: Vec3, tint: number): void;
  /** A ring of motes when the player rests. */
  restGlow(at: Vec3): void;
  update(dt: number, player: Vec3): void;
  setBudget(budget: number): void;
  dispose(): void;
}

const scratch = new Object3D();

export function createParticles(material: Material, budget: number): ParticleSystem {
  const geometry = new OctahedronGeometry(0.09, 0);
  const capacity = 320;
  const mesh = new InstancedMesh(geometry, material, capacity);
  mesh.frustumCulled = false;
  mesh.name = 'particles';
  mesh.count = capacity;

  const group = new Group();
  group.add(mesh);

  const pool: Particle[] = Array.from({ length: capacity }, () => ({
    alive: false,
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    life: 0, maxLife: 1, size: 1,
    drag: 1.2, gravity: 0,
    colour: new Color(0xffffff),
    homeTo: null, homeStrength: 0,
    spin: 0,
  }));

  const rng: Rng = createRng(0x5eed);
  let activeBudget = clamp(budget, 0, capacity);
  let ambientEnabled = true;
  let ambientRegion: RegionId = 'meadow';
  let ambientTimer = 0;
  let liveCount = 0;

  const spawn = (): Particle | null => {
    if (liveCount >= activeBudget) return null;
    for (const particle of pool) {
      if (!particle.alive) {
        particle.alive = true;
        liveCount++;
        return particle;
      }
    }
    return null;
  };

  const emitAmbient = (player: Vec3) => {
    const particle = spawn();
    if (!particle) return;
    const palette = PALETTES[ambientRegion];
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(3, 16);
    particle.x = clamp(player.x + Math.cos(angle) * distance, WORLD.minX, WORLD.maxX);
    particle.z = clamp(player.z + Math.sin(angle) * distance, WORLD.minZ, WORLD.maxZ);
    particle.y = groundHeight(particle.x, particle.z) + rng.range(0.4, 3.4);
    particle.vx = rng.range(-0.18, 0.18);
    particle.vy = rng.range(0.06, 0.24);
    particle.vz = rng.range(-0.18, 0.18);
    particle.drag = 0.15;
    particle.gravity = 0;
    particle.maxLife = rng.range(4.5, 9);
    particle.life = particle.maxLife;
    particle.size = rng.range(0.35, 0.8);
    particle.homeTo = null;
    particle.spin = rng.range(-1.5, 1.5);
    particle.colour.setHex(ambientRegion === 'glade' ? palette.glow : 0xfff0b8);
  };

  const burst = (
    at: Vec3,
    tint: number,
    count: number,
    speed: number,
    size: [number, number],
    life: [number, number],
    gravity: number,
    homeTo: Vec3 | null = null,
  ) => {
    for (let i = 0; i < count; i++) {
      const particle = spawn();
      if (!particle) return;
      const angle = rng.range(0, Math.PI * 2);
      const pitch = rng.range(0.25, 1.3);
      particle.x = at.x + rng.range(-0.16, 0.16);
      particle.y = at.y + rng.range(-0.05, 0.3);
      particle.z = at.z + rng.range(-0.16, 0.16);
      particle.vx = Math.cos(angle) * Math.cos(pitch) * speed * rng.range(0.6, 1.2);
      particle.vy = Math.sin(pitch) * speed * rng.range(0.7, 1.3);
      particle.vz = Math.sin(angle) * Math.cos(pitch) * speed * rng.range(0.6, 1.2);
      particle.drag = 1.6;
      particle.gravity = gravity;
      particle.maxLife = rng.range(life[0], life[1]);
      particle.life = particle.maxLife;
      particle.size = rng.range(size[0], size[1]);
      particle.homeTo = homeTo;
      particle.homeStrength = homeTo ? 7 : 0;
      particle.spin = rng.range(-4, 4);
      particle.colour.setHex(tint);
    }
  };

  return {
    group,

    setAmbient(region, enabled) {
      ambientRegion = region;
      ambientEnabled = enabled;
    },

    gatherBurst(from, to, tint, count = 9) {
      // Homing motes: the point is to make it legible that the *thing you
      // touched* became the *thing in your pouch*.
      burst(from, tint, count, 1.9, [0.5, 0.95], [0.55, 0.85], -0.6, to);
    },

    settlePuff(at, tint) {
      burst(at, tint, 14, 1.5, [0.5, 1.1], [0.6, 1.1], 1.2);
    },

    hitSpark(at, charged) {
      burst(at, charged ? 0xa9f0e0 : 0xffe6a8, charged ? 10 : 6, 2.6, [0.35, 0.7], [0.22, 0.4], 2.2);
    },

    restorationBurst(at, tint) {
      burst(at, tint, 60, 4.2, [0.6, 1.5], [1.4, 2.6], -0.35);
      burst({ x: at.x, y: at.y + 3.2, z: at.z }, 0xfff4d0, 34, 2.4, [0.5, 1.1], [1.6, 2.8], -0.2);
    },

    restGlow(at) {
      burst({ x: at.x, y: at.y + 0.4, z: at.z }, 0xffc98a, 18, 1.1, [0.4, 0.9], [1, 1.8], -0.5);
    },

    update(dt, player) {
      if (ambientEnabled && activeBudget > 0) {
        ambientTimer -= dt;
        if (ambientTimer <= 0) {
          // Keep roughly a third of the budget as ambient drift.
          ambientTimer = 0.09;
          if (liveCount < activeBudget * 0.34) emitAmbient(player);
        }
      }

      let index = 0;
      for (const particle of pool) {
        if (!particle.alive) {
          scratch.position.set(0, -1000, 0);
          scratch.scale.setScalar(0);
          scratch.updateMatrix();
          mesh.setMatrixAt(index++, scratch.matrix);
          continue;
        }

        particle.life -= dt;
        if (particle.life <= 0) {
          particle.alive = false;
          liveCount--;
          scratch.position.set(0, -1000, 0);
          scratch.scale.setScalar(0);
          scratch.updateMatrix();
          mesh.setMatrixAt(index++, scratch.matrix);
          continue;
        }

        if (particle.homeTo) {
          particle.vx += (particle.homeTo.x - particle.x) * particle.homeStrength * dt;
          particle.vy += (particle.homeTo.y + 0.8 - particle.y) * particle.homeStrength * dt;
          particle.vz += (particle.homeTo.z - particle.z) * particle.homeStrength * dt;
        }
        particle.vy -= particle.gravity * dt;
        const damping = Math.exp(-particle.drag * dt);
        particle.vx *= damping;
        particle.vy *= damping;
        particle.vz *= damping;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;

        // Fade by shrinking. The material is additive/unlit, so scale reads as
        // brightness without needing a per-instance opacity attribute.
        const t = particle.life / particle.maxLife;
        const fade = t > 0.7 ? (1 - t) / 0.3 : t / 0.7;
        scratch.position.set(particle.x, particle.y, particle.z);
        scratch.rotation.set(particle.spin * particle.life, particle.spin * particle.life * 0.7, 0);
        scratch.scale.setScalar(particle.size * clamp(fade, 0, 1));
        scratch.updateMatrix();
        mesh.setMatrixAt(index, scratch.matrix);
        mesh.setColorAt(index, particle.colour);
        index++;
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },

    setBudget(next) {
      activeBudget = clamp(next, 0, capacity);
    },

    dispose() {
      geometry.dispose();
      group.clear();
    },
  };
}
