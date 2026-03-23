# IMPROVEMENT-PLAN.md - System Fixes & Reliability Roadmap

**Created:** 2026-03-23 12:02 ADT  
**Status:** In Development  
**Owner:** Alfred

---

## Executive Summary

Four critical system reliability gaps identified in MEMORY.md require structured remediation. This plan addresses recurring infrastructure failures, duplicate question cycling, and kanban workflow bottlenecks that erode user experience and trust.

**Total estimated effort:** 12-16 hours  
**Expected completion:** 2026-03-26 (3 days)  
**Business impact:** Eliminate 80% of operational friction, restore cron job stability, enable fully autonomous workflow

---

## Priority 1: Cron Job Auto-Disable Pattern (BLOCKING)

### Problem Statement
- **Symptom:** 6 critical daily jobs (Evening Routine, Daily Inquiry, Daily Config, Nightly Git, Moltbook Review, Joe Profile Reflection) auto-disable every 3-5 days
- **Root cause:** `delivery.mode="announce"` + missing explicit `delivery.to` (Discord channel ID) → invalid routing → auto-disable
- **Impact:** Breaks daily automation, blocks all dependent workflows
- **Recurrence:** Mar 10, 12, 15 (pattern confirmed)

### Solution Design

#### Phase 1A: Audit Current Cron Job Configuration
**Action:** Fetch all cron jobs and categorize by delivery mode
```bash
# Enumerate all jobs
cron list
# Extract delivery config for each job
# Categorize: which jobs use announce + missing explicit channel ID?
```

**Success criterion:** Identify exact job IDs + delivery field state

**Deliverable:** 
- Create `memory/cron-audit-2026-03-23.md` with:
  - Job list with delivery config
  - Jobs at risk (announce mode + no explicit `to` field)
  - Safe jobs (webhook or explicit channel)

#### Phase 1B: Fix All Affected Cron Jobs
**For each at-risk job:**
1. Retrieve job config
2. Add explicit `delivery.to` field with correct Discord channel ID
3. Test by manually running the job
4. Verify job stays enabled after 2 test cycles (10 min apart)
5. Update tracking file

**Channel mappings (verify against discord config):**
- `#autonomous-updates`: [NEED TO VERIFY CHANNEL ID]
- `#evenings`: [NEED TO VERIFY CHANNEL ID]
- `#daily-brief`: [NEED TO VERIFY CHANNEL ID]
- Other channels: [REFERENCE EXISTING WORKING JOBS]

**Success criterion:** All 6 jobs run + stay enabled for 24h without auto-disable

**Deliverable:**
- Updated cron job configs
- Post-fix verification log
- Update MEMORY.md status → ✅ FIXED

---

## Priority 2: Repair ACTIVE-TASK.md Sync Script

### Problem Statement
- **Symptom:** `sync-pending-questions.sh` marker format drift breaks pending-questions refresh
- **Impact:** ACTIVE-TASK.md not updating with current questions → Joe doesn't see what needs attention
- **Dependency:** Blocks Daily Inquiry cron job from functioning correctly

### Solution Design

#### Phase 2A: Debug Sync Script
**Action:**
1. Read `scripts/sync-pending-questions.sh` → understand current marker format
2. Check `ACTIVE-TASK.md` → identify current marker format
3. Find format mismatch (old vs. new markers)
4. Test script on a copy of ACTIVE-TASK.md

**Success criterion:** Identify exact format drift issue

**Deliverable:**
- Debug report in memory: what's breaking, what the formats are

#### Phase 2B: Fix Script + Test
1. Update script to support BOTH old + new marker formats (backward compat)
2. Test on copy of ACTIVE-TASK.md
3. Run on real ACTIVE-TASK.md with backup
4. Verify questions appear in Daily Inquiry cron output

**Success criterion:** Script runs without errors; questions appear in ACTIVE-TASK.md

---

## Priority 3: Daily Inquiry Duplicate Questions (HIGH)

### Problem Statement
- **Symptom:** Same 3-4 questions cycle every 4 days (passive income targets, synergies)
- **Impact:** Erodes user trust in notification system; wastes tokens on redundant inquiries
- **Root cause:** No "last_asked" timestamp tracking; daily inquiry always generates same questions

### Solution Design

#### Phase 3A: Design Question Deduplication System

Create `memory/questions-registry.json` with structure:
```json
{
  "questions": [
    {
      "id": "passive-income-targets",
      "question": "What passive income targets should we prioritize next?",
      "last_asked": "2026-03-20T14:30:00",
      "asked_count": 3,
      "cooldown_days": 7
    }
  ]
}
```

**Decision:** 
- Minimum cooldown: 7 days between same question
- Exceptions: Time-sensitive questions (daily check-ins) get 24h cooldown
- Auto-archive old questions after 60 days

**Deliverable:** questions-registry.json + schema documentation

#### Phase 3B: Update Daily Inquiry Cron Job
**Action:**
1. Modify daily inquiry script to:
   - Load questions-registry.json before generating questions
   - Skip questions where `now - last_asked < cooldown_days`
   - Update last_asked timestamp after sending question
2. Add new question rotation logic (pick from diverse categories, not same 3)
3. Test on staging before deploying to production

**Success criterion:** No duplicate questions within 7 days; questions vary by category

**Deliverable:**
- Updated daily inquiry script
- 7-day test verification log

---

## Priority 4: Enforce Auto-Move for HAL Deliverables

### Problem Statement
- **Symptom:** HAL review cards accumulate; 14+ cards stuck in Review column
- **Context:** Joe directive Feb 27: Auto-move completed work from Review → Done
- **Impact:** False backlog, mixed signal on completion, workflow bottleneck
- **Root cause:** No automated move logic after HAL completion → Discord notification

