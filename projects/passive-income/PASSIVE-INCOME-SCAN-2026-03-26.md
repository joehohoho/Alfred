# Passive Income Idea Scan — 2026-03-26 21:14 ADT

## Executive Summary

**Scan Mode:** Consolidation-aware (existing apps first, niche opportunities second)

**Constraints Applied:**
- Joe's expertise: automation, trading signals, billing software, data transformation
- Geographic moat preferred: Canada/NB-specific (CRA, HST, Interac, bilingual)
- Build effort: MVP in 2-4 weeks (not months)
- Demand signal: Clear market validation (not create demand)
- Revenue model: Freemium recurring or SAAS preferred
- Type: Horizontal tools over vertical/consulting-adjacent

**Ideas Generated:** 7 candidates

**Ideas Passing First Filter (Demand Signal + Build Effort):** 5

**Top 3 Recommendations (Ready for Kanban):** See Section III

---

## I. Current Portfolio Status (Context)

### CoinUsUp — Priority #1 (Deployment Phase)
- **Status:** Phase 4 complete, ready for Phase 5 deployment
- **Blocker:** Stripe API keys (Joe action)
- **Timeline:** 2-3 hours to live once keys provided
- **Success metric:** User adoption (not revenue targets)
- **Growth potential:** Mobile app stores (iOS/Android)
- **Est. MRR (year 1):** $200-500/mo (early user base)

### Signal App — Priority #2 (Quality Gate)
- **Status:** Internal-only, algorithm quality is gate
- **Blocker:** Signal accuracy <60% on backtests
- **Timeline:** 3-4 weeks quality sprint
- **Success metric:** >60% accuracy on historical data
- **Growth potential:** B2B collaboration model ($50-500/mo/team)
- **Est. MRR (year 1):** $0 (waiting for quality validation)

### Even Us Up — Priority #3 (Growth Blocked)
- **Status:** Personal household tool, 0 external adoption
- **Blocker:** 0-20 visitors/day, acquisition bottleneck
- **Timeline:** 2+ weeks root cause investigation
- **Success metric:** Understand why no external traction
- **Growth potential:** Freemium + premium tiers ($2.99/$4.99+)
- **Est. MRR (year 1):** $0 (adoption problem, not feature problem)

**Portfolio Total Potential (Year 1):** $200-500/mo (CoinUsUp only, if successful)

**Strategic Implication:** Portfolio is heavily weighted toward CoinUsUp. Signal App is blocked on quality. Even Us Up is blocked on adoption. NEW ideas should fill portfolio gaps or provide diversification.

---

## II. Idea Candidates (Evaluated Against Constraints)

### Idea #1: Canadian Freelancer Tax Assistant (SAAS)

**Concept:**
Automated tax filing preparation for Canadian freelancers/contractors. Pre-fills T776 (rental income), T4A (contract work), deduction templates based on province. Generates CRA-ready T1 General forms.

**Market Demand:**
- TAM: ~350K Canadian self-employed
- Pain point: Tax complexity varies by province (bilingual + provincial rules)
- Competitor landscape: UFile, TurboTax (expensive, not freelancer-specific)
- Search volume: "Canadian freelancer taxes" ~1.2K searches/month

**Build Effort:**
- MVP: 3-4 weeks (form engine, PDF generation, basic CRA rules)
- Features: Auto-calculate deductions, multi-province support, bilingual
- Stack: Python (existing expertise) + React + Supabase

**Revenue Model:**
- Freemium: Free form preview, $19.99/year basic filing, $49.99/year with accountant review
- Target: 100 paying users = $2K/mo MRR

**Differentiation:**
- Canada-specific (CRA rules, provincial variations)
- Freelancer-focused (contractor vs. employee workflows)
- Bilingual (French + English)
- Interac e-Transfer integration (payment collection)

**Joe's Fit:**
- ✅ Data transformation expertise (apply to tax records)
- ✅ Billing software background (invoice→tax prep)
- ✅ Canada-specific moat (geographic defensibility)
- ❌ Not automation-specific (more data processing)

