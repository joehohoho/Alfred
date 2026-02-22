# COMMAND-CENTER.md — Full Architecture Reference

## Overview

The Command Center is Joe's primary dashboard for monitoring and interacting with Alfred (OpenClaw). It runs at **http://localhost:3001** (or **https://dashboard.my-alfred-ai.com** via Cloudflare Tunnel).

- **Stack:** Node.js/Express backend + React 18 frontend + TypeScript throughout
- **Repo:** `joehohoho/command-center` (GitHub)
- **LaunchAgent:** `com.alfred.dashboard-nextjs`
- **Data Source:** Reads OpenClaw files from `~/.openclaw/` — no separate database needed

---

## Pages (14)

| Path | Page | Purpose |
|------|------|---------|
| `/` | Dashboard | Main view: sessions, cron jobs, costs, alerts, budget, PixelAlfred animation |
| `/kanban` | Kanban Board | Unified task board: Ideas → Goals → To Do → In Progress → Blocked → Review → Done. Drag-and-drop, Alfred automation, blocker/unblock flow |
| `/chat` | Chat | Real-time chat with Alfred via gateway WebSocket, SSE streaming, voice I/O |
| `/terminal` | Terminal | Interactive Claude Code session via xterm.js + WebSocket PTY |
| `/notifications` | Notifications | Question/answer queue — Alfred posts questions here, Joe answers |
| `/health` | System Health | Real-time monitoring: all 8 LaunchAgents, cron jobs, logs, CPU/memory/disk |
| `/gmail` | Gmail | Email inbox, compose, pending draft review, audit log |
| `/calendar` | Calendar | Events (upcoming/past), pending approval for attendee invites, create events |
| `/apps` | Apps | App launcher with health checks (Job Tracker, etc.) |
| `/reports` | Reports | Browse daily memory logs from `~/.openclaw/workspace/memory/` |
| `/optimization` | Optimization | Local model performance, cron metrics, cache hit rates |
| `/improvements` | Improvements | Enhancements roadmap, innovation ideas |
| `/infrastructure` | Infrastructure | Model tiers, cron schedules, agent architecture |
| `/learnings` | Learnings | Curated memory, decisions, query analysis |

**Note:** `/goals` and `/ideas` redirect to `/kanban` (replaced by Kanban board).

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

### Kanban Board
- `GET /api/kanban` — Full board (all columns with cards + stats)
- `GET /api/kanban/:cardId` — Card detail (includes subtasks for goals)
- `POST /api/kanban` — Create card (`{ type: "idea"|"goal"|"task", title, description? }`)
- `PATCH /api/kanban/:cardId` — Update card fields
- `POST /api/kanban/:cardId/move` — Move to column (`{ toColumn, priority? }`) — notifies Alfred for todo/in_progress
- `DELETE /api/kanban/:cardId` — Delete card
- `POST /api/kanban/:cardId/blocker` — Add blocker message, move to blocked
- `POST /api/kanban/:cardId/unblock` — Clear blocker, send answer to Alfred via gateway

