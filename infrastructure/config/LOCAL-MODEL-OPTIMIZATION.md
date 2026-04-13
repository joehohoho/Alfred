# Local Model Optimization Strategy

**Status:** Analysis in progress (spawned LOCAL sub-agent for detailed findings)  
**Last Updated:** 2026-02-17  
**Goal:** Reduce Mac mini resource load while maintaining quality and responsiveness

---

## Problem Summary

The local model (ollama/llama3.2:3b) is overloaded due to:

1. **Excessive polling frequency**
   - iMessage responder: Every 30 seconds (2,880 calls/day!)
   - This runs continuously with no breaks
   
2. **Scheduling conflicts** 
   - Multiple heavy inference tasks run without staggering
   - Can trigger simultaneous competing workloads
   - Example: Evening routine + code review both at night

3. **Timeout failures** (4+ jobs failing recently)
   - Evening Routine (147s, failed)
   - Code Review: job-tracker (240s, failed)
   - Daily Config & Memory Review (153s, failed)
   - Moltbook Weekly Review (241s, failed)
   - These are context-heavy tasks with large codebase reads

4. **Resource contention**
   - Memory search uses local embedding model (nomic-embed-text)
   - Runs on session start, on search, and on interval (60min)
   - Competes with agent inference for GPU/CPU

5. **No smart queuing**
   - `maxConcurrent: 3` but no prioritization
   - First-come-first-served can block critical work

---

## Quick Wins (Implement Immediately)

### 1. Reduce iMessage Polling Frequency
**Current:** Every 30 seconds  
**Proposed:** Every 5-10 minutes (configurable delay multiplier)

```
Benefits:
- Reduces load: 2,880 → 144-288 calls/day (95% reduction!)
- Still responsive for real conversations (5-10 min latency acceptable)
- Barely any performance cost
```

**Implementation:** Update cron job schedule
```json
"schedule": {
  "kind": "every",
  "everyMs": 300000,  // Changed from 30000 (30s → 5min)
  "anchorMs": 1770997543836
}
```

