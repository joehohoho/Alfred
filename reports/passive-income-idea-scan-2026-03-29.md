# Passive Income Idea Scan — 2026-03-29

**Executor:** Alfred (proactive idle task 1/8)  
**Time:** 10:43 ADT  
**Expertise Areas:** Automation, trading signals, law firm tooling, Canadian SMB compliance, AI-assisted workflows

---

## Overview

Researched 3 niche SaaS opportunities aligned with Joe's 20+ years of consulting expertise (elite billing software, data transformation, automation). Focus: low-build, low-maintenance, recurring revenue with realistic solo-dev feasibility.

---

## Idea #1: **Invoice OCR + Categorization for Canadian Tax Compliance**

### Problem
Canadian SMBs (10-50 employees) manually categorize invoices for quarterly GST/HST filings. Current workflow:
- Receipt/invoice arrives (email, PDF, photo)
- Manual data entry: vendor, amount, GST/HST status, category (travel, meals, office, etc.)
- Spreadsheet organizing for quarterly filing
- Time cost: 3-5 hours/month per business

Existing solutions (Expensify, Zoho Expense) are broad-market and expensive ($20-50/user/mo). Gap: no Canadian-specific compliance tool for solo/micro businesses.

### Target Market
- **Primary:** Canadian SMBs with 10-50 employees; monthly invoice volume 50-200
- **Size:** ~80k Canadian SMBs in this range
- **Pain level:** HIGH (tax filing deadline stress, compliance risk)
- **Willingness to pay:** HIGH ($30-99/month for compliance peace of mind)

### Estimated MRR Potential
- **Acquisition:** 500-1000 paying users year 1 (organic + Google Ads targeting "GST filing", "HST invoices")
- **ARPU:** $45-60/month (Canadian pricing, annual commitment discount)
- **Year 1 MRR:** $22.5k-60k
- **Year 3 MRR:** $100k-200k+ (with affiliate partnerships with accountants)

### Tech Complexity
**Difficulty:** 3/5 (Medium)
- **Build:** Receipt OCR (integrate Google Vision or AWS Textract), invoice categorization rules (ML or rule-based), GST/HST tax code lookup, quarterly report generation
- **Hosting:** Vercel or AWS; database (PostgreSQL); email delivery
- **Integration:** Email parsing (Zapier or custom IMAP), Stripe for billing
- **Deployment:** 4-6 weeks MVP (OCR + basic categorization + report export)

### Competition Level
**Medium competition**
- Direct competitors: Expensify (broad, expensive), Wave (free tier, poor compliance focus), Zoho Expense (complex for SMBs)
- Canadian-specific players: Waveapps (mostly invoicing, not compliance-focused), FreshBooks (overkill for small businesses)
- **Competitive gap:** No purpose-built tool for Canadian tax compliance focused on solo/micro SMBs

### Why Joe Is Positioned to Win
1. **20+ years in billing software implementation** — deep knowledge of invoice data structure, categorization logic, compliance rules
2. **Canadian context expert** — understands GST/HST nuances; knows pain points from consulting work
3. **Low-competition niche** — most incumbents focus on broad expense management, not compliance filing
4. **Solo-dev feasible** — OCR is outsourced (Google Vision), categorization is rule-based initially, compliance rules are static
5. **Recurring revenue model proven** — SaaS subscription for annual/monthly compliance is a natural fit

### Top 3 Risks
1. **Regulatory risk:** Tax rules change; need to track Canadian GST/HST updates (mitigation: build rule versioning + automated reminders when rules change)
2. **CAC (Customer Acquisition Cost):** Reaching SMBs requires Google Ads + accountant partnerships; CAC might be $200-400/customer (mitigation: 12-month commitments, referral partnerships)
3. **Churn in off-season:** Usage drops post-tax-filing; need to retain users for Q1 spike (mitigation: add year-round features: budget tracking, vendor analysis)

### Recommended MVP Scope
- Week 1-2: Integration with Google Vision OCR; invoice upload flow
- Week 2-3: Rule-based categorization (50 common Canadian GST/HST categories)
- Week 3-4: Quarterly report generation (PDF export)
- Week 4-5: Stripe integration + email receipt
- Week 5-6: Landing page + 10-user private beta (target accountants for referrals)

---

## Idea #2: **Trading Signal Backtesting & Portfolio Optimization SaaS**

