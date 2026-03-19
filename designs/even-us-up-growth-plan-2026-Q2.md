# Even Us Up Growth Plan — Q2 2026 (30-Day Sprint)

**Date Created:** 2026-03-18  
**Status:** Ready for review  
**Objective:** Address top UX friction + ship growth levers  

---

## Executive Summary

Even Us Up has three clear competitive advantages vs Splitwise:
1. **Canada-first settlement** (Interac-native + CAD UX)
2. **Household/recurring workflows** (couples, shared utilities, monthly budgets)
3. **OCR-assisted expense capture** (Splitwise still relies on manual entry)

This plan prioritizes fixes for maximum user retention (UX clarity) + growth velocity (Canada positioning + migration path).

---

## Phase 1: UX Friction Fixes (Days 1-12)

### 1.1: Settlement Clarity (Priority: HIGH, Effort: 4-6h)

**Problem:** Users don't understand when/how to settle. Payment flows unclear. Confusion between "group pays someone" vs "individual pays individual."

**Solution:**
- Clearer "Settle Up" CTA (prominent, contextual)
- Per-person net status view (who owes whom, exact amounts, CAD + settlement method)
- Interac-first language ("Send via Interac" instead of generic "Pay")
- Settlement confirmation + receipt tracking

**UX Deliverables:**
- [ ] Redesigned settlement modal (Figma)
- [ ] Per-person settlement status component (React)
- [ ] Interac payment instructions UI
- [ ] Settlement history + receipt tracking

**Acceptance Criteria:**
- New users understand how to settle after first group expense
- Settlement modal visible from dashboard without scrolling
- Interac method is default option (not buried in dropdown)

**Estimate:** 4-6 hours (1 day)

---

### 1.2: Onboarding to First Expense (Priority: HIGH, Effort: 6-10h)

**Problem:** Gap between signup and first expense is too long. Users create group, then get stuck on "now what?"

**Solution:**
- Guided first group creation (wizard, 3 steps)
- Sample data (pre-populated group + test expense)
- "Add first expense" CTA + mini-tutorial
- Smart defaults (common categories, split evenly)

**UX Deliverables:**
- [ ] Group creation wizard (3-step modal + help text)
- [ ] Sample group + expense (seeded on signup)
- [ ] First-expense tutorial + inline help
- [ ] Smart category suggestions (ML-lite: common household splits)

**Acceptance Criteria:**
- First-time users add an expense within 2 minutes of signup
- Tutorial skippable but recommended
- Sample data deletable (no friction)

**Estimate:** 6-10 hours (1-2 days)

---

### 1.3: OCR Receipt Correction Flow (Priority: MEDIUM, Effort: 8-12h)

**Problem:** OCR confidence is low. Users upload receipt, OCR misreads amounts/items, manual correction is painful (multiple clicks, modal hell).

**Solution:**
- OCR confidence indicator (show when low, highlight uncertain fields)
- Inline edit before save (edit fields directly in preview, not in modal)
- Retry UI (re-scan if OCR fails, try different angle)
- Batch corrections (edit multiple fields, one save)

**UX Deliverables:**
- [ ] OCR confidence badge (high/medium/low visual indicator)
- [ ] Inline edit mode on OCR preview (click field → edit in place)
- [ ] Retry + reprocess UX
- [ ] Batch save (edit multiple fields, one API call)

**Acceptance Criteria:**
- Users can correct OCR receipt in <30 seconds
- No modal stacking/navigation hell
- Retry works on same upload (no re-upload required)

**Estimate:** 8-12 hours (2 days)

---

## Phase 2: Missing Features (Days 13-28)

### 2.1: Real-Time Notifications (Priority: MEDIUM, Effort: 10-14h)

**Problem:** Users don't know when to settle. Inactive members forget about group. No reminders.

**Solution:**
- Push notifications + email when due reminders trigger
- Nudges for inactive members (e.g., "Alice hasn't paid in 5 days")
- Web push + mobile support
- Frequency controls (user preference)

**Deliverables:**
- [ ] Notification service (Supabase functions or external service: SendGrid, Firebase Cloud Messaging)
- [ ] Notification types: due reminders, inactive nudges, settlement confirmations
- [ ] User preference UI (frequency, channels)
- [ ] Web push certificates

**Acceptance Criteria:**
- Push notification sent 7 days before settlement due
- Email fallback if push unavailable
- User can disable per notification type

**Estimate:** 10-14 hours (2-3 days)

---

