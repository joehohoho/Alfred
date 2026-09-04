import type { RegionId } from '../../core/types.ts';
import { clamp } from '../../core/vector.ts';

/**
 * Sound.
 *
 * Every sound in the game is synthesised at runtime with the Web Audio API.
 * There are no audio files. That guarantees originality, keeps the bundle
 * tiny, and means the whole soundtrack can be tuned by editing numbers.
 *
 * **Headless safety** is a hard requirement from the brief, so it is handled
 * structurally rather than by remembering to check: if there is no
 * `AudioContext`, or the test flag is set, `available` is false and every
 * method is a no-op that still returns normally. Nothing in the game needs to
 * know whether sound exists.
 *
 * Browsers — iOS especially — will not start an `AudioContext` without a user
 * gesture, so `resume()` is called from the first touch or key press.
 */

export type SoundCue =
  | 'gather'
  | 'gather-empty'
  | 'renew'
  | 'swing'
  | 'swing-charged'
  | 'hit'
  | 'settle'
  | 'hurt'
  | 'defeat'
  | 'rest'
  | 'build'
  | 'upgrade'
  | 'restore'
  | 'companion'
  | 'unlock'
  | 'ui-tap'
  | 'ui-back';

/**
 * What each sound "says", for players with sound off or hearing loss.
 *
 * Only cues that carry information are listed. A UI tap has nothing to caption,
 * and captioning it would bury the ones that matter.
 */
export const CUE_CAPTIONS: Partial<Record<SoundCue, string>> = {
  gather: '[soft rustle — gathered]',
  'gather-empty': '[nothing left here yet]',
  renew: '[chime — something has grown back nearby]',
  hit: '[thud]',
  settle: '[a creature settles down]',
  hurt: '[you are struck]',
  defeat: '[everything goes quiet]',
  rest: '[warm hum — rested]',
  build: '[timbers settle into place]',
  upgrade: '[your chime rings brighter]',
  restore: '[a long rising chime — the spire wakes]',
  companion: '[a small bright trill]',
  unlock: '[something heavy shifts open]',
};

export interface AudioBus {
  /** False in headless/test contexts and wherever Web Audio is unavailable. */
  readonly available: boolean;
  /** True once the context is actually running. */
  readonly running: boolean;
  setEnabled(enabled: boolean): void;
  setVolumes(music: number, effects: number): void;
  /** Call from a user gesture. Safe to call repeatedly. */
  resume(): void;
  play(cue: SoundCue): void;
  setRegion(region: RegionId): void;
  dispose(): void;
}

/** A pentatonic set per region, in Hz. Nothing here can sound wrong together. */
const SCALES: Record<RegionId, number[]> = {
  meadow: [293.66, 329.63, 369.99, 440.0, 493.88, 587.33],
  grove: [261.63, 293.66, 349.23, 392.0, 440.0, 523.25],
  glade: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
};

const DRONE_ROOT: Record<RegionId, number> = {
  meadow: 73.42,
  grove: 65.41,
  glade: 55.0,
};

function isHeadless(): boolean {
  return (globalThis as Record<string, unknown>).__WISPMERE_HEADLESS__ === true;
}

const NOOP_BUS: AudioBus = {
  available: false,
  running: false,
  setEnabled() {},
  setVolumes() {},
  resume() {},
  play() {},
  setRegion() {},
  dispose() {},
};

