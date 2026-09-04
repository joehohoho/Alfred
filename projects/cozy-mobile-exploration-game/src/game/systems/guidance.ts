import type { JourneyTarget } from '../../core/journey.ts';
import type { GameState } from '../../core/progression.ts';
import { accessibleRegions } from '../../core/progression.ts';
import { findGuidanceTarget } from '../../core/resources.ts';
import type { Vec3 } from '../../core/vector.ts';
import { CREATURE_POSTS, PLACES, RESOURCE_NODES, groundHeight } from '../../core/world/layout.ts';
import type { CompanionSystem } from './companion.ts';

/**
 * Turns a Journey target into a world position for the off-screen wisp.
 *
 * The Journey card names targets abstractly (`nearest-resource`, a place, a
 * species) precisely so that `core/journey.ts` can stay free of world data.
 * Resolving those names against the live world is this file's whole job.
 */
export function resolveWispTarget(
  target: JourneyTarget,
  state: GameState,
  player: Vec3,
  nowMs: number,
  companion: CompanionSystem,
): Vec3 | null {
  switch (target.kind) {
    case 'none':
      return null;

    case 'nearest-resource': {
      const result = findGuidanceTarget(
        RESOURCE_NODES,
        state.nodes,
        player,
        nowMs,
        accessibleRegions(state),
      );
      return result ? result.def.position : null;
    }

    case 'nearest-creature': {
      const regions = accessibleRegions(state);
      let best: { position: Vec3; distance: number } | null = null;
      for (const post of CREATURE_POSTS) {
        if (post.species !== target.species || !regions.has(post.region)) continue;
        const distance = Math.hypot(post.home.x - player.x, post.home.z - player.z);
        if (!best || distance < best.distance) {
          best = {
            position: {
              x: post.home.x,
              y: groundHeight(post.home.x, post.home.z),
              z: post.home.z,
            },
            distance,
          };
        }
      }
      return best ? best.position : null;
    }

    case 'place': {
      switch (target.id) {
        case 'hollow-stump':
          return PLACES.hollowStump;
        case 'shelter-clearing':
        case 'hearthnest':
          return PLACES.shelterClearing;
        // Before befriending, Pim waits at a fixed spot; after, they follow the
        // player, so pointing at them would be pointing at yourself.
        case 'pim':
          return companion.befriended ? null : companion.position;
        case 'meadow-dawnspire':
          return PLACES.meadowDawnspire;
        case 'bramblehorn-ring':
          return PLACES.bramblehornRing;
        case 'moonmere-dawnspire':
          return PLACES.moonmereDawnspire;
      }
    }
  }
}
