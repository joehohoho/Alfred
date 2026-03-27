# Even Us Up — 90-Day Growth Roadmap (Q2 2026)

**Status:** Ready for Implementation  
**Last Updated:** 2026-03-27 13:35 ADT  
**Owner:** Growth Team  
**Approval Gate:** Requires Joe sign-off on Week 1-2 sprint scope + engineer allocation

---

## Overview

Based on deep audit of current state, competitive position, and user research (from Q2 Growth Plan 2026-03-18), this roadmap prioritizes **top 3 UX friction fixes + top 3 growth levers** over 90 days.

**Key Finding:** Settlement clarity is the adoption bottleneck. Fixing this + onboarding unlocks all downstream growth.

**Success Metrics (90 days):**
- Activation rate: 30% → 50%
- Settlement rate: 40% → 60%
- Retention (30-day): 25% → 40%
- Household adoption: 0% → 20%

---

## Phase 1: CRITICAL FIXES (Weeks 1-2)

**Effort:** 19-30 hours total  
**Allocation:** 1 engineer full-time (4-5 days) + 1 designer (parallel mocks)  
**Output:** 2 major features, 1 parallel landing page  
**Success Gate:** 60% of new users complete first settlement within 7 days

### Fix #1: Settlement Clarity (HIGH IMPACT)

**What's Broken:**
- Settlement modal is reactive (hidden until user clicks)
- Distinction between group expenses and P2P unclear
- "Settle" vs "Pay" language ambiguous
- Interac instructions buried or missing
- No proactive dashboard reminder

**Solution:**
1. **Proactive Settlement Card** on dashboard
   - Shows top 3 pending settlements
   - "You owe $X to Y" (clear language)
   - One-click to Interac instruction
   
2. **Redesigned Settlement Modal**
   - Net balance per person (who owes whom)
   - Settlement method selector (Interac primary)
   - Pre-filled Interac instruction ("Send $15 via Interac to Alice")
   - Confirmation receipt (email + in-app)

3. **Interac-First Language**
   - Replace "Pay" with "Send via Interac"
   - Add Interac Direct integration (Phase 2, post-MVP)
   - Visual Interac badge (trusted, familiar)

**Effort:** 5-8 hours implementation + 1-2 hours testing  
**Design Input:** 2-3 hours Figma mockups (wireframes + final)  
**Success Metrics:**
- 60% of new users see & click settlement card within 7 days
- 70% choose Interac as settlement method
- Settlement completion rate 40% → 60% (estimated)

**Deliverables:**
- Settlement redesign Figma mocks (for review)
- Backend: dashboard settlement card query + modal refactor
- Frontend: Settlement.tsx component + DashboardSettlementCard.tsx
- Email: settlement confirmation template
- Testing: e2e for settlement flow

---

### Fix #2: Onboarding Wizard (HIGH IMPACT)

**What's Broken:**
- New users see blank dashboard → confusion → abandon
- No guided flow for first group creation
- "Sample group" not implemented
- Gap between signup and first expense = dropout point

**Solution:**
1. **3-Step Wizard** (on first login)
   - Step 1: "Let's create your first group" → name, description
   - Step 2: "Add group members" → email invite flow
   - Step 3: "Add first expense" → category + amount + split
   - Completion: group is live, no additional steps

2. **Sample/Template Group** (optional)
   - Auto-seeded on first login (deletable, no friction)
   - Pre-loaded with: "Roommate Rent", "Utilities", "Groceries"
   - Demonstrates app mechanics (no real settlement pressure)

3. **Smart Defaults**
   - Category defaults: Rent, Utilities, Groceries, Entertainment, Dining, Household
   - Split defaults: Equal split (easiest)
   - Member defaults: user's email pre-filled

**Effort:** 8-12 hours implementation + 2 hours testing  
**Design Input:** 2-3 hours Figma (3-step flow)  
**Success Metrics:**
- 80% of new users complete wizard within 30 min (track analytics)
- 50% of users create recurring expense within 30 days
- Activation (first settlement) 30% → 50% (estimated)

**Deliverables:**
- Onboarding wizard Figma mocks
- Frontend: OnboardingWizard.tsx component + step components
- Backend: sample group seed logic
- Analytics: onboarding completion tracking
- Testing: e2e for full wizard flow

---

### Growth Lever #1: Canada-First Landing Page (PARALLEL WORK)

**What's Missing:**
- No differentiation messaging
- Splitwise dominates search results
- No "Canada story" told

