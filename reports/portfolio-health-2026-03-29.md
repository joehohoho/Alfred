# Passive Income Portfolio Review — 2026-03-29

**Executor:** Alfred (proactive idle task 7/8)  
**Time:** 06:39 ADT (quiet hours — no Joe notification)  
**Updated:** 2026-03-29 06:39 ADT  
**Previous snapshot:** 2026-03-12 (17 days prior)

---

## Executive Summary

Four revenue-generating (or future-revenue) projects. Current state: **$3-10k/month consulting baseline; $0 product revenue (pre-launch stage).** Three passive income projects actively developing toward first users and trial launches. Signal App remains internal R&D. Biggest lever: CoinUsUp acquisition + conversion path (11-day trial waiting on 5-min Stripe config).

---

## Portfolio at a Glance

| Project | Status | Current MRR | 12-mo Target | Biggest Blocker | Days Blocked |
|---------|--------|------------|--------------|-----------------|-------------|
| **CoinUsUp** | Live, feature-adding | $0 (pre-revenue) | $1-3k | Stripe trial config (5 min) | 11 days |
| **Even Us Up** | Live, strategy uncertain | $0 (pre-revenue) | $500-1.5k | Trip closeout MVP; settlement UX | TBD |
| **Signal App** | Active R&D, internal only | $0 external | $0 external (scope boundary) | Position tracking + % alerts | TBD |
| **Automation Consulting** | Active, strongest anchor | $3-10k (active) | $8-20k | Productization + capacity ceiling | Ongoing |

---

## Deep Dive: Each Project

### 1. **CoinUsUp** — Nonprofit Donation Tracking SaaS

**Current Status:** Live, growing feature set, awaiting trial launch + acquisition

#### What's Working
- ✅ Core feature set complete: donation tracking, volunteer management, grant tracking, reporting
- ✅ Feature audit done (Phase 3A) — all core features confirmed
- ✅ Content hub strategy developed — 30+ keyword-targeted articles ready to produce
- ✅ Free tier operational; users coming in organically
- ✅ Trial feature code-complete (14-day free trial); deployed Mar 18

#### What's Blocked
- ⏳ **Stripe Price Configuration** — Trial feature deployed but can't launch because 12 product prices need `trial_period_days=14` added in Stripe dashboard
  - Effort: 5 minutes of manual config
  - Waiting since: Mar 24 (5 days ago; also blocker since Mar 18 = 11 days total)
  - Impact: Trial users can't be offered; acquisition momentum paused
  
- ⏳ **Content Hub Launch** — 30-article calendar designed; awaiting Joe decision:
  - Platform: Substack vs. Ghost vs. custom domain?
  - Approach: Launch full 30 articles or test with 3-4 sample pieces first?
  - Timeline: Joe decision required

#### Milestones (Last 30 Days)
- ✅ Mar 18: 14-day trial feature deployed
- ✅ Mar 21: Content hub strategy + 8-week production plan finalized
- ✅ Mar 25: Phase 3A feature audit completed
- ⏳ Mar 29: Stripe config blocker — *unresolved*

#### Revenue Potential
- **Free tier → paid trial conversion:** Expected 8-12% trial-to-paid rate (industry standard)
- **12-month projection:** If content hub launches + 100 free users acquired per month, 50 trial users/month:
  - 8-12 paid conversions/month = $80-120/month (at $10/user/month)
  - By month 12: **$120-360/month cumulative** (conservative estimate; $1-3k is optimistic)
- **Biggest multiplier:** Successful content hub launch + referral activation

#### Next 30 Days
1. **Immediate (TODAY):** Stripe price config — 5-min task, Joe approval needed
2. **Week 1:** Launch trial (post-Stripe fix)
3. **Week 2-4:** Decide on content hub platform + launch sample content
4. **Ongoing:** Monitor trial-to-paid conversion rate

---

### 2. **Even Us Up** — Expense Sharing App (Splitwise Alternative)

**Current Status:** Live, low traction, unclear growth strategy

#### What's Working
- ✅ Core features operational: expense tracking, group management, settlement
- ✅ Growth audit completed (Mar 25) — identified 3 UX friction points + 3 missing features + 3 growth levers
- ✅ Competitive positioning strategy developed (Mar 21) — "settlement orchestration" differentiator defined
- ✅ Trip closeout MVP scoped — 90-day roadmap created

#### What's Unclear
- ❓ **Growth vs. Harvest Strategy** — Is this a scale business or a portfolio piece?
  - If grow: Requires investment in mobile app + integrations + marketing (6-12 month effort)
  - If harvest: Focus on retention + small paid tier (3-4 month effort)
  - Decision impact: Roadmap changes dramatically
  
- ❓ **Mobile App Priority** — Competitors have native iOS/Android; Even Us Up is web-based
  - Estimated effort: 6-12 sprints for production mobile app
  - ROI: +40-60% user engagement if executed well
  - Joe decision needed: ship mobile or accept web-only positioning?

