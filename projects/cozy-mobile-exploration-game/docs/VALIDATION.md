# Validation record

What has actually been run, and what has not. Nothing here is aspirational: if a row says
verified, that command was executed and passed. Update it every milestone.

**Environment:** Linux container, Node 22.22.2, npm 10.9.7, headless Chromium 1194 with
ANGLE/SwiftShader (software WebGL2). **There is no macOS, no Xcode, no iOS Simulator and
no physical device here.**

## Verified

| Date | What | How | Result |
|---|---|---|---|
| 2026-09-04 | Deterministic core rules | `npm test` | 180 passed / 180 |
| 2026-09-04 | Type safety | `npm run typecheck` | clean |
| 2026-09-04 | Production build | `npm run build` | clean — 555 kB three chunk (140 kB gzipped), ~120 kB game, 13 kB CSS |
| 2026-09-04 | Scene and HUD composition | integration tests booting the real `boot()` with WebGL skipped | passed |
| 2026-09-04 | Persistence through restart | boot → mutate → save → dispose → boot from the same adapter | passed |
| 2026-09-04 | Reset clears all local progress | integration + the pause panel's own button | passed |
| 2026-09-04 | Landmark restoration and gate unlocks | integration + browser | passed |
| 2026-09-04 | Guardian unlock and removal | integration + browser | passed |
| 2026-09-04 | Companion guidance, including the renewal fallback | integration | passed |
| 2026-09-04 | Renewal timing across a simulated restart | unit + integration with an injected clock | passed |
| 2026-09-04 | **The whole route, clean reset → finale → still playable** | `npm run test:e2e`, iPhone 15 Pro landscape viewport, real WebGL2 | passed (1.6 min) |
| 2026-09-04 | Defeat costs nothing but the walk home | browser | passed |
| 2026-09-04 | Safe places hold no hostiles and deal no damage | browser + a world-layout unit test | passed |
| 2026-09-04 | Audio is inert in headless contexts | integration asserts `audio.available === false` | passed |
| 2026-09-04 | No console errors across the full route | browser, collected throughout | passed |

## Verified with a caveat

| What | Caveat |
|---|---|
| Touch layout, safe areas, handedness, hit-target sizes | Measured in a **734x343 landscape iPhone viewport with simulated safe-area insets**, in Chromium. This catches layout, reachability and overlap regressions. It is not a real device: it cannot tell you how the Dynamic Island actually crops, or how a thumb really feels. |
| Rendering | Software rasteriser. Verifies *what is drawn and where*, never performance. A frame costs ~100 ms here and would cost ~2 ms on a phone. |
| Browser engine | Chromium, because WebKit is not installed in this container and cannot be downloaded here. **iOS ships WebKit.** Safari-specific rendering and WKWebView behaviour are unverified. |

## Not verified — and exactly why

| Item | Blocker | What it needs |
|---|---|---|
| Xcode build of the iOS app | No macOS | A Mac with Xcode 15+, then `npm run ios:sync && npm run ios:open` |
| iOS Simulator, landscape | Same | Run the synced project on an iPhone simulator |
| Physical iPhone play test | Same, plus provisioning | A device and an Apple ID |
| App Store signing / submission | No Apple Developer account | Certificates, an App ID, a provisioning profile |
| Frame rate, thermals, battery on device | No device | Instruments, or the in-game `PerfProbe` readout on a real phone |
| Real audio output, silent-switch behaviour | No audio device; Web Audio is stubbed out headlessly | A device or a desktop browser with speakers |
| WKWebView `localStorage` persistence across app updates | No iOS | Install, play, update the build, confirm the save survives |

`docs/IOS.md` carries the device checklist to work through once a Mac is available.

## Known limitations, stated plainly

- The quality tiers and `PerfProbe` are **designed** against a 55 fps target but have never
  observed a real GPU. The first device run may well want different numbers.
- The e2e route test grants materials in a few places instead of walking to fifteen separate
  gathering nodes. Every *rule* — each restoration, the upgrade, both unlocks, the guardian
  fight — goes through the same code path a player's thumb does, and gathering itself is
  exercised for real at both ends of the arc.
