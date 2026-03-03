# ACTIVE-TASK.md - Current Work In Progress

**Status:** project-manager
**Last Updated:** 2026-03-02 22:00 AST
**Primary Role:** HAL Utilization Manager & Project Coordinator
**Current Assignment:** webpack→Vite migration (run ID c7d22601-7287-4271-8a35-3ed10b0ff29f, dispatched Mar 2 15:48)
**Approach:** Coordinate HAL on high-complexity work, handle tactical tasks, review deliverables

## State
**Alfred's Current Work:**
- Role: Project Manager for HAL utilization
- HAL Status: ACTIVE (webpack→Vite migration, run ID c7d22601-7287-4271-8a35-3ed10b0ff29f)
- HAL ETA: Mar 3, 2026 (2-4 hours from dispatch Mar 2 15:48)
- Previous: Even Us Up growth audit (completed Mar 2)
- Next in Queue: HST/GST Phase 2 or Channel expansion pilot (awaiting HAL completion)
- Pending Questions: 3 unresponded (from notifications)
- Context: ~28%
- Blockers: 2 stale in_progress kanban cards (awaiting Joe clarification)

## Recent Context (Mar 2, Morning)
- Rate limit death spiral resolved — root cause was 1MB+ Discord channel sessions
- Session cleanup hardened: 200KB file cap, 48h channel TTL, 40 session cap
- Gateway watchdog with progressive backoff: 10 → 20 → 40 → 60 min cooldowns
- Discord `replyToMode: "first"` enabled for thread isolation
- 9 broken Discord webhook deliveries removed from crons
- Pre-work kanban comment protocol added to AGENTS.md

## Alfred's Project Manager Duties (Weekly Cycle)

### Monday 9:00 AM (Starting Mar 3)
- [ ] Check if HAL idle (review subagent status)
- [ ] Scan kanban `todo` for high-complexity work
- [ ] Score top 3 candidates via routing script
- [ ] Dispatch HAL to next high-priority task
- [ ] Post kanban assignment comment

### Daily 3:00 PM
- [ ] Check for HAL completion announcement
- [ ] Review HAL's commit if complete
- [ ] Approve + move card to done
- [ ] Post status update to kanban/Discord

### Blocking Issues
- [ ] If HAL blocked → escalate to Joe immediately
- [ ] If kanban stale → re-dispatch or move to blocked

---

## Pending Approvals

### CoinUsUp
- `662c11b` — security: resolve npm vulnerabilities via serialize-javascript override (**READY FOR REVIEW**)
  - Fixed 4 npm vulnerabilities (serialize-javascript RCE via GHSA-5c6j-r48x-rmvq)
  - Added serialize-javascript >=7.0.3 to package.json overrides
  - Build tested successfully, 0 vulnerabilities remaining
- `b6f8b08` — remove @capacitor/assets devDep
- `b1f78c5` — add GitHub Actions CI workflow

### Pending Questions
<!-- PENDING-Q-START -->
- **⚠️ Stale card escalated: "Channel expansion pilot (affiliates/partners/content)"** (_question_, Mar 01 21:01)
  ID: `notif_1772398863541_2f663b83` — Card "Channel expansion pilot (affiliates/partners/content)" (task_1772199318344_19e8fa66) has been in_progress for 6h with no updates. A re-dispatch ...

- **What's the #1 thing slowing down Signal App right now?** (_question_, Mar 02 14:00)
  ID: `notif_1772460000220_a86559b3` — Not looking for a full status update — just one honest sentence: what's the current bottleneck on Signal App? Is it data quality, time, a specific tec...

- **Blocker on card** (_kanban-blocked_, Mar 03 00:59)
  ID: `notif_1772499564127_181afa42` — CoinUsUp Growth Audit has been in_progress for 11h with no updates. Description is vague ('Test'). What specific audit/analysis needs to happen? Is th...
<!-- PENDING-Q-END -->
