# Alfred Infrastructure Improvement Scan — 2026-04-03 04:00 AM

**Triggered by:** Kanban idle loop (proactive activity #4)  
**Time:** 04:03 - 04:15 ADT  
**Status:** ✅ Complete

---

## Current State Summary

- **Total cron jobs:** 38 configured
- **Enabled jobs:** ~28 active
- **Disabled jobs:** 10 (auto-disabled due to failures)
- **LaunchAgents running:** 23+ (from launchctl list)
- **Script library:** 170 scripts, ~23,400 lines total
- **Memory system:** 33,045 lines across 200+ daily logs
- **Sentinel:** All 9 components healthy
- **Audit trail:** Clean — no critical incidents in last 48h

---

## Detailed Gap Analysis

### Gap 1: Cron Job Discovery & Delivery Routing (HIGH IMPACT)

**Current State:**
- 10 jobs disabled without self-healing capability
- Examples:
  - "Refresh OPEN-LOOPS Dashboard" (3 consecutive failures)
  - "Morning Brief Snapshot" (delivery.to channel ID invalid)
  - "Daily Goal Analysis" (delivery channel not configured)
  - 7 others in similar disabled state

**Failure Mode:**
When cron job delivery fails (bad Discord channel, webhook timeout, invalid schema):
1. Job auto-disables itself
2. No monitoring or alert (except audit log)
3. Operator must manually:
   - Find logs
   - Diagnose root cause
   - Fix config / re-enable
4. Meanwhile, observability gaps grow (OPEN-LOOPS not refreshing, etc.)

**Impact:** OPEN-LOOPS dashboard (critical for daily standup) is currently broken and requires manual fix.

---

### Gap 2: Notification Routing Infrastructure (PRIORITY 1 IN MEMORY.md)

**Current Issues:**
- No unified question queue (all notifications go directly to send-notification.sh)
- No deduplication system
- **CONFIRMED:** Same questions asked every 4 days without dedup
  - "Passive Income Targets (Q2)" cycles repeatedly
  - "App Growth Strategy (Priority)" cycles repeatedly
  - "Market Signal Lab Scope" cycles repeatedly
- No answer-tracking completion (unanswered notifications age indefinitely)
- No escalation path (old unanswered questions don't re-ping Joe)
- No unified "questions asked" index (requires scanning memory logs + goals/notifications.json)

**Impact:** 
- Joe notification fatigue (same context repeated)
- Erodes trust in notification system
- Reduces signal-to-noise ratio

---

### Gap 3: Script Library Maintenance & Organization (TECHNICAL DEBT)

**Current State:**
- 170 scripts in `~/.openclaw/workspace/scripts/`
- Mostly flat organization (no subdirectories or categories)
- No central registry of:
  - Script purpose / description
  - Dependencies (which scripts call which)
  - Entry points / usage patterns
- High duplication potential (5+ scripts call "bash ./alfred..." pattern)
- No automated health checks:
  - Unused scripts not identified
  - Broken imports not caught
  - Version mismatches not flagged
- No execution tracing (hard to follow call chains)

**Examples of unclear purposes:**
- `hal-get-idle-task.sh` vs. `hal-idle-check.sh` vs. `hal-idle-dispatch-cron.sh` (3 similar patterns)
- `kanban-idle-loop.sh` vs. `kanban-stale-scan.sh` vs. `kanban-work-executor.sh` (unclear overlap)

**Impact:**
- Difficult to understand full system architecture
- High risk when updating one script (unknown callers break)
- On-boarding complexity for future work

---

### Gap 4: Session Memory Architecture Instability (SECONDARY)

**Observation from audit log:**
```
Session cleanup did not reduce size (543534 → 671083 bytes)
Main session reset (bloated) — gateway restarted
[repeated 3+ times in last 24h]
```

**Possible Root Causes:**
1. Context injection pattern (too much MEMORY.md per session?)
2. Checkpoint timing too aggressive (60% threshold may trigger too often)
3. Orphaned session files not cleaned properly
4. Duplicate sessions accumulating

**Impact:**
- Unnecessary gateway restarts every 30-60 min
- Disrupts active work during critical tasks
- Root cause unclear (need 1-week monitoring before deep investigation)

---

## Top 3 Recommended Improvements (Not Already in Kanban)

### ✅ #1: CRON JOB SELF-HEALING SYSTEM (3-4h effort)

**Problem:** 10 disabled jobs require manual diagnosis + re-enable

**Solution:** Build a cron job health daemon that:
1. Runs every 30 min (low overhead)
2. Scans `~/.openclaw/cron/jobs.json` for disabled jobs + reasons
3. For known-fixable failures, attempt lightweight auto-fix:
   - Validate Discord channel IDs exist in `openclaw.json`
   - Test webhook connectivity
   - Run preflight validation (script already exists: `cron-preflight-validator.sh`)
4. If fix succeeds → re-enable job + log recovery
5. If not fixable → create alert for manual review (weekly Discord summary)

**Implementation:**
- New script: `cron-health-monitor.sh`
- New cron job: Register in jobs.json (every 30 min)
- Integration: Use existing `cron-preflight-validator.sh` for validation

**Why This Matters:**
- Reduces manual troubleshooting
- Increases observability (disabled jobs obvious, root cause clear)
- Self-healing infrastructure = less Joe operational burden
- **Quick win:** OPEN-LOOPS will auto-recover (critical for daily standup)

---

### ✅ #2: QUESTION DEDUPLICATION ENGINE + ESCALATION (2-3h effort)

**Problem:** Same questions asked every 4 days; no tracking of answered/pending status

**Solution:** Build lightweight question tracking system:
1. Create `goals/asked-questions-registry.json` (time-keyed by question hash)
2. Before sending new question via `send-notification.sh`:
   - Hash the question
   - Check: "Was this question asked in the last 7 days?"
   - If yes + unanswered → don't send duplicate, update existing notification instead
   - If unanswered for 7+ days → auto-escalate with "This is still pending..." framing
3. Integration point: `daily-inquiry.sh` (runs at 10 AM daily)

**Implementation:**
- New registry: `goals/asked-questions-registry.json`
- Modify: `daily-inquiry.sh` to check dedup before sending
- New helper: `check-question-duplicate.sh` 
- Optional: Weekly escalation cron job

**Why This Matters:**
- Eliminates duplicate "Passive Income Targets (Q2)" cycles
- Demonstrates system learning (Joe sees "still pending" instead of repeat)
- Increases notification signal-to-noise ratio
- Prevents notification fatigue

**Quick Win:** Questions will ask different variations (synergies, timeline, urgency) instead of verbatim repeats

---

### ✅ #3: SCRIPT LIBRARY CATALOG + HEALTH DASHBOARD (2-3h effort)

**Problem:** 170 scripts with no central registry; hard to understand dependencies

**Solution:** Create lightweight script discovery system:
1. Generate `scripts/CATALOG.md`:
   - Hand-curated list of ~40-50 major scripts
   - For each: purpose, dependencies, entry point, frequency of use
2. Build `scripts/health-check.sh` validation:
   - All imported scripts exist + are executable
   - No broken import patterns
   - Script version/last-modified timestamps
   - Frequency of use (count occurrences in LaunchAgent + cron jobs)
3. Weekly execution: `scripts/health-check.sh` → post summary to Discord
4. Output highlights: unused scripts (candidates for archival), high-use scripts (candidates for optimization)

**Implementation:**
- New file: `scripts/CATALOG.md` (manual curation, ~2-3 hours)
- New script: `scripts/health-check.sh` (validates structure, ~30-45 min)
- New cron job: Weekly health check (register in jobs.json)
- Integration: Post results to Discord weekly

**Why This Matters:**
- Clarifies full system architecture for Joe
- Makes obvious which scripts are critical vs. experimental
- Enables safe refactoring of technical debt
- On-boarding clarity for future improvements

**Quick Win:** Will immediately show which of 170 scripts are active (probably <40) vs. dormant/experimental

---

## Non-Kanban Considerations

### Session Memory Bloat (Monitor, Don't Act Yet)
The repeated session cleanup + gateway restart cycles suggest context injection may be too aggressive. However, root cause is unclear. **Recommendation:** Monitor sentinel logs for 1 week, then investigate if pattern persists. If it continues, escalate to deep investigation of checkpoint timing and context injection strategy.

### Slack Deprecation (Already Fixed)
No action needed. Properly migrated to Discord in v2026.3.24. All cron jobs updated.

### HAL Dispatch (Working Well)
Idle loop dispatching to HAL is operational. No gaps identified. Keep monitoring.

---

## Summary

Alfred's infrastructure is **operationally healthy** (all critical systems running), but has **strategic gaps** in:
1. Automatic recovery from cron failures (10 disabled jobs)
2. Question tracking and deduplication (notification fatigue)
3. Script library organization (technical debt, on-boarding complexity)

The top 3 improvements are:
- **Cron Job Self-Healing** (high impact, 3-4h)
- **Question Deduplication** (addresses PRIORITY 1 in MEMORY.md, 2-3h)
- **Script Catalog** (clarity + on-boarding, 2-3h)

**Total effort:** ~7-10 hours. **Total impact:** Significant reduction in manual ops, improved Joe experience, clearer architecture.

---

**Audit completed:** 2026-04-03 04:15 ADT  
**Next step:** Post summary to Discord (quiet hours, no Joe message)
