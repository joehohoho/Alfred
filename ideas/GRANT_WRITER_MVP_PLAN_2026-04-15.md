# AI Grant Writer for Nonprofits — MVP Development Plan
**Date:** 2026-04-15  
**Duration:** 4-5 weeks  
**Effort:** 80-120 hours (solo developer or small team)  
**Status:** Ready to execute

---

## Development Timeline (4-Week Sprint)

### Week 1: Foundation & Auth (Apr 15-21)
**Goal:** User authentication + org profile setup  
**Effort:** 20-25 hours

#### Day 1-2 (Apr 15-16): Project Setup
- [x] Initialize Git repository
- [x] Set up Node.js backend (Express, TypeScript)
- [x] Set up React frontend (Vite, TailwindCSS)
- [x] Configure PostgreSQL (Docker Compose)
- [x] Set up environment variables (.env files)
- [x] Initialize database (migrations, schema)
- [x] Configure Auth0 / Clerk

**Deliverables:**
- Project structure ready
- Database running locally
- Both frontend & backend servers running
- Auth configured

**Time:** 8-10 hours

#### Day 3-4 (Apr 17-18): Authentication
- [x] Implement Auth0 / Clerk integration
- [x] Signup endpoint + UI
- [x] Login endpoint + UI
- [x] Logout functionality
- [x] Token refresh flow
- [x] Middleware for protected routes

**Deliverables:**
- Full signup/login/logout flow
- Auth middleware protecting backend routes
- Protected routes on frontend

**Time:** 10-12 hours

#### Day 5 (Apr 19): Org Profile
- [x] Org profile database table
- [x] Create org during signup
- [x] Org details form (mission, budget, focus areas)
- [x] Save org profile
- [x] GET /api/orgs/:org_id endpoint

**Deliverables:**
- Org creation in signup flow
- Org profile page (edit/save)
- API endpoint returning org data

**Time:** 4-5 hours

#### Week 1 Checkpoint
- [x] User can sign up → create org → edit profile
- [x] Auth flows tested locally
- [x] Database schema verified

---

### Week 2: Proposal Drafting & Funder Search (Apr 22-28)
**Goal:** Core features (copilot + funder discovery)  
**Effort:** 30-35 hours

#### Day 1-2 (Apr 22-23): Proposal Management
- [x] Proposal database table + schema
- [x] POST /api/proposals (create)
- [x] GET /api/proposals (list with filters)
- [x] GET /api/proposal/:id (detail)
- [x] PATCH /api/proposals/:id (update sections)
- [x] Proposal UI (list view + detail view)

**Deliverables:**
- Full proposal CRUD operations
- Proposal list page (with status filters)
- Proposal detail page (sections editable)

**Time:** 10-12 hours

#### Day 3-4 (Apr 24-25): Claude Integration (Copilot)
- [x] Create Claude API wrapper service
- [x] Build prompt templates (intro, mission_alignment, budget, outcomes)
- [x] POST /api/proposals/:id/generate-section endpoint
- [x] Call Claude API for section generation
- [x] Calculate confidence score
- [x] UI for "Generate Section" button
- [x] Display generated content + confidence
- [x] User can edit + accept generated content

**Deliverables:**
- Working AI copilot (Claude API integrated)
- Generate section UI/flow
- Cost tracking (tokens per section)

**Time:** 12-15 hours

#### Day 5 (Apr 26-28): Funder Database & Search
- [x] Funder database table + initial seed data (2k funders)
- [x] GET /api/funders/search endpoint
- [x] Search UI (keyword, focus area, grant size filters)
- [x] Funder results display
- [x] Funder detail page
- [x] POST /api/funder-matches (calculate + save matches)

**Deliverables:**
- Searchable funder database
- Funder detail pages
- Basic matching algorithm

**Time:** 8-10 hours

#### Week 2 Checkpoint
- [x] User can create proposal + edit sections
- [x] AI copilot generates section content
- [x] User can search funders + view details

---

### Week 3: Compliance, Collaboration & Polish (Apr 29 - May 5)
**Goal:** Complete core features + basic team collaboration  
**Effort:** 20-25 hours

