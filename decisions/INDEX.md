# Decision Index

**Updated:** 2026-03-15 15:10 UTC | **Next auto-update:** Fridays at 3 PM AST  
**Purpose:** Quick reference for all active decisions. Prevents repeat questions by showing what's been decided + when to re-ask.

---

## Active Decisions (Current Month)
_Do NOT re-ask questions in this section until review date passes._

| Decision | Asked | Decided | Review Date | Status | Link |
|----------|-------|---------|-------------|--------|------|
| Passive Income Targets (Q2 Growth) | 2026-02-20 | 2026-03-09 | 2026-04-10 | ✅ DECIDED | [March log](./2026-03.md#decision-passive-income-targets-q2-growth) |
| App Growth Strategy (Priority) | 2026-02-27 | 2026-03-09 | 2026-04-10 | ✅ DECIDED | [March log](./2026-03.md#decision-app-growth-strategy-priority) |
| Market Signal Lab Scope | 2026-03-02 | 2026-03-09 | 2026-06-01 | ✅ DECIDED | [March log](./2026-03.md#decision-market-signal-lab-scope) |
| Reliability Infrastructure Priority | 2026-03-09 | 2026-03-09 | 2026-04-09 | ✅ DECIDED | [March log](./2026-03.md#decision-reliability-infrastructure-priority) |
| Reliability Systems Configuration | 2026-03-09 | 2026-03-09 | 2026-04-09 | ✅ DECIDED | [March log](./2026-03.md#decision-reliability-systems-configuration) |

---

## Pending Decisions (Awaiting Joe Answer)
_These were asked but not yet answered. Will be re-asked on due date if no answer._

| Decision | Asked By | Asked Date | Due Date | Next Re-Ask | Priority |
|----------|----------|-----------|----------|------------|----------|
| _None currently pending_ | — | — | — | — | — |

---

## Recently Decided (Last 7 Days)
_Decisions made in the past week. Included for context._

| Decision | Decided | Status | Next Review |
|----------|---------|--------|-------------|
| Passive Income Targets (Q2 Growth) | 2026-03-09 | ✅ DECIDED | 2026-04-10 |
| App Growth Strategy (Priority) | 2026-03-09 | ✅ DECIDED | 2026-04-10 |
| Market Signal Lab Scope | 2026-03-09 | ✅ DECIDED | 2026-06-01 |
| Reliability Infrastructure Priority | 2026-03-09 | ✅ DECIDED | 2026-04-09 |
| Reliability Systems Configuration | 2026-03-09 | ✅ DECIDED | 2026-04-09 |

---

## Archived Decisions (Previous Months)
_Reference only. Do not re-ask._

| Month | Link | Count |
|-------|------|-------|
| _None yet_ | — | 0 |

---

## Decision Re-Ask Rules

**Before asking a question, ALWAYS check:**
1. Is this question in "Active Decisions" above?
2. If YES and review date hasn't passed → **DO NOT RE-ASK** (decision is live)
3. If in "Pending Decisions" and today >= due date → **ESCALATE** to Joe via Command Center

**Example flows:**
- ✅ **OK to ask:** Question not in index, or review date has passed
- ❌ **DO NOT ASK:** Any active decision whose review date has not passed
- ⚠️ **ESCALATE:** Pending decision has reached or passed due date without answer

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