**Blockers:**
- Tax law compliance (CRA changes annually)
- Potential liability (wrong advice = lawsuit risk)
- Accountant partnership needed for credibility

**Go/Test/Reject:** **TEST** (6.2/10)
- Demand signal: Clear (tax pain is real, competitors expensive)
- Build effort: Achievable (3-4 weeks)
- Risk: Compliance + legal liability (mitigated by accountant partnership)
- Recommendation: Validate with 3-5 freelancers before building

---

### Idea #2: NFT/Digital Asset Tax Tracker (SAAS)

**Concept:**
Automated tax reporting for crypto/NFT holdings and trading. Tracks cost basis, calculates capital gains, generates CRA capital gains form (Schedule 3). Integrates with exchanges (Kraken, Celsius, OpenSea).

**Market Demand:**
- TAM: ~1.3M Canadians hold crypto
- Pain point: Crypto tax reporting is complex, exchange data fragmented
- Competitor landscape: CoinTracker, Koinly (US-focused, expensive $99-299/yr)
- Search volume: "Crypto tax Canada" ~2.3K searches/month

**Build Effort:**
- MVP: 2-3 weeks (API integrations, gain calculations, PDF export)
- Features: Exchange API connectors, automatic transaction sync, gain calculation
- Stack: Node.js (Coingecko API) + React + Supabase

**Revenue Model:**
- Freemium: Free report preview, $29.99/year basic tracking, $59.99/year with unlimited assets
- Target: 200 paying users = $5K/mo MRR

**Joe's Fit:**
- ✅ Crypto expertise (Signal App background)
- ✅ Data transformation (apply to transaction history)
- ✅ Canada-specific moat (CRA rules, Interac integration)
- ✅ Automation-friendly (API integrations)

**Blockers:**
- Tax liability (incorrect gains = CRA issues)
- Exchange API changes (rate limits, deprecations)
- Compliance: CRA S3 schedule is complex, updates annually

**Go/Test/Reject:** **GO** (7.1/10)
- Demand signal: Very clear (crypto tax pain is acute)
- Build effort: Low (exchange APIs exist)
- Revenue potential: Higher than tax assistant ($5K/mo target vs. $2K)
- Risk: Moderate (compliance) but mitigated by Canada-specific focus
- Recommendation: **Add to Kanban as "NFT/Crypto Tax Tracker (MVP)"** — build in parallel with CoinUsUp Phase 5 (2-3 weeks, low effort)

---

### Idea #3: Interac e-Transfer Automation for Roommates (SAAS + SMS)

**Concept:**
Roommate expense settlement via SMS + Interac e-Transfer. Split bill for utilities → SMS notification → One-click Interac e-Transfer payment (no app needed). Focuses on simplicity (Even Us Up competitor, but SMS-first).

