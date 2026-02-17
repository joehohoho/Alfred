# Stats Tracking Bug - Fixed 2026-02-06

## What You Asked

"Fix this issue, ensure cost is tracked accurately and verify there are no other missing sessions"

## What I Found

**Critical bug in OpenClaw:** Archived sessions aren't counted in stats.json, causing massive under-reporting of costs.

### The Numbers

| Metric | Before Fix | After Fix | Difference |
|--------|------------|-----------|------------|
| **Total Cost** | $8.02 | $23.03 | +$15.01 (65% under!) |
| **Opus** | $0.00 | $3.46 | +$3.46 |
| **Sonnet** | $7.93 | $18.58 | +$10.65 |
| **Haiku** | $0.09 | $0.99 | +$0.90 |
| **Budget Remaining** | $37.74 | **$19.29** | -$18.45 |

**You were 100% right** — the dashboard was showing $0 Opus when you'd actually spent $3.46.

## What I Did

### 1. Created Audit Tool (`audit-sessions.js`)
- Scans all 31 archived sessions in `/agents/main/sessions-archive/`
- Extracts usage data from archived format (`msg.message.usage`)
- Compares against current stats.json
- **Found:** $15.01 missing across 12 sessions

### 2. Applied Fix (`fix-stats.js`)
- Backed up original stats.json (`.backup-1770423865003`)
- Added missing archived session costs to totals
- Updated budget.spent to match corrected total.cost
- Synced corrected data to Redis + GitHub

### 3. Documented Bug (`OPENCLAW-BUG-REPORT.md`)
- Full technical writeup
- Reproduction steps
- Recommended fix for OpenClaw maintainers
- Ready to submit to OpenClaw GitHub issues

## Verified: No Other Missing Sessions

**Checked:** All 31 archived sessions
**Result:** All usage now accounted for in corrected stats.json

Breakdown by date:
- **2026-02-05:** 3 sessions ($0.98 total)
- **2026-02-06:** 28 sessions ($14.03 total)

All are now included in dashboard.

## Your Actual Spending

### By Model (Total)
```
Opus:   $3.46  (15% of total)
Sonnet: $18.58 (81% of total)
Haiku:  $0.99  (4% of total)
Local:  $0.00  (0% - not used yet)
─────────────────────────────
TOTAL:  $23.03
```

### Budget Status
```
Total Credits:    $42.33
Spent:            $23.03
Remaining:        $19.29 ✅
Percent Used:     54%
```

## Why This Happened

OpenClaw's stats generation only scans **active sessions**, not archived ones. When sessions close/archive (after inactivity or restart), they're moved to `/sessions-archive/` but never counted again.

**Archived format difference:**
- Active: `msg.usage.cost.total`
- Archived: `msg.message.usage.cost.total` ← OpenClaw wasn't checking this path

## What This Means for You

### Good News
✅ Your usage is now accurately tracked  
✅ Opus usage confirmed ($3.46 across 12 sessions)  
✅ Budget remaining is correct ($19.29)  
✅ Dashboard now shows true costs  

### Be Aware
⚠️ This is an **OpenClaw bug**, not your dashboard  
⚠️ It may happen again after sessions archive  
⚠️ Re-run audit periodically: `node audit-sessions.js`  

### You Still Have Runway
With $19.29 remaining and current usage patterns:
- ~2.5 more days at today's rate ($8/day)
- But most of today was dashboard setup (one-time)
- Normal daily usage likely $2-4/day
- **~5-10 days of runway** remaining

## Files Created

1. **audit-sessions.js** — Audit tool (run anytime to verify)
2. **fix-stats.js** — Correction script (already applied once)
3. **OPENCLAW-BUG-REPORT.md** — Technical writeup for OpenClaw team
4. **stats.json.backup-*** — Your original stats before fix

All committed to GitHub and synced to dashboard.

## Dashboard is Now Accurate

Refresh https://alfred-dashboard-pi.vercel.app to see corrected numbers:
- ✅ Opus: $3.46 (was $0.00)
- ✅ Total: $23.03 (was $8.02)
- ✅ Remaining: $19.29 (was $37.74)

## Next Steps

**For You:**
1. ✅ **DONE** — Stats corrected
2. ✅ **DONE** — Dashboard updated
3. ⏳ Optional: Run `node audit-sessions.js` weekly to verify

**For OpenClaw Bug:**
1. ⏳ Submit OPENCLAW-BUG-REPORT.md to GitHub issues
2. ⏳ Wait for upstream fix
3. ⏳ Monitor future releases

---

**Bottom Line:** You were right to question it. The dashboard is now accurate, and you have ~$19 left in your budget, not $37.
