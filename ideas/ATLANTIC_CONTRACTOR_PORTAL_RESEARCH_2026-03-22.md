# Atlantic Contractor Client Portal — Phase 1 Research & Discovery Framework

**Date:** 2026-03-22  
**Card:** task_1774171849501_375342e7  
**Status:** PHASE 1 — DEMAND VALIDATION & DISCOVERY

---

## 1. CONTRACTOR WORKFLOW ANALYSIS

### Current State: Fragmented Approval Processes

**Core Pain Points (Web Research Summary):**

1. **Email & SMS Chains** (Primary Issue)
   - Quotes sent via email, approval responses scattered
   - No centralized tracking of who approved/rejected
   - Easy to miss approvals, causing project delays
   - Estimated time lost: 7-14 days per approval cycle

2. **Change Order Delays** (High Priority)
   - Specialty contractors submit T&M tickets weeks/months after work
   - Manual re-entry of cost data → errors + rework
   - Multiple review layers (sub-contractor → general contractor → owner) with no visibility
   - T&M documentation often illegible or sloppy, triggering disputes
   - Estimated cycle time: 4-12 weeks from submission to payment

3. **Scope Approval Ambiguity**
   - No single source of truth for scope changes
   - Negotiation loops happen via email/phone
   - Contract updates slow and error-prone
   - Easy to miss cost/timeline impact

4. **Documentation & Compliance**
   - Required forms vary (AIA G701, ConsensusDocs 202, project-specific)
   - Manual tracking of approvals creates liability gaps
   - Bilingual requirements (French/English in Atlantic Canada) not standardized
   - Audit trails missing

5. **Real-Time Visibility Gap**
   - Clients (homeowners, project owners) left in the dark on project status
   - Payment visibility non-existent
   - Change order status unclear until final approval

### Current Workflow Baseline (Typical 1-20 person contractor)

```
Quote Request
  ↓
[Manual estimate, email sent]
  ↓
Waiting (3-7 days, SMS follow-ups)
  ↓
Client approval via email reply (easy to lose)
  ↓
[Contractor manually logs approval, updates schedule]
  ↓
Work begins
  ↓
Scope change discovered (unapproved extras)
  ↓
Change order prepared (manual document, emailed)
  ↓
[Weeks of negotiation, multiple email chains]
  ↓
Approval (finally, maybe with disputes)
  ↓
Payment reconciliation (manual invoice matching)
```

**Target: 15% Cycle Improvement = ~2-3 days saved per approval**

---

## 2. ATLANTIC CANADA CONTRACTOR MARKET

### Market Size & Opportunity

**Atlantic Provinces Overview:**
- **Nova Scotia:** ~45,000 construction workers; active building/renovation market
- **New Brunswick:** ~25,000 construction workers; road/infrastructure heavy
- **Newfoundland & Labrador:** ~20,000; resource/fish industry support
- **PEI:** ~8,000 construction workers; seasonal tourism/residential

**Target ICP: 1-20 person contractors**
- Sole proprietors + small teams (residential, commercial)
- Estimated pool: 3,000-5,000 active contractors Atlantic-wide
- Pain threshold: HIGH (using spreadsheets + SMS is exhausting)
- Budget capacity: $100-500/month (small but committed)

### Trades with Highest Approval Friction
1. **Residential Renovation** (3-6 week projects, 3-7 approvals per project)
2. **Snow Removal** (seasonal, emergency approvals, weather delays)
3. **HVAC** (complex scope, multiple touchpoints)
4. **Marine/Dock Services** (regulatory approvals, multi-party coordination)
5. **General Contracting** (GC has to manage sub-approvals)

### Language Requirement: Bilingual Potential
- **Fully bilingual market:** Quebec border regions (NB), parts of NS
- **Mixed:** Most of NB, parts of Nova Scotia
- **English-dominant:** NL, PEI, much of NS
- **Minimum scope:** English + French templates for legal/contractual docs
- **Nice-to-have:** Full UI bilingual support

---

## 3. COMPETITIVE LANDSCAPE

### Current Contractor Solutions

| Tool | Type | For Approvals? | Bilingual? | Local? | Price |
|------|------|---|---|---|---|
| **Email + Spreadsheets** | Baseline | ❌ No | N/A | ❌ | Free |
| **Asana** | Project mgmt | 🟡 Partial | ❌ No | ❌ | $10-30/person |
| **Monday.com** | Project mgmt | 🟡 Partial | ❌ No | ❌ | $8-30/person |
| **Procore** | Construction-native | ✅ Yes | ❌ No | ❌ | $50-200/month |
| **Buildr** | Construction niche | ✅ Yes | ❌ No | ❌ | $25-50/month |
| **Joist** | Field service | 🟡 Partial | ❌ No | ❌ | $20-40/month |
| **Toast/Fieldwire** | Photo + docs | 🟡 Minimal | ❌ No | ❌ | $15-50/month |

