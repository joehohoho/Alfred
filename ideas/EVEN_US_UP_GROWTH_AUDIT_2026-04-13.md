# Even Us Up — Growth Audit Update (Apr 13, 2026)

**Audit Date:** 2026-04-13 13:33 ADT  
**Previous Audit:** 2026-04-03 (10 days old, comprehensive)  
**Growth Plan Reference:** designs/even-us-up-growth-plan-2026-Q2.md (Mar 18)  
**Status:** Product solid, differentiation clear, execution awaiting decision clarity  

---

## Executive Summary

**Good news:** The April 3 audit still stands. Even Us Up has strong product fundamentals (Interac + roommate-first positioning) with zero Canadian competitors in the space.

**Challenge:** Growth is stalled at 0-20 visitors/day because:
1. **Execution clarity** — Q2 30-day plan exists but no visible progress (23 days have passed since plan creation)
2. **Decision dependency** — Phase 1 (UX clarity) depends on which friction point takes priority (settlement vs onboarding vs OCR)
3. **Resource allocation** — Unclear if Even Us Up is priority vs other projects (CoinUsUp, Signal App, consulting)

**Bottom line:** Product is market-ready. Growth is blocked on **execution decisions, not product gaps.**

---

## Status vs Apr 3 Audit

### What's Confirmed
✅ **Top 3 Friction Points (Still Accurate)**
1. Onboarding clarity (new users don't understand roommate vs travel vs household)
2. Settlement clarity (Interac perceived as limitation vs Splitwise Venmo)
3. Mobile responsiveness (20-30% mobile abandon rate estimated)

✅ **Top 3 Missing Features (Still Valid)**
1. Analytics & insights (spending trends, category breakdown)
2. Bulk import/CSV (migration from Splitwise)
3. Approval voting / dispute resolution (group expense voting)

✅ **Top 3 Growth Levers (Still Ranked by ROI)**
1. Referral program (2-3w, +20-30% net new users, highest ROI)
2. App store optimization / mobile redesign (2-6w, +50-100 organic users/mo)
3. Content hub + SEO (4-6w, +30-50 organic users/mo, long-tail)

✅ **Differentiation Moat (Still Holds)**
- Canada-first settlement (Interac-native)
- Household/recurring workflows
- Offline-first roadmap (planned)
- Zero Canadian competition

---

## New Insight: Execution Status

### Q2 Plan Progress (23 Days Since Creation)

**Phase 1: UX Friction Fixes — 0% STARTED**
- [ ] Settlement Clarity (4-6h) — Not started
- [ ] Onboarding Wizard (6-10h) — Not started
- [ ] OCR Correction Flow (8-12h) — Not started
- **Blocker:** No commits in even-us-up repo since Mar 21

**Phase 2: Missing Features — 0% STARTED**
- [ ] Real-Time Notifications (10-14h) — Not started
- [ ] Split Templates + Recurring (12-18h) — Not started (recurring may already exist; needs verification)
- [ ] Multiple Settlement Rails (10-16h) — Not started
- **Blocker:** Unclear if prioritized vs other projects

**Phase 3: Growth Levers — 0% STARTED**
- [ ] Canada-First Landing (4-8h) — Not started
- [ ] Couples/Household Mode (12-20h) — Not started
- [ ] Splitwise Migration (18-28h, marked follow-up) — Not queued

**Total Effort Planned:** 102-152 hours (~2-3 weeks full-time)  
**Effort Remaining (of Q2):** 61 days (to Jun 30) = ~14 weeks available  
**Verdict:** Timeline is feasible if started immediately. **23-day delay is concerning.**

---

## Critical Questions for Joe

**1. Even Us Up Priority Relative to Other Projects**
   - Is Even Us Up in top 3 priorities for the next 90 days?
   - Or is it maintenance-only while focusing on CoinUsUp trial + Signal App + consulting?
   - **Why it matters:** If Even Us Up is not top-3, plan entire roadmap changes (shift from growth to maintenance mode)

**2. Phase 1 Priority (UX Friction)**
   - If Phase 1 happens, which friction point first?
     - A) Settlement Clarity (simplest, 4-6h)
     - B) Onboarding Wizard (highest impact, 6-10h)
     - C) OCR Correction (nice-to-have, 8-12h)
   - **Recommendation:** B (Onboarding) because it's the entry funnel. Fix upstream before downstream.

