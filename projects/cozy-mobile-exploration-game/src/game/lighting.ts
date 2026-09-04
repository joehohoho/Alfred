import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PointLight,
  Scene,
} from 'three';
import type { RegionId } from '../core/types.ts';
import { PALETTES } from './art/palette.ts';
import { damp } from '../core/vector.ts';

/**
 * Lighting and atmosphere.
 *
 * There are only three lights in the whole game — a hemisphere fill, a
 * directional key, and one small point light that follows the player's chime.
 * Everything else is baked into vertex colours. That is what lets a phone draw
 * the scene in one forward pass with no shadow maps and no post-processing.
 *
 * When the player crosses between regions the entire palette — sky, sun, fog,
 * fog distance — eases from one region's values to the next over about a
 * second, so the walk from the warm meadow into the moonlit glade is a gradual
 * change in the light rather than a cut.
 */

export interface LightingRig {
  hemisphere: HemisphereLight;
  key: DirectionalLight;
  ambient: AmbientLight;
  /** Follows the player, so they are never a dark silhouette. */
  lantern: PointLight;
  /** Requests a transition toward a region's palette. */
  setRegion(region: RegionId): void;
  /** Immediately adopts a region's palette. Used on first load. */
  snapToRegion(region: RegionId): void;
  update(dt: number, playerX: number, playerY: number, playerZ: number): void;
  /** Brightens everything briefly, for a restoration. 0..1. */
  setCelebration(amount: number): void;
}

interface Atmosphere {
  sky: Color;
  ground: Color;
  sun: Color;
  fog: Color;
  fogNear: number;
  fogFar: number;
  keyIntensity: number;
  hemiIntensity: number;
  /** Flat fill. The glade needs more of it, and cooler. */
  ambientColour: Color;
  ambientIntensity: number;
}

function atmosphereFor(region: RegionId): Atmosphere {
  const palette = PALETTES[region];
  return {
    sky: new Color(palette.sky),
    ground: new Color(palette.ground),
    sun: new Color(palette.sun),
    fog: new Color(palette.fog),
    fogNear: palette.fogNear,
    fogFar: palette.fogFar,
    // The glade is moonlit: a slightly dimmer, cooler key and a noticeably
    // stronger ambient fill, so nothing in it becomes an unreadable dark shape.
    keyIntensity: region === 'glade' ? 0.95 : 1.2,
    hemiIntensity: region === 'glade' ? 1.2 : 0.95,
    ambientColour: new Color(region === 'glade' ? 0xaebbe6 : 0xfff0dc),
    ambientIntensity: region === 'glade' ? 0.45 : 0.3,
  };
}

export function createLighting(scene: Scene): LightingRig {
  const current = atmosphereFor('meadow');
  const target = atmosphereFor('meadow');

  const hemisphere = new HemisphereLight(current.sky, current.ground, current.hemiIntensity);
  scene.add(hemisphere);

  const key = new DirectionalLight(current.sun, current.keyIntensity);
  // Deliberately on the *camera's* side of the world, offset about 30 degrees.
  // Lighting from the far side leaves every camera-facing surface — including
  // the player's front — in shade, which is exactly the unreadable dark
  // silhouette the brief rules out.
  key.position.set(26, 42, 30);
  scene.add(key);
  scene.add(key.target);

  // A low flat fill that lifts the shadowed sides of characters. Without it,
  // a player standing with their back to the key light goes muddy.
  const ambient = new AmbientLight(current.ambientColour, current.ambientIntensity);
  scene.add(ambient);

  const lantern = new PointLight(0xffe6b0, 0.55, 9, 2);
  scene.add(lantern);

  scene.fog = new Fog(current.fog, current.fogNear, current.fogFar);
  scene.background = current.fog.clone();

  let celebration = 0;

  const apply = () => {
    hemisphere.color.copy(current.sky);
    hemisphere.groundColor.copy(current.ground);
    hemisphere.intensity = current.hemiIntensity * (1 + celebration * 0.45);
    key.color.copy(current.sun);
    key.intensity = current.keyIntensity * (1 + celebration * 0.35);
    ambient.color.copy(current.ambientColour);
    ambient.intensity = current.ambientIntensity * (1 + celebration * 0.3);
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(current.fog);
      scene.fog.near = current.fogNear;
      scene.fog.far = current.fogFar;
    }
    (scene.background as Color).copy(current.fog);
  };

  const adopt = (next: Atmosphere) => {
    current.sky.copy(next.sky);
    current.ground.copy(next.ground);
    current.sun.copy(next.sun);
    current.fog.copy(next.fog);
    current.fogNear = next.fogNear;
    current.fogFar = next.fogFar;
    current.keyIntensity = next.keyIntensity;
    current.hemiIntensity = next.hemiIntensity;
    current.ambientColour.copy(next.ambientColour);
    current.ambientIntensity = next.ambientIntensity;
  };

  const setTarget = (next: Atmosphere) => {
    target.sky.copy(next.sky);
    target.ground.copy(next.ground);
    target.sun.copy(next.sun);
    target.fog.copy(next.fog);
    target.fogNear = next.fogNear;
    target.fogFar = next.fogFar;
    target.keyIntensity = next.keyIntensity;
    target.hemiIntensity = next.hemiIntensity;
    target.ambientColour.copy(next.ambientColour);
    target.ambientIntensity = next.ambientIntensity;
  };

  apply();

  return {
    hemisphere,
    key,
    ambient,
    lantern,
    setRegion(region) {
      setTarget(atmosphereFor(region));
    },
    snapToRegion(region) {
      const next = atmosphereFor(region);
      setTarget(next);
      adopt(next);
      apply();
    },
    update(dt, playerX, playerY, playerZ) {
      const rate = 1.6;
      current.sky.lerp(target.sky, 1 - Math.exp(-rate * dt));
      current.ground.lerp(target.ground, 1 - Math.exp(-rate * dt));
      current.sun.lerp(target.sun, 1 - Math.exp(-rate * dt));
      current.fog.lerp(target.fog, 1 - Math.exp(-rate * dt));
      current.fogNear = damp(current.fogNear, target.fogNear, rate, dt);
      current.fogFar = damp(current.fogFar, target.fogFar, rate, dt);
      current.keyIntensity = damp(current.keyIntensity, target.keyIntensity, rate, dt);
      current.hemiIntensity = damp(current.hemiIntensity, target.hemiIntensity, rate, dt);
      current.ambientColour.lerp(target.ambientColour, 1 - Math.exp(-rate * dt));
      current.ambientIntensity = damp(current.ambientIntensity, target.ambientIntensity, rate, dt);
      celebration = Math.max(0, celebration - dt * 0.5);

      // The key light rides with the player so the lit side of the world is
      // always the side they are looking at, and the fog band stays consistent.
      key.position.set(playerX + 26, 42, playerZ + 30);
      key.target.position.set(playerX, 0, playerZ);
      key.target.updateMatrixWorld();

      lantern.position.set(playerX, playerY + 1.1, playerZ);
      apply();
    },
    setCelebration(amount) {
      celebration = Math.max(celebration, amount);
    },
  };
}
