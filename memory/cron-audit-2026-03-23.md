# Cron Audit Report — 2026-03-23 12:02 ADT

## Overview
- **Total cron jobs:** 29
- **Jobs with `announce` mode:** 8
- **Jobs with explicit `delivery.to` (channel ID):** 5
- **Jobs WITHOUT explicit `delivery.to`:** 3 ⚠️
- **Auto-disabled jobs:** 5 🚨

---

## At-Risk Jobs (announce mode + missing explicit `delivery.to`)

These are the exact jobs causing the auto-disable pattern:

### 1. Evening Routine
- **Job ID:** `2feb9515-e8a2-4c00-a912-dca8abf86382`
- **Schedule:** 22:00 (10 PM) daily
- **Status:** AUTO-DISABLED (2026-03-19 11:04:36) — "4 consecutive failures"
- **Delivery config:**
  ```json
  "delivery": {
    "mode": "announce",
    "channel": "discord",
    "to": "1476598143016505446"
  }
  ```
- **Analysis:** Has explicit channel ID `1476598143016505446` BUT job is auto-disabled
  - Last error: "⚠️ ✉️ Message failed"
  - **Fix needed:** Verify channel ID is valid; re-enable and test

### 2. Daily Config & Memory Review
- **Job ID:** `3a45acd2-a2a7-4edd-8a53-03bac1768deb`
- **Schedule:** 07:00 (7 AM) daily
- **Status:** AUTO-DISABLED (2026-03-22 00:43:26) — "3 consecutive failures"
- **Delivery config:**
  ```json
  "delivery": {
    "mode": "announce",
    "channel": "discord",
    "to": "1476598143016505446"
  }
  ```
- **Analysis:** Same channel ID as Evening Routine; also auto-disabled
  - **Fix needed:** Verify channel; re-enable and test

### 3. Daily Update Check
- **Job ID:** `1e33752f-370b-429d-9ba3-8b56126c6f56`
- **Schedule:** 12:00 (noon) daily
- **Status:** AUTO-DISABLED (2026-03-17 16:22:02) — "3 consecutive failures"
- **Delivery config:**
  ```json
  "delivery": {
    "mode": "none",
    "channel": "slack",
    "to": "C0AF64H7FDF"
  }
  ```
- **Analysis:** Uses Slack (deprecated platform); no Discord routing
  - **Fix needed:** Route to Discord instead; re-enable

### 4. Joe Profile Reflection
- **Job ID:** `a3e7c1d9-8f42-4b6a-9e15-d7c8a2f50b31`
- **Schedule:** Wed & Sun @ 22:00 (10 PM)
- **Status:** AUTO-DISABLED (2026-03-19 11:04:36) — "3 consecutive failures"
- **Delivery config:**
  ```json
  "delivery": {
    "mode": "announce",
    "channel": "discord",
    "to": "1476598143016505446"
  }
  ```
- **Analysis:** Same channel ID pattern; auto-disabled
  - **Fix needed:** Verify channel; re-enable and test

### 5. Nightly Git Commit
- **Job ID:** `21454f7a-f8b4-4c06-8866-ccee37381031`
- **Schedule:** 23:00 (11 PM) daily
- **Status:** AUTO-DISABLED (2026-03-17 16:22:02) — "3 consecutive failures"
- **Delivery config:**
  ```json
  "delivery": {
    "mode": "announce",
    "channel": "discord",
    "to": "1476598143016505446"
  }
  ```
- **Analysis:** Same channel ID; auto-disabled
  - **Fix needed:** Verify channel; re-enable and test

---

## Channel ID Validation

**Suspect channel:** `1476598143016505446`

This channel ID appears in MOST failing jobs. Need to verify:
1. Is this channel ID correct?
2. Does it exist in the Discord server?
3. Is the bot authorized to post there?

**Alternative:** Check `#autonomous-updates` channel ID from Discord config.

---

## Other Auto-Disabled Jobs (Different Reasons)

### Morning Brief Snapshot
- **Job ID:** `ecd7ac14-f65a-47e1-b0ef-df8220af7a13`
- **Status:** AUTO-DISABLED (2026-03-01)
- **Reason:** "PERMANENT: delivery config broken — needs Discord channel ID"
- **Note:** Already flagged as broken; needs explicit `delivery.to`

### Daily Goal Analysis
- **Job ID:** `92cd9008-ee2c-40d2-aa1a-155729dec82f`
- **Status:** AUTO-DISABLED (2026-03-01)
- **Reason:** "PERMANENT: delivery config broken — needs Discord channel ID"
- **Note:** Uses channel ID `1476641676821794958` (different from main); needs verification

---

## Safe Jobs (Webhook or No Delivery)

These jobs are stable because they use webhook or no delivery:

1. **Review Card SLA Escalation** — Webhook to `http://localhost:3001/api/kanban/sla-escalation` ✅
2. **Session Checkpoint** — No delivery ✅
3. **Memory Size Monitor** — No delivery ✅
4. **Daytime Codex Rate-Limit Guard** — No delivery ✅
5. **Kanban Idle Loop** — No delivery ✅
6. **Webhook Listener** — No delivery ✅
7. **Alfred ↔ HAL Daily Discussion** — Uses explicit Discord webhook URL ✅
8. **Daily Memory File Guard** — No delivery ✅
9. **Daily Quota Monitor** — No delivery ✅
10. **Weekly Decision Review** — No delivery ✅

---

## Root Cause Analysis

**Pattern identified:**
- Jobs using `mode: "announce"` + `channel: "discord"` + explicit numeric channel ID fail silently
- After 3-4 consecutive failures, cron auto-disables the job
- Root cause: Channel ID may be invalid, bot may lack perms, or Discord routing may have changed

**Theory:**
- Channel ID `1476598143016505446` no longer exists OR bot lost access
- Need to find correct `#autonomous-updates` channel ID from live Discord config

---

## Remediation Steps (Priority)

1. **Find correct Discord channel ID for #autonomous-updates**
   - Option A: Check Discord server + bot config
   - Option B: Look in other working jobs' delivery config for valid channel ID pattern
   - Option C: Use `#autonomous-updates` from the current context (1484566371412213934)

2. **Update all 5 at-risk jobs with correct channel ID**

3. **Re-enable each job** via `cron update <jobId> --enable`

4. **Test each job** by running `cron run <jobId>` and verify it completes without error

5. **Monitor for 24h** to confirm no new auto-disables

---

## Status

**Phase 1A: COMPLETE** ✅
- All 29 cron jobs audited
- 5 auto-disabled jobs identified
- Root cause pattern documented
- Channel ID suspect identified: `1476598143016505446`

**Next Phase (1B):** Fix channel ID and re-enable jobs

---

**Report generated:** 2026-03-23 12:02 ADT  
**Owner:** Alfred
