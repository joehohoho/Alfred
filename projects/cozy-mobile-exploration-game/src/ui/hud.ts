import './hud.css';
import { bundleEntries, type Pouch } from '../core/inventory.ts';
import { JOURNEY_ORDER, type JourneyCard } from '../core/journey.ts';
import { RESOURCES, RESOURCE_IDS, type ResourceId } from '../core/types.ts';
import { clamp } from '../core/vector.ts';
import type { Settings } from '../core/settings.ts';
import type { InputHub } from '../game/systems/input.ts';
import type { InteractPrompt } from '../game/systems/interactions.ts';

/**
 * The heads-up display.
 *
 * Plain DOM rather than canvas, deliberately: text stays crisp at any pixel
 * ratio, `env(safe-area-inset-*)` actually works, and the phone's own text
 * scaling and reduce-motion settings reach it.
 *
 * Everything the HUD shows is derived from a `HudModel` passed in each frame.
 * The HUD owns no game state, which is what keeps it impossible for the
 * displayed pouch to disagree with the real one.
 */

export interface WispIndicator {
  /** Screen position in CSS pixels. */
  x: number;
  y: number;
  /** Rotation of the arrow, radians, 0 = pointing up. */
  angle: number;
}

export interface HudModel {
  health: number;
  maxHealth: number;
  pouch: Pouch;
  journey: JourneyCard;
  prompt: InteractPrompt | null;
  wisp: WispIndicator | null;
  companionCaption: string | null;
  settings: Settings;
  paused: boolean;
  /** 0..1 attack charge, for the button fill. */
  charge: number;
  dodgeReady: boolean;
}

export interface HudCallbacks {
  /** Cycles the camera between its close, default and wide framings. */
  onZoomCycle(): void;
  onSettingsChange(patch: Partial<Settings>): void;
  onResume(): void;
  onResetProgress(): void;
  onPauseToggle(open: boolean): void;
}

