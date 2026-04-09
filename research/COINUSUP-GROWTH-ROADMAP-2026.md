# CoinUsUp Growth & Activation Roadmap — 2026 Q2

**Status:** Research-in-Progress (Ready for Joe Review when Trial launches)
**Last Updated:** 2026-04-09 15:45 ADT
**Owner:** Alfred
**Next Step:** Present to Joe → Prioritize quick wins → Implement during trial launch window

---

## Executive Summary

CoinUsUp is the **best near-term passive-income candidate** in the portfolio. The 14-day free trial is code-complete and awaiting approval. This roadmap identifies:

1. **Quick wins** (1-3 days) to maximize trial conversion
2. **Activation bottlenecks** blocking user retention
3. **Growth levers** post-trial (content, partnerships, monetization)
4. **Prioritization framework** for Joe's decision-making

**Estimated impact:** 5-15x conversion lift from addressing top 3 activation blockers.

---

## Current State Analysis

### Product Readiness ✅
- ✅ Core platform: Stable (group/campaign/event/volunteer management)
- ✅ Free trial: 100% implemented (14 days, Basic/Pro tiers)
- ✅ Monetization: Stripe subscriptions configured
- ✅ Onboarding: Tutorial modal exists (5-step walkthrough)

**What's missing:**
- ❌ Smart onboarding (value prop clarity)
- ❌ Activation metrics (aha-moment tracking)
- ❌ Growth loops (viral/network effects)
- ❌ Market clarity (messaging, positioning, SEO)

### Current Adoption
- **Estimated DAU:** 0-5 active users (internal/beta only)
- **Estimated trial conversion:** Unknown (no historical data)
- **Biggest blocker:** User acquisition + activation (not engineering)

### Trial Launch Timing
- **Approval:** Awaiting Joe comment
- **Deployment:** 4-5 hours after approval (staging + prod)
- **Monitoring:** 7 days post-launch
- **Launch window:** Week of Apr 9-15, 2026

---

## Phase 1: Pre-Trial Launch (This Week — Apr 9-13)

**Goal:** Prepare for maximum trial conversion when trial goes live.

### 1.1 Quick Win: Aha-Moment UX Clarity (2-3 hours)

**Current state:** The onboarding tutorial is functional but doesn't clearly show the value prop.

**Idea:** Add a pre-tutorial "value frame" that answers:
- "What is CoinUsUp for?" (clear, non-technical)
- "What can I do in 14 days?" (trial benefits)
- "Who should use this?" (target personas)

**Implementation:**
- Add a 30-second "Value Prop" intro screen before the 5-step tutorial
- Show real-world examples: "Sports team fundraising," "School club money management," "Nonprofit volunteer tracking"
- Include a quick-start CTA: "Create your first group in 2 minutes"

**Expected lift:** 10-20% improvement in tutorial completion rate

**Files to modify:**
- `src/components/onboarding/GetStartedModal.tsx` → Add intro step
- `src/contexts/GetStartedModalContext.tsx` → Update step count

**Effort:** 2-3 hours (Alfred or HAL)

---

### 1.2 Quick Win: First-Time User Flow Tracking (1-2 hours)

**Current state:** We don't know why users drop off.

**Idea:** Instrument key steps with analytics:
- ✓ Tutorial opened
- ✓ Completed step 1-5
- ✓ Created first group
- ✓ Created first campaign
- ✓ Added first member
- ✓ Converted to paid (if trial expires)

**Implementation:**
- Use Supabase functions or simple event logging
- Track to a `user_activation_events` table
- Query weekly: conversion rate, drop-off points, cohort analysis

**Expected lift:** 30-50% faster identification of activation bottlenecks

**Effort:** 1-2 hours (Alfred)

---

### 1.3 Quick Win: Trial Messaging (Email + In-App) (1 hour)

**Current state:** Users get access to trial but don't know what to do next.

**Idea:** Send onboarding emails + in-app prompts:
- **Email 1 (day 0):** "Your 14-day free trial is active! Here's how to get started."
- **Email 2 (day 3):** "Still exploring? Here's what <successful_user_persona> built in 3 days."
- **Email 3 (day 10):** "Your trial ends in 4 days. Ready to keep using CoinUsUp? [Upgrade button]"
- **In-app banner:** "Day X of 14 remaining" countdown

**Implementation:**
- Create email templates (Resend or SendGrid)
- Add countdown banner to app UI
- Wire up email triggers to trial_starts_at, trial_ends_at

**Expected lift:** 20-30% improvement in trial engagement and conversion

**Effort:** 1 hour (Alfred)

---

## Phase 2: Post-Trial Launch (Apr 15-30)

**Goal:** Convert trial users to paid + identify product/market fit gaps.

### 2.1 Activation Bottleneck Analysis (1 day)

**Actions:**
- Query activation_events table: where do users drop off most?
- Identify the #1 blocker (e.g., "80% complete tutorial but don't create group")
- Test hypothesis: Is it unclear UX? Wrong target user? Technical issue?

**Deliverable:** 
- Report: "Top 3 Drop-Off Points & Remediation Roadmap"
- Recommendation: Which quick fix to prioritize next

**Owner:** Alfred (analysis) → potentially spawn HAL for UX research

---

### 2.2 Trial-to-Paid Conversion Analysis (3 days)

**Actions:**
- Track conversion rate: % of trial users who subscribe
- Segment by persona: Which types of users convert best?
- Analyze churn: When do newly paid users cancel?

