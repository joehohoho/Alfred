// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { boot, type Game } from '../../src/game/bootstrap.ts';
import { createMemoryAdapter, SAVE_KEY, type SaveAdapter } from '../../src/core/save.ts';
import { COSTS, STARTER_STOCK } from '../../src/core/recipes.ts';
import { PLACES } from '../../src/core/world/layout.ts';
import { addToPouch } from '../../src/core/inventory.ts';
import { JOURNEY_ORDER } from '../../src/core/journey.ts';
import { PLAYER_MAX_HEALTH } from '../../src/core/progression.ts';

/**
 * Play-mode-equivalent tests.
 *
 * These boot the *real* composition root — the same `boot()` the browser
 * calls — with WebGL skipped and a fake clock and storage injected. Everything
 * else is genuine: the scene graph, the HUD DOM, the interaction resolution,
 * the save format. That is the closest thing to a play-mode test this stack has,
 * and it is what catches wiring mistakes that unit tests structurally cannot.
 */

interface Harness {
  game: Game;
  adapter: SaveAdapter;
  advance(seconds: number, steps?: number): void;
  clock: { value: number };
}

function makeHarness(adapter: SaveAdapter = createMemoryAdapter()): Harness {
  document.body.innerHTML = '<canvas id="stage"></canvas><div id="hud"></div>';
  const canvas = document.getElementById('stage') as HTMLCanvasElement;
  const hud = document.getElementById('hud') as HTMLElement;
  const clock = { value: 1_700_000_000_000 };

  const game = boot({
    canvas,
    hud,
    adapter,
    now: () => clock.value,
    autoStart: false,
    headless: true,
  });

  return {
    game,
    adapter,
    clock,
    advance(seconds, steps = Math.max(1, Math.round(seconds / (1 / 60)))) {
      const dt = seconds / steps;
      for (let i = 0; i < steps; i++) {
        clock.value += dt * 1000;
        game.step(dt);
      }
    },
  };
}

let harness: Harness;

beforeEach(() => {
  harness = makeHarness();
});

describe('scene composition', () => {
  it('builds a populated scene without a renderer', () => {
    const { game } = harness;
    expect(game.renderer).toBeNull();
    expect(game.scene.children.length).toBeGreaterThan(3);
    expect(game.scene.getObjectByName('wispmere-world')).toBeTruthy();
    expect(game.scene.getObjectByName('terrain')).toBeTruthy();
    expect(game.scene.getObjectByName('creek')).toBeTruthy();
    expect(game.scene.getObjectByName('resource-nodes')).toBeTruthy();
    expect(game.scene.getObjectByName('creatures')).toBeTruthy();
    expect(game.scene.getObjectByName('pim')).toBeTruthy();
    expect(game.scene.getObjectByName('particles')).toBeTruthy();
  });

  it('mounts a HUD with the controls the brief requires', () => {
    const hud = document.getElementById('hud')!;
    expect(hud.querySelector('.stick-zone')).toBeTruthy();
    expect(hud.querySelector('.btn-attack')).toBeTruthy();
    expect(hud.querySelector('.btn-interact')).toBeTruthy();
    expect(hud.querySelector('.btn-dodge')).toBeTruthy();
    expect(hud.querySelector('.btn-pause')).toBeTruthy();
    expect(hud.querySelector('.journey')).toBeTruthy();
    expect(hud.querySelector('.wisp')).toBeTruthy();
  });

  it('starts a new player on the first Journey step with no save present', () => {
    expect(harness.game.journey.step).toBe('gather-starter');
    expect(harness.game.state.pouch.sunpetal).toBe(0);
  });

  it('audio is silent and safe in a headless context', () => {
    // The brief requires audio to disable itself in automated contexts.
    expect(harness.game.audio.available).toBe(false);
    expect(() => harness.game.audio.play('restore')).not.toThrow();
  });

  it('steps without throwing and keeps the player on the ground', () => {
    harness.advance(1);
    expect(Number.isFinite(harness.game.player.position.x)).toBe(true);
    expect(harness.game.player.position.y).toBeLessThan(3);
  });
});

describe('movement', () => {
  it('moves the player when the stick is pushed, in the camera\'s frame', () => {
    const { game } = harness;
    const start = { ...game.player.position };
    game.input.setStick(0, 1);
    harness.advance(0.6);
    const travelled = Math.hypot(
      game.player.position.x - start.x,
      game.player.position.z - start.z,
    );
    expect(travelled).toBeGreaterThan(1.5);
  });

  it('stops at the locked Bramble Gate', () => {
    const { game } = harness;
    // Walk into the gate from the meadow side.
    game.teleport(PLACES.groveGate.x - 3, PLACES.groveGate.z);
    game.input.setStick(1, 0);
    harness.advance(3);
    // The gate faces roughly +x here; the player must not get past it.
    expect(game.player.position.x).toBeLessThan(PLACES.groveGate.x + 0.5);
  });
});

