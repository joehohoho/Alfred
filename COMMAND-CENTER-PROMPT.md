# Command Center Dashboard — Full-Stack Prompt for Claude Code

## Role & Context
You are building a **real-time agent monitoring system** — a Command Center dashboard that displays what each AI agent is doing, in real time, with live updates and zero page refreshes. This is a complete full-stack project: backend, frontend, database, API, WebSockets, and local dev setup.

Your deliverable is a **production-ready, immediately-runnable project** that can be cloned, installed, and running with three commands:
```bash
npm install
npm run dev
# Dashboard live at http://localhost:3000
```

---

## Assumptions & Tech Stack (State These First)

**Assumptions:**
- Backend: Node.js + Express + TypeScript
- Frontend: React 18 + TypeScript + Tailwind CSS
- Real-time: Server-Sent Events (SSE) — simpler than WebSockets for MVP
- Database: SQLite (in-memory for MVP, file-backed option included)
- Deployment: Docker Compose included for testing
- Git: Initialized fresh with clean commit history
- Timeline: ~1 week for one engineer to deploy

**Tech Stack Rationale:**
- Node/Express: Low boilerplate, fast prototyping, excellent TypeScript support
- SQLite: Zero DevOps, migrations optional, scales to 100k+ events easily
- SSE: Built-in browser support, works everywhere, simpler than WebSocket upgrades
- React: Live updates, filtering, sorting, no page refreshes
- Tailwind: Rapid UI, accessibility built-in, consistent colors/sizing

---

## Project Initialization

1. **Repository Structure** — Create a monorepo:
```
command-center/
├── backend/              # Express API
├── frontend/             # React app
├── docker-compose.yml    # Local dev orchestration
├── .gitignore            # Standard Node + env files
├── README.md             # Instructions
├── package.json          # Root-level scripts
└── .env.example          # Template
```

2. **Root Initialization:**
   - Create empty git repo: `git init`
   - Add `.gitignore` (Node, .env, dist, etc.)
   - Create root `package.json` with `"workspaces": ["backend", "frontend"]`
   - Add npm scripts: `dev`, `build`, `test`, `docker:up`, `docker:down`

3. **Backend Setup** (`backend/`):
   - `npm init -y` → `package.json`
   - Install: `express`, `cors`, `uuid`, `sqlite3`, `typescript`, `ts-node`, `nodemon`, `@types/express`, `@types/node`
   - Create: `src/`, `src/index.ts`, `src/types.ts`, `src/db.ts`, `src/routes/`, `src/mocks/`
   - Add `tsconfig.json` (strict mode)
   - Add `backend/.env.example`: `PORT=3001`, `NODE_ENV=development`
   - Add `nodemon.json` for watch mode

4. **Frontend Setup** (`frontend/`):
   - `npx create-react-app . --template typescript` OR manual Vite setup
   - Install: `react`, `react-dom`, `tailwindcss`, `axios`, `lucide-react` (icons)
   - Create: `src/components/`, `src/pages/`, `src/hooks/`, `src/types.ts`, `src/api.ts`
   - Add `tailwind.config.js`
   - Add `frontend/.env.example`: `REACT_APP_API_URL=http://localhost:3001`

5. **Git Initialization:**
   - Run: `git add .`
   - Commit: `git commit -m "Initial project structure: backend, frontend, docker setup"`
   - Tag: `git tag v0.1.0-init`

---

## Data Model (Enforce In Backend)

### Agent Session (Stored in SQLite)
```typescript
interface AgentSession {
  agent_id: string;                      // UUID
  agent_name: string;
  tags: string[];                        // ["billing", "analytics", "urgent"]
  status: "RUNNING" | "IDLE" | "WAITING" | "BLOCKED" | "ERROR" | "DONE";
  current_task: string;                  // "Analyzing Q4 reports"
  current_step: string;                  // "Step 3/5: Compiling charts"
  progress: {
    current: number;
    total: number;
  } | null;
  last_event_at: string;                 // ISO timestamp
  health: {
    retries: number;
    stalls: number;
    tool_errors: number;
  };
  metrics: {
    tokens_used: number;
    cost_usd: number;
    tool_calls_count: number;
    latency_ms: number;
    throughput_msg_per_sec: number;
  };
  started_at: string;
  updated_at: string;
}
```

### Event (Streamed in Real-Time)
```typescript
interface AgentEvent {
  event_id: string;                      // UUID
  timestamp: string;                     // ISO
  agent_id: string;
  type: "STATE_CHANGE" | "TOOL_CALL" | "TOOL_RESULT" | "MESSAGE" | "ERROR" | "RETRY" | "CHECKPOINT";
  summary: string;                       // "Calling web_search tool"
  details: Record<string, any>;          // { tool: "web_search", query: "..." }
}
```

