# ConsultIQ — Independent Consultant Toolkit SaaS
## Full Product Specification & Launch Plan
**Author:** Alfred 🎩  
**Date:** 2026-03-20  
**Card:** task_1773979258311_ff2e6acb  
**Status:** Draft v1.0

---

## 1. The Opportunity

### Market Gap
Every major billing/invoicing SaaS (FreshBooks, QuickBooks, Bonsai, HoneyBook, Wave) handles the *mechanical* side of invoicing. None of them handle the **business intelligence layer** that determines whether a consultant is actually running a profitable practice.

The consultants who burn out or undercharge aren't doing so because they can't send an invoice — they're doing it because they:
- Never calculated their true effective hourly rate (accounting for non-billable hours)
- Keep bad clients because they have no scoring system
- Don't know which project types make them money vs. drain them
- Set rates based on gut, not data
- Have no framework for retainer conversations

Joe has 20 years of operational experience solving exactly these problems. **ConsultIQ packages that expertise into software.**

### Target Audience
**Primary:** 1099 independent consultants — freelance developers, IT consultants, legal/ops consultants, agencies (1-10 people)
**Secondary:** Solo professionals transitioning from employment to consulting

**Market size:** ~64M freelancers in the US (2024), ~16M qualifying as professional consultants/service providers. Growing 15% YoY post-pandemic.

### Positioning
> "The business brain for consultants who are done leaving money on the table."

Not a bookkeeping tool. Not another invoice template. **A consulting practice management system built by someone who's actually done it.**

---

## 2. Competitor Landscape

| Tool | Invoicing | Time Tracking | Rate Advice | Client Scoring | Profitability | Trust Acctg |
|------|-----------|---------------|-------------|----------------|---------------|-------------|
| FreshBooks | ✅ | ✅ | ❌ | ❌ | Basic | ❌ |
| QuickBooks | ✅ | ✅ | ❌ | ❌ | Basic | ❌ |
| Bonsai | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| HoneyBook | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Wave | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **ConsultIQ** | ✅ | ✅ | **✅** | **✅** | **✅** | **✅** |

**Moat:** The intelligence layer. No competitor offers rate optimization logic, client quality scoring, or trust accounting basics aimed at solo consultants.

---

## 3. Feature Set

### Tier 1 — Free (Lead Magnet / Acquisition)
- **Rate Calculator:** Input target income, vacation days, overhead, non-billable hours → outputs minimum viable hourly rate, recommended rate, and "stretch" rate
- **Single Client Dashboard:** Track one active client, hours, and project status
- **5 Invoice Templates:** Professional, legally-sound templates (MS Word + PDF download)
- **1 Contract Template:** Master Services Agreement for consultants

### Tier 2 — Solo ($29/month or $249/year)
Everything in Free, plus:

#### Rate Optimization Engine
- Target income → effective rate calculator (accounts for non-billable hours, overhead, taxes, vacation)
- Rate benchmarking: "Based on your skills + location, market rates are $X–$Y"
- Rate increase planner: When and how to raise rates with existing clients
- "True hourly" tracker: Shows actual earnings per hour including all time spent on project

#### Project Profitability Tracking
- Track estimated vs. actual hours per project
- Calculate project margin (revenue - time cost - overhead allocation)
- Identify scope creep automatically (hours vs. original estimate)
- Project profitability history: Which client types / project types make you money?

#### Client Quality Scoring
- Score each client across: Pay speed, Scope discipline, Communication quality, Project growth potential, Referral value
- "Client Health" dashboard: Green/yellow/red per client
- Firing threshold alert: "This client has scored below 40/100 for 3 months — here's a template to offboard them gracefully"
- Referral tracking: Which clients send you business?

#### Billing Templates Library
- 12 invoice templates (hourly, project, retainer, milestone-based)
- Late payment language library
- Billing policy statements (late fees, kill fees, revision limits)
- Scope change request templates

#### Retainer Models Toolkit
- Retainer structure calculator: Hours-based vs. value-based vs. availability retainer
- Retainer proposal template (3 options: starter/standard/premium structure)
- Monthly retainer usage tracker
- Rollover policy templates

#### Trust Accounting Basics (for client fund handling)
- Client fund ledger (separate trust account tracking)
- Disbursement tracking (what came in from client, what was spent, balance)
- Simple reporting: "I received $5,000 from ClientX. I billed $3,200. Balance: $1,800."
- NOT a legal trust account system — a working memory/tracking tool with educational context
- Disclaimer: "This is a tracking aid, not legal trust accounting software"

