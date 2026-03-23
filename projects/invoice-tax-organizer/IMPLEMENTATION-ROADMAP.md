# TaxInvoice.ca — Implementation Roadmap (Week-by-Week)

**MVP Target:** 8-12 weeks to beta launch  
**Team:** Joe (primary), Alfred (async support)  
**Daily Standups:** Discord #tax-invoice-dev (async)

---

## Phase 1: Demand Validation (Weeks 1-2)

### Goals
- Deploy landing page
- Collect 50+ email sign-ups
- Validate market appetite on Reddit
- Finalize product scope with feedback

### Week 1 Deliverables

**Monday - Wednesday**
- [ ] Deploy `landing-page.html` to Vercel (free tier)
  - Estimated: 1 hour (domain setup + Git)
  - Link: TaxInvoice.ca (or temp: tax-invoice-staging.vercel.app)
  - Checkpoint: Page loads, sign-up form works
- [ ] Set up email capture backend (simple)
  - Option A: Supabase + Google Sheets (no-code, 30 min)
  - Option B: Build simple Node endpoint + CSV export
  - Estimated: 1 hour
  - Checkpoint: Sign-ups appear in database/sheet

**Thursday - Friday**
- [ ] Reddit outreach (3-5 communities)
  - Target: r/PersonalFinanceCanada, r/Freelancers, r/SmallBusiness, r/CanadianEconomics, r/BuyCanadian
  - Post: "Stop losing hours organizing invoices for taxes. Introducing TaxInvoice.ca (beta sign-ups open)"
  - Include: Link to landing page, 2-min demo video (optional, use Loom)
  - Estimated: 2 hours (research + writing + monitoring)
  - Goal: 5+ upvotes per post, 20+ comments
- [ ] Twitter/LinkedIn shoutout (1 post each)
  - Mention: "Built for Canadian freelancers. Free forever + $6.99/mo premium."
  - Estimated: 30 min
- [ ] Email early contacts (network outreach)
  - Joe's contacts who are freelancers/consultants
  - Estimated: 1 hour

**Success Metrics for Week 1:**
- Landing page live with working sign-up
- 20+ email sign-ups
- 5+ Reddit posts (monitor upvotes/comments)

### Week 2 Deliverables

**Monday - Wednesday**
- [ ] Monitor & respond to Reddit comments
  - Answer questions about features
  - Share feedback: "What features matter most to you?"
  - Estimated: 2 hours (daily check-ins)
- [ ] Collect first round feedback
  - Survey responses (Google Form or email replies)
  - Key question: "What's your #1 pain point with invoices?"
  - Estimated: 1 hour analysis
- [ ] Refine product roadmap based on feedback
  - Adjust feature priority if needed
  - Update PRODUCT-SPEC.md with top 3 pain points
  - Estimated: 2 hours

**Thursday - Friday**
- [ ] Finalize MVP scope
  - Confirm: Upload → Organize → Summary → Export is MVP
  - Cut features if necessary (expenses, GST/HST, etc. → Phase 2)
  - Estimated: 1 hour (Joe + Alfred sync)
- [ ] Create GitHub repo + project board
  - Set up Issues/Milestones for Weeks 3-7
  - Estimated: 1 hour
- [ ] Kick off Week 3 planning
  - Sync meeting: "Ready to build?"

**Success Metrics for Week 2:**
- 50+ email sign-ups
- Feedback summary: Top 3 pain points identified
- MVP scope locked, no scope creep
- GitHub repo ready with issue backlog

---

## Phase 2: MVP Build (Weeks 3-7, ~180 hours)

### High-Level Timeline
```
Week 3:  Frontend setup + core pages (dashboard, upload UI)
Week 4:  Backend API setup + auth + invoice CRUD
Week 5:  OCR integration + client grouping
Week 6:  Summary dashboard + PDF exports (T4A/T776)
Week 7:  Testing, bug fixes, performance tuning
```

### Week 3: Frontend Foundation (40 hrs)

**Theme:** Get Next.js + Tailwind running, build shell pages

**Daily Breakdown:**

