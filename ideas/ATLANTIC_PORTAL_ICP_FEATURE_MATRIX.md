# Atlantic Contractor Portal — ICP Definition & Feature Priority Matrix

**Card:** task_1774171849501_375342e7  
**Date:** 2026-03-22  
**Status:** DISCOVERY PHASE — HYPOTHESIS

---

## 1. IDEAL CUSTOMER PROFILE (ICP)

### Primary Segment: Small Renovation Contractor

```
Demographic:
  Company size: 5-12 people (sole prop + crew)
  Location: Atlantic Canada (NB, NS, NL, PEI)
  Trade: Residential renovation, general contracting, specialty trades
  Revenue: $500K-$3M annually
  Maturity: 3-15 years in business
  Tech comfort: Moderate (uses email, spreadsheets, possibly Asana)

Pain Points:
  1. Quote-to-approval takes 7-14 days (email chains)
  2. Change orders take 4-12 weeks (lost in communications)
  3. Clients ask "where is the approval?" repeatedly
  4. No single source of truth for project status
  5. Bilingual customers struggle with English-only tools

Approval Volume:
  4-8 quotes/month
  1-3 change orders/project
  3-5 active projects simultaneously
  Each approval involves 2-4 decision-makers

Budget:
  Willing to spend: $50-150/month
  Prefer: All-inclusive (no per-user fees)
  ROI focus: Time saved + faster cash flow

Decision Criteria:
  1. Saves time (top priority)
  2. Client-facing (show status, impress client)
  3. Easy setup (no consultant needed)
  4. Bilingual support (if applicable)
  5. Low cost (not $300+ enterprise tools)
```

### Secondary Segment: Specialty Trades (HVAC, Plumbing, Roofing)

```
Demographic:
  Company size: 3-8 people
  Trade: HVAC, plumbing, roofing, electrical
  Service mix: Residential + small commercial
  Emergency/urgent work: Yes (calls from clients)

Key Differences from Primary:
  - Frequent emergency approvals (same-day needed)
  - Shorter project timelines (days, not weeks)
  - Mobile crew (need field access to tools)
  - Subcontractor relationships (approve T&M from techs)
  - Quicker decision cycles (homeowner on-site, decides now)

Pain Points:
  1. Emergency approvals via phone/text (no documentation)
  2. Tech submits T&M, gets lost, resubmitted 3x
  3. Homeowner approval often same-day (tight window)
  4. Handoff between office + field crew = information gaps

Unique Requirements:
  - Mobile-first interface (field crew can add notes + photos)
  - Real-time notifications (immediate approval awareness)
  - Integration with mobile tech (dispatch system)
```

### Tertiary Segment: Multi-Contractor Coordinator (General Contractors)

```
Demographic:
  Company size: 8-20 people
  Role: Manages 5-15 subcontractors on projects
  Manages: Multiple approval chains (sub to GC to owner)

Key Differences:
  - Approves work from subs, then routes to owner
  - Manages timeline dependencies (Sub A approval blocks Sub B start)
  - T&M reconciliation (sub claims vs actual)
  - High communication burden (everyone wants status)

Pain Points:
  1. Sub-to-GC approval slower than GC-to-owner
  2. Dispute risk (sub says "I submitted," GC says "I didn't see it")
  3. Multi-level approvals lack visibility
  4. Owner wants live status, not spreadsheet updates

Unique Requirements:
  - Sub-contractor portal access (limited permissions)
  - Audit trail (who submitted, when, version history)
  - Escalation rules (auto-flag if pending >3 days)
  - Owner dashboard (read-only, but comprehensive)
```

---

## 2. FEATURE PRIORITY MATRIX

### Scoring Methodology

**Importance Score (1-5):**
- 5 = Must-have, drives adoption
- 4 = High value, strong buyer signal
- 3 = Useful, differentiator
- 2 = Nice-to-have, not critical
- 1 = Rarely used, low priority

**Effort Score (1-5, for MVP):**
- 5 = Major build, backend + frontend, 3+ weeks
- 4 = Medium effort, 2-3 weeks
- 3 = Moderate, 1-2 weeks
- 2 = Simple, a few days
- 1 = Trivial, <1 day

**Priority Index = Importance / Effort**
*(Higher = better ROI on development time)*

