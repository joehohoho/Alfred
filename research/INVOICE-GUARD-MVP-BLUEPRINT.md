# Atlantic Trades Tax & Invoice Guard — MVP Product Blueprint

**Product Name:** Atlantic Invoice Guard (or "TaxGuard" — TBD pending brand research)  
**Build Timeline:** 6–8 weeks (post-validation)  
**Launch Target:** Late May 2026  
**Target Audience:** Solo electricians, plumbers, HVAC, contractors in Atlantic Canada

---

## 1. Core Value Proposition

**Problem:** Atlantic Canada trades operators manually track invoices and HST across multiple provinces (14% NS vs. 15% NB/NL/PEI), making invoicing mistakes that trigger CRA penalties.

**Solution:** One-click invoicing with automatic HST rate selection, CRA compliance guardrails, receipt tracking, and tax deadline reminders.

**Why Now:** NS HST rate dropped to 14% in Apr 2025, increasing confusion for multi-province operators. No existing tool handles Atlantic Canada specifics.

---

## 2. MVP Feature Set (6–8 weeks to launch)

### Phase 1: Core Invoice Engine (Weeks 1–3)
#### 1.1 Invoice Generation
- **Invoice builder UI:** Draft → Save → PDF export
- **Auto-populated fields:**
  - Company name (user profile)
  - GST/HST registration number
  - Invoice number (auto-incrementing or custom series)
  - Date (default today, editable)
- **Customer profile selector:**
  - Stores customer name, province (dropdown: NB/NS/NL/PEI)
  - Address, phone, email (optional)
- **Invoice line items:**
  - Date (service start), description, quantity, unit rate
  - Auto-calculate subtotal, auto-apply HST based on customer province
  - Clear tax breakdown: subtotal, HST amount, total due
- **Payment terms:** Net 10/15/30 (templates)
- **Notes field:** For job details, warranty, payment method

#### 1.2 HST Automation (Core Differentiation)
- **Rate lookup by province:**
  - NB → 15%
  - NS → 14%
  - NL → 15%
  - PEI → 15%
- **Edge case: Multi-province jobs**
  - Example: NB contractor, NS job site
  - User selects job location (province), invoice uses that province's HST
  - UI tooltip: "This job is in [Province], so HST will be [X]%"
- **Audit-safe:**
  - Display calculation on invoice: "HST (15% @ [customer location]): $XXX"
  - Shows CRA compliance: correct rate + audit trail

#### 1.3 CRA Tier-Aware Validation
- **Invoice amounts:**
  - If total < $30: Validate simplified tier (supplier name, date, total)
  - If $30–$149.99: Validate intermediate tier (above + registration number, tax line)
  - If > $150: Validate full tier (above + buyer name, item descriptions, tax breakdown)
- **Validation UI:** Green checkmark = "CRA Compliant", Red warning = "Missing [field]" with fix suggestion
- **Before export:** "This invoice is CRA-compliant for amount tier [X]"

#### 1.4 PDF Export & Email
- **Template:** Professional invoice with logo placeholder, company/customer info, line items, tax, total
- **Bilingual option (NB-relevant):**
  - English PDF export
  - French PDF export (toggle)
  - Both languages on same invoice (header in English, translation in French, or side-by-side)
- **Email direct from app:** "Send Invoice" button → recipient email prompt → sends PDF + payment link (optional, future feature)

---

### Phase 2: Receipt & Job Tracking (Weeks 3–5)
#### 2.1 Receipt Capture
- **Mobile-friendly upload:**
  - Camera capture or file upload (iPhone, Android, web)
  - Receipt preview (shows image thumbnail)
- **Auto-parsing (manual fallback if OCR unavailable in MVP):**
  - Date, vendor, amount, category
  - Manual entry fallback: date, amount, vendor, category dropdown
- **OCR is optional MVP:** If time allows, use free Tesseract OCR locally (no API cost)

#### 2.2 Receipt Organization
- **Receipt library:** Gallery view with thumbnails, sortable by date/vendor
- **Link to job:**
  - Dropdown to select job (from invoice list)
  - Multiple receipts per job allowed
- **Categories:** Materials, labour subcontractors, gas/mileage, tools/equipment, other
- **Cost summary by job:** "Total receipts for [Job name]: $XXX"

#### 2.3 Job Costing (Simple)
- **Create job:**
  - Job name, location (province), start date, client, description (optional)
- **Job dashboard:**
  - Revenue (from linked invoices)
  - Costs (sum of linked receipts)
  - Profit = Revenue − Costs
- **Job list view:** All jobs, sortable by status (active, completed, archived)

---

### Phase 3: Tax Filing Support (Weeks 5–7)
#### 3.1 HST Calculation & Reports
- **Monthly summary:**
  - Total HST collected (grouped by invoice date)
  - Total HST remittable (simplified: just show collected, explain recovery in future)
  - By-province breakdown (useful for multi-province operators)
- **Report export:** CSV or PDF summary for accountant handoff