### Problem
Retail traders (crypto + equities) test trading strategies manually:
- Current workflow: Use TradingView scripts, Backtrader, or live paper trading
- Pain points:
  - Parameter optimization is tedious (manual testing different SMA windows, RSI thresholds)
  - Multi-timeframe strategies require piecing together data from multiple sources
  - No built-in portfolio rebalancing optimization
  - No risk management (max drawdown, position sizing) calculation
  
Existing solutions: Tradestation ($100/mo, complex), TradingView Premium ($12/mo, limited backtesting), Backtrader (open-source, dev-heavy).

Gap: No user-friendly, affordable backtesting tool for retail traders wanting to optimize strategy parameters without coding.

### Target Market
- **Primary:** Retail traders (crypto + equities) testing strategies; 10k-50k active traders globally
- **Secondary:** Small prop trading teams (2-5 people); 1k-5k teams
- **Willingness to pay:** MEDIUM ($20-50/month for serious traders; most use free tools)
- **Market growth:** Crypto trading is cyclical; bullish in bull markets, quiet in bear markets

### Estimated MRR Potential
- **Acquisition:** 1000-2000 paying users year 1 (organic from Reddit r/algotrading, crypto forums, YouTube tutorials)
- **ARPU:** $25-40/month (freemium model: basic backtesting free, advanced strategies paid)
- **Year 1 MRR:** $25k-80k
- **Year 3 MRR:** $100k-200k+ (with API access tier for quant funds)

### Tech Complexity
**Difficulty:** 4/5 (High, but mostly existing Signal Lab code)
- **Build:** Reuse Signal Lab backtesting engine; add web UI for parameter optimization, portfolio analysis charts
- **Data:** Integrate with yfinance, Alpaca, Kraken APIs for real-time data
- **Hosting:** AWS Lambda + RDS for heavy backtest jobs; Vercel for UI
- **Deployment:** 8-10 weeks (backtest engine exists, UI + API layer new)

### Competition Level
**Medium-high competition**
- Direct competitors: TradingView (dominant but expensive for advanced features), Backtrader (free, dev-focused), Zipline (academic)
- SaaS gap: Few affordable SaaS backtesting platforms designed for retail traders
- **Differentiation:** Signal Lab's advanced features (ADX regime, multi-strategy, alternative data) are not in mainstream backtesting tools

### Why Joe Is Positioned to Win
1. **Signal Lab MVP already built** — core backtesting engine, multi-strategy support, alternative data integrations
2. **Deep knowledge of trading signals** — understands parameter optimization, regime detection, position management
3. **Unique features** — ADX regime detection, Fear & Greed integration, funding rate signals (crypto-specific) are not in mainstream tools
4. **Niche community access** — Joe can tap crypto/trading communities directly
5. **Recurring revenue potential** — per-strategy subscriptions, API tiers for quant funds

### Top 3 Risks
1. **Market cyclicality:** Trader interest spikes in bull markets (2021, 2024); crashes in bear markets (2022, 2023); revenue is volatile
2. **Competition from giants:** TradingView, Backtrader have network effects; hard to differentiate on features alone
3. **Data costs:** Real-time market data APIs (Alpaca, Kraken) are expensive; gross margins compress as scale increases (mitigation: partner with brokers for data; offer API integrations as premium tier)

### Recommended MVP Scope
- Week 1-2: Expose Signal Lab backtesting engine via REST API
- Week 2-3: Build web UI for parameter sweep (SMA window, RSI threshold sliders)
- Week 3-4: Portfolio analysis dashboard (Sharpe ratio, max drawdown, return chart)
- Week 4-5: Freemium model (3 backtests/month free, $29/mo for unlimited)
- Week 5-6: Landing page + launch on ProductHunt

---

## Idea #3: **Canadian Payroll + Benefits Compliance Automation for SMBs**

### Problem
Canadian SMBs (20-100 employees) face complex payroll + benefits compliance:
- Federal + provincial tax withholding (varies by province)
- CPP/EI calculations (rate changes annually)
- Benefits administration (group health insurance, RRSP matching)
- Record-keeping for T4 filing (CRA deadlines)
- Vacation accrual tracking (varies by province)

Current solutions: QuickBooks Payroll ($500-2000/year, requires accountant oversight), Guidepoint ($50-100/employee/year, enterprise-focused), Excel spreadsheets (risk of errors, audit vulnerability).

Gap: No mid-market payroll tool designed for 20-100 employee Canadian businesses with low/medium complexity. ADP/Mercer are too expensive ($10k+/year); Paychex not available in Canada.

