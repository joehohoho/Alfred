# Stripe Integration Audit — CoinUsUp (2026-03-18)

**Scope:** CoinUsUp only (Basic/Pro/Enterprise tiers)  
**Audit Date:** 2026-03-18 18:00 ADT  
**Current Integration Status:** Active (Stripe Billing + Supabase webhooks)

---

## Current Architecture Overview

### Products & Prices (Stripe Dashboard)
- **Basic Plan**
  - US Monthly: `price_1SNIFQFeXgjEGGSYLLJj8CPJ`
  - US Annual: `price_1SNgPWFeXgjEGGSYlqSUCi3M`
  - CA Monthly: `price_1SmfmAFeXgjEGGSYq4K3gpoO`
  - CA Annual: `price_1SmfnOFeXgjEGGSYeiQOafQS`
  - **No trial periods currently set**

- **Pro Plan**
  - US Monthly: `price_1SNIFtFeXgjEGGSYUXFj5e5E`
  - US Annual: `price_1SNgRNFeXgjEGGSY0byrI4wn`
  - CA Monthly: `price_1SmfjVFeXgjEGGSYsVlpPNkn`
  - CA Annual: `price_1Smfl1FeXgjEGGSYuYXuI3c4`
  - **No trial periods currently set**

- **Enterprise Plan**
  - US Monthly: `price_1SNIGPFeXgjEGGSYnkjJUVGY`
  - US Annual: `price_1SNgUuFeXgjEGGSY9FpbcOB1`
  - CA Monthly: `price_1SmfOWFeXgjEGGSYqv9pBnvu`
  - CA Annual: `price_1Smfi5FeXgjEGGSYELAwNvl1`
  - **No trial periods currently set**