---

## Backend API Contracts (Exact Endpoints)

### Initialization
- **GET /api/health** → `{ status: "ok", uptime_ms: number }`

### Agent Queries
- **GET /api/agents** → `{ agents: AgentSession[], count: number }`
  - Query params: `?status=RUNNING&tags=billing&sort=last_event_at:desc`
- **GET /api/agents/:agent_id** → `{ agent: AgentSession }`
- **GET /api/agents/:agent_id/events** → `{ events: AgentEvent[], count: number }`
  - Query params: `?limit=100&offset=0&since=2026-02-16T14:00:00Z`

### Events
- **POST /api/events** (Backend use only) → Accept event payload, store + broadcast
- **GET /api/events/stream** (SSE endpoint)
  - Headers: `Content-Type: text/event-stream`
  - Payload: One JSON event per line, prefixed with `data: `
  - Query params: `?agent_id=xxx&type=TOOL_CALL&since=timestamp` (optional filters)

### Metrics
- **GET /api/metrics** → `{ global: { total_agents, total_events, avg_latency_ms, total_cost_usd }, agents: [...] }`

### Mock Data (POST only, for testing)
- **POST /api/mock/seed** (Body: `{ agent_count: 10 }`) → Create N mock agents with events
- **POST /api/mock/emit** (Body: `{ agent_id, event_type, details }`) → Emit single mock event

---

## Frontend Components (Exact Breakdown)

### Page Structure
```
src/pages/
├── Dashboard.tsx       # Main page, layout container
└── NotFound.tsx        # 404 fallback
```

### Components
```
src/components/
├── AgentGrid.tsx           # Card grid showing all agents (status, name, current task, progress)
├── AgentList.tsx           # Table view (alternate to grid)
├── EventTimeline.tsx       # Append-only feed of events (sortable by timestamp, agent)
├── ErrorConsole.tsx        # Collapsible panel showing errors with stack excerpts
├── MetricsPanel.tsx        # Global stats: total tokens, cost, throughput, latency
├── FilterBar.tsx           # Status + Tag + Agent name + Time window filters
├── StatusBadge.tsx         # Reusable status indicator (color + icon + label)
├── ProgressIndicator.tsx   # Step counter or spinner
├── Header.tsx              # Title + connect status (green dot if SSE connected)
└── Sidebar.tsx             # Agent count, active filters, quick nav
```

### Hooks
```
src/hooks/
├── useAgents.ts            # Fetch /api/agents, subscribe to SSE, manage state
├── useEventStream.ts       # SSE listener, auto-reconnect on disconnect
├── useFilters.ts           # URL-synced filter state (status, tags, agent, time)
└── useMetrics.ts           # Fetch /api/metrics, update every 5 seconds
```

### Types
```typescript
// src/types.ts — Mirror backend types exactly
export interface AgentSession { ... }
export interface AgentEvent { ... }
```

### API Client
```typescript
// src/api.ts
export class APIClient {
  async getAgents(filters?: FilterParams): Promise<AgentSession[]>
  async getAgent(agent_id: string): Promise<AgentSession>
  async subscribeToEvents(onEvent: (evt: AgentEvent) => void): EventSource
  async getMetrics(): Promise<MetricsResponse>
  async seedMockData(agentCount: number): Promise<void>
}
```

---

## Real-Time Implementation (Critical)

### Backend SSE Setup
```typescript
// backend/src/routes/events.ts
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendEvent = (evt: AgentEvent) => {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  };
  
  // Subscribe new client to event emitter
  eventBus.on('agent-event', sendEvent);
  
  // Cleanup on disconnect
  req.on('close', () => {
    eventBus.off('agent-event', sendEvent);
  });
});
```

### Frontend SSE Hook
```typescript
// src/hooks/useEventStream.ts
export function useEventStream(onEvent: (evt: AgentEvent) => void) {
  useEffect(() => {
    const eventSource = new EventSource(`${API_URL}/api/events/stream`);
    
    eventSource.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      onEvent(evt);
    };
    
    eventSource.onerror = () => {
      console.warn('SSE disconnected, reconnecting...');
      eventSource.close();
      setTimeout(() => eventSource = new EventSource(...), 3000);
    };
    
    return () => eventSource.close();
  }, []);
}
```

### Event Broadcast Pattern
- Backend emits events to SQLite + event bus
- Event bus broadcasts to all connected SSE clients
- Frontend receives, updates React state, re-renders
- No polling, no page refresh

---

## Mock Data & Testing

