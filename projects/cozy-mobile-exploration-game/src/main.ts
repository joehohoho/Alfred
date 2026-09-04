import './ui/base.css';
import { boot, groundHeight } from './game/bootstrap.ts';

const canvas = document.getElementById('stage');
const hud = document.getElementById('hud');
if (!(canvas instanceof HTMLCanvasElement) || !(hud instanceof HTMLElement)) {
  throw new Error('Wispmere: expected #stage canvas and #hud element in index.html');
}

const game = boot({ canvas, hud });

// The running game is exposed on `window` so end-to-end tests and the manual
// screenshot tool can drive a real session — move the player, grant materials,
// jump the arc — instead of only being able to click at pixels. It is a
// deliberate, documented hook, not a leak: the build ships no other globals.
declare global {
  interface Window {
    wispmere: typeof game;
  }
}
window.wispmere = game;

// Also expose the ground-height function used by the world, so tooling can
// compare a mesh's height against the terrain it is supposed to sit on.
(window as unknown as Record<string, unknown>).wispmere_groundHeight = groundHeight;
