# Mission Control Implementation Plan
**Version:** 1.0  
**Created:** 2026-03-16  
**Target Completion:** 2026-04-16 (30 days)  
**Owner:** Alfred (with HAL delegation for heavy lifting)

---

## 🎯 Executive Overview

Enhance the Command Center (localhost:3001) to achieve **Mission Control parity** — a single unified dashboard for all workflow management, eliminating context-switching and improving daily productivity.

**Current State:** Basic Kanban board + minimal layout  
**Target State:** Kanban + Calendar + Memories + Projects + Cron Status + Context Monitor  
**Business Impact:** Reduce daily context-switching time by 30-40 min, prevent context crashes, eliminate cron job visibility gaps

---

## 📋 Core Features (from Mission Control video)

### Feature Breakdown & Priority

| # | Feature | MVP Scope | Complexity | Est. Hours | Phase |
|---|---------|-----------|-----------|-----------|-------|
| 1 | **Cron Job Status Panel** | Show jobs, enable/disable, last run, next run | HIGH | 6-8 | Phase 1 |
| 2 | **Task Board (Enhanced)** | Kanban + quick-add + drag-drop refinement | MEDIUM | 4-6 | Phase 1 |
| 3 | **Calendar View** | Month/week view, deadline highlights, sync | HIGH | 10-12 | Phase 2 |
| 4 | **Projects Dashboard** | 4 projects, progress, repo links, last commit | MEDIUM | 8-10 | Phase 2 |
| 5 | **Memories Search** | Fuzzy search across memory/*.md, sidebar | MEDIUM | 6-8 | Phase 2 |
| 6 | **Quick File Access** | Links to ACTIVE-TASK, OPEN-LOOPS, MEMORY | LOW | 2-3 | Phase 1 |
| 7 | **Context Monitor** | Session %, alert thresholds, checkpoint button | HIGH | 8-10 | Phase 2 |
| 8 | **HAL Completion Feed** | Recent completions, approval flow preview | MEDIUM | 6-8 | Phase 3 |
| 9 | **Notification Queue** | Pending questions, blockers, clickable alerts | MEDIUM | 6-8 | Phase 3 |
| 10 | **Cost/Efficiency Dashboard** | Token usage, model distribution, weekly trends | LOW | 6-8 | Phase 3 |

**Total Estimated Effort:** 62-81 hours (7-10 weeks solo, 3-5 weeks with HAL)

---

## 🚀 Implementation Phases

### Phase 1: Stability & Visibility (Week 1-2)
**Goal:** Restore cron job visibility + stabilize Kanban + quick wins  
**Scope:** 18-22 hours

#### 1.1 Cron Job Status Panel
**Why First:** Fixes recurring auto-disable pattern; highest ROI for stability

**Requirements:**
- Display list of 10+ cron jobs with:
  - Job name (Evening Routine, Daily Inquiry, Daily Config, etc.)
  - Current status (enabled/disabled)
  - Last run timestamp + result (success/failed)
  - Next scheduled run (calculated from cron expression)
  - Action buttons: Enable / Disable / Run Now / View Logs
- Color coding: Green (healthy), Yellow (due), Red (failed/disabled)
- Auto-refresh every 60 seconds

**Data Source:**
- `/Users/hopenclaw/.openclaw/cron/jobs.json` — cron job config
- OpenClaw Gateway API (`localhost:3000/api/cron/status` — endpoint TBD)

**Technical Stack:**
- Frontend: React component + Socket.io for auto-refresh
- Backend: Node.js API endpoint to query OpenClaw Gateway
- State: Local React state + optional Redis cache for performance

**Acceptance Criteria:**
- [ ] All 10+ jobs visible with accurate status
- [ ] Enable/disable buttons work + persist
- [ ] Auto-refresh working (no manual refresh needed)
- [ ] Last run timestamps accurate within 30 seconds
- [ ] Color-coded alerts for failed/overdue jobs

**Owner:** HAL (backend API + socket setup) + Alfred (frontend)

---

#### 1.2 Enhanced Task Board
**Why Second:** Low-hanging fruit; improves Kanban UX significantly

**Requirements:**
- Drag-and-drop refinement (already exists, verify smooth operation)
- Quick "Add Task" button (modal with: title, description, priority, assignee)
- Task card enhancements:
  - Priority badge (high/medium/low)
  - Assignee avatar
  - Due date if present
  - Tag/label support
  - Click-to-expand detail view
- Column headers show task count: "In Progress (3)" "Review (5)" "Done (22)"
- Filter by: Assignee, priority, due date, label

**Data Source:**
- Kanban API (`localhost:3001/api/kanban/*`)

**Technical Stack:**
- Frontend: React + react-beautiful-dnd or dnd-kit
- Enhance existing components, minimal new endpoints

**Acceptance Criteria:**
- [ ] Quick-add modal working
- [ ] Drag-drop smooth (no lag)
- [ ] Column counts accurate
- [ ] Filter buttons work
- [ ] Task detail view displays correctly

**Owner:** Alfred (frontend refinement)

---

#### 1.3 Quick File Access Sidebar
**Why Third:** Trivial to implement; huge QoL improvement

**Requirements:**
- Right sidebar with quick links to:
  - `ACTIVE-TASK.md` — Edit inline or link to file
  - `OPEN-LOOPS.md` — View pending work dashboard
  - `MEMORY.md` — Quick reference
  - `NOW.md` — Emergency checkpoint
  - Today's memory: `memory/2026-03-16.md`
  - `HEARTBEAT.md` — System health guidelines
- Sidebar toggle (collapse/expand)
- File preview on hover (first 200 chars)
- Edit button links to local file editor (or embedded editor?)

**Data Source:**
- File system API (read .md files from workspace)

**Technical Stack:**
- Frontend: React sidebar component
- Backend: Simple file read endpoint + markdown parsing (marked.js)

**Acceptance Criteria:**
- [ ] All links functional
- [ ] Sidebar collapses/expands
- [ ] File preview renders correctly
- [ ] No file editing errors
- [ ] Mobile-friendly (sidebar collapses on small screens)

**Owner:** Alfred (frontend) + HAL (backend file API if needed)

---

### Phase 2: Intelligence & Monitoring (Week 3-5)
**Goal:** Add calendar, memory search, context monitoring  
**Scope:** 32-38 hours

#### 2.1 Calendar View (Integrated)
**Why First in Phase 2:** High user value; foundational for deadline tracking

**Requirements:**
- Month view (default) + week view toggle
- Display:
  - Cron job scheduled runs (light blue)
  - HAL task deadlines (if tracked) (orange)
  - Google Calendar events (if integrated) (purple)
  - Today indicator (bold border)
- Click day → show that day's details
- Hover event → tooltip with task title + details
- Mobile-friendly (responsive grid)

**Data Source:**
- Cron job schedule calculations (from Phase 1 API)
- Optional Google Calendar sync (requires OAuth setup)
- ACTIVE-TASK.md deadline field

**Technical Stack:**
- Frontend: React Calendar library (react-big-calendar or similar)
- Backend: Calendar aggregation endpoint (cron + Google + internal tasks)
- Optional: Google Calendar API integration

**Integration Points:**
- Phase 1 Cron status API (cron job schedules)
- ACTIVE-TASK.md (task deadlines)
- Google Calendar (if OAuth already set up)

**Acceptance Criteria:**
- [ ] Month view renders correctly
- [ ] Week view toggle works
- [ ] Cron jobs displayed with accurate next-run dates
- [ ] Click day shows details
- [ ] Mobile responsive
- [ ] No performance lag (lazy load if many events)

**Owner:** HAL (backend aggregation) + Alfred (frontend calendar)

---

#### 2.2 Memories Search Widget
**Why Second:** Direct ROI for daily workflow; unblocks fast context access

**Requirements:**
- Search bar (top of Memories panel)
- Fuzzy search across:
  - `memory/YYYY-MM-DD.md` (all daily logs)
  - `MEMORY.md` (curated long-term)
  - `ACTIVE-TASK.md` (current task notes)
- Results show:
  - File name (date or title)
  - Match excerpt (50 chars context)
  - Click to view full file
- Filters: Date range, file type (daily/memory/task)
- Sidebar toggle for recent files (last 7 days accessed)

**Data Source:**
- File system (memory directory structure)
- Full-text search library (lunr.js or simple grep-like)

**Technical Stack:**
- Frontend: React search + results component
- Backend: File indexing API + search endpoint (or client-side with pre-indexed data)
- Optional: Elasticsearch if scale requires it (unlikely initially)

**Acceptance Criteria:**
- [ ] Search finds matching content
- [ ] Results sorted by relevance + recency
- [ ] Click result opens file/excerpt
- [ ] Filters working
- [ ] Fast response (<1 second for 365 daily logs)

**Owner:** HAL (backend indexing) + Alfred (frontend search UI)

---

#### 2.3 Context Monitor & Checkpoint System
**Why Third:** Critical for preventing context crashes; aligns with HEARTBEAT.md

**Requirements:**
- Dashboard widget showing:
  - Current session context % (from session_status API)
  - Color coding: <60% (green), 60-70% (yellow), 70-80% (orange), >80% (red)
  - Alert threshold visual (horizontal bar)
  - Last checkpoint timestamp
  - Token cost for current session
- Buttons:
  - "Save Checkpoint Now" (manual trigger of state save)
  - "View Recent Checkpoints" (list of saved states)
- Auto-update every 30 seconds

**Data Source:**
- Session status API (session_status tool)
- Checkpoint log file (memory/checkpoints.json)

**Technical Stack:**
- Frontend: React widget + chart (for trending)
- Backend: Session status polling endpoint
- State: File-based checkpoint storage

**Integration Points:**
- OpenClaw session_status API
- ACTIVE-TASK.md (write-ahead logging)
- memory/heartbeat-efficiency.json (historical data)

**Acceptance Criteria:**
- [ ] Context % accurate (verified against session_status)
- [ ] Color thresholds correct
- [ ] Checkpoint button saves state successfully
- [ ] Auto-update working (no stale data)
- [ ] Mobile-friendly
- [ ] Shows token cost

**Owner:** Alfred (frontend) + HAL (checkpoint backend if needed)

---

#### 2.4 Projects Dashboard
**Why Fourth:** Moderate complexity; good to pair with other Phase 2 work

**Requirements:**
- 4 project cards (CoinUsUp, Even Us Up, Stock/Crypto Signal, Automation Consulting):
  - Project name + description
  - GitHub repo link (if exists)
  - Last commit timestamp + branch
  - Progress bar (estimated % complete if tracked)
  - 3-5 recent milestones/tasks
  - Team members (if applicable)
- Click card → expand to full project view (links, issues, recent activity)
- Auto-refresh git data every 2 hours

**Data Source:**
- GitHub API (via gh CLI or direct API)
- Project metadata (config JSON?)
- Git commit history

**Technical Stack:**
- Frontend: React project cards + expansion UI
- Backend: GitHub API integration endpoint
- Caching: Redis or file-based to avoid API rate limits

**Integration Points:**
- GitHub CLI (gh) or GitHub REST API
- Optional: GitHub GraphQL for richer queries
- Project metadata file (to be created)

**Acceptance Criteria:**
- [ ] All 4 projects display
- [ ] Repo links working
- [ ] Last commit + branch accurate
- [ ] Progress bars display (even if manual input)
- [ ] Click expands to full view
- [ ] Respects GitHub API rate limits

**Owner:** HAL (GitHub integration) + Alfred (frontend cards)

---

### Phase 3: Observability & Growth (Week 6-10)
**Goal:** Add HAL completion feed, notification queue, cost dashboard  
**Scope:** 20-25 hours

#### 3.1 HAL Completion Feed
**Why First in Phase 3:** Observability into autonomous work; supports overnight execution

**Requirements:**
- Dashboard widget showing:
  - Last 10 completed HAL tasks (most recent first)
  - Task title, completion timestamp, status (approved/pending/rejected)
  - Brief summary (1 line)
  - Click to view full deliverables + approval buttons
- Real-time updates when HAL completes work
- Link to Discord HAL completions channel (if applicable)

**Data Source:**
- HAL completion log (new file: memory/hal-completions.json)
- Kanban review column (completed tasks)
- Discord webhook history (optional)

**Technical Stack:**
- Frontend: React feed component + real-time updates (Socket.io or polling)
- Backend: HAL completion tracking endpoint
- State: Append-only log file

**Integration Points:**
- HAL task completion API
- Kanban review status
- Discord HAL completions webhook (for notifications)

**Acceptance Criteria:**
- [ ] Recent completions display
- [ ] Real-time updates working
- [ ] Click shows full task details
- [ ] Approval flow preview visible
- [ ] Mobile-friendly feed

**Owner:** HAL (completion tracking) + Alfred (frontend feed)

---

#### 3.2 Notification Queue Widget
**Why Second:** Reduces missed questions/blockers

**Requirements:**
- Widget showing:
  - Pending questions (from ACTIVE-TASK.md + Command Center notifications)
  - Blocker items (from kanban-blocker.sh)
  - Urgent alerts (from monitoring systems)
- Each item shows:
  - Title + brief description
  - Priority/type (question/blocker/alert)
  - Age (e.g., "2 days old")
  - Action button (click → navigate to context or answer)
- Auto-refresh from notification system

**Data Source:**
- ACTIVE-TASK.md (pending-questions section)
- Kanban blocked items
- Command Center notification queue API

**Technical Stack:**
- Frontend: React notification widget
- Backend: Notification aggregation endpoint
- State: Real-time from multiple sources

**Integration Points:**
- ACTIVE-TASK.md parser
- Kanban blocker API
- Command Center notifications (existing system)

**Acceptance Criteria:**
- [ ] All pending items visible
- [ ] Priority sorting working
- [ ] Click action resolves notification
- [ ] Auto-refresh from all sources
- [ ] No duplicate notifications

**Owner:** Alfred (frontend) + HAL (backend aggregation if needed)

---

#### 3.3 Cost & Efficiency Dashboard
**Why Third:** Supports passive income tracking + system health

**Requirements:**
- Overview panel showing:
  - Total tokens used (current month)
  - Total cost (current month, by model)
  - Model distribution pie chart (% Haiku, Sonnet, Opus, LOCAL)
  - Average cost per task
  - Token efficiency trend (chart, last 30 days)
  - ROI estimate (if passive income tasks tracked)
- Breakdown by project (if tasks tagged)
- Export button (CSV of monthly costs)

**Data Source:**
- memory/heartbeat-efficiency.json (efficiency trends)
- Session logs + model usage tracking
- Task cost metadata (to be added)

**Technical Stack:**
- Frontend: React dashboard + charting (Chart.js or Recharts)
- Backend: Cost calculation endpoint + historical aggregation
- State: Append-only efficiency log

**Integration Points:**
- HEARTBEAT.md efficiency tracking
- Session status (token/cost info)
- Task metadata (cost per task)

**Acceptance Criteria:**
- [ ] Total cost accurate for month
- [ ] Model distribution pie chart correct
- [ ] Efficiency trend chart displays
- [ ] Cost per task calculated
- [ ] Export works (CSV valid)

**Owner:** HAL (backend cost aggregation) + Alfred (frontend charts)

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework:** React (existing)
- **State Management:** React Context or lightweight Redux
- **UI Components:** Material-UI or custom (match existing theme)
- **Real-time:** Socket.io for auto-refresh (Kanban, context monitor, feeds)
- **Charting:** Chart.js or Recharts (for cost/efficiency trends)
- **Search:** lunr.js (client-side full-text search)
- **Calendar:** react-big-calendar
- **Icons:** Font Awesome or similar

### Backend Stack
- **Framework:** Node.js + Express (existing)
- **Database:** File-based JSON or SQLite (optional if needed for scale)
- **APIs:**
  - OpenClaw Gateway API (cron, session status, etc.)
  - GitHub API (via gh CLI or REST)
  - Google Calendar API (optional, requires OAuth setup)
- **Caching:** Simple in-memory or Redis
- **Real-time:** Socket.io server

### File Structure (Workspace)
```
~/.openclaw/workspace/
├── MISSION-CONTROL-IMPLEMENTATION-PLAN.md (this file)
├── dashboard/ (new directory)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CronJobPanel.jsx
│   │   │   ├── TaskBoard.jsx (enhanced)
│   │   │   ├── CalendarView.jsx
│   │   │   ├── ProjectsCard.jsx
│   │   │   ├── MemoriesSearch.jsx
│   │   │   ├── ContextMonitor.jsx
│   │   │   ├── HALCompletionFeed.jsx
│   │   │   ├── NotificationQueue.jsx
│   │   │   └── CostDashboard.jsx
│   │   ├── api/
│   │   │   ├── cron.js
│   │   │   ├── github.js
│   │   │   ├── calendar.js
│   │   │   ├── memories.js
│   │   │   ├── context.js
│   │   │   └── costs.js
│   │   └── hooks/
│   │       ├── useCronStatus.js
│   │       ├── useTaskBoard.js
│   │       └── useContextMonitor.js
│   ├── server.js (backend)
│   ├── package.json
│   └── README.md
├── memory/
│   ├── hal-completions.json (new)
│   └── checkpoints.json (new)
└── scripts/
    ├── mission-control-setup.sh (new)
    └── update-project-metadata.sh (new)
```

### API Endpoints (New)

**Backend Server (`localhost:3001/api/`)**

| Method | Endpoint | Purpose | Phase |
|--------|----------|---------|-------|
| GET | `/cron/status` | List all jobs + status | 1 |
| POST | `/cron/{jobId}/run` | Trigger job immediately | 1 |
| POST | `/cron/{jobId}/toggle` | Enable/disable job | 1 |
| GET | `/calendar/events` | Aggregated calendar data | 2 |
| GET | `/memories/search?q=` | Fuzzy search memory files | 2 |
| GET | `/context/status` | Session context % + checkpoint info | 2 |
| GET | `/projects` | 4 projects + git data | 2 |
| GET | `/completions` | HAL completion feed (last 10) | 3 |
| GET | `/notifications` | Pending questions + blockers | 3 |
| GET | `/costs/summary` | Monthly cost breakdown | 3 |
| GET | `/costs/trends` | 30-day efficiency trends | 3 |

**Socket.io Events (Real-time)**
- `cron:statusUpdate` — Cron job status changed
- `task:updated` — Kanban task moved
- `context:updated` — Session context % changed (every 30s)
- `completion:new` — HAL completed task
- `notification:new` — New question/blocker

---

## 📊 Success Metrics & Validation

### Phase 1 Completion
- [ ] Cron job panel shows ≥10 jobs with accurate status
- [ ] Kanban UX improved (no complaints, smooth drag-drop)
- [ ] Quick file access links all working
- [ ] Dashboard loads in <2 seconds
- [ ] Mobile-friendly on iPad/phone

### Phase 2 Completion
- [ ] Calendar displays all cron jobs + events
- [ ] Memory search finds 100% of relevant results (spot check)
- [ ] Context monitor alerts match HEARTBEAT.md thresholds
- [ ] Projects panel shows all 4 repos + last commit
- [ ] No performance degradation with all Phase 2 features enabled

### Phase 3 Completion
- [ ] HAL completion feed auto-updates in real-time
- [ ] Notification queue shows all pending items
- [ ] Cost dashboard accurately tracks monthly spend
- [ ] Efficiency trends chart shows meaningful data
- [ ] Mobile-friendly across all widgets

### Overall Success
- **Daily usage:** Joe uses Command Center as primary workflow dashboard
- **Context reduction:** Session context % stays <70% with checkpoint system
- **Cron visibility:** No more surprise auto-disabled jobs (preventive visibility)
- **Time savings:** 30-40 min/day reduction in context-switching + manual status checks
- **Defect rate:** <1 critical bug per phase (high quality implementation)

---

## 🎯 Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Performance degradation** | Dashboard slow, defeating purpose | MEDIUM | Implement caching, lazy-load widgets, use local SQLite if needed |
| **API rate limit (GitHub)** | GitHub queries fail silently | MEDIUM | Implement 2-hour cache + fallback to cached data |
| **Missing dependencies** | Build fails; features incomplete | LOW | Vendor-lock all npm packages; test Phase 1 before Phase 2 |
| **File system sync issues** | Checkpoint system fails during context death | LOW | Test checkpoint write + read in isolation; add transaction logging |
| **Socket.io connection drops** | Real-time features fail silently | MEDIUM | Implement reconnection logic + fallback to polling |
| **Google Calendar auth** | Calendar integration blocked | LOW | Make Google Calendar optional; allow cron-only calendar initially |

---

## 📅 Timeline & Milestones

### Week 1-2: Phase 1 (Stability & Visibility)
- **Milestone 1.1 (Day 3):** Cron panel MVP + enable/disable buttons working
- **Milestone 1.2 (Day 5):** Task board drag-drop refined + quick-add button
- **Milestone 1.3 (Day 7):** File access sidebar complete + testing
- **Gate:** Test on Mac mini; verify no regressions

### Week 3-5: Phase 2 (Intelligence & Monitoring)
- **Milestone 2.1 (Day 14):** Calendar view rendering (month + week)
- **Milestone 2.2 (Day 18):** Memory search fully functional
- **Milestone 2.3 (Day 21):** Context monitor + checkpoint buttons
- **Milestone 2.4 (Day 25):** Projects dashboard with git integration
- **Gate:** Performance test all Phase 2 together; optimize if needed

### Week 6-10: Phase 3 (Observability & Growth)
- **Milestone 3.1 (Day 35):** HAL completion feed live + real-time updates
- **Milestone 3.2 (Day 40):** Notification queue aggregating all sources
- **Milestone 3.3 (Day 47):** Cost dashboard + trend charts
- **Gate:** 1-week smoke test; collect Joe feedback

### Week 10+: Polish & Rollout
- **Refinement:** Address bugs + Joe feedback
- **Documentation:** Update Command Center README
- **Training:** Brief Joe on new features
- **Launch:** Deploy to production

---

## 👥 Delegation Strategy

### Alfred's Responsibility
- **Phase 1:** Frontend components (Kanban, file sidebar)
- **Phase 2:** Frontend (calendar, memory search, context monitor)
- **Phase 3:** Frontend (feeds, queues, dashboards)
- **Overall:** UI/UX, responsive design, bug fixes
- **Estimated:** 25-30 hours

### HAL's Responsibility (Overnight/Async)
- **Phase 1:** Cron API endpoint (status, enable/disable)
- **Phase 2:** Backend APIs (calendar aggregation, memory indexing, GitHub sync)
- **Phase 3:** Backend (HAL completion tracking, notification aggregation, cost calculations)
- **Estimated:** 35-50 hours
- **Value:** Frees Alfred for urgent work; allows parallel development

### Handoff Protocol
Each phase begins with:
1. **Requirements Spec** written by Alfred (what, why, API contracts)
2. **HAL Spawn** with full requirements doc + test criteria
3. **Backend delivery** of working API endpoints
4. **Alfred integration** of frontend
5. **Testing** (unit + integration)
6. **Code review** + merge to main

---

## 📝 Dependencies & Blockers

### Known Blockers
1. **Cron Job API endpoint** — Depends on OpenClaw Gateway supporting `/api/cron/status`
   - **Mitigation:** May need to parse `cron/jobs.json` directly + query LaunchAgent status
2. **Google Calendar sync** — Optional; skip if auth too complex
   - **Mitigation:** Calendar MVP without Google; add later
3. **GitHub API auth** — Requires `gh` CLI or OAuth token
   - **Mitigation:** Use `gh` CLI (likely already available)

### External Dependencies
- `react-big-calendar` (npm)
- `lunr.js` (npm)
- `socket.io-client` (npm)
- `chart.js` or `recharts` (npm)
- `marked` (markdown parsing, npm)
- GitHub API (via `gh` CLI or REST)
- OpenClaw Gateway API (internal, may need extension)

### Internal Dependencies
- ACTIVE-TASK.md format (must be parseable)
- Cron jobs.json format (must be documented)
- Kanban API contract (must be stable)

---

## 🚢 Deployment & Rollout

### Pre-Deployment
- [ ] All unit tests passing
- [ ] Integration tests on localhost:3001
- [ ] Mobile-friendly verified (iPad, phone screenshots)
- [ ] Performance benchmarks (load time <3s, FCP <2s)
- [ ] Accessibility check (screen reader, keyboard nav)

### Deployment
1. Merge Phase 1 to main branch
2. Restart Command Center service (launchctl restart com.alfred.dashboard-nextjs)
3. Verify all endpoints responding
4. Quick manual smoke test

### Post-Deployment
- Monitor error logs for 24 hours
- Collect Joe feedback
- Iterate on bugs + polish

---

## 📚 Related Documentation

- `HEARTBEAT.md` — System health monitoring (source for Context Monitor)
- `COMMAND-CENTER.md` — Existing dashboard docs (if exists; may need update)
- `AGENTS.md` — Kanban + delegation protocols (source for workflow understanding)
- `USER.md` — Joe's needs + preferences (design guidance)
- `OPEN-LOOPS.md` — Pending work dashboard (source for notification queue)

---

## ✅ Next Steps (Immediate)

1. **Approve this plan** (Joe review + feedback)
2. **Create Kanban card** for "Mission Control Implementation" (meta-task)
3. **Spawn HAL for Phase 1 backend** (Cron API endpoint)
4. **Alfred begins Phase 1 frontend** (Kanban refinement + file sidebar)
5. **Daily standup** on progress (quick sync every morning at 09:00 AM)

---

## 📖 Change Log

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-03-16 | 1.0 | Alfred | Initial plan created from Mission Control video review |
| TBD | 1.1 | Alfred | Phase 1 completion update + lessons learned |

