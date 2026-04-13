# Workspace Index — Quick Navigation

**Last Updated:** 2026-04-13 16:30 ADT

## 📌 CORE OPERATIONAL (Root Level)

Start here for daily operations:

- **`SOUL.md`** — Identity, principles, and core values
- **`USER.md`** — Joe's profile (preferences, schedule, boundaries)
- **`IDENTITY.md`** — Alfred's name, vibe, emoji
- **`AGENTS.md`** — Operating manual (safety, models, protocols, automation)
- **`AGENTS-EXTENDED.md`** — Detailed reference for above
- **`MEMORY.md`** — Curated long-term memory (compressed, high-value)
- **`HEARTBEAT.md`** — Monitoring tasks & health checks (every 30-60 min)
- **`TOOLS.md`** — Local tooling quick reference
- **`TOOLS-EXTENDED.md`** — Full tool details & examples

## 🔄 SESSION CONTINUITY (Root Level)

Persist state across context windows:

- **`ACTIVE-TASK.md`** — Current task state, objectives, progress, pending questions (write-ahead log)
- **`LAST-SESSION.md`** — Session bridge (what happened, decisions, tasks, next steps)
- **`NOW.md`** — Emergency checkpoint (>70% context threshold)

---

## 📂 DIRECTORY STRUCTURE

### `/docs` — Documentation & Reference (304 KB)
- **`/docs/policies/`** — Decision boundaries, safety rules, security guidelines
- **`/docs/operational/`** — Daily workflows (task dispatch, inquiry system, morning/evening routines)
- **`/docs/guides/`** — Integration guides, quickstarts, how-to docs
- **`/docs/system-design/`** — System architecture, APIs, design docs

### `/memory-system` — Memory Management (68 KB)
- `DECISION-MEMORY.md` — Strategic decisions with guard timestamps
- `MEMORY-MAINTENANCE.md` — Memory upkeep protocols
- `MEMORY-OVERFLOW-PREVENTION.md` — Context compression strategies
- Guides for writing to daily logs (`memory/YYYY-MM-DD.md`)

### `/infrastructure` — System Operations (508 KB)
- **`/infrastructure/cron/`** — Cron job definitions, schedules, status
- **`/infrastructure/deployments/`** — Launch procedures, checklists, phase tracking
- **`/infrastructure/config/`** — Git config, model optimization, system settings
- **`/infrastructure/monitoring/`** — Health checks, performance profiles, LaunchAgent status

### `/playbooks` — Standard Procedures (20 KB)
- Protocol documentation: Kanban, Handoff, Notification routing, HAL dispatch
- Step-by-step guides for routine operations

### `/projects` — Active Work (595 MB total)
- **`/projects/CoinUsUp/`** — App codebase, reviews, tests, analytics
- **`/projects/Even-Us-Up/`** — Expense sharing app (Expense_Sharing/)
- **`/projects/Signal-App/`** — Buy/sell signal app (signal-app-mvp/)
- **`/projects/passive-income/`** — Research, monetization strategy, market analysis

### `/ideas` — Concept Development (416 KB)
- Passive income ideas, market research, opportunity analysis
- Synergies between active projects
- `kanban-ideas.md` — Ideas under evaluation

### `/memory` — Daily Logs (2.3 MB)
- **`/memory/INDEX.md`** — Index of all daily logs
- **`/memory/YYYY-MM-DD.md`** — Session notes, findings, discoveries (append-only)
- **`/memory/archive/`** — Logs older than 30 days (searchable backup)

### `/reports` — Analysis & Findings (1.6 MB)
- Audit reports, code reviews, market research, performance analysis
- Investigation results and recommendations

### `/scratch` — Temporary Work (72 KB)
- Work-in-progress files, drafts, transient tasks
- Safe to clean periodically

### `/archives` — Obsolete & Disabled (60 KB)
- Disabled systems, dead code cleanup logs, historical audit trails
- Kept for recovery/reference only