**Monday (8 hrs)**
- [ ] Project setup: Next.js 14 + Tailwind + dependencies (3 hrs)
  - `npx create-next-app@14 . --typescript --tailwind`
  - Install: react-dropzone, zustand, axios, date-fns
  - Set up folder structure
  - Checkpoint: `npm run dev` → app running on localhost:3000
  
- [ ] Create layout & navigation (5 hrs)
  - Root layout with Navbar
  - Nav links: Dashboard, Invoices, Clients, Summary, Settings
  - Mobile-responsive hamburger menu
  - Tailwind styling (colors from PRODUCT-SPEC.md)
  - Checkpoint: Navbar visible on all pages

**Tuesday (8 hrs)**
- [ ] Auth pages (5 hrs)
  - Sign-up page: Email, password, confirm password
  - Login page: Email, password
  - "Forgot password" link (functional in Phase 2)
  - Error handling (duplicate email, weak password)
  - Checkpoint: Sign-up/login forms render correctly
  
- [ ] Dashboard shell (3 hrs)
  - Empty state when no invoices
  - Grid layout for upcoming cards
  - "Upload Invoice" CTA button
  - Checkpoint: Dashboard page loads

**Wednesday (8 hrs)**
- [ ] Invoice list page (5 hrs)
  - Table: Date | Client | Amount | Status | Actions
  - Sort by: Date, Amount, Client
  - Filter by: Client, Status, Date range
  - Mobile: Collapse to card view
  - Checkpoint: Invoice table renders (static data)
  
- [ ] Upload modal/page (3 hrs)
  - Drag-drop zone (react-dropzone)
  - File preview (PDF + JPG)
  - Progress bar during upload
  - Checkpoint: Upload form renders

**Thursday (8 hrs)**
- [ ] Invoice detail page (4 hrs)
  - Display invoice: Date, Amount, Client, Status
  - Edit button → opens inline edit form
  - Delete confirmation modal
  - Payment status toggle: Paid / Outstanding / In Progress
  - Checkpoint: Detail page accessible from invoice list
  
- [ ] Summary dashboard shell (4 hrs)
  - Cards: Total Income, T4A Reportables, Outstanding
  - Client breakdown table (no data yet)
  - Export buttons: T4A, T776 (disabled for now)
  - Checkpoint: Summary layout complete

**Friday (8 hrs)**
- [ ] Styling pass (4 hrs)
  - Ensure all pages match design system
  - Color palette: Primary #667eea, Success #10b981, Warning #f59e0b
  - Hover states, focus states (accessibility)
  - Shadows & spacing consistent
  - Checkpoint: App looks cohesive
  
- [ ] Components library start (4 hrs)
  - Create: Button, Card, Input, Modal, Table components
  - Reusable, Tailwind-based
  - Document with Storybook (optional, Phase 2)
  - Checkpoint: Components folder organized

**Week 3 Checkpoint:**
- ✅ Next.js app running
- ✅ All pages rendering (auth, dashboard, invoices, summary)
- ✅ Navigation working
- ✅ Styling complete
- ❌ No backend connection yet (use static data for demo)

**Commit:** `feat(frontend): Next.js setup + core pages + Tailwind styling`

---

### Week 4: Backend Foundation (45 hrs)

**Theme:** Build Express API, database, auth, invoice CRUD

**Daily Breakdown:**

**Monday (9 hrs)**
- [ ] Project setup: Express + Prisma + PostgreSQL (3 hrs)
  - `npm init -y`, install dependencies
  - Set up TypeScript config
  - Create folder structure: routes, services, middleware, utils
  - Checkpoint: Server starts on port 3001
  
- [ ] Database + Prisma schema (4 hrs)
  - Create PostgreSQL database (Docker)
  - Define Prisma schema (User, Client, Invoice, InvoiceMetadata)
  - Run migrations: `npx prisma migrate dev --name init`
  - Checkpoint: `npx prisma studio` opens successfully
  
- [ ] Auth setup: Sign-up & Login (2 hrs)
  - User model in DB
  - Password hashing (bcryptjs)
  - JWT generation & verification middleware
  - Checkpoint: Auth routes created