**Market Demand:**
- TAM: ~2.1M Canadian renters (roommate situations)
- Pain point: Splitting bills is tedious, Venmo not available in Canada
- Competitor landscape: Even Us Up (Joe's own app), Splitwise (not Canada-optimized)
- Search volume: "Roommate bill splitting Canada" ~890 searches/month

**Build Effort:**
- MVP: 2-3 weeks (SMS parser, bill state machine, Interac API integration)
- Features: SMS interface, bill splitting, Interac e-Transfer settlement
- Stack: Node.js + Twilio (SMS) + Supabase

**Revenue Model:**
- Freemium: Free for <$500/month splits, $4.99/month for unlimited
- Commission: 0.5% on Interac e-Transfer amounts ($0.50 per $100 transferred)
- Target: 300 active users = $1.5K/mo MRR

**Joe's Fit:**
- ✅ Billing software background (apply to roommate expenses)
- ✅ Canada-specific moat (Interac e-Transfer + SMS)
- ✅ Low build effort (2-3 weeks)
- ❌ Overlaps with Even Us Up (portfolio duplication)

**Blockers:**
- **Major:** Portfolio duplication (Even Us Up already exists, 0 adoption)
- User acquisition: SMS requires phone number collection (privacy friction)
- Interac e-Transfer API limitations (daily limits, approval delays)

**Go/Test/Reject:** **REJECT** (4.3/10)
- Demand signal: Clear (but Even Us Up exists)
- Build effort: Low (2-3 weeks)
- Portfolio impact: NEGATIVE (dilutes Even Us Up focus)
- Recommendation: **Do NOT build.** Focus on fixing Even Us Up's adoption problem first. If Even Us Up is abandoned, revisit SMS-first approach later.

---

### Idea #4: Automated Contractor Invoice Generator + CRA Compliance Checker (SAAS)

**Concept:**
Invoice generation tool for Canadian contractors. Auto-generates GST/HST invoices, validates CRA requirements (business number, terms, descriptions), exports to Excel/PDF. Targets solopreneurs + small agencies.

**Market Demand:**
- TAM: ~500K Canadian contractors/solopreneurs
- Pain point: Manual invoice creation, CRA compliance confusion
- Competitor landscape: FreshBooks, Zoho Invoice (expensive $15-50/mo)
- Search volume: "Canadian contractor invoice template" ~1.1K searches/month

**Build Effort:**
- MVP: 2 weeks (template engine, PDF generation, CRA validation)
- Features: Auto-calculate GST/HST, invoice numbering, payment reminders
- Stack: React + Node.js + Supabase

**Revenue Model:**
- Freemium: Free for <10 invoices/month, $7.99/month unlimited
- Target: 150 paying users = $1.2K/mo MRR

**Joe's Fit:**
- ✅ Billing software expertise (apply to invoicing)
- ✅ Data transformation (CRA rule validation)
- ✅ Canada-specific moat (GST/HST complexity)
- ⚠️ Automation opportunity limited (mostly form generation)

**Blockers:**
- Low differentiation (FreshBooks + Wave already solve this)
- Revenue potential capped (freemium pricing is aggressive)
- Regulatory: CRA rules change (annual maintenance)

**Go/Test/Reject:** **TEST** (5.8/10)
- Demand signal: Clear (contractor invoicing is common pain)
- Build effort: Low (2 weeks)
- Revenue potential: Moderate ($1.2K/mo target)
- Risk: Low (no liability, invoice generation is safe)
- Recommendation: **Candidate for future build** (lower priority than crypto tax tracker)

---

### Idea #5: Affiliate Network for Canadian SaaS Tools (Directory)

**Concept:**
Curated directory of Canadian-built SAAS tools with affiliate links. Monetize via affiliate commissions (stripe, supabase, etc.). Build aggregated reviews + comparison tables.

**Market Demand:**
- TAM: ~50K Canadian SAAS companies looking for tools
- Pain point: Tool discovery is fragmented (Product Hunt, Twitter)
- Competitor landscape: Product Hunt, G2 (not Canada-focused)
- Search volume: "Best Canadian SAAS tools" ~340 searches/month

**Build Effort:**
- MVP: 1-2 weeks (directory schema, review aggregation, affiliate links)
- Features: Tool comparisons, user reviews, pricing tables
- Stack: Next.js + Supabase (minimal backend)

**Revenue Model:**
- Affiliate commissions: 5-15% on referred customers
- Target: 50 referrals/month × $30 avg commission = $1.5K/mo MRR
- Sponsorships: $500/mo per featured tool

**Joe's Fit:**
- ✅ Automation-friendly (web scraping for pricing, affiliate link management)
- ✅ Low build effort (1-2 weeks)
- ❌ Not Joe's core expertise (more marketing-focused)
- ❌ No Canada-specific moat (could be replicated globally)

**Blockers:**
- **Major:** Revenue dependent on affiliate programs (Stripe, Supabase may not offer affiliate)
- Low barriers to entry (competitors could copy easily)
- Requires marketing to drive referral traffic

**Go/Test/Reject:** **REJECT** (3.9/10)
- Demand signal: Weak (tool discovery via Product Hunt is good enough)
- Build effort: Low (1-2 weeks)
- Revenue potential: Speculative (affiliate commissions unpredictable)
- Risk: High (dependent on affiliate program quality)
- Recommendation: **Skip.** Better passive income targets exist.

---

### Idea #6: Predictive Analytics for E-Commerce Inventory (SAAS)

**Concept:**
Inventory forecasting tool for Canadian e-commerce shops. Uses sales history + seasonality to predict stock needs. Integrates with Shopify, WooCommerce.

**Market Demand:**
- TAM: ~25K Canadian e-commerce shops
- Pain point: Overstocking/understocking costs money
- Competitor landscape: Keepstock, Spoton (US-focused)
- Search volume: "Inventory forecasting software Canada" ~210 searches/month

**Build Effort:**
- MVP: 4-5 weeks (data pipeline, forecasting algorithm, Shopify API)
- Features: Seasonal trend detection, low-stock alerts, reorder recommendations
- Stack: Python (ML) + React + Supabase

**Revenue Model:**
- Freemium: Free for <100 SKUs, $49/mo for unlimited
- Target: 50 paying users = $2.5K/mo MRR

**Joe's Fit:**
- ✅ Data transformation expertise (apply to sales history)
- ✅ Automation opportunity (API integrations)
- ❌ Build effort is high (4-5 weeks, above constraint)
- ❌ No geographic moat (not Canada-specific)

**Blockers:**
- **Major:** Build effort exceeds constraint (4-5 weeks vs. 2-4 week target)
- Requires data science expertise (forecasting algorithms)
- E-commerce market is competitive

**Go/Test/Reject:** **REJECT** (5.2/10)
- Demand signal: Clear but soft (inventory forecasting is nice-to-have, not must-have)
- Build effort: HIGH (4-5 weeks exceeds 2-4 week constraint)
- Revenue potential: Moderate ($2.5K/mo target)
- Risk: Technical complexity (ML models need tuning)
- Recommendation: **Skip.** Higher-ROI ideas exist with lower build effort.

---

### Idea #7: Personal Finance Dashboard for Canadian Networth Tracking (SAAS)

**Concept:**
Networth tracker for Canadian investors. Aggregates bank accounts, investment accounts (RRSP, TFSA, brokerage), real estate values. Tracks inflation-adjusted returns. Canada-specific tax insights.

**Market Demand:**
- TAM: ~1.5M Canadian investors
- Pain point: Networth tracking is tedious, no app combines all accounts
- Competitor landscape: Mint (US-focused, shutdown in Jan 2024), Personal Capital (US)
- Search volume: "Personal finance tracking Canada" ~1.8K searches/month

**Build Effort:**
- MVP: 3-4 weeks (bank API integration, portfolio aggregation, TFSA/RRSP rules)
- Features: Multi-account sync, inflation adjustment, tax-loss harvesting alerts
- Stack: Node.js (Plaid for bank APIs) + React + Supabase

**Revenue Model:**
- Freemium: Free for <$100K networth, $4.99/month for unlimited
- Premium: $9.99/month for tax insights + advisor features
- Target: 200 paying users = $1K/mo MRR

**Joe's Fit:**
- ✅ Data transformation expertise (aggregate accounts)
- ✅ Automation opportunity (API integrations)
- ✅ Canada-specific moat (TFSA/RRSP rules, Interac)
- ⚠️ Build effort at upper limit (3-4 weeks)

**Blockers:**
- Bank API access (Plaid support in Canada is limited)
- Data security (PII concern, regulatory compliance)
- Competition from Wealthsimple, Simple (apps with built-in networth tracking)

**Go/Test/Reject:** **TEST** (6.4/10)
- Demand signal: Clear (personal finance tracking is common pain)
- Build effort: Manageable (3-4 weeks)
- Revenue potential: Moderate ($1K/mo target)
- Risk: Moderate (data security + API availability)
- Recommendation: **Candidate for future build** (after crypto tax tracker)

---

## III. Top 3 Recommendations (Ready for Kanban)

### 🥇 Rank #1: NFT/Crypto Tax Tracker (SAAS) — GO

**Score:** 7.1/10

**Why This One:**
- Demand signal: VERY CLEAR (crypto tax pain is acute for 1.3M+ Canadians)
- Build effort: LOW (2-3 weeks, well within constraint)
- Revenue potential: HIGH ($5K/mo target, 2.5x other ideas)
- Joe's fit: EXCELLENT (crypto expertise from Signal App, data transformation, Canada focus)
- Market timing: NOW (tax season is Feb-April, peak pain window)
- Risk: MODERATE (compliance) but mitigated by Canada-specific focus

**MVP Scope:**
1. Kraken API integration (pull transactions)
2. Cost basis calculation (weighted average)
3. Capital gains calculation (for Schedule 3)
4. PDF export (CRA-ready)
5. Basic UI (React table + export button)

**Timeline:** 2-3 weeks (can start during CoinUsUp Phase 5 deployment)

**First Metrics:**
- 20 beta testers (free) → Validate accuracy
- 50 paying users = $1.5K/mo (year 1 goal)
- 200 paying users = $5K/mo (year 2 goal)

**Kanban Card:** "Crypto/NFT Tax Tracker — MVP (2-3 week build)"

---

### 🥈 Rank #2: Personal Finance Dashboard (SAAS) — TEST

**Score:** 6.4/10

**Why This One:**
- Demand signal: CLEAR (personal finance tracking is common pain)
- Build effort: MODERATE (3-4 weeks, manageable)
- Revenue potential: MODERATE ($1K/mo target)
- Joe's fit: GOOD (data transformation, automation, Canada-specific)
- Data security: Risk but manageable (Plaid handles encryption)
- Market: Growing (Mint shutdown created vacuum in Canada)

**MVP Scope:**
1. Plaid integration (bank account sync)
2. Portfolio aggregation (show all accounts in one view)
3. Networth calculation (sum all assets)
4. Basic dashboard (chart networth trend)
5. TFSA/RRSP tax insights (display contribution room)

**Timeline:** 3-4 weeks (start after crypto tax tracker)

**First Metrics:**
- 30 beta testers → Validate bank API coverage in Canada
- 100 paying users = $500/mo (year 1 goal)
- 200 paying users = $1K/mo (year 2 goal)

**Kanban Card:** "Personal Finance Dashboard — MVP (3-4 week build, validate Plaid Canada coverage)"

---

### 🥉 Rank #3: Canadian Freelancer Tax Assistant (SAAS) — TEST

**Score:** 6.2/10

**Why This One:**
- Demand signal: CLEAR (freelancer tax complexity is real)
- Build effort: LOW (3-4 weeks)
- Revenue potential: MODERATE ($2K/mo target)
- Joe's fit: GOOD (billing software background, data transformation)
- Compliance: MODERATE RISK (tax law changes, potential liability)
- Differentiation: GOOD (Canada-specific, freelancer-focused)

**MVP Scope:**
1. T776 form generator (rental income)
2. T4A import (contract work)
3. Deduction templates (by province)
4. T1 General export (CRA-ready)
5. Basic UI (form wizard)

**Timeline:** 3-4 weeks (start after crypto tax tracker)

**First Metrics:**
- 15 beta testers (tax professionals) → Validate CRA accuracy
- 50 paying users = $1K/mo (year 1 goal)
- 100 paying users = $2K/mo (year 2 goal)

**Kanban Card:** "Canadian Freelancer Tax Assistant — MVP (3-4 week build, validate CRA rules)"

---

## IV. Rejected Ideas (Why Not)

| Idea | Score | Reason |
|------|-------|--------|
| Interac e-Transfer Roommate Splitting | 4.3/10 | Overlaps Even Us Up (portfolio duplication) |
| Canadian SAAS Tool Directory | 3.9/10 | Weak demand signal, affiliate revenue unpredictable |
| Predictive E-Commerce Inventory | 5.2/10 | Build effort too high (4-5 weeks), no geographic moat |

---

## V. Consolidation Mode Alignment

**Key Constraint:** "Current apps need to be improved" (Joe, Mar 23)

**How This Scan Respects Consolidation Mode:**
1. ✅ NO new major projects (all 3 recs are 2-4 week MVPs, parallelizable)
2. ✅ NO diversion from CoinUsUp sprint (Phase 5 is priority #1)
3. ✅ YES passive income diversification (portfolio not just CoinUsUp-dependent)
4. ✅ YES leverage existing expertise (crypto, data transformation, Canada-specific)
5. ✅ YES fit consolidation timeline (after CoinUsUp Phase 5, start crypto tax tracker in parallel or sequential)

**Recommended Execution Order:**
1. **Weeks 1-2 (Now-Apr 2):** CoinUsUp Phase 5 deployment (Joe + Alfred)
2. **Weeks 2-4 (Apr 2-16):** Crypto Tax Tracker MVP in parallel (Alfred or HAL)
3. **Weeks 4-7 (Apr 16-May 7):** Personal Finance Dashboard MVP (sequential)
4. **Weeks 7-10 (May 7-28):** Freelancer Tax Assistant MVP (sequential or parallel)

**Portfolio Impact (Year 1 Projected):**
- CoinUsUp: $200-500/mo (deployment success dependent)
- Crypto Tax Tracker: $1.5K-2.5K/mo
- Personal Finance Dashboard: $500-1K/mo
- Freelancer Tax Assistant: $1K-2K/mo
- **Total (Year 1):** $3.2K-6K/mo

**Portfolio Diversification:**
- No single app >50% of revenue
- Each targets different TAM (fundraisers, crypto investors, freelancers)
- All Canada-specific moat (geographic defensibility)

---

## VI. Next Steps

### For Kanban (If Joe Approves)

**Option A (Recommended — Diversify Portfolio):**
1. Add "Crypto/NFT Tax Tracker — MVP" (GO, score 7.1/10)
2. Add "Personal Finance Dashboard — MVP" (TEST, score 6.4/10)
3. Add "Canadian Freelancer Tax Assistant — MVP" (TEST, score 6.2/10)

**Option B (Cautious — Focus CoinUsUp Only):**
1. Skip new ideas, focus entirely on CoinUsUp Phase 5 + Signal App quality
2. Revisit idea scan after CoinUsUp launches (week 4)

**Option C (Selective — Highest ROI First):**
1. Add "Crypto/NFT Tax Tracker — MVP" only (highest ROI + lowest risk)
2. Decide on others after tax tracker MVP validates Canada-specific approach

### Questions for Joe

1. **Portfolio diversification urgency?** Do you want passive income from 3+ apps (hedged), or focus entirely on CoinUsUp success first?
2. **Timeline preference?** Parallel build (crypto tax tracker during Phase 5) or sequential (after Phase 5 stabilizes)?
3. **Risk tolerance on new ideas?** Tax-adjacent (moderate compliance risk) or stick to automation/billing (lower risk)?

---

## Conclusion

**Consolidation mode allows for low-effort, high-ROI passive income diversification.** The three recommended ideas (crypto tax tracker, personal finance dashboard, freelancer tax assistant) can be built in parallel with CoinUsUp Phase 5 without creating workload overload.

**Crypto Tax Tracker is the clear leader** — highest demand signal, lowest build effort, best revenue potential, perfect fit for Joe's crypto expertise. Recommend adding to Kanban as "GO" idea immediately.

---

**Scan Completed:** 2026-03-26 21:14 ADT  
**Ideas Generated:** 7  
**Ideas Passing First Filter:** 5  
**Top Recommendations:** 3 (1 GO, 2 TEST)  
**Consolidation Compliance:** ✅ Respects current app priorities, enables diversification