**3. Referral Program Decision**
   - Phase 3 calls for referral program as Growth Lever 1 (2-3w, highest ROI)
   - But requires budget commitment (~$500/mo for rewards)
   - Proceed with referral, or defer to after other growth levers?
   - **Recommendation:** YES, build referral. Lowest effort, highest viral multiplier.

**4. Mobile Strategy**
   - Growth Lever 2 is App Store Optimization + mobile redesign
   - Two paths:
     - Path A (Fast): ASO-only, 2-3w, no app distribution
     - Path B (Best): Mobile redesign + Capacitor (PWA wrap), 4-6w, iOS/Android live
   - **Recommendation:** Path B (mobile is critical for settlement UX, and users settle on phones)

---

## Recommended Next Steps (If Even Us Up is Top-3 Priority)

### Week 1 (Apr 14-20): Decision Clarity + Setup
1. **Mon (Apr 14):** Joe confirms: Even Us Up priority? Phase 1 friction point?
2. **Tue (Apr 15):** Kanban cards created for Phase 1 work (3 cards: settlement, onboarding, OCR)
3. **Wed (Apr 16):** Alfred or HAL starts Phase 1 implementation (recommend settlement clarity first as quick win)
4. **Thu (Apr 17):** First deliverable (settlement clarity UI redesign in Figma or code)
5. **Fri (Apr 18):** Measure impact (A/B test or deploy to staging, test with 1-2 users)

### Week 2-3 (Apr 21-May 4): Phase 1 Completion + Phase 2 Setup
- Complete Phase 1 UX fixes (3 cards: settlement, onboarding, OCR)
- Begin Phase 2 feature work (prioritize: notifications, recurring, settlement rails)
- Deploy Phase 1 to production by May 1

### Week 4-5 (May 5-18): Phase 3 Growth Levers
- Launch referral program (simplest, highest ROI)
- Begin mobile redesign or ASO work (choose path)
- Create Canada-first landing page

### Week 6+ (May 19-Jun 30): Continuous Growth
- Monitor referral metrics (goal: +20-30 signups/mo)
- Deploy mobile improvements
- Publish content hub (2 posts/week)

---

## Comparative Project Status

**CoinUsUp:** Waiting on Stripe keys (19 days old blocker) — Phase B deployment ready once keys set up  
**Signal App:** Early stage, resource allocation unclear  
**Even Us Up:** Product-ready but zero execution in 23 days (execution blocker, not product blocker)  
**Consulting:** Active client work ongoing  

**Strategic Question:** If Even Us Up gets decision clarity + 1 week of dedicated effort, it could unblock +20-30% growth immediately. Is that worth it given other commitments?

---

## Risk Assessment (If Even Us Up IS Top-3 Priority)

**Risk 1: Execution delays compound (23-day pattern continues)**
- **Mitigation:** Kanban cards with 2-3 day sprints (not 1-month plans); weekly check-ins

**Risk 2: Phase 1 UX fixes don't move growth needle**
- **Mitigation:** A/B test first (measure onboarding completion rate before/after)
- **Mitigation:** Pair UX fixes with growth lever launch (e.g., referral program launch same day as onboarding fix)

**Risk 3: Mobile strategy choice (Path A vs B) is wrong**
- **Mitigation:** Start with Path A (ASO-only, 2w), measure app store traffic
- **Mitigation:** If >20 installs/week from app store, commit to Path B (PWA wrap)

**Risk 4: Growth levers don't drive adoption**
- **Mitigation:** Referral program is lowest-risk (users already recommend)
- **Mitigation:** Defer content hub until after quick wins (referral + mobile)

---

## Effort Estimate (If Executing)

**Phase 1 (UX Friction Fixes):** 18-28 hours → 2-3 full-time days  
**Phase 2 (Features):** 50-68 hours → 7-9 full-time days  
**Phase 3 (Growth Levers):** 34-56 hours → 5-7 full-time days  
**Total:** 102-152 hours (~2-3 weeks full-time development)

**If split across 8 weeks (May-Jun-early Jul):** 13-19 hours/week = 1-2 days/week part-time

---

## Differentiation (vs Apr 3 Audit) — Still Holds