export interface Hud {
  root: HTMLElement;
  update(model: HudModel): void;
  toast(text: string): void;
  banner(title: string, subtitle: string): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export function createHud(root: HTMLElement, input: InputHub, callbacks: HudCallbacks): Hud {
  root.innerHTML = '';

  // ---------------------------------------------------------------- top left
  const topLeft = el('div', 'zone zone-top-left');

  const vitality = el('div', 'card vitality');
  vitality.append(el('span', 'vitality-label', 'Heart'));
  const heartTrack = el('div', 'heart-track');
  const heartFill = el('div', 'heart-fill');
  heartTrack.append(heartFill);
  vitality.append(heartTrack);

  const pouch = el('div', 'pouch');
  const pouchChips = new Map<ResourceId, { root: HTMLElement; count: HTMLElement; last: number }>();
  for (const id of RESOURCE_IDS) {
    const chip = el('div', 'card pouch-chip');
    chip.title = `${RESOURCES[id].name} — ${RESOURCES[id].blurb}`;
    const dot = el('span', 'pouch-dot');
    dot.style.background = hex(RESOURCES[id].tint);
    const count = el('span', undefined, '0');
    chip.append(dot, count);
    chip.hidden = true;
    pouch.append(chip);
    pouchChips.set(id, { root: chip, count, last: 0 });
  }

  topLeft.append(vitality, pouch);

  // --------------------------------------------------------------- top right
  const topRight = el('div', 'zone zone-top-right');

  const journey = el('div', 'card journey');
  const journeyEyebrow = el('div', 'journey-eyebrow');
  const journeyEyebrowText = el('span', undefined, 'Journey');
  const journeyPips = el('div', 'journey-pips');
  const pips = JOURNEY_ORDER.map(() => {
    const pip = el('span', 'journey-pip');
    journeyPips.append(pip);
    return pip;
  });
  journeyEyebrow.append(journeyEyebrowText, journeyPips);
  const journeyTitle = el('div', 'journey-title');
  const journeyHint = el('div', 'journey-hint');
  const journeyCost = el('div', 'journey-cost');
  journey.append(journeyEyebrow, journeyTitle, journeyHint, journeyCost);

  const pauseButton = el('button', 'card btn btn-pause', '☰');
  pauseButton.setAttribute('aria-label', 'Pause and settings');
  pauseButton.dataset.interactive = 'true';

  topRight.append(journey, pauseButton);

  // ------------------------------------------------------------ bottom zones
  const bottomLeft = el('div', 'zone zone-bottom-left');
  const stickZone = el('div', 'stick-zone');
  stickZone.dataset.interactive = 'true';
  stickZone.setAttribute('role', 'application');
  stickZone.setAttribute('aria-label', 'Movement stick');
  const stickKnob = el('div', 'stick-knob');
  stickZone.append(stickKnob);
  bottomLeft.append(stickZone);

  const bottomRight = el('div', 'zone zone-bottom-right');
  const cluster = el('div', 'action-cluster');

  const zoomButton = el('button', 'btn btn-zoom', 'Zoom');
  const dodgeButton = el('button', 'btn btn-dodge', 'Dodge');
  const interactButton = el('button', 'btn btn-interact', 'Look');
  const attackButton = el('button', 'btn btn-attack');
  const attackLabel = el('span', undefined, 'Chime');
  const chargeFill = el('span', 'btn-charge');
  attackButton.append(chargeFill, attackLabel);
  for (const button of [zoomButton, dodgeButton, interactButton, attackButton]) {
    button.dataset.interactive = 'true';
    button.type = 'button';
  }
  cluster.append(zoomButton, dodgeButton, interactButton, attackButton);
  bottomRight.append(cluster);

  // ------------------------------------------------------------- transients
  const prompt = el('div', 'card prompt');
  const promptVerb = el('div', 'prompt-verb');
  const promptDetail = el('div', 'prompt-detail');
  prompt.append(promptVerb, promptDetail);

  const banner = el('div', 'banner');
  const bannerTitle = el('div', 'banner-title');
  const bannerSubtitle = el('div', 'banner-subtitle');
  banner.append(bannerTitle, bannerSubtitle);

  const toastRail = el('div', 'toast-rail');
  const subtitle = el('div', 'card subtitle');

  const wisp = el('div', 'wisp');
  const wispArrow = el('div', 'wisp-arrow');
  const wispCore = el('div', 'wisp-core');
  wisp.append(wispArrow, wispCore);

  // ------------------------------------------------------------------ panel
  const scrim = el('div', 'panel-scrim');
  scrim.dataset.interactive = 'true';
  const panel = el('div', 'card panel');
  scrim.append(panel);

  const panelHead = el('div', 'panel-head');
  panelHead.append(el('div', 'panel-title', 'Wispmere'), el('div', 'panel-sub', 'Paused'));
  panel.append(panelHead);

  const addSection = (label: string) => panel.append(el('div', 'panel-section', label));

  const addSwitch = (
    label: string,
    note: string,
    get: (settings: Settings) => boolean,
    set: (value: boolean) => Partial<Settings>,
  ) => {
    const row = el('div', 'row');
    const labelBox = el('div', 'row-label');
    labelBox.append(document.createTextNode(label), el('span', 'row-note', note));
    const button = el('button', 'switch');
    button.type = 'button';
    button.dataset.interactive = 'true';
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => {
      const next = button.dataset.on !== 'true';
      callbacks.onSettingsChange(set(next));
    });
    row.append(labelBox, button);
    panel.append(row);
    switchRefs.push({ button, get });
  };

  const switchRefs: Array<{ button: HTMLElement; get: (settings: Settings) => boolean }> = [];
  const sliderRefs: Array<{ input: HTMLInputElement; get: (settings: Settings) => number }> = [];
  const segmentRefs: Array<{
    buttons: HTMLElement[];
    values: string[];
    get: (settings: Settings) => string;
  }> = [];