export function createAudioBus(enabled: boolean, music: number, effects: number): AudioBus {
  const Ctor: typeof AudioContext | undefined =
    typeof AudioContext !== 'undefined'
      ? AudioContext
      : (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (isHeadless() || !Ctor) return NOOP_BUS;

  let context: AudioContext;
  try {
    context = new Ctor();
  } catch {
    return NOOP_BUS;
  }

  const master = context.createGain();
  master.gain.value = enabled ? 1 : 0;
  master.connect(context.destination);

  const musicGain = context.createGain();
  musicGain.gain.value = clamp(music, 0, 1) * 0.35;
  musicGain.connect(master);

  const effectsGain = context.createGain();
  effectsGain.gain.value = clamp(effects, 0, 1) * 0.6;
  effectsGain.connect(master);

  // A gentle reverb built from a short generated impulse. Two seconds of noise
  // with an exponential tail is enough to put the whole game in one soft room.
  const convolver = context.createConvolver();
  {
    const length = Math.floor(context.sampleRate * 1.9);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.8);
      }
    }
    convolver.buffer = impulse;
  }
  const reverbSend = context.createGain();
  reverbSend.gain.value = 0.24;
  reverbSend.connect(convolver);
  convolver.connect(master);

  let currentRegion: RegionId = 'meadow';
  let soundEnabled = enabled;
  let disposed = false;

  // --- Ambient drone -------------------------------------------------------
  const droneGain = context.createGain();
  droneGain.gain.value = 0;
  droneGain.connect(musicGain);
  droneGain.connect(reverbSend);

  const droneFilter = context.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 420;
  droneFilter.Q.value = 1.4;
  droneFilter.connect(droneGain);

  const droneVoices = [0, 0.02, -0.015].map((detune, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.value = DRONE_ROOT.meadow * (index === 2 ? 1.5 : 1);
    oscillator.detune.value = detune * 1200;
    const gain = context.createGain();
    gain.gain.value = index === 0 ? 0.6 : 0.22;
    oscillator.connect(gain).connect(droneFilter);
    oscillator.start();
    return { oscillator, gain, ratio: index === 2 ? 1.5 : 1 };
  });

  // Slow filter sweep, so the pad breathes instead of sitting still.
  const breath = context.createOscillator();
  breath.type = 'sine';
  breath.frequency.value = 0.055;
  const breathDepth = context.createGain();
  breathDepth.gain.value = 190;
  breath.connect(breathDepth).connect(droneFilter.frequency);
  breath.start();

  // --- Occasional wind chimes ---------------------------------------------
  let chimeTimer: ReturnType<typeof setTimeout> | null = null;

  const now = () => context.currentTime;

  interface ToneOptions {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    delay?: number;
    /** Slide to this frequency over the note. */
    glideTo?: number;
    filter?: number;
    destination?: AudioNode;
    reverb?: number;
  }

  const tone = (options: ToneOptions) => {
    if (disposed) return;
    const start = now() + (options.delay ?? 0);
    const oscillator = context.createOscillator();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, start);
    if (options.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(options.glideTo, 1),
        start + options.duration,
      );
    }

    const envelope = context.createGain();
    const peak = options.gain ?? 0.2;
    const attack = options.attack ?? 0.008;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

    let node: AudioNode = oscillator;
    if (options.filter) {
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = options.filter;
      node = node.connect(filter);
    }
    node.connect(envelope);
    envelope.connect(options.destination ?? effectsGain);
    if (options.reverb !== 0) {
      const send = context.createGain();
      send.gain.value = options.reverb ?? 0.3;
      envelope.connect(send).connect(reverbSend);
    }

    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.05);
  };

  const noise = (duration: number, gain: number, filterFrequency: number, delay = 0) => {
    if (disposed) return;
    const start = now() + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const envelope = context.createGain();
    envelope.gain.value = gain;
    source.connect(filter).connect(envelope).connect(effectsGain);
    source.start(start);
  };

  const scaleNote = (index: number): number => {
    const scale = SCALES[currentRegion];
    return scale[Math.abs(index) % scale.length]!;
  };

  const scheduleChime = () => {
    if (disposed) return;
    // Between six and fourteen seconds. Rare enough to stay a surprise.
    const delay = 6000 + Math.random() * 8000;
    chimeTimer = setTimeout(() => {
      if (soundEnabled) {
        const root = Math.floor(Math.random() * 6);
        tone({
          frequency: scaleNote(root),
          duration: 2.6,
          type: 'sine',
          gain: 0.055,
          attack: 0.05,
          destination: musicGain,
          reverb: 0.55,
        });
        if (Math.random() < 0.5) {
          tone({
            frequency: scaleNote(root + 2),
            duration: 2.2,
            type: 'sine',
            gain: 0.04,
            attack: 0.06,
            delay: 0.42,
            destination: musicGain,
            reverb: 0.55,
          });
        }
      }
      scheduleChime();
    }, delay);
  };

  const CUES: Record<SoundCue, () => void> = {
    gather: () => {
      tone({ frequency: scaleNote(3), duration: 0.22, type: 'triangle', gain: 0.16, filter: 2600 });
      tone({ frequency: scaleNote(5), duration: 0.3, gain: 0.1, delay: 0.05 });
      noise(0.12, 0.05, 1400);
    },
    'gather-empty': () => {
      tone({ frequency: 180, duration: 0.16, type: 'sine', gain: 0.09, glideTo: 140 });
    },
    renew: () => {
      tone({ frequency: scaleNote(2), duration: 0.9, gain: 0.09, attack: 0.03, reverb: 0.5 });
      tone({ frequency: scaleNote(4), duration: 0.8, gain: 0.07, delay: 0.1, reverb: 0.5 });
    },
    swing: () => {
      noise(0.13, 0.075, 2200);
      tone({ frequency: 520, duration: 0.14, type: 'triangle', gain: 0.07, glideTo: 380 });
    },
    'swing-charged': () => {
      noise(0.2, 0.1, 2800);
      tone({ frequency: 340, duration: 0.34, type: 'triangle', gain: 0.13, glideTo: 760 });
      tone({ frequency: scaleNote(5), duration: 0.5, gain: 0.09, delay: 0.06, reverb: 0.45 });
    },
    hit: () => {
      noise(0.09, 0.12, 900);
      tone({ frequency: 220, duration: 0.16, type: 'sine', gain: 0.14, glideTo: 150 });
      tone({ frequency: scaleNote(1), duration: 0.24, gain: 0.06, delay: 0.02 });
    },
    settle: () => {
      tone({ frequency: scaleNote(4), duration: 0.5, gain: 0.13, glideTo: scaleNote(1) });
      tone({ frequency: scaleNote(2), duration: 0.7, gain: 0.09, delay: 0.12, reverb: 0.5 });
      noise(0.3, 0.05, 700, 0.05);
    },
    hurt: () => {
      tone({ frequency: 300, duration: 0.2, type: 'triangle', gain: 0.12, glideTo: 190 });
      noise(0.12, 0.07, 1100);
    },
    defeat: () => {
      // Deliberately soft and downward, never a sting. Defeat is a nap.
      for (let i = 0; i < 3; i++) {
        tone({
          frequency: scaleNote(4 - i),
          duration: 0.8,
          gain: 0.1,
          delay: i * 0.16,
          attack: 0.03,
          reverb: 0.6,
        });
      }
    },
    rest: () => {
      for (let i = 0; i < 3; i++) {
        tone({
          frequency: scaleNote(i * 2),
          duration: 1.6,
          gain: 0.085,
          delay: i * 0.1,
          attack: 0.12,
          reverb: 0.6,
        });
      }
    },
    build: () => {
      noise(0.18, 0.11, 1200);
      tone({ frequency: scaleNote(0), duration: 0.5, type: 'triangle', gain: 0.13 });
      tone({ frequency: scaleNote(3), duration: 0.7, gain: 0.1, delay: 0.14, reverb: 0.5 });
    },
    upgrade: () => {
      for (let i = 0; i < 4; i++) {
        tone({ frequency: scaleNote(i + 1), duration: 0.4, gain: 0.1, delay: i * 0.075, reverb: 0.45 });
      }
    },
    restore: () => {
      // The finale sound: a rising arpeggio over a swelling pad.
      for (let i = 0; i < 7; i++) {
        tone({
          frequency: scaleNote(i) * (i > 4 ? 2 : 1),
          duration: 1.5,
          gain: 0.11,
          delay: i * 0.13,
          attack: 0.02,
          reverb: 0.7,
        });
      }
      tone({
        frequency: DRONE_ROOT[currentRegion] * 2,
        duration: 3.2,
        type: 'triangle',
        gain: 0.13,
        attack: 0.6,
        destination: musicGain,
        reverb: 0.7,
      });
    },
    companion: () => {
      tone({ frequency: scaleNote(4), duration: 0.2, gain: 0.1, glideTo: scaleNote(5) });
      tone({ frequency: scaleNote(5), duration: 0.28, gain: 0.09, delay: 0.11 });
    },
    unlock: () => {
      noise(0.4, 0.07, 800);
      for (let i = 0; i < 3; i++) {
        tone({ frequency: scaleNote(i) / 2, duration: 1.1, gain: 0.1, delay: i * 0.18, reverb: 0.6 });
      }
    },
    'ui-tap': () => {
      tone({ frequency: 660, duration: 0.07, type: 'sine', gain: 0.07, reverb: 0.12 });
    },
    'ui-back': () => {
      tone({ frequency: 420, duration: 0.09, type: 'sine', gain: 0.06, reverb: 0.12 });
    },
  };

  scheduleChime();

  return {
    available: true,
    get running() {
      return context.state === 'running';
    },
    setEnabled(next) {
      soundEnabled = next;
      master.gain.setTargetAtTime(next ? 1 : 0, now(), 0.08);
      droneGain.gain.setTargetAtTime(next ? 0.5 : 0, now(), 0.6);
    },
    setVolumes(nextMusic, nextEffects) {
      musicGain.gain.setTargetAtTime(clamp(nextMusic, 0, 1) * 0.35, now(), 0.1);
      effectsGain.gain.setTargetAtTime(clamp(nextEffects, 0, 1) * 0.6, now(), 0.1);
    },
    resume() {
      if (context.state === 'suspended') void context.resume();
      if (soundEnabled) droneGain.gain.setTargetAtTime(0.5, now(), 1.2);
    },
    play(cue) {
      if (!soundEnabled || context.state !== 'running') return;
      CUES[cue]?.();
    },
    setRegion(region) {
      if (region === currentRegion) return;
      currentRegion = region;
      const root = DRONE_ROOT[region];
      for (const voice of droneVoices) {
        voice.oscillator.frequency.setTargetAtTime(root * voice.ratio, now(), 1.4);
      }
      // The glade sits lower and darker; the meadow opens up.
      droneFilter.frequency.setTargetAtTime(region === 'glade' ? 330 : 460, now(), 1.6);
    },
    dispose() {
      disposed = true;
      if (chimeTimer) clearTimeout(chimeTimer);
      for (const voice of droneVoices) voice.oscillator.stop();
      breath.stop();
      void context.close();
    },
  };
}
