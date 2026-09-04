# Validation record

What has actually been run, and what has not. Nothing in this file is aspirational — if
it is listed as verified, the command was executed and passed. Update it every milestone.

Environment: Linux container, Node 22.22.2, npm 10.9.7, headless Chromium 1194.
**There is no macOS and no Xcode in this environment.**

## Verified

| Date | What | How | Result |
|---|---|---|---|
| 2026-09-04 | Core rule unit tests | `npx vitest run` | 144 passed / 144 |
| 2026-09-04 | Type safety | `npx tsc --noEmit` | clean |
| 2026-09-04 | Production build | `npm run build` | clean; 555 kB three chunk (140 kB gzipped), 65 kB game |
| 2026-09-04 | Renders in a landscape iPhone viewport | `npm run shots` at 852x393 @2x | all ten landmarks render; no console errors |

## Not verified — and why

| Item | Blocker | What it needs |
|---|---|---|
| Xcode build of the iOS app | No macOS in this environment | A Mac with Xcode 15+, `npm run ios:sync && npm run ios:open` |
| iPhone Simulator, landscape touch layout | Same | Run the synced project on an iPhone simulator in landscape |
| Physical iPhone play test | Same, plus a provisioning profile | A device and a free/paid Apple Developer account |
| App Store signing and submission | No Apple Developer account | Certificates, an App ID, and a provisioning profile |
| On-device frame timing / thermals | No device | Instruments, or the in-game `PerfProbe` readout on a real phone |
| Battery drain over a long session | No device | A real device session |

These are honest gaps, not oversights. The touch layout is built against real
`env(safe-area-inset-*)` values and is exercised in a landscape iPhone-sized viewport in
headless Chromium, which catches layout and reachability problems but **cannot** stand in
for a real device's touch accuracy, notch geometry, GPU behaviour, or thermal throttling.