---

### MVP Features (Phase 1 Build)

| Feature | Category | Importance | Effort | Priority | Validation Status |
|---------|----------|-----------|--------|----------|-------------------|
| **Quote Workflow** | Core | 5 | 4 | 1.25 | 🔵 HYPOTHESIS |
| **Quote Template** | Core | 5 | 2 | 2.5 | 🔵 HYPOTHESIS |
| **Change Order Workflow** | Core | 5 | 4 | 1.25 | 🔵 HYPOTHESIS |
| **Client Portal (View Only)** | Core | 5 | 3 | 1.67 | 🔵 HYPOTHESIS |
| **Approval Signatures** | Core | 4 | 2 | 2.0 | 🔵 HYPOTHESIS |
| **Progress Updates** | Client Engagement | 4 | 2 | 2.0 | 🟡 VALIDATE |
| **Email Notifications** | Engagement | 4 | 1 | 4.0 | 🟡 VALIDATE |
| **Approval History** | Compliance | 4 | 1 | 4.0 | 🟡 VALIDATE |
| **Project Dashboard** | Main Interface | 4 | 2 | 2.0 | 🔵 HYPOTHESIS |
| **User Invitations** | Setup | 3 | 1 | 3.0 | 🟡 VALIDATE |
| **Bilingual Templates** | Localization | 3 | 3 | 1.0 | 🟡 VALIDATE |
| **Mobile-Responsive** | Interface | 3 | 2 | 1.5 | 🟡 VALIDATE |

**MVP Time Estimate:** 8-12 weeks (1-2 core engineers)

---

### Phase 2 Features (Post-Validation)

| Feature | Category | Importance | Effort | Priority | Notes |
|---------|----------|-----------|--------|----------|-------|
| Full Bilingual UI | Localization | 3 | 4 | 0.75 | After EN validates |
| Photo Upload (Progress) | Mobile | 4 | 2 | 2.0 | Field crews need this |
| Payment Status Display | Visibility | 4 | 3 | 1.33 | NOT payment processor |
| Subcontractor Portal | Workflows | 3 | 3 | 1.0 | For GC coordinators |
| Time Tracking | Labor | 3 | 4 | 0.75 | Future billing |
| Accounting Integration | Fulfillment | 2 | 5 | 0.4 | Stretch feature |
| Mobile App (iOS/Android) | Distribution | 2 | 5 | 0.4 | Post-launch |

---

### Feature Dependency Map

```
MUST HAVE (MVP):
  Quote Workflow ← Quote Template + Email Notifications
  Change Order Workflow ← Approval Workflow
  Client Portal ← Quote Workflow + Change Order Workflow
  Approval Signatures ← Signature widget
  Approval History ← Audit logging system

NICE-TO-HAVE (Phase 2):
  Photo Upload ← Client Portal + Mobile interface
  Subcontractor Portal ← User permissions + separate dashboard
  Payment Status ← Approval History integration
  Bilingual UI ← Template translation system
```

---

## 3. TRADE-SPECIFIC REQUIREMENTS

### Residential Renovation Contractors

**Must-Haves:**
- Quote approval (multi-phase projects need scope clarity)
- Change order workflow (budget creep is real)
- Progress photo uploads (clients want to see progress)
- Bilingual templates (French customers in NB/Quebec border)

**Nice-to-Haves:**
- Payment status visibility (builds client trust)
- Timeline/Gantt (show project schedule)

**Trade-Specific Pain Points:**
- Scope creep: Client adds "while you're here..." → needs documented
- Phasing: Initial quote, inspection results, revised quote
- Weather delays: Need to communicate revised timeline

---

### HVAC / Plumbing Services

**Must-Haves:**
- Emergency approval workflow (same-day or faster)
- Mobile field access (techs add photo + notes on-site)
- Real-time notifications (office needs to know immediately)
- T&M submission from field (tech logs labor + parts)

**Nice-to-Haves:**
- Integration with dispatch system (Jobber, Servicemax)
- Auto-escalation if customer approval pending >2 hours

**Trade-Specific Pain Points:**
- Diagnostic calls → approval after inspection
- Warranty claims → detailed documentation required
- Emergency hours → approval may be late-night/weekend

---

