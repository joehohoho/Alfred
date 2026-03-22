# Bill Review & Invoice Audit Automation (Canadian SMB SaaS)

Date: 2026-03-20 (ADT)
Card: `task_1774058538023_ae4bf3d2`

## 1) Opportunity Summary

Build a **self-serve invoice audit SaaS** for Canadian SMB finance teams that flags:
1. Duplicate invoices/payments
2. Overcharges vs agreed rates
3. Contract variance (billing terms mismatch)

### Why this is a fit for Joe
- 20+ years in billing implementations = deep domain credibility
- Strong edge in rule design, false-positive reduction, and onboarding practical workflows
- Canadian SMB segment is less saturated than US enterprise AP automation

## 2) Competitive Signal (quick validation)

Provided evidence + quick scan supports demand:
- **Stampli** positions as AP/P2P automation platform with AI and ERP integrations (enterprise/mid-market tilt).
- **BILL** positions AP automation with AI-powered workflows; commonly priced as subscription software with SMB reach.
- **Enveyo** shows adjacent logistics invoice/optimization pain around invoice inconsistency and cost leakage.

### Positioning wedge
Do **not** start as full AP automation competitor.
Start as:
> “Invoice Audit Copilot for Canadian SMBs” (audit + detection + action queue), with optional handoff into accounting tools.

This lowers implementation burden and shortens time-to-value.

## 3) ICP + Segment Entry

## Primary ICP (launch)
- 10–150 employee Canadian SMBs
- 200–5,000 invoices/month
- Existing stack: QuickBooks Online or Xero (+ CSV exports)
- 1–5 person finance/admin team
- Pain signals:
  - Repeat vendor invoice disputes
  - Manual duplicate checks
  - Limited visibility into pricing drift/contract non-compliance

## Secondary ICP (phase 2)
- Multi-entity SMB groups and 3PL/ecommerce operators with freight invoices

## 4) MVP Scope (first paid version)

## Ingestion
- CSV upload + QuickBooks Online import (read-only initially)
- Standardized invoice schema:
  - vendor_id, vendor_name, invoice_number, invoice_date, due_date
  - line_item_desc, quantity, unit_price, currency, subtotal, tax, total
  - po_number, contract_id (optional), location/cost_center (optional)

## Detection engine (core)
1. **Duplicate detector**
   - Exact: same vendor + invoice_number + amount
   - Near-duplicate: fuzzy invoice number, close date, equal/close amount
   - Rebill pattern: same amount recurring outside expected cadence

2. **Overcharge detector**
   - Compare line rates vs baseline historical median per vendor/service
   - Compare line rates vs uploaded contract/rate card
   - Flag threshold defaults:
     - Warning: >5% variance
     - Critical: >10% variance

3. **Contract variance detector**
   - Payment terms mismatch (e.g., Net 30 billed as Net 15)
   - Unauthorized surcharge/fee codes
   - Quantity minimum/maximum deviations

## Workflow UI
- “Audit Queue” with severity, reason, confidence score
- One-click actions: mark valid / dispute / hold payment / export findings
- Export to CSV + “vendor dispute memo” template

## Reporting
- Monthly leakage estimate
- Recovered/avoided cost tracker
- Vendor risk heatmap

## 5) Product Principles (to win)

1. **Fast onboarding (<30 min to first flag)**
2. **Low false positives (finance teams won’t tolerate noise)**
3. **Explainability first** (every flag has plain-English reason)
4. **Works with current tools** (no forced ERP migration)

## 6) Pricing & Packaging (recommended)

## Free
- 1 entity
- Up to 100 invoices/month
- Duplicate detection only
- 30-day history

## Pro (CAD $39/mo target)
- Up to 2,000 invoices/month
- All detectors + exports + dispute memo templates
- 12-month history
- Email support

## Growth (CAD $99/mo target)
- Up to 10,000 invoices/month
- Multi-entity + role permissions + API/webhooks + custom rules

### Why this pricing
- Keeps entry point inside proposed $25–50 range
- Creates natural expansion path for heavier-volume SMBs

## 7) Technical Architecture (lean + reliable)

- Frontend: Next.js dashboard
- Backend API: Node/TypeScript
- DB: Postgres
- Job queue: BullMQ/Redis (async audits)
- Rules engine: deterministic first; optional ML anomaly scoring later
- File ingest: signed upload + schema validation
- Security baseline:
  - Tenant isolation at DB level
  - Encryption at rest + in transit
  - Audit logs for all user actions
  - PIPEDA-compliant data retention policy docs

## 8) 6-Week Execution Plan

## Week 1: Discovery + data contracts
- 10 interviews with Canadian SMB bookkeepers/controllers
- Collect 15 anonymized invoice samples across 3 industries
- Freeze MVP schema + rule specs

## Week 2: Ingestion + normalization
- CSV parser + validation + mapping UI
- QBO read connector (if available) or import bridge

## Week 3: Detection v1
- Build duplicate + overcharge rules
- Confidence scoring + explainability payload

## Week 4: Workflow + reporting
- Audit queue UI
- Action states + export outputs + leakage dashboard

## Week 5: Beta pilots (3 design partners)
- Weekly tuning from real invoices
- Track precision and recall with manual adjudication

## Week 6: Launch readiness
- Pricing page + onboarding + billing
- Security/ToS/privacy baseline
- Public waitlist + direct outreach campaign

## 9) Validation Metrics (must-hit)

Pilot success gates:
- Precision of high-severity flags: **>=80%**
- Time to first actionable flag: **<30 min**
- Measured monthly savings for pilot customers: **>=CAD $300/month** median
- Weekly active usage by finance owner: **>=2 sessions/week**

Commercial gates by Month 3:
- 15 paying accounts
- Churn <8% monthly in first cohort
- CAC payback <3 months for outbound motion

## 10) Go-To-Market (first 90 days)

1. **Founder-led outbound to local SMBs**
   - Targets: bookkeeping firms, ecomm operators, light manufacturing, agencies
2. **Accountant/bookkeeper channel**
   - “Run client invoice audit in 20 minutes” offer
3. **Lead magnet**
   - Free “Invoice Leakage Scorecard” upload tool
4. **Case studies**
   - Show avoided overpayments and dispute recoveries in CAD

## 11) Key Risks + Mitigations

- **Risk: false positives kill trust**
  - Mitigation: conservative thresholds, human feedback loop, per-vendor rule tuning

- **Risk: integration complexity slows launch**
  - Mitigation: CSV-first MVP, QBO connector as fast follow

- **Risk: crowded AP automation market**
  - Mitigation: narrow wedge (audit-first), Canadian compliance/localized flows, fast ROI narrative

## 12) Recommended Immediate Next Steps

1. Recruit 10 Canadian SMB discovery calls (script + criteria)
2. Build clickable prototype for audit queue and flag explanation panel
3. Implement CSV-first detection engine prototype with 3 detectors
4. Create landing page with waitlist + ROI calculator
5. Offer 3 pilot slots at discounted early adopter pricing (CAD $19/mo first 3 months)

---

## Delivery for this card
- Completed strategic product blueprint with:
  - market wedge
  - MVP feature definition
  - pricing/packaging
  - architecture
  - 6-week build plan
  - validation metrics + GTM
  - risk mitigation

File: `ideas/BILL_REVIEW_INVOICE_AUDIT_AUTOMATION_BLUEPRINT_2026-03-20.md`
