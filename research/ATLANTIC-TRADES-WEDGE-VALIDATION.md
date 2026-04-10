# Atlantic Trades Tax & Invoice Guard — Market Validation Research

**Date:** 2026-04-10  
**Status:** RESEARCH PHASE (In Progress)  
**Target Product:** Atlantic Trades Tax and Invoice Guard  
**Buyer:** Electricians, plumbers, HVAC contractors, renovation crews across NB/NS/NL/PEI

---

## 1. CRA Invoicing & Tax Compliance Requirements (VALIDATED)

### Atlantic Canada HST Rates (Confirmed 2026)
- **Nova Scotia:** 14% HST (5% federal + 9% provincial) — REDUCED from 15% April 1, 2025
- **New Brunswick:** 15% HST (5% federal + 10% provincial)
- **Newfoundland & Labrador:** 15% HST (5% federal + 10% provincial)
- **Prince Edward Island:** 15% HST (5% federal + 10% provincial)

**Key Insight:** NS rate change (15% → 14%) creates ongoing invoicing complexity for multi-province contractors. If an NB electrician works on a Nova Scotia job, invoices must reflect 14% HST, not their home province's 15%.

### CRA Three-Tier Invoice Documentation System

**Tier 1 (Under $30 total):**
- Supplier name
- Date
- Total amount

**Tier 2 ($30.01–$149.99):**
- Above + supplier GST/HST registration number
- Terms of payment or statement that HST was charged + total tax amount

**Tier 3 ($150+):**
- Above + buyer's name
- Brief service/goods description
- Each GST/HST amount shown separately per tax rate
- Total GST/HST

**Critical Audit Triggers:**
1. Missing or invalid GST/HST registration number (most frequent disallowance reason)
2. Supplier name mismatch vs. CRA registry (e.g., "Joe's Plumbing" vs. "Joseph Smith Plumbing Inc.")
3. Incomplete tier-specific documentation
4. Wrong HST rate applied (wrong province, or rate mixing)
5. Unseparated or uncalculated tax amounts
6. Math errors in HST calculations

### Contractor-Specific Pain Points (Research Findings)

**From industry sources (ServiceTitan, Optsy, FlatRate):**
- Manually tracking invoice status (sent, received, paid, overdue)
- Converting estimates to invoices — quote-to-invoice drift (prices, scope changes)
- Receipt capture and matching to job numbers
- Managing subcontractor billing and receipts
- Seasonal job volume swings (spring/summer peaks, winter dry spells)
- Multi-job cost allocation and profitability tracking

**Tax-Specific Gaps:**
- Generic invoicing tools (Wave, FreshBooks, QuickBooks) do NOT include:
  - Automatic HST rate detection by client province (NB vs. NS vs. NL vs. PEI)
  - CRA tier-specific field validation
  - Bilingual invoice templates (critical for NB/francophone regions)
  - HST filing deadline reminders (quarterly, deadlines, late penalties)
  - Receipt capture → job cost allocation workflows

---

## 2. Competitor Landscape (MAPPED)

### Tier 1: Enterprise/Mid-Market (Not Relevant to Solo Trades)
- **QuickBooks Online:** $25–50/mo, broad but bloated for solo trades
- **Xero:** $15–80/mo, accounting-first, overkill for invoicing-only needs
- **FreshBooks:** $15–55/mo, freelancer-friendly but not trades-opinionated

**Why they miss:** Designed for general SMBs, not Atlantic Canada contractor specifics. No HST province automation, no bilingual templates, no receipt-to-job tracking.

### Tier 2: Trades-Specific (Partial Competitors)
- **ServiceTitan:** Full field ops platform, $100+/mo, targets mid-sized teams (10+), requires iPad/mobile infrastructure
- **Optsy:** Field service management + invoicing, $50+/mo, also mid-market
- **FlatRate Plus:** Plumbing-specific invoicing, pricing hidden (likely $30–75/mo tier)

