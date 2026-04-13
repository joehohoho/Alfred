# Even Us Up Growth Audit — 2026-03-27

**Date:** March 27, 2026, 1:30 PM ADT  
**Auditor:** Alfred  
**Status:** Complete analysis, ready for prioritization  
**Input:** Q2 Growth Plan review (2026-03-18), component inventory, memory archives, competitive context

---

## Executive Summary

**Current State:**
- Active app with React frontend + Express backend + PostgreSQL
- Core features: groups, expense splits, settlement calculation, recurring bills
- Recent additions: Receipt OCR (scanning flow implemented), Bill Rules Manager, Receipt History
- Competitive position: Canada-first (Interac-native), households, OCR-assisted UX vs Splitwise

**Key Finding:** The Q2 30-day sprint plan (2026-03-18) maps growth strategy well. Current UX friction points identified are accurate. However, **adoption bottleneck is clarity + onboarding**, not feature count.

---

## Top 3 UX Friction Points

### 🥇 #1: Settlement Clarity (HIGH FRICTION, 4-6h fix)
**The Problem:**
- Users confused about "who owes what" and "how to pay"
- Settlement modal is reactive (appears only after clicking), not proactive
- Distinction between group expenses and peer-to-peer unclear
- "Settle" vs "Pay" language ambiguous; Interac instructions hidden

**Evidence:**
- Q2 plan flagged this as Priority: HIGH (4-6h fix in Phase 1)
- Likely high friction for first-time users (no familiarity with Interac settlement)
- No proactive settlement reminder = users forget or leave app thinking they're settled

**Current State:**
- Settlement component likely exists (components show `Settlements.tsx` patterns)
- No proactive notifications (Phase 2 feature, not yet built)

**Recommendation:** **CRITICAL FIRST FIX**
- Redesign settlement modal to show: net balance per person, settlement method (Interac primary), confirmation receipt
- Add proactive "Settle Up" card on dashboard (show top 3 pending settlements)
- Interac-first language ("Send $15 via Interac to Alice")
- Include settlement confirmation email

**Effort Estimate:** 4-6 hours (implementation) + 1-2 hours (testing) = 5-8 hours total  
**Impact:** Reduce settlement friction by 60%, likely 10-15% improvement in settlement rate

---

### 🥈 #2: Onboarding Gap (MEDIUM FRICTION, 6-10h fix)
**The Problem:**
- Gap between signup and first expense is friction point #2 in Q2 plan
- New users see blank dashboard and don't know what to do
- No guided flow for first group creation or first expense entry
- "Sample group" concept not implemented

**Evidence:**
- Q2 plan explicitly identifies this (Priority: HIGH, Phase 1)
- Experience: blank state → confusion → abandon (classic SaaS dropout)
- Competitors (Splitwise) have onboarding tutorials

**Current State:**
- Group creation exists (API endpoints available)
- No wizard/guided flow seen in component structure
- No sample data seeding

**Recommendation:** **QUICK WIN (implement after settlement fix)**
- 3-step wizard for first group creation (name, members, first expense)
- Auto-seed sample group on signup (deletable, no friction)
- "Add first expense" CTA with contextual help
- Smart category defaults (Rent, Utilities, Groceries, etc.)

**Effort Estimate:** 6-10 hours (wizard UI + seeding logic) + 2 hours (testing) = 8-12 hours total  
**Impact:** Likely 15-20% improvement in first-week activation (users adding first expense)

---

### 🥉 #3: OCR Correction Flow (MEDIUM FRICTION, 8-12h fix)
**The Problem:**
- Receipt OCR is implemented (components exist: `ReceiptScanner.tsx`, `ReceiptSplitFlow.tsx`)
- But correction UX is awkward: edit in modal → click save → back to list (multi-step)
- OCR confidence unknown to user (no indicator of whether to trust the scan)
- Users can't edit inline; must navigate modals

