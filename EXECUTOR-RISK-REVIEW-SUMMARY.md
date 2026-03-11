# Risk Review Summary — 18 Scenarios Identified

**Date:** 2026-03-10 13:28 ADT  
**Question:** "Are there other scenarios we should guard against?"  
**Answer:** Yes. 18 scenarios found. 5 are critical.

---

## Quick Overview

**Current state:** System works for happy path, but has edge cases that could cause:
- 🔴 Data loss (race conditions, overwrites)
- 🔴 Silent failures (invalid JSON, missing fields)
- 🔴 System crash (disk full from logs)
- 🟡 Lost work (orphaned Alfred queue)
- 🟡 Invisible stalls (Blocked cards pile up)

**Risk severity:** 5 🔴 High + 13 🟡 Medium = manageable, not catastrophic

---

## All 18 Scenarios

### Data Integrity (A1–A5)
1. **A1 — Malformed JSON** → crashes parsing → 🔴 High
2. **A2 — Concurrent writes corrupt state** → race condition → 🔴 High
3. **A3 — State file corruption (disk I/O)** → lost failure history → 🔴 High
4. **A4 — Missing card fields** → wrong dispatches → 🟡 Medium
5. **A5 — Card deleted mid-execution** → silent 404 → 🟡 Medium

### Execution & Dispatch (B1–B5)
6. **B1 — Alfred queue overwritten** → lost tasks → 🔴 High
7. **B2 — HAL dispatch succeeds but HAL never executes** → orphaned → 🟡 Medium
8. **B3 — Alfred never picks up queued tasks** → stuck forever → 🟡 Medium
9. **B4 — Mixed execution failures** → inconsistent progress → 🟡 Medium
10. **B5 — Dispatch timeout false negative** → duplicate execution → 🟡 Medium

### Infrastructure (C1–C4)
11. **C1 — Gateway flakiness (partial down)** → false positives → 🟡 Medium
12. **C2 — HAL process hung** → dispatch succeeds but no execution → 🟡 Medium
13. **C3 — DNS/IP changes** → permanent failures → 🟡 Medium
14. **C4 — Zombie processes** → resource exhaustion → 🟡 Medium

### Observability (D1–D2)
15. **D1 — Blocked cards pile up** → lost visibility → 🟡 Medium
16. **D2 — Logs fill disk** → system crash → 🔴 High

### Policy (E1–E2)
17. **E1 — Priority inversion** → wrong execution order → 🟡 Medium
18. **E2 — Stale Blocked cards** → deadlock → 🟡 Medium

---

## Critical Issues (🔴 Do First)

| ID | Issue | Impact | Fix Time | Status |
|----|-------|--------|----------|--------|
| A1 | Malformed JSON | Script crashes silently | 15 min | ⚠️ Not implemented |
| A2 | Concurrent writes | Lost failure history | 20 min | ⚠️ Not implemented |
| A3 | State file corruption | Data loss | 20 min | ⚠️ Not implemented |
| B1 | Queue overwrite | Lost tasks | 25 min | ⚠️ Not implemented |
| D2 | Logs fill disk | System crash | 15 min | ⚠️ Not implemented |

**Subtotal Phase 1:** ~95 minutes = ~2 hours with testing

---

## High-Priority Issues (🟡 Do Soon)

| ID | Issue | Impact | Fix Time | Timeline |
|----|-------|--------|----------|----------|
| A4 | Missing fields | Wrong dispatches | 10 min | Phase 1 |
| A5 | HTTP status codes | Silent 404 errors | 15 min | Phase 1 |
| B2 | Session tracking | Orphaned tasks | 30 min | Phase 2 |
| B3 | Queue timeout | Work stuck forever | 25 min | Phase 2 |
| B4 | Unified queue | Inconsistent status | 40 min | Phase 2 |
| B5 | Idempotency keys | Duplicate execution | 30 min | Phase 2 |
| C1 | Circuit breaker | False positives | 35 min | Phase 2 |
| C2 | HAL health check | Hung HAL undetected | 30 min | Phase 2 |
| C3 | Config-driven host | IP change breaks system | 20 min | Phase 3 |
| C4 | Process cleanup | Zombies accumulate | 25 min | Phase 3 |
| D1 | Block notification | Lost visibility | 20 min | Phase 3 |
| E1 | Priority ordering | Wrong execution | 25 min | Phase 3 |
| E2 | Stale cleanup | Deadlock | 30 min | Phase 3 |

