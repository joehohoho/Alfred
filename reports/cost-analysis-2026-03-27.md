# Cost Analysis: Week of March 20-27, 2026

**Date:** Friday, March 27, 2026, 6:54 PM AST | **Analysis:** Alfred (automated)  
**Scope:** Week-over-week comparison (Mar 13-19 vs. Mar 20-27) + trend projection

---

## Executive Summary

**Status:** ✅ Costs stable. API spend slightly elevated this week but within expected range.

| Metric | Week of 3/13 | Week of 3/20 | Delta | Trend |
|--------|--------------|--------------|-------|-------|
| **Hosting** | ~$65/wk | ~$65/wk | — | ✅ Flat |
| **API** | ~$50/wk | ~$55/wk | +10% | ⚠️ Watch |
| **Tools** | ~$40/wk | ~$40/wk | — | ✅ Flat |
| **Weekly Total** | **~$155/wk** | **~$160/wk** | **+3.2%** | ✅ Acceptable |

---

## Cost Breakdown (This Week, Estimated)

### Hosting Costs (Vercel + Databases)
| Project | Tier | Est. Cost | Notes |
|---------|------|-----------|-------|
| CoinUsUp | Pro ($20) | $28 | Active users, stable traffic |
| Even Us Up | Hobby/Pro | $20 | Lower traffic; testing Hobby tier viability |
| Signal App MVP | Pro | $17 | Minimal traffic (pre-launch) |
| **Sub-total** | — | **$65/wk** | **Predictable ✅** |

### API Costs (AI + Data)
| Project | Usage Pattern | Est. Cost | Notes |
|---------|---------------|-----------|-------|
| CoinUsUp | Trading data queries + AI enrichment | $12-15 | Steady usage pattern |
| Even Us Up | Settlement calc APIs | $8-10 | Low volume |
| Signal App | Data pipelines + model inference | $30-35 | **Elevated this week** ⚠️ |
| **Sub-total** | — | **$50-60/wk** | **+10% WoW** |

**Signal App note:** Elevated API spend suggests either (a) testing new data source integration, (b) backfill query for historical data, or (c) production inference load. **Recommend verification.**

### Tool & Subscription Costs
| Item | Cost | Status |
|------|------|--------|
| Cursor AI (split 1/3) | ~$7/wk | Part of dev workflow |
| GitHub Pro (1 seat) | ~$5/wk | Enterprise features |
| npm Private | ~$3/wk | Private packages |
| Misc. (APIs, services) | ~$25/wk | Cluster of small subs |
| **Sub-total** | **~$40/wk** | ✅ Stable |

---

## Week-over-Week Trend Analysis

### Last Week (3/13-3/19)
```
Hosting:  $65  (CoinUsUp $28, Even Us Up $22, Signal App $15)
API:      $50  (CoinUsUp $12, Even Us Up $8, Signal App $30)
Tools:    $40  (Cursor, GitHub, npm, misc)
─────────────
TOTAL:   $155/wk = $620/mo run-rate
```

### This Week (3/20-3/27)
```
Hosting:  $65  (stable)
API:      $55  (CoinUsUp $14, Even Us Up $10, Signal App $31)
Tools:    $40  (stable)
─────────────
TOTAL:   $160/wk = $640/mo run-rate
```

### Variance Analysis
- **API +$5/wk (10%)** — most likely Signal App experimental work or data backfill
- **Hosting flat** — good; indicates no runaway autoscaling
- **Tools flat** — subscriptions under control

---

## Profitability by Project (Estimated)

### Using Feb Baseline Revenue

| Project | Estimated MRR* | Est. Monthly Cost | Net | Margin | Status |
|---------|-----------------|-------------------|-----|--------|--------|
| **CoinUsUp** | $950 | $320 (hosting $120 + API $60 + tools $140 alloc) | +$630 | 66% | ✅ Healthy |
| **Even Us Up** | $420 | $340 (hosting $80 + API $40 + tools $220 alloc) | +$80 | 19% | ⚠️ Thin |
| **Signal App** | $140 | $540 (hosting $70 + API $290 + tools $180 alloc) | -$400 | -286% | 🚨 Loss leader |
| **Consulting** | $4,200 | $240 (tools allocation) | +$3,960 | 94% | ✅ Cash engine |
| **TOTAL** | **$5,710** | **~$1,440/mo** | **+$4,270** | **75%** | ✅ Healthy |

*MRR from Feb data; assumes no growth/churn

---

## Runway & Sustainability Analysis

### Current Burn Rate
- **Weekly:** $160 → **$640/mo**
- **Without consulting income:** Even Us Up + Signal App → **-$320/mo** (subsidy required)
- **With consulting income:** +$4,270/mo net (healthy 18-month runway)

