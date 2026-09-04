import { Clock, Scene, Vector3 } from 'three';
import { PLAYER_MAX_HEALTH, applyDamageToPlayer } from './playerState.ts';
import { selectJourneyCard, type JourneyCard } from '../core/journey.ts';
import {
  LANDMARKS,
  accessibleRegions,
  befriendCompanion,
  buildShelter,
  collectResources,
  createNewGameState,
  defeatGuardian,
  markRegionSeen,
  restAtShelter,
  restoreLandmark,
  returnHome,
  settleCreature,
  upgradeWeapon,
  type GameState,
  type LandmarkId,
} from '../core/progression.ts';
import { SaveStore, createBrowserAdapter, type SaveAdapter } from '../core/save.ts';
import { normalizeSettings, type Settings } from '../core/settings.ts';
import { gather, isNodeAvailable } from '../core/resources.ts';
import { REGIONS, RESOURCES, type RegionId } from '../core/types.ts';
import { clamp } from '../core/vector.ts';
import {
  GATES,
  RESOURCE_NODES_BY_ID,
  groundHeight,
  isInsideSafeZone,
  regionAt,
} from '../core/world/layout.ts';
import { ZOOM, createCameraRig, type CameraRig } from './camera.ts';
import { createLighting, type LightingRig } from './lighting.ts';
import { createMaterials, setMotionScale, tickMaterials, type MaterialSet } from './art/materials.ts';
import { PerfProbe, createRenderer, nextTierDown, type RendererHandle } from './renderer.ts';
import { buildWorldView, type WorldView } from './worldView.ts';
import { createInput, type InputHub } from './systems/input.ts';
import { assistRange, createPlayer, type PlayerSystem } from './systems/player.ts';
import { createCreatures, type CreatureSystem } from './systems/creatures.ts';
import { createCompanion, type CompanionSystem } from './systems/companion.ts';
import { createParticles, type ParticleSystem } from './systems/particles.ts';
import { CUE_CAPTIONS, createAudioBus, type AudioBus, type SoundCue } from './systems/audio.ts';
import { findPrompt, type InteractPrompt } from './systems/interactions.ts';
import { gateInFrontOf, type GateState } from './systems/collision.ts';
import { createHud, type Hud, type WispIndicator } from '../ui/hud.ts';
import { resolveWispTarget } from './systems/guidance.ts';

/**
 * The composition root.
 *
 * Everything the game owns is created here and handed back as one `Game`
 * handle. Two properties of this design carry their weight:
 *
 *  - **The clock and storage are injected.** Tests pass a fake `now` and an
 *    in-memory save adapter, so a full playthrough runs in milliseconds with no
 *    timers and no browser storage.
 *  - **`step()` is separate from the animation loop.** Tests drive the
 *    simulation at fixed timesteps; only `start()` touches
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
  /** Skips WebGL entirely, for tests that only care about state and rules. */
  headless?: boolean;
}

export interface Game {
  scene: Scene;
  state: GameState;
  camera: CameraRig;
  lighting: LightingRig;
  world: WorldView;
  player: PlayerSystem;
  creatures: CreatureSystem;
  companion: CompanionSystem;
  particles: ParticleSystem;
  audio: AudioBus;
  hud: Hud;
  input: InputHub;
  materials: MaterialSet;
  renderer: RendererHandle | null;
  perf: PerfProbe;
  /** The Journey card as of the last frame. */
  journey: JourneyCard;
  /** The interact prompt as of the last frame, or null. */
  prompt: InteractPrompt | null;
  paused: boolean;
  now(): number;
  step(dt: number): void;
  start(): void;
  stop(): void;
  save(): void;
  /** Clears all local progress and restarts the new-player route. */
  resetProgress(): void;
  /** Moves the player and re-snaps camera, lighting and region. */
  teleport(x: number, z: number): void;
  /** Re-reads `state` and pushes it into the visuals. */
  refresh(): void;
  setPaused(paused: boolean): void;
  applySettings(patch: Partial<Settings>): void;
  /** Runs the interact action for the current prompt, if any. */
  interact(): void;
  resize(): void;
  dispose(): void;
}

