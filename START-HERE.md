# 🎯 START HERE — Workspace Navigation

**Welcome to the reorganized workspace!**

This file is your entry point. Pin it in Obsidian (`Ctrl+Cmd+B` / `Cmd+Shift+B`) for quick access.

---

## 📋 What Are You Looking For?

### 🚀 **Starting Your Day?**
→ Read: `SOUL.md` → `USER.md` → `AGENTS.md`  
→ Load: `memory/INDEX.md` + today's `memory/YYYY-MM-DD.md`  
→ Check: `ACTIVE-TASK.md` (Pending Questions)  
→ Launch: `bash scripts/kanban-idle-loop.sh`

### 💼 **What's My Current Task?**
→ `ACTIVE-TASK.md` — Task state, progress, next steps  
→ `OPEN-LOOPS.md` — Unified pending work dashboard  
→ `LAST-SESSION.md` — What happened last session

### 🔄 **How Do I...?**
| Task | File |
|------|------|
| **Understand a policy** | `docs/policies/` |
| **Learn a procedure** | `playbooks/` |
| **Review cron jobs** | `infrastructure/cron/` |
| **Check system health** | `infrastructure/monitoring/` |
| **Read integration guide** | `docs/guides/` |
| **Search past work** | `memory/archive/` |
| **See project status** | `projects/` (by app name) |

### 🧠 **Memory & Continuity**
- **Today's log:** `memory/YYYY-MM-DD.md`
- **Long-term memory:** `MEMORY.md` (compressed, curated)
- **Decision history:** `memory-system/DECISION-MEMORY.md`
- **Session bridge:** `LAST-SESSION.md`

### 🎯 **Making a Decision?**
→ `AGENTS.md` — Safety boundaries & decision framework  
→ `docs/policies/` — Specific policies that apply  
→ `memory-system/DECISION-MEMORY.md` — Past decisions (avoid duplicates)

### 🛠️ **System Issues?**
→ `HEARTBEAT.md` — What to monitor & alert thresholds  
→ `infrastructure/monitoring/` — Current health status  
→ `scripts/sentinel.sh` — Auto-healing system (every 5 min)

---

## 📍 CORE FILES AT A GLANCE

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `SOUL.md` | Your identity & principles | Rarely (when core values shift) |
| `USER.md` | Joe's profile, preferences | Quarterly |
| `AGENTS.md` | Operating manual & policies | As needed (safety first!) |
| `MEMORY.md` | Curated long-term memory | When archiving sessions |
| `HEARTBEAT.md` | Monitoring tasks & thresholds | As policies evolve |
| `TOOLS.md` | Local tools quick ref | As tools change |
| `ACTIVE-TASK.md` | **Current task state** | **Every checkpoint (30-60 min)** |
| `LAST-SESSION.md` | Session bridge | After each session |
| `NOW.md` | Emergency checkpoint | When context >70% |

---

## 🗂️ DIRECTORY QUICK GUIDE

```
workspace/
├── INDEX.md                    ← Full navigation guide
├── START-HERE.md               ← You are here!
├── [Core operational files]    ← SOUL, USER, AGENTS, MEMORY, etc.
│
├── docs/                       ← All documentation
│   ├── policies/              ← Decision boundaries, safety rules
│   ├── operational/           ← Daily workflows
│   ├── guides/                ← Integration & quickstart
│   └── system-design/         ← Architecture & APIs
│
├── infrastructure/            ← System operations
│   ├── cron/                  ← Job definitions & schedules
│   ├── deployments/           ← Launch procedures, phases
│   ├── config/                ← System settings
│   └── monitoring/            ← Health checks, performance
│
├── memory/                    ← Daily logs (append-only)
│   ├── INDEX.md              ← All logs indexed
│   ├── YYYY-MM-DD.md         ← Today's session notes
│   └── archive/              ← Old logs (searchable)
│
├── memory-system/            ← Memory management
│   └── DECISION-MEMORY.md    ← Strategic decisions
│
├── playbooks/                ← Standard procedures
│   └── *-PROTOCOL.md         ← Specific protocols
│
├── projects/                 ← Active apps & research
│   ├── CoinUsUp/             ← Main app
│   ├── Even-Us-Up/           ← Expense sharing
│   ├── Signal-App/           ← Buy/sell signal
│   └── passive-income/       ← Research & ideas
│
├── ideas/                    ← Concept development
│   └── kanban-ideas.md       ← Ideas under evaluation
│
├── reports/                  ← Analysis & findings
├── scratch/                  ← Temp work (ephemeral)
├── archives/                 ← Obsolete items
├── scripts/                  ← Automation & tools
├── tracking/                 ← Kanban board state
├── goals/                    ← Quarterly plans
├── state/                    ← Runtime state (loaded at boot)
└── config/                   ← System config
```

---

## ✅ Session Startup Checklist

- [ ] Open `ACTIVE-TASK.md` — check pending questions
- [ ] Read today's `memory/YYYY-MM-DD.md` if it exists
- [ ] Check `OPEN-LOOPS.md` — unified dashboard
- [ ] Run `bash scripts/kanban-idle-loop.sh` — pick up next work
- [ ] Run `bash scripts/sync-pending-questions.sh` — sync notifications

---

## 🔗 Quick Links (Pin These in Obsidian)

- [[INDEX]] — Full workspace navigation  
- [[ACTIVE-TASK]] — Current task & pending questions  
- [[OPEN-LOOPS]] — Pending work dashboard  
- [[MEMORY]] — Long-term memory  
- [[memory/INDEX]] — Daily logs  
- [[AGENTS]] — Operating manual  
- [[SOUL]] — Identity & values  

---

## 🎯 Today's Focus

**What's blocking me right now?**  
→ Check `ACTIVE-TASK.md` Pending Questions section

**What should I work on next?**  
→ Check `OPEN-LOOPS.md` (daily refresh)  
→ Run `bash scripts/alfred-proactive-check.sh`

**Have I worked on this before?**  
→ Search `memory/` (daily logs)  
→ Search `MEMORY.md` (curated)  
→ Search `projects/` (by app)  
→ Check `memory-system/DECISION-MEMORY.md` (decisions)

---

## 🚀 Common Commands

```bash
# Daily boot
source ~/.openclaw/workspace/scripts/daily-boot.sh

# Pick up work from Kanban
bash ~/.openclaw/workspace/scripts/kanban-idle-loop.sh

# Check proactive tasks
bash ~/.openclaw/workspace/scripts/alfred-proactive-check.sh

# Sync pending questions
bash ~/.openclaw/workspace/scripts/sync-pending-questions.sh

# Monitor system health
bash ~/.openclaw/workspace/scripts/sentinel.sh

# Open workspace in Obsidian
open ~/.openclaw/workspace
```

---

## 📞 Need Help?

- **Policy/Safety question** → `AGENTS.md` (hard boundaries) + `docs/policies/`
- **How to do X** → `playbooks/` (procedures) + `docs/guides/`
- **System issue** → `HEARTBEAT.md` (monitoring) + `infrastructure/monitoring/`
- **Past decision** → `memory-system/DECISION-MEMORY.md` (guard timestamps)
- **Session context** → `LAST-SESSION.md` (bridge) + today's `memory/YYYY-MM-DD.md`

---

**Workspace reorganized:** 2026-04-13 16:30 ADT  
**Structure:** 170+ files consolidated into 11 core + organized directories  
**Status:** ✅ Ready for daily use