### General Contractors (Manage Subs)

**Must-Haves:**
- Subcontractor T&M submission (separate portal access)
- GC approval before owner sees it (quality gate)
- Audit trail (who submitted, GC approved, owner approved)
- Multi-level approval visualization

**Nice-to-Haves:**
- Escalation alerts (pending approval >3 days = flag)
- Owner dashboard (read-only, comprehensive view)
- Budget tracking (tie approvals to project budget)

**Trade-Specific Pain Points:**
- Sub disputes: "I submitted weeks ago" vs "we never got it"
- Multi-party coordination: Time zone, language, communication gaps
- Accountability: Who is responsible for approval delays?

---

## 4. PRICING SENSITIVITY & WILLINGNESS-TO-PAY

### Hypothesis (From Market Research)

**By Segment:**

| Segment | Size | WTP Baseline | WTP Premium | Adoption Risk |
|---------|------|--------------|------------|---|
| **Renovation** | Largest | $75/mo | +$25 for bilingual | Low |
| **Specialty Trades** | Medium | $50/mo | +$25 for mobile | Medium |
| **GC Coordinator** | Smaller | $150/mo | +$50 for subs | Low |

**Validation Questions:**
- "Would you pay $75/month to save 20+ hours/month on approvals?"
- "Would you pay 20% more for bilingual templates?"
- "Is there a monthly ceiling above which you'd choose alternatives?"

**Expected Findings (Discovery):**
- 70%+ accept $50-100/month
- 50%+ prioritize bilingual
- Willingness increases if time-saved is demonstrated

---

## 5. COMPETITIVE POSITIONING

### How We Win

| Dimension | Our Approach | vs Procore | vs Asana | vs Spreadsheets |
|-----------|---|---|---|---|
| **Price** | $35-150/mo | $50-200+ | $8-30/person | Free (hidden cost) |
| **Learning Curve** | 30 min setup | 2-3 days | 1-2 days | Low |
| **Approval Focus** | Purpose-built | Feature among many | Task workflow only | Manual |
| **Client Portal** | Native, mobile | Optional add-on | Weak | Email only |
| **Bilingual** | Built-in | Not available | Not available | Not available |
| **Geography Moat** | Atlantic-first | Global | Global | N/A |
| **Small-team friendly** | Yes (1-20) | No (enterprise) | Yes | Yes |

### Market Positioning Statement

> "Atlantic Contractor Portal is the only approval tool built specifically for small Atlantic Canada contractors (1-20 teams). We cut quote approvals from weeks to days, provide clients a branded portal, and support French without complexity. Starting at $35/month with no per-user fees."

---

## 6. SUCCESS CRITERIA FOR DISCOVERY PHASE

### Validation Checklist

- [ ] **Problem Validated:** 8+ interviews confirm approval delays are #1 pain
- [ ] **Willingness-to-Pay:** 70%+ accept $50-150/month pricing
- [ ] **Feature Alignment:** 80%+ prioritize quote + change order workflows
- [ ] **ICP Fit:** Confirmed target (renovation > specialty > GC coordinator)
- [ ] **Bilingual Signal:** 50%+ work in French-speaking regions
- [ ] **Competitive Gap:** No direct replacement exists (Procore is overkill)
- [ ] **Adoption Signal:** 3 pilots signed, eager to test
- [ ] **Moat Potential:** Geography + workflow focus defensible vs Procore

### Go/No-Go Decision Points

**GO to Phase 2 (MVP Build) if:**
- 8+ interviews completed with consistent pain pattern
- 3 pilots signed and baseline workflows documented
- Willingness-to-pay validates $75+/month (SaaS profitable)
- Feature priority aligned across segments

**NO-GO if:**
- <5 interviews show interest (low demand signal)
- Willingness-to-pay tops out at <$30/month (not viable)
- Procore/Monday adoption already high (too entrenched)
- Pilots sign but then ghost (low genuine engagement)

---

## Next Action

**This week:** Execute discovery calls + pilot recruitment  
**Validation target:** 8+ calls, 3 pilots signed  
**Decision:** March 31 (Go/No-Go for MVP build)

---

**Status:** HYPOTHESIS READY FOR VALIDATION  
**Owner:** Alfred  
**Next Review:** March 31, 2026
