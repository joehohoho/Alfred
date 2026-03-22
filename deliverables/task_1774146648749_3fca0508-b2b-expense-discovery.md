# Even Us Up: B2B Expense Management — Discovery Document

**Date:** 2026-03-22  
**Card:** task_1774146648749_3fca0508  
**Phase:** Discovery & Strategic Positioning  
**Status:** In Progress

---

## Executive Summary

Even Us Up has potential to expand into **B2B expense management for SMBs** with a differentiated position via:
1. **Interac e-Transfer auto-settlement** (Canada-first, cost reduction)
2. **CRA T776/T5018 reporting** (contractor tax compliance, Joe's moat)
3. **QB/FreshBooks sync** (eliminates manual data entry, integrates with existing SMB workflows)

**Target:** SMBs with 5–50 employees + contractors/clients  
**Revenue Potential:** $3k–30k MRR  
**Timeline:** 12–16 weeks (post-scale play, phased delivery)

---

## Market & Competitive Landscape

### Current B2B Expense Leaders

| Player | Positioning | Typical Pricing | Key Features |
|--------|-------------|-----------------|--------------|
| **Expensify** | Receipt capture + enterprise spend control | $5–15/user/mo | Mobile OCR, policy enforcement, integration marketplace |
| **Divvy** (Bill.com) | Corporate card + spend management | $15–50/user/mo | Physical card, real-time controls, accounting sync |
| **Concur** (SAP) | Enterprise policy engine | $50+/user/mo | Complex approval workflows, travel + expense |
| **Xero** | Accounting + expense lite | $25–75/mo | Invoice generation, CRA reporting, API marketplace |
| **Zoho Books** | Accounting + invoicing | $10–50/mo | T-series forms, GST/HST tracking, QB bridge |

### Key Observation
**No single player dominates the Canada-SMB segment with all three differentiators.**
- Expensify/Divvy strong on receipt/card but lack CRA compliance focus
- Xero/Zoho strong on accounting but weak on real-time expense approval
- **Gap:** A Canadian-first SMB expense tool with CRA reporting + e-Transfer settlement is underserved

---

## Differentiators Analysis

### 1. Interac e-Transfer Auto-Settlement ✅

**Why it matters:**
- Canadian SMBs routinely reimburse expenses via e-Transfer (manual, error-prone)
- Auto-settlement = faster cash flow, reduced admin, appeals to CFO + accounting teams
- **Moat:** Requires deep Interac API knowledge (Joe's advantage)

**Requirements:**
- Interac Gateway API integration (request/settlement flows)
- Secure bank account linking (OAuth via Plaid or direct)
- Settlement scheduling (per-expense, batch, weekly, etc.)
- Audit trail for CRA reconciliation

**Competitive advantage:** Expensify/Divvy don't offer this; ACH/instant pay in US, but no Canada e-Transfer equivalent.

---

### 2. CRA T776/T5018 Reporting ✅

**What it covers:**
- **T776:** Statement of Real Estate Rentals (rental income + expenses)
- **T5018:** Statement of Contract Payments (contractor/subcontractor payments ≥$500)
- **T4A:** Tax-exempt payments (alternative reporting)

**Why it matters:**
- SMBs must track contractor payments for CRA reporting
- Current workflow: manual spreadsheet → accountant → CRA form
- **Auto-reporting** = eliminate errors, reduce accounting fees, appeal to in-house bookkeepers

**CRA Requirements:**
- Contractor name, address, SIN/BN
- Total contract value, GST/HST collected
- Payment dates, amounts, descriptions
- All must be retained for 6 years for CRA audit

**Competitive advantage:** No mainstream expense tool auto-generates T5018 forms; major gap for Canadian contractors.

---

### 3. QuickBooks/FreshBooks Sync ✅

**Why it matters:**
- 70%+ of Canadian SMBs use QB or FreshBooks for invoicing
- Manual data entry (Even Us Up → QB) kills adoption
- Sync = one source of truth, no duplicate data entry

**Integration points:**
1. **Read from Even Us Up** → expense categories, amounts, payee, dates
2. **Write to QB/FreshBooks** → as billable expenses, invoice line items, or vendor bills
3. **Two-way sync** → user confirms/approves before posting

**Complexity:**
- QB Online API (REST) vs. QB Desktop API (different)
- FreshBooks API (simpler, newer)
- Approval workflow needed (user reviews before QB post)

**Competitive advantage:** Expensify/Divvy do this, but not with CRA reporting + Interac.

---

## MVP Scope Definition

### Phase 1.0 (Weeks 1–6: MVP Foundation)
**Goal:** Prove unit economics, validate SMB workflow fit

**In Scope:**
- [ ] Multi-tenant org structure (Employee, Admin, Finance roles)
- [ ] Expense upload (receipt capture via mobile or file)
- [ ] Approval routing (Employee → Manager → Finance)
- [ ] Expense categorization (pre-built categories, custom)
- [ ] Basic reporting (expense summary by category/employee)
- [ ] User onboarding (team invite, role assignment)

**Out of Scope (Phase 2):**
- Interac integration
- CRA reporting
- QB/FreshBooks sync
- Receipt OCR (use third-party SaaS)

**Estimated Timeline:** 4–6 weeks  
**Estimated Cost:** $15k–25k in dev  
**Justification:** Validate market demand before heavy integrations

---

### Phase 2.0 (Weeks 7–12: Integrations)
**Goal:** Complete the differentiators

**In Scope:**
- [ ] Interac e-Transfer settlement module
  - Bank account linking (via Plaid or Stripe Connect)
  - Settlement scheduling and execution
  - Reconciliation audit trail
- [ ] CRA T5018 reporting
  - Contractor payment tracking
  - Auto-form generation
  - Export to .pdf for accountant/CRA submission
- [ ] QuickBooks Online sync (primary target)
  - OAuth setup
  - Bi-directional sync (expense → QB as bill/invoice item)
  - Approval before posting

**Estimated Timeline:** 5–6 weeks  
**Estimated Cost:** $25k–40k in dev  
**Dependencies:** Phase 1.0 complete + regulatory review for Interac

---

### Phase 2.5 (Weeks 13–16: Polish & Scale)
**Goal:** Production readiness, security audit, performance

**In Scope:**
- [ ] FreshBooks integration (secondary, fast-follow)
- [ ] Receipt OCR (Cloudinary/AWS Textract)
- [ ] Mobile app (React Native or Flutter)
- [ ] Security audit (PCI-DSS for payment data, SOC 2 roadmap)
- [ ] Performance optimization (batch sync, queue-based processing)

**Estimated Timeline:** 3–4 weeks  
**Estimated Cost:** $20k–30k in dev

---

## Tech Stack & Architecture

### Backend Requirements
- **Multi-tenancy:** Separate data per org, shared infrastructure
- **Payment gateway:** Stripe (Interac via Stripe Connect or direct Interac API)
- **Accounting sync:** OAuth2 (QB + FreshBooks)
- **Banking:** Plaid (account linking) or direct bank API
- **Database:** PostgreSQL (transaction logs, audit trail)
- **Queue/async:** Bull (Node.js) or SQS for settlement scheduling
- **Compliance:** Encryption at rest, PCI-DSS audit trail, 6-year data retention

### Frontend
- **Existing:** Even Us Up React codebase (reuse)
- **New:** Org settings, approval workflow UI, reporting dashboard
- **Mobile:** Expense capture (web + mobile-web initially)

### Security Considerations
- **Bank data:** Never store full account numbers (token via Plaid/Stripe)
- **CRA data:** Contractor SINs encrypted at rest
- **Settlement logs:** Immutable audit trail for CRA queries
- **Compliance:** Privacy Impact Assessment + Interac audit

---

## Business Model & Pricing

### Target Segment
- **Primary:** Canadian SMBs with 5–50 employees
- **Secondary:** Agencies, consulting firms, professional services
- **ICP:** $500k–$5M revenue (have budget for tools, enough complexity to need approval workflows)

### Pricing Tiers

| Tier | Monthly | Employees | Features |
|------|---------|-----------|----------|
| **Starter** | $49 | up to 5 | Basic expense + approval |
| **Pro** | $149 | up to 25 | QB sync + T5018 reporting |
| **Business** | $399 | up to 100 | All + Interac settlement |

**Optional Add-ons:**
- Interac settlement fee: 1% per transaction (Interac cost passthrough)
- Receipt OCR: $0.25 per image (Textract cost)

### Revenue Model
- **SaaS subscription** (predictable ARR)
- **Transaction fees** (Interac settlement)
- **API tier** (agencies managing >100 orgs)

### Conversion Path
1. **Free trial** (14 days, all features unlocked)
2. **Self-serve signup** (email + card, no sales call)
3. **Freemium tier** (basic, limited to 3 employees)
4. **Enterprise** (custom pricing for >500 employees)

**Blended CAC:** Assume $400–800 (low, since conversion from Even Us Up existing users)  
**Blended LTV:** Assume $2,000–5,000 (3–5 year retention if well-integrated)

---

## Risk Assessment & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Interac API delays** | Medium | High | Start early, parallel with Phase 1, use staging sandbox |
| **QB API deprecation** | Low | Medium | Support multiple QB versions, monitor Intuit roadmap |
| **PCI compliance scope creep** | Medium | High | Use tokenization (Stripe/Plaid), avoid storing raw bank data |
| **Receipt OCR accuracy** | Low | Medium | Set user expectation (90%+ accuracy), manual correction UI |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Slow adoption** | Medium | High | Nail Phase 1.0 UX, launch with 10–20 SMB pilot customers |
| **Price resistance** | Medium | Medium | Freemium tier + 14-day free trial, compare vs. Expensify ($5–15/user) |
| **Regulatory change** | Low | High | Monitor CRA, Interac policy updates, build compliance review into roadmap |
| **Churn from free trial** | Medium | Medium | Onboarding flow, in-app guidance, success metrics tracking |

---

## Go-To-Market Strategy

### Phase 1 Launch (Week 6)
- **Target:** 20–50 pilot customers (Even Us Up existing users + referrals)
- **Channels:** Email list, Discord community, Joe's network
- **Messaging:** "Expense management built for Canadian SMBs"
- **Offer:** Free for 90 days (pilot), then standard pricing

### Phase 2 Launch (Week 12)
- **Target:** Expansion to SMB market (accountants, bookkeepers, CFOs)
- **Channels:** LinkedIn, Canada Business Networks, Slack communities
- **Messaging:** "CRA-compliant contractor tracking + Interac settlement"
- **Partnerships:** Pitch to QB/FreshBooks app marketplaces

### Long-term (Year 2+)
- **B2B2C:** Partner with accounting firms (white-label)
- **International:** Expand to UK (Faster Payments), Australia (PayID), etc.
- **Upsell:** Cross-sell to Even Us Up B2C users (split larger bills)

---

## Success Metrics

### Phase 1.0 Metrics
- DAU/MAU (daily/monthly active users)
- Expense volume per org ($ tracked per month)
- Approval workflow completion rate
- Onboarding → first expense (time to activation)
- **Success threshold:** 30+ pilot orgs, 500+ expenses/month

### Phase 2.0 Metrics
- QB sync adoption rate (% of customers enabling)
- T5018 form generation count
- Interac settlement volume ($ value, transaction count)
- Integration error rate
- **Success threshold:** 50%+ tier conversion, $5k+ MRR

### Long-term
- CAC payback period (<12 months)
- NRR (net revenue retention, >120% after Y1)
- Market share vs. Expensify in Canada (<5% is success in Year 1)

---

## Key Decisions Pending

1. **Phase 1.0 scope decision:** Do we build full approval workflow or MVP-only (create/review/approve)?
   - Recommendation: Full workflow (higher engagement + retention)

2. **Mobile-first or web-first?**
   - Recommendation: Web-first in Phase 1 (faster), add mobile in Phase 2.5

3. **Direct Interac API or third-party (Stripe, MOVEN)?**
   - Recommendation: Stripe Connect (lower compliance burden, Stripe handles PCI)

4. **Self-serve setup or account manager?**
   - Recommendation: Self-serve (lower CAC) + email support (high-touch for Enterprise)

5. **Freemium or free trial only?**
   - Recommendation: Free trial + freemium (basic for 3 employees) → higher conversion

---

## Next Steps

### Immediate (This Week)
- [ ] Get Joe's input on Phase 1.0 scope & pricing
- [ ] Create detailed wireframes (approval workflow, reporting dashboard)
- [ ] Confirm tech stack dependencies (QB OAuth, Plaid, Stripe)

### Week 2
- [ ] Spike on Interac API documentation (feasibility check)
- [ ] Engage 5–10 pilot customers (validate problem statement)
- [ ] Create product requirements document (PRD) for Phase 1.0

### Week 3–4
- [ ] Finalize Phase 1.0 architecture & database schema
- [ ] Set up dev environment (multi-tenant structure)
- [ ] Begin backend scaffolding (authentication, org structure, database)

---

## Appendix: CRA Reporting Requirements

### T5018 Form (Contractor Payments)
**Trigger:** Total payments to a contractor ≥ $500 in a calendar year  
**Reporting:** Due 28 days after fiscal year-end  
**Information Required:**
- Payer's business name, address, BN
- Contractor's name, address, SIN/BN
- Total contract amount, GST/HST
- Payment dates, descriptions

### T776 Form (Rental Income)
**Scope:** Rental income from real property  
**Information Required:**
- Gross rental income
- Expenses (mortgage, property tax, utilities, repairs, insurance, etc.)
- Capital cost allowance (CCA)
- Net income/loss

### Integration Opportunity
Even Us Up can auto-populate T5018/T776 forms by:
1. Tracking all contractor/employee payments by category
2. Matching CRA thresholds ($500 for T5018)
3. Auto-generating form fields (SIN, amounts, dates)
4. Exporting as PDF or NETFILE-compatible format

**This is not legal/tax advice; consult a CRA advisor for compliance.**

---

## Conclusion

**B2B Expense Management is a strong post-scale play for Even Us Up.** The market is underserved in Canada, Joe's background creates a moat, and the three differentiators (Interac + CRA + QB sync) align with real SMB pain points.

**Recommendation:** Approve Phase 1.0 scope & move to PRD development. If pilot validation succeeds (>30 orgs, positive feedback), proceed to Phase 2.0 integrations.

**Est. Total 12–16 week development cost:** $60k–95k  
**Est. Breakeven:** 15–20 paid customers at $200/mo = $3k–4k MRR (12–18 months)  
**Est. Upside:** $30k+ MRR at 50+ customers (Year 2)