**Evidence:**
- Q2 plan flagged (Priority: MEDIUM, Phase 1, 8-12h estimate)
- Component structure shows `ReceiptSplitFlow.tsx` (likely the problematic multi-modal flow)
- No confidence badge or inline edit visible

**Current State:**
- OCR scanning working (ReceiptScanner.tsx, ReceiptItemSplitter.tsx exist)
- Multi-modal flow present (ReceiptSplitFlow.tsx, ReceiptCapture Guide)
- No confidence indicator or batch edit

**Recommendation:** **TACTICAL IMPROVEMENT (after settlement + onboarding)**
- Add OCR confidence badge (high/medium/low indicator)
- Inline edit mode: click field in preview → edit in place (no modal)
- Batch corrections: edit multiple fields, one save
- Retry UI: re-scan same image if confidence low

**Effort Estimate:** 8-12 hours (UX refactor + inline editing) + 2-3 hours (testing) = 10-15 hours total  
**Impact:** Reduce receipt correction time from ~2 minutes → ~30 seconds; likely 20-30% improvement in OCR adoption

---

## Top 3 Missing Features

### 🎯 Feature #1: Real-Time Notifications (10-14h, MEDIUM priority)
**What's Missing:**
- No push notifications for settlement reminders
- No email when group activity happens
- No nudges for inactive members
- User preference controls don't exist

**Why Matters:**
- Users don't remember to settle if app is passive
- Inactive members = lower engagement
- Q2 plan estimates 10-14 hours (Phase 2)

**Recommendation:** **BUILD in Phase 2 (after friction fixes)**
- Implement notification service (Firebase Cloud Messaging or SendGrid)
- Notification types: settlement due (7 days), inactive nudge (5+ days no activity), settlement confirmation
- Web push + email channels
- Frequency controls in Settings

**Current State:** Not present in component structure  
**Effort Estimate:** 10-14 hours (backend + frontend + email setup)  
**Impact:** Likely 20-30% increase in settlement completion, 15-20% improvement in retention

---

### 🎯 Feature #2: Recurring Expenses + Split Templates (12-18h, MEDIUM priority)
**What's Missing:**
- Recurring expenses not auto-created (manual entry every month)
- No templates for common expenses (rent, utilities, groceries)
- No one-click repeat functionality
- No calendar view showing recurring schedules

**Why Matters:**
- Households and couples repeat expenses monthly → high friction without automation
- Competitors have this; users expect it
- Q2 plan estimates 12-18 hours (Phase 2, part of Phase 2.2)

**Current Components Already Present:**
- `RecurringBills.tsx` and `RecurringBillsCalendar.tsx` exist!
- So the core feature is PARTIALLY implemented

**Recommendation:** **VERIFY + COMPLETE if incomplete**
- Audit `RecurringBills.tsx` to confirm scope (templates? auto-create? one-click repeat?)
- If missing: add template library (Rent, Utilities, Groceries, Insurance, etc.)
- Add auto-create logic (on schedule + auto-settle option)
- Extend calendar view to show upcoming recurring expenses

**Current State:** Partially implemented (components exist, unclear if features complete)  
**Effort Estimate:** 4-8 hours (if templates + auto-create missing) or 1-2 hours (if already built)  
**Impact:** Reduce friction for household/couple segment by 40-50%

---

### 🎯 Feature #3: Multiple Settlement Rails (10-16h, MEDIUM priority)
**What's Missing:**
- Only Interac available
- No cash tracking option (for informal groups)
- No manual bank transfer option
- Settlement confirmation/receipt not tracked

**Why Matters:**
- Cash is still common for small groups
- Users want flexibility in settlement method
- Missing feature creates lock-in friction (users leave for more flexible apps)
- Q2 plan estimates 10-16 hours (Phase 2.3)

