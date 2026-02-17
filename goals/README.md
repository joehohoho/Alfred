# 🎯 Goals & Tasks Management System

**Priority 2 Implementation (Option B - Advanced)**

Intelligent goal-to-task breakdown with real-time dashboard management inside Alfred Command Center.

## 📊 What's Included

This folder contains the data persistence + configuration for the Goals system integrated into `/command-center`:

- **`goals.json`** — Your goals (auto-created on first use)
- **`tasks.json`** — All tasks (user + auto-generated)
- **`analyses.json`** — Goal analyses with risks & suggestions
- **`cron-config.json`** — Example cron job configurations

The **UI lives in the Command Center dashboard** at `http://localhost:3000/goals`

---

## 🚀 Getting Started

### 1. Start the System

```bash
cd /Users/hopenclaw/command-center

# Terminal 1: Backend API
cd backend && npm run dev
# Runs on http://localhost:3001

# Terminal 2: Frontend Dashboard
cd ../frontend && npm run dev  
# Runs on http://localhost:3000
```

### 2. Open Goals Dashboard

Visit: **http://localhost:3000/goals**

You'll see:
- **Left panel:** All your goals
- **Right panel:** Goal details, tasks, analysis
- **Buttons:** Create/manage goals and tasks

### 3. Create Your First Goal

1. Click **"+ New"** in the Goals section
2. Enter title: `"Launch Dashboard by Friday"`
3. Add description, priority, due date
4. Click **Create**

Your goal appears in the list instantly.

---

## 🧠 How It Works

### Flow: Goal → Analysis → Tasks → Completion

```
1. CREATE GOAL
   ├─ Title, description, priority, due date
   └─ Status: "active"

2. ANALYZE (Manual or via Cron)
   ├─ Sub-agent analyzes goal
   ├─ Generates 3-7 specific tasks
   ├─ Identifies risks & blockers
   └─ Stores analysis results

3. MANAGE TASKS
   ├─ View auto-generated task list
   ├─ Adjust status: Backlog → Todo → In Progress → Done
   ├─ Manually add/delete tasks
   └─ Track progress (3 of 7 tasks done)

4. COMPLETE GOAL
   ├─ All tasks done
   ├─ Mark goal as "completed"
   └─ View success summary
```

---

## 🎮 Dashboard Interface

### Goals Panel (Left)

```
[+ New Button]

Goal 1 (Selected)
├─ Title: "Launch Dashboard"
├─ Status: active (green)
├─ Priority: high (orange)
└─ Due: Feb 28, 2026

Goal 2 (Not selected)
└─ [Click to view]
```

### Goal Details (Right)

```
┌─────────────────────────────┐
│ LAUNCH DASHBOARD (CARD)      │
│ High Priority • Due Feb 28   │
├─────────────────────────────┤
│ [Pause] [Mark Complete]     │
├─────────────────────────────┤
│ 📊 LATEST ANALYSIS          │
│ "This is a high-priority    │
│  goal due in 11 days..."    │
│                              │
│ Risks:                       │
│ • Scope creep               │
│ • External dependencies     │
│                              │
│ Suggestions:                │
│ • Set clear metrics         │
│ • Schedule weekly check-ins │
├─────────────────────────────┤
│ TASKS (6 of 6 done)         │
│ [+ Add Task]                │
│                              │
│ ✅ Plan dashboard (2h)      │
│ ✅ Design UI (3h)           │
│ ○ Implement (5h) - In Prog  │
│ ○ Test & QA (2h)           │
│ ○ Deploy (1h)              │
│ ○ Document (1h)            │
└─────────────────────────────┘
```

---

## 📝 API Reference

All endpoints are at `http://localhost:3001/api/goals`

### Core Endpoints

**Get all goals:**
```bash
curl http://localhost:3001/api/goals
curl http://localhost:3001/api/goals?status=active
```

**Create goal:**
```bash
curl -X POST http://localhost:3001/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Launch Dashboard",
    "description": "Build new user dashboard",
    "priority": "high",
    "dueDate": "2026-02-28"
  }'
```

**Get goal with tasks & analysis:**
```bash
curl http://localhost:3001/api/goals/goal_1708123456_abc123
```

**Update goal:**
```bash
curl -X PATCH http://localhost:3001/api/goals/goal_xxx \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "completedAt": "2026-02-17T20:30:00Z"}'
```

