# ACTIVE-TASK.md - Current Work In Progress

**Status:** idle
**Last Updated:** 2026-02-27 22:00 AST

## State
Friday evening routine complete. HAL proactive pool fully cycled (16 tasks). No active in-progress work.

### Pending Questions
<!-- PENDING-Q-START -->
- **Blocker on card** (_kanban-blocked_, Feb 27 20:02)
  ID: `notif_1772222573811_15aaf634` — Dependency updates applied (lockfile updated via npm update --legacy-peer-deps) and build passes, but lint fails with 206 pre-existing errors across a...

- **Blocker on card** (_kanban-blocked_, Feb 27 20:03)
  ID: `notif_1772222596530_195c0f1e` — Pilot is blocked on launch inputs/approval for external actions. Need: (1) choose 1-2 channels (affiliates, partners, content), (2) weekly test budget...

- **Blocker on card** (_kanban-blocked_, Feb 28 03:01)
  ID: `notif_1772247698673_344350bf` — Cannot start without Joe approving: (1) which app to focus on, (2) which channels to test, (3) budget ceiling. Joe indicated in chat he is not familia...
<!-- PENDING-Q-END -->

## Pending Joe Decisions
1. CoinUsUp git history scrub (.env in history) — approve `git filter-repo` + force push?
2. CoinUsUp stale remote branches — delete `origin/GetStarted` + `origin/group-email`?
3. CoinUsUp tracked build artifacts — approve `git rm --cached android/.gradle/ android/app/build/`?
4. Command Center → Vite migration (CRA CVEs) — create Kanban card?
5. CoinUsUp: Queue critical React fixes (hook-in-render violations)?
6. CoinUsUp: Start Capacitor v6→v8 plugin update?

## Infrastructure Issues (Kanban cards exist)
- HAL subagent spawn staggering (urgent)
- Fix sync-pending-questions.sh ACTIVE-TASK.md write failure
- Session file archival cron (2939 files, 79MB)

## Next Scheduled Work
- Morning HAL dispatch cycle
- Act on any Joe approvals from above list
