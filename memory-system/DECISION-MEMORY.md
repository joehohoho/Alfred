# Decision Memory System

**Effective:** 2026-03-09  
**Status:** ✅ LIVE  
**Purpose:** Preserve strategic decisions + prevent repeated questioning

---

## Problem Solved

**Before:** Same questions asked repeatedly (passive income targets Feb 20→24→28, synergies Feb 23→27). Joe re-answers. Decisions scatter across daily logs, notification replies, comments. Alfred can't distinguish new questions from old ones.

**After:** Single source of truth for all decisions. Decisions logged + indexed. Decision guard prevents re-asking within review period.

---

## Quick Start

### Logging a Decision (Alfred)

When Joe answers a pending question:
```bash
bash scripts/log-decision.sh \
  "Passive Income Targets" \
  "\$10k/month by Q2 (April-May)" \
  "Market Signal Lab + app growth can hit this target" \
  "2026-04-10"
```

This:
1. ✅ Creates entry in `decisions/2026-03.md`
2. ✅ Updates `decisions/INDEX.md`
3. ✅ Marks decision as decided + sets review date

### Checking Before Asking (Alfred)

Before posting a question to Joe:
```bash
bash scripts/check-decision-guard.sh "Passive Income Targets"
```

Returns:
- ✅ **Safe to ask** — Question not in log, or review date passed
- ⏳ **Pending** — Already asked, Joe hasn't answered yet
- ❌ **Active** — Already decided, don't re-ask until review date

---

## Architecture

### Monthly Decision Files (`decisions/YYYY-MM.md`)

One file per month. Contains all decisions made that month.

**Format:**
```markdown
## Decision: [Title]
**Date asked:** [when Alfred first asked]
**Date decided:** [when Joe answered]
**Decided by:** Joe
**Decision:** [Joe's answer]
**Why:** [Joe's reasoning]
**Implication:** [What this affects]
**Review date:** [When to revisit]
**Status:** ✅ DECIDED (or ⏳ PENDING)
```

**Example:**
```markdown
## Decision: Passive Income Targets
**Date asked:** 2026-02-20
**Date decided:** 2026-03-10
**Decided by:** Joe
**Decision:** $10k/month by Q2 (April-May)
**Why:** Market Signal Lab + app growth combo can hit this
**Implication:** Affects HAL prioritization of CoinUsUp vs Even Us Up
**Review date:** 2026-04-10
**Status:** ✅ DECIDED (do NOT re-ask before 2026-04-10)
```

### Decision Index (`decisions/INDEX.md`)

Quick reference: all active + pending decisions at a glance.

| Decision | Asked | Decided | Review | Status |
|----------|-------|---------|--------|--------|
| Passive Income Targets | 2026-02-20 | 2026-03-10 | 2026-04-10 | ✅ DECIDED |
| App Growth Strategy | 2026-02-27 | PENDING | — | ⏳ Awaiting answer |

**Updated automatically by `update-decision-index.sh`** whenever a decision is logged.

### Decision Guard (`scripts/check-decision-guard.sh`)

Integrated into daily inquiry + any question-asking flow.

**Logic:**
```
Before asking question:
  1. Search decisions/*.md for this question title
  2. If found:
     a. If status = "PENDING" → skip (already asked, awaiting answer)
     b. If review_date < today → OK to re-ask (review period passed)
     c. If review_date >= today → skip (still active, don't re-ask)
  3. If not found → OK to ask (new question)
```

**Used by:**
- `scripts/daily-inquiry.sh` — Before posting daily questions
- Manual ask flows — Before sending notifications to Joe
- Weekly review cron — Identify overdue pending decisions

---

## Decision Lifecycle

### Phase 1: Question Asked (by Alfred)

Alfred wants to know something strategic. Posts to Joe via Command Center notification.

**State:** ⏳ PENDING  
**File:** `decisions/YYYY-MM.md` with status ⏳ PENDING  
**Guard:** Prevents re-asking same question within 7 days  
**Timeout:** If no answer in 7 days → escalate to Joe

### Phase 2: Joe Answers