**Why they miss:** Aimed at teams/crews, not solo operators. Too expensive for 1–3 person trades businesses. Overkill on field dispatch if business is already doing manual scheduling.

### Tier 3: DIY/Spreadsheet (Solo Operator Reality)
- **Wave:** Free invoicing, but:
  - No HST automation by province
  - No bilingual support (NB pain)
  - No receipt-to-job linking
  - No CRA deadline tracking
  - No tax guardrails

- **Excel/Google Sheets:** Common, but:
  - No validation, manual error-prone
  - Hard to scale across multiple invoices/clients
  - No tax deadline tracking
  - CRA audit risk (messy documentation)

**THE GAP:** $0–30/mo invoicing tool with Atlantic Canada tax automation, bilingual support, and contractor workflow defaults. Wave is closest, but missing Atlantic-specific features and tax guardrails.

---

## 3. Target Buyer Profile (REFINED)

### Primary Segment: Solo & Small-Crew Trades
- **Electricians:** Licensed journeymen, small residential/commercial jobs, 1–3 crew members
- **Plumbers:** Same — residential service calls, renovations, small commercial
- **HVAC:** Furnace/AC service, maintenance contracts, install jobs
- **General Contractors:** Renovation, framing, finishing (often subcontract electricians/plumbers)
- **Specialty Trades:** HVAC, roofing, insulation, drywall, flooring

**Revenue Range:** $40K–$300K/year (most have 1–3 employees + owner)  
**Pain Acuity:** HIGH — invoicing mistakes = unpaid invoices + CRA penalty risk

### Geographic Focus: Atlantic Canada
- **New Brunswick (Primary):** 15% HST, bilingual (French-speaking regions), Moncton tech hub presence
- **Nova Scotia:** 14% HST (recent change adds complexity), seasonal fishing/tourism industries
- **Newfoundland & Labrador:** 15% HST, remote geography (offline work relevant), offshore contractor networks
- **PEI:** 15% HST, agricultural + tourism base

### Willingness to Pay (Validated Assumptions)
- Current spend on invoicing: $0 (spreadsheet) to $50/mo (QuickBooks/Wave abandoned due to overkill)
- Comfort zone: $20–60/mo/user
- ROI drivers:
  - Avoid 1–2 missed invoices/year (each worth $1,000–5,000) → Breaks even immediately
  - Avoid CRA penalties (15–25% of unpaid tax + interest) → Huge ROI
  - Recover ~30 min/week on invoice admin → $300+/mo freed time value

---

## 4. Product Validation: First MVP Scope (RECOMMENDED)

### Atlantic Trades Tax & Invoice Guard — Core MVP
**Timeline:** 6–8 weeks build  
**Team:** 1 full-stack engineer (Joe)

#### Features (MVP Scope)
1. **HST Province Automation**
   - Client profile stores province (NB/NS/NL/PEI)
   - Invoice auto-applies correct HST (14% NS, 15% others)
   - Multi-province job support (e.g., NB contractor, NS job → 14% on invoice)

2. **CRA-Compliant Invoice Generation**
   - Tier-aware field validation (under $30, $30–150, $150+)
   - Auto-check: GST/HST number, registration validation
   - Fields required per tier auto-highlighted
   - Template enforces required fields before PDF export

3. **Receipt Capture & Job Linking**
   - Mobile photo upload (iPhone camera, receipt on wall)
   - OCR parse: date, amount, vendor, category
   - Link receipt to job/invoice
   - Cost summaries by job

4. **Invoice-to-Job Tracking**
   - Convert estimates/quotes to invoices (copy fields, flag price/scope changes)
   - Job profit summary (revenue vs. receipts/costs)
   - Invoice status dashboard (draft, sent, paid, overdue)

5. **HST Filing Support**
   - Invoice summary by month
   - HST collected vs. remitted calculation
   - Remittance deadline calendar (monthly, quarterly per CRA requirements)
   - Late payment penalty calculator (if missed deadline: show cost of delay)

