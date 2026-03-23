# TaxInvoice.ca — MVP Architecture & Build Plan

**Status:** MVP Phase 1 (Demand Validation + Core Build)  
**Target Launch:** Q2 2026 (8-12 weeks from start)  
**Estimated Effort:** 210 hours (~5-6 weeks @ 40 hrs/week)

---

## Phase 1: Demand Validation (Weeks 1-2, ~15 hrs)

### Deliverables
- ✅ Landing page + email capture (DONE: landing-page.html)
- ✅ Market research + competitive analysis (DONE: MARKET-RESEARCH.md)
- [ ] Deploy landing page to Vercel (2 hrs)
- [ ] Reddit outreach + beta sign-up push (5 hrs)
- [ ] Collect 50+ email sign-ups (target: week 2)

### Success Metrics
- 100+ landing page visits
- 50+ beta sign-ups
- Reddit post upvotes + comments (positive sentiment)

---

## Phase 2: MVP Build (Weeks 3-7, ~180 hrs)

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)         │
│  - Invoice upload + drag-drop                       │
│  - OCR result verification UI                       │
│  - Client grouping + payment tracker                │
│  - Annual summary dashboard                         │
│  - PDF export trigger                               │
└──────────────────────┬──────────────────────────────┘
                       │ API calls (JSON/REST)
┌──────────────────────┴──────────────────────────────┐
│          Backend (Node.js + Express)                │
│  - Invoice CRUD + storage                           │
│  - OCR preprocessing + validation                   │
│  - Client grouping + calculations                   │
│  - T4A/T776 export templates                        │
│  - Freemium auth + subscription gating              │
└──────────────────────┬──────────────────────────────┘
                       │ DB queries
┌──────────────────────┴──────────────────────────────┐
│        Database (PostgreSQL)                        │
│  - users (id, email, plan, subscription_date)      │
│  - invoices (id, user_id, date, amount, filename)  │
│  - clients (id, user_id, name, sin, phone)         │
│  - invoice_metadata (ocr_data, verified, paid)     │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Frontend Framework** | Next.js 14 | Joe's vibe-coding fit; React components; SSR for SEO |
| **Styling** | Tailwind CSS | Fast prototyping; responsive design |
| **File Upload** | React Dropzone | Simple, accessible |
| **OCR** | Tesseract.js (local) | Free; works in browser; no API quota limits |
| **Backend API** | Express.js | Lightweight; Node.js native |
| **Database** | PostgreSQL + Prisma ORM | Type-safe queries; easy migration management |
| **Auth** | Supabase Auth | Quick setup; freemium-friendly |
| **PDF Export** | PDFKit (Node.js) | Clean templates; no external APIs |
| **Hosting** | Vercel (Frontend) + Railway (Backend) | Vercel native Next.js; Railway affordable |
| **File Storage** | S3-compatible (Backblaze B2) | Cheap invoice storage (~$0.01/GB/mo) |

### Build Breakdown by Component

#### 1. Frontend (60 hrs)
**Goal:** UI for upload, verification, client grouping, summary, PDF export

**Subtasks:**
- [ ] Project setup (Next.js 14 + Tailwind) — 4 hrs
- [ ] Landing page integration (SSR + sign-up form) — 5 hrs
- [ ] Invoice upload page (drag-drop + Dropzone) — 10 hrs
- [ ] OCR verification UI (Tesseract.js + manual correction) — 12 hrs
- [ ] Client management page (add/edit/group) — 10 hrs
- [ ] Annual summary dashboard (tables + totals) — 12 hrs
- [ ] Responsive design polish — 7 hrs

**Key Pages:**
- `/dashboard` — main invoice list + quick upload
- `/invoices/[id]` — detail view + OCR verification
- `/clients` — manage client list, T4A flags
- `/summary` — annual overview, PDF export button
- `/settings` — user profile + subscription status

#### 2. Backend (50 hrs)
**Goal:** API endpoints for invoice CRUD, OCR validation, calculations, exports

**Subtasks:**
- [ ] Project setup (Express + Prisma + PostgreSQL) — 4 hrs
- [ ] Auth endpoints (sign-up, login, JWT middleware) — 8 hrs
- [ ] Invoice CRUD endpoints — 10 hrs
- [ ] OCR preprocessing + validation logic — 8 hrs
- [ ] Client grouping + calculations (totals, T4A flags) — 10 hrs
- [ ] Freemium subscription gating middleware — 6 hrs
- [ ] Error handling + logging — 4 hrs

**Key Endpoints:**
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/invoices/upload (file + OCR)
GET    /api/invoices
GET    /api/invoices/:id
PATCH  /api/invoices/:id (OCR correction)
DELETE /api/invoices/:id
POST   /api/clients
GET    /api/clients
PATCH  /api/clients/:id
GET    /api/summary (annual data)
POST   /api/export/t4a (PDF)
POST   /api/export/t776 (PDF)
```

#### 3. OCR Integration (20 hrs)
**Goal:** Local OCR (Tesseract) + fallback to validation

**Subtasks:**
- [ ] Tesseract.js integration (browser-side) — 6 hrs
- [ ] PDF parsing + text extraction — 6 hrs
- [ ] Field mapping (date, amount, payer, description) — 5 hrs
- [ ] Confidence scoring + validation rules — 3 hrs

**Field Extraction Logic:**
```
Invoice Fields to Extract:
- Invoice Date (YYYY-MM-DD format)
- Invoice Amount (numeric, CAD assumed)
- Payer Name (client name)
- Payer Contact (phone/email if available)
- Description (optional)

