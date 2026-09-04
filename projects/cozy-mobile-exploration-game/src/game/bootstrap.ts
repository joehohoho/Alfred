import { Clock, Scene } from 'three';
import { createNewGameState, type GameState } from '../core/progression.ts';
import { SaveStore, createBrowserAdapter, type SaveAdapter } from '../core/save.ts';
import { regionAt, groundHeight } from '../core/world/layout.ts';
import { createCameraRig, type CameraRig } from './camera.ts';
import { createLighting, type LightingRig } from './lighting.ts';
import { createMaterials, setMotionScale, tickMaterials, type MaterialSet } from './art/materials.ts';
import { PerfProbe, createRenderer, nextTierDown, type RendererHandle } from './renderer.ts';
import { buildWorldView, type WorldView } from './worldView.ts';
import { createInput, type InputHub } from './systems/input.ts';
import { createPlayer, type PlayerSystem } from './systems/player.ts';
import type { GateState } from './systems/collision.ts';

/**
 * The composition root.
 *
 * Everything the game owns is created here, in one place, and handed back as a
 * `Game` handle. Two properties of this design carry their weight:
 *
 *  - **The clock and storage are injected.** Tests pass a fake `now` and an
 *    in-memory save adapter, so a full playthrough can be simulated in
 *    milliseconds with no timers and no browser storage.
 *  - **`step()` is separate from the animation loop.** Tests drive the
 *    simulation directly at fixed timesteps; only `start()` involves
 *    `requestAnimationFrame`.
 */

export interface BootOptions {
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  /** Storage port. Defaults to a resilient `localStorage` wrapper. */
  adapter?: SaveAdapter;
  /** Clock. Defaults to `Date.now`. */
  now?: () => number;
  /** When false, the caller drives `step()` itself. Defaults to true. */
  autoStart?: boolean;
  /** Skips WebGL entirely. For tests that only care about state and rules. */
  headless?: boolean;
}

export interface Game {
  scene: Scene;
  state: GameState;
  camera: CameraRig;
  lighting: LightingRig;
  world: WorldView;
  player: PlayerSystem;
  input: InputHub;
  materials: MaterialSet;
  renderer: RendererHandle | null;
  perf: PerfProbe;
  /** Wall clock, injected. */
  now(): number;
  /** Advances the simulation by `dt` seconds and renders one frame. */
  step(dt: number): void;
  start(): void;
  stop(): void;
  /** Writes the current state to storage. */
  save(): void;
  /**
   * Moves the player, re-snaps the camera and adopts the destination region's
   * light immediately. Used by respawn, by the screenshot tour, and by tests
   * that need to reach a landmark without walking there.
   */
  teleport(x: number, z: number): void;
  /**
   * Re-reads `state` and pushes it into the visuals. Call after changing flags
   * directly (a restoration, a reset, a test setting up a scenario).
   */
  refresh(): void;
  /** Clears all local progress and restarts the new-player route. */
  resetProgress(): void;
  resize(): void;
  dispose(): void;
}

/** Frame delta is clamped so a backgrounded tab cannot teleport the player. */
const MAX_STEP = 1 / 20;