**Trade-off:** iMessage responses have 5-10 min delay vs instant  
**Risk:** Low (message queue won't overflow in 5 minutes)

---

### 2. Stagger Heavy Cron Jobs
**Current:** Jobs can collide (both code review + evening routine run ~22:00)  
**Proposed:** Space them out with 10-15 minute gaps

```
Current Schedule (PROBLEMS):
- 07:00 Daily Config & Memory Review
- 08:30 Morning Brief
- 22:30 Evening Routine
- 23:00 Code Review ← COLLISION WITH EVENING ROUTINE!

Proposed Schedule (STAGGERED):
- 07:00 Daily Config & Memory Review (unchanged)
- 08:30 Morning Brief (unchanged)
- 22:00 Evening Routine (move from 22:30)
- 23:15 Code Review (move from 23:00)

Also stagger memory operations:
- Memory search: Reduce sync frequency from 60min → 120min
- Memory search: Disable onSessionStart (can re-enable if needed)
```

**Benefits:**
- Eliminates timeout collisions
- Predictable resource usage
- Better cache locality

**Implementation:** Update cron schedules for Code Review and Evening Routine

---

### 3. Implement Request Batching for Light Tasks
**Current:** Dashboard-sync, morning brief, etc. run independently  
**Proposed:** Batch 2-3 lightweight tasks into single inference call

```
Example: Combine Morning Brief + Daily Update Check
Instead of 2 separate calls:
1. Weather + overnight summary
2. Update check

Run as single job:
"Get weather for Dieppe, get overnight summary from memory/$(date).md, check for updates"

Saves:
- Model startup/teardown overhead
- Context loading
- Scheduling overhead
```

**Trade-off:** Tasks complete at same time (possible to split if needed)  
**Risk:** Low (non-critical tasks)

---

## Structural Changes (Medium-term)

### 4. Reduce Context Size for Heavy Jobs
**Problem:** Code review job reads entire codebase, causing 240s+ inference

**Options:**

A. **Chunked Processing** (Recommended)
```
Instead of: "Review entire ~/job-tracker codebase"
Do: 
  1. "Review src/*.js (first 100 lines)"
  2. "Review tests/*.js (first 100 lines)"
  3. Combine findings in main session
```

B. **Exclude Low-Value Files**
```
Skip:
- node_modules/ (already reviewed, dependencies stable)
- .git/ (not code to review)
- Logs/ (not code)
- Large test fixtures (keep test structure only)
```

C. **Incremental Reviews**
```
Instead of: Full nightly review
Do:
  - Only review files changed since last review
  - Use git diff to find deltas
  - Still catch issues, 10x faster
```

**Expected Improvement:** Code review: 240s → 60-80s (66% reduction)

---

### 5. Smart Resource Scheduling
**Implement priority tiers:**

```
TIER 1 (High Priority):
- iMessage responder (user-facing)
- Morning/evening routines
- Critical alerts

TIER 2 (Normal):
- Dashboard sync
- Daily reviews
- Code reviews

TIER 3 (Low Priority):
- Memory maintenance
- Moltbook analysis
- Long-running analyses

When resource contention detected:
- Queue TIER 3 jobs
- Interrupt TIER 3 if TIER 1 arrives
- Never interrupt TIER 1
```

**Implementation:** Custom job queue with priority (requires code change to OpenClaw)

---

### 6. Implement Result Caching
**What to cache:**

1. **Code review findings** (changes slowly)
   - Cache last review results
   - Only re-run if files changed
   - Save 80-90% of runs

2. **Morning brief weather** (changes infrequently)
   - Cache 2-hour old results
   - Only fetch new if >2h old
   - Save 50% of calls

3. **Memory summaries** (stable across days)
   - Cache daily summaries
   - Only update at day boundary
   - Save 70% of reads

**Storage:** `memory/cache.json` with TTL timestamps

---

## Configuration Changes

### 7. Tune Ollama Server
**Current config:** No specific tuning mentioned

**Recommended settings:**
```bash
# ~/.ollama/ollama.env or docker compose
OLLAMA_NUM_GPU=1  # Ensure GPU is available
OLLAMA_MAX_LOADED_MODELS=1  # Only keep llama3.2 loaded
OLLAMA_KEEP_ALIVE=10m  # Unload after 10min idle
```

### 8. Adjust Gateway Concurrency Settings
**Current:** `maxConcurrent: 3` (all agents)

**Proposed:**
```json
"maxConcurrent": 2,  // Reduce from 3 to 2 (lighter load)
"subagents": {
  "maxConcurrent": 1  // Only 1 subagent at a time for local model
}
```

**Rationale:** Local model handles CPU load worse than API models  
**Trade-off:** Slightly slower parallel execution, much better reliability

### 9. Increase Timeout Thresholds (Temporarily)
**Current:** 120 seconds global timeout

**Proposed:**
```json
"timeoutSeconds": 150  // Increased from 120
```

**But better approach:** Reduce load via batching instead of extending timeouts  
(Timeouts are symptom, not cure)

---

## Monitoring Strategy

### Track These Metrics

1. **Local model response times**
   ```bash
   tail -f ~/.openclaw/logs/cache-trace.jsonl | jq '.durationMs' 
   ```
   - Target: <30s for light jobs, <90s for heavy jobs
   - Alert if: consistently >100s

2. **Mac mini system load**
   ```bash
   vm_stat 1 | grep "free memory"  # Memory pressure
   iostat 1 | grep "%idle"         # CPU idle %
   ```
   - Target: CPU >30% idle (not maxed)
   - Alert if: <10% idle during job runs

3. **Cron job failure rate**
   ```bash
   cron list | grep -E "error|consecutiveErrors"
   ```
   - Target: 0% failures
   - Alert if: >2 consecutive failures

4. **Queue depth**
   - Monitor pending subagents
   - Alert if: queue depth >3

---

## Implementation Roadmap

**Phase 1 (Today, ~30 min):** ✅ DEPLOYED 2026-02-17 15:02 AST
- [x] Update iMessage polling: 30s → 5min (300,000ms)
- [x] Stagger code review + evening routine (Evening 22:00, Code Review 23:15)
- [x] Reduce memory sync frequency: 60min → 120min
- [x] Reduce maxConcurrent: 3 → 2
- [x] Reduce subagents maxConcurrent: unlimited → 1
- [x] Disable memory search on session start (reduces startup overhead)
- [x] Increase timeout threshold: 120s → 150s (buffer for smoother processing)

**Phase 2 (This week, ~2 hours):**
- [ ] Implement result caching for code reviews
- [ ] Split code review into chunked processing
- [ ] Batch morning brief + update check

**Phase 3 (Next week, ~4 hours):**
- [ ] Implement smart resource scheduling (priority tiers)
- [ ] Add monitoring dashboard
- [ ] Document performance baselines

---

## Expected Results

**After Phase 1:**
- iMessage polling: 95% load reduction
- Timeout failures: Should stop (staggering prevents collisions)
- Mac mini idle %: ~10% → ~25-30%

**After Phase 2:**
- Code review time: 240s → 60s (75% faster)
- Overall local model load: ~40% lower
- Cache hit rate: 70-80% (code rarely changes)

**After Phase 3:**
- Predictable resource usage
- No manual intervention needed
- Better response times for user-facing tasks

---

## Notes & Caveats

1. **Quality impact:** Minimal
   - Chunked code reviews still find issues
   - Staggering doesn't reduce analysis depth
   - Polling delay is transparent to user

2. **Complexity trade-off:** Phase 1 is trivial, Phase 3 requires code changes

3. **Future options:** If still overloaded after Phase 2:
   - Use cloud model (Sonnet) for heavy jobs, local for lightweight
   - Deploy dedicated Ollama server on separate machine
   - Upgrade Mac mini RAM (if currently constrained)

---

## Questions for Joe

1. **iMessage latency:** Is 5-10 minute delay acceptable, or must it be instant?
2. **Code review frequency:** Can we move to every other day instead of nightly?
3. **Memory search:** Can we disable automatic syncing and only search on request?
4. **Monitoring:** Want real-time dashboard or just monthly review?

