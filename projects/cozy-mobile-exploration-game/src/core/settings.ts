/**
 * Player-facing options. Every one of these is an accessibility affordance the
 * brief calls for, so they are part of the saved state rather than a runtime
 * toggle that resets each launch.
 */
export interface Settings {
  /** Master sound. On by default, per the brief. */
  sound: boolean;
  /** 0..1, applied on top of `sound`. */
  musicVolume: number;
  /** 0..1, applied on top of `sound`. */
  effectsVolume: number;
  /** Suppresses bloom pulses, lightning-fast fades and strobing particles. */
  reducedFlash: boolean;
  /** Damps idle sway, camera drift, screen transitions and particle counts. */
  reducedMotion: boolean;
  /** Heavier outlines and opaque backing plates on prompts and the HUD. */
  highContrast: boolean;
  /** Captions for ambient and creature audio cues. */
  subtitles: boolean;
  /** 0 disables shake entirely; 1 is the designed amount. */
  cameraShake: number;
  /** Moves the joystick to the right and the action cluster to the left. */
  handedness: 'left' | 'right';
  /** HUD scale multiplier, 0.85..1.4. */
  uiScale: number;
  /** Renderer quality tier; 'auto' picks from a first-frame timing probe. */
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  musicVolume: 0.55,
  effectsVolume: 0.8,
  reducedFlash: false,
  reducedMotion: false,
  highContrast: false,
  subtitles: false,
  cameraShake: 1,
  handedness: 'left',
  uiScale: 1,
  quality: 'auto',
};

const QUALITY_VALUES = new Set(['auto', 'low', 'medium', 'high']);

function clamp01(value: unknown, fallback: number, min = 0, max = 1): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Coerces anything that came out of storage into valid settings.
 * A save written by an older build, or hand-edited, must never crash the game.
 */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Record<keyof Settings, unknown>>;
  return {
    sound: bool(input.sound, DEFAULT_SETTINGS.sound),
    musicVolume: clamp01(input.musicVolume, DEFAULT_SETTINGS.musicVolume),
    effectsVolume: clamp01(input.effectsVolume, DEFAULT_SETTINGS.effectsVolume),
    reducedFlash: bool(input.reducedFlash, DEFAULT_SETTINGS.reducedFlash),
    reducedMotion: bool(input.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    highContrast: bool(input.highContrast, DEFAULT_SETTINGS.highContrast),
    subtitles: bool(input.subtitles, DEFAULT_SETTINGS.subtitles),
    cameraShake: clamp01(input.cameraShake, DEFAULT_SETTINGS.cameraShake),
    handedness: input.handedness === 'right' ? 'right' : 'left',
    uiScale: clamp01(input.uiScale, DEFAULT_SETTINGS.uiScale, 0.85, 1.4),
    quality: QUALITY_VALUES.has(input.quality as string)
      ? (input.quality as Settings['quality'])
      : DEFAULT_SETTINGS.quality,
  };
}
