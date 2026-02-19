# COMMAND-CENTER.md — Full Architecture Reference

## Overview

The Command Center is Joe's primary dashboard for monitoring and interacting with Alfred (OpenClaw). It runs at **http://localhost:3001** (or **https://dashboard.my-alfred-ai.com** via Cloudflare Tunnel).

- **Stack:** Node.js/Express backend + React 18 frontend + TypeScript throughout
- **Repo:** `joehohoho/command-center` (GitHub)
- **LaunchAgent:** `com.alfred.dashboard-nextjs`
- **Data Source:** Reads OpenClaw files from `~/.openclaw/` — no separate database needed

---

## Pages (11)

| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Main view: sessions, cron jobs, costs, alerts, budget, PixelAlfred animation |
| `/goals` | Goals | Goal/task management with priority, status tracking, bulk task creation |
| `/ideas` | Ideas | Idea pipeline: passive income, efficiency, infrastructure, growth categories |
| `/chat` | Chat | Real-time chat with Alfred via gateway WebSocket, SSE streaming, voice I/O |
| `/terminal` | Terminal | Interactive Claude Code session via xterm.js + WebSocket PTY |
| `/notifications` | Notifications | Question/answer queue — Alfred posts questions here, Joe answers |
| `/health` | System Health | Real-time monitoring: all 7 LaunchAgents, cron jobs, logs, CPU/memory/disk |
| `/apps` | Apps | App launcher with health checks (Job Tracker, etc.) |
| `/reports` | Reports | Browse daily memory logs from `~/.openclaw/workspace/memory/` |
| `/optimization` | Optimization | Local model performance, cron metrics, cache hit rates |
| `/improvements` | Improvements | Enhancements roadmap, innovation ideas |
| `/infrastructure` | Infrastructure | Model tiers, cron schedules, agent architecture |
| `/learnings` | Learnings | Curated memory, decisions, query analysis |

---

## Backend API Endpoints

All routes are at `/api/...` on port 3001.

### Core
- `GET /api/health` — Gateway status (PID, uptime, memory), heartbeat, system stats (CPU, RAM, load)
- `GET /api/system-health` — Full system health: all LaunchAgents, cron jobs, log sizes, CPU/memory/disk, overall status
- `GET /api/dashboard` — Full dashboard data: sessions, crons, costs, alerts (refreshes every 120s)
- `GET /api/dashboard/stats` — Cost/budget stats (today, this week, all time, per-model)
- `GET /api/dashboard/activity` — Current activity state (researching/coding/chatting/idle/sleeping)
- `GET /api/dashboard/logs` — Recent gateway log entries
- `POST /api/dashboard/stats/budget` — Update budget (`setBalance` or `addCredits`)

### Chat
- `GET /api/chat/status` — Gateway connection status
- `GET /api/chat/history` — Chat message history
- `POST /api/chat/send` — Send message to Alfred (SSE streaming response)
- `POST /api/chat/new-session` — Start new chat session

### Goals & Tasks
- `GET/POST /api/goals` — List/create goals
- `GET/PATCH/DELETE /api/goals/:id` — Get/update/delete goal
- `POST /api/goals/:id/complete` — Mark goal completed
- `GET/POST /api/goals/:id/tasks` — List/create tasks for goal
- `POST /api/goals/:id/tasks/bulk` — Bulk create tasks
- `PATCH/DELETE /api/goals/:id/tasks/:taskId` — Update/delete task
- `GET/POST /api/goals/:id/analysis` — Goal analysis from sub-agents
- `POST /api/goals/:id/notify-alfred` — Create notification + send via gateway

### Notifications
- `GET /api/notifications` — List all (filter with `?answered=true/false`)
- `GET /api/notifications/unanswered` — Unanswered only
- `POST /api/notifications` — Create notification (`{ type, title, message }`)
- `PATCH /api/notifications/:id` — Answer/update (triggers webhook + gateway message back)
- `DELETE /api/notifications/:id` — Delete

### Terminal
- `GET /api/terminal/status` — PTY session info (`{ active, pid }`)
- `POST /api/terminal/restart` — Kill + restart PTY
- `WebSocket /ws/terminal` — Live terminal I/O for Claude Code

### Other
- `GET /api/cron` — List cron jobs
- `GET /api/cron/:id/runs` — Job run history (JSONL)
- `GET /api/reports` — List memory report files
- `GET /api/reports/:filename` — Load report
- `GET /api/content/:page` — Markdown content for pages
- `GET /api/events/stream` — SSE stream for file change notifications
- `GET /api/apps` — Configured apps with health status
- `GET /api/metrics/local-model` — Ollama performance metrics
- `GET /api/metrics/cron-performance` — Cron success/duration stats

---

## Data Sources (what the backend reads from `~/.openclaw/`)

