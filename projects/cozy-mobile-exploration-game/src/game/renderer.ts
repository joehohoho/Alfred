import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three';
import type { Settings } from '../core/settings.ts';

/**
 * Renderer and quality tiers.
 *
 * The brief asks for device-performance profiling, so quality is not a static
 * guess: `auto` starts at medium, measures real frame times, and steps down
 * once if the device cannot hold the target. It only ever steps **down** —
 * a renderer that oscillates between tiers is worse than one that is slightly
 * too conservative.
 */

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityProfile {
  tier: QualityTier;
  /** Upper bound on device pixel ratio. The single biggest mobile GPU cost. */
  maxPixelRatio: number;
  /** Ambient particle budget. */
  particles: number;
  /** Whether foliage sways. */
  wind: boolean;
  antialias: boolean;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: { tier: 'low', maxPixelRatio: 1, particles: 40, wind: false, antialias: false },
  medium: { tier: 'medium', maxPixelRatio: 1.5, particles: 110, wind: true, antialias: true },
  high: { tier: 'high', maxPixelRatio: 2, particles: 200, wind: true, antialias: true },
};

export interface RendererHandle {
  renderer: WebGLRenderer;
  profile: QualityProfile;
  /** Resizes to the container, honouring the current pixel-ratio cap. */
  resize(width: number, height: number): void;
  setQuality(tier: QualityTier): void;
  dispose(): void;
}

export function createRenderer(canvas: HTMLCanvasElement, settings: Settings): RendererHandle {
  const initialTier: QualityTier = settings.quality === 'auto' ? 'medium' : settings.quality;
  let profile = QUALITY_PROFILES[initialTier];

  const renderer = new WebGLRenderer({
    canvas,
    antialias: profile.antialias,
    alpha: false,
    powerPreference: 'high-performance',
    // Needed so screenshot tooling can read the canvas after a frame.
    preserveDrawingBuffer: true,
    stencil: false,
  });

  renderer.outputColorSpace = SRGBColorSpace;
  // ACES keeps the bright meadow from clipping to white and gives the moonlit
  // glade its soft roll-off, at effectively no cost.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = PCFSoftShadowMap;

  let width = 1;
  let height = 1;

  const applyPixelRatio = () => {
    const devicePixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, profile.maxPixelRatio));
  };

  applyPixelRatio();

  return {
    renderer,
    get profile() {
      return profile;
    },
    resize(nextWidth, nextHeight) {
      width = Math.max(1, Math.floor(nextWidth));
      height = Math.max(1, Math.floor(nextHeight));
      renderer.setSize(width, height, false);
    },
    setQuality(tier) {
      profile = QUALITY_PROFILES[tier];
      applyPixelRatio();
      renderer.setSize(width, height, false);
    },
    dispose() {
      renderer.dispose();
    },
  };
}

/**
 * Watches frame times and reports when the device is struggling.
 *
 * Deliberately slow to react: it needs a full second of sustained overrun
 * before it will suggest a downgrade, so a single hitch — a garbage collection,
 * a shader compile on first sight of a new prop — never costs the player
 * visual quality for the rest of the session.
 */
export class PerfProbe {
  private samples: number[] = [];
  private overrunSeconds = 0;
  private downgrades = 0;

  constructor(
    private readonly targetMs = 1000 / 55,
    private readonly maxDowngrades = 1,
  ) {}

  /** @returns true when a downgrade is warranted. Reports at most `maxDowngrades` times. */
  sample(deltaMs: number): boolean {
    this.samples.push(deltaMs);
    if (this.samples.length > 120) this.samples.shift();

    if (deltaMs > this.targetMs) this.overrunSeconds += deltaMs / 1000;
    else this.overrunSeconds = Math.max(0, this.overrunSeconds - deltaMs / 1000);

    if (this.overrunSeconds > 1 && this.downgrades < this.maxDowngrades) {
      this.overrunSeconds = 0;
      this.downgrades++;
      return true;
    }
    return false;
  }

  /** Median frame time in ms, or 0 before any samples. Shown in the dev overlay. */
  get medianMs(): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)]!;
  }

  get fps(): number {
    const median = this.medianMs;
    return median > 0 ? Math.round(1000 / median) : 0;
  }
}

export function nextTierDown(tier: QualityTier): QualityTier {
  return tier === 'high' ? 'medium' : 'low';
}
