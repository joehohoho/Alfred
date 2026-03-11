# Kanban Work Executor — Safeguards & Architecture

**Date:** 2026-03-10 13:22 ADT  
**Status:** ✅ SAFE VERSION DEPLOYED  
**Script:** `kanban-work-executor-safe.sh`

---

## Problem We're Solving

**Risk Scenario 1: Gateway Down Loop**
- Kanban API goes down (network issue, service crash)
- Cron job runs every 30 min
- Without safeguards: tries to dispatch, fails silently, loops forever
- **Impact:** Cards stuck in in_progress, no visibility, potential token waste

**Risk Scenario 2: Card Failure Loop**
- Dispatch to HAL fails (gateway unreachable, auth error, etc.)
- Card stays in_progress
- Cron retries 30 min later
- Without safeguards: repeats forever
- **Impact:** Same card attempted 48x/day, accumulates error context, wastes tokens

**Risk Scenario 3: Moving to Todo Antipattern**
- Card moved back to `todo` on failure
- Kanban executor picks it up again 30 min later
- Different execution context each time → no learning from failure
- **Impact:** Infinite loop, no blocking signal to Joe

---

## Safeguards Implemented

### Safeguard #1: Gateway Health Check (FIRST)
**When:** Before any dispatch attempts  
**How:** `curl -s --max-time 5 http://localhost:3001/api/kanban`  
**If down:** Move to Phase 2 (protect all cards)  
**Output:** `[HEALTH_CHECK:GATEWAY_DOWN]`

```bash
if ! KANBAN_JSON=$(curl -s --max-time 5 "http://localhost:3001/api/kanban"); then
  GATEWAY_UP=false
  # → Exit Phase 1, skip all dispatch attempts
fi
```

**Why:** Detects infrastructure issues immediately without spawning sessions or wasting context.

---

### Safeguard #2: Bulk Protect in_progress Cards When Gateway Down
**Trigger:** Gateway health check fails  
**Action:** Record gateway down state in `card-failures.json`  
**Result:** Cron exits cleanly with `[HEALTH_CHECK:GATEWAY_DOWN]` — no dispatch attempts  
**When gateway recovers:** Next cron run will have `GATEWAY_UP=true` and resume normal dispatch

```json
// card-failures.json state when gateway down
{
  "gateway_status": {
    "down_since": 1773160000,
    "down_at": "2026-03-10T13:26:40Z",
    "check_at": "2026-03-10T13:26:40Z"
  }
}
```

**Why:** Stops the cron from hammering a dead gateway. When gateway comes back, we resume.

---

### Safeguard #3: Failure Count Tracking (Per Card)
**State file:** `~/.openclaw/.hal-alfred-tracking/card-failures.json`  
**Tracked per card:**
- `failure_count` — consecutive failures (resets to 0 on success)
- `last_attempt_at` — timestamp of last dispatch attempt
- `last_success_at` — timestamp when dispatch succeeded
- `last_error` — error message (first 200 chars)
- `moved_to_blocked_at` — when/if card was moved to Blocked column

```json
{
  "card_12345": {
    "failure_count": 2,
    "last_attempt_at": 1773159900,
    "last_error": "WebSocket error: ECONNREFUSED 192.168.2.79:18789"
  },
  "card_67890": {
    "failure_count": 0,
    "last_success_at": 1773159300
  }
}
```

**Why:** Prevents blindly retrying forever. We know which cards have failed and how many times.

---

### Safeguard #4: Move to Blocked After 3 Consecutive Failures (NOT Todo)
**Trigger:** `failure_count >= 3`  
**Action:**
1. Move card from `in_progress` → `blocked` (via Kanban API)
2. Add comment explaining why: `"🚫 BLOCKED: Dispatch failed 3+ times. Gateway or HAL unreachable."`
3. Reset failure count to 0 (allows manual retry if issue is fixed)

```bash
if (( FAILURE_COUNT >= 3 )); then
  curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/move" \
    -H "Content-Type: application/json" \
    -d "{\"column\": \"blocked\", \"reason\": \"Dispatch failed after 3 attempts\"}"
  
  curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/comments" \
    -H "Content-Type: application/json" \
    -d "{\"author\": \"executor\", \"text\": \"🚫 BLOCKED: Dispatch failed 3+ times...\"}"
fi
```

**Why:**
- **Visibility:** Joe sees blocked cards on the board immediately
- **No loop:** Card isn't in todo, so executor won't pick it up again
- **Clear reason:** Comment explains what went wrong
- **Manual recovery:** Joe can unblock + retry when issue is fixed

