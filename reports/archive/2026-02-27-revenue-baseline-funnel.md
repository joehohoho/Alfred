# Revenue Baseline & Funnel Instrumentation — CoinUsUp
**Date:** 2026-02-27
**Scope:** Current monetization baseline + tracking gaps + bottlenecks + measurable targets

## 1) Current Baseline (as measurable from code/system access)

### Revenue baseline
- **MRR (confirmed):** **$0 tracked centrally**
- **ARR run-rate (confirmed):** **$0 tracked centrally**
- **Reason:** No centralized revenue dashboard/warehouse metric source found in current workspace; subscription flows exist in app code, but no consolidated KPI output for MRR/ARR/churn in repo-level reporting.

### Funnel baseline
- **Visitor → signup conversion:** **Not instrumented**
- **Signup → trial start conversion:** **Not instrumented**
- **Trial → paid conversion:** **Not instrumented**
- **Monthly logo churn:** **Not instrumented**
- **Monthly revenue churn:** **Not instrumented**

### What *is* present
- Subscription plan/state logic exists (free/basic/pro/enterprise)
- Stripe/IAP subscription hooks and settings UI exist
- Supabase tables/types include subscription fields (`plan`, `status`, `current_period_end`, `cancel_at_period_end`)
- **No analytics event layer detected** (no PostHog/Mixpanel/Segment/Amplitude capture usage in `src/`)

---

## 2) Event Tracking Gaps (highest impact)

Missing canonical events for growth and billing:
1. `signup_started`, `signup_completed`
2. `org_created`
3. `trial_started`, `trial_ending_soon`
4. `checkout_started`, `checkout_completed`, `checkout_failed`
5. `plan_changed` (up/down), `cancel_requested`, `churned`
6. `activation_milestones` (first campaign, first event, first donation)

Missing dimensions/properties:
- `org_id`, `user_id`, `plan_from`, `plan_to`, `billing_cycle`, `region`, `acquisition_source`, `campaign_count`, `event_count`, `time_to_first_value`

Missing KPI tables/materialized views:
- Daily MRR snapshot
- Signup cohort table
- Trial cohort table
- Churn table (logo + revenue)

---

## 3) Top 3 Bottlenecks

1. **No source of truth for revenue KPIs**
   - Without MRR/ARR/churn snapshots, improvement loops are blind.

2. **No funnel event instrumentation**
   - Can’t isolate where users drop: landing, signup, activation, checkout, renewal.

3. **No activation-to-conversion linkage**
   - Product usage milestones are not tied to billing outcomes, so we can’t identify leading indicators of paid conversion.

---

## 4) Measurable Targets (next 30 days)

### Instrumentation completion targets
- **100%** of core funnel events implemented (events listed above)
- **100%** of events include required dimensions (`org_id`, `plan`, `billing_cycle`, `region`, `source`)
- Daily KPI job runs successfully for **30/30 days**

### KPI definition targets (operational)
- MRR, ARR, trial->paid, logo churn, revenue churn calculated daily by 09:00 AST
- Dashboard shows 7d/30d trend deltas for all core KPIs

### Performance improvement targets (once baseline is live)
- Trial → paid: **+20% relative uplift** from first measured baseline
- Checkout failure rate: **< 5%**
- Month-1 logo churn: **< 8%**

---

## 5) Immediate Implementation Sequence

1. Add analytics facade (`track(event, props)`) and instrument the 6 core event groups.
2. Add subscription lifecycle events at checkout/plan-change/cancel/renewal points.
3. Create daily KPI aggregation job + lightweight dashboard tile set.
4. Lock baseline date (`T0`) and begin weekly growth review against targets.

---

## Executive Summary
Current measurable business baseline is effectively **untracked** (MRR/ARR/churn/funnel conversions not centrally computed). The fastest win is not feature work; it is **instrumentation + KPI plumbing** so growth work becomes measurable. Once telemetry is live, the first improvement cycle should focus on trial-to-paid and checkout drop-off.