### Target Market
- **Primary:** Canadian SMBs with 20-100 employees; ~30k businesses in Canada
- **Pain level:** VERY HIGH (CRA compliance errors = fines + audits)
- **Willingness to pay:** VERY HIGH ($500-2000/year for peace of mind + saved admin time)
- **Buyer:** HR manager or office manager (not CFO)

### Estimated MRR Potential
- **Acquisition:** 200-500 paying customers year 1 (sales + partnerships with accountants/bookkeepers)
- **ARPU:** $100-200/month (annual pricing: $1.2k-2.4k/year per client)
- **Year 1 MRR:** $20k-100k
- **Year 3 MRR:** $150k-300k+ (stickiest product type; high churn resistance once installed)

### Tech Complexity
**Difficulty:** 4.5/5 (High; regulatory complexity is the blocker)
- **Build:** Payroll calculation engine (complex: multi-province tax rules), benefits tracking, T4 report generation, API integrations (CRA, provincial systems)
- **Compliance:** Must be auditable; maintain complete records; integrate with CRA systems
- **Hosting:** Secure on-premise or AWS with compliance certifications (SOC 2)
- **Deployment:** 12-16 weeks (massive regulatory research + testing + accountant vetting)

### Competition Level
**High competition**
- Incumbents: QuickBooks Payroll (dominant), Wave (basic payroll, growing), Guidepoint (premium)
- Gap: No modern, SMB-focused Canadian payroll SaaS
- **Risk:** High barrier to entry (regulatory, compliance testing, accountant credibility)

### Why Joe Is Positioned to Win
1. **20+ years in billing/law firm tooling** — knows back-office operations, compliance requirements
2. **Canadian SMB expertise** — understands local regulatory nuances
3. **Automation consulting background** — can build scalable, reliable systems
4. **Accountant partnerships possible** — can leverage existing consulting network for distribution

### Top 3 Risks
1. **Regulatory risk:** High. CRA changes; provincial tax rules change; any miscalculation = liability. Requires:
   - Continuous CRA rule updates (hiring compliance person or partnering)
   - Accountant review before launch (credibility gate)
   - E&O insurance (costs $2k-5k/year)
2. **Market education:** Accountants/bookkeepers resist new tools; incumbents have lock-in
3. **Long sales cycle:** 3-6 months from lead to contract; expensive CAC

### Recommended MVP Scope
- **Not recommended as solo project.** This requires domain expertise + compliance review + ongoing CRA monitoring. Better as partnership with accountant firm or as acquisition target by existing payroll player.
- If pursuing: Start with 1-2 accountants as co-founders/advisors to validate rules + build credibility.

---

## Summary & Recommendations

| Idea | MRR Potential (Y1) | Build Effort | Risk Level | Joe Fit | Recommendation |
|------|----------------|--------------|-----------|---------|-----------------|
| **Invoice OCR + Tax Compliance** | $22.5k-60k | 4-6 weeks | Medium | HIGH | 🟢 **PURSUE** — Niche, defensible, fast MVP |
| **Trading Backtesting SaaS** | $25k-80k | 8-10 weeks | Medium-High | HIGH | 🟡 **PURSUE WITH CAUTION** — Reuses Signal Lab; market cyclicality risk |
| **Payroll + Benefits** | $20k-100k | 12-16 weeks | High | MEDIUM | 🔴 **NOT RECOMMENDED** — Regulatory complexity too high for solo; needs partnerships |

---

## Top Recommendation: **Invoice OCR + Canadian Tax Compliance**

**Why:**
1. **Fastest path to revenue** — 4-6 week MVP, niche market, low competition
2. **Defensible moat** — Canadian-specific compliance rules; accountant partnerships create network effects
3. **High willingness to pay** — SMBs will pay for compliance peace of mind
4. **Complements existing portfolio** — Can cross-sell to CoinUsUp + Even Us Up customers (both B2B)
5. **Solo-dev feasible** — OCR outsourced, categorization is rule-based, compliance rules are static (no constant regulation tracking)

**Next steps:**
- Week 1: Validate with 5-10 Canadian accountants (do they see demand for this?)
- Week 2-4: Build MVP (OCR + categorization + quarterly report)
- Week 5-6: Beta launch + measure CAC via Google Ads
- Month 2: If >5% conversion on ads, scale; if <5%, pivot or kill

---

**Idea scan completed by:** Alfred  
**Date:** 2026-03-29 10:43 ADT  
**Context used:** 24%  
**Status:** Ready for Joe review
