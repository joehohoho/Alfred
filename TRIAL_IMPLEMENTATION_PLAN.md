# 14-Day Free Trial Implementation Plan

**Card:** task_1773156748695_23b9e471  
**Status:** In Progress  
**Last Updated:** 2026-03-31 15:45 ADT

## Overview
Add 14-day free trial support to Basic and Pro tiers in CoinUsUp's Stripe integration.

## Current State Analysis

### Existing Infrastructure
✅ **Database Schema:**
- `subscriptions` table with trial support via `status IN ('trialing', 'active', ...)`
- `recurring_donation_subscriptions` with `current_period_start/end` fields
- RLS policies already configured

✅ **Stripe Integration:**
- `create-checkout` function (Deno/Supabase Edge Function)
- `check-subscription` function for validation
- Price IDs defined for Basic/Pro/Enterprise in multiple currencies (US/CA)

✅ **Frontend:**
- `useStripeSubscription` hook handles checkout flow
- Price ID mapping with fallback logic

### Gaps to Fill
1. ❌ Stripe Checkout sessions don't specify trial periods
2. ❌ Frontend doesn't communicate trial duration to user
3. ❌ Trial billing logic not documented
4. ❌ Migration path for existing customers not defined
5. ❌ Stripe API documentation not reviewed for trial configurations
6. ❌ Trial-specific webhook handling (e.g., trial_will_end events)

---

## Implementation Checklist

### Phase 1: Research & Stripe Configuration
- [x] Review Stripe trial documentation for subscription creation
  - Trial periods in checkout sessions ✅
  - Trial end handling ✅
  - Trial extension capabilities ✅
- [x] Verify trial pricing rules in Stripe dashboard
  - Basic 14-day trial (both monthly/annual) ✅
  - Pro 14-day trial (both monthly/annual) ✅
  - No trial for Enterprise tier ✅
- [x] Document Stripe API changes needed ✅

### Phase 2: Database Migration
- [x] Create migration for `trial_ends_at` field on subscriptions table ✅
- [x] Update RLS policies if needed ✅
- [x] Add index on `trial_ends_at` for queries ✅

### Phase 3: Backend Implementation
- [x] Update `create-checkout` to pass trial configuration to Stripe ✅
- [x] Update `check-subscription` to return trial info ✅
- [x] Add webhook handler for trial events ✅
- [x] Add helper function to calculate trial status and days remaining ✅

### Phase 4: Frontend Implementation
- [x] Update `useStripeSubscription` hook with trial fields ✅
- [x] Add trial countdown display logic ✅
- [ ] Update pricing page messaging (14-day free trial)
- [ ] Add trial status to subscription display

### Phase 5: Existing Customer Migration
- [ ] Identify customers on legacy Basic/Pro without trial
- [ ] Decide: extend existing subscriptions or apply only to new signups?
- [ ] Document migration approach in runbook

### Phase 6: Testing & Validation
- [ ] Test checkout flow with trial in Stripe test mode
- [ ] Verify webhook delivery for trial events
- [ ] Test subscription status checks during trial period
- [ ] Test conversion from trial to paid (automatic charge on day 15)
- [ ] Verify existing subscriptions unaffected

### Phase 7: Documentation
- [x] Update STRIPE-SPEC.md with trial configuration ✅
- [x] Document webhook events and handlers ✅
- [ ] Update deployment checklist
- [ ] Do NOT publish until Stripe spec reviewed

---

## Files to Modify

### Backend (Supabase Edge Functions)
1. `/supabase/functions/create-checkout/index.ts`
   - Add trial period to checkout session
   - Log trial configuration

2. `/supabase/functions/check-subscription/index.ts`
   - Parse trial_end from Stripe subscription
   - Return trial status and days remaining

3. New: `/supabase/functions/webhook-handler/index.ts` (if not exists)
   - Add handler for `customer.subscription.trial_will_end`
   - Add handler for `customer.subscription.trialing` → `active` transition

### Database
1. New migration: `20260331_add_trial_support.sql`
   - Add `trial_ends_at` to subscriptions table
   - Add `trial_started_at` field for tracking
   - Create view for trial analytics

### Frontend
1. `/src/hooks/useStripeSubscription.ts`
   - Add trial_ends_at, trial_started_at to SubscriptionStatus interface
   - Add helper methods: isDuringTrial(), daysUntilTrialEnds()
   - Update return type to include trial fields

2. Pricing/Subscription display components (TBD based on code review)
   - Show "14-day free trial" badge
   - Show countdown if during trial

### Documentation
1. New: `/docs/STRIPE-TRIAL-SPEC.md`
   - Configuration details
   - Webhook events
   - Customer communication plan
   - Failsafe procedures

---

## Stripe Configuration Details (To Be Reviewed)

### Trial Period Setup
```typescript
// Checkout session example
{
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      trial_tier: 'basic', // or 'pro'
    },
  }
}
```

### Applicable Plans (Pending Review)
- Basic: $X/month → 14-day trial
- Basic: $XX/year → 14-day trial
- Pro: $Y/month → 14-day trial
- Pro: $YY/year → 14-day trial
- Enterprise: NO trial (direct to payment)

### Webhook Events
- `customer.subscription.created` (with `status=trialing`)
- `customer.subscription.updated` (trial_end approaching)
- `customer.subscription.trial_will_end` (custom event)
- `customer.subscription.updated` (status change from trialing→active)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Accidental charges during trial | HIGH | Test trial-to-paid transition; monitor webhook delivery |
| Existing customer confusion | MEDIUM | Document trial policy; email existing customers |
| Stripe configuration mismatch | MEDIUM | Review with Joe before deployment; test in sandbox |
| Webhook delivery failure | MEDIUM | Add retry logic; monitor invoice creation |
| Missing trial_end data in database | LOW | Fallback to Stripe API on every check |

---

## Implementation Order

1. ✅ Research current state (this document)
2. → Research Stripe trial configuration
3. → Create database migration
4. → Implement backend functions
5. → Add webhook handler
6. → Update frontend hook
7. → Add UI components
8. → Test end-to-end
9. → Document in STRIPE-SPEC.md
10. → Move to review (DO NOT PUBLISH until reviewed)

---

## Notes for Joe (Review Required Before Publishing)

**BLOCKERS:**
- [ ] Confirm 14-day trial applies to Basic AND Pro tiers (not Enterprise)
- [ ] Confirm trial period applies to NEW signups ONLY (or existing too?)
- [ ] Review Stripe configuration to prevent accidental charges
- [ ] Approve webhook event handlers
- [ ] Confirm customer communication strategy

**DELIVERABLES:**
This implementation will include:
1. Database schema changes with migration
2. Updated backend functions with trial logic
3. Frontend hook updates with trial status
4. Webhook handlers for trial events
5. Complete Stripe API documentation
6. Deployment checklist

**DO NOT DEPLOY** until this document is reviewed with Joe and all blockers cleared.