### Other Key Directories
- **`/scripts`** (1.9 MB) — Automation scripts, LaunchAgents, CLI tools
- **`/tracking`** (564 KB) — Kanban state, dispatch observability, work history
- **`/goals`** (1.1 MB) — Quarterly plans, handoff contracts, evaluation criteria
- **`/state`** (28 KB) — Runtime state files (loaded on session bootstrap)
- **`/config`** (28 KB) — System configuration, environment variables
- **`/decisions`** (28 KB) — Strategic decision records

---

## 🔍 QUICK LOOKUP BY TASK

### Daily Boot Sequence
1. `SOUL.md` → `USER.md` → `AGENTS.md` → `memory/INDEX.md`
2. Load today's `memory/YYYY-MM-DD.md`
3. Check `ACTIVE-TASK.md` for pending work
4. Run `bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh`

### Answering "What should I work on?"
→ `ACTIVE-TASK.md` (Pending Questions section)  
→ `OPEN-LOOPS.md` (unified dashboard)  
→ `tracking/kanban/board-state.json` (current cards)

### Understanding a Policy/Rule
→ `docs/policies/` (search by keyword)  
→ `AGENTS.md` (hard safety boundaries)  
→ `HEARTBEAT.md` (monitoring rules)

### Learning a Procedure
→ `playbooks/` (KANBAN-PROTOCOL.md, HANDOFF-PROTOCOL.md, etc.)  
→ `docs/guides/` (integration & quickstart docs)

### Reviewing Session History
→ `memory/YYYY-MM-DD.md` (today's log)  
→ `LAST-SESSION.md` (previous session bridge)  
→ `memory/archive/` (older logs)

### Finding Code Reviews / Project Work
→ `projects/` (by app name)  
→ `reports/` (search by project)

### Passive Income Research
→ `projects/passive-income/` (current analysis)  
→ `ideas/` (opportunity list)  
→ `reports/` (market research)

### System/Infrastructure Issues
→ `infrastructure/monitoring/` (health status)  
→ `infrastructure/config/` (system config)  
→ `infrastructure/cron/` (job definitions)  
→ `HEARTBEAT.md` (what to monitor)

---

## 📊 Size Summary

| Directory | Size | Purpose |
|-----------|------|---------|
| CoinUsUp | 595 MB | Main app codebase |
| Expense_Sharing | 304 MB | Even Us Up app |
| signal-app-mvp | 428 MB | Signal app codebase |
| projects (other) | — | Deliverables, analysis |
| scripts | 1.9 MB | Automation & tools |
| memory | 2.3 MB | Daily logs (compressed) |
| reports | 1.6 MB | Analysis & findings |
| goals | 1.1 MB | Planning & handoffs |
| Other | ~800 KB | Docs, config, state |
| **Total** | **~1.9 GB** | All operational files |

---

## 🔧 Updating This Index

When the workspace structure changes:
1. Update this file with new directories/files
2. Run: `bash ~/.openclaw/workspace/scripts/update-workspace-index.sh`
3. Verify all links in Obsidian resolve correctly
4. Commit to git: `git add INDEX.md && git commit -m "Update workspace index"`

---

## 🚀 Key Infrastructure Files (For Reference)

**Automation:**
- `scripts/kanban-idle-loop.sh` — Picks up work from Kanban board
- `scripts/alfred-proactive-check.sh` — Evaluates proactive tasks
- `scripts/sentinel.sh` — Self-healing system monitor (every 5 min)

**Memory & State:**
- `scripts/sync-pending-questions.sh` — Syncs notifications → ACTIVE-TASK.md
- `scripts/session-checkpoint.sh` — Saves state when context >60%
- `scripts/memory-size-monitor.sh` — Watches memory growth

**Obsidian Integration:**
- `.obsidian/` — Vault config (backlinks, quick capture, templates)
- All `.md` files are Obsidian-ready (can be browsed in Obsidian app)

---

**Last checked:** 2026-04-13 16:30 ADT  
**Status:** ✅ Workspace reorganized and indexed