**Subtotal Phase 2:** ~270 minutes = ~4.5 hours  
**Subtotal Phase 3:** ~95 minutes = ~2 hours

---

## Phasing Recommendation

### TODAY (Phase 1 — 2 hours)
Implement 5 critical fixes:
1. JSON schema validation (A1)
2. Atomic state writes (A2)
3. State file error handling (A3)
4. Alfred queue refactor (B1)
5. Log rotation (D2)

**Why:** Prevents data loss and system crashes. Non-blocking for deployment.

### THIS WEEK (Phase 2 — 4.5 hours)
Implement 8 high-priority fixes:
- Field validation + HTTP status checks (A4, A5)
- Session tracking for HAL (B2, B5)
- Queue timeout + cleanup (B3, B4)
- Circuit breaker for flaky gateway (C1)
- HAL health check (C2)

**Why:** Improves reliability. Prevents orphaned tasks and false positives.

### NEXT WEEK (Phase 3 — 2 hours)
Implement 5 medium-priority fixes:
- Config-driven hostnames (C3)
- Process cleanup (C4)
- Blocked card notifications (D1)
- Priority-based queue ordering (E1)
- Stale card expiration (E2)

**Why:** Nice-to-have improvements. Can run without these.

---

## Decision Matrix for Joe

**Question:** How much risk are you comfortable with?

| Risk Tolerance | Recommendation | Implementation |
|---|---|---|
| **Conservative** (minimize risk) | Implement all 3 phases | 8.5 hours total → do over 2 days |
| **Balanced** (manage critical risk) | Implement Phase 1 + Phase 2 | 6.5 hours total → do today + tomorrow |
| **Aggressive** (launch now) | Implement Phase 1 only | 2 hours → ready today |

---

## What Happens If We Skip Fixes?

### Skip Phase 1 (Critical)
- **Scenario:** Gateway is unstable, multiple crons overlap, card queue builds
- **Result:** Corrupted state file, lost failure history, disk fills, cards stuck forever
- **Probability:** Low but possible
- **Damage:** High (data loss, system crash)

### Skip Phase 2 (High)
- **Scenario:** HAL is hung, Alfred queue grows, gateway flakes intermittently
- **Result:** Cards block prematurely, orphaned tasks, inconsistent execution
- **Probability:** Medium
- **Damage:** Medium (lost work, false blocking)

### Skip Phase 3 (Medium)
- **Scenario:** Cards accumulate in Blocked, priorities get inverted, old cards stuck
- **Result:** Board becomes noisy, work in wrong order, deadlock
- **Probability:** High (will happen eventually)
- **Damage:** Low (fixable manually)

---

## My Recommendation

**Implement Phase 1 today** (2 hours).

It blocks the real catastrophic risks (data loss, system crash). System can work with Phase 2/3 pending.

Once Phase 1 is live:
- Monitor for 24h
- Run Phase 2 this week (if everything stable)
- Run Phase 3 next week (nice-to-haves)

---

## Documents for Reference

1. **KANBAN-EXECUTOR-RISK-ANALYSIS.md** — Full 18-scenario breakdown (17K)
2. **PHASE-1-CRITICAL-FIXES.md** — Implementation guide for 5 critical fixes (12K)
3. **KANBAN-EXECUTOR-VERIFICATION.md** — Current safeguards (11K)
4. **KANBAN-EXECUTOR-SAFEGUARDS.md** — Architecture & design (13K)

---

## Next Steps

**If you approve Phase 1:**
1. I'll implement the 5 critical fixes (2 hours)
2. Test with current Kanban state
3. Update cron job to use new script
4. Monitor logs for 24h
5. Report results + proceed to Phase 2

**If you want Phase 1 + Phase 2:**
1. Implement Phase 1 (2 hours)
2. Test (30 min)
3. Implement Phase 2 (4.5 hours)
4. Full integration test (1 hour)
5. Deploy by EOD

**If you want something else:**
- Prioritize differently? (e.g., focus on B2 for HAL reliability?)
- Accept some risk? (skip certain categories?)
- Different timeline? (spread over longer period?)

---

## Summary for Decision

**Risk found:** 18 scenarios, 5 critical  
**Recommendation:** Phase 1 today (2 hours) = blocks catastrophic risks  
**Impact if done:** Data loss prevented, system stable, ready for Phase 2  
**Impact if skipped:** Potential data corruption, disk full, lost work  

**Ready to implement Phase 1, or discuss further?**