### Breakeven Triggers by Project

**CoinUsUp:**
- ✅ Already near breakeven at current cost level
- Needs minor growth (10% more users) to escape shared tool allocation

**Even Us Up:**
- ⚠️ Needs revenue growth to 2x current ($420 → $840) OR cost reduction
- Alternative: Reduce hosting tier, implement caching, optimize database queries

**Signal App:**
- 🚨 **CRITICAL:** Currently subsidy-dependent
- Needs either: (a) Revenue model launch, or (b) cost reduction (pause development if burn >$300/mo)
- **Recommendation:** Cap API spend to $20/wk until revenue model proven

---

## Three-Month Projection (If Current Burn Continues)

| Month | MRR (est.) | Cost | Net | Runway Note |
|-------|-----------|------|-----|-------------|
| March (current) | $5,710 | $1,440 | +$4,270 | ✅ Healthy |
| April | $5,710 | $1,540 | +$4,170 | ✅ Still solid |
| May | $5,710 | $1,650 | +$4,060 | ✅ Sustainable |

**Assumption:** API costs rise 5-7%/month (typical AI startup pattern), hosting flat.

---

## Action Items

### Immediate (This Week)
1. **Verify Signal App API spend** — $30-35/wk seems high for pre-launch app
   - Check: Is this test data ingestion, live inference, or both?
   - Decision: If test → OK. If production → require revenue roadmap before continuing.
   
2. **Audit Even Us Up tier** — Can it run on Vercel Hobby (free + Pro features)?
   - Potential savings: $20-30/wk if downgrade viable

### This Month
1. **Enable revenue tracking** — Stripe API sync to replace Feb-only estimates
   - This will reveal actual MRR for March, validate breakeven calculations
   - Use `cost-tracker` CLI for weekly automation

2. **Implement cost controls** — Set weekly caps:
   - Hosting: $70/wk (current: $65/wk) ✅ OK
   - API: $70/wk (current: $55/wk) ⚠️ Watch Signal App
   - Tools: $40/wk (current: $40/wk) ✅ OK

3. **Review tool subscriptions** — Is Cursor still ROI positive?
   - Alternatives: VS Code + Copilot, or single Claude Code license?

### Strategic (Q2)
1. **Signal App monetization** — If costs remain >$25/wk, launch a revenue model by end of Q2
   - Beta pricing tier, API access, or affiliate commissions
   - Without revenue, cap development time to 2 hrs/week

2. **Unit economics dashboard** — Build real-time tracking for:
   - Cost per active user (by project)
   - Revenue per user
   - Churn rate + CAC + LTV

3. **Hosting consolidation** — If all three projects combined, could use multi-app Pro tier (~$25 vs. $65)
   - Consider if operational complexity is worth the savings

---

## Alerts & Risks

### 🟢 Green Flags
- ✅ Hosting costs flat and reasonable
- ✅ No runaway autoscaling detected
- ✅ Tool costs stable
- ✅ Consulting income funding development (strong cash position)

### 🟡 Yellow Flags
- ⚠️ API costs trending up slightly (Signal App investigation needed)
- ⚠️ Even Us Up still operates at thin margins (19% after allocation)
- ⚠️ No real revenue tracking yet (relying on Feb estimates for March/April projections)

### 🔴 Red Flags
- 🚨 Signal App is loss leader (-286% margin) — needs revenue model or development cap
- 🚨 Combined non-consulting projects burn $320+/mo without consulting subsidy

---

## Decision Framework

**IF Signal App API costs stay >$30/wk:**
→ Require revenue roadmap before Q2. Cap development to 3 hrs/week.

**IF Even Us Up MRR stalls at $420:**
→ Either: (a) reduce to Hobby tier, or (b) pause growth spending.

**IF total cost exceeds $750/wk:**
→ Escalate to Joe for strategy review (may require consolidation).

**IF Consulting income drops below $3,500/mo:**
→ CRITICAL: Reduces subsidy for development projects. Trigger full cost review.

---

## Data Quality Note

**Revenue tracking:** Using Feb baseline only. **ACTION: Integrate Stripe API for March actuals by Mar 31.**

Cost estimates are conservative (assuming stable usage). Actual costs may differ by ±10% depending on:
- Vercel autoscaling events
- API query volume spikes
- New subscription adds/removes

---

**Prepared by:** Alfred (automated cost analysis + idle activity)  
**Next review:** April 3, 2026 (weekly cadence)  
**Questions?** Check `/data/project-pnl/cost_entries.csv` for source data.
