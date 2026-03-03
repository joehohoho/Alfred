# Channel Expansion Pilot — 30-Day Framework
**Card:** task_1772199318344_19e8fa66 | **Status:** ACTIVE | **Assigned:** 2026-03-03 00:51 AST | **Priority:** URGENT

---

## 🎯 Objective
Run a 30-day acquisition pilot across 1-2 channels (affiliates/partners/content focus) with:
- CAC (Customer Acquisition Cost) & LTV (Lifetime Value) tracking
- Creative test matrix (3-5 variants per channel)
- Weekly budget reallocation based on performance
- Detailed weekly reports with optimization recommendations

---

## ⏸️ BLOCKERS (Clarification Needed from Joe)

### 1. App Selection
**Question:** Which app should this pilot focus on?
- **CoinUsUp** (crypto trading signals)
- **Even Us Up** (expense sharing)
- **Market Signal Lab** (trading)
- **LegalBillAI** (legal invoice auditing — newly launched)
- **Signal App** (stock/crypto buy/sell signals)

**Why:** Determines baseline conversion funnel, LTV assumptions, and audience targeting strategy.

### 2. Budget Ceiling
**Question:** What's the monthly budget ceiling for CAC/LTV experiments?
- $50-100/mo → Small-scale learning (high CAC likely, but fast feedback)
- $250-500/mo → Medium test (balanced signal + learnings)
- $1000+/mo → Serious growth experiment

**Why:** Drives which channels are viable and how aggressively we can test creatives.

### 3. Channel Specifics (If Not Obvious from "Affiliates/Partners/Content")
**Assumed interpretation of "affiliates/partners/content":**
- **Affiliate networks:** Impact, ShareASale, Refersion, CJ Affiliate
- **Partner integrations:** API/data integrations, referral programs, embedded widgets
- **Content:** Blog, YouTube, newsletter, guest posts, Reddit, Product Hunt

**Confirm:** Are these the right channels, or are you thinking of something else?

---

## 📊 Pilot Timeline

### Days 1-2 (Immediate — by Mar 4 EOD)
- [ ] Confirm app, budget, channels
- [ ] Map selected channels → identify 3-5 candidates per channel type
- [ ] Sketch baseline LTV from app analytics (free-to-paid conversion rate, avg revenue per user)
- [ ] Define target CAC (Rule of thumb: CAC < LTV/3)
- [ ] Create tracking dashboard skeleton (spreadsheet or basic dashboard)

### Days 3-4 (Creative Dev)
- [ ] Draft 3-5 creative variants per channel (headlines, visuals, copy angles)
- [ ] A/B test plan (which variants run when, rotation strategy)
- [ ] Landing page / funnel check (ensure conversion path is smooth)

### Days 5-30 (Execution & Optimization)
- **Daily:** Monitor spend, CTR, impressions, conversions
- **Weekly (Sundays):** Analyze CAC vs LTV, reallocate budget to winning variants, audit spend
- **Weekly (Tuesday):** Post performance summary to kanban

---

## 💰 CAC/LTV Tracking Template

### Basic Metrics (Per Channel, Per Week)
```
Channel: [Affiliate Network / Partner / Content]
Week: 1-4

| Date | Spend | Impressions | Clicks | Sign-ups | Paid Conversions | CAC | Weekly Revenue | LTV Est. |
|------|-------|-------------|--------|----------|------------------|-----|-----------------|---------|
| ...  | $X    | Y           | Z      | A        | B                | C   | $D              | $E      |
```

### CAC Calculation
```
CAC = Total Spend / Total New Paying Customers
Example: $100 spend / 5 new paying users = $20 CAC
```

### LTV Estimation
```
Baseline LTV = (Avg Revenue Per User / Month) × (Avg Subscription Length in Months)
Example: $10/mo × 12 months = $120 LTV
```

### Profitability Rule
```
If LTV > 3×CAC → Channel is promising, scale it
If LTV = CAC to 3×CAC → Breakeven, optimize creatives
If LTV < CAC → Pause, investigate
```

---

## 🎨 Creative Test Matrix

### Per-Channel Template
```
Channel: [Name]

Variant A: [Headline] | [Image/Copy] → Target: [Audience segment]
Variant B: [Headline] | [Image/Copy] → Target: [Audience segment]
Variant C: [Headline] | [Image/Copy] → Target: [Audience segment]
Variant D: [Headline] | [Image/Copy] → Target: [Audience segment]
Variant E: [Headline] | [Image/Copy] → Target: [Audience segment]

Test Duration: 3-5 days per variant (or until 50 clicks)
Winning Variant: [TBD after Day 4]
```

### Creative Angle Ideas (TBD per app)
- **Performance/results-focused:** "How I made $X with [app]..."
- **Problem-solution:** "Tired of [problem]? Try [app]..."
- **Urgency/scarcity:** "Join the [X]% who already use [app]..."
- **Social proof:** "[X] users trust [app] for..."
- **Free/low-friction:** "Start free, upgrade anytime..."

---

## 📈 Weekly Budget Reallocation Rules

Every Sunday:
1. **Analyze:** Which variant/channel has lowest CAC?
2. **Reallocate:** Move 20-30% of weekly budget to top performer
3. **Pause:** Pause variants that 3× worse than best performer
4. **Double-down:** Increase spend on winning variant by 50%
5. **Report:** Post findings to kanban comment + discord

---

## 🚀 Success Criteria

### Minimum Viable Pilot (Month 1)
- [ ] ≥50 sign-ups across channels
- [ ] ≥5 paid conversions (enough to calculate CAC)
- [ ] CAC ≤ 3× baseline LTV (economics make sense)
- [ ] 1 channel clearly outperforming others

### Scale Decision (After Day 30)
- [ ] If best channel CAC < LTV/2 → Allocate $X/mo recurring budget to scale
- [ ] If best channel CAC = LTV → Optimize creatives further, retest
- [ ] If best channel CAC > LTV → Pause, research new channels

---

## 📋 Deliverables (End of Each Week)

### Weekly Report Template
```
**Week X Summary (Mar Y - Mar Z)**

**Channels Active:** [List]
**Total Spend:** $X
**New Sign-ups:** Y
**Paid Conversions:** Z
**Avg CAC:** $A
**Projected LTV:** $B
**Key Finding:** [1-2 sentences]

**Budget Reallocation (Week X+1):**
- [Channel A]: ↑ 50% (CAC $15, lowest of week)
- [Channel B]: → (on track)
- [Channel C]: ↓ Pause (CAC $60, 4× worse)

**Next Week Focus:** [TBD after analysis]
```

### Final Report (Day 30)
- 30-day summary of CAC trends, winning channels
- Recommendation: scale, refine, or pivot
- Proposed budget allocation for Month 2 (if scaling)

---

## 🔄 Blockers & Next Steps

**BLOCKING:** Awaiting Joe's response on:
1. App selection (CoinUsUp / Even Us Up / Signal / LegalBillAI?)
2. Monthly CAC/LTV test budget
3. Confirmation of channel focus (affiliates/partners/content)

**Once unblocked:**
- [ ] Day 1: Map channel candidates, establish baseline LTV
- [ ] Day 2: Finalize creative test variants
- [ ] Day 3: Launch first channel + tracking
- [ ] Day 4-30: Daily monitoring + weekly analysis

**Contact:** Joe (via kanban comment or notification)

---

## 📝 Notes
- This pilot assumes [app name] is stable enough to handle influx of new users
- CAC/LTV targeting will be conservative in first week (data gathering)
- All spend is tracked daily for weekly reallocation — no money wasted on underperformers
- Report posted to kanban every Tuesday (same time each week, for predictability)