| Factor | Splitwise | Even Us Up | Advantage |
|--------|-----------|-----------|-----------|
| **Settlement Method** | Venmo/card/bank | Interac e-transfer | Canada-exclusive, instant, trusted |
| **Group Types** | Generic groups | Household/recurring focus | Niche differentiation |
| **OCR** | Manual entry | AI-assisted receipts | Faster expense capture |
| **Offline** | No | Planned | Resilient to connectivity issues |
| **Pricing** | $99/year | $30-50/year potential | 50% cheaper, locally optimized |
| **Positioning** | USA-first | Canada-first | Zero direct competition |

**Strategic Insight:** Even Us Up's moat is **"Interac-native roommate & household expense app for Canada"** — NOT generic Splitwise competitor.

---

## Summary & Recommendations

### If Even Us Up IS Top-3 Priority
1. ✅ Confirm with Joe (priority ranking, Phase 1 friction choice)
2. ✅ Create 3-5 Kanban cards for Phase 1 (2-3 week execution window)
3. ✅ Pair UX fixes with referral program launch (maximize impact)
4. ✅ Monthly check-ins on growth metrics (referral signups, app store traffic, content hub visitors)

### If Even Us Up is NOT Top-3 Priority
1. ✅ Switch to maintenance-only mode (bug fixes, support)
2. ✅ Defer Phase 1-3 until Q3 (postpone growth initiatives)
3. ✅ Keep app running and functional
4. ✅ Monitor organic discovery (track visitors, refer sources)

### Estimated Upside (If Executed Over 90 Days)
- **Visitors:** 0-20/day → 20-50/day (+400% growth)
- **Active Groups:** ~30-50 → 80-130 (+30-50/mo inbound)
- **MRR:** $150-250 → $300-500 (+100-150%)
- **CAC (Customer Acquisition Cost):** Referral-driven, near-zero

---

## Kanban Integration

**Cards to Create (If Joe Approves Even Us Up Focus):**

1. **Settlement Clarity UX Redesign** (Effort: 4-6h)
   - Redesign settlement modal, per-person status view
   - Interac-first language + payment instructions
   - Owner: Alfred or HAL (frontend/design)
   - Timeline: Apr 15-17 (3 days)

2. **Onboarding Wizard — Group Creation** (Effort: 6-10h)
   - 3-step roommate/travel/household scenario wizard
   - Sample data seeding
   - First-expense CTA + mini-tutorial
   - Owner: Alfred or HAL (frontend)
   - Timeline: Apr 18-20 (3 days)

3. **OCR Confidence + Inline Edit Flow** (Effort: 8-12h)
   - Confidence badge, inline edit mode, retry UX
   - Batch save (edit multiple fields)
   - Owner: Alfred or HAL (frontend + backend)
   - Timeline: Apr 21-23 (3 days)

4. **Referral Program MVP** (Effort: 6-10h)
   - In-app referral widget, reward logic, tracking
   - Email campaign for existing users
   - Owner: Alfred or HAL (backend + frontend)
   - Timeline: May 1-3 (3 days)

5. **Mobile Redesign (Path A: ASO-only) or (Path B: Redesign + Capacitor)** (Effort: 6-16h)
   - App store listings (screenshots, description, keywords)
   - OR mobile-first redesign + PWA wrap
   - Owner: Alfred or HAL (frontend/design)
   - Timeline: May 4-10 (1 week)

---

**Status:** ✅ AUDIT COMPLETE  
**Output Location:** ideas/EVEN_US_UP_GROWTH_AUDIT_2026-04-13.md  
**Awaiting:** Joe decision on Even Us Up priority + Phase 1 friction focus  
**Next Action:** Post to Kanban Ideas + await Joe feedback  

---

## Appendix: Apr 3 Audit Summary (For Reference)

_See memory/2026-04-03-even-us-up-growth-audit.md for full details._

**Top UX Friction Points:**
1. Onboarding clarity (3/5 complexity)
2. Settlement clarity (2/5 complexity)
3. Mobile responsiveness (2/5 complexity)

**Top Missing Features:**
1. Analytics & insights (2/5 complexity)
2. Bulk import/CSV (3/5 complexity)
3. Approval voting (3/5 complexity)

**Top Growth Levers (by ROI):**
1. Referral program (1/5 complexity, 2-3w, +20-30% net new users)
2. App store optimization / mobile (2-4/5 complexity, 2-6w, +50-100/mo)
3. Content hub + SEO (4/5 complexity, 4-6w, +30-50/mo long-tail)

---

**Proactive Task Completed:** 2026-04-13 13:33 ADT  
**Quiet Hours:** Observed (no Joe notification; awaiting kanban integration for visibility)