**Tuesday (9 hrs)**
- [ ] Auth API endpoints (4 hrs)
  - POST /api/auth/signup
  - POST /api/auth/login
  - POST /api/auth/logout
  - GET /api/auth/me (verify JWT)
  - Error handling: Duplicate email, invalid password
  - Checkpoint: Sign-up/login work end-to-end
  
- [ ] Invoice CRUD endpoints (5 hrs)
  - POST /api/invoices (create, no OCR yet)
  - GET /api/invoices (list all for user)
  - GET /api/invoices/:id (detail)
  - PATCH /api/invoices/:id (update amount, date, status)
  - DELETE /api/invoices/:id
  - Checkpoint: Postman tests pass

**Wednesday (9 hrs)**
- [ ] Client endpoints (5 hrs)
  - POST /api/clients (create)
  - GET /api/clients (list)
  - PATCH /api/clients/:id (edit)
  - DELETE /api/clients/:id
  - Add client grouping logic (group invoices by client_id)
  - Checkpoint: Client CRUD complete
  
- [ ] Freemium quota enforcement (4 hrs)
  - Middleware: Check user.plan + count invoices this month
  - Block upload if free tier limit hit (5/month)
  - Return error: "Free tier limit reached. Upgrade to Premium."
  - Checkpoint: Quota enforcement in place

**Thursday (9 hrs)**
- [ ] Summary calculation endpoints (5 hrs)
  - GET /api/summary (annual data)
    - totalIncome (sum all invoices)
    - t4aReportables (clients >$500)
    - outstanding (sum not-paid invoices)
    - byClient (breakdown table)
    - byMonth (timeline)
  - Complex SQL queries with Prisma
  - Checkpoint: Summary endpoint returns correct calculations
  
- [ ] Input validation + error handling (4 hrs)
  - Validate invoice date (not future)
  - Validate amount (positive number)
  - Validate client selection
  - Global error handler (catch & format errors)
  - Checkpoint: Bad requests return 400 with helpful errors

**Friday (9 hrs)**
- [ ] Database indexes + performance (3 hrs)
  - Add indexes: user_id, client_id, invoice_date
  - Test query performance with 1000+ invoices
  - Checkpoint: Slow queries optimized
  
- [ ] API testing (4 hrs)
  - Create Postman collection: Auth, Invoices, Clients, Summary
  - Test all happy paths
  - Test error cases: Invalid email, missing fields, quotas
  - Checkpoint: 90%+ endpoints tested
  
- [ ] Connect frontend to backend (2 hrs)
  - Update `.env.local`: NEXT_PUBLIC_API_URL=http://localhost:3001
  - Test login on frontend → calls backend
  - Checkpoint: Frontend + backend talking

**Week 4 Checkpoint:**
- ✅ Express server running
- ✅ PostgreSQL database initialized
- ✅ User auth (sign-up, login) working
- ✅ Invoice CRUD endpoints functional
- ✅ Client management endpoints functional
- ✅ Summary calculations correct
- ✅ Freemium quota enforcement active
- ✅ Frontend fetches real data from backend

**Commit:** `feat(backend): Express API + Prisma + auth + CRUD endpoints`

---

### Week 5: OCR Integration & Client Grouping (40 hrs)

**Theme:** File upload, OCR extraction, invoice verification

**Daily Breakdown:**

**Monday (8 hrs)**
- [ ] File upload endpoint setup (4 hrs)
  - POST /api/invoices/upload (multipart/form-data)
  - Multer configuration (file size limit: 10MB)
  - Store file URL (temporary: local disk, later: S3/B2)
  - Return file info + parsed fields (from OCR)
  - Checkpoint: File upload works, file saved
  
- [ ] Tesseract.js setup (browser + backend) (4 hrs)
  - Frontend: OCR in browser (Tesseract.js)
  - Extract: Date, Amount, Payer from PDF text
  - Return confidence scores
  - Checkpoint: Upload → OCR preview works

**Tuesday (8 hrs)**
- [ ] OCR verification modal (5 hrs)
  - Show extracted fields in modal
  - Allow user to correct each field
  - Confidence score displayed
  - Submit corrected data → save to invoice
  - Checkpoint: Modal UX smooth
  