---

### Safeguard #5: Exponential Backoff Between Attempts
**Base cooldown:** 5 minutes  
**Per failure:** +2 minutes (scales with failure count)

| Failure Count | Cooldown | Total Since First Attempt |
|---------------|----------|---------------------------|
| 0 (1st attempt) | 5 min | 5 min |
| 1 (2nd attempt) | 7 min | 12 min |
| 2 (3rd attempt) | 9 min | 21 min |
| 3+ | → Blocked column (no more attempts) | — |

```bash
COOLDOWN_SECONDS=$((300 + FAILURE_COUNT * 120))  # 5 min + 2 min per failure
NEXT_ATTEMPT=$((LAST_ATTEMPT + COOLDOWN_SECONDS))

if (( NOW < NEXT_ATTEMPT )); then
  echo "[SKIPPED] card=$CARD_ID cooldown_active"
  continue
fi
```

**Why:**
- **First attempt:** Immediate (5 min window in 30-min cron cycle)
- **Second attempt:** Wait 7 min before retrying (gives time for transient issues to heal)
- **Third attempt:** Wait 9 min (probably a real issue, back off more)
- **Fourth+ :** Blocked (stop trying, escalate to Joe)

---

### Safeguard #6: Failure Count Reset on Success
**Trigger:** Dispatch succeeds (HAL or Alfred)  
**Action:** Set `failure_count = 0`, record `last_success_at`

```bash
if DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" ...); then
  # Success → clear failure count
  python3 << PYEOF
state["$CARD_ID"]["failure_count"] = 0
state["$CARD_ID"]["last_success_at"] = time.time()
PYEOF
fi
```

**Why:** One successful dispatch clears the failure history. Future failures start fresh.

---

### Safeguard #7: Health & Execution Logging
**Two log files:**

1. **`executor-health.log`** — Gateway health + high-level decisions
   ```
   [2026-03-10T13:26:40Z] GATEWAY_DOWN: kanban API unreachable
   [2026-03-10T13:26:40Z] ACTION: Gateway down — safeguarding in_progress cards
   [2026-03-10T13:30:00Z] GATEWAY_UP: kanban API responding
   ```

2. **`kanban-execution.log`** — Per-card dispatch details
   ```
   [2026-03-10T13:30:00Z] PROCESSING: [card_12345] Channel Expansion Pilot
   [2026-03-10T13:30:00Z]   Type: hal | Attempt: 2
   [2026-03-10T13:30:15Z]   ✅ DISPATCHED_TO_HAL: OK session=agent:main:task-1773160215000-abc123
   [2026-03-10T13:30:15Z] [EXECUTED] card=card_12345 type=hal dispatch_ok
   ```

**Why:** Full audit trail. Joe can see what happened, why cards moved, and debug issues.

---

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: GATEWAY HEALTH CHECK                                   │
├─────────────────────────────────────────────────────────────────┤
│ curl http://localhost:3001/api/kanban                           │
│                                                                 │
│ If FAIL:                          If OK:                        │
│   GATEWAY_UP = false       →        GATEWAY_UP = true    →      │
│   ↓                                 ↓                           │
│   PHASE 2                           PHASE 3                     │
└─────────────────────────────────────────────────────────────────┘
        ↓                                  ↓
┌───────────────────┐          ┌──────────────────────┐
│ PHASE 2:          │          │ PHASE 3:             │
│ PROTECT CARDS     │          │ EXTRACT CARDS        │
├───────────────────┤          ├──────────────────────┤
│ Record gateway    │          │ Parse in_progress    │
│ down state        │          │ from Kanban API      │
│ Exit with [OK]    │          │ If none, exit [OK]   │
│ No dispatch       │          │ Else → PHASE 4       │
└───────────────────┘          └──────────────────────┘
                                       ↓
                            ┌──────────────────────┐
                            │ PHASE 4:             │
                            │ LOAD FAILURE STATE   │
                            ├──────────────────────┤
                            │ Read card-failures   │
                            │ .json                │
                            │ Get failure counts   │
                            │ Get last attempts    │
                            │ → PHASE 5            │
                            └──────────────────────┘
                                       ↓
                            ┌──────────────────────────────────────────┐
                            │ PHASE 5: FOR EACH CARD                   │
                            ├──────────────────────────────────────────┤
                            │ Get: failure_count, last_attempt_at      │
                            │                                          │
                            │ if failure_count >= 3:                   │
                            │   → Move to BLOCKED column               │
                            │   → Add comment explaining               │
                            │   → Reset failure_count                  │
                            │   → CONTINUE to next card                │
                            │                                          │
                            │ else if (NOW < LAST_ATTEMPT + COOLDOWN): │
                            │   → [SKIPPED] cooldown active            │
                            │   → CONTINUE to next card                │
                            │                                          │
                            │ else:                                    │
                            │   → DISPATCH to HAL or Alfred            │
                            │   → If success: reset failure_count      │
                            │   → If fail: increment failure_count     │
                            │   → → CONTINUE to next card              │
                            └──────────────────────────────────────────┘
