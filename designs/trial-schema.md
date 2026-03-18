# Trial Feature Design — CoinUsUp (2026-03-18)

**Feature:** 14-day free trial on Basic & Pro plans  
**Scope:** CoinUsUp (Stripe integration)  
**Owner:** Alfred  
**Status:** Design review (awaiting Joe approval)

---

## 1. Database Changes

### Migration: Add trial_ends_at field
```sql
-- Migration: 20260318_add_trial_ends_at_to_subscriptions.sql
ALTER TABLE public.subscriptions
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for efficient trial-end queries
CREATE INDEX idx_subscriptions_trial_ends_at 
ON public.subscriptions(trial_ends_at) 
WHERE trial_ends_at IS NOT NULL;

-- Seed existing subscriptions: mark as non-trial (backward compat)
UPDATE public.subscriptions
SET trial_ends_at = NULL
WHERE trial_ends_at IS NULL AND plan != 'free';
```

### Schema Evolution
```sql
-- Current subscriptions table
subscriptions {
  id UUID PRIMARY KEY
  org_id UUID NOT NULL
  plan 'free' | 'basic' | 'pro' | 'enterprise'
  status 'active' | ...
  current_period_start TIMESTAMP
  current_period_end TIMESTAMP
  cancel_at_period_end BOOLEAN
  created_at TIMESTAMP
  updated_at TIMESTAMP
  
  -- NEW FIELD:
  trial_ends_at TIMESTAMP DEFAULT NULL  -- NULL = no trial or trial ended
}
```

---

## 2. Stripe Configuration

### Price Updates (Manual via Stripe Dashboard)

For **each of the 12 prices** (Basic/Pro × US/CA × Monthly/Annual), set:
```
trial_period_days = 14
```

**Prices to update:**
```
Basic:
  - price_1SNIFQFeXgjEGGSYLLJj8CPJ (US monthly)
  - price_1SNgPWFeXgjEGGSYlqSUCi3M (US annual)
  - price_1SmfmAFeXgjEGGSYq4K3gpoO (CA monthly)
  - price_1SmfnOFeXgjEGGSYeiQOafQS (CA annual)

Pro:
  - price_1SNIFtFeXgjEGGSYUXFj5e5E (US monthly)
  - price_1SNgRNFeXgjEGGSY0byrI4wn (US annual)
  - price_1SmfjVFeXgjEGGSYsVlpPNkn (CA monthly)
  - price_1Smfl1FeXgjEGGSYuYXuI3c4 (CA annual)

Enterprise: NO TRIAL (custom pricing)
```

### Verification Script
```bash
# Test: confirm all Basic/Pro prices have trial_period_days = 14
curl -s "https://api.stripe.com/v1/prices/price_1SNIFQFeXgjEGGSYLLJj8CPJ" \
  -u "$STRIPE_SECRET_KEY:" | jq '.recurring.trial_period_days'
# Expected: 14

curl -s "https://api.stripe.com/v1/prices?product=<BASIC_PRODUCT_ID>&limit=4" \
  -u "$STRIPE_SECRET_KEY:" | jq '.data[] | {id, trial_period_days: .recurring.trial_period_days}'
```

---

## 3. Checkout Flow (Backend)