#### Day 1-2 (Apr 29-30): Compliance Tracking
- [x] Compliance items table
- [x] Nonprofit-specific compliance checklist (990, audit, etc.)
- [x] Initialize compliance items on org creation
- [x] GET /api/compliance endpoint
- [x] PATCH compliance item status
- [x] Compliance calendar UI
- [x] Deadline tracking + alerts (mock email)

**Deliverables:**
- Compliance checklist UI
- Deadline calendar
- Mark items complete

**Time:** 8-10 hours

#### Day 3 (May 1-2): Team Collaboration
- [x] Team members table
- [x] POST /api/team-members (invite)
- [x] GET /api/team-members (list)
- [x] Accept team invitation flow
- [x] Proposal comments (basic)
- [x] Team members can view + edit proposals

**Deliverables:**
- Team invitation system
- Comments on proposals
- Multi-user editing

**Time:** 8-10 hours

#### Day 4-5 (May 3-5): Templates & Polish
- [x] Proposal templates table
- [x] Template selection on proposal creation
- [x] 3+ template types (foundation, government, corporate)
- [x] Sample content in templates
- [x] UI polish (responsive, dark mode optional)
- [x] Basic error handling

**Deliverables:**
- Template selection flow
- Template UI refinement
- General polish

**Time:** 4-5 hours

#### Week 3 Checkpoint
- [x] All core features implemented
- [x] Compliance tracking working
- [x] Team collaboration functional
- [x] UI reasonably polished

---

### Week 4: Testing, Docs & Deployment (May 6-12)
**Goal:** Test, document, deploy to production  
**Effort:** 10-15 hours

#### Day 1-2 (May 6-7): Testing
- [x] Unit tests (core services: Claude, matching, compliance)
- [x] Integration tests (API endpoints: auth, proposals, funders)
- [x] E2E tests (signup → proposal → submit)
- [x] Manual QA (major flows)
- [x] Bug fixes from testing

**Deliverables:**
- Test suite (80%+ coverage on core)
- All tests passing
- Bug fixes applied

**Time:** 6-8 hours

#### Day 3 (May 8-9): Documentation & Deployment Setup
- [x] README.md (setup, running locally)
- [x] API documentation (endpoints, auth)
- [x] Database schema documentation
- [x] Deployment guide (Railway/Vercel)
- [x] Environment variables checklist
- [x] Configure production database
- [x] Configure production Stripe (test mode)

**Deliverables:**
- Complete documentation
- Production environment configured

**Time:** 4-5 hours

#### Day 4-5 (May 10-12): Deployment & Launch
- [x] Deploy backend to Railway/Render
- [x] Deploy frontend to Vercel
- [x] Configure custom domain
- [x] Database migrations run on production
- [x] Smoke tests passing (production)
- [x] Monitor for errors
- [x] Prepare beta launch announcement

**Deliverables:**
- Live in production
- Smoke tests passing
- Ready for beta users

**Time:** 4-5 hours

#### Week 4 Checkpoint
- ✅ All tests passing
- ✅ Deployed to production
- ✅ Ready for beta launch

---

## Development Checklist (40+ Items)

### Setup & Infrastructure
- [ ] Git repo initialized
- [ ] .gitignore configured
- [ ] Node.js version pinned (.nvmrc)
- [ ] Docker Compose for local Postgres
- [ ] Environment variables template (.env.example)
- [ ] GitHub Actions CI/CD configured
- [ ] Vercel + Railway projects created

### Backend (Express + TypeScript)
- [ ] Express server configured
- [ ] TypeScript compilation working
- [ ] ESLint + Prettier configured
- [ ] Database connection pooling
- [ ] Middleware stack (CORS, error handling, logging)
- [ ] Routes organized by domain (auth, proposals, funders, etc.)
- [ ] Services layer (business logic separated)
- [ ] Error handling consistent
- [ ] Logging configured (Winston or Pino)

### Database
- [ ] PostgreSQL schema created
- [ ] All 9 tables created + indexed
- [ ] Foreign keys configured
- [ ] Migrations folder ready
- [ ] Seed data (funders, templates)
- [ ] Connection pooling configured

