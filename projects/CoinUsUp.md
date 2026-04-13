# CoinUsUp

**Status:** Pre-revenue SaaS (trial feature code-complete, awaiting Stripe config)  
**Priority:** 🔴 URGENT — trial unblock is blocking all revenue generation

---

## 📊 Quick Facts

- **Business Model:** Freemium + recurring donations tier
- **Target:** Nonprofit organizations (initially)
- **Current ARR:** $0 (pre-revenue)
- **Trial Status:** Code 100% complete; Stripe configuration 0% (Joe's task)
- **Blocker Age:** 19 days waiting for Stripe price configuration

---

## 🎯 Key Milestones

### Phase 1: Unblock Trial (CURRENT - BLOCKED)
- **Objective:** Enable 14-day free trial on Basic/Pro tiers
- **What's done:** Code complete (database migration, Stripe checkout, webhook handler, frontend hooks)
- **What's needed:** Joe configures 12 Stripe product prices with trial_period_days=14
- **Estimated time:** 5 minutes (Stripe dashboard task)
- **Blocker:** [[Stripe Config Blocker]]
- **Related:** [[task_1773156748695_23b9e471]] (kanban card)

### Phase 2: Optimize Onboarding (PENDING)
- **Objective:** Fix conversion friction (onboarding → trial signup)
- **Key insights:** Free→trial funnel is leaky; users don't understand plan differences
- **Work:** Auto-load sample data, improve plan naming clarity
- **Estimated:** 1-2 weeks

### Phase 3: Content Hub (FUTURE)
- **Objective:** Add knowledge base + best practices library
- **Purpose:** Reduce support load; increase feature adoption
- **Estimated:** 4-6 weeks

---

## 📈 Growth Audit Results (2026-04-13)

**Key Findings:**
1. **Onboarding Friction** — Free→trial conversion is low (estimated <2%)
   - Root cause: Plan differences unclear; no sample data preview
   - Fix: Auto-load sample data in trial signup
   - Impact: Estimated +40% conversion if fixed
   
2. **Plan Naming Mismatch** — "Nonprofit+" tier confuses users
   - Root cause: Internal naming doesn't match user expectations
   - Fix: Rename to "Pro" + update marketing
   - Impact: Estimated +15% clarity, +5% conversion

3. **Feature Discoverability** — Users find ~20% of features
   - Root cause: No onboarding tour; features hidden in menus
   - Fix: Add guided tour + feature cards in dashboard
   - Impact: Estimated +30% feature adoption → +10% retention

4. **Missing Recurring Donation Guidance** — Users unsure how to set up
   - Root cause: No context or documentation at setup
   - Fix: Add contextual help + documentation
   - Impact: Estimated +20% recurring adoption

---

## 🔴 Current Blockers

### 1. Stripe Config (Age: 19 days) 
**Blocker:** [[Stripe Config Blocker]]
- Needs 12 Stripe product prices configured with trial_period_days=14
- Notification sent: Multiple (latest 2026-04-09)
- Impact: Blocks trial → blocks revenue
- **Next Action:** Joe configures prices (5 min), then deploy immediately

### 2. Onboarding Improvements (Queued, not blocked)
- Can start once trial is live
- Highest ROI growth work (estimated +40% conversion)

---

## 📋 Related Cards

| Card ID | Title | Status | Owner |
|---------|-------|--------|-------|
| task_1773156748695_23b9e471 | Implement 14-day free trial | 🚫 blocked | unassigned |
| goal_trial_phase2 | Optimize onboarding (queued) | 📋 todo | unassigned |
| goal_content_hub | Content hub (future) | 📋 backlog | unassigned |

---

## 🔗 Related Links

**External Context:**
- [[Even Us Up]] (sibling app, similar user base)
- [[Signal App]] (trading signals; separate product)
- [[Passive Income Strategy]] (revenue target context)

**Internal Decisions:**
- [[Stripe Config Blocker]] (blocking decision)
- [[Trial Feature Implementation]] (technical details)

**Memory References:**
- Daily audit: [[memory/2026-04-13]] (growth audit findings)
- Previous audit: [[memory/2026-04-10]] (marketing strategy)

---

## 💡 Passive Income Potential

**Current trajectory:**
- Trial launch → estimated 50-100 signups/month
- Expected conversion (trial→paid): 3-5%
- Projected MRR: $200-500 (month 2-3)
- Projected ARR: $2,400-6,000 (year 1)

**Growth opportunities:**
- Content hub (estimated +20% retention)
- Marketing partnerships (nonprofits directories)
- Feature expansion (integrations, advanced analytics)

---

**Last Updated:** 2026-04-13 14:08 ADT (Alfred)
