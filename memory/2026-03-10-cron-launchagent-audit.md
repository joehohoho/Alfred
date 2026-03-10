# Cron & LaunchAgent Audit — 2026-03-10

## Critical Findings

### Discovery 1: HAL Idle Dispatch IS Handled by LaunchAgent (But Disabled)
- **LaunchAgent:** `com.alfred.hal-idle-dispatch.plist` exists (dated Feb 28)
- **Status:** NOT LOADED (launchctl shows "- 0")
- **What it does:** Runs every 900 seconds (15 min), calls `hal-idle-dispatch-cron.sh`
- **Real issue:** HAL remote gateway (192.168.2.79:18789) is unreachable
  - 671+ consecutive connection failures since at least 4 AM this morning
  - Script has exponential backoff (attempts only 1/4th after 3+ failures to avoid hammering)

### Discovery 2: Disabled Cron Jobs — NO LaunchAgents Found
Searched LaunchAgents for these disabled cron jobs:
- Evening Routine (disabled)
- Nightly Git Commit (disabled)
- Daily Config & Memory Review (disabled)
- Morning Brief (disabled)
- Daily Goal Analysis (disabled)
- Daily Update Check (disabled)

**Result:** No LaunchAgent plist files found for any of them.

**Interpretation:** These should be re-enabled via the cron system (not LaunchAgent-backed).

### Discovery 3: Discord Channel URLs Documented
Found complete webhook list in `/Users/hopenclaw/Documents/Discord URLs.txt`:
- evening-routine → dedicated webhook
- nightly-git → dedicated webhook
- config-and-memory-review → dedicated webhook
- morning-routine → dedicated webhook
- goals-analysis → dedicated webhook
- openclaw-updates → dedicated webhook

## Fix Strategy

### Problem A: HAL Idle Dispatch LaunchAgent Disabled
- LaunchAgent exists but not loaded
- Remote HAL gateway is offline
- **Fix:** Either (1) load the LaunchAgent + wake HAL, or (2) switch to cron with local safeguards

### Problem B: 7 Cron Jobs Disabled (Missing Discord Channel in Delivery Config)
- All disabled for same reason: missing `delivery.channel` + webhook URL
- Discord URLs are now known
- **Fix:** Re-enable via cron with correct delivery config (webhook URLs)

### Problem C: Kanban Work Execution Not Triggering
- Kanban Idle Loop runs hourly ✅
- But Alfred itself never executes work picked from the loop
- **Fix:** Trace the execution pathway to see where it breaks

## HAL Gateway Status
- **Remote IP:** 192.168.2.79:18789
- **Last successful contact:** Unknown (may be offline or on different network)
- **Action:** Need to confirm HAL machine is reachable before loading LaunchAgent