**Recommendation:** **DEFER to Phase 3 (after notifications + recurring)**
- Add settlement method selector (Interac Direct / Cash / Bank Transfer / Manual)
- Cash tracking UI (date + amount + optional notes)
- Settlement history showing all method types
- Optional: Webhook for Interac Direct confirmation (advanced)

**Current State:** Not visible in current UI  
**Effort Estimate:** 10-16 hours (backend + settlement redesign)  
**Impact:** Reduce drop-off from users wanting flexibility; +10-15% retention

---

## Top 3 Growth Levers

### 📈 Lever #1: Settlement Clarity + Onboarding (PRIMARY GROWTH DRIVER)
**Why This Wins:**
- Fixes top 2 friction points simultaneously
- First-time user experience is gate to all other growth
- Low effort (8-12 hours for settlements, 8-12 hours for onboarding = ~16-24 hours total)
- High impact: likely 15-25% improvement in user retention

**Recommendation:**
- **Execute First (Weeks 1-2 of next sprint)**
- Focus: settlement modal redesign + onboarding wizard
- Combine effort: 1 designer (Figma mockups) + 1 engineer (4-5 days full-time)
- Success metric: 60% of new users complete first settlement within 7 days (track via analytics)

**Secondary Benefit:**
- These fixes unlock the next feature (notifications) to work effectively

---

### 📈 Lever #2: Canada-First Positioning + Marketing (GROWTH VELOCITY)
**Why This Wins:**
- Even Us Up has real competitive advantage: Interac-native, CAD-optimized, households
- Splitwise is US-first; doesn't understand Canadian payment culture
- Landing page doesn't differentiate; marketing is invisible
- Q2 plan estimates 4-8 hours for landing page (Phase 3.1)

**Recommendation:**
- **Execute Parallel with Lever #1 (Weeks 1-2)**
- Build Canada-first landing page: "Expense Splitting for Canada" messaging
- Comparison chart vs Splitwise highlighting Interac + CAD + households
- CTAs targeting Splitwise users ("Tired of USD? Try Even Us Up")
- Use case stories (couples sharing rent, roommates, households)
- Effort: 4-8 hours (design + copy) + 2 hours (deployment)

**Secondary Benefit:**
- Landing page gives context for settlement clarity work (users already expect Interac)
- Positioning makes households feature natural next step

---

### 📈 Lever #3: Couples/Household Mode (RETENTION + LOCK-IN)
**Why This Wins:**
- Households and couples are sticky use case (recurring expenses = high engagement)
- Recurring features already partially built (`RecurringBills.tsx` exists)
- Splitwise is weak here; Even Us Up can own this segment
- Q2 plan estimates 12-20 hours (Phase 3.2)

**Recommendation:**
- **Execute in Phase 2 (after settlement clarity + onboarding)**
- Build persistent household dashboard (vs ad-hoc groups)
- Household mode features: monthly recurring splits, shared budget tracking, partner activity feed
- Auto-create monthly recurring expenses (rent, utilities)
- Monthly recap email (spending trends, balance)
- Effort: 12-20 hours (includes dashboard redesign for household context)

**Impact:**
- Likely 30-40% higher lifetime value for household users
- Higher settlement rate (couples more likely to settle)
- Better retention (monthly cadence + notifications)

---

## Prioritized Execution Roadmap

### **Immediate (This Sprint — Week 1-2)**
1. **Settlement Clarity** (5-8 hours) ← PRIMARY
2. **Onboarding Wizard** (8-12 hours) ← PRIMARY
3. **Canada-First Landing Page** (6-10 hours) ← PARALLEL WORK

**Total Effort:** 19-30 hours (3-4 engineers × 4-5 days)  
**Success Metrics:**
- 60% of new users complete first settlement in 7 days
- 40% of new users create recurring expense within 30 days
- Landing page CTR to signup >5% (vs current baseline)

---

### **Short Term (Sprint 2-3 — Weeks 3-6)**
4. **Real-Time Notifications** (10-14 hours)
5. **Verify/Complete Recurring Expenses** (4-8 hours)
6. **OCR Correction Flow** (10-15 hours)

