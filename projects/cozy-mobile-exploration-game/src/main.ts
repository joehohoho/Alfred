import './ui/base.css';
import { boot } from './game/bootstrap.ts';
import { PLACES, groundHeight, isInsideSafeZone } from './core/world/layout.ts';

const canvas = document.getElementById('stage');
const hud = document.getElementById('hud');
if (!(canvas instanceof HTMLCanvasElement) || !(hud instanceof HTMLElement)) {
  throw new Error('Wispmere: expected #stage canvas and #hud element in index.html');
}

const game = boot({ canvas, hud });

/**
 * The running game, exposed for tooling.
 *
 * End-to-end tests and the screenshot tour drive a real session through this —
 * walking, gathering, fighting, restoring — rather than only being able to
 * click at pixels. It is a deliberate, documented hook: one namespaced global,
 * no other globals, and nothing here bypasses a game rule. `interact()`,
 * `resetProgress()` and the systems behind them are the same code paths the
 * player's thumb reaches.
 */
export const wispmere = Object.assign(game, {
  places: PLACES,
  groundHeight,
  isInsideSafeZone,
});

window.wispmere = wispmere;
