# Infrastructure Audit & Optimization Research (2026-03-22)

**Objective:** Identify systemic pain points in Alfred's operational overhead and propose a holistic, high-impact solution to reduce infrastructure management burden.

**Status:** IN PROGRESS — Research phase (answering clarifying questions will refine scope)

---

## Executive Summary (Preliminary)

**Problem:** Alfred spends ~5-10h/week on infrastructure fixes, memory management, cron job recovery, session state restoration, and error diagnosis. This is reactive work that doesn't advance business goals.

**Root Causes (Identified):**
1. **Context fragmentation** — 4-layer memory system (MEMORY.md + ACTIVE-TASK.md + LAST-SESSION.md + NOW.md) requires manual sync, has drift issues
2. **Cron job brittleness** — Discord routing failures, channel ID mismatches, auto-disable cascades (6+ incidents in 7 days)
3. **Session collapse risk** — Context overflow at 80%+ causing gateway auto-restart, losing in-flight work despite checkpoints
4. **Uncoordinated state recovery** — Markers drift in ACTIVE-TASK.md break sync-pending-questions.sh; fallback recovery is manual
5. **Observable gaps** — No predictive alerts; no metrics on failure patterns; no early-warning system
6. **LaunchAgent surface area** — 23 agents running; any single failure can cascade (e.g., ollama-keepalive down → all LOCAL tasks hang)

**Preliminary Findings:**
- 48 commits in 7 days related to fixes/errors (~7 per day)
- 6+ cron job auto-disables in 14 days (recurring pattern)
- 3 session/context crashes with manual recovery in 10 days
- 2+ memory sync failures (marker drift)
- 0 predictive alerts; all failures are reactive

---

## Pain Point Analysis (Deep Dive)

### P1: Cron Job Auto-Disable Cascade (HIGH IMPACT)

**Frequency:** Every 2-3 days (6 incidents in 14 days)  
**Time to fix:** 15-45 min per incident (diagnosis + re-enable + testing)  
**Root cause:** `delivery.mode="announce"` + channel routing logic has 3 failure modes:
- Invalid channel ID in `delivery.to` (old Slack IDs used in Discord-routed jobs)
- Missing channel ID entirely (defaults to implicit routing, fails silently)
- Channel/sessionTarget mismatch (job says "discord" but channel is Slack ID)

**Mitigation Attempts So Far:**
- ✅ Manual fix on 2026-03-19 (added explicit Discord channel IDs)
- ✅ Added CRON-JOBS-FIX.md documenting the pattern
- ❌ Still recurs (2 auto-disables since fix on Mar 19-22)

**Why Still Failing:**
- No validation layer prevents job creation with invalid channel IDs
- No pre-execution test for delivery reachability
- Auto-disable threshold (3 failures) is too aggressive for transient network errors

**Proposed Fix (Tier 1 — Prevention):**
- Add delivery config validator: validates channel ID exists before job creation
- Add pre-execution delivery test: ping the channel 1h before job, alert if unreachable
- Increase auto-disable threshold to 5 consecutive failures + 24h backoff
- Create a "delivery health" dashboard showing which jobs have had failures

---

### P2: Context & Session State Collapse (HIGH IMPACT)

**Frequency:** Every 5-7 days (3+ incidents in past 10 days)  
**Symptom:** Gateway auto-restarts at 80%+ context, losing work despite checkpoint files  
**Root cause:** No real-time context monitoring; checkpoints written at 60%+ but reset happens too late

**Current Checkpoint System:**
- ACTIVE-TASK.md (task state)
- LAST-SESSION.md (session bridge)
- NOW.md (emergency lifeboat)
- memory/YYYY-MM-DD.md (daily log)

