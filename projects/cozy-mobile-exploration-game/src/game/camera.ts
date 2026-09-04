import { OrthographicCamera, Vector3 } from 'three';
import { clamp, damp } from '../core/vector.ts';
import { WORLD } from '../core/world/layout.ts';

/**
 * The camera rig.
 *
 * Orthographic, not perspective. That is the decision that makes this read as a
 * cosy isometric world rather than a small 3D scene: parallel projection keeps
 * every tree the same size wherever it is on screen, so the meadow reads as a
 * consistent, legible diagram of a place.
 *
 * The rig follows the player with a soft lag and a small look-ahead in the
 * direction of travel, which keeps the player's own body out of the exact
 * centre of the screen — where, on a phone held in landscape, their thumb is.
 */

/** Yaw and pitch of the isometric view. Fixed; the world never rotates. */
export const CAMERA_YAW = Math.PI * 0.24;
export const CAMERA_PITCH = 0.66;

/**
 * Vertical world units visible.
 *
 * Sized from the player, not from the world: on a 393pt-tall landscape iPhone,
 * `default` puts the character at roughly a tenth of the screen height, which
 * is large enough to read their facing and their swing while still showing a
 * useful amount of meadow. `min` is a close, cosy framing for gathering; `max`
 * is for getting your bearings, and is capped well before props stop being
 * legible.
 */
export const ZOOM = {
  min: 9,
  max: 26,
  default: 14,
} as const;

/**
 * Distance the camera sits back along its view axis.
 *
 * Under orthographic projection this does not affect framing at all — only
 * clipping and fog. It is kept just long enough to clear the tallest scenery.
 */
const BOOM_LENGTH = 60;

export interface CameraRig {
  camera: OrthographicCamera;
  /** Vertical world units visible. Smaller = more zoomed in. */
  zoom: number;
  setZoom(value: number): void;
  nudgeZoom(delta: number): void;
  /** Snaps to the target with no easing. Used on load and after a respawn. */
  snapTo(x: number, z: number): void;
  update(targetX: number, targetZ: number, facing: number, speed: number, dt: number): void;
  resize(width: number, height: number): void;
  /** Adds a shake impulse, scaled by the player's camera-shake setting. */
  shake(strength: number): void;
  setShakeScale(scale: number): void;
  /** True when the given world point is inside the visible frustum. */
  isVisible(x: number, z: number, margin?: number): boolean;
  /** Projects a world point to normalised device coordinates. */
  project(x: number, y: number, z: number): { x: number; y: number };
}

export function createCameraRig(): CameraRig {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const focus = new Vector3(0, 0, 0);
  const smoothed = new Vector3(0, 0, 0);
  const projected = new Vector3();

  let zoom: number = ZOOM.default;
  let aspect = 1;
  let shakeAmount = 0;
  let shakeScale = 1;
  let shakeTime = 0;

  // Direction from the focus point out to the camera.
  const boom = new Vector3(
    Math.sin(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
    Math.sin(CAMERA_PITCH),
    Math.cos(CAMERA_YAW) * Math.cos(CAMERA_PITCH),
  ).normalize();

  const applyFrustum = () => {
    const halfHeight = zoom / 2;
    const halfWidth = halfHeight * aspect;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  };

  const place = () => {
    camera.position
      .copy(smoothed)
      .addScaledVector(boom, BOOM_LENGTH)
      .add(
        // Shake is a decaying wobble applied to the camera, never to the world,
        // so it can be scaled to zero by the accessibility setting with no
        // other effect on the simulation.
        new Vector3(
          Math.sin(shakeTime * 47) * shakeAmount,
          Math.sin(shakeTime * 61 + 1.3) * shakeAmount * 0.6,
          Math.cos(shakeTime * 53) * shakeAmount,
        ),
      );
    camera.lookAt(smoothed);
  };

  applyFrustum();
  place();

  return {
    camera,
    get zoom() {
      return zoom;
    },
    setZoom(value) {
      zoom = clamp(value, ZOOM.min, ZOOM.max);
      applyFrustum();
    },
    nudgeZoom(delta) {
      zoom = clamp(zoom + delta, ZOOM.min, ZOOM.max);
      applyFrustum();
    },
    snapTo(x, z) {
      focus.set(x, 0, z);
      smoothed.copy(focus);
      place();
    },
    update(targetX, targetZ, facing, speed, dt) {
      // Look ahead further the faster the player moves, so a sprint reveals
      // more of what is coming rather than more of what is behind.
      const lead = Math.min(speed, 1) * zoom * 0.09;
      focus.set(targetX + Math.sin(facing) * lead, 0, targetZ + Math.cos(facing) * lead);

      // Keep the view inside the world so the player never sees the void.
      const halfHeight = zoom / 2;
      const halfWidth = halfHeight * aspect;
      const reach = Math.max(halfWidth, halfHeight) * 1.15;
      focus.x = clamp(focus.x, WORLD.minX + reach, WORLD.maxX - reach);
      focus.z = clamp(focus.z, WORLD.minZ + reach, WORLD.maxZ - reach);

      smoothed.x = damp(smoothed.x, focus.x, 6.5, dt);
      smoothed.z = damp(smoothed.z, focus.z, 6.5, dt);

      shakeTime += dt;
      shakeAmount = Math.max(0, shakeAmount - dt * 1.6);
      place();
    },
    resize(width, height) {
      aspect = width / Math.max(height, 1);
      applyFrustum();
    },
    shake(strength) {
      shakeAmount = Math.min(shakeAmount + strength * shakeScale, 0.6 * shakeScale);
    },
    setShakeScale(scale) {
      shakeScale = clamp(scale, 0, 1);
      if (shakeScale === 0) shakeAmount = 0;
    },
    isVisible(x, z, margin = 0) {
      projected.set(x, 0, z).project(camera);
      const bound = 1 + margin;
      return projected.x >= -bound && projected.x <= bound && projected.y >= -bound && projected.y <= bound;
    },
    project(x, y, z) {
      projected.set(x, y, z).project(camera);
      return { x: projected.x, y: projected.y };
    },
  };
}
