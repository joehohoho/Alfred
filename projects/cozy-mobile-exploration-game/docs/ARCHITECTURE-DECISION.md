# ADR-001 — Engine, framework, language and tooling

**Status:** Accepted · **Date:** 2026-09-04 · **Supersedes:** none

## Decision

| Layer | Choice |
|---|---|
| Language | **TypeScript 5.9** (strict) |
| 3D renderer | **Three.js 0.185** (WebGL2) |
| Build / dev server | **Vite 8** |
| iPhone delivery | **Capacitor 8** (WKWebView native shell, Xcode project) |
| Unit / integration tests | **Vitest 5** (node + jsdom environments) |
| Play-mode-equivalent tests | **Playwright** against a real headless Chromium |
| Audio | **Web Audio API**, 100% procedurally synthesised at runtime |
| Art | **100% procedural geometry** authored in code (no imported meshes/textures) |
| Persistence | `localStorage` behind a swappable `SaveAdapter` port |

Explicitly **not** chosen: Unity, Unreal, Godot, React Native, Flutter, Babylon.js, PlayCanvas, Cocos.

## Why this is the strongest fit

### Visual target (cozy-isometric 3D)
The brief asks for soft lighting, gentle glow, foliage/water motion, ambient particles and
low-poly readability — not photoreal rendering. That is squarely inside Three.js's comfort
zone at a fraction of the runtime weight of a general-purpose engine. An orthographic camera
plus a small custom shader/material set gives exact control over the isometric look, and the
whole scene is authored as *data + code*, which means the art is reviewable in a diff.

Because every mesh is generated procedurally from parameters (`makeBroadleafTree`,
`makeFlowerPatch`, …) with a seeded RNG, we get natural variation with zero asset pipeline,
zero licensing risk, and a guarantee that nothing is copied from an existing game — a hard
requirement of the brief.

### iPhone delivery
Capacitor wraps the built bundle in a native Xcode project. It gives us: real App Store
delivery, `viewport-fit=cover` + `env(safe-area-inset-*)` for notch/Dynamic Island handling,
landscape lock via `Info.plist`, and a genuinely offline app (the bundle is on-device; there
is no server). Adding Android later is `npx cap add android` against the *same* codebase,
which satisfies "architecture that can later support other mobile platforms".

WKWebView on modern iPhones has WebGL2 with hardware acceleration. For a low-poly scene with
a few hundred draw calls and no post-processing stack this holds 60 fps comfortably; the
project ships a device profiler (`PerfProbe`) and a quality tier system to prove it.

### Iteration speed
Vite HMR is sub-second. Compare to a full engine reimport/recompile cycle. Crucially for
*this* project: the game runs in a headless browser, so an agent or CI can boot the real
game, drive it, assert on state, and take screenshots — none of which is practical for a
Unity/Godot editor build inside a Linux container.

### Testing
The brief demands automated tests for deterministic rules. Those rules live in `src/core/`,
which is **pure TypeScript with a hard "no `three` import" rule enforced by a test**
(`tests/unit/core-purity.test.ts`). They run in Node in milliseconds with no engine, no
scene, no GPU. Presentation code in `src/game/` consumes core via explicit interfaces.

### Long-term maintainability
- Core rules are engine-agnostic. If the renderer is ever swapped, the game *design* survives.
- No paid dependencies, no cloud services, no accounts, no backend — matching the brief.
- Total dependency surface at runtime is one package (`three`).

## Honest trade-offs

1. **Not a native renderer.** A WKWebView costs some memory and battery vs. a Metal engine.
   Mitigation: tiny scene budget, instanced foliage, quality tiers, no post-processing chain.
2. **No visual scene editor.** World layout is authored as typed data
   (`src/core/world/layout.ts`). This is a real cost for a large open world; for the bounded
   scope in the brief (one meadow, one grove, one glade) it is a net win — the layout is
   diffable, testable, and deterministic.
3. **Audio is synthesised, not recorded.** Guarantees originality and a tiny bundle, but it
   caps the timbral richness of a hand-crafted sample library. Sample loading is supported by
   the same `AudioBus` if that ever changes.
4. **iOS build requires macOS + Xcode.** Not available in this Linux container — see
   `docs/VALIDATION.md` for exactly what is and is not verified.

## Rejected alternatives

- **Unity** — brief explicitly says not to assume it. Also: heaviest iteration loop, license
  ambiguity risk, and it cannot be built or verified in this environment at all.
- **Godot 4** — genuinely good and free, exports to iOS. Rejected because its editor/export
  templates cannot be installed or visually verified here, so we would ship unverified work;
  and its headless test story is weaker than Vitest + Playwright.
- **React Native / Flutter** — UI-first frameworks; 3D is a bolted-on afterthought.
- **Babylon.js** — very capable, but a larger runtime for features (physics, XR, node
  materials) this game does not use.
- **PlayCanvas** — strong mobile WebGL engine, but its authoring story is cloud-hosted, which
  collides with the offline/no-backend requirement.

## Consequences

- `src/core/` must never import `three` or touch `window`. Enforced by test.
- All randomness in world generation goes through the seeded RNG so a given seed always
  produces an identical world — required for screenshot-stable tests.
- Audio must be a no-op when no `AudioContext` exists, so headless tests never fail on sound.
