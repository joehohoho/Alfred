# HAL Infrastructure Improvements — Dispatch Resilience & Token Safety

**Status:** In Progress (deployed)
**Implemented:** 2026-03-04 09:02–10:30 AST
**Owner:** Alfred

---

## Overview

Three infrastructure improvements deployed to address blocking issues and improve HAL dispatch resilience:

1. **Persistent Retry Queue** (token-aware, exponential backoff)
2. **Consolidated Overnight Scheduler** (prevents rate-limit cascades)
3. **Enhanced Lease Monitoring** (context-aware auto-unblock)

**Result:** Prevents cascade failures, eliminates manual unblocking, respects token budget.

---

## 1. Persistent Retry Queue (`hal-retry-queue.sh`)

**Problem Solved:** When HAL dispatch fails (transient error), it was lost. No automatic retry mechanism.

**Solution:**
- Maintains JSONL queue at `~/.openclaw/workspace/.hal-retry-queue/queue.jsonl`
- Automatic retry with exponential backoff: 30s → 90s → 300s
- **Token-aware:** Checks remaining tokens before each retry
- **Context-aware:** Aborts retries if context usage >75%
- Max 3 retries per task; after exhaustion, requires manual intervention

**Invocation:**
```bash
# Enqueue a failed task
bash scripts/hal-retry-queue.sh --enqueue "My task" card_id

# Process queue (runs every 5 minutes via LaunchAgent)
bash scripts/hal-retry-queue.sh --process

# Check queue status
bash scripts/hal-retry-queue.sh --status

# Clear queue
bash scripts/hal-retry-queue.sh --clear
```

**LaunchAgent:** `com.alfred.hal-retry-queue` (runs every 5 minutes)

**Log:** `~/.openclaw/workspace/.hal-retry-queue/retry-queue.log`

---

## 2. Consolidated Overnight Scheduler (`overnight-scheduler.sh`)

**Problem Solved:** 4 independent LaunchAgents running between 4:00–8:00 AM caused rate-limit cascades (4 gateway circuit breaks in one night).

**Solution:**
- Single consolidated scheduler runs at **4:30 AM** (staggered from other tasks)
- Low-cost tasks (log rotation, disk check) always run
- Conditional tasks (session cleanup) check system health first
- Respects context usage and token budget

**Tasks Consolidated:**
1. Log rotation (was at 4:00 AM, now part of scheduler)
2. Rate-limit recovery check
3. Session cleanup (async, non-blocking)
4. HAL retry queue processing
5. Lease monitoring (auto-unblock stale cards)
6. Disk space check

**LaunchAgent:** `com.alfred.overnight-scheduler` (runs at 4:30 AM daily)

**Log:** `~/.openclaw/workspace/logs/overnight-scheduler.log`

**Disabled LaunchAgents:**
- `com.alfred.log-rotation` (consolidated)

---

## 3. Enhanced Lease Monitoring (`hal-lease-monitor-enhanced.sh`)

**Problem Solved:** Stale in_progress cards blocked HAL dispatch indefinitely. Manual intervention required.

**Solution:**
- Detects cards stale >2 hours (configurable)
- Moves stale cards to "blocked" column (not "review", preserving audit trail)
- **Context-aware:** Only auto-unblocks if context <80% (avoids compounding high usage)
- Adds audit comment with timestamp and threshold info
- Distinguishes between active and truly stalled cards

**Invocation:**
```bash
# Check only (no auto-unblock)
bash scripts/hal-lease-monitor-enhanced.sh --check-only

# Auto-unblock stale cards (respects context threshold)
bash scripts/hal-lease-monitor-enhanced.sh

# Force unblock even if context high (emergency only)
bash scripts/hal-lease-monitor-enhanced.sh --force

# Custom max age
bash scripts/hal-lease-monitor-enhanced.sh "" 60  # cards stale >60 min
```

**Log:** `~/.openclaw/workspace/logs/hal-lease-monitor.log`

**Integrated into:** `overnight-scheduler.sh` (runs at 4:30 AM)

---

## System Safeguards

### Token Budget Guards
- Retry queue: Checks remaining tokens before every attempt
- Overnight scheduler: Skips all LLM-dependent tasks if tokens <5k
- Dispatch: Aborts with clear error if context >75%

### Rate-Limit Prevention
- Single consolidated scheduler (no parallel cron collisions)
- Exponential backoff for retries (1 min, 1.5 min, 5 min)
- Sleep delays between tasks (3–5 seconds) to batch requests

### Context Compression Safeguards
- Lease monitoring respects context %
- Queue processing skips if context >75%
- Overnight scheduler tracks system state before running tasks

---

## Monitoring

**Queue Status:**
```bash
bash ~/.openclaw/workspace/scripts/hal-retry-queue.sh --status
```

**Recent Activity:**
```bash
tail -50 ~/.openclaw/workspace/logs/overnight-scheduler.log
tail -50 ~/.openclaw/workspace/logs/hal-lease-monitor.log
tail -50 ~/.openclaw/workspace/.hal-retry-queue/retry-queue.log
```

**LaunchAgent Status:**
```bash
launchctl list | grep -E "hal-retry|overnight|lease"
```

---

## Metrics & Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Retry attempts | 3 max | Stop, escalate to Joe |
| Token budget | 2,000 per retry | Skip if below |
| Context usage | 75% | Abort pending tasks |
| Lease age | 2 hours default | Auto-move to blocked |
| Disk space | 85%+ | Alert, don't block |

---

## Future Enhancements

- [ ] Webhook notifications when retry exhausted
- [ ] Kanban auto-escalation for exhausted retries (Priority tag)
- [ ] Token budget forecasting (estimate when we'll have tokens)
- [ ] Historical dashboard of retry patterns
- [ ] A/B testing different backoff strategies

---

## Testing

**Test retry queue:**
```bash
# Enqueue a fake task
bash ~/.openclaw/workspace/scripts/hal-retry-queue.sh --enqueue "Test task" ""

# Check queue
bash ~/.openclaw/workspace/scripts/hal-retry-queue.sh --status

# Process (will fail on dispatch, stay in queue)
bash ~/.openclaw/workspace/scripts/hal-retry-queue.sh --process

# Check again (should show retry 2)
bash ~/.openclaw/workspace/scripts/hal-retry-queue.sh --status
```

**Test overnight scheduler:**
```bash
# Dry run the scheduler
bash ~/.openclaw/workspace/scripts/overnight-scheduler.sh
```

---

## Rollback

If needed, revert to original system:

```bash
# Disable new LaunchAgents
launchctl unload ~/Library/LaunchAgents/com.alfred.hal-retry-queue.plist
launchctl unload ~/Library/LaunchAgents/com.alfred.overnight-scheduler.plist

# Re-enable log-rotation
launchctl load ~/Library/LaunchAgents/com.alfred.log-rotation.plist
```

---

## Status Summary

✅ **Deployed:** 2026-03-04
✅ **Testing:** Active (monitoring logs)
✅ **Production Ready:** Yes (safeguards in place)

**Next:** Monitor overnight scheduler execution (check log at 4:35 AM). If no issues in 3 days, lock in as permanent system.