### Google Integration (OAuth + Gmail + Calendar)
- `GET /api/google/auth/status` — Connection status (connected, email, scopes)
- `GET /api/google/auth/url` — Get OAuth consent URL
- `GET /api/google/auth/callback` — OAuth2 callback (redirects to /gmail)
- `POST /api/google/auth/disconnect` — Revoke tokens
- `GET /api/google/gmail/messages` — List messages (query: `q`, `labelIds`, `maxResults`, `pageToken`)
- `GET /api/google/gmail/messages/:id` — Get message
- `GET /api/google/gmail/threads/:id` — Get thread (all messages)
- `POST /api/google/gmail/messages/:id/archive` — Archive message
- `POST /api/google/gmail/messages/:id/trash` — Trash message
- `POST /api/google/gmail/messages/:id/read` — Mark as read
- `GET /api/google/gmail/labels` — List labels
- `GET /api/google/gmail/drafts` — All drafts
- `GET /api/google/gmail/drafts/pending` — Pending review drafts only
- `POST /api/google/gmail/drafts` — Create draft (`{ to, subject, body, createdBy }`)
- `POST /api/google/gmail/drafts/:id/approve` — Approve & send draft (notifies Alfred `[GMAIL-DRAFT-SENT]`)
- `POST /api/google/gmail/drafts/:id/discard` — Discard draft (notifies Alfred `[GMAIL-DRAFT-DISCARDED]`)
- `POST /api/google/gmail/send` — Send email directly (no draft flow)
- `GET /api/google/calendar/events` — List events (query: `timeMin`, `timeMax`, `maxResults`)
- `POST /api/google/calendar/events` — Create event (if Alfred + attendees → pending approval)
- `DELETE /api/google/calendar/events/:googleEventId` — Delete event
- `GET /api/google/calendar/events/pending` — Pending approval events
- `POST /api/google/calendar/events/:id/approve` — Approve event & send invites (notifies Alfred `[CALENDAR-EVENT-APPROVED]`)
- `POST /api/google/calendar/events/:id/reject` — Reject event (notifies Alfred `[CALENDAR-EVENT-REJECTED]`)
- `GET /api/google/activity` — Activity audit log (query: `actionPrefix`, `limit`, `offset`)

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
| `workspace/goals/goals.json` | Goals (Kanban: goals/todo/in_progress/blocked/review/done) | Command Center + Kanban API |
| `workspace/goals/ideas.json` | Ideas (Kanban: ideas/goals columns) | Command Center + Kanban API |
| `workspace/goals/tasks.json` | Standalone tasks (Kanban: todo/in_progress/blocked/done) | Command Center + Kanban API |
| `workspace/goals/analyses.json` | Goal analyses | Sub-agents |
| `workspace/goals/notifications.json` | Notifications/questions + Kanban blockers | Alfred + Command Center |
| `workspace/webhooks/*.json` | Answered notification events | Command Center |
| `logs/gateway.log` | Gateway activity log | OpenClaw gateway |
| `logs/cache-trace.jsonl` | Local model cache performance | Gateway |
| `cron/jobs.json` | Cron job definitions | OpenClaw cron system |
| `cron/runs/*.jsonl` | Per-job run history (JSONL) | OpenClaw cron system |
| `workspace/google/tokens.json` | Google OAuth2 tokens (chmod 600) | Google auth flow |
| `workspace/google/drafts.json` | Email drafts pending review | Gmail reader |
| `workspace/google/pending-events.json` | Calendar events pending approval | Calendar reader |
| `workspace/google/activity-log.jsonl` | Google action audit log (append-only JSONL) | All Google readers |

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
- Kanban board — `[KANBAN-ASSIGNMENT]` messages when cards move to todo/in_progress, `[KANBAN-UNBLOCK]` messages when Joe answers blockers
- Gmail — `[GMAIL-DRAFT-SENT]` and `[GMAIL-DRAFT-DISCARDED]` when Joe reviews drafts
- Calendar — `[CALENDAR-EVENT-APPROVED]` and `[CALENDAR-EVENT-REJECTED]` when Joe reviews pending events

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

## Kanban Board — Alfred Interaction Protocol

The Kanban board is Alfred's primary task management interface. Cards are a **virtual view** over existing `goals.json`, `ideas.json`, and `tasks.json` — no separate data file.

### Alfred → Board (Alfred updates cards)
- `POST /api/kanban` — Create new cards (discoveries, new tasks)
- `POST /api/kanban/:id/move` — Move cards (e.g., to "review" when done, to "blocked" when stuck)
- `POST /api/kanban/:id/blocker` — Ask Joe a question (card moves to Blocked with message)
- `PATCH /api/kanban/:id` — Update progress notes, description

**Scripts:** Alfred uses these shell wrappers (in `~/.openclaw/workspace/scripts/`):
- `kanban-move.sh <card_id> <column>` — Move card to column
- `kanban-blocker.sh <card_id> <question>` — Block card with question for Joe
- `kanban-update.sh <card_id> <field> <value>` — Update card fields (title, description, priority)

### Board → Alfred (Joe triggers work)
When Joe drags a card to `todo` or `in_progress`:
1. Frontend shows priority dialog: "Notify Alfred? [Urgent / Normal]"
2. `POST /api/kanban/:id/move` with `{ toColumn, priority }`
3. Backend sends `[KANBAN-ASSIGNMENT]` message to Alfred via gateway (`agent:main:main`)
4. Urgent = start immediately, Normal = queue for next slot

