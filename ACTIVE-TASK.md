# ACTIVE-TASK.md — Current Work State

**Status:** `in_progress`  
**Started:** 2026-03-16 11:44 ADT  
**Target Completion:** 2026-03-30  
**Objective:** Mission Control Phase 1 — Stability & Visibility for Command Center

---

## 📌 Task Summary

Enhance localhost:3001 Command Center dashboard with three core features to restore visibility, stabilize cron job management, and improve Kanban UX.

**Kanban Card ID:** `task_1773672258312_393a575f`  
**Phase:** 1 of 3  
**Est. Effort:** 18-22 hours  
**Owner:** Alfred (frontend) + HAL (backend APIs)

---

## 🎯 Chosen Approach

**Sequential Backend-First Model:**
1. HAL spawns and delivers Cron Status API endpoints first (4 endpoints)
2. Alfred integrates frontend components in parallel with Phase 1 deliverables
3. Daily sync (09:00 AM ADT) for blockers + integration issues
4. Phase 1 gate testing on 2026-03-30; then Phase 2 begins

**Why:** Cron API is the riskiest blocker (depends on OpenClaw Gateway); doing it first unblocks frontend work.

---

## 📋 Phase 1 Deliverables Checklist

### 1.1 Cron Job Status Panel (6-8h) — BACKEND + FRONTEND
**Owner:** HAL (API) + Alfred (UI)  
**Status:** NOT STARTED

**API Endpoints (HAL):**
- [ ] `GET /api/cron/status` — List all jobs + current status
- [ ] `POST /api/cron/{jobId}/run` — Trigger job immediately
- [ ] `POST /api/cron/{jobId}/toggle` — Enable/disable job
- [ ] `GET /api/cron/{jobId}/logs` — Retrieve last run logs

**Frontend Component (Alfred):**
- [ ] React CronJobPanel component
- [ ] Job list with status, last run, next run
- [ ] Enable/disable buttons + manual trigger
- [ ] Color coding (green/yellow/red)
- [ ] Auto-refresh every 60 seconds via Socket.io

**Definition of Done:**
- [ ] All 4 endpoints working + tested
- [ ] Frontend displays ≥10 jobs with accurate status
- [ ] Buttons functional (enable/disable/run work)
- [ ] Auto-refresh active (no stale data >60s)
- [ ] Mobile-friendly layout

---

### 1.2 Enhanced Task Board (4-6h) — FRONTEND ONLY
**Owner:** Alfred  
**Status:** NOT STARTED

**Requirements:**
- [ ] Refine existing drag-drop (smooth operation, no lag)
- [ ] Implement quick "Add Task" button + modal
- [ ] Add task count to column headers ("In Progress (3)")
- [ ] Task card enhancements: priority badge, assignee, due date
- [ ] Add filter buttons: by priority, assignee, label
- [ ] Click task → expand detail view

**Definition of Done:**
- [ ] Drag-drop smooth + no lag
- [ ] Quick-add modal works (creates task via API)
- [ ] Column counts accurate
- [ ] Filters functional
- [ ] Task detail view renders correctly
- [ ] Mobile-friendly

---

### 1.3 Quick File Access Sidebar (2-3h) — FRONTEND ONLY
**Owner:** Alfred  
**Status:** NOT STARTED

**Requirements:**
- [ ] Right sidebar with links to:
  - ACTIVE-TASK.md (inline editor or link)
  - OPEN-LOOPS.md
  - MEMORY.md
  - NOW.md
  - Today's memory (auto-detect date)
  - HEARTBEAT.md
- [ ] Sidebar toggle (collapse/expand)
- [ ] File preview on hover (markdown preview)
- [ ] Edit button for quick access
- [ ] Mobile-friendly (collapse on small screens)

**Definition of Done:**
- [ ] All links functional
- [ ] Preview renders markdown correctly
- [ ] Sidebar collapse/expand smooth
- [ ] Mobile-friendly
- [ ] No errors on missing files (graceful fallback)

---

## 🚀 Execution Plan

### Step 1: HAL Backend Work (Async, parallel)
- **When:** Now (immediately after planning)
- **Task:** Implement Cron Status API + Socket.io events
- **Duration:** 4-6 hours (can run overnight)
- **Deliverable:** 4 working endpoints + test cases
- **Handoff:** Git branch + API documentation

**HAL Spawn Command (ready below):**
```
Full requirements + API spec in MISSION-CONTROL-IMPLEMENTATION-PLAN.md Section 2.1
Data source: /Users/hopenclaw/.openclaw/cron/jobs.json
Test with: curl http://localhost:3001/api/cron/status
```

### Step 2: Alfred Frontend Work (Parallel, starting immediately)
- **When:** Now (after HAL spawn)
- **Phase 2a:** Quick file sidebar (2-3h, no backend needed)
- **Phase 2b:** Enhanced task board (4-6h, existing API)
- **Phase 2c:** Cron panel frontend (wait for HAL API)
- **Duration:** 6-9 hours across 2-3 days

