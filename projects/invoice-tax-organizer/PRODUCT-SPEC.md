# TaxInvoice.ca — Product Specification

**Product Name:** TaxInvoice.ca  
**Tagline:** Invoice tracking + CRA tax prep in minutes, not hours  
**Target User:** Canadian freelancers & self-employed consultants (50+ clients/year; struggling with tax organization)  
**MVP Timeline:** 8-12 weeks  
**Revenue Model:** Freemium ($0 basic, $6.99/mo premium)

---

## Problem Statement

**User Pain:**
- Invoices scattered across email, folders, drives
- Manual Excel spreadsheets for tax year tracking
- Confusion about CRA T4A/T776 requirements
- Tools too expensive (Wave free but generic; TurboTax $150+; Zoho $20-60/mo overkill)
- Hours spent reconciling invoices before filing

**Market Size:**
- ~2.9M self-employed in Canada (2024)
- 73% lack integrated invoice/tax organization tool
- TAM: $18.5M/year @ $6.99/mo, 3.5% adoption

---

## Core Features (MVP)

### 1. Invoice Upload & OCR
**What:** Drag-drop invoice PDFs. Automatic data extraction.

**Flow:**
1. User drags PDF to upload area
2. System runs OCR (Tesseract.js) → extracts fields
3. User verifies extracted data in modal:
   - Invoice date
   - Amount (CAD)
   - Payer name
   - Optional: Description, payment status
4. User confirms or corrects → stored to database

**Acceptance Criteria:**
- File size limit: 10MB per invoice
- Formats: PDF, JPG, PNG
- OCR accuracy: >80% for printed invoices
- Confidence score displayed to user
- Manual correction UI for every field
- Duplicate detection (warn if amount + date already exist)

**Freemium Gate:** 5 invoices/month for free tier

### 2. Client Organization & Management
**What:** Group invoices by client. Track payment status. Flag T4A reportables.

**Features:**
- Create client record: Name, phone, email, optional SIN
- Group invoices by client (automatic + manual reassignment)
- Payment status tracker: Paid / Outstanding / In Progress
- T4A threshold indicator: Auto-flag if $500+ (CRA requirement)
- Client summary: Total income, invoice count, payment due dates

**Acceptance Criteria:**
- Clients sortable by: Total income, name, payment status
- Bulk actions: Mark all paid, re-assign to new client
- Export client list (CSV)
- Search by client name
- T4A threshold clearly highlighted (red if >$500)

### 3. Annual Tax Summary
**What:** Dashboard showing total income, client breakdown, CRA-ready exports.

**Dashboard Components:**
- **Total Income This Year:** Gross sum of all invoices
- **T4A Reportables:** Clients >$500 (list view)
- **Outstanding:** Total invoices not marked paid
- **By Client:** Table: Client name | Invoice count | Total amount | Paid status | T4A flag
- **By Month:** Timeline of invoice receipt dates

**Acceptance Criteria:**
- Real-time calculation (updates as invoices added)
- Filter by date range (Jan 1 - Dec 31, or custom)
- Drill-down: Click client → see all their invoices
- Export to CSV for spreadsheet review

### 4. CRA Compliance Export (T4A + T776 Prep)
**What:** PDF documents pre-formatted for tax filing.

**T4A Preparation Sheet (PDF):**
```
TaxInvoice.ca — T4A Preparation Summary
Tax Year: 2025

Client Name          | Total Amount | T4A Required? | Status
─────────────────────┼──────────────┼───────────────┼─────────
Acme Corporation     | $4,200       | YES           | Matched
Startup XYZ          | $450         | NO            | Omit
Tech Consulting LLC  | $3,800       | YES           | Verify

Next Steps:
1. Verify client names match T4A forms you'll receive
2. If client phone/SIN not provided, request before Jan 31
3. Cross-check amounts with your records
4. Share with accountant or import into TurboTax
```

**T776 Self-Employment Summary (PDF):**
```
T776 (Self-Employment Income) Calculation
Tax Year: 2025

INCOME:
  Total Invoiced:                           $8,450
  Less: GST/HST Collected (if registered):  —
  Net Business Income:                      $8,450

EXPENSES (Optional - Track Separately):
  Home Office (approved % of rent/mortgage): —
  Equipment & Supplies:                      —
  Professional Fees:                         —
  Mileage (business use):                    —
  Other Deductible Expenses:                 —
  Total Expenses:                            —

NET SELF-EMPLOYMENT INCOME (Line 8227):     $8,450

Notes:
- Keep invoices 7 years (CRA audit requirement)
- GST/HST registration required if >$30k/year
- Installment payments may be required if >$3,000 tax owing
```

**Acceptance Criteria:**
- PDF exports are CRA-compliant (Form layout, field names match official documents)
- Calculations verified (gross income, T4A threshold, expense categories)
- Includes disclaimer: "For informational purposes. Consult tax professional before filing."
- One-click export from summary page
- Email export option (user gets PDF link)

### 5. Timeline / Calendar View
**What:** Visual representation of invoice receipt dates and payment patterns.

**Features:**
- Monthly calendar showing invoice count
- Click date → see invoices from that day
- Color coding: Green (paid), Yellow (outstanding), Red (overdue 30+ days)
- Year selector: Jump to previous years (7-year archive for premium)