describe('persistence through restart', () => {
  it('carries pouch, flags, position and node timers across a fresh boot', () => {
    const { game, adapter, clock } = harness;

    Object.assign(game.state, {
      pouch: addToPouch(game.state.pouch, { sunpetal: 4, boughwood: 2, glimmercore: 3 }),
      nodes: { 'petal-waking-0': { depletedAt: clock.value - 5000 } },
    });
    game.state.flags.weaponUpgraded = true;
    game.state.weapon = 'bright-chime';
    game.teleport(2, 4);
    game.save();
    game.dispose();

    const revived = makeHarness(adapter);
    expect(revived.game.state.pouch.sunpetal).toBe(4);
    expect(revived.game.state.pouch.glimmercore).toBe(3);
    expect(revived.game.state.flags.weaponUpgraded).toBe(true);
    expect(revived.game.state.weapon).toBe('bright-chime');
    expect(revived.game.player.position.x).toBeCloseTo(2, 1);
    expect(revived.game.state.nodes['petal-waking-0']).toEqual({
      depletedAt: harness.clock.value - 5000,
    });
    revived.game.dispose();
  });

  it('restores the world visuals to match a mid-game save', () => {
    const { game, adapter } = harness;
    game.state.flags.meadowLandmarkRestored = true;
    game.state.flags.shelterBuilt = true;
    game.save();
    game.dispose();

    const revived = makeHarness(adapter);
    expect(revived.game.world.spires['meadow-dawnspire'].restored.visible).toBe(true);
    expect(revived.game.world.spires['meadow-dawnspire'].dormant.visible).toBe(false);
    expect(revived.game.world.brambleGate.open.visible).toBe(true);
    expect(revived.game.world.hearthnest.built.visible).toBe(true);
    expect(revived.game.world.hearthnest.site.visible).toBe(false);
    revived.game.dispose();
  });
});

describe('the visible reset action', () => {
  it('clears local progress and restores the new-player route', () => {
    const { game, adapter } = harness;
    Object.assign(game.state, { pouch: addToPouch(game.state.pouch, { sunpetal: 9 }) });
    game.state.flags.meadowLandmarkRestored = true;
    game.state.flags.guardianDefeated = true;
    game.refresh();
    game.save();
    expect(adapter.read(SAVE_KEY)).toBeTruthy();

    game.resetProgress();

    expect(adapter.read(SAVE_KEY)).toBeNull();
    expect(game.state.pouch.sunpetal).toBe(0);
    expect(game.state.flags.meadowLandmarkRestored).toBe(false);
    expect(game.state.flags.guardianDefeated).toBe(false);
    expect(game.journey.step).toBe('gather-starter');
    expect(game.world.spires['meadow-dawnspire'].dormant.visible).toBe(true);
    expect(game.world.brambleGate.closed.visible).toBe(true);
    expect(game.state.playerHealth).toBe(PLAYER_MAX_HEALTH);
  });

  it('is reachable from the pause panel', () => {
    const resetButton = [...document.querySelectorAll('.text-btn')].find(
      (node) => node.textContent === 'Start over',
    );
    expect(resetButton).toBeTruthy();
  });
});

describe('landmark restoration and the guardian unlock', () => {
  it('refuses the meadow spire without materials and accepts it with them', () => {
    const { game } = harness;
    game.teleport(PLACES.meadowDawnspire.x, PLACES.meadowDawnspire.z + 2.5);
    harness.advance(0.1);

    expect(game.prompt?.kind).toBe('restore');
    expect(game.prompt?.blocked).toBe('Not enough yet');
    game.interact();
    expect(game.state.flags.meadowLandmarkRestored).toBe(false);

    Object.assign(game.state, { pouch: addToPouch(game.state.pouch, COSTS.landmarkMeadow) });
    harness.advance(0.1);
    expect(game.prompt?.blocked).toBeUndefined();
    game.interact();

    expect(game.state.flags.meadowLandmarkRestored).toBe(true);
    expect(game.state.pouch.glimmercore).toBe(0);
    expect(game.world.spires['meadow-dawnspire'].restored.visible).toBe(true);
    expect(game.world.brambleGate.open.visible).toBe(true);
  });

  it('will not light the finale spire before the guardian settles', () => {
    const { game } = harness;
    game.state.flags.meadowLandmarkRestored = true;
    game.refresh();
    Object.assign(game.state, {
      pouch: addToPouch(game.state.pouch, {
        sunpetal: 9, boughwood: 9, riverstone: 9, glimmercore: 9,
      }),
    });
    game.teleport(PLACES.moonmereDawnspire.x, PLACES.moonmereDawnspire.z + 2.5);
    harness.advance(0.1);

    game.interact();
    expect(game.state.flags.moonmereLandmarkRestored).toBe(false);

    game.state.flags.guardianDefeated = true;
    game.refresh();
    harness.advance(0.1);
    game.interact();
    expect(game.state.flags.moonmereLandmarkRestored).toBe(true);
    expect(game.journey.step).toBe('explore-freely');
  });

  it('removes the guardian from the world once it has settled', () => {
    const { game } = harness;
    game.state.flags.meadowLandmarkRestored = true;
    game.state.flags.guardianDefeated = true;
    game.refresh();
    harness.advance(0.2);
    const guardian = game.creatures.instances.find((c) => c.def.species === 'bramblehorn')!;
    expect(guardian.group.visible).toBe(false);
  });
});

