# Wispmere — Project Memory

> **Read this first.** This is the single source of truth for anyone joining the project:
> what we are building, why the decisions were made, what is done, what is deliberately
> not done yet, and what to pick up next. Update it in the same commit as the work it
> describes.

| | |
|---|---|
| **Working title** | Wispmere *(temporary — see [Open decisions](#open-decisions))* |
| **Repo path** | `projects/cozy-mobile-exploration-game/` inside `joehohoho/Alfred` |
| **Pushed?** | **No — GitHub writes are blocked (403).** See [Open decisions](#9-open-decisions--need-the-owner). |
| **Branch** | `claude/game-build-memory-1t9ac6` |
| **Status** | **First playable complete.** Full arc playable and verified end to end. See [Milestones](#milestones). |
| **Last updated** | 2026-09-04 |

---

## 1. What we are building

An original, casual, all-ages **top-down / cozy-isometric 3D mobile exploration game**
for **iPhone in landscape**.

The feel: peaceful, magical, gently funny, quietly adventurous. It must work in
five-minute sessions *and* offer a satisfying hour-long arc.

**Hard constraints, from the build brief:**

- Fully offline. Local save only.
- No networking, accounts, cloud saves, ads, analytics, monetisation, battle pass,
  loot boxes, paid power, or backend of any kind.
- Everything original — names, lore, creatures, environments, art, UI, audio.
  Nothing imitates or reuses identifiable content from an existing game.
- Combat is optional and light, and is **never punishing**.
- Safe places never spawn hostiles.
- All-ages: no gore, no realistic violence, no harsh death screens.

**Scope ceiling for v1** (do not exceed without the owner's approval):
one homestead · one meadow · one grove · one glade · three resource families ·
one merchant · one companion · one basic enemy · one guardian · one weapon upgrade ·
two landmark restorations · one guided arc · one open-ended post-finale state.

---

## 2. The world, in one page

*(Use these names consistently. They are the shared vocabulary.)*

| Thing | Name | Notes |
|---|---|---|
| The world | **Wispmere** | |
| The dormant state | **the Hush** | The old network of landmarks fell asleep. Story stays this light. |
| Starter region | **Sunmere Meadow** | Warm greens and golds. Where the player wakes. |
| Second region | **Thornhollow Grove** | Denser, cooler greens. Opens after landmark 1. |
| Final region | **Moonmere Glade** | Violet/blue moonlit palette, still water. Opens after the guardian. |
| Landmarks | **Dawnspires** | `meadow-dawnspire`, `moonmere-dawnspire` |
| Player spawn | **the Waking Stone** | Return point until the player rests at home |
| Player home | **the Hearthnest** | Built by the player; becomes the return point on first rest |
| Merchant | **Ossa**, at the **Hollow Stump** | A crafter. No shop economy — one upgrade, that is all. |
| Companion | **Pim**, a **wisplet** | Non-combat. Guides to resources. Nothing more. |
| Basic enemy | **Thistlebur** | Round, grumpy, soft. Drops a Glimmercore. |
| Guardian | **Bramblehorn** | Larger, in the grove. One-time. |
| Starter weapon | **Willow Chime** | A willow switch with bells |
| Upgraded weapon | **Bright Chime** | The single upgrade |
| Materials | **Sunpetal** · **Boughwood** · **Riverstone** | The three renewable families |
| Rare material | **Glimmercore** | Creature drop only, never a gather node |
| Gate 1 | **the Bramble Gate** | meadow → grove, opens on landmark 1 |
| Gate 2 | **the Mistveil** | grove → glade, opens on guardian defeat |

**Map shape** — reads south-west to north-east:
`Sunmere Meadow → (Bramble Gate) → Thornhollow Grove → (Mistveil) → Moonmere Glade`.
World bounds are `x ∈ [-46, 78]`, `z ∈ [-76, 40]`. Y is height; gameplay is on XZ.

---

## 3. The guided arc

Eleven steps, in `src/core/journey.ts` as `JOURNEY_ORDER`. The Journey card always shows
**exactly one** of these, derived fresh from the save — never stored, so it can never
disagree with saved state.

1. `gather-starter` — Gather what the meadow offers *(2 of each family)*
2. `find-core` — Settle a thistlebur *(for a Glimmercore)*
3. `visit-merchant` — Visit Ossa *(1 core, 3 boughwood, 2 riverstone)*
4. `build-shelter` — Raise your Hearthnest *(4 boughwood, 3 riverstone, 2 sunpetal)*
5. `rest-at-shelter` — Rest *(sets the return point)*
6. `befriend-companion` — Say hello to the wisplet
7. `restore-meadow-dawnspire` — *(3 petal, 3 timber, 3 stone, 1 core — fixed by the brief)*
8. `find-grove-guardian` — Settle Bramblehorn
9. `explore-moonmere` — Cross the Mistveil
10. `restore-moonmere-dawnspire` — *(2 petal, 2 timber, 2 stone, 1 core — fixed by the brief)*
11. `explore-freely` — Open-ended. **The game never ends.**

> **Design note that cost us a bug:** steps 1–3 are nested inside `!weaponUpgraded`.
> Without that nesting, a player who later spends their pouch to zero gets told to
> "gather what the meadow offers" again, long after that stopped being the point.
> There is a regression test for this (`journey.test.ts` → "does not regress").

---

## 4. Stack and why

Full reasoning and rejected alternatives: **`docs/ARCHITECTURE-DECISION.md`**. Summary:

**TypeScript 5.9 · Three.js 0.185 · Vite 8 · Capacitor 8 (iOS) · Vitest 5 · Playwright ·
Web Audio · 100% procedural geometry · `localStorage` behind a port.**

The deciding factor over Godot/Unity: this stack can be **built, run, driven and
screenshotted headlessly**, so every claim in this document is verifiable by a machine
rather than asserted. No paid deps, no cloud, no backend, real App Store path via Xcode.

---

## 5. Architecture — the one rule that matters

```
src/core/   pure TypeScript. Deterministic game rules.
            NEVER imports three.js, never touches window/document,
            never calls Date.now() or Math.random().
            Callers pass in `nowMs` and dice rolls.
            >>> Enforced by tests/unit/core-purity.test.ts <<<

src/game/   Three.js presentation. Consumes core through explicit interfaces.
src/ui/     DOM-based HUD (crisp text, real safe-area support, accessible).
tests/      unit (node) · integration (jsdom) · e2e (Playwright)
```

If a rule can be expressed without a scene, it belongs in `core/`. That is what makes the
progression arc testable in milliseconds and what would let the renderer be replaced
without losing the game design.

### Core module map

| File | Owns |
|---|---|
| `core/rng.ts` | Seeded mulberry32. All world variation flows through it. |
| `core/vector.ts` | Vec2/Vec3, `normalizeMoveInput` (deadzone + rescale + clamp) |
| `core/types.ts` | Resource and region definitions, display names, tints |
| `core/inventory.ts` | Pouch, `canAfford`, `missingFor`, `spend` |
| `core/recipes.ts` | **Every cost in the game, in one place.** Weapon stats. |
| `core/resources.ts` | Node defs, renewal timing, `gather`, companion guidance target |
| `core/progression.ts` | `GameState`, flags, and every pure `state → state` transition |
| `core/journey.ts` | The one-step recommendation |
| `core/combat.ts` | Swings, arcs, dodge i-frames, creature brain |
| `core/settings.ts` | Accessibility options + coercion of anything from storage |
| `core/save.ts` | Serialize/deserialize/repair, `SaveAdapter` port, `SaveStore` |
| `core/world/layout.ts` | The authored map: paths, clusters, props, gates, safe zones |

---

## 6. Milestones

| # | Milestone | State |
|---|---|---|
| M0 | Scaffold, ADR, memory file | ✅ Done |
| M1 | Deterministic core rules + unit tests | ✅ Done — 144 tests green, `tsc` clean |
| M2 | World layout + procedural low-poly art | ✅ Done — full art set, tuned against screenshots |
| M3 | Renderer, camera, input, player controller | ✅ Done — renders, moves, collides; HUD controls pending in M5 |
| M4 | Gathering, combat, companion, merchant, shelter, landmarks | ✅ Done |
| M5 | UI/HUD, Journey card, accessibility, audio | ✅ Done |
| M6 | Integration + Playwright verification | ✅ Done — 178 unit/integration + 3 browser route tests |
| M7 | Capacitor iOS shell, docs | ✅ Config + `docs/IOS.md`; the Xcode half needs a Mac |

---

## 7. Decisions already made (do not re-litigate without a reason)

1. **Wall-clock renewal.** Nodes renew against real time, so they come back while the app
   is closed. A clock moved *backwards* is clamped, costing at most one renewal period —
   it can never soft-lock a node.
2. **Renewal windows:** sunpetal 90s · boughwood 150s · riverstone 210s. Tuned so a
   five-minute session always has something to pick.
3. **Weapon upgrade costs 3 boughwood, not 2.** Two was fully covered by the starter
   stock, which made the "visit the merchant" step permanently pre-affordable and its
   `missing` display unreachable. Three creates one genuine extra gathering beat.
4. **Save repairs itself.** A hand-edited or truncated save is coerced back onto the arc
   (`readFlags` in `save.ts`) rather than trusted or rejected. Loading at 0 health is
   impossible by construction.
5. **A save from a newer build is discarded, not half-read.** Safer direction to fail.
6. **Creek is carved before paths are flattened**, so a path crossing water reads as a
   level ford instead of dipping into the channel. Order matters in `groundHeight`.
7. **Nodes and blocking scenery are pushed off the walking lanes** at generation time
   (`pushOffPath`), and a test asserts the invariant. A gather point in the road reads as
   an obstacle, not an invitation.
8. **Creature posts are asserted to be outside every safe zone by a test**, so a future
   edit that drags a spawn onto the Hearthnest fails the build instead of shipping.
9. **Colour is authored as sRGB hex and converted exactly once.** `THREE.Color.setHex`
   already converts into the linear working space when `ColorManagement` is enabled;
   calling `convertSRGBToLinear()` on top applied the transfer function twice and darkened
   every colour in the game. If the world ever looks muddy again, check this first.
10. **The camera is orthographic, so fog must be tuned against the boom length**, not against
   world distances. Everything on screen sits at roughly the same camera distance, so
   `fogNear` set below the boom fogs the entire scene at once.
11. **The key light sits on the camera's side of the world.** Lighting from the far side
   left every camera-facing surface — including the player's front — in shade.
12. **Water is double-sided.** The creek is a hand-built triangle strip; its winding follows
   the polyline, so parts of it face down and get back-face culled. That made the creek
   invisible for several iterations.
13. **The creek channel is levelled, not just lowered**, and the ribbon clears the highest
   point of its own cross-section. Path flattening runs after the carve and lifts one bank.
14. **The ground mesh extends 26 units past the play bounds.** The camera can see ~18 units
   past the player at maximum zoom, and without a skirt the world visibly ended mid-frame.
15. **Journey steps are implication-closed.** The merchant, the shelter, the rest and Pim are
   all genuinely skippable — nothing in the game requires them — so a naive first-unmet-flag
   chain got permanently stuck on "Visit Ossa". Later milestones now mark earlier ones done,
   and the finale short-circuits the whole arc to `explore-freely`.
16. **The interact button ranks structures above gathering.** Nearest-wins let a sunpetal bush
   growing beside the Hearthnest clearing steal the "Build" prompt. Gathering is the one
   repeatable interaction, so it always ranks last. Nodes are also kept 5.5 units clear of
   every named place, which is wider than the largest interaction radius.
17. **Attacking has aim assist.** Pressing attack turns the player toward the nearest target,
   but only while they are *not* pushing the stick, so it can never fight the player's
   steering. Without it, a one-thumb attack swung at whatever direction you stopped facing.
18. **Region entry is one function.** `teleport` used to set `currentRegion` itself, so the
   next frame saw no transition and silently skipped the banner, the "seen" flag and the save.
19. **Headless Chromium only advances `requestAnimationFrame` when frames are requested.**
   A `waitForTimeout` between Playwright calls lets wall-clock time pass while the game loop
   stays frozen. The e2e helpers pump frames from inside the page instead.
20. **`devices['iPhone … landscape']` defaults to WebKit.** Launching the Chromium binary
   under WebKit's protocol fails with an unhelpful "browser has been closed"; the config pins
   `browserName: 'chromium'` explicitly.
21. **The Moonmere has a carved basin, and nothing is allowed in it.** The finale Dawnspire
   originally stood in the middle of the lake with the water drawn through it, and a
   riverstone cluster scattered into open water. Node placement now rejects the pool, and
   tests assert that no named place or gathering node is submerged.
22. **The wisp is clamped into a rectangle that excludes the HUD**, not merely inset by a
   fraction of the viewport — the top-right corner is exactly where the Journey card lives.

---

## 8. Not yet built — the live backlog

### Required by the brief — all delivered
- [x] Procedural low-poly art for every prop kind, characters and creatures (M2)
- [x] Three.js renderer, orthographic isometric camera, pinch zoom, lighting (M3)
- [x] Input hub: touch, keyboard, mouse, gamepad, pinch (M3/M5)
- [x] Player controller, sliding collision, gate blocking, aim assist (M3/M4)
- [x] Gathering + hold-to-repeat + depleted-node visual + countdown (M4)
- [x] Creatures, guardian encounter, dodge i-frames, defeat → return home (M4)
- [x] Merchant, shelter construction, resting, befriending, both restorations (M4)
- [x] Journey card UI + off-screen wisp that vanishes when the target is visible (M5)
- [x] Accessibility settings panel wired to the saved settings model (M5)
- [x] Visible reset action, behind a two-tap confirmation (M5)
- [x] Original Web Audio sound design, SOUND on by default, headless-safe (M5)
- [x] Ambient particles, foliage/water motion, restoration VFX (M5)
- [x] Integration tests: bootstrap, restart, reset, unlock, guidance, gathering (M6)
- [x] Browser route test from clean reset through the finale and beyond (M6)
- [x] Capacitor config, landscape/safe-area instructions, offline by construction (M7)

### Known gaps we cannot close in this environment
- [ ] **Xcode build / iOS Simulator / physical iPhone testing.** No macOS here. Will be
      documented precisely in `docs/VALIDATION.md` rather than claimed.
- [ ] **On-device performance profiling.** Same reason. A `PerfProbe` and quality tiers
      are planned so the numbers can be gathered on first real device run.
- [ ] **App Store signing.** Requires an Apple Developer account we do not have.

### Ideas parked (explicitly out of scope until asked for)
Fishing · weather · seasons · mounts · boats · multiplayer · large NPC systems ·
extensive dialogue · Android · monetisation · quest trees · minimap · procedural world
generation · crafting trees · economy. **The brief forbids adding these without a request.**

---

## 8b. What a device pass will probably want

Nothing here is a defect; these are the knobs most likely to need a turn once someone runs
the game on real hardware, and where to turn them.

| Knob | Where | Why it may need changing |
|---|---|---|
| Quality tier thresholds | `src/game/renderer.ts` → `QUALITY_PROFILES`, `PerfProbe` | Tuned against a 55 fps target that has never seen a GPU |
| Ambient particle budget | same | Fill rate is the usual first thing to cost a phone frames |
| Terrain resolution | `src/game/art/terrain.ts` → `RESOLUTION` | ~28k triangles in one draw call; cheap to halve if needed |
| Camera zoom range | `src/game/camera.ts` → `ZOOM` | Character size on a real 6.1" screen is a feel judgement |
| Button sizes | `src/ui/hud.css` → `--btn`, `--stick` | Currently ≥44pt; real thumbs may still want more |

## 9. Open decisions — need the owner

| # | Question | Why it matters | Default if no answer |
|---|---|---|---|
| 1 | **Final game title.** "Wispmere" is a working title. | Appears in the app name, bundle id, README. | Ship as Wispmere. |
| 2 | **GitHub access is blocked entirely — this needs action.** Every write path returns 403: `create_repository`, `create_branch`, and `git push` (which reports "Claude doesn't have GitHub access to joehohoho/Alfred for your organization"). Reads work. | **The three commits exist only in the session container.** Nothing is on GitHub. | Grant access, then push. See below. |
| 3 | **Licence.** None chosen; the brief said only add one if the owner selects it. | | No licence file. |
| 4 | **Repo visibility if extracted.** Brief says private by default, ask before public. | | Private. |

### Recovering the work if the container is gone

The branch was exported as a git bundle and a source tarball. To restore:

```bash
# From the bundle (keeps all three commits and their messages)
git clone wispmere-branch.bundle wispmere       # standalone
# ...or into an existing Alfred clone:
git fetch ../wispmere-branch.bundle claude/game-build-memory-1t9ac6:claude/game-build-memory-1t9ac6

# Or just the files
tar xzf wispmere-source.tar.gz
```

To unblock pushing: install the Claude GitHub App for the account at
<https://github.com/apps/claude/installations/select_target>, or reconnect GitHub from
claude.ai Settings → Connectors. Then `git push -u origin claude/game-build-memory-1t9ac6`.

To split the game into its own repository, preserving history:

```bash
git subtree split --prefix=projects/cozy-mobile-exploration-game -b wispmere-only
# then push wispmere-only to a new private repo as its main branch
```

---

## 10. Working agreements

- **Milestone discipline.** Small focused commits. At the end of each milestone: run the
  tests, update section 6 and section 8 of this file, and write a short report of what
  changed / what was verified / what remains unvalidated.
- **Never claim unverified validation.** If it was not run, say so, in
  `docs/VALIDATION.md` and in the report.
- **Costs live in `core/recipes.ts`.** Do not scatter magic numbers.
- **Names live in `core/types.ts` and this file.** Keep them consistent.
- **Anything added to `src/core/` must have a unit test**, and must not break
  `core-purity.test.ts`.
- **Secrets, builds, caches, saves, and signing material stay out of git.** See `.gitignore`.

## 11. How to run it

```bash
cd projects/cozy-mobile-exploration-game
npm install
npm run dev        # http://localhost:5173
npm test           # unit + integration
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production bundle
npm run shots      # render the world tour to screenshots/ (headless Chromium)
```

### Reviewing art changes

`npm run shots` boots the built game in a landscape iPhone viewport and captures every
landmark. Look at the set, not one frame — most of the art bugs found so far (the buried
creek, the black Dawnspire, the merchant standing in the water) were only obvious when
comparing locations side by side.