### Mock Agent Generator
```typescript
// backend/src/mocks/agentGenerator.ts
export class MockAgentGenerator {
  static generateAgent(): AgentSession {
    return {
      agent_id: uuid(),
      agent_name: `Agent-${Math.random().toString(36).substr(2, 5)}`,
      status: pickRandom(['RUNNING', 'IDLE', 'WAITING']),
      current_task: pickRandom([
        'Analyzing Q4 reports',
        'Searching web for competitors',
        'Calling billing API',
        'Processing customer feedback'
      ]),
      // ... rest of fields
    }
  }
  
  static generateEvent(agent_id: string): AgentEvent {
    return {
      event_id: uuid(),
      timestamp: new Date().toISOString(),
      agent_id,
      type: pickRandom(['TOOL_CALL', 'MESSAGE', 'STATE_CHANGE']),
      summary: pickRandom(['Calling web_search', 'Processing result', 'Waiting...']),
      details: { /* varies by type */ }
    }
  }
}

// POST /api/mock/seed endpoint seeds N agents + emit periodic events
```

### Example Seeding Script
```bash
# scripts/seed-mock.sh
curl -X POST http://localhost:3001/api/mock/seed -H "Content-Type: application/json" -d '{"agent_count": 20}'
```

---

## Local Development Setup

### Development Commands (Root package.json)
```json
{
  "scripts": {
    "dev": "npm run dev -w backend & npm run dev -w frontend",
    "build": "npm run build -w backend && npm run build -w frontend",
    "test": "npm test -w backend && npm test -w frontend",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "seed": "npm run seed -w backend"
  }
}
```

### Backend Dev (backend/package.json)
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "seed": "ts-node src/mocks/seed.ts"
  }
}
```

### Frontend Dev (frontend/package.json)
```json
{
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --watchAll=false"
  }
}
```

### Docker Compose (for consistent testing)
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:3001
```

---

## First-Commit Checklist

After implementing all code, commit with **exactly this message:**

```bash
git add .
git commit -m "feat: Command Center Dashboard MVP

- Backend: Express API with SQLite, SSE real-time updates
- Frontend: React dashboard with agent grid, event timeline, error console
- Mock data: 20 agents, event generator for testing
- Docker: Local dev setup with docker-compose
- Docs: README with setup + seeding instructions

Ready for local dev: npm install && npm run dev"

git tag v1.0.0
git log --oneline  # Verify clean history
```

---

## Running Locally (Instructions for README)

### Quick Start (3 Commands)
```bash
git clone <repo>
cd command-center
npm install

# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Seed mock data (optional)
npm run seed

# Open browser
open http://localhost:3000
```

### Docker Alternative
```bash
docker-compose up -d
# Dashboard at http://localhost:3000
```

### UI Overview on First Load
- **Left sidebar:** Agent count (e.g., "20 agents active")
- **Top filter bar:** Status dropdown, tag pills, agent search, time window
- **Main grid:** Agent cards showing status badge, name, current task, progress bar, last activity
- **Right sidebar:** Metrics panel (tokens, cost, latency)
- **Bottom panel:** Live event timeline (color-coded by event type)
- **Collapsible panel:** Error console (red errors, yellow warnings)

---

## Non-Negotiable UX Rules (Implement All)

1. **System state readable in <3 seconds:** Status badges use color + icon + text (never color-only)
2. **Errors visually distinct:** Red background, bold text, always searchable
3. **Stalled agents surface after 30s inactivity:** Yellow health indicator
4. **No hidden state:** Everything visible or one click away (no modals unless necessary)
5. **Live updates without page refresh:** SSE + React state
6. **Sorting + filtering:** Both work independently (URL-synced)
7. **Responsive:** Works on 1080p+ (MVP, no mobile required)
8. **Accessibility:** Alt text on icons, semantic HTML, keyboard nav on tables

---

## Constraints & Assumptions

- **Timeline:** One engineer, ~1 week
- **MVP focus:** No user accounts, no auth (add later)
- **Local-first:** Assumes running on same machine or LAN
- **Scalability:** Tested design supports 200+ agents without lag
- **Database:** SQLite for MVP; migration to PostgreSQL straightforward later

---

## What You're Delivering

✅ Git repository, clean init, tagged v1.0.0  
✅ Full backend API (Express + SQLite + SSE)  
✅ Full frontend UI (React + Tailwind + real-time)  
✅ Mock data generator + seeding script  
✅ Docker Compose for local dev  
✅ README with setup instructions  
✅ Production-ready folder structure  
✅ TypeScript throughout (strict mode)  
✅ First commit ready to deploy  

---

## Next Steps After Delivery

1. Clone the repo
2. Run `npm install && npm run dev`
3. Open http://localhost:3000
4. Verify dashboard loads, seed mock data, confirm SSE updates live
5. Customize colors, add real agent data source
6. Deploy to prod (Vercel frontend, Railway/Fly backend)

---

**End of prompt. Do not over-engineer. Ship fast.**
