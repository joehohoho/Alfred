# Wispmere

An original, all-ages, cozy top-down/isometric 3D exploration game for **iPhone
(landscape)**. Wake in a warm meadow after the old network of magical landmarks has
fallen quiet, gather what grows, make a home, befriend a small light, and coax two
sleeping Dawnspires back awake.

Fully offline. Local save only. No accounts, no network, no ads, no analytics, no
monetisation, no backend.

> **New here? Read [`PROJECT-MEMORY.md`](./PROJECT-MEMORY.md).** It is the source of
> truth for direction, decisions, progress and open questions.

## Stack

TypeScript · Three.js · Vite · Capacitor (iOS) · Vitest · Playwright · Web Audio.
All geometry and all audio are generated procedurally in code — there are no imported
art or sound assets. Reasoning and rejected alternatives:
[`docs/ARCHITECTURE-DECISION.md`](./docs/ARCHITECTURE-DECISION.md).

## Getting started

```bash
git clone git@github.com:joehohoho/cozy-mobile-exploration-game.git
cd cozy-mobile-exploration-game
npm install
npm run dev          # dev server with HMR at http://localhost:5173
```

Landscape is the design target. In a desktop browser, use a narrow-tall window or the
device toolbar set to an iPhone in landscape.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm test` | Unit + integration tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck, then production bundle into `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run test:e2e` | Playwright: the full route plus HUD layout, in an iPhone landscape viewport |
| `npm run shots` | Render the world tour to `screenshots/` |
| `npm run ios:sync` | Build and sync the Capacitor iOS project |
| `npm run ios:open` | Open the iOS project in Xcode *(macOS only)* |

## Controls

**Touch (the design target)** — left virtual joystick to move; right cluster for
interact/gather, attack, dodge and zoom. Hold to repeat gathering and attacks; hold
attack to charge. Pinch to zoom, or tap Zoom to cycle three framings. The joystick and
the action cluster swap sides for left- or right-handed play, and the whole interface
scales.

**Desktop, for development** — `WASD`/arrows to move, `E` interact, `Space`/left click
attack (hold to charge), `Shift` dodge, scroll to zoom, `Esc` pause. A gamepad works too.

## Layout

```
src/core/    Pure, deterministic game rules. No three.js, no DOM, no clock.
src/game/    Three.js presentation and systems.
src/ui/      DOM HUD — crisp text, safe-area aware, scalable.
tests/       unit (node) · integration (jsdom) · e2e (Playwright)
docs/        Architecture decision, validation record.
```

The boundary between `core/` and everything else is enforced by
`tests/unit/core-purity.test.ts`, not by convention.

## Accessibility

In the pause panel: sound on/off with separate ambience and effects levels, subtitles
(which caption sounds as well as the companion), reduced motion, reduced flash, high
contrast, camera-shake amount down to zero, stick handedness, and interface scale.
Everything is saved with the game.

There is also a **Start over** action there that clears all local progress and puts the
new-player route back. It needs two taps.

## Status

Under active development. See the milestone table in
[`PROJECT-MEMORY.md`](./PROJECT-MEMORY.md#milestones) for what is done and what is next,
and [`docs/VALIDATION.md`](./docs/VALIDATION.md) for exactly what has and has not been
verified — including the iOS steps that need a Mac.