describe('arriving in a region', () => {
  it('records the visit however the player got there', () => {
    const { game } = harness;
    game.state.flags.meadowLandmarkRestored = true;
    game.state.flags.guardianDefeated = true;
    game.refresh();

    expect(game.state.regionsSeen).not.toContain('glade');
    game.teleport(PLACES.moonmereDawnspire.x, PLACES.moonmereDawnspire.z + 6);
    harness.advance(0.2);

    expect(game.state.regionsSeen).toContain('glade');
    expect(game.state.flags.moonmereVisited).toBe(true);
  });

  it('does not credit a visit to a region that is still locked', () => {
    const { game } = harness;
    game.teleport(PLACES.moonmereDawnspire.x, PLACES.moonmereDawnspire.z + 6);
    harness.advance(0.2);
    expect(game.state.flags.moonmereVisited).toBe(false);
    expect(game.state.regionsSeen).not.toContain('glade');
  });
});

describe('companion guidance', () => {
  it('waits to be met, then follows and points at resources', () => {
    const { game } = harness;
    expect(game.companion.befriended).toBe(false);

    game.teleport(PLACES.pimMeeting.x + 1, PLACES.pimMeeting.z + 1);
    harness.advance(0.5);
    expect(game.prompt?.kind).toBe('befriend');

    game.interact();
    expect(game.state.flags.companionBefriended).toBe(true);
    expect(game.companion.befriended).toBe(true);

    harness.advance(2);
    expect(game.companion.guidance.target).not.toBeNull();
    expect(game.companion.guidance.target!.def.region).toBe('meadow');

    // And it stays near the player rather than wandering off.
    const distance = Math.hypot(
      game.companion.position.x - game.player.position.x,
      game.companion.position.z - game.player.position.z,
    );
    expect(distance).toBeLessThan(10);
  });

  it('falls back to a renewal countdown when nothing nearby is ready', () => {
    const { game, clock } = harness;
    game.state.flags.companionBefriended = true;
    game.refresh();
    // Deplete every node in the meadow.
    for (const node of game.world.nodes.keys()) {
      game.state.nodes[node] = { depletedAt: clock.value };
    }
    harness.advance(1.5);
    expect(game.companion.guidance.target?.available).toBe(false);
    expect(game.companion.guidance.caption).toMatch(/come back in/);
  });
});

describe('gathering', () => {
  it('gathers a node, banks the material, and marks it spent', () => {
    const { game, clock } = harness;
    const node = [...game.world.nodes.values()].find((view) => view.resource === 'sunpetal')!;
    const def = [...game.scene.getObjectByName('resource-nodes')!.children];
    expect(def.length).toBeGreaterThan(0);

    // Stand on the node.
    const mesh = node.full;
    game.teleport(mesh.position.x, mesh.position.z + 1);
    harness.advance(0.1);

    expect(game.prompt?.kind).toBe('gather');
    game.interact();

    expect(game.state.pouch.sunpetal).toBeGreaterThan(0);
    expect(game.state.nodes[node.id]?.depletedAt).toBe(clock.value);
    harness.advance(0.1);
    expect(node.full.visible).toBe(false);
    expect(node.spent.visible).toBe(true);
  });

  it('refuses a spent node and offers it again once it renews', () => {
    const { game, clock } = harness;
    const node = [...game.world.nodes.values()].find((view) => view.resource === 'sunpetal')!;
    game.teleport(node.full.position.x, node.full.position.z + 1);
    harness.advance(0.1);
    game.interact();
    const banked = game.state.pouch.sunpetal;

    harness.advance(0.1);
    game.interact();
    expect(game.state.pouch.sunpetal).toBe(banked);
    expect(game.prompt?.blocked).toBe('Still growing back');

    // Sunpetals renew in 90 seconds.
    clock.value += 91_000;
    harness.advance(0.1);
    expect(game.prompt?.blocked).toBeUndefined();
    game.interact();
    expect(game.state.pouch.sunpetal).toBeGreaterThan(banked);
  });
});

describe('the Journey card tracks saved progression', () => {
  it('advances step by step as the arc is completed', () => {
    const { game } = harness;
    expect(game.journey.step).toBe('gather-starter');

    Object.assign(game.state, { pouch: addToPouch(game.state.pouch, STARTER_STOCK) });
    game.refresh();
    expect(game.journey.step).toBe('find-core');

    Object.assign(game.state, { pouch: addToPouch(game.state.pouch, { glimmercore: 1 }) });
    game.refresh();
    expect(game.journey.step).toBe('visit-merchant');

    expect(JOURNEY_ORDER.indexOf(game.journey.step)).toBe(game.journey.index - 1);
  });
});