**Solution:**
1. **Hero Section**
   - "Expense Splitting Built for Canada"
   - Interac badge, CAD-optimized, households focus
   - CTA: "Try Free"

2. **Comparison Chart**
   - Even Us Up vs Splitwise
   - Differentiators: Interac, CAD, households, OCR
   - "Not sure? Compare →"

3. **Use Case Stories** (3-4)
   - Couples sharing rent (households mode)
   - Roommates splitting bills (recurring expenses)
   - Group trip (one-off expenses)
   - Family babysitting (cash settlement tracking)

4. **CTAs & Conversion**
   - "Try for Free" (signup)
   - "Import from Splitwise" (future, Phase 4)
   - Email capture for marketing

**Effort:** 6-10 hours design + content + 2-3 hours deployment  
**Success Metrics:**
- 500+ landing page visitors/month
- >5% CTR to signup (vs current baseline)
- 10-15% of new signups from landing page (track via utm_source)

**Deliverables:**
- Landing page design (Figma)
- Copy + use case content
- Next.js page deployment
- Analytics tracking (conversion funnel)
- SEO: meta tags, Open Graph

---

## Phase 2: SHORT-TERM GROWTH (Weeks 3-6)

**Effort:** 24-37 hours total  
**Allocation:** 2-3 engineers (8-10 days)  
**Output:** 3 features (notifications, OCR, recurring verification)  
**Success Gate:** 70% push notification opt-in, 50% households with recurring

### Feature #1: Real-Time Notifications (10-14 hours)

**What's Missing:**
- No push notifications for settlement reminders
- No email for group activity
- No nudges for inactive members

**Solution:**
1. **Notification Types**
   - Settlement due (7 days from expense)
   - Inactive nudge (5+ days no activity)
   - Settlement confirmation (proof of payment)
   - Group invite confirmation
   
2. **Channels**
   - Web push (primary)
   - Email (secondary)
   - In-app bell icon (always available)

3. **User Controls**
   - Frequency selector: High/Medium/Low
   - Per-notification-type opt-in
   - Quiet hours: 10 PM - 8 AM (no pushes)

**Effort:** 10-14 hours (backend + frontend + email)  
**Dependencies:** Settlement redesign from Phase 1  
**Success Metrics:**
- 70%+ notification opt-in rate
- 20-30% improvement in settlement completion

**Deliverables:**
- Notification service setup (Firebase Cloud Messaging)
- Backend: notification queue + scheduler
- Frontend: notification permission flow
- Email templates (SendGrid)
- Settings: notification preferences UI

---

### Feature #2: OCR Correction Flow Upgrade (10-15 hours)

**What's Broken:**
- Correction modal is multi-step (slow UX)
- No OCR confidence indicator
- Can't edit inline

**Solution:**
1. **Inline Editing**
   - Click any field in receipt preview → edit in place
   - No modal navigation needed
   - Batch corrections → one save

2. **OCR Confidence Badge**
   - High (95%+) / Medium (75-95%) / Low (<75%)
   - Visual indicator (green/yellow/red icon)
   - "Retry" button if low confidence

3. **Batch Correction UI**
   - Multiple fields editable at once
   - Edit all, save all (vs modal per field)
   - Undo option

**Effort:** 10-15 hours (UX refactor + inline edit logic)  
**Dependencies:** Existing OCR components (ReceiptScanner.tsx, etc.)  
**Success Metrics:**
- Receipt correction time: 2 min → 30 sec median
- 20-30% improvement in OCR adoption

**Deliverables:**
- Refactored ReceiptSplitFlow.tsx
- InlineReceiptEdit.tsx component
- OCR confidence badge component
- Testing: e2e for multi-field edits

---

### Verification: Recurring Expenses (4-8 hours)

**What's the Status?**
- RecurringBills.tsx exists in components
- RecurringBillsCalendar.tsx exists
- **Unclear:** Are templates + auto-create already built?

**Action:**
1. Audit RecurringBills.tsx
   - Do templates exist?
   - Is auto-create logic present?
   - What gaps remain?

2. If gaps:
   - Add template library (Rent, Utilities, Groceries, Insurance, etc.)
   - Implement auto-create on schedule
   - Extend calendar view

