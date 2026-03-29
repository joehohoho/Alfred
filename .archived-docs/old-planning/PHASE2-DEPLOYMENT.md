# Phase 2 Deployment Guide

**Status:** Ready to Deploy  
**Date:** Tuesday, February 17, 2026 — 15:19 AST  
**Components:** Dashboard + Implementation Scripts

---

## What's Included

### ✅ Dashboard Enhancements

**New Page:** `/optimization` (Command Center)

Tracks real-time metrics for Phase 2 progress:
1. **Local Model Performance** — Duration trends, success rate, variance
2. **Phase 2 Progress** — Cache hit rate, time saved, review stats
3. **Cron Job Performance** — Per-job success rates and durations
4. **Key Insights** — Automated alerts for regressions

**Backend Endpoints:**
- `/api/metrics/local-model` — Local model performance
- `/api/metrics/cron-performance` — Cron job stats
- `/api/metrics/phase2-progress` — Code review optimization stats

**Files Modified:**
- `frontend/src/pages/Optimization.tsx` (new)
- `frontend/src/components/Nav.tsx` (added route)
- `frontend/src/App.tsx` (added route)
- `frontend/src/api.ts` (added fetch method)
- `backend/src/routes/metrics.ts` (new)
- `backend/src/readers/metrics.ts` (new)
- `backend/src/index.ts` (registered route)

---

### ✅ Phase 2.A Implementation Script

**File:** `/Users/hopenclaw/.openclaw/workspace/scripts/review-job-tracker.sh`

**What it does:**
1. Detects git hash changes in ~/job-tracker repo
2. If code unchanged → returns cache hit (15s)
3. If code changed → generates diff-only review prompt
4. Outputs metrics to cache file for dashboard

**Expected Performance:**
- **First run:** 240s → 90s (parsing optimized)
- **Cache hit:** 90s → 15s (no inference needed)
- **Cache hit rate:** 70-80% (code changes ~2-3x/week)

**Cache file:** `/Users/hopenclaw/.openclaw/workspace/memory/code-review-cache.json`

---

## Phase 2.A Deployment Steps

### Step 1: Update the Cron Job

Update the code review job to use the new script:

**Current Payload:**
```
"Comprehensive code review of /Users/hopenclaw/job-tracker app:
1. SCAN: Explore the entire codebase structure..."
```

**New Payload:**
```
"Run chunked code review: bash /Users/hopenclaw/.openclaw/workspace/scripts/review-job-tracker.sh

Parse output:
1. If 'CACHE HIT' → No review needed, report cache stats
2. If 'DELTA REVIEW' → Process the diff-based review prompt below
3. Provide findings per instructions in the prompt

Report:
- Review type (cache hit vs full review)
- Findings (5 bullet max)
- Time saved vs baseline
- Token usage"
```

**Setup time:** 5 minutes (manual cron job edit)

---

### Step 2: Verify Dashboard

1. Restart command-center backend:
   ```bash
   cd /Users/hopenclaw/command-center/backend
   npm run dev  # or restart if production
   ```

2. Check frontend builds:
   ```bash
   cd /Users/hopenclaw/command-center/frontend
   npm run build
   ```

3. Visit: http://localhost:3000/optimization

---

### Step 3: Monitor First Cycle

**Tomorrow morning (after first code review):**

Check `/optimization` dashboard for:
- ✓ Local model metrics populated
- ✓ Cron performance shows review completion
- ✓ Cache file created at expected location

**Expected first run:**
- Time: 90-120s (baseline, no optimization yet)
- Cache: Created for next run
- Result: Full review findings posted to Slack

---

## Phase 2.B & 2.C Timeline

Once 2A is stable (24-48h):

### Phase 2.B: Result Caching (45 min)

Add persistent caching for:
- Code review findings (80-90% hit rate)
- Weather/morning brief (50% hit rate)
- Memory summaries (70% hit rate)

**Impact:** 30-40% of daily runs skipped entirely

### Phase 2.C: Task Batching (10 min)

Combine lightweight jobs:
- Morning brief + update check → single job
- Dashboard sync + health check → single job

**Impact:** 10-15% overhead reduction

---

## Rollback Plan

If Phase 2.A has issues, rollback is simple:

```bash
# Restore original cron payload
openclaw cron update c902e75b-ac83-4ce2-9ff7-ce5f98851812 \
  --payload='Original code review job payload...'

# Disable new dashboard (optional)
# - Disable /optimization route or remove from Nav
```

---

## Success Criteria (24 hours)

✅ Phase 2.A is successful if:

- [ ] Code review completes in <120s (baseline)
- [ ] Next code review hits cache (should be instant)
- [ ] Dashboard shows metrics populating
- [ ] No timeout errors in cron logs
- [ ] Cache file has proper structure

---

## Token Efficiency Note

**Phase 2 deployments use LOCAL model exclusively:**

- `review-job-tracker.sh` = shell script (0 tokens)
- Dashboard components = frontend only (0 tokens at runtime)
- Backend endpoints = computed from logs (0 tokens)
- **Net cost for Phase 2:** $0

---

## Next: Automated Monitoring

After Phase 2A is live, the dashboard automatically:
- Tracks local model performance trends
- Alerts if performance degrades
- Reports cache hit rates
- Estimates time saved

No additional setup needed — it's all pull-based from existing log files.

---

## Files Ready for Deployment

```
✓ scripts/review-job-tracker.sh         (executable)
✓ frontend/src/pages/Optimization.tsx   (new page)
✓ frontend/src/components/Nav.tsx       (updated)
✓ frontend/src/App.tsx                  (updated)
✓ frontend/src/api.ts                   (updated)
✓ backend/src/routes/metrics.ts         (new)
✓ backend/src/readers/metrics.ts        (new)
✓ backend/src/index.ts                  (updated)
```

All code is ready to commit and deploy.

---

## Questions Before Deploying?

1. **iMessage latency:** Still acceptable at 5 minutes? (unchanged from Phase 1)
2. **Code review frequency:** Still nightly, or move to every-other-day?
3. **Dashboard location:** Should `/optimization` be primary or secondary view?
4. **Slack notifications:** Should we auto-post optimization progress to Slack daily?

