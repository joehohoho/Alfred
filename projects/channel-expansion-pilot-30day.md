# 30-Day Channel Expansion Pilot
**Status:** ACTIVE (Started 2026-03-08) | **Duration:** 30 days | **Priority:** URGENT  
**Assigned to:** Alfred | **Card ID:** task_1772199318344_19e8fa66

---

## Executive Summary

Run a controlled 30-day acquisition pilot across 1-2 channels (affiliates + partnerships + content), track CAC vs LTV, test 3-5 creative variants, and reallocate weekly budget based on performance.

**Primary Goal:** Identify highest-ROI acquisition channel for sustainable growth  
**Success Metric:** CAC/LTV ratio ≤ 0.25 (spend ≤ 25% of customer lifetime value)

---

## Phase 1: Channel Selection & Baseline (Days 1-2)

### 1.1 Target Channels
**Channel 1: Affiliate Networks** (Stripe, Plaid, payment processor partners)
- Partner with platforms used by CoinUsUp/Even Us Up customers
- Low setup cost, performance-based (pay per signup)
- Candidates: Stripe Referrals, payment gateway affiliate programs

**Channel 2: Content + Organic Partnerships** (creator collabs, Reddit, organic)
- Educational content partnerships (fintech blogs, crypto YouTubers)
- Organic community presence (Reddit r/cryptocurrency, r/personalfinance, r/expensesharing)
- Creator affiliate programs (% revenue share or fixed bounty per signup)

### 1.2 Baseline Metrics to Capture

For **CoinUsUp** (primary test vehicle):
- Current monthly signups: [TBD]
- Current free→paid conversion rate: [TBD]
- Current CAC (if any paid traffic): [TBD]
- LTV estimate: [TBD from Joe]
  - Monthly revenue per paying user?
  - Average customer lifetime in months?
  - LTV = (monthly revenue/user) × (avg lifetime months)

For **Even Us Up** (secondary if time):
- Same baseline metrics

---

## Phase 2: Tracking Infrastructure (Days 3-5)

### 2.1 CAC/LTV Tracking Dashboard
**Metrics to track daily:**
```
Date | Channel | Spend ($) | Signups | Paid Conversions | Cost/Signup | Cost/Paying User (CAC) | Revenue This Period | LTV Ratio
---- | ------- | --------- | ------- | --------------- | ----------- | ---------------------- | ------------------- | ---------
2026-03-08 | Affiliate | 10 | 5 | 1 | $2.00 | $10.00 | $5 (if monthly sub) | 0.50
2026-03-08 | Content | 15 | 8 | 2 | $1.88 | $7.50 | $10 | 0.75
```

**UTM Tracking Setup:**
- Affiliate links: `utm_source=affiliate&utm_medium=partner&utm_campaign=[partner_name]`
- Content links: `utm_source=content&utm_medium=organic&utm_campaign=[creator_name]`
- Google Analytics goals: signup, first purchase, 7-day retention

**Data sources:**
- App analytics (signup data)
- Stripe/payment processor (revenue per user)
- Affiliate network dashboards (clicks, conversions, payouts)
- Google Analytics 4 (traffic attribution)

### 2.2 Tracking Database
Create simple CSV + Google Sheet for manual tracking (fallback to email/Slack if no automation):
- `~/.openclaw/workspace/projects/channel-pilot-data.csv`
- Google Sheet: [TBD - Joe to share if available]

---

## Phase 3: Creative Testing (Days 6-10)

### 3.1 Creative Variants (A/B Test Matrix)

**Affiliate Channel Creatives** (3 variants):
1. **Performance-focused:** "Track your crypto buys/sells perfectly. CoinUsUp cuts tax time in half."
2. **Benefit-focused:** "Never overpay taxes on crypto again. Automate your gains tracking."
3. **FOMO-social:** "Join 10,000+ traders using CoinUsUp. See what you've been missing."

**Content Channel Creatives** (3-5 variants):
1. **Educational:** "How to track crypto taxes in 2 minutes (CoinUsUp guide)"
2. **Problem-solver:** "Crypto tax season? Here's your shortcut."
3. **Creator collab:** "[Creator Name] uses CoinUsUp for tax tracking. Here's why:"
4. **Comparison:** "Crypto tax tools compared: CoinUsUp vs manual spreadsheets"
5. **Social proof:** "Average user saves 4 hours on tax prep with CoinUsUp"

**Even Us Up Creatives** (if running secondary):
1. "Split expenses fairly. No more 'who paid for what?'"
2. "Group trips just got fair. Try Even Us Up."
3. "Tired of awkward money conversations? Let the app handle it."

### 3.2 Rollout Schedule
- **Days 6-7:** Create 3 affiliate creatives, launch with 50% budget split
- **Days 8-10:** Create 3-5 content creatives, launch with 50% budget split
- **Days 11-30:** Measure performance, reallocate weekly

---

## Phase 4: Weekly Budget Reallocation Logic (Days 1-30)

### 4.1 Reallocation Rules

**Weekly review:** Every Sunday at 10 AM AST

