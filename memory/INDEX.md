# Memory Index

Quick reference to all memory files. **Load this first** (lightweight ~2k tokens), then pull only the files you need with `memory_get(path, from, lines)`.

---

## 🎯 Decisions & Recommendations (NEW)

**See:** `DECISIONS-AND-RECOMMENDATIONS.md` for all major decisions, their status, and outcomes.

| Decision | Category | Date | Status |
|----------|----------|------|--------|
| 3-Tier Backup System (Git + GitHub + Archives) | Disaster Recovery | 2026-02-17 | ✅ Implemented |
| Repository cleanup (token exposure fix) | Security | 2026-02-17 | ✅ Implemented |
| Dashboard #1: Node.js 8765 | Infrastructure | 2026-02-04 | ✅ Implemented |
| Dashboard #2: Alfred-Dashboard (Next.js + Redis) | Infrastructure | 2026-02-06 | ✅ Implemented |
| Dashboard #3: ??? (Vertex-based) | Infrastructure | 2026-02-?? | ⏳ Pending clarification |
| Dashboard auto-start cron | Infrastructure | 2026-02-10 | ✅ Implemented |
| Smart goal notifications (intake policy) | Process Automation | 2026-02-18 | ✅ Implemented |
| Config upgrade 2026.2.12 → 2026.2.15 | Infrastructure | 2026-02-16 | ✅ Implemented (Phases 1-2) |
| Memory system improvements | Infrastructure | 2026-02-16 | ✅ Implemented |
| Token efficiency patterns | Optimization | 2026-02-09 | ✅ Implemented |
| Dashboard cron cleanup | Optimization | 2026-02-09 | ✅ Implemented |
| Moltbook recommendations (5 items) | Infrastructure | 2026-02-10 | ✅ Implemented |
| Security hardening baseline | Security | 2026-02-04 | ✅ Implemented |
| ClawHub security gating (Clawdex) | Security | 2026-02-10 | ✅ Implemented |
| Daily config report + 6 automated fixes | Maintenance | 2026-02-17 | ✅ Implemented |
| HEARTBEAT Check 4 deferral (memory capture) | Infrastructure | 2026-02-17 | ✅ Deferred until 65%+ threshold |

**By Status:**
- ✅ **Implemented:** 14
- ⏳ **Pending Clarification:** 1 (mystery dashboard)
- ⏸️ **Deferred:** 5 (Check 4 until 65%+ threshold, LanceDB upgrade, Calendar integration, Time Machine, etc.)

---

## 📚 Curated Long-Term Memory

- **MEMORY.md** — Hand-curated long-term memories (lessons, patterns, decisions that matter)

---

## 📝 Query & Audit Logs (NEW)

- **QUERIES-AND-MISSES.md** — Track memory lookup failures and how they're fixed. Helps improve the memory system.

---

## 📅 Daily Logs (Recent)

