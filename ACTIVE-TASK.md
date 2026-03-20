# ACTIVE-TASK.md — Current Work State

**Status:** `in_progress`  
**Started:** 2026-03-19 12:38 ADT  
**Objective:** Implement policy-as-code guardrail tests for automation/cron entrypoints (goal_1773934119740_1bc964b9)

---

## Chosen Approach
1. Add shared `scripts/policy-preflight.sh` with fail-closed evaluation + structured audit logging.
2. Enforce core checks:
   - quiet-hours direct-notification block (`no_direct_dm`, shared channels allowed)
   - external-action approval gate
   - forbidden-file denylist guard
   - duplicate-run dedup key window
3. Add audit-only coverage ledger and a daily/adhoc report generator for scripts not invoking preflight.
4. Hook representative cron entrypoints into preflight and add shell tests.
5. Validate with dry-run tests and document usage.

## Progress
- [x] Assignment accepted and execution started
- [ ] Implement `scripts/policy-preflight.sh`
- [ ] Add coverage report script
- [ ] Integrate into cron entrypoints
- [ ] Add tests and run validation
- [ ] Post completion summary and move card to review

## Next Step
Build `scripts/policy-preflight.sh` and baseline policy config constants.

## Pending Questions
<!-- PENDING-Q-START -->
- **⚠️ Stale card escalated: "Mission Control Phase 1: Stability & Visibility"** (_question_, Mar 17 06:00)
  ID: `notif_1773727251618_e604f69d` — Card "Mission Control Phase 1: Stability & Visibility" (task_1773672258312_393a575f) has been in_progress for 7h with no updates. A re-dispatch was at...

- **⚠️ Stale card escalated: "Implement 14-day free trial on Basic/Pro tiers"** (_question_, Mar 18 15:00)
  ID: `notif_1773846049925_5c244c9d` — Card "Implement 14-day free trial on Basic/Pro tiers" (task_1773156748695_23b9e471) has been in_progress for 7h with no updates. A re-dispatch was att...

- **Codex Token Expiring** (_system_, Mar 19 16:17)
  ID: `notif_1773937039969_d7cc71ad` — Codex OAuth token expires in -1h. Refresh via: openclaw models auth login --provider openai-codex
<!-- PENDING-Q-END -->
