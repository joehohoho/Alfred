# Decision Index

**Updated:** 2026-03-09 15:31 UTC | **Next auto-update:** Fridays at 3 PM AST  
**Purpose:** Quick reference for all active decisions. Prevents repeat questions by showing what's been decided + when to re-ask.

---

## Active Decisions (Current Month)
_Do NOT re-ask questions in this section until review date passes._

| Decision | Asked | Decided | Review Date | Status | Link |
|----------|-------|---------|-------------|--------|------|
| Passive Income Targets (Q2 Growth) | [Parse] | [Parse] | [Parse] | [Parse] | [Passive Income Targets (Q2 Growth)](#) |
| App Growth Strategy (Priority) | [Parse] | [Parse] | [Parse] | [Parse] | [App Growth Strategy (Priority)](#) |
| Market Signal Lab Scope | [Parse] | [Parse] | [Parse] | [Parse] | [Market Signal Lab Scope](#) |
| Reliability Infrastructure Priority | [Parse] | [Parse] | [Parse] | [Parse] | [Reliability Infrastructure Priority](#) |
| Reliability Systems Configuration | [Parse] | [Parse] | [Parse] | [Parse] | [Reliability Systems Configuration](#) |

---

## Pending Decisions (Awaiting Joe Answer)
_These were asked but not yet answered. Will be re-asked on due date if no answer._

| Decision | Asked By | Asked Date | Due Date | Next Re-Ask | Priority |
|----------|----------|-----------|----------|------------|----------|
| [Auto-populated from monthly files with ⏳ PENDING status] | — | — | — | — | — |

---

## Recently Decided (Last 7 Days)
_Decisions made in the past week. Included for context._

| Decision | Decided | Status | Next Review |
|----------|---------|--------|-------------|
| [Auto-populated] | — | — | — |

---

## Archived Decisions (Previous Months)
_Reference only. Do not re-ask._

| Month | Link | Count |
|-------|------|-------|

---

## Decision Re-Ask Rules

**Before asking a question, ALWAYS check:**
1. Is this question in "Active Decisions" above?
2. If YES and review date hasn't passed → **DO NOT RE-ASK** (decision is live)
3. If in "Pending Decisions" and today >= due date → **ESCALATE** to Joe via Command Center

**Example flows:**
- ✅ **OK to ask:** Question not in index, or review date has passed
- ❌ **DO NOT ASK:** "Passive Income Targets" — already in pending since Feb 20, due Mar 15
- ⚠️ **ESCALATE:** Today is Mar 15 and "Passive Income Targets" still pending → send Joe notification

---

## Weekly Decision Review (Fridays 3 PM)

**Alfred generates + posts summary to Joe:**
- How many decisions made this month?
- How many still pending (overdue)?
- Recommend re-asking or closing out?

This is automated via cron + Command Center notification.

---

**Key files:**
- `decisions/YYYY-MM.md` — Monthly decision logs (one per month)
- `decisions/INDEX.md` — This file (updated weekly)
- `scripts/log-decision.sh` — Alfred uses to log answers
- `scripts/update-decision-index.sh` — Updates this index

---

_This index format follows Moltbook consensus on decision memory (Nyl 27↑, Eva_Misfit 40↑). Prevents re-asking + reduces decision context switching._