| File/Directory | What It Contains | Updated By |
|----------------|------------------|------------|
| `openclaw.json` | Gateway config (port, auth token, channels) | OpenClaw |
| `dashboard/data.json` | Live dashboard data (sessions, costs, models) | `refresh.sh` every 120s |
| `dashboard/chat-log.json` | Persisted chat messages | Command Center backend |
| `workspace/dashboard/stats.json` | Cost/budget statistics | `sync-usage.js` + budget updates |
| `workspace/memory/heartbeat-state.json` | Agent heartbeat (context%, model, status) | Heartbeat cron |
| `workspace/memory/*.md` | Daily memory logs, reports | Alfred's routines |
| `workspace/goals/goals.json` | Goals | Command Center |
| `workspace/goals/tasks.json` | Tasks | Command Center |
| `workspace/goals/analyses.json` | Goal analyses | Sub-agents |
| `workspace/goals/notifications.json` | Notifications/questions | Alfred + Command Center |
| `workspace/webhooks/*.json` | Answered notification events | Command Center |
| `logs/gateway.log` | Gateway activity log | OpenClaw gateway |
| `logs/cache-trace.jsonl` | Local model cache performance | Gateway |
| `cron/jobs.json` | Cron job definitions | OpenClaw cron system |
| `cron/runs/*.jsonl` | Per-job run history (JSONL) | OpenClaw cron system |

---

## Gateway Integration

The Command Center connects to the OpenClaw gateway via **WebSocket** at `ws://127.0.0.1:{port}` (port from `openclaw.json`, typically 18789).

**Authentication flow:**
1. Gateway sends `connect.challenge` event
2. Command Center responds with `connect` request (token from `openclaw.json`)
3. Client registered as `openclaw-control-ui` with operator role

**Key methods:**
- `chat.send` — Send a message to a session (e.g., `agent:main:main`)
- `chat.history` — Fetch message history for a session
- `node.list` — List active agent sessions

**Used by:**
- Chat page — sends messages, streams responses
- Notification answers — `sendChatMessage()` forwards Joe's answers back to Alfred
- Goal notifications — `notify-alfred` endpoint sends via gateway

---

## Budget System

The budget tracks **Anthropic (Claude) usage only** — Codex and Ollama are free.

**Model:** Snapshot-based wallet
- `remaining` — Set by Joe (e.g., "$24.83 left on my account")
- `costAtSnapshot` — Anthropic-only cost at time of last set/add
- Live remaining = `remaining - (currentLiveCost - costAtSnapshot)`
- `totalCredits` and `spent` tracked for historical reference

**Endpoints:**
- `POST /api/dashboard/stats/budget` with `{ setBalance: number }` — "I have $X left"
- `POST /api/dashboard/stats/budget` with `{ addCredits: number }` — "I bought $X more"

**Dashboard display:** CostCards component shows Today, This Week, All Time, Budget Left. Budget card is clickable to open the edit modal.

---

## Notification System (Alfred ↔ Joe)

**Outbound (Alfred → Joe):**
```bash
bash ~/.openclaw/workspace/scripts/send-notification.sh "question" "Title" "Full message"
```
Posts to `POST /api/notifications` → appears on Notifications page.

**Inbound (Joe → Alfred):**
Joe answers on Notifications page → PATCH triggers:
1. `sendChatMessage()` sends answer to Alfred via gateway WebSocket (primary)
2. Webhook file written to `~/.openclaw/workspace/webhooks/` (backup, polled every 15 min)

See **NOTIFICATION-ROUTING.md** for Alfred's routing instructions.

---

## Terminal (Claude Code in Browser)

- **Page:** `/terminal`
- **Backend:** `node-pty` spawns `claude` CLI in a pseudo-terminal
- **Frontend:** xterm.js with fit/weblinks addons, WebSocket at `/ws/terminal`
- **Session:** Singleton — persists across page navigations, reconnects replay 100KB scrollback
- **Auth:** Uses Joe's Claude Code subscription login (no API cost)

---

## Real-Time Updates

**SSE (Server-Sent Events)** at `/api/events/stream`:
- Watches key files for changes (data.json, stats.json, heartbeat, gateway.log, jobs.json)
- Frontend hooks (useDashboard, useStats, useActivity) poll on intervals (5–30s)
- useSSE hook triggers refetch on file change events

**Chat streaming:** POST `/api/chat/send` returns SSE stream with chunks from gateway response.

---

## Build & Deploy

```bash
# Development
npm run dev                    # Both backend (3001) + frontend (3000)

# Production build
npm run build:prod             # Builds frontend → backend

# Restart service
launchctl kickstart -k gui/$(id -u)/com.alfred.dashboard-nextjs
```

**Files:**
- Frontend build output: `frontend/build/` (served as static by Express)
- Backend compiled: `backend/dist/` (TypeScript → JavaScript)

---

## Key Directories

```
/Users/hopenclaw/command-center/
├── backend/src/
│   ├── index.ts              # Express server + http.createServer + WebSocket
│   ├── gateway.ts            # OpenClaw WebSocket client
│   ├── terminal.ts           # PTY manager + WebSocket server
│   ├── types.ts              # All TypeScript interfaces
│   ├── middleware/auth.ts     # Cloudflare Access JWT (production)
│   ├── routes/               # 12 route files
│   └── readers/              # 10+ data reader modules
├── frontend/src/
│   ├── App.tsx               # React Router (11 routes)
│   ├── api.ts                # HTTP client (get/post helpers)
│   ├── types.ts              # Frontend types
│   ├── pages/                # 11 page components
│   ├── components/           # 9 UI components
│   └── hooks/                # 7 custom hooks
└── package.json              # Workspace root
```

---

*Last updated: 2026-02-19*