export function boot(options: BootOptions): Game {
  const now = options.now ?? (() => Date.now());
  const store = new SaveStore(options.adapter ?? createBrowserAdapter());
  const state: GameState = store.load(now());

  const scene = new Scene();
  const materials = createMaterials();
  const lighting = createLighting(scene);
  const world = buildWorldView(materials);
  scene.add(world.root);

  const camera = createCameraRig();
  const input = createInput(options.canvas);

  const player = createPlayer(
    materials.solid,
    state.weapon,
    state.playerPosition.x,
    state.playerPosition.z,
  );
  scene.add(player.group);

  const renderer = options.headless ? null : createRenderer(options.canvas, state.settings);
  const perf = new PerfProbe();
  const clock = new Clock(false);

  let running = false;
  let frameHandle = 0;
  let elapsed = 0;
  let lastSaveAt = now();
  let currentRegion = regionAt(state.playerPosition);

  const gateState = (): GateState => ({
    brambleGateOpen: state.flags.meadowLandmarkRestored,
    mistveilOpen: state.flags.guardianDefeated,
  });

  /** Pushes saved state into the visuals. Idempotent, so it is safe to re-run. */
  const syncWorldToState = () => {
    world.spires['meadow-dawnspire'].dormant.visible = !state.flags.meadowLandmarkRestored;
    world.spires['meadow-dawnspire'].restored.visible = state.flags.meadowLandmarkRestored;
    world.spires['moonmere-dawnspire'].dormant.visible = !state.flags.moonmereLandmarkRestored;
    world.spires['moonmere-dawnspire'].restored.visible = state.flags.moonmereLandmarkRestored;

    world.brambleGate.closed.visible = !state.flags.meadowLandmarkRestored;
    world.brambleGate.open.visible = state.flags.meadowLandmarkRestored;
    world.mistveil.visible = !state.flags.guardianDefeated;

    world.hearthnest.site.visible = !state.flags.shelterBuilt;
    world.hearthnest.built.visible = state.flags.shelterBuilt;
    world.hearthnest.fire.visible = state.flags.shelterBuilt;

    player.setWeapon(state.weapon);
  };

  const applySettings = () => {
    setMotionScale(state.settings.reducedMotion ? 0.25 : 1);
    camera.setShakeScale(state.settings.reducedMotion ? 0 : state.settings.cameraShake);
    options.hud.style.setProperty('--ui-scale', String(state.settings.uiScale));
    options.hud.dataset.handedness = state.settings.handedness;
    options.hud.dataset.contrast = state.settings.highContrast ? 'high' : 'normal';
    if (renderer && state.settings.quality !== 'auto') renderer.setQuality(state.settings.quality);
  };

  const resize = () => {
    const width = options.canvas.clientWidth || window.innerWidth || 1;
    const height = options.canvas.clientHeight || window.innerHeight || 1;
    renderer?.resize(width, height);
    camera.resize(width, height);
  };

  syncWorldToState();
  applySettings();
  lighting.snapToRegion(currentRegion);
  camera.snapTo(player.position.x, player.position.z);
  resize();

  const step = (dt: number) => {
    const clamped = Math.min(Math.max(dt, 0), MAX_STEP);
    elapsed += clamped;

    const swing = player.update(
      clamped,
      {
        move: input.state.move,
        attackHeld: input.state.attackHeld,
        dodgePressed: input.state.dodgePressed,
      },
      gateState(),
      true,
    );
    void swing;

    if (input.state.zoomDelta !== 0) camera.nudgeZoom(input.state.zoomDelta);

    const region = regionAt(player.position);
    if (region !== currentRegion) {
      currentRegion = region;
      lighting.setRegion(region);
    }

    camera.update(player.position.x, player.position.z, player.facing, player.speed, clamped);
    lighting.update(clamped, player.position.x, player.position.y, player.position.z);
    tickMaterials(elapsed);

    state.playerPosition = { ...player.position };

    // A slow autosave keeps a crash or a swipe-away cheap, without writing
    // storage every frame.
    const timestamp = now();
    if (timestamp - lastSaveAt > 10_000) {
      store.save(state, timestamp);
      lastSaveAt = timestamp;
    }

    renderer?.renderer.render(scene, camera.camera);
    input.endFrame();
  };

  const frame = () => {
    if (!running) return;
    frameHandle = requestAnimationFrame(frame);
    const dt = clock.getDelta();
    step(dt);

    if (state.settings.quality === 'auto' && renderer && perf.sample(dt * 1000)) {
      renderer.setQuality(nextTierDown(renderer.profile.tier));
    }
  };

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const game: Game = {
    scene,
    state,
    camera,
    lighting,
    world,
    player,
    input,
    materials,
    renderer,
    perf,
    now,
    step,
    start() {
      if (running) return;
      running = true;
      clock.start();
      frameHandle = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      clock.stop();
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    },
    save() {
      store.save(state, now());
      lastSaveAt = now();
    },
    teleport(x, z) {
      player.setPosition(x, z);
      state.playerPosition = { ...player.position };
      currentRegion = regionAt(player.position);
      lighting.snapToRegion(currentRegion);
      camera.snapTo(player.position.x, player.position.z);
    },
    refresh() {
      syncWorldToState();
      applySettings();
    },
    resetProgress() {
      const fresh = store.reset();
      Object.assign(state, fresh);
      player.setPosition(state.playerPosition.x, state.playerPosition.z);
      currentRegion = regionAt(state.playerPosition);
      syncWorldToState();
      applySettings();
      lighting.snapToRegion(currentRegion);
      camera.snapTo(player.position.x, player.position.z);
    },
    resize,
    dispose() {
      game.stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      input.dispose();
      player.dispose();
      world.dispose();
      materials.dispose();
      renderer?.dispose();
    },
  };

  if (options.autoStart !== false) game.start();
  return game;
}

/** Re-exported so tests can construct a starting state without the game. */
export { createNewGameState, groundHeight };