3. If complete:
   - Document existing functionality
   - Plan marketing/discovery (users don't know feature exists)

**Effort:** 1-2 hours audit + 4-8 hours build (if gaps exist)  
**Success Metrics:**
- 40%+ of households use recurring expenses
- Reduce manual entry friction by 50%

**Deliverables:**
- Audit report (1-2 hours)
- Implementation gap list + effort estimate
- Template library + auto-create logic (if needed)

---

## Phase 3: MEDIUM-TERM LOCK-IN (Weeks 7-10)

**Effort:** 22-36 hours total  
**Allocation:** 2 engineers (10-12 days)  
**Output:** 2 major features  
**Success Gate:** 25% of signups choose household mode

### Feature #1: Households/Couples Mode (12-20 hours)

**Why This Matters:**
- Households = sticky (recurring expenses = high engagement)
- Splitwise is weak here (couples-agnostic)
- High lifetime value segment
- Recurring components already partially built

**Solution:**
1. **Household Dashboard**
   - Toggle from "Ad-hoc Groups" to "Households" mode
   - Monthly recurring expense view (auto-calculated)
   - Shared budget tracking (vs individual groups)
   - Partner activity feed (who paid what, when)

2. **Household Setup Wizard**
   - Name + partner email (2-step)
   - Auto-seed recurring: rent, utilities, groceries
   - Monthly auto-create (vs manual)

3. **Monthly Recap Email**
   - Total spent this month
   - Spending trends (vs last month)
   - Settlement status (who owes whom)
   - Next month's forecast

**Effort:** 12-20 hours (dashboard redesign + recurring automation)  
**Dependencies:** Phase 1 (settlement clarity), Phase 2 (notifications)  
**Success Metrics:**
- 25%+ of new signups create household
- 80%+ of household users have monthly recurring
- 30-40% higher lifetime value vs ad-hoc groups

**Deliverables:**
- Household mode Figma design
- HouseholdDashboard.tsx component
- Household wizard component
- Monthly recap email template
- Auto-create recurring logic (backend)
- Analytics: household retention tracking

---

### Feature #2: Multiple Settlement Rails (10-16 hours)

**Why This Matters:**
- Cash is still common for informal groups
- Users want flexibility (reduces lock-in friction)
- Competitors offer this (users expect it)

**Solution:**
1. **Settlement Method Selector**
   - Interac Direct (primary)
   - Manual Interac (current workaround)
   - Cash (informal tracking)
   - Bank Transfer (manual, less common)

2. **Cash Tracking UI**
   - Mark expense as "paid in cash"
   - Date + amount + optional notes
   - Settlement history showing all methods

3. **Settlement Confirmation**
   - Confirmation email for all methods
   - Proof of payment (Interac only, requires Phase 3.2 API integration)

**Effort:** 10-16 hours (backend + settlement redesign + tracking)  
**Dependencies:** Phase 1 (settlement redesign base)  
**Success Metrics:**
- 20%+ of settlements use cash tracking
- Reduce user drop-off from method lock-in

**Deliverables:**
- Settlement method selector component
- Cash settlement tracking UI
- Backend: multi-method settlement tracking
- Confirmation email templates
- Testing: e2e for each method

---

## Resource Allocation & Timeline

### Week 1-2 (Phase 1)
- **1 Engineer** (full-time) for settlement clarity + onboarding
- **1 Designer** (parallel) for Figma mocks + landing page
- **Time:** 4-5 days development
- **Output:** Settlement redesign, onboarding wizard, landing page live

### Week 3-6 (Phase 2)
- **2-3 Engineers** (8-10 days total)
- **Parallel tracks:**
  - Track A: Notifications (1 engineer, 5 days)
  - Track B: OCR + recurring audit (1-2 engineers, 5 days)
- **Output:** Notifications live, OCR improved, recurring audit complete

### Week 7-10 (Phase 3)
- **2 Engineers** (10-12 days total)
- **Parallel tracks:**
  - Track A: Households mode (1 engineer, 6 days)
  - Track B: Multi-settlement (1 engineer, 6 days)
- **Output:** Households live, settlement rails expanded

### Contingency
- **Buffer:** +20% for testing, bug fixes, scope clarifications
- **Risk:** If household mode is complex, move to Phase 4

---

## Key Decisions for Joe

### Decision 1: Approve Settlement + Onboarding as Week 1-2 Sprint?
**Options:**
- A) Yes, full scope (both features + landing page)
- B) Yes, settlement only (defer onboarding to Week 3)
- C) No, need more research first

**Recommendation:** **A) Full scope.** Settlement + onboarding are tightly coupled (settlement messaging assumes onboarding context). Landing page is low-risk parallel work. ROI is high (expected 15-25% activation improvement).

---