**Deliverable:**
- Report: "Trial Cohort Performance & Pricing Insights"
- Recommendation: Adjust pricing, add features, or refocus marketing

**Owner:** Alfred (data analysis)

---

## Phase 3: Growth Levers (May 2026+)

### 3.1 Content Marketing (Organic Growth)

**Idea:** Create SEO-optimized content targeting fundraising + volunteer management keywords.

**Content pillars:**
- "How to Run a School Fundraiser" (tutorial + CoinUsUp use case)
- "Nonprofit Volunteer Scheduling 101" (guide + CoinUsUp feature comparison)
- "Fundraising Best Practices for Sports Teams" (playbook)

**Expected ROI:** 50-200 organic monthly visitors within 3-6 months

**Effort:** 20-30 hours (research + writing + SEO optimization)

**Owner:** HAL (research) → Alfred (strategy) → HAL (implementation)

---

### 3.2 Integration Partnerships (Viral Loop)

**Idea:** Integrate with platforms where target users already are.

**Potential partners:**
- **Email newsletters for nonprofits** (e.g., NonprofitHub, Idealist.org) → "Sponsor" guides about volunteer management
- **Google Workspace marketplace** → "Add CoinUsUp to Sheets for volunteer scheduling"
- **Slack app directory** → "CoinUsUp bot for team notifications"
- **Facebook Groups** (fundraising communities) → Link organic communities to CoinUsUp

**Expected ROI:** 100-500 monthly referrals per partnership (if successful)

**Effort:** 10-15 hours per partnership (outreach + technical setup + marketing)

**Owner:** HAL (outreach) + Alfred (technical setup)

---

### 3.3 Monetization Roadmap

**Current pricing:** Free, Basic ($5-10/mo), Pro ($15-25/mo)

**Gaps:**
- No annual discount (could add 5-10% incremental revenue)
- No enterprise tier (for large nonprofits/organizations)
- No add-ons (e.g., "Compliance Reporting" add-on for nonprofits)

**Recommendation:**
- Add annual pricing: 20% discount off monthly rate
- Create "Nonprofit" tier: Free for registered 501(c)(3)s + upsell compliance features
- Add "Advanced Reporting" add-on: $5-10/mo per user

**Expected lift:** 15-25% revenue increase (mix of new tier adoption + annual discounts)

**Effort:** 5-10 hours (pricing research + UI changes + Stripe config)

**Owner:** Alfred (research + strategy) + HAL (implementation)

---

## Success Metrics

### Near-Term (30 days)
- Trial signup rate: X users/day (baseline unknown, measure it)
- Tutorial completion rate: >60%
- First group creation rate: >40% of signups
- Trial-to-paid conversion: >5% (industry benchmark: 2-5%)

### Medium-Term (90 days)
- Paid user retention (30-day): >70%
- Organic traffic: 200+ monthly visitors
- Customer acquisition cost: <$X (from content + partnerships)
- MRR: $500-2,000 (estimated from 200-400 paid users @ $5-15/mo)

### Long-Term (6+ months)
- Annual recurring revenue: $6k-24k
- Nonprofit segment: 20%+ of user base
- Integration partnerships: 3-5 active partnerships
- Customer NPS: >40

---

## Risk Analysis

### Risk 1: Trial Doesn't Convert
**If:** <2% of trial users convert to paid
**Then:** Activation/value prop is unclear — need UX overhaul, not more marketing
**Mitigation:** Track aha-moment early; iterate quickly before spending on acquisition

### Risk 2: Wrong Target Market
**If:** Founders/consultants sign up instead of nonprofits/teams
**Then:** Need to sharpen positioning + add features for target persona
**Mitigation:** Survey trial users; build 1-2 features for highest-converting segment

### Risk 3: Churn After Trial
**If:** >50% of new paid users cancel within 30 days
**Then:** Product isn't solving a real pain point; need deeper product iteration
**Mitigation:** Collect feedback from churned users; ask "What would make you stay?"

---

## Next Steps (For Joe)

1. **Approve trial launch** (5 min read + comment)
2. **Review Phase 1 quick wins** (20 min read)
3. **Pick top 3 priorities:**
   - Must have: Aha-moment UX (Phase 1.1)
   - Should have: Trial messaging (Phase 1.3) or tracking (Phase 1.2)?
   - Nice to have: All of the above?
4. **Assign work:** 
   - Alfred: UX design + email templates
   - HAL: Analytics setup + testing
5. **Monitor post-launch:** Meet weekly to review conversion data + adjust roadmap

---

## Appendix: Competitive Landscape

| Product | Target | Pricing | Strength | Weakness |
|---------|--------|---------|----------|----------|
| **CoinUsUp** | Nonprofits + Teams | Free/$5-25/mo | All-in-one (group + campaign + volunteer) | New, low awareness |
| **Donorbox** | Nonprofits | 1.5% + fees | Fundraising-focused | Limited volunteer tools |
| **Volunteers.org** | Nonprofits | Freemium | Volunteer-focused | Weak fundraising tools |
| **Eventbrite** | Event organizers | 2% + fees | Event management | Not nonprofit-focused |
| **Slack** | Teams | $8-15/user/mo | Team collaboration | No fundraising/event tools |

**CoinUsUp's differentiation:** First all-in-one platform combining nonprofit fundraising + team volunteer management in one place.

---

**Document prepared by:** Alfred  
**For:** Joe Ho  
**Ready for presentation:** When CoinUsUp trial deployment completes (est. Apr 9-13, 2026)