  const addSlider = (
    label: string,
    note: string,
    min: number,
    max: number,
    step: number,
    get: (settings: Settings) => number,
    set: (value: number) => Partial<Settings>,
  ) => {
    const row = el('div', 'row');
    const labelBox = el('div', 'row-label');
    labelBox.append(document.createTextNode(label), el('span', 'row-note', note));
    const slider = el('input', 'slider') as HTMLInputElement;
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.dataset.interactive = 'true';
    slider.setAttribute('aria-label', label);
    slider.addEventListener('input', () => callbacks.onSettingsChange(set(Number(slider.value))));
    row.append(labelBox, slider);
    panel.append(row);
    sliderRefs.push({ input: slider, get });
  };

  const addSegmented = (
    label: string,
    note: string,
    options: Array<{ value: string; label: string }>,
    get: (settings: Settings) => string,
    set: (value: string) => Partial<Settings>,
  ) => {
    const row = el('div', 'row');
    const labelBox = el('div', 'row-label');
    labelBox.append(document.createTextNode(label), el('span', 'row-note', note));
    const group = el('div', 'segmented');
    const buttons = options.map((option) => {
      const button = el('button', 'segment', option.label);
      button.type = 'button';
      button.dataset.interactive = 'true';
      button.addEventListener('click', () => callbacks.onSettingsChange(set(option.value)));
      group.append(button);
      return button;
    });
    row.append(labelBox, group);
    panel.append(row);
    segmentRefs.push({ buttons, values: options.map((option) => option.value), get });
  };

  addSection('Sound');
  addSwitch('Sound', 'All game audio. On by default.', (s) => s.sound, (sound) => ({ sound }));
  addSlider('Ambience', 'The quiet music under everything.', 0, 1, 0.05, (s) => s.musicVolume, (musicVolume) => ({ musicVolume }));
  addSlider('Effects', 'Gathering, chimes, creatures.', 0, 1, 0.05, (s) => s.effectsVolume, (effectsVolume) => ({ effectsVolume }));
  addSwitch('Subtitles', 'Captions for sounds and what Pim is pointing at.', (s) => s.subtitles, (subtitles) => ({ subtitles }));

  addSection('Comfort');
  addSwitch('Reduced motion', 'Calms swaying plants, drifting light and screen movement.', (s) => s.reducedMotion, (reducedMotion) => ({ reducedMotion }));
  addSwitch('Reduced flash', 'Softens glows, sparkles and bright transitions.', (s) => s.reducedFlash, (reducedFlash) => ({ reducedFlash }));
  addSwitch('High contrast', 'Solid backings and heavier outlines on prompts.', (s) => s.highContrast, (highContrast) => ({ highContrast }));
  addSlider('Camera shake', 'Zero turns it off entirely.', 0, 1, 0.1, (s) => s.cameraShake, (cameraShake) => ({ cameraShake }));

  addSection('Controls & display');
  addSegmented('Stick side', 'Which thumb moves you.', [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ], (s) => s.handedness, (value) => ({ handedness: value as Settings['handedness'] }));
  addSlider('Interface size', 'Scales every button and card.', 0.85, 1.4, 0.05, (s) => s.uiScale, (uiScale) => ({ uiScale }));
  addSegmented('Quality', 'Auto steps down once if the phone is struggling.', [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ], (s) => s.quality, (value) => ({ quality: value as Settings['quality'] }));

  const actions = el('div', 'panel-actions');
  const resumeButton = el('button', 'text-btn', 'Back to the meadow');
  resumeButton.type = 'button';
  resumeButton.dataset.interactive = 'true';
  resumeButton.addEventListener('click', () => callbacks.onResume());