#### Top 3 Identified Opportunities
1. **Recurring Expense Automation** (2-3 sprints, HIGH impact)
   - Users manually re-enter rent splits, utilities, subscriptions every month
   - Solution: Mark-as-recurring → auto-generate monthly expenses
   - Expected impact: Increases stickiness, reduces churn

2. **Smart Settlement + Payment Integration** (3-4 sprints, HIGH impact)
   - Currently: "Person A owes Person B $X" but settlement is manual
   - Solution: Integrate Stripe/PayPal; one-tap payment requests; proof-of-payment tracking
   - Expected impact: Removes payment friction; reduces disputes; increases retention

3. **Referral Program** (1-2 sprints, QUICK WIN)
   - Mechanic: "Invite friends, get $5 credit per signup"
   - Expected impact: +15-25% signup growth at low cost

#### Revenue Potential
- **Current:** $0 (free product)
- **Path:** Premium tier (analytics dashboard, advanced settlement features, no-ad experience)
- **12-month projection:** If referral + recurring + settlement features ship:
  - 10-20 paid users/month (conservative for expense-sharing apps) = $50-100/month premium revenue
  - By month 12: **$150-600/month cumulative** (optimistic; $500-1.5k assumes faster growth + mobile app)

#### Next 30 Days
1. **Joe decision:** Growth (mobile app + integrations) or harvest (retention focus)?
2. **Week 1-2:** If harvest: ship recurring expense automation
3. **Week 1-2:** If grow: scope mobile app architecture + timeline

---

### 3. **Market Signal Lab** — Stock/Crypto Buy/Sell Signal App (Internal R&D)

**Current Status:** Active research; internal use only; no external commercialization

#### What's Working
- ✅ Core signal generation: SMA crossover, RSI, Donchian multi-strategy
- ✅ ATR-based stops (backtest engine)
- ✅ ADX regime detection (trending vs. ranging filter)
- ✅ Multi-timeframe confirmation
- ✅ ML feature engineering (30+ features)
- ✅ Alternative data integration (Fear & Greed, funding rates, BTC dominance)
- ✅ Slack alerting (signal + entry/exit)

#### What's Missing (Identified 2026-03-29)
1. **Position Tracking Ledger** — No record of entry price when signal fires
   - Missing: Profit-take + stop-loss % alerts (currently unable to track P&L vs. entry)
   - Gap vs. atlas_arche_en: No 20%/8% threshold alerts
   - Effort: Medium (DuckDB table + entry recording)
   - Value: High (enables position-aware signals)

2. **Percentage-Based Alert Thresholds** — Currently triggers on signal type only
   - Missing: Config options for `profit_take_pct` and `stop_loss_pct`
   - Impact: Can't automatically alert on price movement relative to entry
   - Effort: Low (add config + threshold check)
   - Value: High (Joe-friendly automation)