### Gap Analysis
- **No solution targets small Atlantic contractors specifically**
- **Procore is overkill** for 1-20 teams (too expensive, too complex)
- **No bilingual-first tools** for construction (critical for Atlantic region)
- **Client portal weak** in most tools (they assume B2B, not B2B2C)
- **No focus on approval workflows** (most just task boards)

### Opportunity: Purpose-built Atlantic Portal
- Lightweight (not enterprise bloat)
- Approval-first (quotes, scopes, change orders)
- Client-facing (customers see their project status + payment)
- Bilingual by design
- Starter-friendly pricing ($30-75/month for micro-teams)

---

## 4. FEATURE PRIORITY MATRIX (Hypothesis)

### Must-Haves (MVP, Validating in Discovery)
1. **Quote Management** — Create, send, track approval, version control
2. **Change Order Workflow** — Initiate, price, route for approval, document
3. **Client Portal** — View active projects, approve scope/changes, see status
4. **Progress Updates** — Contractor posts photo + notes, client sees it
5. **Approval Tracking** — Who approved, when, what version, audit trail

### Should-Haves (Phase 2, if validated)
6. **Bilingual Templates** — All docs auto-generate in EN+FR
7. **Payment Status** — Invoice visibility (NOT payment processing)
8. **Mobile-First** — Field crews can snap photos, update progress
9. **Subcontractor Integration** — Subcontractors can submit T&M, get approved
10. **Integration** — Connect to accounting (auto-push approved invoices)

### Nice-to-Haves (Phase 3+)
11. **Time Tracking** — Crew logs time, feeds into billing
12. **Material Procurement** — Supplier quotes routed for approval
13. **Scheduling** — Gantt chart + crew allocation
14. **Reporting** — Project profitability, approval cycle metrics

---

## 5. MONETIZATION STRATEGY (Hypothesis)

### Base Subscription Model
- **Starter:** $35/month → up to 5 active projects
- **Professional:** $75/month → unlimited projects, 2 users
- **Team:** $150/month → unlimited projects, 10 users

### Add-Ons
- **Project Volume Fee:** $2-5 per completed project (triggers upon approval)
- **Implementation Service:** $500-2,000 for custom template setup + onboarding
- **Bilingual Localization:** Extra $200/year (if non-bilingual starter)

### Revenue Model Rationale
- **Sticky:** Once templates are set, switching costs are high
- **Low support burden:** Self-service portal, minimal customer support
- **Upsell path:** Start Starter, grow to Professional/Team
- **Implementation revenue:** Consulting for custom workflows

### Target Unit Economics
- **LTV (5-year, 50% churn/year):** ~$600-1,200
- **CAC (target):** <$200 (word-of-mouth, local partnerships)
- **Payback:** <3 months at $75/month
- **Gross margin:** 80%+ (SaaS model, hosted)

---

## 6. DISCOVERY CALL FRAMEWORK

### Objectives
1. Validate core problem (approval delays, scattered communications)
2. Understand current tools + friction points
3. Assess willingness-to-pay + price sensitivity
4. Identify trade-specific workflows (renovation vs HVAC vs snow removal)
5. Gauge interest in bilingual features
6. Recruit design-partner pilots (3 paid engagements)

### ICP Qualification
**Ideal Targets:**
- Contractor with 3-15 employees
- Doing 4+ projects/month (quote volume matters)
- Currently using email/SMS/spreadsheets
- Has clients who ask for status updates
- Located in Atlantic Canada (NB, NS, NL, PEI)
- Open to trying new tools

### Discovery Call Script (45-60 min)

**[INTRO] (3 min)**
- Name + company
- What trade/service?
- How long in business?

**[PROBLEM DISCOVERY] (15 min)**
- "Walk me through your latest project from quote to completion. What steps?"
- "Where do approvals typically happen? Email? Phone? SMS?"
- "How long does it typically take from quote to client approval? What's your record?"
- "What frustrates you most about the approval process?"
- "Have you lost deals because approval took too long?"

**[CURRENT TOOLS] (10 min)**
- "What tools do you use today? (Asana, spreadsheets, email, paper?)"
- "Do your clients ever struggle to find approvals you sent them?"
- "Do you track who approved what and when?"
- "Have approvals ever gotten lost or forgotten?"

**[PAIN POINT DEPTH] (10 min)**
- "If we could cut your approval time in half, how would that help?"
- "What's the cost of a 1-week approval delay? (lost time, frustrated client?)"
- "Do you have language/bilingual customers? Does that complicate approvals?"
- "Do you share job status with clients? How?"