Joe replies (in notification, Slack comment, or direct message).

**Action:** Alfred logs answer to decision file:
```bash
bash scripts/log-decision.sh "Question Title" "Answer text" "Why" "Review date"
```

**State:** ✅ DECIDED  
**File:** Updated with decision + Joe's reasoning  
**Review date:** Set to 1 month out (customizable)  
**Guard:** Prevents re-asking until review date passes

### Phase 3: Active Decision

Decision is live. Alfred references it for strategy + won't re-ask.

**State:** ✅ DECIDED (active)  
**Re-ask protection:** Until review_date  
**Used for:** Strategic continuity, HAL prioritization, roadmap decisions  
**Weekly review:** Friday 3 PM — Alfred checks if any decisions are overdue for review

### Phase 4: Review

Review date arrives. Alfred asks: Should we revisit this decision?

**Options:**
1. ✅ **Confirm** — Decision still valid, extend review date
2. 🔄 **Revise** — Update decision based on new info
3. ❌ **Override** — New decision supersedes old one
4. 📁 **Archive** — Move to previous month section

**Action:** Post to Joe via Command Center on Friday 3 PM:
```
📊 Weekly Decision Review

Active decisions review for March 2026:
- Passive Income Targets (review date: 2026-04-10) — still valid? Override? Archive?
- Market Signal Lab Scope (review date: 2026-04-08) — still valid?

Let me know if anything needs revisiting.
```

---

## Integration Points

### With Daily Inquiry

In `scripts/daily-inquiry.sh`, before posting a question:
```bash
# Check if question was recently decided
bash scripts/check-decision-guard.sh "$QUESTION_TEXT" || {
  echo "⏭️  Skipping (already decided or pending)"
  exit 0
}

# Question is safe to ask
bash send-notification.sh "question" "$TITLE" "$QUESTION" ...
```

### With HAL Dispatcher

When a task decision is made (e.g., "prioritize CoinUsUp in Q2"):
```bash
bash scripts/log-decision.sh \
  "Q2 App Priority: CoinUsUp" \
  "Focus CoinUsUp for Q2, Even Us Up in Q3" \
  "Higher revenue potential + market timing" \
  "2026-04-10"
```

Dispatcher then uses this to prioritize cards:
```bash
# HAL queue prioritization
if grep -q "CoinUsUp" decisions/2026-03.md; then
  prioritize_cards_by_app "CoinUsUp" 1
fi
```

### With Kanban Board

Decision decisions can be linked from kanban cards:
```
## Card: CoinUsUp iOS Refactor
**Depends on:** Decision "Q2 App Priority" (decisions/2026-03.md)
```

If decision changes, card may need re-prioritization.

---

## Decision Guard: Detailed Logic

**Scenario 1: Asking a new question**
```bash
bash scripts/check-decision-guard.sh "Market Timing Strategy"

Output: ✅ Question not in log — safe to ask
```

**Scenario 2: Question already decided, review date not yet passed**
```bash
bash scripts/check-decision-guard.sh "Passive Income Targets"

Output: ❌ Question decided 2026-03-10, review date 2026-04-10 — skip (still active)
```

**Scenario 3: Question decided, review date passed**
```bash
bash scripts/check-decision-guard.sh "Passive Income Targets"
# (if today >= 2026-04-10)

Output: 🔄 Review date passed — OK to re-ask (see if decision still holds)
```

**Scenario 4: Question asked but not yet answered**
```bash
bash scripts/check-decision-guard.sh "CoinUsUp Marketing Budget"
# (if decision file shows status ⏳ PENDING)

Output: ⏳ Question asked 2026-02-28, still pending — skip (awaiting answer)
```

---

## Rules & Constraints

### No Re-Asking (Active Decisions)

Once a question is decided, Alfred does NOT ask it again until review date passes.

**Rationale:** Joe sets review date (default: 1 month). If decision needs revisiting sooner, Joe proactively updates it.

### Decision Immutability

Once logged, decisions are never modified retroactively. If Joe's mind changes:
1. Create NEW decision entry with same title + "updated"
2. Old entry remains (shows decision history)
3. New entry supersedes for active use