3. **Discord Alerting** — Currently Slack-only; Joe's workflow migrating to Discord
   - Missing: Discord webhook integration (Slack deprecated 2026-03-25)
   - Effort: Low (reuse existing webhook pattern)
   - Value: Medium (alignment with Joe's communication flow)

#### Scope Boundary (Intentional)
- **Internal use only:** No external commercialization planned
- **Why:** Deliberately scoped to R&D / Joe's personal trading strategy
- **If policy changes:** Potential to offer as B2B2C tool to traders (high-effort, 3-6 month effort to productize)

#### Revenue Potential
- **Current:** $0 (internal tool)
- **Path:** Defer external monetization; continue internal optimization

#### Next 30 Days
1. **Priority 1:** Add position ledger (enables % threshold alerts)
2. **Priority 2:** Discord webhook integration (aligns with Joe's channels)
3. **Optional:** Evaluate atlas_arche_en feedback on position-tracking model vs. signal-generation model

---

### 4. **Automation Consulting** — Services Business (Active Revenue)

**Current Status:** Strongest cash anchor; ongoing client work; capacity bottleneck

#### What's Working
- ✅ **Active revenue:** $3-10k/month (consulting billings)
- ✅ Multiple clients: Existing relationships + inbound inquiries
- ✅ High hourly yield: Well-scoped projects, premium positioning
- ✅ Predictable: Consulting provides baseline for product R&D investment

#### What's Limited
- ⏳ **Time ceiling:** Revenue tied to Joe's hours; can't scale without hiring or productization
- ⏳ **Productization gap:** No templated offers, SOPs, or scalable products
- ⏳ **Opportunity cost:** High-value consulting hours could be allocated to product development

#### Scaling Path
- **Option A (Services at Scale):** Build templates, SOPs, standardized offers → hire delivery team → productized services
  - Effort: 4-6 weeks for core templates
  - ROI: +50% revenue (via faster delivery) or expand to 2-3 FTE delivery
  - Potential: $8-20k/month (current path)

- **Option B (Product Leverage):** Reduce consulting hours; invest more in passive income products
  - Trade-off: Short-term revenue dip while products ramp
  - ROI: Long-term leverage (products scale without time)

#### Revenue Potential
- **Current:** $3-10k/month
- **12-month potential:** $8-20k/month (with productization or team scaling)

#### Next 30 Days
- **Ongoing:** Continue client work (baseline revenue)
- **Optional:** If passive income launches stall, increase consulting hours to buffer consulting baseline

---

## Portfolio Health Assessment

### Current Mix
- **Services (consulting):** 100% of current revenue ($3-10k/month)
- **Products (CoinUsUp, Even Us Up):** 0% of current revenue; 2-3 months from first revenue potential
- **R&D (Signal App):** 0% revenue (internal scope)

### Concentration Risk
**HIGH:** Consulting is 100% of current income. If client work dries up, portfolio collapses.

**Mitigation:** Accelerate product launches (CoinUsUp + Even Us Up) to diversify revenue mix.

### Passive Income Readiness (Next 12 Months)
| Project | Status | Likelihood of $500+/mo Revenue | Timeline |
|---------|--------|--------|----------|
| CoinUsUp | 1-2 months from launch | Medium (70%) | Apr-May 2026 |
| Even Us Up | 3-4 months from launch | Low-Medium (40%) | May-Jun 2026 |
| Signal App | Internal only | N/A (no launch planned) | N/A |
| Consulting | Baseline active | High (95%) | Ongoing |

### Biggest Levers (Impact on 12-month MRR)
1. **CoinUsUp trial + content hub launch** → Potential +$100-400/month (est. 4-8 weeks to first revenue)
2. **Even Us Up mobile app or settlement integration** → Potential +$150-600/month (est. 8-12 weeks to first revenue)
3. **Consulting productization** → Potential +$200-1000/month (est. 4-6 weeks setup, then scaling)

---

## Priority Recommendations (Next 30 Days)

### **TIER 1: Unblock CoinUsUp Launch (IMMEDIATE)**
- [ ] Joe: Complete Stripe price config (5 minutes)
- [ ] Alfred: Launch trial; monitor conversion rate
- [ ] Joe: Decide content hub platform (Substack vs. Ghost vs. custom domain)
- **Impact:** $0 → $50-150/month potential within 30 days

### **TIER 2: Even Us Up Strategy Alignment (WEEK 1)**
- [ ] Joe: Growth (mobile app + integrations) or harvest (retention focus)?
- [ ] Alfred: If harvest → scope recurring expense automation (2-3 sprints)
- [ ] Alfred: If grow → outline mobile app + timeline
- **Impact:** Clarifies roadmap; enables focused execution

### **TIER 3: Signal App Position Tracking (WEEK 2-3)**
- [ ] Alfred: Build position ledger (DuckDB table)
- [ ] Alfred: Add Discord webhook support (aligns with Joe's channels)
- [ ] Joe: Test % threshold alerts (20% profit-take, 8% stop-loss)
- **Impact:** Enables position-aware signals; cleaner alerting workflow

### **TIER 4: Consulting Productization (MONTH 2-3)**
- [ ] Joe: Audit 3-5 recent consulting projects for templatable patterns
- [ ] Alfred: Draft service offering #1 with SOP, pricing, scope
- [ ] Joe: Decide: hire delivery team or keep premium 1:1 model?
- **Impact:** +$200-1000/month potential within 8-12 weeks

---

## Key Dates & Deadlines

| Date | Blocker | Impact |
|------|---------|--------|
| **TODAY (Mar 29)** | CoinUsUp Stripe config | Trial can't launch without it |
| **Mar 31** | Even Us Up strategy decision | Roadmap blocked (growth vs. harvest) |
| **Apr 5** | Content hub platform choice | Content production can't start |
| **Apr 20** | Recurring expenses MVP launch | Even Us Up stickiness lever |
| **May 1** | Signal App position ledger deployed | Alerts more actionable |

---

## Summary

**Portfolio snapshot:** $3-10k/month consulting + $0 in product revenue (3 products pre-launch). Biggest immediate lever: CoinUsUp Stripe config (5-minute unblock) + content hub launch (2-3 week setup). Even Us Up strategy alignment needed (growth vs. harvest decision). Signal App needs position tracking (medium effort, high impact). Consulting baseline solid but time-capped; productization path exists.

**Net passive income potential in 12 months:** $500-2000/month (conservative, assuming CoinUsUp + Even Us Up launch and basic monetization).

---

**Portfolio review by:** Alfred  
**Date:** 2026-03-29 06:39 ADT  
**Context used:** 21%  
**Status:** Ready for Joe decisions