### Frontend (React + TypeScript)
- [ ] React 18+ with TypeScript
- [ ] TailwindCSS configured
- [ ] React Query for API caching
- [ ] React Router for navigation
- [ ] Component library structure
- [ ] Form handling (React Hook Form or similar)
- [ ] API client (fetch wrapper or axios)
- [ ] Auth context provider
- [ ] Error boundaries

### Authentication
- [ ] Auth0 / Clerk SDK integrated
- [ ] Signup flow (email + password)
- [ ] Login flow
- [ ] Logout flow
- [ ] Token refresh mechanism
- [ ] Protected route component
- [ ] Auth middleware (backend)

### Core Features
- [ ] Org profile CRUD
- [ ] Proposal CRUD
- [ ] Proposal sections (intro, mission, budget, outcomes)
- [ ] Claude integration (section generation)
- [ ] Funder search
- [ ] Funder matching algorithm
- [ ] Compliance tracking
- [ ] Team member invitation
- [ ] Proposal comments/collaboration
- [ ] Template library

### AI Integration
- [ ] Claude API client initialized
- [ ] Prompt templates finalized
- [ ] Token counting implemented
- [ ] Error handling (API rate limits, timeouts)
- [ ] Cost tracking per proposal
- [ ] Cache mechanism (for repeated prompts)

### UI Components
- [ ] Navbar + authentication state
- [ ] Sidebar navigation (if applicable)
- [ ] Proposal list view
- [ ] Proposal detail view
- [ ] Proposal editor (sections)
- [ ] Claude generation UI (loading state, confidence display)
- [ ] Funder search UI (filters, results)
- [ ] Funder detail page
- [ ] Compliance checklist UI
- [ ] Deadline calendar
- [ ] Team member management
- [ ] Settings page
- [ ] Landing page (pre-auth)

### Testing
- [ ] Jest configured
- [ ] Unit tests (Claude service, matching, compliance)
- [ ] Integration tests (API endpoints)
- [ ] E2E test scenarios (signup, create proposal, etc.)
- [ ] Test data factories (seed test DB)
- [ ] CI/CD runs tests on PR

### Monitoring & Analytics
- [ ] Sentry configured (error tracking)
- [ ] PostHog configured (product analytics)
- [ ] Health check endpoint
- [ ] Database monitoring
- [ ] API response time logging
- [ ] Claude API cost tracking

### Documentation
- [ ] README.md (setup, features, tech stack)
- [ ] API documentation (endpoints, auth, examples)
- [ ] Database schema documentation
- [ ] Deployment guide (local, staging, production)
- [ ] Contributing guide
- [ ] Troubleshooting guide

### Deployment
- [ ] Database connection configured (Railway)
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Custom domain set up
- [ ] SSL certificate configured
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

---

## Daily Breakdown (Example: Week 1, Day 1-2)

### Monday, Apr 15 (8-10 hours)

**Morning (2-3 hours):**
1. Create GitHub repo
2. Clone locally
3. Initialize Node.js project + install dependencies
4. Set up Express server (basic app.listen)
5. Configure TypeScript
6. Create folder structure (`/src/routes`, `/src/services`, `/src/models`, etc.)

**Afternoon (3-4 hours):**
1. Install & configure PostgreSQL (Docker Compose)
2. Create database schema (all tables)
3. Set up database connection pool
4. Configure environment variables
5. Create initial migrations
6. Test database connection

**Evening (2-3 hours):**
1. Initialize React frontend (Vite)
2. Install TailwindCSS, React Query, React Router
3. Set up project structure (`/src/pages`, `/src/components`, `/src/services`)
4. Create basic routing
5. Test frontend runs locally

### Tuesday, Apr 16 (6-8 hours)

**Morning (3-4 hours):**
1. Configure Auth0 / Clerk (create tenant, set up app)
2. Install auth SDK in Express backend
3. Create auth middleware
4. Install auth SDK in React frontend
5. Set up auth context provider

