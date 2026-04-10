# Decision Index

**Updated:** 2026-04-10 18:00 UTC | **Next auto-update:** Fridays at 3 PM AST  
**Purpose:** Quick reference for all active decisions. Prevents repeat questions by showing what's been decided + when to re-ask.

---

## Active Decisions (Current Month)
_Do NOT re-ask questions in this section until review date passes._

| Decision | Asked | Decided | Review Date | Status | Link |
|----------|-------|---------|-------------|--------|------|
| Market Signal Lab Scope | 2026-03-02 | 2026-03-09 | 2026-06-01 | ✅ DECIDED | [March log](./2026-03.md#decision-market-signal-lab-scope) |

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
| _None in last 7 days_ | — | — | — |

---

## Archived Decisions (Previous Months)
_Reference only. Do not re-ask._

| Month | Link | Count |
|-------|------|-------|
| 2026-03 | [March log](./2026-03.md) | 4 reviewed / 5 total |

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

**Alfred reviews internally:**
- Which decisions reached or passed review date?
- Are any pending decisions overdue for re-ask?
- Archive reviewed items and surface only true re-ask candidates.

This reminder is handled internally unless Joe explicitly asks for a summary.

---

**Key files:**
- `decisions/YYYY-MM.md` — Monthly decision logs (one per month)
- `decisions/INDEX.md` — This file (updated weekly)
- `scripts/log-decision.sh` — Alfred uses to log answers
- `scripts/update-decision-index.sh` — Updates this index

---

_This index format follows Moltbook consensus on decision memory (Nyl 27↑, Eva_Misfit 40↑). Prevents re-asking + reduces decision context switching._