- [ ] OCR field mapping logic (3 hrs)
  - Parse raw OCR text → extract invoice date (multiple formats)
  - Extract amount (numbers + currency)
  - Extract payer (usually first occurrence of proper nouns)
  - Implement confidence scoring
  - Checkpoint: 80%+ accuracy on test PDFs

**Wednesday (8 hrs)**
- [ ] Client auto-grouping (5 hrs)
  - When uploading invoice → auto-match to existing client
  - Fuzzy matching: Client name similarity (if >70% match, suggest)
  - Or: Let user select from client dropdown
  - Or: Create new client
  - Checkpoint: Invoices group correctly by client
  
- [ ] Invoice metadata storage (3 hrs)
  - Store raw OCR text in invoice_metadata table
  - Track: extracted_text, field_date, field_amount, field_payer, verified_by_user
  - Allow retrieval for audit/correction
  - Checkpoint: Metadata saved & queryable

**Thursday (8 hrs)**
- [ ] Duplicate detection (3 hrs)
  - Before saving: Check if invoice (same date + amount + client) exists
  - If exists: Warn user "This looks like a duplicate. Are you sure?"
  - Allow override if user confirms
  - Checkpoint: Duplicates flagged
  
- [ ] Invoice list + detail refinement (5 hrs)
  - Show OCR confidence badge on list
  - Click invoice → show extracted vs. verified fields
  - Edit invoice: Correct any field post-upload
  - Checkpoint: Full invoice lifecycle working

**Friday (8 hrs)**
- [ ] Performance tuning (4 hrs)
  - OCR slow first run? Cache Tesseract models in localStorage
  - Optimize PDF parsing (only extract text, not images)
  - Profile upload time: target <5s for typical invoice
  - Checkpoint: Upload flow fast & smooth
  
- [ ] Testing OCR accuracy (4 hrs)
  - Create test suite: 10 real invoices (different formats)
  - Measure extraction accuracy per field
  - Document known limitations (handwritten, low-quality scans)
  - Checkpoint: Accuracy baseline established (target: 85%+)

**Week 5 Checkpoint:**
- ✅ File upload endpoint working
- ✅ OCR extraction + confidence scoring
- ✅ Verification modal on frontend
- ✅ Client auto-grouping (fuzzy match + manual select)
- ✅ Invoice metadata tracked
- ✅ Duplicate detection
- ✅ Performance optimized (upload <5s)

**Commit:** `feat(ocr): Tesseract integration + field extraction + client grouping`

---

### Week 6: Summary Dashboard & PDF Exports (40 hrs)

**Theme:** Calculations, T4A/T776 prep, PDF generation

**Daily Breakdown:**

**Monday (8 hrs)**
- [ ] Summary calculations (4 hrs)
  - GET /api/summary endpoint (if not done in Week 4)
  - Calculate: Total income, T4A reportables (>$500), outstanding, by-client breakdown
  - Handle edge cases: Partial-year (start date after Jan 1), multiple currencies
  - Checkpoint: Summary calculations verified
  
- [ ] Summary dashboard UI (4 hrs)
  - Display cards: Total Income, T4A Reportables, Outstanding
  - Client breakdown table
  - Month selector (previous years)
  - Checkpoint: Summary dashboard renders all data

**Tuesday (8 hrs)**
- [ ] T4A preparation export (4 hrs)
  - Backend: Generate T4A prep data
  - Fields: Client name, total amount, T4A flag (>$500), SIN (if provided)
  - Return as JSON (frontend consumes for PDF)
  - Format reference: CRA Form T4A (2025)
  - Checkpoint: T4A data structure complete
  
- [ ] T4A PDF generation (4 hrs)
  - Use PDFKit (Node.js) or similar
  - Create PDF template matching T4A layout
  - Populate with real data from backend
  - Include disclaimer: "Informational only. Consult tax professional."
  - Checkpoint: PDF generation working

**Wednesday (8 hrs)**
- [ ] T776 preparation export (4 hrs)
  - Backend: Generate T776 prep data
  - Fields: Total income, expense categories (optional), net income
  - Return as JSON
  - Format reference: CRA Schedule T776 (2025)
  - Checkpoint: T776 data structure complete
  