**[SOLUTION EXPLORATION] (10 min)**
- "What if clients could log in and see their project, approve changes, see updates?"
- "Would you use a tool that auto-generated bilingual quotes + change orders?"
- "Who else needs to approve (accountant, owner, general contractor hiring you)?"

**[WILLINGNESS-TO-PAY] (5 min)**
- "How much would you spend monthly for a tool that cut approval time 30-50%?"
- Range probe: $0-50? $50-100? $100-200?
- One-time setup fee: $500? $1000?

**[DESIGN PARTNER INTEREST] (5 min)**
- "We're looking for 3 contractors to help design this tool in exchange for $2K + free year access."
- "Would you be interested in piloting + giving feedback?"
- If yes: capture details, next steps

**[CLOSE] (2 min)**
- "Thank you. I'll reach out with pilot details if you're interested."

---

## 7. DESIGN-PARTNER PILOT FRAMEWORK

### Pilot Structure (3 contractors, 4-week engagement)

**Week 1: Setup & Onboarding**
- Portal created, basic customization (contractor logo, colors)
- 1 demo quote + change order loaded for testing
- Contractor trains 1-2 team members on usage
- Client invited to pilot portal

**Week 2-3: Live Usage**
- Contractor sends 3-5 real quotes via portal
- At least 1 change order scenario tested
- Clients approve via portal (or email fallback)
- Weekly check-in call (15 min) to gather feedback

**Week 4: Feedback & Refinement**
- Full feedback interview (structure + open-ended)
- Identify bugs, missing features, workflow gaps
- Contractor confirms "worth paying for" + at what price
- Testimonial/case study recorded (optional)

### Pilot Compensation
- **Contractor:** $2,000 + free 1-year subscription + setup support
- **Expectation:** 5-10 hours of their time total
- **Success criteria:** Use portal for 5+ approvals, complete feedback interview

### Pilot Success Metrics
1. **Adoption:** Portal used for 5+ quotes/approvals in 4 weeks
2. **Client satisfaction:** Clients approve change orders without back-and-forth
3. **Time saved:** Contractor estimates approval cycle improvement
4. **NPS:** Would you recommend? Score 8+/10
5. **Price validation:** "Would you pay $X/month?"

---

## 8. SUCCESS METRICS & BASELINE

### Approval Cycle Baseline (Current)
- **Quote to approval:** 7-14 days
- **Change order to approval:** 4-12 weeks
- **Approval rejection rate:** 5-10% (due to miscommunication)
- **Approval re-submission:** 2-3 times average

### Target Improvements (Phase 1 Validation)
- **Quote approval:** 2-3 days (71% improvement)
- **Change order approval:** 5-7 days (75% improvement)
- **Rejection rate:** 1-2% (clarity reduces misunderstanding)
- **Re-submissions:** <1 (portal documents are clearer)

### Success Criteria for Phase 1 (Discovery)
- [ ] 10 discovery calls completed (min 8)
- [ ] 3 design-partner pilots engaged (signed, paid)
- [ ] Market sizing validated (contractor pain confirmed)
- [ ] Willingness-to-pay: 70%+ say $50-150/month acceptable
- [ ] Feature validation: 80%+ prioritize quote + change order workflows
- [ ] Bilingual need confirmed: 50%+ work in mixed-language regions
- [ ] Competitive moat identified: no direct replacement exists
- [ ] Revenue assumptions validated: $75/month base fee accepted

---

## Next Steps (Execution)

### Immediate (This Session)
1. Finalize discovery call script (template above, localize)
2. Create prospect list (10 contractors, Atlantic Canada)
3. Draft outreach email + phone call intro
4. Schedule 3 pilot sign-ups for March 25-31

### Week of March 25
- Execute 5-7 discovery calls
- Recruit 3 design-partner pilots + contracts signed
- Begin pilot setup (portal infrastructure)

### Week of April 1
- Complete remaining discovery calls
- Pilots live (Week 1: onboarding)
- Synthesize findings + build feature priority matrix

### Week of April 8
- Pilots active (Week 2-3: live usage)
- Compile feedback
- Begin Phase 2 product architecture

---

## Research Sources

1. **ClearStory Build:** Change order pain points, T&M delays
   - Source: https://www.clearstory.build/construction-blog/gc-change-order-pain-points
2. **Procore CA:** Change order workflows, best practices
   - Source: https://www.procore.com/en-ca/library/how-construction-change-orders-work
3. **CBDC:** Atlantic Canada small business landscape
   - Source: https://www.cbdc.ca/en
4. **Matterport:** Change order management, cost/schedule impact
   - Source: https://matterport.com/blog/construction-change-order-management
5. **AIA Contracts:** Change order requirements, approval flows
   - Source: https://learn.aiacontracts.com/

---

**Status:** READY FOR OUTREACH & DISCOVERY CALL EXECUTION

**Next Handoff:** Begin contractor prospecting + discovery scheduling
