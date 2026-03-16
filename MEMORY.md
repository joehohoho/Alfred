# MEMORY.md - Curated Long-Term Memory (Compressed 2026-03-15)

## Core Philosophy

**Writing IS memory.** Not "might forget" — if I haven't written it to a file, I don't actually know it. Mental notes don't survive context windows.

---

## Security Rules (CRITICAL)

**NEVER touch `~/.openclaw/openclaw.json`:**
- Do NOT edit, write, patch, or modify this file for ANY reason
- Every time I've edited it, the gateway crashed and Joe had to fix it manually (4+ incidents)
- This rule has NO exceptions. None.

**API Keys & Tokens:**
- ONLY store in `.env` files
- NEVER commit `.env` to git
- NEVER hardcode credentials anywhere

---

## Critical Issues (Active — 2026-03-15)

### 🚨 MEMORY.md Overflow — RESOLVED
**Status:** ✅ Fixed (compressed 25,877 → ~3,500 chars)
- Gateway was failing to inject MEMORY.md (exceeds 20KB limit)
- Archived old entries to `memory/MEMORY-ARCHIVE.md`
- Result: Gateway bootstrap now clean, no truncation warnings

### ⚠️ Cron Job Auto-Disable Pattern (RECURRING)
**Issue:** Mar 10, 12, 15 — jobs auto-disable due to Discord channel routing with invalid IDs
- Root cause: `delivery.mode="announce"` + missing explicit `delivery.to` (channel ID)
- Workaround: Fix `to` field with correct Discord channel ID, re-enable job
- Affected jobs: 6 critical daily jobs (Evening Routine, Daily Inquiry, Daily Config, Nightly Git, Moltbook Review, Joe Profile Reflection)
- Status: Documented pattern, fix strategy in CRON-JOBS-FIX.md, awaiting batch re-enable

### Daily Inquiry Duplicate Questions (PRIORITY 1)
**Issue:** Same questions cycle every 4 days without deduplication
- Passive income targets, synergies asked repeatedly
- Erodes user trust in notification system
**Solution:** Need "last_asked" timestamp tracking to skip questions <7 days old
**Status:** Pending implementation

### Auto-Move Deliverables (MEDIUM)
**Issue:** HAL deliverable cards not auto-moving from Review→Done
- Joe's Feb 27 directive: Auto-move completed work
- 14+ review cards stuck, creating false backlog
**Status:** Documented but not yet enforced in kanban logic

---

## Joe's Context (Summary)

**Location:** Dieppe, NB (AST/ADT)  
**Family-first:** Primary priority; build passive income to enjoy time with kids  
**Current Projects:** CoinUsUp, Even Us Up, Stock/Crypto Signal App, Automation Consulting  
**What Joe Values:** Proactive work, overnight execution, surprises, system improvement  
**Decision Boundaries:** Act autonomously on tech/coding; notify on security/costs/major changes  

---

## System Reliability (State 2026-03-15)

**Gateway:** ✅ Running (after MEMORY.md compression fix)  
**LaunchAgents:** ✅ 14/14 running (includes watchdogs + weather alerts)  
**Models:** Haiku primary; LOCAL/Codex secondary  
**Cron Jobs:** ⚠️ Partially disabled (Evening Routine, Daily Inquiry auto-disabled Mar 12)  
**Memory System:** ✅ 4-layer continuity stack operational  

---

## Next Actions (Priority Order)

1. **Fix cron job auto-disable pattern (RECURRING)** — 5 jobs repeatedly disable due to Discord routing; need explicit channel ID config or fallback routing
2. **Repair ACTIVE-TASK.md sync script** — marker format drift breaks pending-questions refresh; sync-pending-questions.sh needs compatibility fix
3. **Re-enable cron jobs** (Evening Routine, Daily Inquiry) — disabled Mar 12-15; waiting on #1 fix
4. **Enforce auto-move for HAL deliverables** — cleanup Review column backlog
5. **Monitor gateway stability** — watch for further memory overflow

---

## For Full Context

- **Daily logs:** `memory/YYYY-MM-DD.md` and `memory/INDEX.md`
- **Archived:** Old entries moved to `memory/MEMORY-ARCHIVE.md`
- **Operational:** See AGENTS.md, HEARTBEAT.md, COMMAND-CENTER.md for detailed guidance