6. **Bilingual Invoice Templates (NB)**
   - English invoice template
   - French invoice template (with NB-specific bilingual compliance)
   - Toggle on save/export

#### Out of MVP Scope (Future)
- Payroll processing
- Subcontractor 1099 tracking
- Bank integration / payment processing
- Multi-user team access
- Advanced analytics

---

## 5. Revenue Model & Pricing

### Pricing Recommendation (Test with Customers)

**Structure:** Per-user monthly subscription (not per-invoice or freemium)

**Tier 1: Starter**
- $19/mo
- Up to 50 invoices/month
- 1 user
- HST automation, CRA compliance, receipt capture, job linking
- **Target:** Solo operators, 5–10 invoices/month average

**Tier 2: Pro**
- $49/mo
- Unlimited invoices
- Up to 3 users
- Above + bilingual templates, HST filing reports, deadline calendar, export bulk reports
- **Target:** 2–3 person crews, 50+ invoices/month

**Tier 3: Team** (Future, not MVP)
- $79/mo
- Unlimited invoices
- Up to 10 users
- Above + payroll prep, subcontractor expense tracking, advanced analytics
- **Target:** 5–10 person teams

### Financial Model (Assumptions)
- **Customer acquisition cost (CAC):** $200–500 (word-of-mouth + light digital ads)
- **Lifetime value (LTV):** $1,200–3,000 (assuming 2–5 year tenure, churned due to growth → hire bookkeeper)
- **LTV:CAC ratio:** 2.4–6x ✅ (healthy for SaaS)
- **Unit economics at 100 customers (Starter + Pro mix avg $30/mo):** $3,000/mo revenue, ~$1,000–1,500/mo COGS (cloud infrastructure + support), $1,500–2,000/mo margin

---

## 6. Validation Interview Plan

### Interview Objectives
1. Confirm HST invoicing mistakes happen and cause real business impact
2. Validate willingness to pay $20–60/mo
3. Identify top 3 pain points (invoicing, HST, receipt tracking, etc.)
4. Understand current workflow (how they invoice today)
5. Gauge interest in beta testing

### Target Interview Cohort (3–5 Calls)
- **Contact sources:**
  - Local trade associations (NS electricians, NB plumbers, HVAC guilds)
  - Reddit r/electricians, r/Plumbing (search "Canada", "invoicing problems")
  - LinkedIn trades groups
  - Joe's personal network (ask if he knows any electricians/plumbers locally)

### Interview Script (20–30 min)

**Opening:** "Hi [name], I'm researching a tool to help Atlantic Canada trades operators manage invoicing and tax compliance better. Would you be open to 20 min chat?"

**Section 1: Current Workflow** (5 min)
- How do you currently invoice customers?
- What's the biggest frustration with invoicing?
- How many invoices do you issue per month?
- Do you ever make mistakes on HST rates?

**Section 2: Tax & Compliance** (7 min)
- Has incorrect HST ever cost you money (missed deductions, CRA penalties)?
- How do you track receipts and job costs?
- How do you remember HST remittance deadlines?
- Do you work across multiple provinces (if yes: how do you handle different rates)?

**Section 3: Solution & Pricing** (5 min)
- What would an ideal invoicing tool for trades include?
- Would automated HST by province be valuable? (e.g., NB client → 15%, NS client → 14%)
- Would you pay $20–60/mo for that? (Test pricing comfort)
- Bilingual invoices (NB/francophone regions) — relevant to you?

**Closing:** "Thanks! If I build this, would you be willing to beta test?"

### Expected Outcomes
- **Validation:** 2+ comments confirming HST invoicing pain + willingness to pay $25+/mo = green light to build
- **Insights:** 1–2 unexpected pain points that refine product scope
- **Expansion:** 3+ beta testers lined up for MVP launch

---

## 7. Build Timeline & Go/No-Go Decision

### Go/No-Go Criteria (3 validations needed)
1. ✅ CRA invoicing requirements validated (DONE)
2. ✅ Competitor gap confirmed (DONE)
3. ⏳ **IN PROGRESS:** Customer pain interviews (target 3 calls this week)

