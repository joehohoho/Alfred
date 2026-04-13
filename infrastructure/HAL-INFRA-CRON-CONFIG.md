# HAL Infrastructure — Cron Configuration Guide

**Purpose:** Integration instructions for deploying the three infrastructure improvements via cron jobs.

---

## Current Cron Jobs (to be consolidated/updated)

Run `crontab -l` to see all current jobs. The jobs below are candidates for consolidation:

```
*/30 * * * * bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh
*/20 * * * * bash ~/.openclaw/workspace/scripts/session-checkpoint.sh
*/15 * * * * bash ~/.openclaw/workspace/scripts/sync-pending-questions.sh
0 7 * * * bash ~/.openclaw/workspace/scripts/agents-size-guard.sh
```

---

## Phase 1: HAL Lease Monitor Integration

### What Changed
- **kanban-idle-loop.sh** now calls `hal-lease-monitor.sh` before idle-loop API
- Clears stale in_progress cards (>120m old) automatically

### Cron Entry (NO NEW JOB)
```bash
# Existing (already updated)
*/30 * * * * bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh
  # Now includes: sync-pending-questions + hal-lease-monitor + idle-loop-api
```

### Testing
```bash
# Test lease monitor (check-only mode)
bash ~/.openclaw/workspace/scripts/hal-lease-monitor.sh --check-only

# Test kanban-idle-loop (will call lease monitor first)
bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh
```

---

## Phase 2: HAL Dispatch Retry Queue Integration

### New Script
**File:** `scripts/hal-dispatch-with-retry.sh`  
**Purpose:** Wrapper around hal-dispatch-ws.js with token-safe retries

### Usage
```bash
# Simple dispatch (auto-retry on transient errors)
bash ~/.openclaw/workspace/scripts/hal-dispatch-with-retry.sh "Task description"

# With card ID (will post comments on success/failure)
bash ~/.openclaw/workspace/scripts/hal-dispatch-with-retry.sh "Task description" --card-id <card_id>

# Dry-run
bash ~/.openclaw/workspace/scripts/hal-dispatch-with-retry.sh "Task description" --dry-run
```

### Integration Points
The retry wrapper should be called by:
1. **Kanban idle-loop** (when auto-picking high-priority tasks)
2. **Manual HAL assignment** (when Joe approves a task for HAL)

### Example: Kanban Idle-Loop Integration
```bash
# In kanban-idle-loop.sh, after card is picked:
if [[ "$ACTION" == "auto-picked" ]]; then
  CARD_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('pickedCard',{}).get('id',''))")
  DESCRIPTION=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('pickedCard',{}).get('description',''))")
  
  # Use retry wrapper instead of direct dispatch
  bash scripts/hal-dispatch-with-retry.sh "$DESCRIPTION" --card-id "$CARD_ID"
fi
```

### No New Cron Job
The retry wrapper runs **on-demand** via idle-loop, not as a separate cron job.

---

## Phase 3: Unified Checkpoint Scheduler

### Current State
Multiple independent jobs doing similar work:
- `session-checkpoint.sh` (*/20)
- `sync-pending-questions.sh` (*/15)
- `heartbeat.sh` (*/30)

### New Consolidated Job
**File:** `scripts/checkpoint-scheduler-unified.sh`  
**Replace:** session-checkpoint.sh + heartbeat.sh

### Cron Configuration

**OLD (to remove):**
```bash
*/20 * * * * bash ~/.openclaw/workspace/scripts/session-checkpoint.sh
*/30 * * * * bash ~/.openclaw/workspace/scripts/heartbeat.sh
```

**NEW (to add):**
```bash
*/20 * * * * bash ~/.openclaw/workspace/scripts/checkpoint-scheduler-unified.sh
```

### Steps to Deploy

1. **Backup current crontab:**
   ```bash
   crontab -l > ~/crontab-backup-$(date +%Y%m%d).txt
   ```

2. **Open crontab editor:**
   ```bash
   crontab -e
   ```

3. **Remove old jobs** (or comment out):
   ```bash
   # */20 * * * * bash ~/.openclaw/workspace/scripts/session-checkpoint.sh
   # */30 * * * * bash ~/.openclaw/workspace/scripts/heartbeat.sh
   ```

