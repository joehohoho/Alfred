import { describe, expect, it } from 'vitest';
import { findPrompt, findPrompts } from '../../src/game/systems/interactions.ts';
import { addToPouch } from '../../src/core/inventory.ts';
import { COSTS } from '../../src/core/recipes.ts';
import { createNewGameState, type GameState } from '../../src/core/progression.ts';
import { PLACES, RESOURCE_NODES } from '../../src/core/world/layout.ts';
import { vec3, type Vec3 } from '../../src/core/vector.ts';

const T0 = 1_700_000_000_000;

const context = (state: GameState, player: Vec3) => ({
  state,
  player,
  nowMs: T0,
  companion: PLACES.pimMeeting,
  companionBefriended: state.flags.companionBefriended,
});

const stocked = (): GameState => {
  const state = createNewGameState();
  return {
    ...state,
    pouch: addToPouch(state.pouch, {
      sunpetal: 9, boughwood: 9, riverstone: 9, glimmercore: 9,
    }),
  };
};

describe('interaction priority', () => {
  it('offers the Hearthnest over a bush growing beside it', () => {
    const state = stocked();
    // Place the player right on the clearing, and pretend a node is closer by
    // asking for every prompt in range.
    const prompts = findPrompts(context(state, PLACES.shelterClearing));
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts[0]!.kind).toBe('build-shelter');
  });

  it('ranks a Dawnspire above everything else in range', () => {
    const state = stocked();
    const prompt = findPrompt(context(state, PLACES.meadowDawnspire));
    expect(prompt?.kind).toBe('restore');
  });

  it('still prefers an actionable prompt over a blocked one', () => {
    // No materials: the spire is blocked, so a live node beside it would win.
    const state = createNewGameState();
    const near = RESOURCE_NODES.find(
      (node) =>
        Math.hypot(
          node.position.x - PLACES.meadowDawnspire.x,
          node.position.z - PLACES.meadowDawnspire.z,
        ) < 12,
    )!;
    const prompts = findPrompts(context(state, near.position));
    expect(prompts[0]!.blocked).toBeUndefined();
  });

  it('offers gathering when it is the only thing around', () => {
    const state = createNewGameState();
    const node = RESOURCE_NODES[0]!;
    const prompt = findPrompt(context(state, node.position));
    expect(prompt?.kind).toBe('gather');
    expect(prompt?.id).toBe(node.id);
  });

  it('returns nothing in an empty stretch of meadow', () => {
    expect(findPrompt(context(createNewGameState(), vec3(-38, 0, 34)))).toBeNull();
  });

  it('hides prompts in regions the player cannot reach yet', () => {
    const state = createNewGameState();
    // The finale spire is in the glade, which is still behind the mistveil.
    expect(findPrompt(context(state, PLACES.moonmereDawnspire))).toBeNull();

    const open: GameState = {
      ...state,
      flags: { ...state.flags, meadowLandmarkRestored: true, guardianDefeated: true },
    };
    expect(findPrompt(context(open, PLACES.moonmereDawnspire))?.kind).toBe('restore');
  });

  it('explains what is missing rather than going silent', () => {
    const state = createNewGameState();
    const prompt = findPrompt(context(state, PLACES.shelterClearing));
    expect(prompt?.kind).toBe('build-shelter');
    expect(prompt?.blocked).toBe('Not enough yet');
    expect(prompt?.detail).toMatch(/Still needs/);
    expect(prompt?.missing).toEqual(COSTS.shelter);
  });

  it('turns the merchant into a greeting once the upgrade is bought', () => {
    const state = stocked();
    const before = findPrompt(context(state, PLACES.hollowStump));
    expect(before?.verb).toBe('Rewind');

    const after: GameState = { ...state, flags: { ...state.flags, weaponUpgraded: true } };
    const greeting = findPrompt(context(after, PLACES.hollowStump));
    expect(greeting?.verb).toBe('Greet');
    expect(greeting?.blocked).toBeUndefined();
  });
});