### 2.2: Split Templates + Recurring Expenses (Priority: MEDIUM, Effort: 12-18h)

**Problem:** Rent, utilities, groceries repeat every month. Users manually add same expense repeatedly.

**Solution:**
- Preset templates (rent, utilities, groceries, etc.)
- Recurring expense creation (weekly, bi-weekly, monthly, custom)
- One-click repeat + auto-settle options
- Import from previous months

**Deliverables:**
- [ ] Template library UI (design + API)
- [ ] Recurring expense scheduler (Cron backend + DB schema)
- [ ] Auto-create + auto-settle logic (Supabase functions)
- [ ] Edit/skip/delete recurring instance UI

**Acceptance Criteria:**
- User creates recurring rent split in 30 seconds
- Rent auto-creates on first day of month
- Recurring splits show in calendar view

**Estimate:** 12-18 hours (3 days)

---

### 2.3: Multiple Settlement Rails (Priority: MEDIUM, Effort: 10-16h)

**Problem:** Only Interac available. Users want cash tracking, bank transfer, PayPal, etc.

**Solution:**
- Interac Direct (existing, but improve UX)
- Cash payment tracking (settle as "paid in cash")
- Manual bank transfer (track as settled, verify later)
- Settlement confirmation (receipt + timestamp)

**Deliverables:**
- [ ] Settlement method selector (Interac/Cash/Bank/Manual)
- [ ] Cash tracking UI (date + amount + confirmation)
- [ ] Settlement history + receipts
- [ ] Webhook to track Interac confirmation (optional, advanced)

**Acceptance Criteria:**
- User can mark settle as "cash paid" without Interac
- Settlement method remembered per group
- History shows all settlement types

**Estimate:** 10-16 hours (2-3 days)

---

## Phase 3: Growth Levers (Days 20-30)

### 3.1: Canada-First Landing Page (Priority: HIGH, Effort: 4-8h)

**Problem:** Marketing doesn't differentiate from Splitwise. No clear value prop.

**Solution:**
- Landing page emphasizing Interac-native settlement + CAD focus
- Comparison chart (vs Splitwise)
- Use case stories (couples, roommates, households)
- CTAs for Splitwise users

**Deliverables:**
- [ ] Landing page design (Figma)
- [ ] Copy emphasizing Canada + Interac
- [ ] Comparison table (vs Splitwise)
- [ ] Testimonials/case studies

**Acceptance Criteria:**
- Mobile responsive
- Fast (Lighthouse >90)
- Clear "Made for Canada" messaging

**Estimate:** 4-8 hours (1 day, with copywriting)

---

### 3.2: Couples/Household Mode (Priority: MEDIUM, Effort: 12-20h)

**Problem:** Even Us Up is generic. Splitwise dominates couples/households with shared budgets.

**Solution:**
- Household mode (2-person, persistent, monthly recap)
- Shared budget tracking (total spend vs budget)
- Recurring monthly splits auto-apply
- Household dashboard (partner activity, spending trends)

**Deliverables:**
- [ ] Household creation flow (invite partner, settings)
- [ ] Persistent household dashboard (vs ad-hoc groups)
- [ ] Monthly budget UI
- [ ] Recurring splits auto-create logic

**Acceptance Criteria:**
- Couple creates household, recurring rent split auto-creates monthly
- Budget tracking visible on dashboard
- Mobile optimized

**Estimate:** 12-20 hours (3-4 days)

---

### 3.3: Splitwise Migration Importer (Priority: MEDIUM, Effort: 18-28h, **FOLLOW-UP PHASE**)

**Problem:** Switching from Splitwise is friction. No data import path.

**Solution:**
- Splitwise API integration (read-only export)
- CSV import fallback
- Bulk group + expense import
- Switch campaign (email existing groups)

**Deliverables:**
- [ ] Splitwise API client (auth + group/expense fetch)
- [ ] CSV parser (standardized format)
- [ ] Bulk import UI (preview + confirm)
- [ ] Switch campaign email template

