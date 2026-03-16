# CRON Jobs Auto-Disable Pattern — FIX GUIDE

**Issue:** 6 cron jobs repeatedly fail with "Channel is required when multiple channels are configured" error.

**Root cause:** Jobs have `delivery.mode="announce"` + `channel="discord"` but missing explicit `to` (channel ID).

**Affected jobs (auto-disabled Mar 15):**
1. `Moltbook Weekly Review` (ID: 1ee0d578)
2. `Daily Update Check` (ID: 1e33752f)
3. `Nightly Git Commit` (ID: 21454f7a)
4. `Evening Routine` (ID: 2feb9515)
5. `Daily Config & Memory Review` (ID: 3a45acd2)
6. `Joe Profile Reflection` (ID: a3e7c1d9)

**Quick Fix for Each:**
Use `cron action=update` to add explicit Discord channel IDs to `delivery.to`.

**Example (Evening Routine):**
```bash
cron action=update jobId=2feb9515 patch='{"delivery":{"mode":"announce","channel":"discord","to":"1476945255331791060"}}'
```

**Channel ID Reference (from current delivery configs):**
- `#general` / default channel: `1476945255331791060`
- `#evening-routine`: `1476945255331791060` (mapped)
- `#daily-config`: `1476944218751635609`
- `#moltbook`: (TBD — check Discord)
- `#joe-profile`: `1476590410557034546`

**When to use:**
- Only jobs that explicitly call `announce delivery` or post to Discord
- jobs using systemEvent (main session) don't need channel config
- jobs using agentTurn (isolated) can omit if delivery.mode="none"

**Follow-up:** Run `cron list` to verify all 6 are re-enabled after fix.

---

**Alternative (simpler):** Just disable delivery on jobs that don't need it, OR silence their announce mode (delivery.mode="none").
