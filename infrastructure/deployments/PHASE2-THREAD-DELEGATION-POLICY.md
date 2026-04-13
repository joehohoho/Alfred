# Phase 2 — Thread-First + Delegation Enforcement Policy

Date: 2026-03-20
Status: Active
Owner: Alfred

## Objectives
1. Enforce thread-first operations for major work categories.
2. Enforce delegation threshold: multi-step/long tasks should not execute inline in main orchestration flow.
3. Keep explicit model-per-task recommendations aligned to risk/cost.
4. Fail safely when policy checks fail (no silent bypass).

---

## Thread Taxonomy (Canonical)
- **infra**: gateway/config/cron/reliability/security hardening.
- **coding**: implementation/refactor/test/build/review.
- **research**: analysis/comparison/requirements/discovery.
- **ops**: monitoring/health checks/incidents/backfills.
- **reminders**: schedules/follow-ups/check-ins.
- **general**: uncategorized lightweight interactions.

Routing rule:
- If task is non-trivial (estimated steps >= 3), assign to a category thread/session.
- Main session remains orchestrator; work happens in specialized execution contexts.

---

## Delegation Threshold Rule
A task is **must-delegate** when any of the following is true:
- estimated steps >= 3
- explicit multi-step wording ("multi-step", "end-to-end", "across modules")
- coding/refactor/build/integrate keywords
- expected runtime > 10s (proxy by complexity/keywords)

If must-delegate=true and policy mode is strict:
- block inline execution path
- route through HAL/ACP/sub-agent workflow

---

## Model-Per-Task Recommendations
- **ops/reminders/general**: LOCAL/Haiku tier first
- **research**: Haiku default; escalate Sonnet for deep synthesis
- **coding**: Codex/HAL path first; escalate Sonnet for cross-module/high-complexity
- **infra/security**: Sonnet or stronger for high-risk decisions, with approval gates

---

## Safety Guardrails
Required for policy-managed tasks:
1. Preflight check before execution
2. Explicit fallback route on failure
3. Rollback note for meaningful changes
4. Post-change validation summary
5. Notification dedupe for repeated failures

Hard-fail conditions:
- Missing thread category on must-delegate tasks
- Must-delegate task attempted inline in strict mode
- High-risk + external action without approval

---

## Integration Points
- `scripts/task-routing-policy.sh` => classification + delegation decision
- `scripts/recommendations-preflight.sh` => validates policy engine outputs
- `OPENCLAW-OPTIMIZATION-CHECKLIST.md` => weekly enforcement cadence

---

## Rollback
- Remove policy script and references in preflight
- Keep checklist notes but set policy mode to audit-only
