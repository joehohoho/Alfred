# ACTIVE-TASK.md - Current Work In Progress

**Status:** idle
**Last Updated:** 2026-03-02 10:00 AST (checkpoint)
**Card ID:** (none)
**Approach:** (none — set when in_progress)

## State
Kanban cards in progress: 1 (Moltbook cron guardrail, assigned to HAL). Pending questions synced: 4. Context at 16%. No blocking issues.

## Recent Context (Mar 2, Morning)
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
- **Discord Webhooks Returning 403 — Need Regeneration** (_question_, Mar 01 07:41)
  ID: `notif_1772350918952_561ef7a7` — Both DISCORD_WEBHOOK_ALFRED_HAL and DISCORD_WEBHOOK_HAL_COMPLETIONS are returning HTTP 403 Forbidden as of March 1, 2026 3:40 AM. Alfred-HAL discussio...

- **Blocker on card** (_kanban-blocked_, Mar 01 21:01)
  ID: `notif_1772398863539_578d6f66` — Stale for 6h — re-dispatch attempted but no progress made. Needs human review or re-scoping.

- **⚠️ Stale card escalated: "Channel expansion pilot (affiliates/partners/content)"** (_question_, Mar 01 21:01)
  ID: `notif_1772398863541_2f663b83` — Card "Channel expansion pilot (affiliates/partners/content)" (task_1772199318344_19e8fa66) has been in_progress for 6h with no updates. A re-dispatch ...

- **What's the #1 thing slowing down Signal App right now?** (_question_, Mar 02 14:00)
  ID: `notif_1772460000220_a86559b3` — Not looking for a full status update — just one honest sentence: what's the current bottleneck on Signal App? Is it data quality, time, a specific tec...
<!-- PENDING-Q-END -->
