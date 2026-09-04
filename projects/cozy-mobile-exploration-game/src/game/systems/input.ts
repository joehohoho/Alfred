import { clamp, type Vec2 } from '../../core/vector.ts';

/**
 * Input.
 *
 * One state object, three sources: the on-screen touch controls (the design
 * target), and keyboard/mouse plus gamepad for development and desktop play.
 * None of them is privileged — the HUD pushes into exactly the same hub the
 * keyboard writes to, so a feature can never work on one and silently not the
 * other.
 *
 * Buttons are exposed as both `Held` and `Pressed`. `Pressed` is an edge that
 * is cleared at the end of every frame, so a single tap can never be consumed
 * twice.
 */

export type ButtonName = 'attack' | 'dodge' | 'interact' | 'pause';

export interface InputState {
  /** Screen-space stick, -1..1 on each axis. +y is "away from the camera". */
  move: Vec2;
  attackHeld: boolean;
  attackPressed: boolean;
  dodgePressed: boolean;
  interactHeld: boolean;
  interactPressed: boolean;
  pausePressed: boolean;
  /** World units of zoom requested this frame. Consumed by the camera. */
  zoomDelta: number;
  /** True once any touch has been seen, so the HUD can hide desktop hints. */
  usingTouch: boolean;
}

export interface InputHub {
  state: InputState;
  /** Called by the HUD's virtual joystick. */
  setStick(x: number, y: number): void;
  press(button: ButtonName): void;
  release(button: ButtonName): void;
  /** Clears one-frame edges. Call at the very end of the frame. */
  endFrame(): void;
  /** Releases everything. Used when the game is paused or loses focus. */
  clear(): void;
  dispose(): void;
}

const KEY_MAP: Record<string, ButtonName> = {
  Space: 'attack',
  Enter: 'attack',
  KeyE: 'interact',
  KeyF: 'interact',
  ShiftLeft: 'dodge',
  ShiftRight: 'dodge',
  Escape: 'pause',
  KeyP: 'pause',
};