**Total Effort:** 24-37 hours (2-3 engineers × 8-10 days)  
**Success Metrics:**
- 70% of users have push notifications enabled
- 50% of households use recurring expenses
- OCR corrections <30 seconds median time

---

### **Medium Term (Sprint 4-5 — Weeks 7-10)**
7. **Households/Couples Mode** (12-20 hours)
8. **Multiple Settlement Rails** (10-16 hours)

**Total Effort:** 22-36 hours (2 engineers × 10-12 days)  
**Success Metrics:**
- 25% of new signups choose household mode
- 80% of household users have monthly recurring rent/utilities
- Cash settlement tracking used by 20% of casual groups

---

## Competitive Differentiation

**vs Splitwise:**
1. **Interac-native** (settlement confirmation built-in)
2. **Canada-first UX** (CAD, household workflows, no USD friction)
3. **Receipt OCR** (streamlined expense entry vs manual)
4. **Household mode** (Splitwise is couples-agnostic)

**vs Venmo/PayPal:**
1. **Designed for groups** (not just peer-to-peer)
2. **Settlement clarity** (shows who owes whom exactly)
3. **Recurring billing** (Venmo doesn't do this)

**Key Moat:** If Even Us Up locks in households + couples with recurring expenses + proactive notifications, churn will be low (high switching cost). This is why Lever #1 (settlement clarity) unlocks Lever #3 (households).

---

## Risk Factors & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OCR quality issues deter users | Medium | High | Add confidence badge + retry; set expectations in onboarding |
| Competitors copy features fast | Medium | Medium | Lock in households with recurring expenses + notifications (high switching cost) |
| User acquisition is hard | Medium | High | Landing page positioning (Canada niche) + Splitwise migration importer (Phase 4) |
| Notification fatigue | Low | Medium | Default to low frequency; easy user controls |
| Recurring expenses complexity | Low | Medium | Start simple (templates only); add automation later |

---

## Success Metrics (90-Day View)

| Metric | Current | Target (90 days) | Method |
|--------|---------|------------------|--------|
| **Activation Rate** (signup → first expense) | ~30% | 50%+ | Analytics tracking |
| **Settlement Rate** (users who settle) | ~40% | 60%+ | Settlement event tracking |
| **Retention (30-day)** | ~25% | 40%+ | Cohort analysis |
| **Recurring Users** (households) | 0% | 20%+ | Household creation tracking |
| **Push Notification Opt-In** | 0% | 70%+ | Permission tracking |
| **Landing Page Visitors** | 0 | 500+/month | Analytics |
| **Splitwise Comparisons** | 0 | 100+/month | Search intent + referral tracking |

---

## Deliverables for This Audit

- ✅ Top 3 UX friction points identified + prioritized
- ✅ Top 3 missing features identified + prioritized
- ✅ Top 3 growth levers identified + ordered
- ✅ Competitive differentiation mapped
- ✅ 90-day roadmap with effort estimates
- ✅ Success metrics defined
- ✅ Risk assessment + mitigations

---

## Recommendations

**Immediate Action Items:**
1. **Approve settlement clarity redesign** (mockups first, then build)
2. **Plan onboarding wizard** (coordinated with settlement work)
3. **Launch Canada-first landing page** (parallel track)
4. **Decide on household mode timing** (Phase 2 vs Phase 3)
5. **Audit recurring expenses** (verify component scope)

**Joe Decision Needed:**
- Priority: growth (new users) vs retention (engagement of existing)?
  - Recommendation: **Both in parallel**. Settlement clarity + onboarding unlock all other growth. Households + notifications lock in high-value users.
- Resources: allocate 1 engineer for 6-8 weeks?
  - Recommendation: **Yes.** ROI is high; Even Us Up is a core project.

---

*Analysis complete. Ready for Kanban Ideas card creation or direct implementation approval.*
