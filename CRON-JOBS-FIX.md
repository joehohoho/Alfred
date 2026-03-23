# Cron Jobs Auto-Disable Fix (2026-03-17, FIXED 2026-03-23 20:15)

## Root Cause
**5 cron jobs auto-disabled due to Discord channel routing failures:**
- `delivery.mode="announce"` + invalid Discord channel IDs → gateway can't route → 3 consecutive failures → auto-disable

## Affected Jobs (FIXED ✅)
1. **Evening Routine** (2feb9515) → Updated to Slack `C0AEE0PLKB4` (#notifications) ✅
2. **Daily Config & Memory Review** (3a45acd2) → Updated to Slack `C0AH1L4BRUG` (#daily-config) ✅
3. **Nightly Git Commit** (21454f7a) → Updated to Slack `C0AEE0PLKB4` (#notifications) ✅
4. **Joe Profile Reflection** (a3e7c1d9) → Updated to Slack `C0ADUCZ4AF3` (#commands) ✅

**Remaining Issues (Lower Priority):**
- **Daily Update Check** (1e33752f) → `delivery.mode="none"` (silent execution, no routing needed)
- **Moltbook Weekly Review** (1ee0d578) → `delivery.mode="none"` (no routing needed)

## Solution
**Strategy (historical):** This document originally switched Discord announce deliveries to Slack as a temporary stabilization path.

**Current policy update (2026-03-20):** Slack is deprecated for active operations. Prefer Discord-only routing with explicit `delivery.channel="discord"` + explicit `delivery.to` channel IDs from allowlist.

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