4. **Add new unified job:**
   ```bash
   */20 * * * * bash ~/.openclaw/workspace/scripts/checkpoint-scheduler-unified.sh
   ```

5. **Keep these (unchanged):**
   ```bash
   */30 * * * * bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh
   */15 * * * * bash ~/.openclaw/workspace/scripts/sync-pending-questions.sh  (keep for now)
   0 7 * * * bash ~/.openclaw/workspace/scripts/agents-size-guard.sh
   ```

6. **Save and verify:**
   ```bash
   crontab -l | grep checkpoint
   ```

### Expected Logs
```
logs/checkpoint.log             (each run)
logs/checkpoint-counters.json   (aggregate stats)
memory/YYYY-MM-DD.md            (checkpoint entries on state change)
```

### Monitoring
```bash
# Check current counters
cat ~/.openclaw/workspace/logs/checkpoint-counters.json | jq .

# Expected output (after 24h):
{
  "total_runs": 72,        # 20-min interval × 60h
  "writes": 45,            # ~63% writes
  "skips": 27,             # ~37% no-op skips
  "errors": 0
}

# Calculate efficiency
# skip_ratio = skips / total_runs = 0.375 (37.5% of runs avoided writes)
```

---

## Complete New Crontab

After deploying all three phases:

```bash
# Kanban operations (includes lease monitor + idle-loop)
*/30 * * * * bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh

# Unified checkpoint + sync (replaces separate heartbeat/checkpoint jobs)
*/20 * * * * bash ~/.openclaw/workspace/scripts/checkpoint-scheduler-unified.sh

# Sync pending questions (keep separate for resilience)
*/15 * * * * bash ~/.openclaw/workspace/scripts/sync-pending-questions.sh

# Daily size guard
0 7 * * * bash ~/.openclaw/workspace/scripts/agents-size-guard.sh

# (Optional) Separate lease monitor run for extra assurance (30m interval)
*/30 * * * * bash ~/.openclaw/workspace/scripts/hal-lease-monitor.sh >> /Users/hopenclaw/.openclaw/workspace/logs/hal-lease-monitor.log 2>&1
```

---

## Rollback Plan

If issues occur:

```bash
# Restore old crontab
crontab ~/crontab-backup-$(date +%Y%m%d).txt

# Or manually revert jobs:
crontab -e
# Comment out new jobs, uncomment old ones
```

---

## Validation Checklist

- [ ] `hal-lease-monitor.sh --check-only` runs without errors
- [ ] `hal-dispatch-with-retry.sh --dry-run "test"` logs properly
- [ ] `checkpoint-scheduler-unified.sh --dry-run` creates no-op log
- [ ] Old checkpoint cron job removed/disabled
- [ ] New unified checkpoint job added at */20
- [ ] Monitor first 24h logs for errors
- [ ] Verify counter efficiency (skip_ratio >30%)
- [ ] Confirm no duplicate checkpoints (state-hash working)
- [ ] HAL dispatch logs show retries on transient errors
- [ ] Card comments update on dispatch success/failure

---

## Timeline

- **Phase 1:** Integrated into kanban-idle-loop (done)
- **Phase 2:** Dispatch wrapper created, no cron changes (done)
- **Phase 3:** Cron update (deploy after testing)
- **Validation:** 24h monitoring post-deployment
- **Rollback:** If needed, revert via crontab backup

---

## Support

**Logs to check:**
- `~/.openclaw/workspace/logs/checkpoint.log` — unified scheduler runs
- `~/.openclaw/workspace/logs/checkpoint-counters.json` — efficiency metrics
- `~/.openclaw/workspace/logs/hal-dispatch-retry.log` — dispatch retries
- `~/.openclaw/workspace/logs/hal-lease-monitor.log` — lease clears

**Manual diagnostics:**
```bash
# Check cron execution (macOS)
log stream --predicate 'eventMessage contains[cd] "checkpoint"' --level debug

# Check last 10 runs
tail -20 ~/.openclaw/workspace/logs/checkpoint.log

# Check for errors
grep "ERROR\|WARN" ~/.openclaw/workspace/logs/checkpoint.log
```
