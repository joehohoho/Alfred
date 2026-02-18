# Ollama Guard — Deployment to Other Jobs

**How to apply the universal guard to remaining cron jobs**

---

## Jobs Already Protected ✅

| Job | Status | Last Update |
|-----|--------|-------------|
| Evening Routine | ✅ Protected | 2026-02-18 04:46 |
| Moltbook Review | ✅ Protected | 2026-02-18 04:46 |
| Daily Config & Memory | ✅ Protected | 2026-02-18 04:46 |

---

## Jobs Recommended for Protection ⏳

### 1. Morning Brief (9:30 AM Daily)

**Job ID:** `ecd7ac14-f65a-47e1-b0ef-df8220af7a13`

**Current payload:**
```
"Run morning brief for Dieppe, NB:\n\n1. WEATHER - Use: curl -s 'wttr.in/Dieppe,NB?T'\n   ..."
```

**To add guard:**
```bash
cron update ecd7ac14-f65a-47e1-b0ef-df8220af7a13 --patch '{
  "payload": {
    "message": "bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\nRun morning brief for Dieppe, NB:\n\n1. WEATHER - Use: curl -s '\''wttr.in/Dieppe,NB?T'\''\n   [... rest of original message ...]"
  }
}'
```

**Why:** Runs daily at 8:30 AM, depends on LOCAL model for summary generation

---

### 2. Code Review: job-tracker (11:15 PM Daily)

**Job ID:** `c902e75b-ac83-4ce2-9ff7-ce5f98851812`

**Current payload:**
```
"Run chunked code review via: bash /Users/hopenclaw/.openclaw/workspace/scripts/review-job-tracker.sh\n\n..."
```

**To add guard:**
```bash
cron update c902e75b-ac83-4ce2-9ff7-ce5f98851812 --patch '{
  "payload": {
    "message": "bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\nRun chunked code review via: bash /Users/hopenclaw/.openclaw/workspace/scripts/review-job-tracker.sh\n\n[... rest of original message ...]"
  }
}'
```

**Why:** Runs late evening, comprehensive analysis using LOCAL model

---

### 3. iMessage Responder (Every 5 Minutes)

**Job ID:** `be75527d-f9bd-4609-a7f0-c0985a3c0bcd`

**Current payload:**
```
"Respond to new iMessages if any.\n\n..."
```

**To add guard:**
```bash
cron update be75527d-f9bd-4609-a7f0-c0985a3c0bcd --patch '{
  "payload": {
    "message": "bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\nRespond to new iMessages if any.\n\n[... rest of original message ...]"
  }
}'
```

**Why:** Runs frequently (5-min intervals), can safely defer if ollama busy

---

### 4. Dashboard Sync (Every 2 Hours)

**Job ID:** `30369e83-f0fc-45d6-9887-d123fd2065d3`

**Current payload:**
```
"Run this command and report result: bash /Users/hopenclaw/.openclaw/workspace/Alfred-Dashboard/sync-data.sh"
```

**Note:** This job uses `wakeMode: "next-heartbeat"` and runs a script. The guard is optional here since it's not pure LOCAL model work, but adding it ensures graceful degradation.

**To add guard (optional):**
```bash
cron update 30369e83-f0fc-45d6-9887-d123fd2065d3 --patch '{
  "payload": {
    "message": "bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\nRun this command and report result: bash /Users/hopenclaw/.openclaw/workspace/Alfred-Dashboard/sync-data.sh"
  }
}'
```

---

## Deployment Options

### Option A: One-by-One (Safest)

1. Update Morning Brief, test for 2-3 days
2. If stable, update Code Review
3. If stable, update iMessage Responder
4. If stable, update Dashboard Sync

**Advantage:** Can verify each job independently  
**Disadvantage:** Takes longer  
**Recommended for:** First-time deployments

### Option B: Batch Deployment (Faster)

1. Update all 4 jobs at once
2. Monitor for 24 hours
3. Verify no new failure patterns

**Advantage:** Fast, all jobs protected immediately  
**Disadvantage:** Harder to isolate if something breaks  
**Recommended for:** After Option A succeeds

### Option C: Manual (No Cron Updates)

Update job payloads via OpenClaw UI directly:
1. Navigate to job settings
2. Find the message/payload field
3. Add guard check at top:
   ```
   bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1
   ```
4. Save

---

## Verification Checklist

After updating a job, verify:

```bash
# 1. Check job was updated
cron list | grep "Morning Brief"
# Should show updatedAtMs = recent timestamp

# 2. Test guard independently
bash scripts/ollama-guard.sh && echo "✅ Guard works"

# 3. Wait for next scheduled run
# Monitor cron logs: cron runs <jobId>

# 4. Check job completed
cron runs <jobId> | tail -5
# Should show status: "ok" (not "error")
```

---

## Rollback Plan

If a job starts failing after adding guard:

```bash
# Get current job status
cron list | grep "Morning Brief"

# View error
cron runs <jobId> | tail -1

# Rollback to previous payload (remove guard check)
cron update <jobId> --patch '{
  "payload": {
    "message": "[original message without guard check]"
  }
}'
```

---

## Batch Command (Deploy All At Once)

If using Option B, here's the batch script:

```bash
#!/bin/bash
# deploy-guard-to-all-jobs.sh

GUARD_CHECK="bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1"

echo "Deploying ollama guard to all jobs..."

# Morning Brief
echo "1. Updating Morning Brief..."
cron update ecd7ac14-f65a-47e1-b0ef-df8220af7a13 --patch '{
  "payload": {
    "message": "'"${GUARD_CHECK}"'\n\nRun morning brief for Dieppe, NB:\n\n1. WEATHER - Use: curl -s '\''wttr.in/Dieppe,NB?T'\''\n   - Current conditions with wind chill\n   - Today'\''s high with wind chill factor\n   - Snowfall (winter) or UV (summer)\n   - Wind/gusts\n\n2. OVERNIGHT WORK - Check memory/$(date +%Y-%m-%d).md\n   - Completed tasks, decisions, blockers\n   - Brief summary (bullet points)\n\nPost formatted summary to Slack #nightlyroutine or return as announcement."
  }
}'

# Code Review
echo "2. Updating Code Review..."
cron update c902e75b-ac83-4ce2-9ff7-ce5f98851812 --patch '{
  "payload": {
    "message": "'"${GUARD_CHECK}"'\n\nRun chunked code review via: bash /Users/hopenclaw/.openclaw/workspace/scripts/review-job-tracker.sh"
  }
}'

# iMessage Responder
echo "3. Updating iMessage Responder..."
cron update be75527d-f9bd-4609-a7f0-c0985a3c0bcd --patch '{
  "payload": {
    "message": "'"${GUARD_CHECK}"'\n\nRespond to new iMessages if any."
  }
}'

echo "✅ Deployment complete"
echo "Monitor with: cron list"
```

**Save as:** `scripts/deploy-guard.sh`  
**Run with:** `bash scripts/deploy-guard.sh`

---

## Monitoring Dashboards

After deployment, monitor these jobs:

```bash
# Watch all ollama-dependent jobs
cron list | grep -E "Morning Brief|Code Review|iMessage|Dashboard"

# Monitor specific job
cron runs ecd7ac14-f65a-47e1-b0ef-df8220af7a13

# Check for new error patterns
for job_id in ecd7ac14-f65a-47e1-b0ef-df8220af7a13 c902e75b-ac83-4ce2-9ff7-ce5f98851812 be75527d-f9bd-4609-a7f0-c0985a3c0bcd; do
  echo "=== $(cron list | grep $job_id | jq -r '.name') ==="
  cron runs $job_id | tail -3 | jq -r '.status, .lastError'
done
```

---

## Timeline (Recommended)

**Week 1:** Deploy to Morning Brief + Code Review  
**Week 2:** Monitor, verify no new patterns  
**Week 3:** Deploy to iMessage Responder  
**Week 4:** Full deployment complete, monitor monthly

---

## Success Metrics

After full deployment, expect:
- ✅ Zero "All models failed" cascade errors
- ✅ Graceful deferral when ollama is slow
- ✅ Jobs resume on next scheduled cycle
- ✅ Monitoring shows consistent response times
- ✅ No new failure patterns

---

## Quick Reference

**All job IDs:**
```bash
ecd7ac14-f65a-47e1-b0ef-df8220af7a13  # Morning Brief
c902e75b-ac83-4ce2-9ff7-ce5f98851812  # Code Review
be75527d-f9bd-4609-a7f0-c0985a3c0bcd  # iMessage Responder
30369e83-f0fc-45d6-9887-d123fd2065d3  # Dashboard Sync (optional)
```

**Guard check to prepend:**
```
bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1

```

---

**Last updated:** 2026-02-18 04:49 AST  
**Status:** Ready for deployment  
**Recommendation:** Start with Option A (one-by-one) for safety