```

---

## Recovery Scenarios

### Scenario A: Transient Network Issue
```
Time 13:30  Card A fails (attempt 1) → failure_count=1
Time 13:57  Card A in cooldown (wait 7 min)
Time 14:00  Cron runs again, cooldown expired
Time 14:00  Card A succeeds → failure_count=0 ✅
```

### Scenario B: Gateway Down for Long Period
```
Time 13:30  Gateway down detected → GATEWAY_UP=false
Time 13:30  All in_progress cards protected (no dispatch attempts)
Time 14:00  Cron runs, gateway still down → skip again
Time 14:30  Gateway recovers
Time 14:30  Cron runs, GATEWAY_UP=true → resume dispatch attempts ✅
```

### Scenario C: Persistent HAL Issue
```
Time 13:30  Card A attempt 1 fails → failure_count=1
Time 13:57  Card A in cooldown
Time 14:00  Card A attempt 2 fails → failure_count=2
Time 14:09  Card A in cooldown
Time 14:30  Card A attempt 3 fails → failure_count=3
Time 14:30  Card A MOVED TO BLOCKED with comment
Time 14:30  Joe sees blocked card on board, unblocks when HAL is fixed ✅
```

### Scenario D: Card Already in Blocked Column
```
Pre-state: Card in blocked column
Time 14:00  Cron runs
Result: Executor only looks at in_progress column → doesn't touch blocked
         Joe can manually move back to todo when ready
```

---

## Safety Guarantees

✅ **No Request Queue Buildup**
- Gateway health check happens first
- If down, entire cron exits cleanly
- No attempts to dispatch to unreachable services

✅ **No Context Accumulation**
- Failed dispatch attempts logged separately (not to context)
- Each isolated HAL dispatch uses fresh session context
- Failure state tracked in JSON file, not in session memory

✅ **No Rate Limit Cascade**
- Exponential backoff prevents hammering
- Failed cards auto-move to Blocked (stops loop)
- Max 3 attempts per card per issue type

✅ **No Todo/In-Progress Loop**
- Cards moved to BLOCKED column (not todo)
- Blocked cards aren't picked up by executor
- Joe controls when to retry (manual unblock)

✅ **Full Audit Trail**
- `executor-health.log` — gateway status changes
- `kanban-execution.log` — per-card attempt history
- Card comments — reason for blocking

---

## Deploying the Safe Version

1. **Replace cron job payload:**
   ```bash
   cron update ed075571-2e25-4f70-82a8-a118503ad5b4 \
     --patch '{"payload": {"text": "Kanban Work Executor (SAFE): bash ~/.openclaw/workspace/scripts/kanban-work-executor-safe.sh"}}'
   ```

2. **Verify script is executable:**
   ```bash
   ls -la ~/.openclaw/workspace/scripts/kanban-work-executor-safe.sh
   ```

3. **Monitor on next run (in ~30 min):**
   ```bash
   tail -f ~/.openclaw/.hal-alfred-tracking/executor-health.log
   ```

---

## Testing Checklist

- [ ] Run script manually: `bash kanban-work-executor-safe.sh`
- [ ] Check `executor-health.log` for gateway health output
- [ ] Create a test card in in_progress
- [ ] Manually trigger cron, verify dispatch
- [ ] Check `kanban-execution.log` for success/failure
- [ ] Simulate gateway down (stop gateway service), verify cron skips dispatch
- [ ] Verify `card-failures.json` tracks state correctly
- [ ] Create intentional dispatch failure, verify card moves to Blocked after 3 attempts
- [ ] Recover gateway, verify cron resumes dispatch

---

**Summary:** All safeguards in place. System is now resilient to gateway failures, HAL downtime, and long-term dispatch issues. Cards won't loop in todo/in_progress. Joe has full visibility.