### Decision 2: Allocate 1 Engineer for 6-8 Weeks?
**Options:**
- A) Yes, dedicate 1 FTE to this roadmap
- B) Yes, but only 4 weeks (prioritize Phase 1)
- C) No, work on as side project

**Recommendation:** **A) Yes, full 6-8 weeks.** Even Us Up is a core project with passive income potential. Uninterrupted focus accelerates delivery. Cost-benefit is strong (estimated +$500-1000/mo growth).

---

### Decision 3: Household Mode Timing (Phase 2 vs Phase 3)?
**Options:**
- A) Phase 2 (after settlement clarity, before notifications)
- B) Phase 3 (after notifications + OCR improvements)
- C) Phase 4 (lower priority, later)

**Recommendation:** **B) Phase 3.** Households require solid foundation: settlement clarity (so couples trust settlements), notifications (so reminders work), recurring expenses verified. Phase 3 timing is optimal.

---

## Success Metrics (Full 90-Day View)

| Metric | Current | Target | Method | Owner |
|--------|---------|--------|--------|-------|
| **Activation** (signup → first expense) | 30% | 50%+ | Analytics | Product |
| **Settlement Rate** (users who settle) | 40% | 60%+ | Settlement events | Product |
| **Retention (30-day)** | 25% | 40%+ | Cohort analysis | Product |
| **Household Mode** (% of new signups) | 0% | 20%+ | Signup choice | Product |
| **Recurring Adoption** (% households) | 0% | 40%+ | Recurring events | Product |
| **Push Notification Opt-In** | 0% | 70%+ | Permission tracking | Growth |
| **Landing Page CTR** | 0% | 5%+ | Analytics | Growth |
| **Monthly Active Users** | TBD | +30% | User counts | Product |

---

## Risk Assessment & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Settlement clarity work expands in scope | Medium | Medium | Scope lock: settlement modal + dashboard card only; defer advanced features to Phase 3 |
| Onboarding wizard is too complex | Low | Medium | Start with 2-step (group + first expense); add member invite in Phase 2 |
| Landing page doesn't drive conversions | Medium | Low | Built-in A/B test framework; iterate copy quickly |
| Recurring expenses are already complete | Low | Low | Audit early (Week 3, before planning); adjust timeline |
| Household mode adoption is low | Low | Medium | Soft launch (not pushed to all users); market to couples segment first |
| Notifications cause user fatigue | Low | Medium | Conservative defaults (Low frequency); easy opt-out in settings |

---

## Deliverables Checklist

**Phase 1:**
- [ ] Settlement redesign Figma mocks (for review)
- [ ] Settlement.tsx + DashboardSettlementCard.tsx components
- [ ] Onboarding wizard Figma + component
- [ ] Sample group seeding logic
- [ ] Canada-first landing page live
- [ ] Analytics tracking for all flows

**Phase 2:**
- [ ] Notification service + Firebase setup
- [ ] Real-time notification backend + frontend
- [ ] Email template library (SendGrid)
- [ ] OCR audit report + gap list
- [ ] Inline receipt editing component
- [ ] OCR confidence badge component
- [ ] Recurring expenses audit / completion

**Phase 3:**
- [ ] Household dashboard design + components
- [ ] Household setup wizard
- [ ] Auto-create recurring logic
- [ ] Monthly recap email template
- [ ] Settlement method selector
- [ ] Cash tracking UI
- [ ] Multi-method settlement backend

---

## Next Steps

1. **Joe approval:** Confirm Phase 1 scope + engineer allocation
2. **Designer kickoff:** Start settlement + onboarding mocks (parallel to approval)
3. **Engineer kickoff:** Week 1 implementation (settlement first, then onboarding)
4. **Analytics setup:** Ensure tracking is live before Phase 1 launch
5. **Launch prep:** Landing page copy + design finalized by end of Week 2

---

## Appendix: Competitive Context

**Even Us Up Advantages:**
- Interac-native (settlement frictionless for Canadians)
- Household-focused (Splitwise is couples-agnostic)
- OCR-assisted (faster expense entry)
- Canada-first UX (CAD, no USD friction)

**Why This Roadmap Wins:**
- Fixes adoption bottleneck first (settlement clarity)
- Locks in high-value segment second (households)
- Differentiates vs Splitwise third (Canada positioning + recurring)
- Sequential dependencies minimized (parallel tracks where possible)

---

**Prepared by:** Alfred  
**Date:** 2026-03-27  
**Status:** Ready for approval + implementation