**Acceptance Criteria:**
- Responsive on mobile (month view collapses to list)
- Hover shows invoice count per day
- Click to drill into that day's invoices
- Export calendar as image (PNG)

### 6. Freemium Subscription Gating
**What:** Free tier (5 invoices/month) vs Premium ($6.99/mo unlimited).

**Free Tier:**
- Upload 5 invoices/month
- View all invoices
- Organize by client
- View summary (no export)
- 1-year archive

**Premium Tier:**
- Unlimited uploads
- PDF export (T4A + T776)
- Multi-year archive (7 years)
- CRA compliance guides (linked in app)
- Priority email support

**Implementation:**
- Middleware checks user plan before invoice POST
- Quota tracking: count invoices uploaded in current month
- Upgrade prompt at limit: "Free limit reached. Upgrade to Premium ($6.99/mo) for unlimited."
- Graceful failure: Free user can view all invoices but cannot add new ones until next month

**Acceptance Criteria:**
- Quota counts reset monthly (not rolling)
- Visual indicator of remaining uploads (Free user sees "4/5" on upload page)
- One-click upgrade to Premium (Stripe integration, test mode)
- Upgrade resets quota immediately

---

## User Flows (Wireframe Descriptions)

### Flow 1: First-Time Sign-Up → First Invoice Upload
1. User lands on marketing site (landing page)
2. Clicks "Get Early Access" → email capture → confirmation email
3. Clicks email link → sign-up page (name, password)
4. Lands on dashboard (empty state: "No invoices yet")
5. Clicks "Upload Invoice" → drag-drop area appears
6. Drags PDF invoice
7. OCR processes → modal shows extracted fields (date, amount, payer)
8. User corrects amount field (OCR confidence: 72%)
9. User creates new client "Acme Corp" → saves
10. Dashboard updates: 1 invoice, $4,200, Acme Corp grouping
11. Prompt: "Upload more invoices or upgrade to Premium"

### Flow 2: Year-End Tax Prep
1. User navigates to "Summary" tab
2. Sees: Total income $42,500, 12 invoices, 5 clients, $8,200 outstanding
3. Table shows: Acme ($4,200 - T4A required), Startup ($450 - omit), etc.
4. User clicks "Export T4A Prep" → PDF downloads
5. User clicks "Export T776 Calc" → PDF downloads
6. User shares PDFs with accountant or imports into TurboTax

---

## Design System / UI

**Color Palette:**
- Primary: #667eea (purple-blue)
- Secondary: #764ba2 (deeper purple)
- Success: #10b981 (green - paid invoices)
- Warning: #f59e0b (amber - outstanding)
- Danger: #ef4444 (red - overdue)
- Neutral: #f3f4f6 (light gray background)

**Typography:**
- Headers: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Body: Same
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

**Components:**
- Buttons: Rounded corners (8px), gradient backgrounds (primary color)
- Cards: White background, subtle shadow, 10px border-radius
- Forms: Clean labels, 8px input radius, blue focus ring
- Tables: Zebra striping (alternating rows), sortable headers
- Modals: Overlay dark, centered card, 12px border-radius

---

## Data Model

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  plan VARCHAR DEFAULT 'free', -- free | premium
  subscription_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,
  sin VARCHAR, -- optional, for T4A tracking
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  invoice_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL, -- stored in cents
  currency VARCHAR DEFAULT 'CAD',
  description TEXT,
  file_url VARCHAR, -- S3 path
  ocr_confidence DECIMAL, -- 0-100
  payment_status VARCHAR DEFAULT 'outstanding', -- paid | outstanding | in_progress
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoice_metadata (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  extracted_text TEXT, -- raw OCR output
  field_date VARCHAR,
  field_amount VARCHAR,
  field_payer VARCHAR,
  verified_by_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Success Metrics (MVP)

**Engagement:**
- Avg. invoices per user: 15+ (6 months)
- Monthly active users (MAU): 50+ by month 3
- Session length: 5+ min (upload + verify + summary view)

**Monetization:**
- Premium conversion rate: 5-10% (of free users)
- MRR (Monthly Recurring Revenue): $50+ by month 3
- Churn rate: <10% monthly (premium tier)

**Quality:**
- OCR accuracy: >85% (first-pass extraction)
- Page load time: <2s (dashboard)
- PDF export time: <5s
- Uptime: 99.5%

---

## Out of Scope (Phase 2+)

- Expense tracking (separate module)
- GST/HST calculation (regulatory complexity)
- Accountant collaboration features
- Mobile app (responsive web first)
- Multi-currency support (CAD only for MVP)
- Invoice template generation
- Automated reminders for outstanding invoices
- Stripe/payment processing (manual upgrade for MVP)

---

## CRA Compliance & Legal

**Disclaimers:**
- Tool provides informational export only
- User responsible for accuracy before filing
- Not a substitute for professional tax advice
- No liability for incorrect T4A/T776 data

**Data Privacy:**
- PIPEDA compliant (Canada's privacy law)
- 7-year invoice retention (audit requirement)
- SSL/TLS encryption in transit
- No third-party data sharing

**Form Accuracy:**
- T4A layout references CRA official Form T4A (2025)
- T776 references CRA Schedule T776 (2025)
- Quarterly CRA form review (Jan, Apr, Jul, Oct)

---

_Specification created: Mar 23, 2026._