#### 3.2 CRA Deadline Calendar
- **Remittance due dates:**
  - Calendar view of HST filing deadlines (monthly, quarterly depending on volume)
  - Calculation: monthly average invoices → estimate remittance frequency
  - CRA rules: <$30K/quarter → quarterly filing; >$30K → monthly
  - **For MVP:** Assume monthly (most conservative), show all next 12 months
- **Notifications:** Email reminder 5 days before due date (if opted in)
- **Late penalty calculator:** "If you miss this deadline, penalty will be ~[X]% interest per month"

#### 3.3 Invoice Recall for Audit
- **Search/filter invoices:** Date range, customer, province, invoice number
- **Audit export:** Bulk export 12-month invoices as CSV + PDFs for accountant/CRA

---

### Phase 4: UX Polish & Testing (Weeks 7–8)
- Navigation, mobile responsiveness, form validation
- Beta test with 3–5 customer testers
- Bug fixes + stability

---

## 3. Tech Stack (Proposed)

### Frontend
- **Framework:** React (TypeScript)
- **UI Library:** ShadCN + Tailwind CSS (fast, professional, low overhead)
- **Mobile:** Responsive web (no native apps in MVP)
- **State:** React Query for API caching + TanStack Form for form management

### Backend
- **Framework:** Node.js + Express or Fastify
- **Database:** Postgres (HST rate lookups, invoices, customers, receipts)
- **Storage:** AWS S3 or Supabase Storage (for PDF invoices + receipt images)
- **Auth:** Supabase Auth or Auth0 (email/password login, optional social)
- **PDF generation:** pdfkit or puppeteer (server-side, Python alternative: reportlab)
- **Email:** SendGrid or Resend (transactional invoice emails)
- **OCR (optional):** Tesseract.js (client-side, free) or AWS Textract (paid, $2–3 per call)

### Deployment
- **Backend:** Railway, Render, or Fly.io ($15–30/mo at MVP scale)
- **Frontend:** Vercel (free tier + $20/mo if needed)
- **Database:** Supabase free tier ($0 initial, scale to $25/mo if hit limits)

### Cost Estimate (MRR at launch)
- Backend hosting: $25/mo
- Frontend hosting: $0–20/mo
- Database: $0–25/mo
- Email service: ~$0.50 per 100 invoices (negligible at start)
- Domain: $12/yr
- **Total:** ~$50/mo infrastructure at launch (scales to $150–300/mo at 500 customers)

---

## 4. Data Model (Schema Outline)

### Core Tables
```
users
  - id (PK)
  - email, password_hash, created_at
  - business_name, gst_hst_number, phone, address
  
customers
  - id (PK)
  - user_id (FK)
  - name, province (NB/NS/NL/PEI), phone, email
  - address
  
invoices
  - id (PK)
  - user_id, customer_id (FKs)
  - invoice_number, date, due_date
  - subtotal, hst_rate (%), hst_amount, total
  - notes, status (draft/sent/paid/overdue)
  - created_at, updated_at
  
invoice_line_items
  - id (PK)
  - invoice_id (FK)
  - description, date, quantity, unit_rate, amount
  
receipts
  - id (PK)
  - user_id (FK)
  - filename, s3_url, upload_date
  - parsed_date, parsed_amount, parsed_vendor (nullable)
  - category (materials/labour/gas/other)
  - linked_job_id (FK, nullable)
  
jobs
  - id (PK)
  - user_id (FK)
  - name, location (province), client_name
  - description, start_date, status (active/completed/archived)
  - created_at
  
hst_rates
  - province (PK: NB/NS/NL/PEI)
  - rate (%)
  - effective_date
  - notes
```

---

## 5. Go-to-Market Strategy (Launch Phase)

### Beta Launch
- **Beta cohort:** 5–10 early adopter trades operators (from validation interviews)
- **Duration:** 4 weeks (May-ish)
- **Pricing:** Free during beta, capture feedback
- **Delivery:** Private Slack channel for bug reports + feature requests

### Launch (Public)
- **Timeline:** Early June 2026
- **Pricing tiers:**
  - Starter: $19/mo (50 invoices/mo, 1 user)
  - Pro: $49/mo (unlimited, 3 users)
- **Initial marketing:**
  - Email to beta testers: "It's live! Here's 25% off your first year"
  - Blog post: "Invoicing Guide for Atlantic Canada Trades" (SEO target)
  - Reddit post in r/electricians, r/Plumbing: "Built a tool for Atlantic trades operators, here's what's inside"
  - LinkedIn: Testimonials from beta testers + launch announcement

### Customer Acquisition
- **Month 1–2:** Aim for 10–20 paying customers (largely beta → paid conversions)
- **Month 3–6:** Expand via word-of-mouth + light paid ads ($200–500/mo spend on Google Ads)
- **Month 6+:** Consider trade association partnerships (affiliate referrals)

---

## 6. Success Metrics (6-Month Milestone)

### North Star Metrics
- **MRR (Monthly Recurring Revenue):** $2,000 (100 customers × $20 blended)
- **Churn rate:** <5% monthly
- **NPS (Net Promoter Score):** >50 (from email surveys)
- **Customer acquisition cost (CAC):** <$300
- **LTV:CAC ratio:** >2.0

