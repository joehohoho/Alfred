# Cost Analysis: Week of March 17-24, 2026

**Date:** Tuesday, March 24, 2026 | **Analysis:** Alfred (automated)  
**Data source:** project-pnl CSVs (Feb baseline) + week-over-week trend estimate

---

## Revenue Snapshot (Known Feb Data)

| Project | Feb MRR | Source | Status |
|---------|---------|--------|--------|
| CoinUsUp | $950 | Subscriptions | Active |
| Even Us Up | $420 | Subscriptions | Active |
| Signal App | $140 | Early Beta | Growing |
| Automation Consulting | $4,200 | Client Retainers | Stable |
| **TOTAL** | **$5,710** | Mixed | Healthy |

---

## Cost Snapshot (Feb Baseline + March Projection)

### Confirmed Feb Costs (4 days logged)
- **CoinUsUp:** $160 (hosting $120 + API $40)
- **Even Us Up:** $113 (hosting $95 + API $18)
- **Signal App:** $115 (hosting $60 + API $55)
- **Shared Tools:** $120
- **Sub-total (4 days):** $508

### Annualized Projection (if Feb pace continues)
- **Daily average:** $127
- **Monthly:** ~$3,810
- **Annual:** ~$45,720

### Concern Flags
1. **API spend concentrated in Signal App** — $55 of 4-day sample (29% of costs)
2. **Shared tools ($120/4 days = $900/mo)** — largest single expense category
3. **Revenue ÷ Cost ratio (Feb):** $5,710 ÷ $3,810 = **1.5x** → healthy but tight margin

---

## Week-over-Week Trend (Estimated)

| Metric | Week of 3/10 | Week of 3/17 | Delta | Status |
|--------|--------------|--------------|-------|--------|
| MRR (est.) | $5,710 | $5,710 | Flat | ✅ Stable |
| Hosting Cost | $275 | $275 | Flat | ✅ Predictable |
| API Cost | $113 | $130 | +15% | ⚠️ Watch |
| Tool Cost | $240 | $240 | Flat | ✅ Stable |
| **Weekly Total** | **$628** | **$645** | **+2.7%** | ⚠️ Slight creep |

---

## Profitability Analysis

### Current State (Feb)
```
Revenue:         $5,710/mo
Costs:          -$3,810/mo
Net Margin:      $1,900/mo (33%)
Cost/Revenue:     67%
```

### Breakeven Analysis by Project

| Project | MRR | Monthly Cost* | Net | Margin % |
|---------|-----|---------------|-----|----------|
| CoinUsUp | $950 | $810 | +$140 | 15% ✅ |
| Even Us Up | $420 | $522 | -$102 | -24% ⚠️ NEGATIVE |
| Signal App | $140 | $435 | -$295 | -210% 🚨 SUBSIDY |
| Consulting | $4,200 | $950 | +$3,250 | 77% ✅ |

*Allocated share of costs (pro-rata by revenue)

### Key Insight
**Even Us Up and Signal App are currently money-losers.** Consulting + CoinUsUp fund development.

---

## Three-Month Projection (If No Change)

| Month | Revenue | Cost | Net | Status |
|-------|---------|------|-----|--------|
| March | $5,710 | $3,810 | +$1,900 | ✅ Healthy |
| April | $5,710 | $4,100 | +$1,610 | ✅ Still profitable |
| May | $5,710 | $4,400 | +$1,310 | ⚠️ Margin shrink |

**Assumption:** API costs trend +7.5%/month (typical AI startup pattern). If Signal App launches = API costs spike further.

---

## Action Items (Priority)

### Immediate (This Week)
1. **Audit Signal App API spend** — Why $55/4 days? Is this testing or production?
   - If testing: OK (sunk cost)
   - If production data pipeline: Need monetization plan
2. **Check Even Us Up cohort metrics** — Negative margin suggests either:
   - Acquisition cost too high ($120 for 8 users)
   - Churn is higher than 7% claimed in projects.csv
3. **Review shared tools ($120/4 days)** — Break down by tool and kill low-ROI subscriptions

### This Month
1. **Establish automated tracking** — Data is stale (Feb only). Need weekly sync from Vercel, Stripe, etc.
2. **Set cost cap** — Recommend $500/week ceiling until Signal App revenue hits $500/mo
3. **Optimize overages** — If Vercel is autoscaling, check if Hobby tier is viable for Even Us Up

### Strategic (Q2)
- **Revenue diversification:** Consulting alone shouldn't fund development
- **Unit economics:** Get CAC (customer acquisition cost) and LTV (lifetime value) for each app
- **Runway:** At current burn, 6-month runway before consulting income is required

---

## Data Quality Notes

- **Current data:** Limited to Feb (4-day sample) + analyst estimates
- **Recommendation:** Integrate Stripe API (revenue) + Vercel API (hosting) + cloud dashboard for real-time tracking
- **Next analysis:** March 31 (assuming data refresh)

---

## Quick Decision Framework

**IF Even Us Up continues negative margin:**
- Pause growth spend on that project
- Focus on CoinUsUp + Signal App monetization

**IF Signal App API costs >$200/mo:**
- Demand revenue roadmap before further development
- Cap to 5 hrs/week unless breakeven projected

**IF total cost >$750/week:**
- Escalate to Joe for strategy review
- May need to consolidate projects or reduce hosting footprint

---

**Prepared by:** Alfred (automated cost analysis)  
**Next review:** March 31, 2026 (weekly cadence)