### Step 3: Integration Testing (2026-03-25)
- **When:** After both HAL API + all frontend components complete
- **What:** Full Phase 1 smoke test (all features on localhost:3001)
- **Where:** Mac mini
- **Gate:** All acceptance criteria met

### Step 4: Gate & Review (2026-03-30)
- **When:** End of week
- **Who:** Alfred + HAL + Joe feedback
- **Output:** Formal Phase 1 sign-off + go/no-go for Phase 2

---

## 📊 Progress Tracking

**Daily Log Location:** `memory/YYYY-MM-DD.md`

**Sync Points:**
- 09:00 AM ADT daily: Alfred + HAL quick standup (Slack or Command Center comment)
- 05:00 PM ADT: Alfred checkpoint (EOD status update)
- Weekly review: Every Friday (impact on Phase 2 timeline)

**Metrics to Track:**
- Hours spent (actual vs. estimate)
- Blockers encountered + resolution time
- Code quality (PRs reviewed, test coverage)
- Performance metrics (dashboard load time, Socket.io latency)

---

## 🔴 Current Status (2026-03-17 16:20 ADT)

**Blocker:** HAL Cron Status API not started. Waiting on HAL to investigate OpenClaw Gateway API capability and begin implementation.

**Unblocked:** Phase 1.3 (QuickFileAccess sidebar) ready to code — no backend dependency. Can proceed immediately while waiting on HAL.

**Frontend codebase:** Located at `/Users/hopenclaw/command-center` (React + TypeScript, Vite).

---

## 🔴 Known Blockers & Risks

### Blocker 1: Cron API Availability
**Issue:** OpenClaw Gateway may not expose `/api/cron/status` endpoint  
**Impact:** HAL can't implement API; frontend waits  
**Mitigation:** Parse `cron/jobs.json` directly + query LaunchAgent status via `launchctl`  
**Owner:** HAL (investigate first, then proceed with fallback)

### Blocker 2: Socket.io Setup
**Issue:** Command Center may not have Socket.io server configured  
**Impact:** Auto-refresh won't work; fall back to polling  
**Mitigation:** Use 60s polling interval initially; add Socket.io later if needed  
**Owner:** HAL (backend setup)

### Risk 1: Performance Degradation
**Issue:** Adding widgets slows dashboard  
**Impact:** UX regresses; feature fails  
**Mitigation:** Lazy-load components, cache cron data, test load time <3s  
**Owner:** Alfred (frontend optimization)

### Risk 2: File Sync on Sidebar
**Issue:** ACTIVE-TASK.md update in sidebar not persisting  
**Impact:** Confusion about task state  
**Mitigation:** Read-only sidebar initially; full edit in Phase 2  
**Owner:** Alfred (implement carefully)

---

## 🎯 Next Steps (Immediate Actions)

**Alfred (tomorrow morning):**
1. ✅ Dashboard codebase located: `/Users/hopenclaw/command-center`
2. ⏳ Code Phase 1.3 (QuickFileAccess sidebar) — lowest risk, highest ROI
3. ⏳ Check HAL API status (09:00 AM standup)
4. ⏳ If HAL API ready → integrate Phase 1.1 frontend
5. ⏳ If HAL blocked → start Phase 1.2 (Task Board enhancements)

**HAL (async, waiting on spawn signal):**
1. ⏳ Receive full spec + handoff
2. ⏳ Investigate OpenClaw Gateway API capability
3. ⏳ Implement Cron Status endpoints (4 endpoints)
4. ⏳ Test locally + deliver working API
5. ⏳ Notify Alfred when ready for frontend integration

**Gate (2026-03-30):**
- All 3 features working on localhost:3001
- Mobile-friendly verified
- <3s load time
- Joe smoke test passes

---

## 📝 Pending Questions

**None yet.** All requirements clarified in MISSION-CONTROL-IMPLEMENTATION-PLAN.md.

If blockers arise, file as `[KANBAN-BLOCKER]` on this task.

---

## 📚 Reference Files

- `MISSION-CONTROL-IMPLEMENTATION-PLAN.md` — Full spec (read carefully)
- `memory/2026-03-16.md` — Mission Control video review notes
- `COMMAND-CENTER.md` — Existing dashboard architecture (if exists)
- `cron/jobs.json` — Current cron job config (data source)
- `/Users/hopenclaw/command-center` — Frontend codebase (React + TypeScript)

---

## ✅ Status Summary (2026-03-17 16:20 ADT)

| Component | Owner | Status | ETA |
|-----------|-------|--------|-----|
| **Cron API** | HAL | 🔴 NOT STARTED | TBD |
| **File Sidebar** | Alfred | 🟢 READY TO CODE | 2026-03-18 |
| **Task Board** | Alfred | 🟡 BLOCKED (wait on HAL) | 2026-03-18-19 |
| **Cron Panel UI** | Alfred | 🟡 BLOCKED (wait on HAL) | 2026-03-20 |
| **Phase 1 Gate** | Both | 🟡 ON TRACK | 2026-03-30 |

---

**Last Updated:** 2026-03-17 16:20 ADT  
**Updated By:** Alfred (evening routine)  
**Status:** Waiting on HAL API; Alfred ready to code Phase 1.3 tomorrow