#### Contract Templates
- Master Services Agreement (MSA)
- Statement of Work (SOW) with scope definition clauses
- Non-Disclosure Agreement (NDA)
- Independent Contractor Agreement (client → consultant)
- Change Order template
- Project Completion / Sign-Off template

### Tier 3 — Premium ($79/month or $699/year)
Everything in Solo, plus:

#### Automated Invoicing
- Connect Toggl / Clockify for time auto-import
- Auto-generate invoices from tracked time (weekly / monthly / milestone triggers)
- Invoice delivery via email (with payment links via Stripe)
- Auto-reminders (3 days before due, on due date, 5 days late, 15 days late)
- Recurring invoice automation for retainer clients

#### Financial Dashboards
- Monthly/quarterly P&L for the solo practice
- Cash flow calendar (when invoices are due, when you expect to be paid)
- Annual income projections based on current clients + pipeline
- Tax estimate (quarterly 1099 estimated taxes calculator — US only v1)
- Year-over-year comparison: Are you growing?

#### Client Communication Templates
- Project kickoff email sequence (3 emails)
- Weekly status update template
- Invoice follow-up sequence (3 escalating templates)
- Scope creep conversation starter templates
- Rate increase letter (3 variations: gentle / direct / premium positioning)
- Difficult client conversation scripts
- Project completion + testimonial request template

#### Priority Support + Office Hours
- Monthly group Q&A call (Joe hosts — live consulting practice advice)
- Priority email support (24h response)

---

## 4. Unique Value Propositions

### 1. The Rate Audit
"Find out if you're leaving money on the table in 10 minutes."
Interactive tool: input your last 3 months of work, get a real effective hourly rate, market comparison, and concrete raise recommendations.

### 2. Client Scorecard
"Know which clients to fire before they drain you."
5-dimension scoring system. Auto-generates monthly client health report.

### 3. Retainer Pitch Builder
"Turn your next client call into a recurring revenue conversation."
Guides you through positioning a retainer, calculates the right price, generates a proposal PDF.

### 4. The "True Hourly" Reality Check
"You think you charge $150/hr. We show you what you actually make."
Accounts for sales calls, admin, revisions, follow-up — reveals true effective rate.

---

## 5. Tech Stack

### Recommended Stack (Vibe Coding Friendly)
```
Frontend:   Next.js 14 (App Router) + TailwindCSS + shadcn/ui
Backend:    Next.js API routes + tRPC (type-safe)
Database:   Supabase (PostgreSQL + Auth + Storage)
Payments:   Stripe (subscriptions + invoicing)
Email:      Resend (transactional) + React Email (templates)
PDF Gen:    @react-pdf/renderer or Puppeteer
Time Import: Toggl API (v9) + Clockify API
Deployment: Vercel (free tier → Pro as needed)
Analytics:  Posthog (product analytics, self-hosted option)
```

### Why This Stack
- Joe already vibes with Next.js ecosystem
- Supabase handles auth + DB + storage (no separate auth service)
- Stripe handles subscription billing + invoicing natively
- Vercel is zero-ops deployment
- Full stack is vibe-coding-compatible (Claude Code can work this entire stack)

---

## 6. Pricing Strategy

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| Free | $0 | $0 | — |
| Solo | $29/mo | $249/yr | $99 (28%) |
| Premium | $79/mo | $699/yr | $249 (26%) |
| Agency (3–10 seats) | $149/mo | $1,299/yr | $489 (27%) |

### Revenue Targets (Conservative)
```
Month 6:   50 paid users × avg $35 = $1,750 MRR
Month 12:  150 paid users × avg $40 = $6,000 MRR
Month 18:  400 paid users × avg $45 = $18,000 MRR
Month 24:  800 paid users × avg $50 = $40,000 MRR
```

**Path to $40K MRR in 24 months** is realistic for a niche SaaS in a pain-point-rich vertical with a credible founder.

---

## 7. Go-To-Market Plan

### Phase 1 — Validation (Month 1–2): FREE
**Goal:** 200 free signups, 20 interviews, validate rate calculator + client scorecard concepts

**Channels:**
- Joe writes 3 LinkedIn posts: "20 years in consulting — here's what I wish I'd known about rates" (personal story content, no product pitch)
- Post Rate Calculator as free tool on Reddit: r/freelance, r/consulting, r/webdev
- Submit to ProductHunt "upcoming" + Indie Hackers "building in public" thread
- Hacker News "Show HN" post when MVP launches

**Validation signals:**
- 200+ free signups → product resonates
- >30% return within 7 days → sticky features found
- 5+ people saying "I'd pay for this" in interviews → proceed to paid