Confidence Thresholds:
- >90% = Auto-accept
- 70-90% = Highlight for verification
- <70% = Require manual input
```

#### 4. CRA Compliance + Export (30 hrs)
**Goal:** T4A/T776 preparation sheets + PDF exports

**Subtasks:**
- [ ] T4A template design (CRA form layout reference) — 8 hrs
- [ ] T776 template design — 8 hrs
- [ ] PDF generation logic (PDFKit) — 6 hrs
- [ ] Calculation validation (gross income, thresholds) — 5 hrs
- [ ] Disclaimer/guidance text integration — 3 hrs

**T4A Prep Sheet:**
```
Client Name     | Total Income | >$500? | Status
────────────────┼──────────────┼────────┼──────
Acme Corp       | $4,200       | YES    | Report
Startup XYZ     | $450         | NO     | Omit
```

**T776 Calculation:**
```
Total Business Income:     $X,XXX
Less: Expenses
  - Home Office:           $XXX
  - Equipment:             $XXX
  - Supplies:              $XXX
  - Mileage:               $XXX
─────────────────────────────────
Net Self-Employment Income: $X,XXX
```

#### 5. Auth + Freemium Gating (15 hrs)
**Goal:** User sign-up, login, subscription tier enforcement

**Subtasks:**
- [ ] Supabase Auth integration — 4 hrs
- [ ] JWT token middleware — 3 hrs
- [ ] Freemium quota enforcement (5 invoices/month for free tier) — 5 hrs
- [ ] Subscription status dashboard — 3 hrs

**Freemium Rules:**
```
FREE TIER:
- 5 invoices/month upload quota
- View only (no PDF export)
- Single-year archive

PREMIUM ($6.99/mo):
- Unlimited uploads
- PDF export (T4A + T776)
- Multi-year archive (7 years)
- CRA compliance guides
- Priority support (email)
```

#### 6. Testing + Deployment (20 hrs)
**Goal:** Unit tests, E2E tests, production readiness

**Subtasks:**
- [ ] Unit tests (backend calculations) — 8 hrs
- [ ] E2E tests (upload → summary → export flow) — 8 hrs
- [ ] Performance testing (file uploads, OCR speed) — 2 hrs
- [ ] Security review (auth, file storage, data privacy) — 2 hrs

**Test Scenarios:**
- Valid invoice PDF upload → OCR extraction → verification
- Client grouping calculates totals correctly
- T4A threshold ($500) is enforced
- Freemium quota blocks 6th upload
- PDF export includes all required fields

---

## Phase 3: Beta Launch (Week 8, ~30 hrs)

### Deliverables
- [ ] Soft launch to 50 beta users (email list from landing page)
- [ ] Bug triage + rapid iteration (1-week sprint)
- [ ] Beta feedback survey (what features matter most?)
- [ ] Iterate on top 3 pain points
- [ ] Launch public marketing (Reddit + ProductHunt)

---

## Tech Setup Checklist

### Development Environment
- [ ] Create GitHub repo: `invoice-tax-organizer`
- [ ] Set up Next.js project: `npx create-next-app@latest`
- [ ] Install Tailwind: `npm install -D tailwindcss`
- [ ] Set up Express backend in `/api` or separate repo
- [ ] PostgreSQL local dev (Docker recommended)
- [ ] `.env.local` template (API keys, DB URL, S3 bucket)

### Infrastructure
- [ ] Vercel project (link GitHub repo)
- [ ] Railway account + PostgreSQL database
- [ ] Backblaze B2 bucket (invoice PDF storage)
- [ ] Supabase project (Auth + optional DB if not using Railway)
- [ ] Stripe test account (future: payment processing)

### Dependencies Summary

**Frontend:**
```json
{
  "react": "^18.0",
  "next": "^14.0",
  "tailwindcss": "^3.0",
  "react-dropzone": "^14.0",
  "tesseract.js": "^4.0",
  "axios": "^1.0",
  "zustand": "^4.0"
}
```

**Backend:**
```json
{
  "express": "^4.18",
  "prisma": "^5.0",
  "@prisma/client": "^5.0",
  "@supabase/supabase-js": "^2.0",
  "pdfkit": "^0.13",
  "multer": "^1.4",
  "dotenv": "^16.0"
}
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OCR accuracy < 80% | Users frustrated | Implement confidence scoring + manual UI; gather feedback on field accuracy |
| Slow file uploads | Churn | Optimize frontend (compression); use chunked upload for large PDFs |
| CRA rules update mid-year | Feature lag | Subscribe to CRA updates; quarterly form review + version control |
| Low beta adoption | No validation data | Pre-promote on Reddit; offer free premium during beta |
| Churn (users only at tax time) | CAC > LTV | Implement quarterly email reminders; share tax tips year-round |

---

## Success Metrics (MVP Launch)

**Week 8 Launch Goals:**
- 50+ active beta users
- 80%+ positive feedback on core features (upload, summary, export)
- <3 min OCR verification time per invoice
- 95%+ free-to-premium conversion rate inquiry (interest level)
- Zero critical bugs (P0 issues blocked)

**Post-Launch (Month 3):**
- 500+ registered users
- 50+ paid premium subscribers ($350/mo ARR)
- <5% monthly churn (premium tier)
- Feature expansion plan validated

---

## Next Immediate Steps

1. **Deploy landing page** (1 hr) — Vercel deployment
2. **Create GitHub repo** (30 min) — Set up project structure
3. **Beta recruitment** (3 hrs) — Reddit posts, Twitter, email list
4. **Start frontend build** (Week 1) — Next.js + Tailwind setup

---

_Plan created: Mar 23, 2026. Joe's domain expertise in billing software makes this a strong product fit._