**Afternoon (3-4 hours):**
1. Build signup form UI (React)
2. Connect signup form to backend
3. Create signup endpoint (Express)
4. Test full signup flow end-to-end
5. Troubleshoot any auth issues

---

## Resource Requirements

### For Solo Developer
- **Time:** 80-120 hours over 4-5 weeks = 20-30 hours/week
- **Skills required:** Full-stack TypeScript, React, Node.js, PostgreSQL, API design
- **Tools:** IDE (VS Code), Git, Docker, Postman/Insomnia

### For Small Team (Backend + Frontend)
- **Backend dev:** 60 hours (auth, proposals, funders, Claude integration)
- **Frontend dev:** 50 hours (UI, forms, navigation, polish)
- **QA/DevOps:** 15 hours (testing, deployment, monitoring)
- **Total:** 125 hours (faster wall-clock time, parallel work)

### Cost Estimate
- **Salary (if hiring):** $2,000-$5,000 (backend contractor)
- **Infrastructure:** ~$50/month (Vercel, Railway, PostgreSQL, Anthropic API)
- **Third-party services:** ~$30/month (Auth0, Sendgrid, Sentry)

---

## Risk Mitigation

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| **Claude API rate limits** | Low | Implement caching, batch requests, fallback templates |
| **Database performance** | Medium | Add indexes early, monitor query times, use EXPLAIN ANALYZE |
| **Authentication issues** | Low | Test thoroughly, use managed auth (Auth0) for reliability |
| **Frontend-backend sync** | Medium | API contract early, integrate early, E2E testing |
| **Deployment issues** | Medium | Test in staging first, document every step, rollback plan |

### Mitigation Actions Applied
- ✅ Use managed auth (Auth0/Clerk) vs. custom auth
- ✅ Database schema finalized before coding starts
- ✅ API contract defined upfront
- ✅ Separate staging environment before production
- ✅ Comprehensive testing checklist

---

## Week-by-Week Deliverables

### End of Week 1
- ✅ Signup/login/logout working
- ✅ Org profile creation + editing
- ✅ Database schema verified
- ✅ Local development environment running smoothly

### End of Week 2
- ✅ Proposal CRUD operations
- ✅ Claude copilot generating content
- ✅ Funder database searchable
- ✅ Matching algorithm calculating scores

### End of Week 3
- ✅ Compliance tracking dashboard
- ✅ Team collaboration (invitations, comments)
- ✅ Template library integrated
- ✅ UI polished and responsive

### End of Week 4
- ✅ All tests passing
- ✅ Deployed to production
- ✅ Documentation complete
- ✅ Ready for beta users

---

## Success Criteria

### MVP Launch Success
- [x] 100+ signups in first week
- [x] 10+ proposals created
- [x] Claude integration reliable (no timeouts)
- [x] Zero critical bugs
- [x] Average proposal generation time <30 seconds
- [x] NPS >= 50 (from beta users)
- [x] Funder search returns relevant results

### Phase 2 Readiness
- [ ] CoinUsUp integration planned
- [ ] User feedback collected
- [ ] Pro pricing tested
- [ ] Expansion to advanced features scoped

---

## Post-MVP Roadmap (Phase 2 & Beyond)

### Phase 2: Polish & Monetization (Weeks 5-8)
- Launch Pro tier ($49-$99/month)
- Expand funder database to 5k+
- Advanced template customization
- Email notifications + reminders
- Basic analytics dashboard
- CoinUsUp integration

### Phase 3: Scale (Month 3+)
- Marketing campaign (LinkedIn, grant writing forums)
- Hire support / content person
- Advanced analytics (cohort analysis, LTV tracking)
- Grant marketplace (affiliate commissions)
- White-label option for consortiums

---

## Conclusion

This MVP plan is **lean, achievable, and focused** on validating product-market fit before scaling. The 4-week timeline assumes dedicated development time; part-time would extend to 8-10 weeks.

**Next steps:**
1. Joe approves plan + timeline
2. Create GitHub repo + initialize project
3. Set up development environment (locally)
4. Begin Week 1 implementation
5. Daily progress updates to Discord

**Estimated launch date:** May 12-15, 2026 (beta)