### Build Timeline (If Go Signal)
- **Week 1–2:** Product design + data model (HST rates by province, invoice tier schema, receipt OCR)
- **Week 3–4:** MVP backend (invoice generation, HST automation, receipt upload)
- **Week 5–6:** Frontend (dashboard, invoice UI, receipt library)
- **Week 7–8:** Beta testing + hardening

**Launch:** End of May 2026 (8 weeks)

### Post-MVP Roadmap (If Successful)
- Month 2–3: Payroll remittance tracking
- Month 4–5: Multi-user team access
- Month 6+: Expansion to other Canadian regions (ON, BC)

---

## 8. Marketing & Customer Acquisition (Post-Launch)

### Channel 1: Local Trade Networks (Organic)
- Contact electrical/plumbing associations in each province
- Offer affiliates 20% commission on annual subscriptions (ref-link tracking)
- Attend 2–3 trade shows/conferences per year

### Channel 2: Content Marketing
- Blog: "How to Invoice Correctly in NB (Bilingual Compliance Guide)"
- Blog: "Atlantic HST Rate Differences — What Contractors Need to Know"
- YouTube: 3–5 min walkthrough of tool for new contractors

### Channel 3: Paid Ads (Low Volume)
- Google Ads: target "invoicing software Atlantic Canada", "HST calculator", "contractor software Nova Scotia"
- Budget: $200–500/mo (test) → Scale if LTV:CAC >3x

### Channel 4: Word of Mouth (Primary)
- Emphasis on 90-day money-back guarantee to encourage adoption
- Encourage customer testimonials ("Saved me $4K in CRA penalties")

---

## 9. Risks & Mitigation

### Risk 1: Tight TAM — Atlantic Canada is small (2.5M population)
**Mitigation:** Expand to all 10 provinces post-launch once core product is proven. Atlantic-first strategy = local dominance, then scale nationally.

### Risk 2: Trades operators are slow to adopt software
**Mitigation:** Free 30-day trial, no credit card required. Heavy emphasis on "one-click invoicing" and HST automation (minimal training).

### Risk 3: Competitors (Wave, FreshBooks) add Atlantic features
**Mitigation:** Move fast (6–8 week launch). Build 6-month moat: bilingual templates, local association partnerships, testimonials. By month 6, differentiation = community + trust.

### Risk 4: CRA invoicing rules change
**Mitigation:** Build rules as config (JSON/database-driven) so updates don't require code deploys. Blog updates + email to customers when CRA changes rules.

### Risk 5: HST rate changes (like NS 15%→14% in 2025)
**Mitigation:** Weekly automation check (script queries CRA/Canada.ca) to detect rate changes, alert team, deploy fix in <24 hrs.

---

## 10. Next Steps (THIS WEEK)

- [ ] **Today (Apr 10):** Research complete, outreach list built
- [ ] **Thu (Apr 11):** Schedule 2–3 validation calls with target operators
- [ ] **Fri–Sun (Apr 12–14):** Conduct interviews, document findings
- [ ] **Mon (Apr 15):** Compile interview notes + go/no-go decision
- [ ] **Tue (Apr 16):** If GO: Product design doc + tech stack decision

---

## Summary

**Opportunity:** Atlantic Trades Tax & Invoice Guard is a viable wedge SaaS with:
- Clear buyer (solo/small-team trades)
- Acute, expensive pain (HST compliance, invoicing mistakes, CRA risk)
- Geographic moat (Atlantic Canada specifics)
- Sustainable unit economics ($20–60/mo × 100–500 customers = $2K–30K/mo)
- 6–8 week MVP build

**Validation Status:** CRA requirements and competitor gaps confirmed. Awaiting customer interviews to confirm willingness to pay and pain acuity.

**Confidence Level:** 7/10 — Wedge is defensible and market is underserved, but TAM size and adoption speed are unknowns. Customer validation will refine to 8–9/10.
