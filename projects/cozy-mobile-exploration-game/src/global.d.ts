import type { Game } from './game/bootstrap.ts';
import type { PLACES, groundHeight, isInsideSafeZone } from './core/world/layout.ts';

/**
 * The debug handle the built game publishes on `window`.
 * Declared here so both the app and the end-to-end tests type-check against the
 * same shape.
 */
declare global {
  interface Window {
    wispmere: Game & {
      places: typeof PLACES;
      groundHeight: typeof groundHeight;
      isInsideSafeZone: typeof isInsideSafeZone;
    };
  }
}

export {};