const AXIS_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(surface: HTMLElement): InputHub {
  const state: InputState = {
    move: { x: 0, y: 0 },
    attackHeld: false,
    attackPressed: false,
    dodgePressed: false,
    interactHeld: false,
    interactPressed: false,
    pausePressed: false,
    zoomDelta: 0,
    usingTouch: false,
  };

  const heldKeys = new Set<string>();
  const stick: Vec2 = { x: 0, y: 0 };
  const virtualHeld = new Set<ButtonName>();

  const press = (button: ButtonName) => {
    virtualHeld.add(button);
    if (button === 'attack') {
      state.attackHeld = true;
      state.attackPressed = true;
    }
    if (button === 'interact') {
      state.interactHeld = true;
      state.interactPressed = true;
    }
    if (button === 'dodge') state.dodgePressed = true;
    if (button === 'pause') state.pausePressed = true;
  };

  const release = (button: ButtonName) => {
    virtualHeld.delete(button);
    if (button === 'attack') state.attackHeld = keyboardHolds('attack');
    if (button === 'interact') state.interactHeld = keyboardHolds('interact');
  };

  const keyboardHolds = (button: ButtonName): boolean => {
    for (const [code, mapped] of Object.entries(KEY_MAP)) {
      if (mapped === button && heldKeys.has(code)) return true;
    }
    return false;
  };

  const recomputeAxis = () => {
    let x = 0;
    let y = 0;
    for (const code of heldKeys) {
      const axis = AXIS_KEYS[code];
      if (axis) {
        x += axis[0];
        y += axis[1];
      }
    }
    // Keyboard gives a full-magnitude stick; `normalizeMoveInput` handles the
    // diagonal so this can stay simple.
    state.move.x = clamp(stick.x + x, -1, 1);
    state.move.y = clamp(stick.y + y, -1, 1);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const code = event.code;
    if (!(code in KEY_MAP) && !(code in AXIS_KEYS)) return;
    event.preventDefault();
    heldKeys.add(code);
    const button = KEY_MAP[code];
    if (button) press(button);
    recomputeAxis();
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const code = event.code;
    if (!heldKeys.delete(code)) return;
    const button = KEY_MAP[code];
    if (button && !virtualHeld.has(button)) {
      if (button === 'attack') state.attackHeld = keyboardHolds('attack');
      if (button === 'interact') state.interactHeld = keyboardHolds('interact');
    }
    recomputeAxis();
  };

  const onBlur = () => {
    heldKeys.clear();
    virtualHeld.clear();
    stick.x = 0;
    stick.y = 0;
    state.attackHeld = false;
    state.interactHeld = false;
    recomputeAxis();
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    state.zoomDelta += Math.sign(event.deltaY) * 1.6;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch') state.usingTouch = true;
    // A click on the world (not on a HUD control) is a convenience attack for
    // mouse users; touch players use the on-screen button.
    if (event.pointerType === 'mouse' && event.button === 0) press('attack');
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button === 0) release('attack');
  };

  // --- Pinch zoom ----------------------------------------------------------
  const activeTouches = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;

  const onTouchStart = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    state.usingTouch = true;
    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activeTouches.size === 2) pinchDistance = currentPinchDistance();
  };

  const currentPinchDistance = (): number => {
    const points = [...activeTouches.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
  };

  const onTouchMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    if (!activeTouches.has(event.pointerId)) return;
    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activeTouches.size === 2) {
      const distance = currentPinchDistance();
      if (pinchDistance > 0 && distance > 0) {
        // Pinching apart zooms in, which means *reducing* the frustum height.
        state.zoomDelta += (pinchDistance - distance) * 0.055;
      }
      pinchDistance = distance;
    }
  };

  const onTouchEnd = (event: PointerEvent) => {
    activeTouches.delete(event.pointerId);
    if (activeTouches.size < 2) pinchDistance = 0;
  };

  // --- Gamepad -------------------------------------------------------------
  const gamepadHeld = new Set<ButtonName>();

  const pollGamepad = () => {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pad = navigator.getGamepads?.()?.find((candidate) => candidate?.connected);
    if (!pad) return;
    const [axisX = 0, axisY = 0] = pad.axes;
    if (Math.hypot(axisX, axisY) > 0.12) {
      // Gamepad Y is inverted relative to our "away from camera is +y".
      state.move.x = clamp(state.move.x + axisX, -1, 1);
      state.move.y = clamp(state.move.y - axisY, -1, 1);
    }
    const mapping: Array<[number, ButtonName]> = [
      [0, 'attack'],
      [2, 'interact'],
      [1, 'dodge'],
      [9, 'pause'],
    ];
    for (const [index, button] of mapping) {
      const pressed = pad.buttons[index]?.pressed ?? false;
      if (pressed && !gamepadHeld.has(button)) {
        gamepadHeld.add(button);
        press(button);
      } else if (!pressed && gamepadHeld.delete(button)) {
        release(button);
      }
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  surface.addEventListener('wheel', onWheel, { passive: false });
  surface.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  surface.addEventListener('pointerdown', onTouchStart);
  window.addEventListener('pointermove', onTouchMove);
  window.addEventListener('pointerup', onTouchEnd);
  window.addEventListener('pointercancel', onTouchEnd);

  return {
    state,
    setStick(x, y) {
      stick.x = clamp(x, -1, 1);
      stick.y = clamp(y, -1, 1);
      recomputeAxis();
    },
    press,
    release,
    endFrame() {
      pollGamepad();
      state.attackPressed = false;
      state.dodgePressed = false;
      state.interactPressed = false;
      state.pausePressed = false;
      state.zoomDelta = 0;
      recomputeAxis();
    },
    clear: onBlur,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      surface.removeEventListener('wheel', onWheel);
      surface.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointerdown', onTouchStart);
      window.removeEventListener('pointermove', onTouchMove);
      window.removeEventListener('pointerup', onTouchEnd);
      window.removeEventListener('pointercancel', onTouchEnd);
    },
  };
}