### Database Schema
**Supabase table:** `subscriptions`
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',  -- 'free'|'basic'|'pro'|'enterprise'
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);
```
**Missing field:** `trial_ends_at` — NEEDS TO BE ADDED

### Current API Flow
1. **Create Checkout** (`create-checkout/index.ts`)
   - User selects plan (basic/pro/enterprise) + billing cycle (monthly/annual)
   - Function creates Stripe customer if needed
   - Cancels any existing active subscriptions
   - Creates checkout session with `mode: "subscription"`
   - Redirects to Stripe hosted checkout
   - **Trial not used in checkout creation**

2. **Check Subscription** (`check-subscription/index.ts`)
   - Queries Stripe for active subscription
   - Maps price_id → plan + billing_interval
   - Upserts subscription record in Supabase
   - **Trial handling:** None. Current check doesn't read `trial_end` from Stripe

3. **Update Subscription** (`update-subscription/index.ts`)
   - Handles plan changes (basic → pro, etc.)
   - Implements upgrade (immediate charge) and downgrade (end of period) logic
   - **Trial handling:** None. Doesn't check or respect trial status

4. **Customer Portal** (`customer-portal/index.ts`)
   - Opens Stripe billing portal for management
   - Users can upgrade/downgrade/cancel here
   - **Trial handling:** Stripe handles automatically, but we don't track in DB

### Frontend Components
- **StripeSubscriptionSettings.tsx**
  - Displays Free/Basic/Pro/Enterprise plans
  - Shows current plan + renewal date
  - "Select Plan" → triggers checkout
  - **Trial UI:** None. No trial messaging or warning

- **useStripeSubscription hook**
  - Calls `check-subscription` function
  - Returns subscription status (plan, renewal date, billing interval)
  - **Trial handling:** None. Doesn't return trial_ends_at

---

## Critical Findings

### ✅ What's Ready
1. **Stripe integration is production-ready** — checkout, customer portal, plan upgrades all working
2. **Database schema is clean** — can add fields without migration issues
3. **Price IDs are well-documented** — all 12 price IDs (6 regions × 2 billing cycles) mapped correctly
4. **Webhook infrastructure exists** — Stripe can send events (we can hook into checkout.session.completed)

### ⚠️ What's Missing
1. **Trial field in subscriptions table** — no `trial_ends_at` timestamp
2. **Trial creation in checkout** — Stripe checkout session doesn't specify `trial_period_days`
3. **Trial status reading** — `check-subscription` doesn't read `trial_period_days` from Stripe
4. **Trial enforcement** — no middleware/logic to prevent charges during trial
5. **Trial warning emails** — no notification system for trial ending soon
6. **Migration script** — no process for existing customers (answer: no retroactive trials)
7. **API documentation** — no spec doc for trial feature

### 🔴 Edge Cases (Must Address)
1. **Downgrade during trial** — User on Basic trial → tries Pro → should error or auto-extend trial?
   - **Decision:** Error. Can't upgrade during trial. Must wait for trial end.
   
2. **Cancel during trial** — User cancels mid-trial → loses access when?
   - **Decision:** Immediate (via Stripe portal). No refund (trial is free).

3. **Trial expiration** — What triggers the transition from trial → paid?
   - **Decision:** Stripe webhook `customer.subscription.updated` when trial_end passes.

4. **Card on file during trial** — Stripe requires payment method upfront?
   - **Decision:** YES. Stripe requires card for any subscription, even with trial.

5. **Existing customers** — Do people already on Basic/Pro get retroactive trials?
   - **Decision:** NO. Trial only for NEW subscriptions created after feature launch.

---

## Current Pricing Structure (From PLAN_LIMITS)

| Plan      | Monthly US | Annual US | Monthly CA | Annual CA |
|-----------|-----------|-----------|-----------|-----------|
| Free      | $0        | $0        | $0        | $0        |
| Basic     | $25       | $250      | $35       | $350      |
| Pro       | $50       | $500      | $70       | $700      |
| Enterprise| Custom    | Custom    | Custom    | Custom    |

---

## Execution Timeline (Proposed)

### Phase 1: Schema + Trial Prices (2h)
- [ ] Create migration: add `trial_ends_at` to subscriptions table
- [ ] Update Stripe prices: add `trial_period_days: 14` to Basic/Pro monthly + annual prices
- [ ] Test: Verify Stripe API returns `trial_period_days` in price object

### Phase 2: Backend Logic (4h)
- [ ] Update `create-checkout`: pass `trial_period_days` to Stripe session if Basic/Pro
- [ ] Update `check-subscription`: read `trial_period_days` from Stripe, detect if in trial
- [ ] Update `subscriptions` table on checkout → set `trial_ends_at` from Stripe `trial_end`
- [ ] Add middleware: `isFreeTrialActive()` helper — checks if today < trial_ends_at
- [ ] Add webhook handler: catch `customer.subscription.updated` → check if trial ended → log event
- [ ] Write tests for trial logic

### Phase 3: Frontend + UX (3h)
- [ ] Update StripeSubscriptionSettings: show "14-day free trial" badge on Basic/Pro
- [ ] Update subscription status display: show trial countdown if active
- [ ] Add warning: "Trial ends on [date]" in current plan card
- [ ] Email trigger: 7 days before trial ends, send warning

### Phase 4: Migration + Documentation (2h)
- [ ] Migration script: mark all existing paid subscriptions as `trial_ends_at = NULL`
- [ ] Write Stripe API documentation (trial fields, webhook events)
- [ ] Document edge cases + responses
- [ ] Create rollback procedure

---

## Dependencies & Risks

### Dependencies
- ✅ Stripe API v2025-08-27.basial (already in use, supports trial_period_days)
- ✅ Supabase Edge Functions (already deployed)
- ✅ Webhook infrastructure (exists, needs filtering for new events)

### Risks
- **Card validation:** If trial_period_days is set but card declines, Stripe still creates subscription but marks it as unpaid. Need to handle `invoice.payment_failed` webhook.
- **Webhook delivery:** If we miss `customer.subscription.updated` event, we won't know trial ended. Need event retries + periodic sync.
- **Price inconsistency:** If we forget to add trial_period_days to CA prices, CA users won't get trial. Need checklist verification.

---

## Next Steps
1. ✅ Audit complete (this doc)
2. ⏳ Joe review + Stripe spec approval
3. ⏳ Create migration + Stripe config
4. ⏳ Implement backend logic
5. ⏳ Frontend + testing
6. ⏳ Deployment + monitoring

---

**Audit completed by:** Alfred  
**Status:** Ready for design review