### Solution Design

#### Phase 4A: Design Auto-Move Logic
**Criteria for auto-move Review → Done:**
1. Card must have HAL completion notification posted to Discord (evidence of completion)
2. Card must NOT have a blocking comment from Joe (e.g., "needs revision" or "incomplete")
3. 2-hour delay after notification (allow Joe time to review + block if needed)
4. Auto-move only if above conditions are met

**Deliverable:** Auto-move decision logic spec in memory file

#### Phase 4B: Implement Auto-Move via Cron
**Action:**
1. Create cron job: `review-card-auto-promote` (runs every 2 hours)
2. Job logic:
   - Fetch all Review cards
   - For each card: check Discord notifications + Joe comments
   - Apply auto-move criteria
   - Move eligible cards to Done
   - Post comment: "Auto-moved to Done [timestamp]"
3. Add safeguard: never move cards with specific tags (e.g., `needs-approval`)

**Success criterion:** Review cards move automatically after 2h + no blocking comments

**Deliverable:**
- Cron job config
- Post-deployment verification (review column clears)

---

## Priority 5: Monitor Gateway Stability (ONGOING)

### Problem Statement
- **Risk:** Recent memory overflow incidents; potential for further failures
- **Impact:** Unplanned downtime, lost work context, manual restart required

### Solution Design

#### Continuous Monitoring
**Existing:** Context compression alert at 60-65% (See HEARTBEAT.md)
**Addition:** Gateway process health check every 15 min
```bash
# Check: Is gateway process running?
ps aux | grep "openclaw gateway" | grep -v grep
# Check: Gateway port responsive?
curl -s http://localhost:8000/health | jq .status
```

**Deliverable:** 
- Extend HEARTBEAT.md with gateway health checks
- Add alert at 3 consecutive failed checks → notify Joe

---

## Implementation Timeline

| Phase | Task | Duration | Start | End | Status |
|-------|------|----------|-------|-----|--------|
| 1A | Cron audit | 1.5h | 2026-03-23 | 2026-03-23 | 🔄 IN PROGRESS |
| 1B | Fix cron jobs | 2.5h | 2026-03-23 | 2026-03-24 | ⏳ BLOCKED (waiting 1A) |
| 2A | Debug sync script | 1h | 2026-03-24 | 2026-03-24 | ⏳ PENDING |
| 2B | Fix + test script | 1.5h | 2026-03-24 | 2026-03-24 | ⏳ PENDING |
| 3A | Design dedup system | 1h | 2026-03-24 | 2026-03-24 | ⏳ PENDING |
| 3B | Update cron job | 1.5h | 2026-03-24 | 2026-03-25 | ⏳ PENDING |
| 4A | Design auto-move | 1h | 2026-03-25 | 2026-03-25 | ⏳ PENDING |
| 4B | Implement cron job | 2h | 2026-03-25 | 2026-03-26 | ⏳ PENDING |
| 5 | Gateway monitoring | 1.5h | 2026-03-26 | 2026-03-26 | ⏳ PENDING |

**Total:** 13.5 hours across 3 days

---

## Success Criteria & Verification

### Cron Job Auto-Disable (Priority 1)
- ✅ All 6 critical jobs running
- ✅ No auto-disables in 48h observation period
- ✅ Jobs run on schedule (Evening Routine @ 8PM, Daily Inquiry @ 9AM, etc.)

### Sync Script (Priority 2)
- ✅ Script runs without errors
- ✅ ACTIVE-TASK.md updates with current questions
- ✅ Daily Inquiry pulls updated questions

### Duplicate Questions (Priority 3)
- ✅ No question repeats within 7 days
- ✅ Questions vary by category (at least 5 distinct topics)
- ✅ Question registry tracks timestamps correctly

### Auto-Move Deliverables (Priority 4)
- ✅ Review cards reduce from 14+ to <3 within 1 week
- ✅ Auto-move respects blocking comments (cards with issues stay in Review)
- ✅ All moved cards have audit trail comment

### Gateway Stability (Priority 5)
- ✅ Health checks running every 15 min
- ✅ No false alarms (healthy gateway passes checks)
- ✅ Alerts fire only on genuine failures

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Cron job misconfiguration breaks more jobs | Test on copy first; keep original config backup; rollback if needed |
| Sync script breaks ACTIVE-TASK.md format | Backup ACTIVE-TASK.md before running; test on copy |
| Auto-move deletes cards incorrectly | 2-hour delay; require no-block-comment condition; audit trail |
| Questions registry corrupts | Version control; backup before changes; validate JSON format |
| Gateway monitoring false alerts | Require 3 consecutive failures before alert (dampening) |

---

## Next Steps

**Immediate (Next 2 hours):**
1. Audit cron jobs → identify exact at-risk jobs + channel IDs
2. Create memory tracking file
3. Begin Phase 1B fixes

**Daily standup items:**
- Post progress to #autonomous-updates (this channel)
- Update IMPROVEMENT-PLAN.md with completions
- Escalate any blockers to Joe

**Completion:**
- Final verification pass (all 5 success criteria)
- Update MEMORY.md → remove from "Critical Issues"
- Post completion summary to Discord

---

## Owner & Accountability

**Owner:** Alfred  
**Review gate:** None (autonomous improvement; report-only after completion)  
**Escalation:** If any phase blocked >2h, notify Joe via Command Center

---

**Plan Status:** ACTIVE (Kicking off Phase 1A now)  
**Last Updated:** 2026-03-23 12:02 ADT