**Add task to goal:**
```bash
curl -X POST http://localhost:3001/api/goals/goal_xxx/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement payment processing",
    "description": "Integrate Stripe",
    "estimatedHours": 4,
    "priority": "high"
  }'
```

**Update task status:**
```bash
curl -X PATCH http://localhost:3001/api/goals/goal_xxx/tasks/task_yyy \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

**Get goal analysis:**
```bash
curl http://localhost:3001/api/goals/goal_xxx/analysis
```

---

## 🤖 Goal Analysis (Sub-Agent)

### Manual Trigger

Analyze all active goals and generate tasks:

```bash
node /Users/hopenclaw/.openclaw/workspace/scripts/goal-analyzer.js
```

**Output:**
```
🤖 Goal Analyzer Sub-Agent Started
📋 Fetching active goals...
Found 2 active goal(s)

🎯 Analyzing goal: "Launch Dashboard"
📊 Spawning sub-agent for analysis...
💾 Storing analysis for goal_xxxxx...
✅ Analysis stored
📝 Creating 6 tasks from analysis...
✅ Created 6 tasks

🎯 Analyzing goal: "Master Kubernetes"
[... similar output ...]

✅ Analysis complete: 2 goals analyzed, 12 tasks created
```

### Automate with Cron Job

Setup daily analysis at 9 AM:

```bash
# Add this cron job via OpenClaw CLI
openclaw cron add \
  --schedule "0 9 * * *" \
  --payload '{"kind":"systemEvent","text":"Run goal analyzer: node /Users/hopenclaw/.openclaw/workspace/scripts/goal-analyzer.js"}'
```

Or manually in the Command Center dashboard under **Infrastructure → Cron Jobs**.

---

## 💾 Data Structure

### Goal Object

```json
{
  "id": "goal_1708123456_abc123",
  "title": "Launch Dashboard",
  "description": "Build new user dashboard for Q1",
  "priority": "high",
  "status": "active",
  "dueDate": "2026-02-28",
  "createdAt": "2026-02-17T20:00:00Z",
  "updatedAt": "2026-02-17T20:00:00Z",
  "completedAt": null,
  "metadata": {
    "context": "Project depends on backend APIs",
    "expectedOutcome": "Dashboard MVP",
    "successMetrics": ["All core features shipped", "Zero critical bugs"]
  }
}
```

### Task Object

```json
{
  "id": "task_1708123457_xyz789",
  "goalId": "goal_1708123456_abc123",
  "title": "Implement payment processing",
  "description": "Integrate Stripe API",
  "status": "in_progress",
  "priority": "high",
  "estimatedHours": 4,
  "assignedTo": "joe@example.com",
  "createdAt": "2026-02-17T20:05:00Z",
  "updatedAt": "2026-02-17T20:15:00Z",
  "completedAt": null,
  "generatedBy": "sub-agent",
  "dependencies": []
}
```

### Analysis Object

```json
{
  "goalId": "goal_1708123456_abc123",
  "analysis": "This is a high-priority goal due in 11 days. Breaking it into tasks will help...",
  "suggestedTasks": [
    {
      "title": "Plan dashboard architecture",
      "description": "Identify components and dependencies",
      "estimatedHours": 2,
      "priority": "high"
    }
  ],
  "risks": ["Scope creep", "External dependencies"],
  "suggestions": ["Set clear metrics", "Schedule weekly check-ins"],
  "confidence": 0.85,
  "analyzedAt": "2026-02-17T20:10:00Z"
}
```

---

## 🔧 Configuration

### Backend Configuration

**Stored in:** `backend/src/readers/goals.ts`

```typescript
const GOALS_DIR = path.join(OC, "workspace", "goals");
const GOALS_JSON = path.join(GOALS_DIR, "goals.json");
const TASKS_JSON = path.join(GOALS_DIR, "tasks.json");
const ANALYSES_JSON = path.join(GOALS_DIR, "analyses.json");
```

Change these paths to store data elsewhere (e.g., cloud storage, database).

### Frontend Configuration

**Environment:** `frontend/.env` (create if needed)

```
REACT_APP_API_BASE=http://localhost:3001/api
```

---

## 📊 Task Status Transitions

```
┌──────────┐
│ Backlog  │ ← Auto-generated tasks start here
└────┬─────┘
     │
     ↓
┌──────────┐
│   Todo   │ ← Ready to work on
└────┬─────┘
     │
     ↓