- [ ] T776 PDF generation (4 hrs)
  - Create PDF template for T776
  - Populate with income data
  - Include expense section (with placeholders if not tracked)
  - Add calculation steps for transparency
  - Checkpoint: PDF generation working

**Thursday (8 hrs)**
- [ ] Download + email options (4 hrs)
  - Frontend: Download PDFs directly
  - Backend: Email PDFs to user (Sendgrid or similar)
  - User preference: Download, email, or both
  - Checkpoint: Download/email working
  
- [ ] Timeline/Calendar view (4 hrs)
  - Visual calendar: Show invoice dates
  - Color-coded: Green (paid), Yellow (outstanding), Red (overdue)
  - Click date → show invoices from that day
  - Checkpoint: Calendar UI interactive

**Friday (8 hrs)**
- [ ] Premium gating on exports (3 hrs)
  - Free tier: Cannot export PDFs (show upgrade prompt)
  - Premium tier: Full export access
  - Enforce at API level + UI level
  - Checkpoint: Gating in place
  
- [ ] Testing exports (4 hrs)
  - Generate 10 test PDFs with various scenarios
  - Verify numbers are correct
  - Check PDF formatting (readability, not corrupted)
  - Checkpoint: 100% of PDFs export correctly
  
- [ ] Documentation (1 hr)
  - Document T4A/T776 requirements
  - Add "CRA Compliance Guide" link in app
  - Checkpoint: Users know what these forms mean

**Week 6 Checkpoint:**
- ✅ Summary dashboard complete (all metrics displayed)
- ✅ T4A PDF export working
- ✅ T776 PDF export working
- ✅ Download + email options functional
- ✅ Calendar/timeline view interactive
- ✅ Premium gating enforced
- ✅ All exports tested & verified

**Commit:** `feat(export): T4A/T776 PDF generation + summary dashboard`

---

### Week 7: Testing, Optimization & Polish (35 hrs)

**Theme:** Bug fixes, performance, security, final polish

**Daily Breakdown:**

**Monday (7 hrs)**
- [ ] Unit tests (backend) (3 hrs)
  - Test invoice calculations: Total, T4A threshold, outstanding
  - Test OCR field extraction confidence
  - Test freemium quota enforcement
  - Tool: Jest or Vitest
  - Checkpoint: 80%+ code coverage
  
- [ ] E2E tests (4 hrs)
  - Sign-up → Login → Upload → Verify OCR → Summary → Export PDF
  - Test freemium limits (5 invoices, then blocked)
  - Test payment status changes
  - Tool: Playwright or Cypress
  - Checkpoint: Core flow passes E2E

**Tuesday (7 hrs)**
- [ ] Security audit (3 hrs)
  - JWT token expiration (set to 24h, refresh token in Phase 2)
  - CORS: Only allow localhost (dev) and vercel domain (prod)
  - SQL injection: Prisma prevents (good)
  - File upload: Validate file type + size (only PDF/JPG, max 10MB)
  - Checkpoint: No obvious security holes
  
- [ ] Performance profiling (4 hrs)
  - Measure: Page load time, API response time, OCR processing time
  - Target: Dashboard <2s, Upload <5s, Export <10s
  - Optimize: Database queries (add more indexes if needed)
  - Checkpoint: All metrics meet targets

**Wednesday (7 hrs)**
- [ ] Bug triage & fixes (4 hrs)
  - Collect known bugs (from Week 3-6 development)
  - Prioritize: P0 (crashes), P1 (feature broken), P2 (UX friction)
  - Fix top 10 bugs
  - Checkpoint: P0 bugs resolved
  
- [ ] UI/UX polish (3 hrs)
  - Empty states: Helpful copy + illustrations
  - Error messages: Clear, actionable feedback
  - Loading states: Skeleton screens where appropriate
  - Accessibility: Tab order, ARIA labels, keyboard navigation
  - Checkpoint: App feels polished

**Thursday (7 hrs)**
- [ ] Responsive design review (3 hrs)
  - Test mobile (iPhone 12, Android)
  - Test tablet
  - Ensure touch-friendly buttons (44px minimum)
  - Mobile navigation (hamburger menu)
  - Checkpoint: Looks good on all devices
  