| Date | Summary | Topics |
|------|---------|--------|
| 2026-02-18 | **Two major fixes implemented:** (1) COMMUNICATIONS.md created for unified notification architecture (solves context-awareness issue); (2) GOAL-INTAKE-POLICY.md created for smart goal classification (eliminates unnecessary test goal notifications, only notifies when user input needed). | memory-architecture, notifications, unified-communications, goal-automation, process-optimization |
| 2026-02-17 | **Full day:** Morning config audit (6 fixes), backup system (3-tier, $0), Ollama idle optimization (97% CPU savings), YouTube research (Super Memory/ClawRouter insights), Goals management system built (goals/, goal-analyzer.js, dashboard /goals). Tomorrow: pre-commit git hook. | config-audit, disaster-recovery, ollama-optimization, goals-system, youtube-research |
| 2026-02-17 | **Morning (8:50 AM):** Daily config report delivered. All 6 fixes applied autonomously: NOW.md cleared, USER.md DST note added, AGENTS.md model versions standardized to 4.5, HEARTBEAT Check 4 deferred with reactivation trigger, MEMORY.md consolidated, Codex status reviewed. All edits reversible. | config-audit, maintenance, documentation, memory-architecture |
| 2026-02-17 | Daily config & memory review (7:00 AM cron). 6 issues flagged (stale NOW.md, timezone DST prep, model version inconsistencies, HEARTBEAT Check 4 status). No critical problems. | config-audit, daily-review, documentation |
| 2026-02-16 | **Morning:** Config upgrade (2026.2.15 Phases 1-2) + dashboard cron setup. **Afternoon:** Memory system overhaul — created DECISIONS-AND-RECOMMENDATIONS.md (11 decisions), QUERIES-AND-MISSES.md (audit log), INDEX.md update (Decisions table), MEMORY-FILE-TEMPLATE.md (frontmatter standard). All LOCAL ($0 cost). | diagnostics, context-pruning, apply_patch, plugin-registry, memory-system, decisions-log, structured-indexing |
| 2026-02-14 | Daily routine | heartbeat monitoring |
| 2026-02-13 | Voice communication setup (Whisper + TTS) | speech-to-text, text-to-speech, voice-workflow |
| 2026-02-12 | Dashboard fixes + overnight tasks | dashboard-sync, token-cleanup, budget-fixes |
| 2026-02-11 | Slack restoration + cron optimization + local model tests | slack-integration, cron-jobs, LOCAL-model |
| 2026-02-10 | Security + optimization research | ClawHub-security, token-efficiency, dashboard-cron |
| 2026-02-09 | Moltbook recommendations + efficiency patterns | memory-structure, token-optimization, cron-cleanup |
| 2026-02-08 | Ongoing operations | heartbeat, security-audit, moltbook-review |
| 2026-02-06 | Alfred Dashboard setup (Next.js + OAuth + Redis) | dashboard-infrastructure, Vercel-deployment, Redis-setup |
| 2026-02-04 | First boot + dashboard setup + security audit | onboarding, dashboard-basics, security-hardening |

---

## 🏗️ Infrastructure Files (Location Reference)

| Project | Path | Purpose |
|---------|------|---------|
| Dashboard (Node.js) | `/dashboard/` | Port 8765, cost tracking |
| Alfred Dashboard (Next.js) | `/Alfred-Dashboard/` | Deployed to Vercel, OAuth, Redis |
| Command Center Dashboard | `/Users/hopenclaw/command-center/` | Real-time monitoring + Goals + Chat + Notifications + Cron |
| CONFIG-UPGRADE-PLAN | `CONFIG-UPGRADE-PLAN.md` | Full 2026.2.15 migration guide |
| Communications Map | `COMMUNICATIONS.md` | Unified channels, APIs, notification standards |
| Daily Logs | `memory/YYYY-MM-DD.md` | Session logs (append-only) |
| Decisions Log | `DECISIONS-AND-RECOMMENDATIONS.md` | Searchable decision index |
| Query Audit | `QUERIES-AND-MISSES.md` | Memory lookup failures + fixes |

---

## 📍 How to Use This Index

1. **Checking a decision status?** → Read first table (Decisions & Recommendations)
2. **Looking for a daily log?** → Scan second table (Daily Logs), then `memory_get(path, from, lines)`
3. **Searching for a specific topic?** → Check third table (Infrastructure), or use `grep` on memory/*.md
4. **Memory lookup failed?** → Check `QUERIES-AND-MISSES.md` for the pattern and workaround
5. **Adding new memory?** → Use frontmatter template from `QUERIES-AND-MISSES.md`

---

## 🔍 Memory Query Strategy

If `memory_search()` returns 0 results:

```
1. Try grep "keyword" memory/*.md
2. Check DECISIONS-AND-RECOMMENDATIONS.md (manual lookup)
3. Check daily logs by date
4. Ask user: "I can't find this. Can you remind me?"
5. Add to QUERIES-AND-MISSES.md as a "miss"
```

---

**Last Updated:** 2026-02-17 22:00 AST  
**Maintainer:** Alfred (main agent)  
**Update Strategy:** Add new rows to Decisions table after each decision; update Daily Logs after each session

---

### Quick Stats
- **Daily log files:** 20+ (Feb 4 - Feb 17)
- **Major decisions tracked:** 13
- **Implementation status:** 11 ✅ / 1 ⏳ / 5 ⏸️
- **Query audit entries:** 1 (will grow over time)
- **Memory system version:** 2.1 (now with structured indexing)