### Blocker/Unblock Flow
1. Alfred calls `POST /api/kanban/:id/blocker` with question → card moves to Blocked
2. Joe clicks blocked card → sees blocker message → types answer
3. `POST /api/kanban/:id/unblock` with answer → card moves back to in_progress
4. Backend sends `[KANBAN-UNBLOCK]` message to Alfred via gateway with Joe's answer

### Column Mapping (how source data maps to board)

| Source | Status | Kanban Column |
|--------|--------|---------------|
| Idea | new, researching | Ideas |
| Idea | evaluated | Goals |
| Goal | active (no tasks in progress) | Goals/To Do |
| Goal | active + tasks in_progress | In Progress |
| Goal | paused | Blocked |
| Goal | completed | Done |
| Task | backlog/todo | To Do |
| Task | in_progress | In Progress |
| Task | blocked | Blocked |
| Task | done | Done |

---

## Google Integration — Alfred Interaction Protocol

Gmail and Calendar are accessible via API. **All actions are audit-logged** to `~/.openclaw/workspace/google/activity-log.jsonl`.

### Email Draft Workflow (Alfred → Joe → Send)
1. Alfred calls `POST /api/google/gmail/drafts` with `createdBy: "alfred"` → creates Gmail API draft + local record with `status: "pending_review"`
2. Joe sees it in Gmail page → "Pending Drafts" tab (amber card with Approve/Discard buttons)
3. "Approve & Send" → email sends, Alfred notified via `[GMAIL-DRAFT-SENT]`
4. "Discard" → draft deleted, Alfred notified via `[GMAIL-DRAFT-DISCARDED]`

### Calendar Attendee Approval Workflow
1. Alfred calls `POST /api/google/calendar/events` with attendees + `createdBy: "alfred"` → stored in `pending-events.json` (NOT created in Google yet)
2. Events without attendees or created by user → created immediately in Google Calendar
3. Joe sees pending events in Calendar page → "Pending Approval" tab
4. "Approve & Send Invites" → event created in Google with `sendUpdates: "all"`, Alfred notified via `[CALENDAR-EVENT-APPROVED]`
5. "Reject" → Alfred notified via `[CALENDAR-EVENT-REJECTED]`

### OAuth Setup
Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`. Redirect URI: `http://localhost:3001/api/google/auth/callback`. Tokens persisted to `google/tokens.json` with 600 permissions.

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
- Watches key files for changes (data.json, stats.json, heartbeat, gateway.log, jobs.json, goals.json, ideas.json, tasks.json, google/drafts.json, google/pending-events.json, google/activity-log.jsonl, google/tokens.json)
- Frontend hooks (useDashboard, useStats, useActivity, useKanban) poll on intervals (5–30s)
- useSSE hook triggers refetch on file change events
- Kanban board listens for `kanban-goals`, `kanban-ideas`, `kanban-tasks` SSE events for real-time sync

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
│   ├── types.ts              # All TypeScript interfaces (includes Kanban types)
│   ├── middleware/auth.ts     # Cloudflare Access JWT (production)
│   ├── routes/               # 14 route files (includes kanban.ts, google.ts)
│   └── readers/              # 15 data reader modules (includes kanban.ts, google-auth.ts, google-activity.ts, gmail.ts, google-calendar.ts)
├── frontend/src/
│   ├── App.tsx               # React Router (14 routes + 2 redirects)
│   ├── api.ts                # HTTP client (get/post/patch/del helpers)
│   ├── types.ts              # Frontend types (includes Kanban + Google types)
│   ├── pages/                # 14 page components (includes Kanban.tsx, Gmail.tsx, Calendar.tsx)
│   ├── components/           # 14 UI components (includes GoogleConnectCard, ActivityLog)
│   └── hooks/                # 11 custom hooks (includes useKanban.ts, useGoogleAuth.ts, useGmail.ts, useCalendar.ts)
└── package.json              # Workspace root
```

---

*Last updated: 2026-02-20*