### Phase 2 — Launch (Month 2–4): PAID
**Goal:** 50 paid customers, $1,500 MRR

**Channels:**
- ProductHunt launch (full)
- Indie Hackers milestone posts
- Joe's LinkedIn + Twitter/X (document the SaaS journey — this is content gold)
- Cold outreach to freelance developer communities (Toptal alumni, Upwork forums)
- SEO content: "How to set consulting rates", "client red flags checklist", "retainer proposal template"

### Phase 3 — Scale (Month 4–12): GROWTH
**Goal:** 150–400 paid users, $6K–$18K MRR

**Channels:**
- Monthly group office hours (Premium tier — builds community + retention)
- Affiliate program: $30 per paid referral for 3 months
- Integrations: Toggl, Clockify, QuickBooks export (reduces churn by reducing switching cost)
- SEO compounding (10+ articles targeting "consultant [X] template" keywords)
- Podcast circuit: Joe as guest on freelance/consulting podcasts

---

## 8. MVP Scope (What to Build First)

Build only what validates the core thesis. MVP = 3 features:

### MVP Feature 1: Rate Optimizer
- Multi-step wizard: income goal → overhead → non-billable time estimate → output
- Shows: minimum rate, recommended rate, "what top 10% charge"
- No account needed (lead magnet)
- Email capture at end: "Get your full rate report + market benchmarks"

### MVP Feature 2: Client Scorecard
- Simple 5-question scoring form per client
- Dashboard showing client rankings
- Requires account (free tier)

### MVP Feature 3: Invoice + Contract Template Library
- Download 5 invoice templates + 2 contract templates
- Email capture + account creation gate
- Stripe payment for Solo unlock ($29/mo)

**MVP timeline:** 3–4 weeks with Claude Code + Codex doing the heavy lifting.

---

## 9. Competitive Defense

**Why won't FreshBooks/Bonsai copy this?**
1. Their market is too broad — they can't niche down to "consultant intelligence"
2. The rate optimization and client scoring features require opinionated consulting domain knowledge to design well — Joe is that domain expert
3. Network effects from community (office hours, templates library) create switching cost
4. Trust accounting basics is a legal-adjacent feature that large SaaS companies actively avoid (liability fear) — Joe can own it as an educational tool

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low initial signups | Medium | High | Pre-validate with free tool + 20 interviews before building paid |
| Competitors copy | Low | Medium | Community moat + Joe's personal brand |
| Legal liability (trust accounting) | Low | High | Prominent disclaimers, "tracking aid not legal software" language |
| Churn from free-to-paid friction | Medium | Medium | Strong free value (templates + rate calculator) creates reciprocity |
| Joe time constraint | High | High | Claude Code + Codex do the building; Joe focuses on domain content + validation |

---

## 11. Joe's Unfair Advantages

1. **20 years of real consulting + legal billing experience** — the templates, scoring criteria, and rate benchmarks come from lived knowledge, not research
2. **Existing network** — consultants who can become early beta users and provide testimonials
3. **Alfred + AI stack** — can build this faster than any solo founder without AI tools
4. **Trust accounting knowledge** — almost no SaaS founder understands this; Joe does
5. **The "consultant who became a consultant's consultant" story** — natural media angle

---

## 12. Suggested Product Name Options

1. **ConsultIQ** — Smart consulting practice management (current working title)
2. **BillRight** — Rate + billing focus
3. **RateRight** — Strong SEO angle, direct value prop
4. **PracticePro** — Professional, agency-friendly
5. **Billable** — Clean, memorable, category-defining
6. **ConsultBase** — "Your base of operations as a consultant"

**Recommendation:** `Billable` (if available) or `ConsultIQ`. Both have strong recall and direct value signals.

---

## 13. Immediate Next Steps (Suggested)

1. **[ ] Validate domain availability** for top 3 name options
2. **[ ] Joe green-lights MVP scope** (Rate Optimizer + Client Scorecard + Template Library)
3. **[ ] Spawn Claude Code** to scaffold Next.js + Supabase + Stripe project
4. **[ ] Joe writes Rate Optimizer content** (the inputs/outputs, market benchmarks — this requires his domain knowledge)
5. **[ ] Create r/freelance post** with free Rate Calculator (even basic spreadsheet version) to test demand
6. **[ ] Set up waitlist page** (single-page Next.js app, deploy to Vercel in 2 hours)

---

*Prepared by Alfred 🎩 | ConsultIQ Product Spec v1.0 | 2026-03-20*