  const resetButton = el('button', 'text-btn', 'Start over');
  resetButton.type = 'button';
  resetButton.dataset.variant = 'danger';
  resetButton.dataset.interactive = 'true';
  let resetArmed = false;
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  resetButton.addEventListener('click', () => {
    if (!resetArmed) {
      // Two taps, because this throws away everything. The confirmation lives
      // in the button itself rather than a modal — one fewer thing to dismiss.
      resetArmed = true;
      resetButton.textContent = 'Tap again to erase all progress';
      resetTimer = setTimeout(() => {
        resetArmed = false;
        resetButton.textContent = 'Start over';
      }, 4000);
      return;
    }
    if (resetTimer) clearTimeout(resetTimer);
    resetArmed = false;
    resetButton.textContent = 'Start over';
    callbacks.onResetProgress();
  });

  actions.append(resumeButton, resetButton);
  panel.append(actions);
  panel.append(
    el(
      'div',
      'panel-sub',
      'Everything is saved on this device only. There is no account, no network and nothing to buy.',
    ),
  );

  root.append(topLeft, topRight, bottomLeft, bottomRight, prompt, banner, toastRail, subtitle, wisp, scrim);

  // ------------------------------------------------------------ interaction
  const holdButton = (button: HTMLElement, name: 'attack' | 'interact') => {
    const down = (event: PointerEvent) => {
      event.preventDefault();
      button.dataset.held = 'true';
      button.setPointerCapture?.(event.pointerId);
      input.press(name);
    };
    const up = (event: PointerEvent) => {
      if (button.dataset.held !== 'true') return;
      event.preventDefault();
      button.dataset.held = 'false';
      input.release(name);
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  };

  holdButton(attackButton, 'attack');
  holdButton(interactButton, 'interact');

  dodgeButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.press('dodge');
  });
  pauseButton.addEventListener('click', () => callbacks.onPauseToggle(true));
  zoomButton.addEventListener('click', () => callbacks.onZoomCycle());
  scrim.addEventListener('pointerdown', (event) => {
    if (event.target === scrim) callbacks.onResume();
  });

  // --- Virtual joystick -----------------------------------------------------
  let stickPointer: number | null = null;
  const stickRadius = () => stickZone.getBoundingClientRect().width / 2;

  const moveStick = (event: PointerEvent) => {
    if (stickPointer !== event.pointerId) return;
    const rect = stickZone.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = stickRadius();
    const distance = Math.hypot(dx, dy);
    const limited = distance > radius ? radius / distance : 1;
    const knobX = dx * limited;
    const knobY = dy * limited;
    stickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    // Screen +y is downward; the game's +y is "away from the camera".
    input.setStick(clamp(knobX / radius, -1, 1), clamp(-knobY / radius, -1, 1));
  };

  const releaseStick = (event: PointerEvent) => {
    if (stickPointer !== event.pointerId) return;
    stickPointer = null;
    stickKnob.style.transform = '';
    input.setStick(0, 0);
  };

  stickZone.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    stickPointer = event.pointerId;
    stickZone.setPointerCapture?.(event.pointerId);
    moveStick(event);
  });
  stickZone.addEventListener('pointermove', moveStick);
  stickZone.addEventListener('pointerup', releaseStick);
  stickZone.addEventListener('pointercancel', releaseStick);

  // ---------------------------------------------------------------- updating
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPromptKey = '';
  let lastJourneyStep = '';

  const setBanner = (title: string, sub: string) => {
    bannerTitle.textContent = title;
    bannerSubtitle.textContent = sub;
    banner.dataset.shown = 'true';
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => {
      banner.dataset.shown = 'false';
    }, 3400);
  };

  return {
    root,

    update(model) {
      // --- vitality
      heartFill.style.transform = `scaleX(${clamp(model.health / model.maxHealth, 0, 1)})`;

      // --- pouch
      for (const id of RESOURCE_IDS) {
        const chip = pouchChips.get(id)!;
        const value = model.pouch[id];
        chip.root.hidden = value <= 0;
        if (value !== chip.last) {
          chip.count.textContent = String(value);
          if (value > chip.last) {
            chip.root.dataset.bumped = 'true';
            setTimeout(() => delete chip.root.dataset.bumped, 400);
          }
          chip.last = value;
        }
      }

      // --- journey
      if (model.journey.step !== lastJourneyStep) {
        lastJourneyStep = model.journey.step;
        journeyTitle.textContent = model.journey.title;
        journeyHint.textContent = model.journey.hint;
        journeyEyebrowText.textContent = model.journey.openEnded ? 'Wispmere' : 'Journey';
        pips.forEach((pip, index) => {
          pip.dataset.done = String(index < model.journey.index - 1);
          pip.dataset.current = String(index === model.journey.index - 1);
        });
      }

      journeyCost.replaceChildren();
      if (model.journey.requirement) {
        for (const [id, amount] of bundleEntries(model.journey.requirement)) {
          const short = model.journey.missing?.[id] ?? 0;
          const chip = el('span', 'cost-chip');
          const dot = el('span', 'pouch-dot');
          dot.style.background = hex(RESOURCES[id].tint);
          chip.append(dot, document.createTextNode(`${Math.min(model.pouch[id], amount)}/${amount}`));
          if (short > 0) chip.dataset.short = 'true';
          journeyCost.append(chip);
        }
      }

      // --- prompt
      const key = model.prompt
        ? `${model.prompt.kind}|${model.prompt.id}|${model.prompt.blocked ?? ''}|${model.prompt.detail ?? ''}`
        : '';
      if (key !== lastPromptKey) {
        lastPromptKey = key;
        if (model.prompt) {
          promptVerb.textContent = `${model.prompt.verb} ${model.prompt.subject}`;
          promptDetail.textContent = model.prompt.blocked
            ? `${model.prompt.blocked}${model.prompt.detail ? ` — ${model.prompt.detail}` : ''}`
            : (model.prompt.detail ?? '');
          promptDetail.hidden = !promptDetail.textContent;
          prompt.dataset.blocked = String(Boolean(model.prompt.blocked));
        }
        prompt.dataset.shown = String(Boolean(model.prompt));
        interactButton.textContent = model.prompt ? model.prompt.verb : 'Look';
        interactButton.dataset.disabled = String(!model.prompt || Boolean(model.prompt.blocked));
      }

      // --- action buttons
      chargeFill.style.height = `${clamp(model.charge, 0, 1) * 100}%`;
      dodgeButton.dataset.disabled = String(!model.dodgeReady);

      // --- wisp
      if (model.wisp) {
        wisp.style.left = `${model.wisp.x}px`;
        wisp.style.top = `${model.wisp.y}px`;
        wispArrow.style.transform = `translateY(calc(-15px * var(--ui-scale))) rotate(${model.wisp.angle}rad)`;
      }
      wisp.dataset.shown = String(Boolean(model.wisp));

      // --- subtitle
      const caption = model.settings.subtitles ? model.companionCaption : null;
      if (caption) subtitle.textContent = caption;
      subtitle.dataset.shown = String(Boolean(caption));

      // --- settings mirror
      for (const ref of switchRefs) ref.button.dataset.on = String(ref.get(model.settings));
      for (const ref of sliderRefs) {
        const value = String(ref.get(model.settings));
        if (ref.input.value !== value) ref.input.value = value;
      }
      for (const ref of segmentRefs) {
        const current = ref.get(model.settings);
        ref.buttons.forEach((button, index) => {
          button.dataset.on = String(ref.values[index] === current);
        });
      }
      root.dataset.reducedMotion = String(model.settings.reducedMotion);
      scrim.dataset.open = String(model.paused);
    },

    toast(text) {
      const node = el('div', 'card toast', text);
      toastRail.append(node);
      setTimeout(() => node.remove(), 2600);
      // Never let a burst of events build a wall of toasts over the play area.
      while (toastRail.childElementCount > 3) toastRail.firstElementChild?.remove();
    },

    banner: setBanner,

    setPaused(paused) {
      scrim.dataset.open = String(paused);
      if (paused) input.clear();
    },

    dispose() {
      if (bannerTimer) clearTimeout(bannerTimer);
      if (resetTimer) clearTimeout(resetTimer);
      root.innerHTML = '';
    },
  };
}