- [ ] Documentation (4 hrs)
  - README.md: Project overview, setup, features
  - API documentation (Swagger/OpenAPI optional, Phase 2)
  - User guide: How to use each feature
  - Troubleshooting: Common issues + solutions
  - Checkpoint: Docs complete

**Friday (7 hrs)**
- [ ] Staging deployment (3 hrs)
  - Deploy to Vercel (frontend) + Railway (backend)
  - Test on production-like environment
  - Checkpoint: Beta site live on real domain
  
- [ ] Final checklist (4 hrs)
  - Sign-up → works
  - Login → works
  - Upload invoice → OCR works
  - Summary → calculations correct
  - Export PDFs → correct data
  - Mobile → responsive
  - Freemium → gating works
  - Checkpoint: All critical paths verified

**Week 7 Checkpoint:**
- ✅ Unit tests (80%+ coverage)
- ✅ E2E tests (core flow passes)
- ✅ Security audit done
- ✅ Performance meets targets
- ✅ P0 bugs fixed
- ✅ UI/UX polished
- ✅ Mobile responsive
- ✅ Documentation complete
- ✅ Staging deployed & tested

**Commit:** `test: Unit + E2E tests, security audit, performance tuning`

---

## Phase 3: Beta Launch & Iteration (Week 8, ~30 hrs)

### Week 8 Deliverables

**Monday - Wednesday**
- [ ] Email 50 beta sign-ups from landing page (2 hrs)
  - Subject: "TaxInvoice.ca is live! Early access inside."
  - Include: Beta link, what to test, feedback form
  - Checkpoint: Invites sent
  
- [ ] Monitor beta feedback (5 hrs)
  - Check in daily: Discord, email replies, Typeform responses
  - Document bugs + feature requests
  - Prioritize: Top 3 pain points
  - Checkpoint: Feedback captured
  
- [ ] Rapid bug fixes (8 hrs)
  - Fix critical issues within 24h (aim for <5 bugs)
  - Deploy hotfixes daily
  - Checkpoint: Issues resolved

**Thursday - Friday**
- [ ] Compile beta feedback report (3 hrs)
  - What users loved: Feature A, Feature B
  - What frustrated them: Pain point A, Pain point B
  - Feature requests for Phase 2
  - Checkpoint: Report written
  
- [ ] Plan Phase 2 features (5 hrs)
  - Choose top 3 Phase 2 improvements
  - Roadmap next 8 weeks
  - Examples: Expense tracking, GST/HST, accountant sharing
  - Checkpoint: Phase 2 scope defined

**Success Metrics:**
- 50+ active beta testers
- 10+ bugs found & fixed
- 5+ feature requests collected
- 80%+ positive sentiment in feedback
- Phase 2 roadmap locked

---

## Parallel Streams (Throughout)

### Marketing & Outreach
- **Week 1-2:** Reddit + Twitter (launch)
- **Week 3-7:** Weekly updates on progress
- **Week 8+:** ProductHunt launch, tech blogs

### Joe's Time Allocation
- **Weeks 1-7:** ~40 hrs/week (primary build)
- **Week 8+:** ~20 hrs/week (maintenance + iterations)

### Alfred's Support (Async)
- Documentation writing
- Debugging assistance
- Code review
- Community management (Reddit replies, emails)

---

## Success Criteria (MVP Complete)

- ✅ 50+ beta users signed up
- ✅ Core features work (upload → organize → export)
- ✅ OCR accuracy >85% on typical invoices
- ✅ T4A/T776 exports are CRA-compliant
- ✅ Freemium gating enforced
- ✅ <5 critical bugs remaining
- ✅ Documentation complete
- ✅ Ready for public launch (Week 9+)

---

## Post-MVP: Phase 2+ Roadmap (Rough)

**Q3 2026:**
- Expense tracking module
- GST/HST calculations
- Multi-year archive UI improvements

**Q4 2026:**
- Accountant collaboration
- Invoice templates for users
- Mobile app (React Native or Flutter)

**2027:**
- AI-powered expense categorization
- Tax filing integration (TurboTax import)
- API for accountants

---

_Roadmap created: Mar 23, 2026. Assumes ~40 hrs/week from Joe, async support from Alfred._