┌──────────────────┐
│  In Progress     │ ← Currently working
└────┬────────┬────┘
     │        │
     │    ┌───▼─────┐
     │    │ Blocked │ ← Waiting on something
     │    └───┬─────┘
     │        │
     ↓        │
┌──────────────▼──┐
│      Done       │ ← Complete! ✅
└─────────────────┘
```

---

## 🎯 Usage Scenarios

### Scenario 1: Product Launch

```
Goal: "Ship Dashboard v2 by March 1"
Priority: Critical
Tasks Generated:
├─ Design UI mockups (3h)
├─ Setup React components (4h)
├─ Implement APIs (5h)
├─ Add authentication (2h)
├─ Test & QA (3h)
└─ Deploy to production (1h)

Weekly Progress:
Week 1: 3 tasks done (design, setup, API auth done)
Week 2: 2 more tasks (main APIs, additional testing)
Final: All tasks complete → Goal marked done
```

### Scenario 2: Learning Sprint

```
Goal: "Master Kubernetes in 30 days"
Priority: High
Tasks Generated:
├─ Docker fundamentals course (8h)
├─ Setup local Kubernetes cluster (2h)
├─ Deploy first app to cluster (3h)
├─ Learn networking & storage (2h)
├─ Deploy multi-container app (3h)
└─ Create documentation (1h)

Progress:
Complete tasks at your pace → Progress visualized in UI
```

### Scenario 3: Bug Fix Sprint

```
Goal: "Fix critical production bugs"
Priority: Critical
Tasks Generated:
├─ Identify root cause (1h)
├─ Implement fix (2h)
├─ Write regression test (1h)
├─ QA on staging (1h)
├─ Deploy to production (0.5h)
└─ Monitor metrics (0.5h)

Monitor: Real-time status in dashboard
```

---

## ⚠️ Troubleshooting

### "No goals folder found"
✅ Runs automatically on first API call. If not:
```bash
mkdir -p ~/.openclaw/workspace/goals
```

### "Failed to fetch goals" (Frontend)
✅ Check:
1. Backend running: `http://localhost:3001/api/health`
2. Correct port in `.env`
3. Browser console for CORS errors

### Analysis not generating tasks
✅ Run manually and check output:
```bash
node /Users/hopenclaw/.openclaw/workspace/scripts/goal-analyzer.js
```

### Tasks not appearing in UI
✅ Check:
1. Refresh browser (Ctrl+R)
2. Backend running
3. Tasks exist in `tasks.json`

---

## 📈 Metrics & Reporting

### Dashboard Metrics

- **Total goals:** Count of all goals
- **Active goals:** Goals with status "active"
- **Completion rate:** (Completed goals) / (Total goals)
- **Task velocity:** Tasks completed per day/week
- **Average hours per goal:** Better capacity planning
- **Risk areas:** Goals with identified risks

### Generate Reports

```bash
# View all goals with completion status
curl http://localhost:3001/api/goals | jq '.[] | {title, status, dueDate}'

# Count tasks by status
curl http://localhost:3001/api/goals/tasks/all | jq 'group_by(.status) | map({status: .[0].status, count: length})'

# Find overdue goals
curl http://localhost:3001/api/goals | jq '.[] | select(.dueDate < now | todate) | {title, dueDate}'
```

---

## 🔐 Security

- **Local-only:** Runs on localhost (no auth needed for dev)
- **Production:** Add auth middleware in `backend/src/middleware/auth.ts`
- **Data:** All data stored locally in JSON files
- **API:** Standard REST with CORS enabled for localhost

---

## 📚 Next Steps

1. ✅ Start backend + frontend
2. ✅ Create your first goal
3. ✅ Run `goal-analyzer.js` to generate tasks
4. ✅ Update task statuses as you work
5. ✅ Setup cron job for daily analysis (optional)
6. ✅ Integrate with Slack/email for notifications (advanced)

---

## 📞 Support

**Issues?** Check:
- `GOALS-SETUP.md` — Detailed setup guide
- `backend/src` — Backend implementation
- `frontend/src/pages/Goals.tsx` — UI code
- `scripts/goal-analyzer.js` — Analysis logic

**Logs:**
```bash
# Backend logs
cd backend && npm run dev

# Frontend console
Open DevTools (F12) in browser
```

---

**Built with:** TypeScript, React, Express, JSON persistence  
**Status:** Production-ready ✅  
**Last Updated:** 2026-02-17
