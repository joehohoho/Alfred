# NOW.md — Session Checkpoint

**Last Updated:** 2026-03-16 05:10 ADT  
**Session ID:** main  
**Status:** idle (no active tasks)

---

## Situational Awareness

- **Workspace:** Clean (6 modified tracking files, all committed)
- **Memory system:** Operational post-compression fix
- **Kanban board:** 2 in_progress (stalled), 5 in review (waiting Joe approval)
- **Cron jobs:** Partially operational; 5 jobs disabled due to Discord routing (known issue)

---

## Known Issues to Surface

1. **Cron Auto-Disable Pattern** (recurring Mar 10, 12, 15)
   - Root: Discord channel delivery config with invalid IDs
   - Fix: Set `delivery.mode: "none"` + re-enable manually
   - Affects: Daily Config, Evening Routine, Daily Inquiry, Nightly Git, Joe Profile Reflection
   - Status: Need batch re-enable once channel IDs validated

2. **ACTIVE-TASK.md Sync Drift**
   - Script `sync-pending-questions.sh` failing (marker format mismatch)
   - Affects: Checkpoint refresh reliability
   - Workaround: Manual pending-questions file write after checkpoints

---

## Next Session

- Validate Discord channel IDs for 5 disabled cron jobs
- Re-enable cron jobs in batch (avoid cascade failures)
- Repair ACTIVE-TASK.md marker format in sync script