**Decision matrix:**
```
IF CAC/LTV ratio ≤ 0.20 → INCREASE budget by 50% (best performer)
IF CAC/LTV ratio 0.20-0.30 → MAINTAIN or SLIGHT INCREASE (+10%)
IF CAC/LTV ratio 0.30-0.50 → SLIGHT DECREASE (-10%)
IF CAC/LTV ratio > 0.50 → PAUSE creative, test new variant
IF conversion rate < 0.5% → PAUSE channel for 3 days, analyze audience
```

**Budget ceiling:** $[TBD - waiting for Joe input]  
**Weekly allocation:**
- Week 1-2: 50% affiliate, 50% content
- Week 3-4: Reallocate to winner + test new variant in loser

### 4.2 Weekly Reporting Template
**Due:** Every Monday 9 AM AST
```
## Week [N] Results (YYYY-MM-DD to YYYY-MM-DD)

### Summary
- Total spend: $X
- Total signups: Y
- Paying conversions: Z
- Best performer: [Channel/Creative]

### Channel Performance
| Channel | Spend | Signups | CAC | LTV | Ratio | Trend |
| ------- | ----- | ------- | --- | --- | ----- | ----- |
| Affiliate | $X | Y | $X | $Y | 0.XX | ↑/↓/→ |
| Content | $X | Y | $X | $Y | 0.XX | ↑/↓/→ |

### Creative Performance
[Top 3 creatives by conversion rate]

### Decision for Next Week
- Reallocate budget to: [channel]
- Pause creative: [creative_name] (reason)
- Test new variant: [variant]
- Budget: $X (same / +10% / -10%)

### Blockers & Notes
[Any issues, learnings, recommendations]
```

---

## Phase 5: Execution & Monitoring (Days 1-30)

### 5.1 Daily Checklist
- [ ] Check analytics dashboard for errors
- [ ] Log signups/conversions from each channel
- [ ] Monitor affiliate network dashboards
- [ ] Verify UTM parameters on all links
- [ ] Alert if CAC suddenly spikes (potential fraud/waste)

### 5.2 Weekly Meetings (with Joe)
- **Time:** Every Sunday 10 AM AST (or Monday morning review)
- **Agenda:** CAC/LTV review, reallocate budget, discuss learnings
- **Duration:** 15 minutes
- **Output:** Update this document + weekly report

### 5.3 Mid-Pilot Review (Day 15)
- Evaluate whether affiliates/content are working or should pivot
- Consider: Are we learning? Is CAC trending down? Do we need different channels?

---

## Deliverables (Kanban Requirements)

✅ **Tracking dashboard** (Google Sheet or CSV)  
✅ **Creative variants** (3-5 per channel)  
✅ **Weekly CAC/LTV reports** (4 weeks = 4 reports)  
✅ **Budget reallocation logs** (decision rationale)  
✅ **Final summary** (Day 30: what worked, ROI, recommendation for scaling)  

---

## Assumptions & Constraints

**Assumptions:**
- CoinUsUp has a defined LTV (monthly revenue × average customer lifetime)
- Even Us Up has measurable monetization (TBD with Joe)
- Affiliate networks accept new partners (may take 1-2 weeks to onboard)
- Content partnerships are available (Reddit, YouTube, blogs in fintech space)

**Constraints:**
- Budget ceiling: [TBD - awaiting Joe]
- Timeline: Must complete in 30 days (deadline 2026-04-07)
- Approval: Weekly reviews with Joe (can pause if ROI negative)

---

## Open Questions for Joe

1. **Which app to focus on?** CoinUsUp (crypto trading) or Even Us Up (expense sharing)?  
   - Or both in parallel?

2. **Monthly CAC/LTV budget?** 
   - $50-100 (learning phase)
   - $250-500 (balanced test)
   - $1000+ (serious growth)

3. **What is LTV for chosen app(s)?**
   - Monthly revenue per paying user?
   - Average customer lifetime (months)?
   - Required for CAC/LTV calculation

4. **Affiliate/partner networks already have relationships?**
   - Any existing partners we should prioritize?
   - Any platforms to avoid?

5. **Content partnerships?**
   - Any creators/blogs you've already identified?
   - Budget for creator payments ($X per signup or % revenue)?

---

## Timeline

**Week 1 (Mar 8-14):** Baseline metrics, channel onboarding, tracking setup  
**Week 2 (Mar 15-21):** Creative testing, initial spend, daily monitoring  
**Week 3 (Mar 22-28):** Reallocation, test new variants, analyze trends  
**Week 4 (Mar 29-Apr 7):** Final week, document learnings, recommend next steps  

**Status:** ⏳ Waiting for Joe inputs on app selection, budget, and LTV data before Day 1 launch.

---

## Notes

- This is a learning pilot. Goal is to identify which channel works, not maximize short-term revenue.
- If a channel underperforms after 2 weeks, pivot to new creative variant rather than new channel.
- All data (spend, signups, revenue) should be tracked daily to spot issues early.
- Weekly reallocation keeps testing disciplined and responsive.