**Example:**
```markdown
## Decision: Q2 Growth Target
**Date asked:** 2026-02-20
**Date decided:** 2026-03-10
**Decision:** $10k/month by end of Q2
**Status:** ✅ DECIDED
**Review date:** 2026-04-10

---

## Decision: Q2 Growth Target (REVISED)
**Date asked:** 2026-04-08
**Date decided:** 2026-04-09
**Decision:** $15k/month by end of Q2 (updated based on Market Signal Lab results)
**Status:** ✅ DECIDED
**Review date:** 2026-05-10
```

### Weekly Review (Friday 3 PM)

Automated cron posts to Joe every Friday:
```
📊 Weekly Decision Review

Decisions in March 2026:
- 4 made ✅
- 0 pending ⏳
- 0 overdue for review 🔴

Next decisions review: 2026-04-10
```

If any pending decisions are >7 days old, flag them:
```
🔴 **OVERDUE DECISION**
Question "CoinUsUp Feature Priority" asked 2026-02-28, still pending (9 days).
Resending to Joe for quick answer.
```

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **No repeat questions** | 0 re-asks within review period | Guard catch rate |
| **Decision logging** | 100% of Joe answers logged | Decision file completeness |
| **Active/Pending clarity** | <5% ambiguous status | INDEX.md accuracy |
| **Review timeliness** | <2 days late on review date | Cron execution log |

---

## Files & Scripts

| File | Purpose |
|------|---------|
| `decisions/YYYY-MM.md` | Monthly decision log (one per month) |
| `decisions/INDEX.md` | Quick reference index (auto-updated) |
| `scripts/log-decision.sh` | Log a Joe answer to decision system |
| `scripts/update-decision-index.sh` | Rebuild index from monthly files |
| `scripts/check-decision-guard.sh` | Check if safe to ask question |

---

## Examples

### Example 1: Logging a Decision

Joe answers in Slack:
```
@Alfred: Q2 focus is CoinUsUp. Launch features before Even Us Up refresh.
Budget: 60% HAL time to CoinUsUp, 40% Even Us Up. Review in April.
```

Alfred logs:
```bash
bash scripts/log-decision.sh \
  "Q2 App Priority" \
  "CoinUsUp 60%, Even Us Up 40% HAL time. CoinUsUp features launch first." \
  "Higher revenue potential + market timing for CoinUsUp. Even Us Up gets refresh in Q3." \
  "2026-04-10"
```

Result:
```
✅ Decision logged: Q2 App Priority
   Answer: CoinUsUp 60%, Even Us Up 40% HAL time...
   Review: 2026-04-10
🔄 Updating decision index...
✅ Complete! Decision is live in decisions/2026-03.md
```

### Example 2: Guard Prevents Re-Ask

Daily inquiry wants to ask about app priorities:

```bash
# Before asking
bash scripts/check-decision-guard.sh "Q2 App Priority"

Output: ❌ Question decided 2026-03-10, review date 2026-04-10 — skip (still active)

# Daily inquiry exits early, doesn't ask Joe
```

### Example 3: Weekly Review

Friday 3 PM cron fires. Alfred posts to Joe:

```
📊 Weekly Decision Review (March 2026)

**Decisions made:** 4 ✅
- Passive Income Targets (review: 2026-04-10)
- Q2 App Priority (review: 2026-04-10)
- Market Signal Lab Scope (review: 2026-04-08)
- Reliability Infrastructure (review: 2026-04-09)

**Pending:** 0 ⏳

**Overdue:** 0 🔴

Anything need revisiting or override?
```

---

## Related Documentation

- **OPEN-LOOPS.md** — Unified view of pending work (updated daily)
- **HANDOFF-PROTOCOL.md** — Formal task contracts before delegation
- **AGENTS.md** — Core operating manual (references this system)
- **MEMORY.md** — Long-term memory philosophy (this is implementation)

---

**Document version:** 1.0 (2026-03-09)  
**Maintained by:** Alfred  
**Last updated:** 2026-03-09
