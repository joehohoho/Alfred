# ACTIVE-TASK.md - Current Work In Progress

**Status:** idle
**Last Updated:** 2026-03-01 09:00 AST
**Card ID:** (none)
**Approach:** (none — set when in_progress)

## State
System maintenance complete. Rate limit infrastructure hardened with progressive backoff circuit breaker. Session cleanup catches all bloat vectors. Discord thread mode enabled.

## Recent Context (Mar 1)
- Rate limit death spiral resolved — root cause was 1MB+ Discord channel sessions
- Session cleanup hardened: 200KB file cap, 48h channel TTL, 40 session cap
- Gateway watchdog with progressive backoff: 10 → 20 → 40 → 60 min cooldowns
- Discord `replyToMode: "first"` enabled for thread isolation
- 9 broken Discord webhook deliveries removed from crons
- Pre-work kanban comment protocol added to AGENTS.md

## CoinUsUp Pending (Joe approval needed before push)
- `b6f8b08` — remove @capacitor/assets devDep
- `b1f78c5` — add GitHub Actions CI workflow

### Pending Questions
<!-- PENDING-Q-START -->
- **Blocker on card** (_kanban-blocked_, Feb 27 20:02)
  ID: `notif_1772222573811_15aaf634` — Dependency updates applied (lockfile updated via npm update --legacy-peer-deps) and build passes, but lint fails with 206 pre-existing errors across a...

- **Blocker on card** (_kanban-blocked_, Feb 27 20:03)
  ID: `notif_1772222596530_195c0f1e` — Pilot is blocked on launch inputs/approval for external actions. Need: (1) choose 1-2 channels (affiliates, partners, content), (2) weekly test budget...

- **Blocker on card** (_kanban-blocked_, Feb 28 03:01)
  ID: `notif_1772247698673_344350bf` — Cannot start without Joe approving: (1) which app to focus on, (2) which channels to test, (3) budget ceiling. Joe indicated in chat he is not familia...

- **Workspace Check** (_info_, Mar 01 01:01)
  ID: `notif_1772326875610_8fc21a32` — Git status check: 5 uncommitted files found and committed (hal-tracking, failsafe-state, idle-state). Workspace clean.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 04:04)
  ID: `notif_1772337841156_2f87a033` — Gateway stopped for 5m — 3 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 05:04)
  ID: `notif_1772341443721_310e2648` — Gateway stopped for 5m — 4 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 06:04)
  ID: `notif_1772345046125_1b87b181` — Gateway stopped for 5m — 4 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 07:04)
  ID: `notif_1772348648606_3d1cb288` — Gateway stopped for 5m — 5 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Discord Webhooks Returning 403 — Need Regeneration** (_question_, Mar 01 07:41)
  ID: `notif_1772350918952_561ef7a7` — Both DISCORD_WEBHOOK_ALFRED_HAL and DISCORD_WEBHOOK_HAL_COMPLETIONS are returning HTTP 403 Forbidden as of March 1, 2026 3:40 AM. Alfred-HAL discussio...

- **Rate Limit Circuit Breaker** (_system_, Mar 01 08:04)
  ID: `notif_1772352251146_3245ec05` — Gateway stopped for 5m — 9 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 08:44)
  ID: `notif_1772354652746_a99b2278` — Gateway stopped for 5m — 5 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Session Auto-Reset** (_system_, Mar 01 09:09)
  ID: `notif_1772356144478_2603ca2e` — Main session was at 85%+ context. Auto-reset and gateway restarted.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 09:44)
  ID: `notif_1772358255470_2cb2b903` — Gateway stopped for 5m — 3 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 10:44)
  ID: `notif_1772361857922_11a2f9d0` — Gateway stopped for 5m — 4 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 11:04)
  ID: `notif_1772363058775_aec096d5` — Gateway stopped for 5m — 3 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.

- **Rate Limit Circuit Breaker** (_system_, Mar 01 12:04)
  ID: `notif_1772366661386_8dfa5aa1` — Gateway stopped for 5m — 5 rate limit errors detected. Sessions cleaned. Auto-restart in 5 minutes.
<!-- PENDING-Q-END -->
