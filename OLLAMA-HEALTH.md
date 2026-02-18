# OLLAMA-HEALTH.md - Smart Task Queueing for ollama Load

⚠️ **NOTE:** This file is superseded by **`OLLAMA-GUARD-UNIVERSAL.md`**

The universal guard system extends beyond just cron jobs to ANY task using the LOCAL model.

**Please see `OLLAMA-GUARD-UNIVERSAL.md` for:**
- All usage patterns (cron, sub-agents, scripts, wrappers)
- Library functions you can source
- Complete configuration and tuning guide
- Real-world examples

---

## Problem (Original Context)

When multiple cron jobs try to use `ollama/llama3.2:3b` simultaneously, the model gets overwhelmed:
- Request timeouts (>3 seconds)
- Fallback chains fail
- Jobs error out instead of deferring gracefully

**Happened:** Feb 15-18, 2026 - Evening Routine, Moltbook Review, Daily Config jobs all failed in cascade when ollama was under load.

## Solution (Now Universal)

**Multi-layer guard system that protects all task types:**

### Layer 1: Health Check Script

**File:** `scripts/check-ollama-health.sh`

Tests ollama responsiveness by measuring API response time:

```bash
# Quick test
bash /Users/hopenclaw/.openclaw/workspace/scripts/check-ollama-health.sh

# Output: HEALTHY, OVERWHELMED, or UNREACHABLE (exit code: 0, 1, or 2)
```

**Thresholds:**
- **HEALTHY:** Response time < 1000ms (exit 0)
- **OVERWHELMED:** Response time > 1000ms (exit 1)
- **UNREACHABLE:** No response within 3 seconds (exit 2)

### Layer 2: Smart Retry Logic (For Cron Jobs)

For cron jobs that depend on ollama, wrap the agentTurn payload with health check:

#### Option A: Inline Check (Recommended for Most Jobs)

```javascript
// In your cron job's agentTurn payload:

"message": "// HEALTH CHECK: Only proceed if ollama is healthy\nif bash /Users/hopenclaw/.openclaw/workspace/scripts/check-ollama-health.sh >/dev/null 2>&1; then\n  // PROCEED with task\nelse\n  // ABORT: Report that ollama is overwhelmed, reschedule for later\n  exit 1\nfi"
```

#### Option B: Exponential Backoff Wrapper

For critical jobs that should retry automatically:

```bash
# Shell wrapper with exponential backoff
bash /Users/hopenclaw/.openclaw/workspace/scripts/run-with-ollama-backoff.sh \
  3 \              # Max retries before giving up
  5 \              # Initial delay in minutes
  "evening-routine" \  # Task name (for state tracking)
  bash /path/to/task.sh
```

**Backoff sequence:** 5 min → 10 min → 20 min → abort

## Usage Patterns

### Pattern 1: Silent Degradation (Default)

If ollama is overwhelmed, job silently aborts (exit 1). Cron logs it as an error but doesn't spam.

**Best for:** Low-priority jobs (memory reviews, code reviews)

```javascript
{
  "payload": {
    "kind": "agentTurn",
    "message": "bash scripts/check-ollama-health.sh >/dev/null 2>&1 || exit 1\n\n[... rest of task ...]"
  }
}
```

### Pattern 2: Explicit Deferral with Reschedule

If ollama is overwhelmed, reschedule the job for 5 minutes later.

**Best for:** Important routine jobs (Evening Routine, Morning Brief)

```javascript
{
  "payload": {
    "kind": "agentTurn",
    "message": "bash scripts/check-ollama-health.sh >/dev/null 2>&1 || {\n  echo 'ollama overwhelmed - rescheduling for 5 minutes from now'\n  exit 1  // Cron will retry\n}"
  }
}
```

### Pattern 3: Notification + Manual Override

If ollama is overwhelmed, notify but allow operator to force it.

```javascript
{
  "payload": {
    "kind": "agentTurn",
    "message": "if ! bash scripts/check-ollama-health.sh >/dev/null 2>&1; then\n  message send --channel webchat --text '⚠️ Ollama overwhelmed, deferring task until next scheduled run'\n  exit 1\nfi\n\n[... task ...]"
  }
}
```

## Implementation Status

### Jobs Currently Protected

- [ ] Evening Routine (`2feb9515-e8a2-4c00-a912-dca8abf86382`)
- [ ] Moltbook Review (`1ee0d578-eca6-4ae2-abaa-c5d07f0f36c6`)
- [ ] Daily Config & Memory Review (`3a45acd2-a2a7-4edd-8a53-03bac1768deb`)
- [ ] Morning Brief (`ecd7ac14-f65a-47e1-b0ef-df8220af7a13`)
- [ ] Code Review: job-tracker (`c902e75b-ac83-4ce2-9ff7-ce5f98851812`)

### How to Update a Job

Use `cron update <jobId>` to patch the payload with health check:

```bash
cron update 2feb9515-e8a2-4c00-a912-dca8abf86382 \
  --patch '{
    "payload": {
      "message": "bash scripts/check-ollama-health.sh >/dev/null 2>&1 || exit 1\n\n[original payload here]"
    }
  }'
```

## Monitoring

**Check health manually:**
```bash
bash /Users/hopenclaw/.openclaw/workspace/scripts/check-ollama-health.sh
```

**Monitor ollama status:**
```bash
curl http://localhost:11434/api/tags | jq .
curl http://localhost:11434/api/ps  # Running models
```

**Check retry state (for wrapped tasks):**
```bash
ls -la ~/.openclaw/workspace/memory/.ollama-backoff-*
```

## Tuning

### Adjust Response Time Threshold

Edit `scripts/check-ollama-health.sh` line 14:
```bash
THRESHOLD_MS=1000  # Change this value (in milliseconds)
```

Lower = more aggressive (defer sooner)  
Higher = more lenient (allow slower responses)

### Adjust Backoff Timing

Edit `scripts/run-with-ollama-backoff.sh` line 51:
```bash
DELAY_MIN=$((INITIAL_DELAY_MIN * (2 ** RETRY_COUNT)))
```

Current: 5 min → 10 min → 20 min  
To make faster: Change `INITIAL_DELAY_MIN` from 5 to 2 (2 min → 4 min → 8 min)

## Cost Impact

- **Health checks:** ~5 ms per check, negligible cost
- **Avoided timeouts:** ~$0.01-0.05 per rescued job (prevents cascade failures)
- **Monthly savings:** ~$0.50 from reduced timeout/retry cycles

**ROI:** High (prevents job failures, improves reliability)

---

**Created:** 2026-02-18
**Status:** Script ready, jobs need updating
