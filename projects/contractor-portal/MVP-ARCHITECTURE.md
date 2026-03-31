# MVP Architecture — Atlantic Contractor Portal
**Phase:** Pre-build (Mar 31 - Apr 15, MVP launch May 15)  
**Status:** DESIGN IN PROGRESS  
**Target:** Lightweight, fast-to-market, bilingual-ready

---

## Product Definition (MVP Scope)

### Core Problem
Small contractor teams (5-20 staff) in Atlantic Canada manage quote approvals, scope changes, and payment status via scattered SMS/email, causing:
- Delayed approvals (3-5 back-and-forths typical)
- Disputes ("I never saw that email")
- Manual tracking (spreadsheets, notebooks)
- Lost opportunities (slow response = client accepts competitor quote)

### MVP Solution
**Lightweight branded portal** (not a full project management tool) for:
1. **Quote upload & approval** (client clicks "approve" or "request change")
2. **Scope change tracking** (audit trail of who approved what, when)
3. **Progress updates** (contractor posts photos/status, client sees notifications)
4. **Payment visibility** (read-only invoice status, tied to approval workflow)

**NOT in MVP:**
- Payment processing (we don't become a payment processor)
- Accounting integration (we only sync invoice/payment status read-only)
- Mobile app (web responsive, mobile-friendly only)
- Integrations (Procore, Asana, etc. → Phase 2)
- Advanced analytics

### Target Users
- **Primary:** Contractor (project manager or admin)
  - Uploads quotes, scope changes, progress photos
  - Manages team access (who can approve?)
  - Sends approval requests to clients
  
- **Secondary:** Contractor's client (residential homeowner, commercial property manager)
  - Receives approval links (no login initially)
  - Reviews quote, photos, scope changes
  - Clicks "Approve" or "Request Change"

---

## Tech Stack (MVP)

**Why these choices:** Speed (4-6 weeks), cost ($200-300/month), proven reliability

| Layer | Technology | Why | Cost/month |
|-------|-----------|-----|-----------|
| **Frontend** | Next.js 14 (React, TypeScript, Tailwind) | Production-ready, full-stack, fast dev | $0 |
| **Auth** | Supabase Auth (JWT) | Works for both contractors + clients | $25-50 |
| **Database** | PostgreSQL (Supabase) | Relational (quotes, changes, approvals), proven | $25-50 |
| **Storage** | Supabase Storage (S3 behind scenes) | PDFs, photos, documents | $25-50 |
| **Hosting** | Vercel | Next.js-native, CDN included | $20-50 |
| **Email** | SendGrid or Resend | Approval notifications | $10-25 |
| **Monitoring** | Sentry | Error tracking | $10 |
| ****TOTAL**| | | ~$150-250/month |

**Database Schema Preview:**
```
users (contractor team members)
├─ id, email, password_hash, company_id, role
├─ created_at, updated_at

clients (contractor's customers)
├─ id, company_id, name, email, phone
├─ billing_address, created_at

projects (jobs/work orders)
├─ id, company_id, client_id, name, description
├─ status (draft, pending_approval, active, completed)
├─ created_at, updated_at

quotes (proposals)
├─ id, project_id, version, amount, pdf_url
├─ created_at, created_by

approvals (audit trail)
├─ id, quote_id, change_id, client_id, status (pending, approved, rejected)
├─ response_date, notes, created_at

scope_changes (change orders)
├─ id, project_id, description, amount_delta, pdf_url
├─ created_at, created_by

progress_updates (photos + status)
├─ id, project_id, message, photos_urls
├─ created_at, created_by

invoices (read-only sync from contractor's accounting system)
├─ id, project_id, amount_due, due_date, status (draft, sent, paid)
├─ synced_at (sync timestamp, not live API call)
```

---

## Feature Priority (MVP → Launch)

### Sprint 1 (Apr 22-28): Core Approval Workflow
**Effort:** 60 hours  
**Deliverable:** Contractors can upload quotes, clients can approve

**Features:**
- [x] Contractor sign-up + team management
- [x] Quote upload (PDF + metadata: amount, description, due date)
- [x] Client approval link (no login required, one-click approve/reject)
- [x] Approval audit trail (who, what, when)
- [x] Email notifications (quote ready, approval received)

**Technical depth:**
- Auth: Contractor + guest client links (JWT tokens, no passwords)
- Upload: S3/Supabase Storage with file size limits (10 MB per PDF)
- Database: Schema normalized (users, clients, projects, quotes, approvals)
- Email: SendGrid for notifications
- UI: Contractor dashboard (projects list) + client approval page (minimal, clean)

### Sprint 2 (Apr 28-May 5): Scope Changes + Audit Trail
**Effort:** 40 hours  
**Deliverable:** Full approval workflow for scope changes + decision trail

**Features:**
- [x] Scope change proposals (contractor uploads change order PDF + delta amount)
- [x] Approval tracking (who approved, who rejected, decision timeline)
- [x] Approval history page (all decisions on one project, searchable)
- [x] Bilingual templates (French + English buttons/emails)
- [x] Mobile-friendly UI (responsive design, tested on iOS + Android)

**Technical depth:**
- Approval state machine (pending → approved / rejected)
- Audit log (immutable records of all changes)
- Bilingual i18n setup (next-i18n library)
- CSS media queries (mobile-first responsive design)

### Sprint 3 (May 5-12): Progress Updates + Payment Status
**Effort:** 40 hours  
**Deliverable:** Project communication hub (photos, status, payment visibility)

**Features:**
- [x] Progress updates (contractor posts message + photo)
- [x] Client notification (automatic alerts when update posted)
- [x] Payment status page (read-only, synced from contractor's invoicing)
- [x] Project timeline view (all events on one page: quotes, approvals, updates, payments)
- [x] Search + filtering (find approvals by date, project, client)

**Technical depth:**
- Photo upload + CDN caching (fast load)
- Invoice sync (real data via CSV import or API stub for demo)
- Timeline UI (calendar/list hybrid)
- Search indexing (PostgreSQL full-text search)

### Sprint 4 (May 12-15): Polish + Go-Live Prep
**Effort:** 20 hours  
**Deliverable:** Production-ready, tested, documented

**Features:**
- [x] User onboarding flow (help first-time users set up company + team)
- [x] Help documentation (FAQs, video tutorials)
- [x] Performance testing (page load <2s, database queries optimized)
- [x] Security review (SQL injection, CSRF, auth edge cases)
- [x] Monitoring setup (Sentry error tracking, uptime monitoring)

---

## User Flows (Diagrams in Figma)

### Flow 1: Quote Approval (Contractor → Client → Approval)
```
Contractor logs in
    ↓
Creates project
    ↓
Uploads quote (PDF + amount)
    ↓
Selects client(s)
    ↓
System sends email to client: "Click here to approve quote"
    ↓
Client clicks link (no login needed, token-based)
    ↓
Client sees quote, reviews, clicks "Approve" or "Request Change"
    ↓
Contractor gets notification: "[Client] approved quote for $X"
    ↓
Approval recorded in audit trail
    ↓
Portal shows: "Quote approved by [Client] on [Date]"
```

### Flow 2: Scope Change Approval
```
Contractor logs in
    ↓
Opens project
    ↓
Clicks "Add Scope Change"
    ↓
Uploads change order PDF + delta amount (e.g., +$5,000)
    ↓
System sends email to client: "Scope change ready for approval"
    ↓
Client clicks link, reviews, approves/rejects
    ↓
Contractor gets notification
    ↓
Portal shows: "Change approved, new total: $X" or "Change rejected"
```

### Flow 3: Progress Update
```
Contractor logs in
    ↓
Opens project
    ↓
Clicks "Post Update"
    ↓
Types message + uploads 1-3 photos
    ↓
Clicks "Share with Client"
    ↓
Client gets email: "[Contractor] posted progress update"
    ↓
Client clicks link, sees photos + message
    ↓
If payment-due, shows: "Next payment due: $X on [Date]"
```

---

## MVP Go/No-Go Success Criteria

**Launch readiness (May 15):**

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| **Uptime** | 99%+ | Sentry monitoring + daily check |
| **Performance** | <2s page load | Lighthouse score >90 |
| **Security** | No OWASP Top 10 | Security audit checklist |
| **Usability** | 80%+ task completion | Design-partner feedback |
| **Feature completeness** | 100% of MVP | Feature checklist |
| **Pilot adoption** | 80%+ of team uses portal | Usage analytics |
| **Data integrity** | 100% of approvals logged | Audit trail spot-checks |

---

## Deployment Pipeline

### Development Environment
```
localhost:3000 (Next.js dev server)
├─ Supabase local (via docker-compose)
└─ Local file storage (./uploads)
```

### Staging Environment
```
staging.contractor-portal.dev (Vercel)
├─ Supabase staging DB
└─ S3 staging bucket
└─ SendGrid test mode (no real emails)
```

### Production Environment
```
contractor-portal.app (Vercel, custom domain TBD)
├─ Supabase production DB
├─ S3 production bucket
├─ SendGrid live mode
├─ Sentry error tracking
└─ CDN caching (Vercel edge network)
```

### Deployment Process
1. **Development** → Git push to `main` (feature branches)
2. **Staging** → Vercel auto-deploys from `staging` branch (manual approval required)
3. **Production** → Vercel auto-deploys from `main` branch after staging validation (1-2 hours before launch)
4. **Rollback** → If critical error, revert commit + redeploy (< 2 min)

---

## Design System (Pre-build)

### Color Palette (Bilingual-friendly, accessible)
```
Primary: #003D82 (deep blue, contractor professional)
Secondary: #FF6B6B (approval success, vibrant)
Danger: #EE5A6F (rejection, clear)
Neutral: #F8F9FA (backgrounds)
Text: #1A1A1A (dark, readable)
```

### Typography
- **Headings:** Inter Bold (modern, clean)
- **Body:** Inter Regular (readable, accessible)
- **Code:** Courier New (logs, audit trail)

### Component Library
- Button (primary, secondary, danger, loading states)
- Modal (approve/reject dialogs)
- Card (project cards, quote cards)
- Form inputs (text, email, file upload, date picker)
- Table (audit trail, payment history)
- Empty state (helpful onboarding messages)

---

## Bilingual Strategy (English + French)

### Phase 1 (MVP)
- UI buttons + labels in both languages
- Email templates in both languages (sent based on client preference)
- Help docs in both languages

### Phase 2 (Post-launch)
- Contractor dashboard in both languages
- Client portal in both languages
- RTL support (if needed for future Arabic/Hebrew markets)

### Implementation
- Use `next-i18n` library
- French translations reviewed by native speaker (Quebec-based)
- Bilingual tag line: "Approval Portal for Atlantic Contractors | Portail d'approbation pour entrepreneurs"

---

## Security Checklist (Pre-launch)

- [ ] Auth: JWT tokens, password hashing (bcrypt), session management
- [ ] Input validation: Sanitize all forms, prevent SQL injection
- [ ] File uploads: Validate MIME types, scan for malware (if budget allows)
- [ ] HTTPS: Vercel provides free SSL/TLS
- [ ] CORS: Lock down to contractor domain only
- [ ] Rate limiting: Prevent brute force (email notification approval links)
- [ ] Audit logging: All approvals recorded with IP, timestamp, user agent
- [ ] Penetration testing: Do manual security review before May 15
- [ ] Compliance: Check PIPEDA (Canada) for client data storage

---

## Success Metrics (Post-launch)

### User Adoption
- Week 1: All 3 pilots set up profiles + upload first quote
- Week 2: 70%+ of pilot team members using portal
- Week 4: Avg 2-3 quotes/changes per pilot per week

### Feature Usage
- Approval rate: >80% of quotes approved within 24 hours (baseline)
- Scope changes: Average 1-2 per project (track vs control)
- Progress updates: 70%+ of projects have ≥1 update

### Business Metrics
- NPS (Net Promoter Score): >50 (from pilot feedback)
- Support tickets: <1 per pilot per week (low friction)
- Churn: 0% during pilot (all 3 stay engaged)
- Referrals: 3 additional leads from pilot recommendations

---

## Post-MVP Roadmap (Phase 5, Q3 2026+)

- **API integrations:** Procore, QuickBooks, Xero, Monday.com
- **Mobile app:** iOS + Android (native or React Native)
- **Advanced features:** Automated approval workflows, multilingual support, payment processing
- **Marketplace:** Template library (industry-specific workflows for HVAC, plumbing, etc.)
- **Analytics:** Dashboard for contractors (approval times, client response rates, revenue impact)

---

## Budget (MVP Phase Only)

| Item | Cost | Notes |
|------|------|-------|
| **Infrastructure (3 months)** | $400-600 | Supabase, Vercel, SendGrid, Sentry |
| **Domain** | $15 | contractor-portal.app (or TBD) |
| **Design (Figma)** | $0 | Already included in team license |
| **Development time (Alfred)** | $0 (in-kind) | 160-200 hours |
| ****TOTAL**| **$415-615** | Lean, bootstrapped |

---

## Timeline (High-level)

| Phase | Dates | Owner | Deliverable |
|-------|-------|-------|-------------|
| **Discovery Calls** | Mar 31 - Apr 11 | Alfred + Joe | 10 calls, 3 pilots signed |
| **Design + Kickoff** | Apr 12-15 | Alfred | Figma wireframes, tech setup |
| **Sprint 1: Approvals** | Apr 22-28 | Alfred | Quote approval workflow live |
| **Sprint 2: Scope Changes** | Apr 28-May 5 | Alfred | Scope change approvals live |
| **Sprint 3: Progress + Payment** | May 5-12 | Alfred | Full feature set live |
| **Sprint 4: Polish** | May 12-15 | Alfred | Production-ready |
| **MVP LAUNCH** | May 15 | All | Live with 3 pilots |
| **Feedback Loop** | May 15-Jun 15 | Alfred + Pilots | Weekly iterations |
| **GA Launch Decision** | Jun 15 | Joe + Alfred | GO to Phase 5 or SUNSET |

---

**Status:** Design phase complete. Ready for Figma wireframes (next step). Code scaffolding starts Apr 12 (post go/no-go decision).
