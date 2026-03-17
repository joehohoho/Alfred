# Cron Jobs Auto-Disable Fix (2026-03-17)

## Root Cause
**5 cron jobs auto-disabled due to Discord channel routing failures:**
- `delivery.mode="announce"` + invalid/missing Discord channel IDs → gateway can't route → 3 consecutive failures → auto-disable

## Affected Jobs (DISABLED)
1. **Evening Routine** (2feb9515) → Discord `to: 1476945255331791060` (invalid)
2. **Daily Config & Memory Review** (3a45acd2) → Discord `to: 1476944218751635609` (invalid)  
3. **Nightly Git Commit** (21454f7a) → Discord `to: 1476951511736258722` (invalid)
4. **Daily Update Check** (1e33752f) → Discord `to: 1476951029659734139` (invalid)
5. **Joe Profile Reflection** (a3e7c1d9) → Discord `to: 1476590410557034546` (valid, but "Channel is required" error indicates sessionTarget/channel mismatch)

**Additional Issues:**
- **Daily Config & Memory Review** also failed with "Error: Unknown Channel"
- **Moltbook Weekly Review** (1ee0d578) → failing with channel routing error (enabled but non-functional)

## Solution
**Strategy:** Switch all Discord announce deliveries to Slack (stable, verified channel IDs).

**Slack channels configured & available:**
- `C0ADCTD7S2D` — #general
- `C0ADUCZ4AF3` — #commands
- `C0AELHDE84Q` — #discussion
- `C0AE72DKGCQ` — #code-review
- `C0AEA8LMEUD` — #ai-logs
- `C0AEE0PLKB4` — #notifications
- `C0AF64H7FDF` — #updates
- `C0AH1L4BRUG` — #daily-config
- `C0AHET5GMUY` — #weather-alerts

### Recommended Mappings:
- **Evening Routine** → `C0AEE0PLKB4` (#notifications)
- **Daily Config & Memory Review** → `C0AH1L4BRUG` (#daily-config)
- **Nightly Git Commit** → `C0AEE0PLKB4` (#notifications)
- **Daily Update Check** → `C0AF64H7FDF` (#updates)
- **Joe Profile Reflection** → `C0ADUCZ4AF3` (#commands) or `C0AELHDE84Q` (#discussion)
- **Moltbook Weekly Review** → `C0AELHDE84Q` (#discussion)

## Implementation
For each disabled job:
1. Update delivery config: `delivery.mode="announce"`, `delivery.channel="slack"`, `delivery.to="<slack_channel_id>"`
2. Re-enable the job
3. Verify next execution

## Prevention
- **All future cron jobs with deliver mode "announce"** MUST specify explicit Slack channel ID
- Alternative: Use `delivery.mode="none"` for jobs that don't need announcements (silent execution)
- Document channel mappings in CRON-JOBS-FIX.md (this file) for future reference
