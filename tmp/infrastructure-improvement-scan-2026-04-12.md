## Alfred infrastructure improvement scan — 2026-04-12 08:31 ADT

### Scope reviewed
- Cron/job orchestration and idle loop behavior
- Memory architecture and continuity files
- Notification routing and duplicate-question handling
- HAL dispatch pipeline and ACK/timeout patterns
- Command Center / open-loops integration

### Evidence highlights
1. `dispatch.jsonl` shows HAL proactive tasks being dispatched on a tight 15-minute loop for many hours with repeated task rotation.
2. `.hal-alfred-tracking/pending-acks.json` shows a long series of proactive HAL tasks stuck in `timed_out` state.
3. `OPEN-LOOPS.md` is stale (`Last updated: 2026-04-09`) and contains null/empty active card rows, so the supposed single source of truth is degraded.
4. `ACTIVE-TASK.md` pending questions section still contains duplicate/untitled/noisy reminders.
5. `notification-discipline-report.json` confirms routing logic exists, but duplicate decision reminders are still surfacing in task state.
6. `sentinel-state.json` is healthy overall, but session cleanup already needed auto-fixes twice recently, suggesting preventable noise still reaches ops.

### Top 3 improvement ideas not already seen in kanban-ideas.md

#### 1) HAL proactive circuit breaker + timeout-aware backoff
**Problem:** HAL is being fed proactive work every ~15 minutes even when prior proactive jobs are consistently timing out. That creates duplicate effort, stale queues, misleading activity, and unnecessary coordination overhead.
**Evidence:** Dozens of sequential proactive dispatches in `dispatch.jsonl`; matching timeout-heavy entries in `pending-acks.json`.
**Improvement:** Add a dispatcher guard that pauses new proactive HAL dispatches after N consecutive proactive timeouts (for example 3), applies exponential backoff, and routes the next proactive slot to Alfred or marks HAL as cooling down. Auto-clear only after one successful ACK.
**Impact:** Reduces wasted cycles, makes HAL health signal honest, lowers orchestration churn, and should reduce token/compute waste from repeated doomed dispatches.

#### 2) Open Loops self-healing refresh with schema validation
**Problem:** `OPEN-LOOPS.md` is intended as the single source of truth but is stale and contains `null` rows. That weakens morning standups, increases context confusion, and invites repeated questions because the dashboard layer cannot be trusted.
**Evidence:** File last updated Apr 9 while today is Apr 12; active-card table contains multiple `null | null` rows.
**Improvement:** Add a pre-publish validation step to `refresh-open-loops.sh` that rejects null card rows, falls back to last-known-good content, logs an audit event, and triggers a repair pass against the underlying kanban API. Optionally expose a freshness timestamp badge in Command Center and sentinel-check staleness >24h.
**Impact:** Restores the value of Open Loops as a reliable briefing surface, reduces wasted investigation, and prevents stale/garbled work state from propagating into notifications and proactive scans.

#### 3) Notification hygiene compactor for pending questions
**Problem:** The system still accumulates duplicate, untitled, and superseded pending questions in `ACTIVE-TASK.md` and notifications state, even though discipline rules and cooldown concepts already exist. This adds cognitive noise and makes true blockers easier to miss.
**Evidence:** `ACTIVE-TASK.md` includes multiple untitled entries and repeated Stripe/Bill Review reminders; `notification-discipline-report.json` already classifies some items for digest/send-now, but cleanup is not closing the loop.
**Improvement:** Build a nightly compactor that clusters notifications by topic fingerprint, suppresses stale duplicates, auto-labels malformed items, and writes one canonical pending-question summary back into `ACTIVE-TASK.md`. Add a “superseded by” link rather than preserving every near-duplicate in hot state.
**Impact:** Cleaner blocker visibility, fewer repeat asks, better trust in pending-question lists, and lower token cost because future sessions scan less noise.

### Recommendation order
1. HAL proactive circuit breaker
2. Open Loops self-healing refresh
3. Notification hygiene compactor
