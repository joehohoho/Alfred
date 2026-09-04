import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshLambertMaterial,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';

/**
 * Materials.
 *
 * Almost the entire world is drawn with **one** Lambert material reading vertex
 * colours. That is the central performance decision: colour variety costs
 * nothing, and props of the same kind batch into a single instanced draw call.
 *
 * Two shader injections add life without a post-processing stack, which a
 * mid-range phone would not thank us for:
 *  - **Wind**, a vertex displacement weighted by height, so foliage sways from
 *    the tips and stays rooted at the base.
 *  - **Ripple**, a two-wave vertical displacement for water.
 */

export interface WindUniforms {
  uTime: { value: number };
  uWindStrength: { value: number };
  uWindSpeed: { value: number };
  uSwayHeight: { value: number };
}

/** Shared clock + wind settings. Reduced-motion scales `uWindStrength` down. */
export const windUniforms: WindUniforms = {
  uTime: { value: 0 },
  uWindStrength: { value: 0.09 },
  uWindSpeed: { value: 1.15 },
  uSwayHeight: { value: 2.4 },
};

export const waterUniforms = {
  uTime: windUniforms.uTime,
  uWaveHeight: { value: 0.06 },
};

const WIND_VERTEX_HEAD = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uSwayHeight;
`;

/**
 * Sway is weighted by height above the prop's own origin, squared, so the base
 * is pinned and the tips travel. Phase comes from the *instance's* world origin
 * so a field of grass ripples rather than moving as one block.
 */
const WIND_VERTEX_BODY = /* glsl */ `
  #include <begin_vertex>
  {
    #ifdef USE_INSTANCING
      vec3 swayOrigin = instanceMatrix[3].xyz;
    #else
      vec3 swayOrigin = vec3(0.0);
    #endif
    float swayAmount = clamp(position.y / max(uSwayHeight, 0.0001), 0.0, 1.0);
    swayAmount *= swayAmount;
    float phase = (swayOrigin.x + swayOrigin.z * 0.7) * 0.42 + uTime * uWindSpeed;
    transformed.x += sin(phase) * swayAmount * uWindStrength;
    transformed.z += cos(phase * 0.83 + 1.7) * swayAmount * uWindStrength * 0.62;
  }
`;

const WATER_VERTEX_HEAD = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
`;

const WATER_VERTEX_BODY = /* glsl */ `
  #include <begin_vertex>
  {
    float wave =
      sin(position.x * 0.55 + uTime * 1.1) * 0.6 +
      sin(position.z * 0.42 - uTime * 0.85) * 0.4;
    transformed.y += wave * uWaveHeight;
  }
`;

function injectWind(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uTime = windUniforms.uTime;
  shader.uniforms.uWindStrength = windUniforms.uWindStrength;
  shader.uniforms.uWindSpeed = windUniforms.uWindSpeed;
  shader.uniforms.uSwayHeight = windUniforms.uSwayHeight;
  shader.vertexShader = WIND_VERTEX_HEAD + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    WIND_VERTEX_BODY,
  );
}

function injectRipple(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uTime = waterUniforms.uTime;
  shader.uniforms.uWaveHeight = waterUniforms.uWaveHeight;
  shader.vertexShader = WATER_VERTEX_HEAD + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    WATER_VERTEX_BODY,
  );
}

export interface MaterialSet {
  /** Everything solid: terrain, trunks, rocks, buildings, characters. */
  solid: MeshLambertMaterial;
  /** Foliage that sways. Double-sided, because leaf cards are single quads. */
  foliage: MeshLambertMaterial;
  /** Alpha-tested foliage cards (grass, ferns, petals). */
  blade: MeshLambertMaterial;
  /** Water surface. */
  water: MeshLambertMaterial;
  /** Unlit magical glow. Additive, so it reads on any background. */
  glow: MeshBasicMaterial;
  /** Unlit flat colour, for particles and indicator motes. */
  mote: MeshBasicMaterial;
  dispose(): void;
}

export function createMaterials(): MaterialSet {
  const solid = new MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const foliage = new MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    side: DoubleSide,
  });
  foliage.onBeforeCompile = injectWind;
  // Materials with different shader injections must not share a program cache
  // entry with the plain one, or three will reuse the wrong compiled shader.
  foliage.customProgramCacheKey = () => 'wispmere-foliage';

  const blade = new MeshLambertMaterial({
    vertexColors: true,
    flatShading: false,
    side: DoubleSide,
    transparent: false,
    alphaTest: 0.5,
  });
  blade.onBeforeCompile = injectWind;
  blade.customProgramCacheKey = () => 'wispmere-blade';

  const water = new MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
    // Double-sided on purpose. The creek is a hand-built triangle strip whose
    // winding follows the polyline's direction, so half of it can end up
    // facing down and get back-face culled — which is exactly what made the
    // creek invisible. Water is only ever seen from above, so drawing both
    // faces costs nothing and removes the whole class of bug.
    side: DoubleSide,
  });
  water.onBeforeCompile = injectRipple;
  water.customProgramCacheKey = () => 'wispmere-water';

  const glow = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.72,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const mote = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  return {
    solid,
    foliage,
    blade,
    water,
    glow,
    mote,
    dispose() {
      for (const material of [solid, foliage, blade, water, glow, mote]) {
        (material as Material).dispose();
      }
    },
  };
}

/** Applies the accessibility "reduced motion" setting to world animation. */
export function setMotionScale(scale: number): void {
  windUniforms.uWindStrength.value = 0.09 * scale;
  windUniforms.uWindSpeed.value = 1.15 * Math.max(scale, 0.25);
  waterUniforms.uWaveHeight.value = 0.06 * scale;
}

/** Advances every time-driven material. Called once per frame. */
export function tickMaterials(elapsedSeconds: number): void {
  windUniforms.uTime.value = elapsedSeconds;
}

/**
 * An authored hex as a working-space colour.
 *
 * `new Color(hex)` already does the sRGB -> linear conversion under
 * THREE.ColorManagement, so this is just a named constructor — it exists to
 * make the intent explicit at call sites, not to convert anything twice.
 */
export const linearColour = (hex: number): Color => new Color(hex);