### Updated create-checkout Function
```typescript
// supabase/functions/create-checkout/index.ts

serve(async (req) => {
  // ... existing auth + validation ...
  
  const { priceId } = await req.json();
  const stripe = new Stripe(...);
  
  // Fetch price to check if it has a trial
  const price = await stripe.prices.retrieve(priceId);
  const trialPeriodDays = price.recurring?.trial_period_days || null;
  
  // Create checkout session with trial_period_days if applicable
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: "subscription",
    
    // ✅ NEW: Enable trial if price has trial_period_days
    subscription_data: {
      trial_period_days: trialPeriodDays,
      // Ensure card is collected upfront even during trial
      // (Stripe requires this for subscription invoicing)
    },
    
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?subscription=success`,
    cancel_url: `${origin}/settings?tab=subscription&subscription=cancelled`,
  });

  logStep("Checkout session created", { 
    sessionId: session.id, 
    trialPeriodDays 
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
```

**Key change:** `subscription_data.trial_period_days` tells Stripe to start a trial. Stripe automatically:
- Marks subscription as `trial` status
- Sets `trial_end` timestamp
- Won't charge until `trial_end`
- Requires card on file (collected at checkout)

---

## 4. Subscription Status Check (Backend)

### Updated check-subscription Function
```typescript
// supabase/functions/check-subscription/index.ts

serve(async (req) => {
  // ... existing auth + org lookup ...
  
  const stripe = new Stripe(...);
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: ["active", "trialing"],  // ✅ Include "trialing" status
    limit: 1,
  });

  if (subscriptions.data.length > 0) {
    const subscription = subscriptions.data[0];
    const isTrialing = subscription.status === "trialing";
    const trialEnd = isTrialing ? subscription.trial_end : null;
    const trialEndsAt = trialEnd 
      ? new Date(trialEnd * 1000).toISOString() 
      : null;

    // Map price → plan (existing logic)
    const plan = priceIdToPlan[subscription.items.data[0].price.id] || 'free';

    logStep("Subscription details", {
      subscriptionId: subscription.id,
      status: subscription.status,
      plan,
      isTrialing,
      trialEndsAt,
    });

    // ✅ Update database: record trial_ends_at
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        org_id: orgId,
        plan: plan,
        status: 'active',  // Always 'active' in our schema (Stripe holds the 'trialing' state)
        current_period_end: subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: trialEndsAt,  // ✅ NEW
      }, {
        onConflict: 'org_id'
      });

    if (updateError) {
      logStep("Error updating subscription", { error: updateError });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan: plan,
      subscription_id: subscription.id,
      subscription_end: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      billing_interval: priceIdToInterval[subscription.items.data[0].price.id] || null,
      trial_ends_at: trialEndsAt,  // ✅ NEW
      is_trialing: isTrialing,     // ✅ NEW
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  // No subscription = free plan
  return new Response(JSON.stringify({
    subscribed: false,
    plan: 'free',
    trial_ends_at: null,
    is_trialing: false,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
```

**Key changes:**
- Include `status: "trialing"` in subscription query (Stripe marks trials with this status)
- Extract `trial_end` from subscription object
- Store `trial_ends_at` in database
- Return `is_trialing` flag to frontend

---

## 5. Frontend Changes

### Updated useStripeSubscription Hook
```typescript
// src/hooks/useStripeSubscription.ts

export function useStripeSubscription() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [subscriptionStatus, setSubscriptionStatus] = useState<IAPSubscriptionStatus | null>(null);
  // ... existing state ...

  const checkSubscription = useCallback(async () => {
    if (!user || !currentOrg) {
      setLoading(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke('check-subscription');
      const data = response.data;

      setSubscriptionStatus({
        subscribed: data.subscribed,
        plan: data.plan,
        subscription_end: data.subscription_end,
        billing_interval: data.billing_interval,
        payment_provider: ...,
        trial_ends_at: data.trial_ends_at,  // ✅ NEW
        is_trialing: data.is_trialing,      // ✅ NEW
      });
    } catch (error) {
      console.error('[Subscription] Error checking:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentOrg]);

  // ... rest of hook ...

  return {
    subscriptionStatus,
    loading,
    // ... other returns ...
  };
}
```

### Updated StripeSubscriptionSettings Component
```typescript
// src/components/settings/StripeSubscriptionSettings.tsx

export function StripeSubscriptionSettings() {
  const { subscriptionStatus, loading, ... } = useStripeSubscription();

  // ... existing code ...

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the{' '}
            <strong>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
            </strong>{' '}
            plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ NEW: Show trial countdown if in trial */}
          {subscriptionStatus?.is_trialing && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900">
                    14-day free trial active
                  </p>
                  <p className="text-blue-700 mt-1">
                    Trial ends on{' '}
                    <strong>
                      {new Date(subscriptionStatus.trial_ends_at!).toLocaleDateString()}
                    </strong>
                    . After that, we'll charge your card on file.
                  </p>
                  {daysUntilTrialEnd() <= 7 && (
                    <p className="text-orange-600 mt-2 font-medium">
                      ⚠️ Your trial ends soon!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Existing renewal/expiration logic */}
          {!subscriptionStatus?.is_trialing && subscriptionStatus?.subscription_end && (
            <p className="text-sm text-muted-foreground mb-4">
              {subscriptionStatus.subscribed
                ? `Renews on ${new Date(subscriptionStatus.subscription_end).toLocaleDateString()}`
                : `Expires on ${new Date(subscriptionStatus.subscription_end).toLocaleDateString()}`}
            </p>
          )}

          {subscriptionStatus?.subscribed && (
            <Button variant="outline" onClick={openCustomerPortal}>
              Manage Subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-6">Available Plans</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isTrialEligible = (plan.id === 'basic' || plan.id === 'pro') 
              && !subscriptionStatus?.subscribed;
            
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Current</span>}
                  </CardTitle>
                  {/* ✅ NEW: Show trial badge */}
                  {isTrialEligible && (
                    <div className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded inline-block mt-2">
                      14-day free trial
                    </div>
                  )}
                  {/* Price */}
                  <div className="text-3xl font-bold">
                    {plan.id === 'free' ? 'Free' : `$${...}`}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Features + button (existing) */}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function daysUntilTrialEnd(trialEndsAt: string | null): number {
  if (!trialEndsAt) return Infinity;
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}
```

---

## 6. Webhook Handling

### Stripe Events to Handle
```typescript
// supabase/functions/handle-stripe-webhook/index.ts (new function)

const webhookEvents = {
  'customer.subscription.created': async (subscription) => {
    // Trial just started - log event
    if (subscription.trial_end) {
      console.log(`[TRIAL] Subscription created with trial until ${subscription.trial_end}`);
    }
  },

  'customer.subscription.updated': async (subscription) => {
    // Trial might have ended
    if (subscription.status === 'active' && !subscription.trial_end) {
      console.log(`[TRIAL_ENDED] Trial ended for subscription ${subscription.id}`);
      // Update our DB to clear trial_ends_at
      // This is handled by periodic check-subscription calls
    }
  },

  'invoice.created': async (invoice) => {
    // First invoice after trial ends
    if (invoice.subscription && !invoice.on_behalf_of) {
      console.log(`[FIRST_INVOICE] First charge after trial: ${invoice.id}`);
      // Optional: send "your trial ended" + "first charge" email
    }
  },

  'invoice.payment_failed': async (invoice) => {
    // Payment failed during/after trial - user must add/update card
    console.log(`[PAYMENT_FAILED] Invoice ${invoice.id} payment failed`);
    // Send alert: "We couldn't charge your card. Please update your payment method."
  }
};
```

**Current webhook handling:** If webhook infrastructure exists, hook into these events to:
1. Log trial milestones
2. Trigger emails (trial ending soon, trial ended, first charge)
3. Handle payment failures

**Fallback:** If full webhook handling isn't feasible, periodic `check-subscription` calls (every 6h via cron) will sync trial status from Stripe.

---

## 7. Email Notifications

### Trial Warning Email (7 days before trial ends)
**Trigger:** Cron job runs daily; checks `trial_ends_at - 7 days`

**Template:**
```
Subject: Your 14-day free trial expires in 7 days

Hi [User],

Your 14-day free trial for CoinUsUp [Plan Name] expires on [Date].

After your trial ends, your card on file will be charged:
- Basic: $[Amount]/[month/year]
- Pro: $[Amount]/[month/year]

To update your payment method or cancel anytime, visit:
[Link to subscription settings]

No action needed — your trial will automatically convert to a paid subscription on [Date].

Thanks,
CoinUsUp Team
```

### First Charge Email (triggered by webhook)
**Trigger:** `invoice.created` webhook after trial_end

**Template:**
```
Subject: Your CoinUsUp subscription is now active

Hi [User],

Your 14-day free trial has ended. Your [Plan] subscription is now active.

We've charged your card ending in [****]:
- Charge: $[Amount]
- Billing period: [Start] - [End]

To manage your subscription or change your plan:
[Link to settings]

Thanks,
CoinUsUp Team
```

---

## 8. Migration Strategy (Existing Customers)

### Principle
**No retroactive trials.** Only NEW subscriptions (created after feature launch) get a 14-day trial.

### Migration Script
```sql
-- Run BEFORE deploying trial feature
-- Mark all existing subscriptions as non-trial

UPDATE public.subscriptions
SET trial_ends_at = NULL,
    updated_at = now()
WHERE trial_ends_at IS NULL AND plan IN ('basic', 'pro', 'enterprise');

-- Verify: should show 0 rows with trial_ends_at NOT NULL before launch
SELECT COUNT(*) as existing_paid_subs_without_trial
FROM public.subscriptions
WHERE plan IN ('basic', 'pro', 'enterprise') AND trial_ends_at IS NULL;
```

### Rationale
- Existing customers are already committed (they're paying)
- Giving them trials retroactively doesn't add value
- Simplifies implementation (no retroactive trial logic)
- Trial is a **new customer acquisition tool**, not a benefit for existing users

---

## 9. Edge Cases & Responses

| Scenario | Current Behavior | New Behavior | Response |
|----------|------------------|--------------|----------|
| **User downgrade during trial** | Not possible (new feature) | Trial blocks downgrade | ❌ Error: "Can't downgrade during trial. Please wait until [date]." |
| **User cancel during trial** | Not possible (new feature) | Stripe allows immediate cancel | ✅ Via customer portal. Cancellation is immediate. |
| **User upgrade Basic→Pro during trial** | Not possible (new feature) | Trial blocks upgrade | ❌ Error: "Can't upgrade during trial. Please wait until [date]." |
| **Trial expires, card on file fails** | Not possible (new feature) | Stripe retries, then marks unpaid | ⚠️ Webhook: invoice.payment_failed. Send email + disable access until payment succeeds. |
| **Manually extend trial (via Stripe API)** | N/A | Possible if Joe requests | ✅ Requires Stripe API call + DB update. Handle via support ticket. |
| **Switch to free plan during trial** | Not possible (new feature) | Allowed | ✅ Via Stripe portal or email request. Trial is waived. |

---

## 10. Acceptance Criteria (Definition of Done)

### Code
- [ ] Migration script creates `trial_ends_at` field
- [ ] `create-checkout` passes `trial_period_days` to Stripe
- [ ] `check-subscription` reads `trial_end` from Stripe, stores in DB
- [ ] Frontend displays trial countdown + badge
- [ ] Email notifications work (7-day warning + first charge)
- [ ] Webhook handling or periodic sync keeps `trial_ends_at` in sync

### Testing
- [ ] Unit tests for `isFreeTrialActive()` helper
- [ ] Integration test: create subscription with trial → verify Stripe marks `trialing`
- [ ] Integration test: simulate trial ending → verify status changes
- [ ] Manual test on staging: full checkout → trial creation → renewal

### Deployment
- [ ] All Stripe prices updated with `trial_period_days: 14` (Basic/Pro only)
- [ ] Migration script runs before feature deploy
- [ ] Feature gate enabled only after Joe approval
- [ ] Rollback procedure documented + tested

---

## 11. Rollback Procedure

If trial feature breaks production:

1. **Disable new signups:** Remove trial badge from pricing page
2. **Revert price config:** Set `trial_period_days: null` for all Basic/Pro prices in Stripe
3. **Code rollback:** Redeploy pre-trial version of create-checkout + check-subscription
4. **Data recovery:** Trial subscriptions remain active (Stripe continues honoring trial); no data loss
5. **Post-mortem:** Document what failed, fix, re-deploy

**Estimated time:** 15 min (no database rollback needed; Stripe state is authoritative)

---

## Summary

**Key Design Decisions:**
1. Trial only for **Basic/Pro**, not Enterprise (custom pricing)
2. **14 days hard-coded** in Stripe prices (not configurable per signup)
3. **No retroactive trials** for existing customers
4. **Card required upfront** (standard Stripe behavior)
5. **Stripe is source of truth** for trial state; database mirrors it
6. **Email-based** trial warnings + first-charge notifications

**Dependencies:**
- Stripe API v2025-08-27.basial (already in use)
- Supabase Edge Functions (already deployed)
- Email service (existing or TBD)
- Optional: Webhook infrastructure for real-time sync

**Risks & Mitigations:**
| Risk | Mitigation |
|------|-----------|
| Existing customers accidentally get retroactive trials | Migration script marks all existing as non-trial before deploy |
| Trial state drifts out of sync with Stripe | Periodic `check-subscription` cron + webhook handlers |
| Customers confused about when they're charged | Clear email warnings + UI countdown |
| Payment fails after trial ends | Webhook + email retry flow |

---

**Status:** Ready for Joe's Stripe spec approval  
**Next Step:** Joe confirms design + Stripe price updates complete → Begin implementation