### Operational Metrics
- **Invoice generation success rate:** >99% (no errors on export)
- **CRA compliance validation accuracy:** 100% (no false negatives on missing fields)
- **App uptime:** >99.5%
- **Support response time:** <24 hrs

---

## 7. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CRA rule changes | High | Build HST rates in config; weekly automation check for rate changes |
| Competitors add Atlantic features | Medium | Move fast (6-week launch); build community moat (partnerships, testimonials) |
| Low adoption (trades resist software) | Medium | Free trial, no credit card required; emphasize time savings + CRA risk avoidance |
| Scalability issues at high volume | Low | Postgres + AWS S3 handle 1M+ invoices; monitor perf at 10K invoices |
| Bilingual complexity (NB) | Low | MVP = simple toggle (English PDF vs. French PDF); improve later if needed |

---

## 8. Future Expansion (Post-MVP)

### Tier 2 (Month 3–4)
- Payroll remittance tracking (contractor payroll + remittance deadlines)
- Subcontractor 1099 expense tracking
- Multi-user team access (share invoices, assign jobs)

### Tier 3 (Month 5–6)
- Stripe/PayPal payment integration (customers pay via invoice link)
- QuickBooks/Xero integration (sync invoices to accounting)
- Mobile native app (iOS/Android)

### National Expansion (Month 6+)
- Extend to all 10 provinces
- Support GST-only provinces (BC, AB, SK), dual-tax provinces (MB)
- Localized content (Quebec bilingual requirement, etc.)

---

## 9. Competitive Positioning

| Feature | Wave | FreshBooks | QuickBooks | Invoice Guard |
|---------|------|-----------|------------|---------------|
| **HST Province Automation** | ❌ | ❌ | ❌ | ✅ |
| **CRA Tier Validation** | ❌ | ❌ | ❌ | ✅ |
| **Bilingual Invoices** | ❌ | ❌ | ❌ | ✅ (NB) |
| **Receipt Capture** | ❌ | ✅ | ✅ | ✅ |
| **Job Costing** | ❌ | ❌ | ✅ | ✅ (simple) |
| **Price** | $0–50/mo | $15–55/mo | $25–50/mo | $19–49/mo |
| **Trades-Optimized UX** | ❌ | ⚠️ (OK) | ❌ | ✅ |

**Positioning:** "The invoicing tool built for Atlantic Canada trades. Automatic HST, CRA compliance, receipt tracking, bilingual support. Start free, no credit card."

---

## 10. MVP Definition (What Ships in Week 8)

### Included
- ✅ Invoice generation with HST automation
- ✅ CRA tier validation + compliance warnings
- ✅ PDF export + email
- ✅ Bilingual invoice templates (EN + FR)
- ✅ Receipt upload + manual entry
- ✅ Job creation + cost tracking
- ✅ Monthly HST summary
- ✅ CRA deadline calendar (first 12 months)
- ✅ User registration + dashboard
- ✅ Mobile-responsive UI

### NOT Included (Post-MVP)
- ❌ Receipt OCR (will add if time)
- ❌ Stripe/PayPal payment integration
- ❌ Accounting software integrations
- ❌ Team access / multi-user
- ❌ Advanced analytics
- ❌ Native mobile apps
- ❌ Multi-language support (only EN + FR)

---

## 11. Build Phases (Week-by-Week Breakdown)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Schema design, auth setup | Data model finalized, user registration working |
| 2 | Invoice builder backend | POST /invoices, GET /invoices/:id, invoice generation logic |
| 3 | Invoice UI + HST automation | React form, customer dropdown, auto-HST calculation, PDF export |
| 4 | CRA validation + tier logic | Validation rules engine, UI warnings, compliance checks |
| 5 | Receipt capture + job tracking | Receipt upload, job creation, cost summary dashboard |
| 6 | Tax reports + deadline calendar | HST monthly summary, CRA deadline UI, email reminders setup |
| 7 | Bilingual + edge cases | EN/FR template toggle, mobile responsiveness, error handling |
| 8 | Testing + hardening | Beta testing cycle, bug fixes, performance optimization |

---

## 12. Resource Requirements

- **1 Full-stack engineer (Joe):** 6–8 weeks full-time (480–640 hours)
- **No designer needed:** Use ShadCN templates + Figma if Joe wants to mock up UX upfront (optional)
- **No marketing person needed:** Joe can handle beta outreach + launch content
- **Tools:** GitHub (free), Figma (free tier), AWS/Railway (trial credits), Slack for customer feedback

---

## Success = Q2 2026 Launch with 10+ Paying Customers

Key milestones:
- ✅ Week 4 (Apr 15): Validation interviews complete, go/no-go decision
- ✅ Week 5–12 (Apr 22 – Jun 9): Build & beta test
- ✅ Week 13 (Jun 16): Public launch
- ✅ Month 2 (Jul): 10+ paying customers, positive NPS, <5% churn

---

**Status:** Product blueprint finalized. Ready for build once customer validation confirms GO signal.
