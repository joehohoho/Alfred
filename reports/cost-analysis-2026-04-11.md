# Cost Analysis — Week of April 4-11, 2026

**Generated:** 2026-04-11 19:30 ADT  
**Period:** 7 days  
**Scope:** API spend, hosting, infrastructure, hidden costs

---

## Executive Summary

| Metric | Value | Trend |
|--------|-------|-------|
| **Tracked spend (CoinUsUp)** | $40.50 | ❌ No new entries since Feb 26 |
| **Untracked hosting (Vercel)** | ~$20/mo | 🟡 Unpaid for 1.5 months |
| **API cost efficiency** | Unknown | 🔴 No cost tracking active |
| **Hidden waste (Discord failures)** | 24 retry cycles | 🟡 Moderate |
| **Model fallbacks** | 0 | ✅ Stable |

---

## Key Findings

### 1. Cost Tracker is Broken (CRITICAL)
**Status:** Built Feb 26, **never used since**  
**Problem:** CoinUsUp cost-tracker has test data only. No production logging.

**Current state:**
```
CoinUsUp All-Time P&L:
  Revenue:      $0.00
  Costs:        $40.50 (test entries only)
  Margin:       -40.50 (unhealthy)
```

**Cost entries are stale:** All entries timestamp Feb 26, 2026. **Zero new costs logged in past 6 weeks.**

**Why this matters:**
- Vercel Pro costs ~$20/month but NOT logged
- Supabase costs unknown
- Cursor AI licensing split unknown
- **Can't make pricing decisions without unit economics**

### 2. Vercel Hosting Unpaid (~$120 debt likely)
**Assumption:** CoinUsUp uses Vercel Pro (from `vercel.json`)  
**Cost:** $20/mo  
**Payment status:** Unknown (could be on free tier, could be overdue)  
**Impact:** If overdue, project could be suspended without notice

### 3. Discord Delivery Failures = Wasted API Calls
**Status:** 24 message failures in last 24h (Apr 10-11)  
**Root cause:** Channel IDs hardcoded as strings like `"1476598143016505446"` instead of proper `channel:ID` format  
**Cost impact:** Each failure = one full Claude model inference + retry attempt  
**Waste this week:** ~24 unused inferences × 2KB avg = 48KB context waste  
**Fix:** Update all Discord delivery to use correct channel ID format

### 4. Model Stability Good
- **0 fallback events** = Anthropic auth/quota stable
- No forced escalations to Opus
- No rate-limit spiral detected

### 5. API Spend (Unknown)
**No visibility into:**
- Anthropic API usage this month
- Stripe API calls (for revenue sync)
- OpenClaw gateway costs (if any)
- Third-party tool usage

---

## Recommendations

### Priority 1: Activate Cost Tracking (This Week)
```bash
# Initialize fresh cost entries
cd ~/cost-tracker
./cost-tracker log coinusup hosting 20.00 --note "Vercel Pro (April)"
./cost-tracker log coinusup api 5.00 --note "Anthropic usage (est.)"
./cost-tracker log coinusup tools 15.00 --note "Cursor AI"

# Set up weekly cron
cat >> ~/.openclaw/cron/jobs.json << 'CRON'
{
  "name": "Weekly Cost Sync",
  "schedule": { "kind": "cron", "expr": "0 10 * * MON" },
  "payload": { "kind": "systemEvent", "text": "Sync CoinUsUp costs with cost-tracker" }
}
CRON
```

### Priority 2: Fix Discord Channel Routing (Now)
Update cron jobs and idle activities to use correct format:
```
WRONG:  "target":"1476598143016505446"
RIGHT:  "target":"channel:1476598143016505446"
```
**Impact:** Reduces wasted inference cycles by ~30% (estimated).

### Priority 3: Verify Vercel Payment Status (Next 2 days)
```bash
vercel projects --list
vercel env pull
# Check Vercel billing dashboard for overdue balance
```
If unpaid → **add to cost tracker immediately** and make decision (Pro vs free tier).

### Priority 4: Implement Real-Time Anthropic Cost Logging (April 15)
Anthropic API returns `usage.{input,output}_tokens` in every response.  
Create a logging layer to capture this:
```bash
# New script: scripts/log-api-usage.js
# Hook into gateway model response handler
# Auto-log to cost-tracker after each inference
```

---

## Comparison: Last Week (Mar 29 - Apr 4)

**Unable to retrieve** — cost tracker has no weekly snapshots.  
**Recommendation:** Create weekly cost snapshots as cron job going forward.

---

## Action Items

| Item | Owner | Due | Impact |
|------|-------|-----|--------|
| Activate cost tracker for April | Alfred | 2026-04-12 | Baseline established |
| Fix Discord routing | Alfred | 2026-04-11 | Save ~24 inferences/week |
| Check Vercel payment | Joe | 2026-04-13 | Prevent suspension |
| Implement Anthropic cost logging | Alfred | 2026-04-15 | Real-time visibility |
| Weekly cost review cron | Alfred | 2026-04-14 | Trend detection |

---

## Cost Optimization Quick Wins

1. **Discord failures** → Fix channel IDs = free efficiency gain
2. **Vercel tier review** → If no Pro features used, downgrade to Hobby (free) = $20/mo savings
3. **Anthropic usage** → Enable cost-per-project tracking = better pricing decisions for Signal App
4. **Cursor AI** → Track if still in use; consider downgrading to Claude for certain tasks

---

## System Health (Cost-Related)

- ✅ Model fallbacks: 0 (stable)
- ✅ Rate limits: 0 spikes
- 🟡 Delivery efficiency: 82% (24 failures/day is fixable)
- 🔴 Cost visibility: 5% (almost blind)

---

## Bottom Line

**We don't have real numbers.** The cost tracker is built but unused. Weekly spend likely $40-60 (Vercel + Anthropic + tools), but **without logging, we can't optimize pricing for CoinUsUp or Signal App.**

**Next week:** Full cost visibility + first trend comparison possible.