/** Frame delta is clamped so a backgrounded tab cannot teleport the player. */
const MAX_STEP = 1 / 20;
/** Seconds between repeats while the gather button is held. */
const GATHER_REPEAT = 0.5;
/** Autosave cadence, ms. Milestones save immediately regardless. */
const AUTOSAVE_MS = 8000;

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

  const creatures = createCreatures(materials.solid);
  scene.add(creatures.group);

  const companion = createCompanion(materials.solid, state.flags.companionBefriended);
  scene.add(companion.group);

  const renderer = options.headless ? null : createRenderer(options.canvas, state.settings);
  const particles = createParticles(materials.mote, renderer?.profile.particles ?? 60);
  scene.add(particles.group);

  const audio = createAudioBus(state.settings.sound, state.settings.musicVolume, state.settings.effectsVolume);
  const perf = new PerfProbe();
  const clock = new Clock(false);

  let running = false;
  let frameHandle = 0;
  let elapsed = 0;
  let lastSaveAt = now();
  let currentRegion = regionAt(state.playerPosition);
  let paused = false;
  let gatherTimer = 0;
  let journey: JourneyCard = selectJourneyCard(state);
  let prompt: InteractPrompt | null = null;
  let hurtCooldown = 0;
  let celebrationTimer = 0;
  const nodeAvailability = new Map<string, boolean>();
  const projected = new Vector3();
  let caption: { text: string; until: number } | null = null;

  /**
   * Plays a cue and, when subtitles are on, captions it.
   *
   * Everything goes through here rather than calling `audio.play` directly, so
   * a new sound cannot be added without its caption being considered.
   */
  const cue = (name: SoundCue) => {
    audio.play(name);
    const text = CUE_CAPTIONS[name];
    if (text && state.settings.subtitles) {
      caption = { text, until: now() + 2200 };
    }
  };

  const gateState = (): GateState => ({
    brambleGateOpen: state.flags.meadowLandmarkRestored,
    mistveilOpen: state.flags.guardianDefeated,
  });

  /** Pushes saved state into the visuals. Idempotent; safe to re-run. */
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
    companion.setBefriended(state.flags.companionBefriended);
    if (state.flags.guardianDefeated) creatures.removeGuardian();
    journey = selectJourneyCard(state);
  };

  const applySettingsToSystems = () => {
    const reduced = state.settings.reducedMotion;
    setMotionScale(reduced ? 0.25 : 1);
    camera.setShakeScale(reduced ? 0 : state.settings.cameraShake);
    options.hud.style.setProperty('--ui-scale', String(state.settings.uiScale));
    options.hud.dataset.handedness = state.settings.handedness;
    options.hud.dataset.contrast = state.settings.highContrast ? 'high' : 'normal';
    audio.setEnabled(state.settings.sound);
    audio.setVolumes(state.settings.musicVolume, state.settings.effectsVolume);
    if (renderer && state.settings.quality !== 'auto') renderer.setQuality(state.settings.quality);
    const budget = renderer?.profile.particles ?? 60;
    particles.setBudget(state.settings.reducedFlash ? Math.round(budget * 0.4) : budget);
    particles.setAmbient(currentRegion, !state.settings.reducedFlash);
  };

  const save = () => {
    store.save(state, now());
    lastSaveAt = now();
  };

  const hud: Hud = createHud(options.hud, input, {
    onZoomCycle() {
      // Three stops rather than a slider: close for gathering, default for
      // walking, wide for getting your bearings.
      const stops = [ZOOM.min + 1, ZOOM.default, ZOOM.max - 4];
      const next = stops.find((stop) => stop > camera.zoom + 0.5) ?? stops[0]!;
      camera.setZoom(next);
      audio.play('ui-tap');
    },
    onSettingsChange(patch) {
      Object.assign(state.settings, normalizeSettings({ ...state.settings, ...patch }));
      applySettingsToSystems();
      audio.play('ui-tap');
      save();
    },
    onResume() {
      setPaused(false);
    },
    onResetProgress() {
      resetProgress();
      setPaused(false);
    },
    onPauseToggle(open) {
      setPaused(open);
    },
  });

  function setPaused(next: boolean): void {
    paused = next;
    hud.setPaused(next);
    audio.play(next ? 'ui-tap' : 'ui-back');
    if (next) save();
  }

  /**
   * Everything that happens when the player arrives in a region.
   *
   * Both the walked transition and `teleport` route through here. They used to
   * be separate: `teleport` assigned `currentRegion` itself, which meant the
   * next frame saw no transition and quietly skipped the banner, the "seen"
   * flag and the save. Reaching Moonmere by teleport therefore never recorded
   * the visit.
   *
   * @param instant Adopt the region's light immediately rather than easing.
   */
  const enterRegion = (region: RegionId, instant: boolean) => {
    currentRegion = region;
    if (instant) lighting.snapToRegion(region);
    else lighting.setRegion(region);
    audio.setRegion(region);
    particles.setAmbient(region, !state.settings.reducedFlash);

    // Only regions the player can legitimately be in count as visited.
    if (accessibleRegions(state).has(region) && !state.regionsSeen.includes(region)) {
      Object.assign(state, markRegionSeen(state, region));
      hud.banner(REGIONS[region].name, REGIONS[region].subtitle);
      journey = selectJourneyCard(state);
      save();
    }
  };

  const resize = () => {
    const width = options.canvas.clientWidth || window.innerWidth || 1;
    const height = options.canvas.clientHeight || window.innerHeight || 1;
    renderer?.resize(width, height);
    camera.resize(width, height);
  };

  // --- Interaction --------------------------------------------------------

  const showLandmarkCelebration = (id: LandmarkId) => {
    const landmark = LANDMARKS[id];
    const at = {
      x: landmark.position.x,
      y: groundHeight(landmark.position.x, landmark.position.z) + 2.4,
      z: landmark.position.z,
    };
    particles.restorationBurst(at, 0x8ff0dc);
    // Reduced flash keeps the moment, at a fraction of the brightness swing.
    lighting.setCelebration(state.settings.reducedFlash ? 0.25 : 1);
    camera.shake(0.35);
    companion.cheer();
    cue('restore');
    celebrationTimer = 2.6;
    hud.banner(
      id === 'meadow-dawnspire' ? 'The Meadow Dawnspire wakes' : 'Wispmere is awake',
      id === 'meadow-dawnspire'
        ? 'The brambles east of here have loosened.'
        : 'Nothing is left to fix. Wander as long as you like.',
    );
  };

  const runInteraction = (): void => {
    if (!prompt || prompt.blocked) {
      if (prompt?.kind === 'gather') cue('gather-empty');
      return;
    }

    switch (prompt.kind) {
      case 'gather': {
        const def = RESOURCE_NODES_BY_ID.get(prompt.id);
        if (!def) return;
        const outcome = gather(def, state.nodes[def.id], now(), Math.random());
        if (!outcome.ok) {
          cue('gather-empty');
          return;
        }
        state.nodes[def.id] = outcome.nextState;
        Object.assign(state, collectResources(state, { [outcome.resource]: outcome.amount }));
        particles.gatherBurst(
          { x: def.position.x, y: def.position.y + 0.6, z: def.position.z },
          player.position,
          RESOURCES[outcome.resource].tint,
        );
        cue('gather');
        hud.toast(`+${outcome.amount} ${RESOURCES[outcome.resource].plural}`);
        journey = selectJourneyCard(state);
        save();
        break;
      }

      case 'upgrade-weapon': {
        if (state.flags.weaponUpgraded) {
          hud.toast('Ossa waves, and goes back to her tinkering.');
          cue('companion');
          return;
        }
        const result = upgradeWeapon(state);
        if (!result.ok) {
          hud.toast(result.reason ?? 'Not yet.');
          cue('gather-empty');
          return;
        }
        Object.assign(state, result.state);
        player.setWeapon(state.weapon);
        particles.restGlow(player.position);
        cue('upgrade');
        hud.toast('Ossa rewinds your chime. It rings brighter.');
        journey = selectJourneyCard(state);
        save();
        break;
      }

      case 'build-shelter': {
        const result = buildShelter(state);
        if (!result.ok) {
          hud.toast(result.reason ?? 'Not yet.');
          cue('gather-empty');
          return;
        }
        Object.assign(state, result.state);
        syncWorldToState();
        particles.restorationBurst(
          { x: player.position.x, y: player.position.y + 1.2, z: player.position.z },
          0xffc98a,
        );
        camera.shake(0.2);
        cue('build');
        hud.banner('Your Hearthnest', 'Rest here to make it the place you come back to.');
        journey = selectJourneyCard(state);
        save();
        break;
      }

      case 'rest': {
        const result = restAtShelter(state);
        if (!result.ok) return;
        Object.assign(state, result.state);
        particles.restGlow(player.position);
        cue('rest');
        hud.toast('Rested. You will always come back here.');
        journey = selectJourneyCard(state);
        save();
        break;
      }

      case 'befriend': {
        const result = befriendCompanion(state);
        if (!result.ok) return;
        Object.assign(state, result.state);
        companion.setBefriended(true);
        companion.cheer();
        particles.restGlow(companion.position);
        cue('companion');
        hud.banner('Pim', 'A wisplet. It will show you where things grow.');
        journey = selectJourneyCard(state);
        save();
        break;
      }

      case 'restore': {
        const id = prompt.id as LandmarkId;
        const result = restoreLandmark(state, id, now());
        if (!result.ok) {
          hud.toast(result.reason ?? 'Not yet.');
          cue('gather-empty');
          return;
        }
        Object.assign(state, result.state);
        syncWorldToState();
        showLandmarkCelebration(id);
        if (id === 'meadow-dawnspire') cue('unlock');
        journey = selectJourneyCard(state);
        save();
        break;
      }
    }
  };

  // --- Wisp indicator -----------------------------------------------------

  const computeWisp = (): WispIndicator | null => {
    const target = resolveWispTarget(journey.target, state, player.position, now(), companion);
    if (!target) return null;
    // The brief is explicit: the wisp appears only when the target is off
    // screen, and disappears the moment it is visible.
    if (camera.isVisible(target.x, target.z, -0.06)) return null;

    const width = options.canvas.clientWidth || 1;
    const height = options.canvas.clientHeight || 1;
    projected.set(target.x, target.y + 1, target.z).project(camera.camera);

    // Push the point out to the screen edge along its own direction, then clamp
    // it into a rectangle that excludes the HUD. Insetting by a fraction of the
    // viewport was not enough: the top-right corner is exactly where the
    // Journey card sits, so a target behind the player put the wisp on top of
    // the card. The margins below are the HUD's own footprint plus a little air.
    const length = Math.max(Math.abs(projected.x), Math.abs(projected.y), 0.0001);
    const edgeX = projected.x / length;
    const edgeY = projected.y / length;
    const margin = { top: 104, bottom: 118, side: 76 };
    const x = clamp(((edgeX + 1) / 2) * width, margin.side, width - margin.side);
    const y = clamp(((1 - edgeY) / 2) * height, margin.top, height - margin.bottom);
    return { x, y, angle: Math.atan2(edgeX, edgeY) };
  };

  // --- Frame --------------------------------------------------------------

  const step = (dt: number) => {
    const clamped = Math.min(Math.max(dt, 0), MAX_STEP);
    const nowMs = now();
    elapsed += clamped;
    celebrationTimer = Math.max(0, celebrationTimer - clamped);

    if (!paused) {
      hurtCooldown = Math.max(0, hurtCooldown - clamped);

      // --- player and attacks
      const aim = creatures.nearestTarget(
        player.position,
        player.facing,
        assistRange(state.weapon),
      );
      const swing = player.update(
        clamped,
        {
          move: input.state.move,
          attackHeld: input.state.attackHeld,
          dodgePressed: input.state.dodgePressed,
          aimAt: aim ? aim.position : null,
        },
        gateState(),
        true,
      );

      if (swing) {
        audio.play(swing.swing.charged ? 'swing-charged' : 'swing');
        const { hits, settled } = creatures.applySwing(
          player.position,
          swing.facing,
          swing.swing,
          nowMs,
        );
        for (const hit of hits) {
          particles.hitSpark({ x: hit.position.x, y: hit.position.y + 0.7, z: hit.position.z }, swing.swing.charged);
          cue('hit');
          camera.shake(swing.swing.charged ? 0.16 : 0.09);
        }
        for (const event of settled) {
          const at = { x: event.creature.position.x, y: event.creature.position.y + 0.5, z: event.creature.position.z };
          particles.settlePuff(at, RESOURCES.glimmercore.tint);
          cue('settle');
          if (event.creature.def.species === 'bramblehorn') {
            Object.assign(state, defeatGuardian(state));
            syncWorldToState();
            cue('unlock');
            hud.banner('Bramblehorn settles', 'The mistveil beyond the grove has thinned.');
          } else {
            Object.assign(state, settleCreature(state, event.cores));
            hud.toast(`+${event.cores} ${RESOURCES.glimmercore.plural}`);
          }
          journey = selectJourneyCard(state);
          save();
        }
      }

      // --- creatures and player damage
      const regions = accessibleRegions(state);
      const playerSafe = isInsideSafeZone(player.position);
      const strikes = creatures.update(
        clamped,
        nowMs,
        player.position,
        playerSafe,
        gateState(),
        regions,
        state.flags.guardianDefeated,
      );

      for (const strike of strikes) {
        if (player.invulnerable || hurtCooldown > 0 || playerSafe) continue;
        const result = applyDamageToPlayer(state.playerHealth, strike.damage);
        state.playerHealth = result.health;
        hurtCooldown = 0.6;
        player.onHurt();
        camera.shake(0.22);
        cue('hurt');
        if (result.defeated) {
          Object.assign(state, returnHome(state));
          player.setPosition(state.playerPosition.x, state.playerPosition.z);
          camera.snapTo(player.position.x, player.position.z);
          creatures.resetAll();
          cue('defeat');
          hud.banner(
            'You wake up somewhere safe',
            'Nothing was lost. Everything you carried is still yours.',
          );
          save();
        }
      }

      // --- interaction
      prompt = findPrompt({
        state,
        player: player.position,
        nowMs,
        companion: companion.position,
        companionBefriended: state.flags.companionBefriended,
      });

      gatherTimer = Math.max(0, gatherTimer - clamped);
      if (input.state.interactPressed) {
        gatherTimer = 0;
        runInteraction();
        gatherTimer = GATHER_REPEAT;
      } else if (
        input.state.interactHeld &&
        gatherTimer <= 0 &&
        prompt?.kind === 'gather' &&
        !prompt.blocked
      ) {
        // Hold-to-repeat, so a cluster can be worked through without tapping.
        runInteraction();
        gatherTimer = GATHER_REPEAT;
      }

      // --- companion
      companion.update(
        clamped,
        nowMs,
        player.position,
        player.facing,
        state.nodes,
        regions,
        state.settings.reducedMotion,
      );

      // --- node visuals and renewal chime
      for (const [id, view] of world.nodes) {
        const def = RESOURCE_NODES_BY_ID.get(id);
        if (!def) continue;
        const available = isNodeAvailable(def, state.nodes[id], nowMs);
        if (nodeAvailability.get(id) === available) continue;
        nodeAvailability.set(id, available);
        view.full.visible = available;
        view.spent.visible = !available;
        if (available && state.nodes[id]) {
          const distance = Math.hypot(
            def.position.x - player.position.x,
            def.position.z - player.position.z,
          );
          if (distance < 18) {
            cue('renew');
            particles.restGlow({ x: def.position.x, y: def.position.y + 0.5, z: def.position.z });
          }
        }
      }

      // --- region transitions and gates
      const region = regionAt(player.position);
      if (region !== currentRegion && accessibleRegions(state).has(region)) {
        enterRegion(region, false);
      }

      const blockedGate = gateInFrontOf(player.position.x, player.position.z, gateState());
      if (blockedGate && input.state.interactPressed) hud.toast(blockedGate.lockedMessage);

      if (input.state.zoomDelta !== 0) camera.nudgeZoom(input.state.zoomDelta);
      camera.update(player.position.x, player.position.z, player.facing, player.speed, clamped);
      state.playerPosition = { ...player.position };
      particles.update(clamped, player.position);
    }

    if (input.state.pausePressed) setPaused(!paused);

    lighting.update(clamped, player.position.x, player.position.y, player.position.z);
    tickMaterials(elapsed);

    hud.update({
      health: state.playerHealth,
      maxHealth: PLAYER_MAX_HEALTH,
      pouch: state.pouch,
      journey,
      prompt,
      wisp: paused ? null : computeWisp(),
      // A sound caption takes the line for a couple of seconds, then the
      // companion's standing guidance comes back.
      companionCaption:
        caption && caption.until > now() ? caption.text : companion.guidance.caption,
      settings: state.settings,
      paused,
      charge: clamp(player.chargeSeconds / 0.55, 0, 1),
      dodgeReady: player.dodge.cooldown <= 0,
    });

    const timestamp = now();
    if (!paused && timestamp - lastSaveAt > AUTOSAVE_MS) save();

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
      particles.setBudget(renderer.profile.particles);
    }
  };

  function resetProgress(): void {
    const fresh = store.reset();
    Object.assign(state, fresh);
    player.setPosition(state.playerPosition.x, state.playerPosition.z);
    player.setWeapon(state.weapon);
    creatures.resetAll();
    companion.setBefriended(false);
    nodeAvailability.clear();
    for (const view of world.nodes.values()) {
      view.full.visible = true;
      view.spent.visible = false;
    }
    currentRegion = regionAt(state.playerPosition);
    syncWorldToState();
    applySettingsToSystems();
    lighting.snapToRegion(currentRegion);
    audio.setRegion(currentRegion);
    camera.snapTo(player.position.x, player.position.z);
    camera.setZoom(14);
    hud.banner('A new morning', 'Everything is as it was on the first day.');
  }

  // --- Wiring -------------------------------------------------------------

  syncWorldToState();
  applySettingsToSystems();
  lighting.snapToRegion(currentRegion);
  audio.setRegion(currentRegion);
  camera.snapTo(player.position.x, player.position.z);
  resize();

  const onResize = () => resize();
  const onFirstGesture = () => audio.resume();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  // Browsers will not start an AudioContext without a gesture; iOS is strict.
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('keydown', onFirstGesture);

  const game: Game = {
    scene,
    state,
    camera,
    lighting,
    world,
    player,
    creatures,
    companion,
    particles,
    audio,
    hud,
    input,
    materials,
    renderer,
    perf,
    get journey() {
      return journey;
    },
    get prompt() {
      return prompt;
    },
    get paused() {
      return paused;
    },
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
    save,
    resetProgress,
    teleport(x, z) {
      player.setPosition(x, z);
      state.playerPosition = { ...player.position };
      enterRegion(regionAt(player.position), true);
      camera.snapTo(player.position.x, player.position.z);
    },
    refresh() {
      syncWorldToState();
      applySettingsToSystems();
    },
    setPaused,
    applySettings(patch) {
      Object.assign(state.settings, normalizeSettings({ ...state.settings, ...patch }));
      applySettingsToSystems();
    },
    interact: runInteraction,
    resize,
    dispose() {
      game.stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      hud.dispose();
      audio.dispose();
      input.dispose();
      particles.dispose();
      companion.dispose();
      creatures.dispose();
      player.dispose();
      world.dispose();
      materials.dispose();
      renderer?.dispose();
    },
  };

  if (options.autoStart !== false) game.start();
  return game;
}

export { createNewGameState, groundHeight, GATES };