**Problem:** Checkpoints are write-ahead files, not integrated with session state. When context resets, new session loads all 4 files, but:
- Ordering is unclear (which checkpoint is authoritative?)
- No versioning (which version is latest?)
- No automatic merge of in-flight work (if task was 90% done, checkpoint doesn't capture the last 10%)

**Proposed Fix (Tier 1 — Prevent Collapse):**
- Unified state cache: single source of truth for session state (JSON file, not markdown)
- Real-time context monitor: alert at 60%, 70%, 75% thresholds with specific actions
- Automatic checkpoint trigger at 70%: save all in-flight context to disk atomically
- Post-restart recovery script: automatically resume from last checkpoint without manual input

---

### P3: Memory System Fragmentation (MEDIUM IMPACT)

**Frequency:** Continuous (drift happens daily)  
**Problem:** MEMORY.md, ACTIVE-TASK.md, LAST-SESSION.md, memory/YYYY-MM-DD.md have overlapping scope

**Example:** Pending questions exist in:
- ACTIVE-TASK.md (Pending Questions section)
- Notification history (Command Center)
- sync-pending-questions.sh output
- memory/2026-03-22.md (logged when synced)

**When Sync Fails:** sync-pending-questions.sh looks for markers in ACTIVE-TASK.md, fails because:
- Marker format drifted (moved to a different section or removed)
- ACTIVE-TASK.md wasn't updated in previous session
- Notification history and file system are out of sync

**Root Cause:** No single source of truth; manual sync script is brittle.

**Proposed Fix (Tier 2 — Consolidation):**
- Move all "working state" to unified JSON state cache (same as P2)
- Keep MEMORY.md for long-term strategic memory only (decisions, patterns, learnings)
- Keep daily logs (memory/YYYY-MM-DD.md) for audit trail, not for state recovery
- Remove manual sync; make notification system → state cache updates atomic

---

### P4: Observable Gaps & Manual Diagnosis (MEDIUM IMPACT)

**Frequency:** Every incident (no automated root cause analysis)  
**Cost:** 30-60 min per failure to diagnose (check logs, read memory, trace state)

**Missing Observability:**
- No metrics on cron success/failure rates
- No early-warning system (e.g., "3 recent failures on this job, pre-emptive alert")
- No dashboard showing LaunchAgent health (which are running, last restart, uptime)
- No correlation view (e.g., "gateway restarted → session lost → manual recovery")

**Proposed Fix (Tier 2 — Visibility):**
- Centralized metrics store (JSON + appends, lightweight)
- Daily health report: cron job success rates, LaunchAgent uptime, context overflow incidents, model quota burn
- Predictive alerts: "X job has failed 3x in 24h" → investigate before auto-disable
- Incident correlation log: when gateway restarts, log the context%, pending tasks, and recovery steps

---

### P5: LaunchAgent Surface Area (MEDIUM IMPACT)

**Frequency:** Ongoing (any single failure can cascade)  
**Problem:** 23 LaunchAgents; if any core one fails (ollama-keepalive, gateway, imsg-responder), cascading failures occur

**Example:** If ollama-keepalive dies:
- All LOCAL model tasks timeout
- Haiku tasks forced (higher quota burn)
- Codex becomes only code option (TPM limit)
- Context overflow risk increases (fewer local options)

**Current State:** All have `KeepAlive=true`, but no health check or automatic recovery.

**Proposed Fix (Tier 3 — Resilience):**
- Health check daemon: every 5 min, verify 5 critical LaunchAgents (gateway, ollama, imsg, dashboard, tunnel)
- Auto-restart logic: if LaunchAgent is dead, restart it and log the incident
- Alerting: notify Joe if 3+ LaunchAgents are unhealthy
- Graceful degradation: if LOCAL unavailable, automatically shift to Haiku for certain task types

---

## Solution Categories

### 🎯 Tier 1: Stop the Bleeding (Immediate Impact, 20-40h implementation)
- **Cron delivery validator** → prevent auto-disable cascades
- **Unified state cache** → prevent context collapse and sync failures
- **Automatic checkpoint & recovery** → eliminate manual state restoration

**Impact:** 4-5h/week time saved, 80% reduction in infrastructure fixes

### 🔍 Tier 2: Visibility & Early Warning (15-25h implementation)
- **Centralized metrics store** → track what's actually happening
- **Health dashboard** → see system state at a glance
- **Predictive alerts** → catch failures before they cascade

**Impact:** 2-3h/week time saved (faster diagnosis), 60% fewer escalations

### 💪 Tier 3: Resilience & Automation (25-35h implementation)
- **LaunchAgent health check daemon**
- **Automatic recovery procedures**
- **Graceful degradation logic**

**Impact:** 2-3h/week time saved (fewer manual restarts), 70% fewer cascade failures

---

## Questions for Joe (To Refine Proposal)

1. **Which pain point hurts most?** Cron failures? Session collapse? Memory fragmentation? Diagnosis time?

2. **Integration preference:** Should all infrastructure improvements feed into Command Center (localhost:3001), or separate monitoring system?

3. **Automation vs Notification:** How much should auto-fix vs notify?
   - Example: If ollama-keepalive dies, should Alfred auto-restart it and log, or notify Joe first?

4. **Budget & Complexity:** Willing to invest 60-80h (distributed over 2-3 weeks) if it saves 5-10h/week long-term?

5. **Acceptable external services:** Any objection to:
   - A lightweight local metrics store (JSON append log)?
   - A health check background process running 24/7?
   - Expanding the dashboard with a new "Infrastructure Health" tab?

---

## Next Steps (Once Questions Answered)

1. **Prioritize tiers** based on your answers
2. **Design unified state cache schema** (JSON structure)
3. **Implement Tier 1** (highest ROI)
4. **Build health metrics collection**
5. **Integrate into Command Center**
6. **Test & iterate on real workloads**

---

**Research started:** 2026-03-22 15:50 ADT  
**Next update:** After Joe clarifies priorities