**Acceptance Criteria:**
- Import <50 expenses in 5 clicks
- Groups + expenses mapped correctly
- Duplicate detection (don't import same group twice)

**Estimate:** 18-28 hours (4-5 days, includes API integration testing)

---

## 📅 Recommended Implementation Order (30 Days)

### Week 1: UX Foundations (Days 1-5)
1. **Day 1** — Settlement Clarity (4-6h)
2. **Days 2-3** — Onboarding Wizard (6-10h)
3. **Day 4** — OCR Improvements (8-12h)
4. **Day 5** — Internal testing + bug fixes

**Why First:** Max user retention. Fixes reduce churn immediately.

---

### Week 2-3: Feature Depth (Days 6-20)
5. **Days 6-8** — Notifications (10-14h)
6. **Days 9-12** — Recurring Expenses + Templates (12-18h)
7. **Days 13-15** — Multiple Settlement Rails (10-16h)
8. **Days 16-20** — Internal testing + stabilization

**Why Second:** Features reduce friction on key workflows (recurring rent, notifications). Prepare groundwork for growth.

---

### Week 4: Growth Acceleration (Days 21-30)
9. **Days 21-22** — Canada-First Landing (4-8h)
10. **Days 23-27** — Couples/Household Mode (12-20h)
11. **Days 28-30** — Deploy landing + monitor, plan Splitwise migration beta

**Why Third:** Growth levers only work if UX + features are solid. Landing page + household mode positioning.

---

## 🚀 Post-30-Day Roadmap (Q2 Continued)

**Phase 4: Growth Campaigns**
- Splitwise migration importer (18-28h, mid-April)
- Switch campaign + email funnel (early May)
- Canada-focused ads/SEO (May-June)

**Phase 5: Monetization Enhancements** (if applicable)
- Advanced household features (shared budgets, savings goals)
- Premium tier (custom templates, expense insights)

---

## 📊 Success Metrics

**UX Fixes (Phase 1):**
- Onboarding time: <3 min (was ~8 min)
- Settlement clarity: +40% first-time settles (survey post-launch)
- OCR correction time: <30 sec (was 2-3 min)

**Feature Adoption (Phase 2):**
- Recurring expenses used by 30% of households
- Notification engagement: >60% open rate
- Settlement diversity: <10% cash-only (rest Interac)

**Growth (Phase 3):**
- Landing page conversion: >3% (traffic → signup)
- Household creation: >50% of new couples
- Splitwise import pipeline: >100 users/week (post-launch)

---

## 🎯 Risk Mitigation

**Risk: Notifications cause opt-out overload**  
*Mitigation:* Default frequency conservative (7 days before due). A/B test reduced frequency after week 1.

**Risk: Recurring expenses create billing support tickets**  
*Mitigation:* Start with monthly-only (skip weekly/bi-weekly). Add complexity if demand.

**Risk: Household mode cannicalizes group mode**  
*Mitigation:* Household mode is separate group type. Existing groups unchanged. No forced migration.

**Risk: Landing page doesn't drive traffic**  
*Mitigation:* Start with organic/SEO. Don't invest in ads until proven 3%+ conversion in A/B test.

---

## 🔧 Technical Notes

**Settlement Clarity:** Backend already supports Interac. UI lift only.  
**Onboarding:** Requires sample data seeding. Add migration script.  
**OCR Confidence:** Vision API likely needed (Google Vision or Claude Vision) for confidence scoring. Evaluate cost/accuracy.  
**Notifications:** Requires email service (SendGrid, Resend) + push service (Firebase or custom). New infrastructure.  
**Recurring:** Requires scheduler (pg-boss, Bull, or Supabase functions). Cron-based or event-driven.  
**Household Mode:** DB schema change (group types: ad-hoc vs household). Migration safe.  
**Landing:** Static site or separate Next.js route. Marketing copy priority.  

---

## Budget Estimate

**New Infrastructure:**
- Email service (SendGrid): ~$20/mo (if not already)
- Push notifications (Firebase): Free tier sufficient for first 100k users
- OCR confidence (Vision API): ~$50/mo (first 1M requests included)

**Development Time (Internal):**
- Phase 1 (UX Fixes): 18-28h → 2-3 days
- Phase 2 (Features): 50-68h → 7-9 days
- Phase 3 (Growth): 34-56h → 5-7 days
- **Total: 102-152 hours (~2-3 weeks of full-time dev)**

**If outsourced:** 1.5-2x the hours (18-24k budget estimate)

---

## Next Steps

1. **Joe:** Review plan + prioritize (settlement clarity vs onboarding first?)
2. **Joe:** Confirm which features are MVP vs nice-to-have
3. **Joe:** Decide: in-house build or outsource Phase 1?
4. **Alfred:** Break Phase 1 into Kanban cards + assign sprints
5. **Alfred (or HAL):** Start implementation after Joe approval

---

**Kanban Card:** idea_1773871326687_04f1dd9b  
**Status:** Plan ready for review  
**Waiting On:** Joe's confirmation + prioritization feedback

