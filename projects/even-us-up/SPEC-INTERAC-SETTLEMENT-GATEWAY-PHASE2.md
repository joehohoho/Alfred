# Even Us Up: Interac e-Transfer Settlement Gateway (Phase 2+)

**Status:** Research Complete, Architecture Design In Progress  
**Priority:** HIGH (Canada-specific competitive differentiation)  
**Effort Estimate:** 40-60 hours implementation + 8-12 hours testing  
**Owner:** Engineering/Integration  
**Dependencies:** Phase 1 (Settlement Clarity) must be live first  

---

## Executive Summary

The **Interac e-Transfer Settlement Gateway** transforms Even Us Up from a "track expenses" app into a **settlement platform**. By automating Interac e-Transfer payments (Canada's #1 payment method between individuals), we eliminate manual settlement friction and unlock:

- **Freemium Model:** Basic tracking (free) → Auto-settlement (Premium $2.99/mo)
- **Revenue:** $12-30k/yr per 500 users @ $6 ARPU
- **Moat:** Interac is Canada-specific; Splitwise (US-centric) doesn't support it
- **UX Advantage:** Seamless "click to pay" vs manual bank app navigation

**Key Metrics:**
- Settlement rate lift: 60% → 85%+ (auto-payment removes friction)
- Premium adoption: 15-25% (direct payment convenience)
- Recurring revenue: $3-5k/mo at scale (500+ active users)

---

## Part 1: API Provider Comparison

### Option 1: VoPay (RECOMMENDED)

**Provider:** VoPay Technologies (Canadian, fintech-focused)  
**Website:** https://vopay.com/en-us/payment-methods/etransfer/  
**Documentation:** https://docs.vopay.com/docs/interac-money-request

#### Capabilities

✅ **Interac e-Transfer Request Money** (what we need)
- Email-based: Send request via email → payor approves in their bank
- Embedded: Show request form in iFrame → payor approves in-app
- Limits: Up to $3,000 per transaction (sufficient for household splits)
- Settlement: Real-time upon approval (funds available immediately)
- No payor banking details needed (email-based)

✅ **Interac e-Transfer Send (with Auto-Deposit)**
- Send directly to account (requires auto-deposit registration)
- Account number + routing → instant delivery
- Limits: Up to $25,000 per transaction
- Bulk file uploads supported (for batch payouts)

✅ **API Maturity & Features**
- REST API (standard Swagger/OpenAPI)
- Webhooks for status updates (REAL-TIME_NOTIFICATION, REQUEST_FULFILLED, etc.)
- Sandbox environment for testing
- Email + embedded transaction modes
- Cancellation support (if payor rejects)
- Test transaction support

#### Pricing Model

**Transparent, Transaction-Based:**
- Request Money: $0.25 - $0.75 per transaction (varies by volume tier)
- Send Money: $0.50 - $1.50 per transaction
- Volume discounts available (10K+ tx/month)
- No setup fees, no monthly minimums
- Pricing depends on your use case (we'd qualify for mid-tier)

**Estimated Cost for Even Us Up:**
- 500 active users @ 4 settlements/month = 2,000 tx/month
- Request Money flow (our MVP): $0.50/tx × 2,000 = $1,000/month
- **Cost per user: $2/month**
- **Margin if charging $2.99:** ~$0.99/user (33% margin)

**Advantages:**
- Canadian company (understands market)
- Flexible: request + send modes
- Webhooks for real-time notifications
- Cost-effective at scale
- Strong documentation
- Recent blog guides (2024-2025)

**Disadvantages:**
- Requires compliance/FINTRAC registration for production (if you hold funds)
- Longer onboarding for new partners
- Need merchant account setup

---

### Option 2: Paysafe

**Provider:** Paysafe (global fintech, Skrill/Neteller parent)  
**Website:** https://developer.paysafe.com/en/api-docs/payments-api/add-payment-methods/interac-e-transfer/  

#### Capabilities

✅ **Interac e-Transfer Request Money**
- Redirect flow (user sent to Interac portal)
- Supports PAYMENT transaction type
- Webhook notifications (PAYMENT_COMPLETED, etc.)
- Payment Handles abstraction (modern API design)

✅ **Interac e-Transfer Send (Payout)**
- STANDALONE_CREDIT transaction type
- Auto-deposit registration required
- Account number validation

#### Pricing Model

- Contact sales for pricing (not published)
- Typically 2-3% + per-transaction fees
- May offer volume discounts

**Advantages:**
- Global platform (scales beyond Canada)
- Integrates with other payment methods (cards, wallets)
- Payment Handles API is modern

**Disadvantages:**
- No public pricing (custom quotes required)
- Requires sales cycle (onboarding slower)
- May be overkill if only supporting Interac
- Less Canada-focused documentation

---

### Option 3: Direct Bank Integration (RBC, TD, BMO, Scotiabank)

**Status:** Not Recommended for MVP (complexity too high)

**Why:** 
- Each bank has different API (RBC eCommerce Gateway, TD WebAPI, etc.)
- Requires separate relationship with each bank
- Compliance/licensing barriers (FINTRAC)
- 6-12 month sales cycle per bank
- Still route through Interac rails anyway

**When to revisit:** Phase 3+, if you want to reduce third-party fees at massive scale (10K+ users)

---

## Part 2: Technical Architecture

### Data Model Extensions

**New Tables:**

```sql
-- Premium subscription tracking
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  plan_type ENUM('free', 'premium') DEFAULT 'free',
  status ENUM('active', 'cancelled', 'trial') DEFAULT 'active',
  trial_end_at TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  payment_method_id VARCHAR(255), -- VoPay or Paysafe ID
  stripe_subscription_id VARCHAR(255), -- For billing
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id) -- One subscription per user
);

-- Interac settlement tracking
CREATE TABLE interac_settlements (
  id UUID PRIMARY KEY,
  settlement_id UUID NOT NULL REFERENCES settlements(id),
  vopay_request_id VARCHAR(255) NOT NULL UNIQUE, -- VoPay transaction ID
  user_email VARCHAR(255) NOT NULL, -- Requestee email
  payee_email VARCHAR(255) NOT NULL, -- Payer email
  amount_cents BIGINT NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  status ENUM('pending', 'fulfilled', 'failed', 'cancelled') DEFAULT 'pending',
  initiated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMP, -- When payor approved
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL 30 days),
  failure_reason TEXT, -- If status = failed
  vopay_webhook_payload JSONB, -- Store full webhook for audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE
);

-- Webhook log (audit trail)
CREATE TABLE interac_webhook_log (
  id BIGSERIAL PRIMARY KEY,
  vopay_request_id VARCHAR(255) NOT NULL,
  webhook_type VARCHAR(64) NOT NULL, -- REAL_TIME_NOTIFICATION, REQUEST_FULFILLED, etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  error TEXT,
  received_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### API Endpoints

**Frontend → Backend:**

```
POST /api/settlements/{id}/initiate-interac
  Body: { payerEmail: string, payeeEmail: string }
  Response: { vopayRequestId: string, status: 'pending' }
  
GET /api/settlements/{id}/interac-status
  Response: { status: 'pending'|'fulfilled'|'failed', details: {...} }
  
POST /api/settlements/{id}/cancel-interac
  Response: { status: 'cancelled', requestId: string }
```

**Backend → VoPay:**

```
POST https://api.vopay.com/v2/interac/money-request
  Headers: { Authorization: Bearer {API_KEY} }
  Body: {
    requestedAmount: 4500, // cents
    currencyCode: "CAD",
    sourceParty: {
      email: "alice@example.com", // Payee (receives request)
      name: "Alice"
    },
    destinationParty: {
      email: "bob@example.com" // Payer (sends payment)
    },
    description: "Roommates Split",
    externalReference: {uuid}, // Our settlement ID
    generateURL: true // Embedded form
  }
  
Response: {
  transactionId: "vopay_req_...",
  status: "PENDING_APPROVAL",
  embeddedUrl: "https://...", // iFrame URL
  emailSent: true,
  expiresAt: "2026-04-27T..."
}
```

**VoPay → Backend (Webhook):**

```
POST /api/webhooks/vopay
  Headers: { X-VoPay-Signature: "...", X-VoPay-Timestamp: "..." }
  Body: {
    eventType: "REQUEST_FULFILLED",
    transactionId: "vopay_req_...",
    status: "COMPLETED",
    amountProcessed: 4500,
    completedAt: "2026-03-27T19:45:00Z",
    sourcePartyApprovedAmount: 4500,
    metadata: {
      externalReference: "{uuid}" // Our settlement ID
    }
  }
```

---

## Part 3: Implementation Plan

### Phase 2A: Core Interac Integration (Weeks 1-3)

**Effort:** 24-32 hours

**Deliverables:**

1. **Backend: VoPay Integration Module** (12h)
   - API client wrapper (authenticate, create requests, handle webhooks)
   - Request Money flow (email-based, no embedded yet)
   - Webhook handler + signature verification
   - Error handling + retry logic
   - Sandbox testing suite

2. **Database Setup** (4h)
   - Migration: create interac_settlements + interac_webhook_log tables
   - User subscription table + Stripe integration hooks
   - Indexing for performance (user_id, settlement_id, vopay_request_id)

3. **API Endpoints** (8h)
   - POST /api/settlements/{id}/initiate-interac
   - GET /api/settlements/{id}/interac-status
   - POST /api/webhooks/vopay (webhook receiver)
   - Unit tests for all paths

**Testing:**
- VoPay sandbox account setup
- End-to-end flow: create request → webhook trigger → status update
- Error cases: failed approvals, timeouts, signature validation fails

**Blockers:** VoPay account + API keys (1-2 day turnaround from VoPay)

---

### Phase 2B: Premium Tier + Billing (Weeks 4-5)

**Effort:** 16-20 hours

**Deliverables:**

1. **Premium Tier Backend** (8h)
   - Subscription model (free vs premium)
   - Feature gating: auto-settlement only for premium
   - Stripe integration (create subscription, handle webhooks)
   - Trial logic (14-day free trial)

2. **Premium Upsell UI** (8h)
   - Dashboard banner: "Upgrade to settle automatically" (non-intrusive)
   - Settlement modal: "Premium: Skip manual payment" CTA
   - Pricing page: show $2.99/mo, benefits, trial offer
   - Subscription mgmt page (manage billing, cancel, change card)

3. **Analytics** (4h)
   - Track: premium_conversion, trial_started, subscription_active
   - Cohort analysis: free vs premium settlement rate comparison

**Testing:**
- Stripe test mode: create subscription, handle renewal, cancellation
- Feature gating: free user can't use auto-settlement
- Trial expiration: user downgraded to free after 14 days

---

### Phase 2C: Embedded Form & Polish (Weeks 6-7)

**Effort:** 12-16 hours

**Deliverables:**

1. **Embedded Interac Form** (8h)
   - Settlement modal: instead of email request, show embedded iFrame
   - Bank selection within app (better UX than email)
   - Mobile-responsive (use aspect-ratio box for iFrame)
   - Fallback to email if embedded unavailable

2. **UX Polish & Notifications** (4h)
   - Real-time status updates (Interac → app, user sees "✅ Payment received")
   - In-app notification: "@Alice sent you $45 via Interac"
   - Email notification: "Your Interac request was approved"
   - Retry flow: if user cancels, re-request option

3. **Compliance & Security** (4h)
   - PCI-DSS review (VoPay handles PCI, we don't store payment details)
   - Webhook signature validation + audit log
   - FINTRAC compliance check (if applicable)
   - Rate limiting on webhook endpoint

---

### Phase 2D: Advanced Features (Phase 2+, post-launch)

**Not in initial launch, but planned:**

1. **Auto-Deposit Mode** (Request Money → Direct Deposit)
   - Payee registers bank account with app
   - Next settlement: auto-deposit directly (no email request)
   - Requires account verification (security)

2. **Batch Settlements** (Bulk Payout API)
   - Group expense sheets: "settle everyone at once"
   - VoPay bulk file upload API (CSV of payouts)
   - Cost: ~$0.25 per payout instead of $0.50

3. **Multi-Rail Settlement** (After Interac proven)
   - Fallback to bank transfer if Interac fails
   - PayPal/Stripe payout as backup
   - User chooses preferred method

---

## Part 4: Revenue Model & Pricing

### Freemium Structure

**FREE Tier:**
- Unlimited expense splitting (core feature)
- Manual settlement tracking ("Record a payment")
- Settlement history (no payment integration)
- Notifications (in-app only)

**PREMIUM Tier ($2.99/month):**
- ✅ Auto-settlement via Interac e-Transfer
- ✅ Real-time settlement notifications
- ✅ Multi-party settlements (batch pay 5+ people)
- ✅ Settlement analytics (who pays back slowest, avg settlement time)
- ✅ Recurring expense automation (auto-request monthly)
- 14-day free trial (convert 30-40% of trial starters)

### Unit Economics

**Assumptions:**
- 500 active users in Year 1
- 40% adopt premium (200 users)
- Average 2 settlements/month per premium user (conservative)
- VoPay cost: $0.50/settlement

**Per User:**
- Premium revenue: $2.99/month
- Settlement volume: 2/month × $0.50 cost = $1.00/month
- Net margin: $1.99/month = 66%

**Blended (Free + Premium):**
- 300 free users (no revenue)
- 200 premium users × $2.99 = $598/month
- COGS (VoPay): 200 users × 2 settlements × $0.50 = $200/month
- **Net Revenue: $398/month** (66% margin)
- **Annual: $4,776** (just settlement revenue)

**Scaling Scenario (2,000 active users):**
- 1,200 free, 800 premium
- Premium revenue: 800 × $2.99 = $2,392/month
- COGS: 800 × 2 × $0.50 = $800/month
- **Net: $1,592/month = $19,104/year**

**With Additional Features (households, recurring):**
- Household tier: $4.99/month (couples/roommate groups)
- Adoption: 20% of premium users
- +160 household users × $4.99 = +$798/month
- **Total: $2,390/month = $28,680/year** (with households)

### Conversion Funnel Targets

| Stage | Target | Notes |
|-------|--------|-------|
| Signup (monthly) | 50 | Growth from marketing |
| Activation (7-day) | 50% (25) | Complete first group + expense |
| Settlement trigger | 80% (20) | Create first settlement |
| See Interac upsell | 90% (18) | Premium banner in modal |
| Trial conversion | 35% (6) | Start 14-day trial |
| Trial→Paid | 40% (2.4) | Convert to $2.99 subscription |
| **Monthly Premium** | **120 total** | At steady state (2x growth) |

**Revenue Impact:**
- Month 1: 50 signups → 2 premium (estimated) = $6
- Month 3: 150 total signups → 6 premium = $18 + retention = $24
- Month 6: 300 signups → 12 premium + retention = $48
- **Breakeven:** ~Month 4-5 (at growth rate of 50/month)

---

## Part 5: Competitive Differentiation

### Even Us Up vs Splitwise (Interac Integration)

| Feature | Splitwise | Even Us Up |
|---------|-----------|-----------|
| **Payment Methods** | Venmo, PayPal, Stripe Pay | Interac e-Transfer (PRIMARY) |
| **Settlement Auto-Trigger** | No (manual) | Yes (integrated API) |
| **Interac Support** | ❌ None (US-centric) | ✅ Full (Canada-first) |
| **Settlement Rate** | ~40% (manual friction) | ~85%+ (one-click) |
| **Recurring Settlement** | ❌ No | ✅ Yes (premium) |
| **Cost to User** | Free | $2.99/month (premium) |
| **Market Fit** | Global (Venmo in US) | Canada-specific moat |

### Why This Matters

**Splitwise Weakness:** Venmo is US-only. Canadian Splitwise users must:
1. Open app
2. See $45 owed
3. Note the amount
4. Open banking app
5. Manually navigate to Interac
6. Enter email + amount
7. Send

**Even Us Up Advantage:** Premium users can:
1. Open app
2. Click "Settle with Interac"
3. Done (payor approves in their bank)
4. Real-time confirmation

**Result:** 2-3x higher settlement rate = retention, repeat usage, word-of-mouth growth

---

## Part 6: Risk Mitigation

### Risk 1: VoPay API Changes or Service Issues

**Mitigation:**
- Keep fallback to manual (email instructions still there)
- Monitor VoPay status page + API health
- Implement circuit breaker (if VoPay down, show "Manual settlement" option)
- Maintain SLA: 99.5% uptime target

### Risk 2: Regulatory/Compliance Issues

**Mitigation:**
- VoPay handles MSB/FINTRAC licensing (not our responsibility)
- Confirm: do we need Money Services Business (MSB) license?
  - If VoPay sends on our behalf: NO (VoPay is the MSB)
  - If we initiate but don't hold funds: NO
  - Get legal review before launch
- PCI-DSS: VoPay handles (we never touch payment details)

### Risk 3: Low Premium Adoption (Users stick with free)

**Mitigation:**
- Pre-launch testing: wireframe A/B tests with users
- Offer incentive: "50% off first 3 months" to drive trial
- Emphasize pain point: "No more manual Interac transfers"
- Bundle with household mode (Phase 3) for stickiness

### Risk 4: High COGS (VoPay fees squeeze margins)

**Mitigation:**
- Volume discounts: negotiate with VoPay at 500+ users
- Batch settlement mode: reduce per-tx fees
- Auto-deposit: lower fee if account already registered
- Fallback: offer "split the fee" option ($2.99 → user pays $1.50)

### Risk 5: User Confusion (Too many payment methods)

**Mitigation:**
- MVP: Interac only (simplest)
- Hide other rails until Phase 3
- Clear labeling: "Premium: Auto-settle via Interac" (not "Premium: More payment options")

---

## Part 7: Go-To-Market & Rollout

### Pre-Launch (Week 1-2)

1. **VoPay Account Setup** (1-2 days)
   - Sign up for developer account
   - Complete KYC (business info, tax ID)
   - Receive API keys + sandbox environment
   - Estimate: $0-500 setup fee (if any)

2. **Legal Review** (1 week)
   - Compliance check: MSB license needed?
   - Terms of Service review (Interac usage, user disclosures)
   - Privacy: confirm we don't store payment info
   - Get approval before going live

3. **Internal Testing** (1 week)
   - Full flow: request → approval → webhook → settlement
   - Error cases: rejection, timeout, cancellation
   - Mobile testing (embedded form responsiveness)
   - Stripe test mode: subscription creation + renewal

### Launch Week 1

**Rollout Strategy: Gradual (10% → 50% → 100%)**

- **Day 1:** Enable for 10% of premium users (control group)
- **Day 3:** Monitor for errors, collect feedback
- **Day 5:** Expand to 50% of premium users
- **Day 7:** Full rollout to all premium users
- **Rollback trigger:** >1% failure rate, critical bugs

**Support Readiness:**
- Support doc: "How to use Interac auto-settlement"
- FAQ: "Why did my settlement fail?" (with recovery steps)
- In-app help: Link to support from settlement modal
- Slack/Discord alerts for webhook failures

### Post-Launch (Weeks 2-4)

**Metrics to Track:**
- % of premium users attempting auto-settlement (target: 60%+)
- Success rate (target: 95%+)
- Time to settlement (target: <10 min mean)
- User feedback (support tickets, app reviews)
- Funnel drop-off (where do users bail?)

**Optimization Based on Feedback:**
- If success <95%: investigate VoPay integration issues
- If adoption <60%: improve marketing/messaging within app
- If time >10 min: likely VoPay or bank lag (expected, OK)

---

## Part 8: Success Metrics (90 Days)

You'll know this launch worked if:

| Metric | Current | Target | Tracking |
|--------|---------|--------|----------|
| Premium adoption | 0% | 15-20% | Subscription table |
| Premium settlement rate | 0% | 70%+ | interac_settlements table |
| Trial conversion | N/A | 35%+ | Stripe subscription events |
| Settlement speed | Manual (days) | <10 min | Timestamp diff in DB |
| System reliability | N/A | 98%+ uptime | VoPay status page + logs |
| User satisfaction | N/A | 4.5+ stars | In-app rating |
| Monthly recurring revenue | $0 | $500-1000 | Stripe reports |

**90-Day Revenue Projection:**
- 500 active users (from Phase 1 growth)
- 18% premium adoption (90 premium users)
- 60% actively using Interac (54 users)
- 80% monthly settlement rate (43 settlements/month)
- Revenue: 90 users × $2.99 = **$269/month** (conservative)
- **With households (Phase 3 bonus):** $500+/month

---

## Part 9: Future Extensions (Phase 3+)

### A. Households/Couples Mode
- Household subscription: $4.99/month
- Joint expense tracking + auto-settlement
- Shared budget analytics
- Target: 20% of premium users adopt

### B. Expense Receipt OCR
- Scan receipt → auto-create expense
- AI extracts items, amounts, items → auto-split
- Reduces manual expense entry by 80%
- Premium feature (upsell)

### C. Notification Preferences
- Push notifications for pending settlements (opt-in)
- Email digest: weekly settlement summary
- Reminder if settlement pending >3 days
- Premium: unlimited push, free: 1/week

### D. Analytics Dashboard
- "Settlement insights": who pays back fastest, slowest
- "Spending trends": by category, by friend
- "Household stats": total spent, per-person average
- Premium analytics module

---

## Implementation Checklist

### Backend
- [ ] VoPay API wrapper class
- [ ] Database migrations (interac_settlements, subscriptions)
- [ ] Webhook receiver + signature validation
- [ ] Subscription gating logic
- [ ] Error handling + retry (exponential backoff)
- [ ] Logging + monitoring setup
- [ ] Unit tests (all paths, mocks for VoPay)
- [ ] Integration tests (VoPay sandbox)

### Frontend
- [ ] Settlement modal: detect if user is premium
- [ ] If premium: show "Settle via Interac" button
- [ ] If free: show "Upgrade to settle automatically" CTA
- [ ] Loading state while request initializing
- [ ] Error message handling (VoPay failure reasons)
- [ ] Success toast: "Settlement initiated, awaiting approval"
- [ ] Real-time status update (webhook → app)
- [ ] Embedded form (iFrame sizing + responsiveness)

### Billing
- [ ] Stripe product + pricing setup
- [ ] Trial logic (14 days, auto-convert to paid)
- [ ] Subscription management UI (card change, cancel)
- [ ] Dunning (failed payment retry)
- [ ] Revenue recognition (Stripe reports)

### Operations
- [ ] VoPay account provisioning
- [ ] Sandbox testing complete
- [ ] Legal review passed
- [ ] Support documentation written
- [ ] Monitoring/alerting configured
- [ ] Rollout plan (10% → 50% → 100%)
- [ ] Rollback procedure documented

### Testing
- [ ] E2E: free user → upsell banner → trial signup → premium activated → settlement triggered
- [ ] Error case: settlement rejected by payor
- [ ] Error case: VoPay timeout (5+ min)
- [ ] Error case: webhook fails 3x (dead letter retry)
- [ ] Mobile: embedded form responsiveness
- [ ] Desktop: performance (request latency)

---

## Appendix A: VoPay Integration Example (Pseudocode)

```javascript
// settlement.service.ts

class InteracSettlementService {
  private vopayClient = new VoPayClient(API_KEY);

  async initiateSettlement(settlement: Settlement): Promise<InteracRequest> {
    // 1. Validate settlement amount (must be <$3000 for Request Money)
    if (settlement.amount > 300000) { // cents
      throw new Error('Amount exceeds $3000 limit');
    }

    // 2. Create VoPay money request
    const vopayRequest = await this.vopayClient.createMoneyRequest({
      requestedAmount: settlement.amount,
      currencyCode: 'CAD',
      sourceParty: {
        email: settlement.creditorEmail,
        name: settlement.creditorName,
      },
      destinationParty: {
        email: settlement.debtorEmail,
        name: settlement.debtorName,
      },
      description: `Even Us Up: ${settlement.groupName}`,
      externalReference: settlement.id,
      generateURL: true, // For embedded form
    });

    // 3. Store in DB
    await db.interacSettlements.create({
      settlementId: settlement.id,
      vopayRequestId: vopayRequest.transactionId,
      userEmail: settlement.debtorEmail,
      payeeEmail: settlement.creditorEmail,
      amount: settlement.amount,
      status: 'pending',
      embeddedUrl: vopayRequest.embeddedUrl,
    });

    // 4. Return to frontend
    return {
      requestId: vopayRequest.transactionId,
      embeddedUrl: vopayRequest.embeddedUrl,
      status: 'pending',
    };
  }

  async handleWebhook(payload: VoPayWebhook) {
    // 1. Verify signature
    if (!this.verifySignature(payload)) {
      throw new Error('Invalid webhook signature');
    }

    // 2. Find settlement by VoPay request ID
    const interacSettlement = await db.interacSettlements.findOne({
      vopayRequestId: payload.transactionId,
    });

    if (!interacSettlement) {
      console.warn(`Unknown VoPay request: ${payload.transactionId}`);
      return;
    }

    // 3. Update status
    if (payload.eventType === 'REQUEST_FULFILLED') {
      await db.interacSettlements.update(interacSettlement.id, {
        status: 'fulfilled',
        fulfilledAt: new Date(payload.completedAt),
      });

      // 4. Mark settlement as paid
      await db.settlements.update(interacSettlement.settlementId, {
        status: 'paid',
        paidMethod: 'interac',
        paidAt: new Date(),
      });

      // 5. Send notification
      await notify.sendEmail(interacSettlement.userEmail, {
        template: 'settlement_approved',
        data: {
          payee: interacSettlement.payeeEmail,
          amount: interacSettlement.amount,
        },
      });
    } else if (payload.eventType === 'REQUEST_FAILED') {
      await db.interacSettlements.update(interacSettlement.id, {
        status: 'failed',
        failureReason: payload.failureReason,
      });
    }
  }
}
```

---

## Appendix B: Interac Ecosystem (Regulatory Context)

**Key Players:**
- **Interac Corp** (Canadian Crown, owns e-Transfer network)
- **Participating Banks:** RBC, TD, BMO, Scotiabank, CIBC, Desjardins, etc.
- **Payment Service Providers (PSP):** VoPay, Paysafe, Wise, RBC eCommerce, etc.

**Licensing:**
- To process Interac: typically need MSB license (Money Services Business)
- VoPay is the MSB, we're the Merchant ✅ (no extra licensing needed)
- Ensure terms of service allow: integration, automation, automated requests

**Limits & Regulations:**
- Per-transaction limit: $3,000 (Request Money) / $25,000 (Send)
- Daily limit per bank: varies ($2,500-$25,000 depending on bank)
- Fraud protection: Interac backs all transactions (liability shift to customer if not approved)

**Competition Bureau Monitoring:**
- Interac processing fees are under regulatory review (as of Q3 2025)
- Unlikely to affect API pricing in short term
- Good time to lock in pricing agreements with VoPay

---

## Success Criteria for Phase 2

**Must-Have for Launch:**
- ✅ VoPay Request Money API integration (email-based)
- ✅ Webhook handler + real-time settlement updates
- ✅ Premium tier gating (free users can't use)
- ✅ Stripe subscription integration
- ✅ Legal/compliance review passed
- ✅ 98%+ settlement success rate in testing

**Nice-to-Have for Launch:**
- Embedded form (can add Week 2)
- Auto-deposit mode (defer to Phase 2B)
- Batch settlements (defer to Phase 3)

---

## Next Steps

1. **Approve Architecture** (Joe decision)
   - Do we proceed with VoPay + Stripe + Premium tier?
   - Any cost concerns? (We own COGS, users own VoPay fee)
   - Timeline acceptable? (8-10 weeks Phases 2A-2C)

2. **VoPay Account Setup** (Alfred action)
   - Apply for developer account
   - Get API keys
   - Set up sandbox environment
   - Cost estimate from sales team

3. **Legal Review** (Joe or counsel)
   - MSB license needed?
   - ToS review with VoPay
   - Privacy implications (confirm: we don't store payment details)

4. **Engineering Kickoff** (When approved)
   - Phase 2A: 3-week sprint (core integration)
   - Phase 2B: 2-week sprint (billing)
   - Phase 2C: 2-week sprint (UX polish)
   - Launch: Week 8 (after Phase 1 is stable)

---

**Prepared by:** Alfred  
**Date:** 2026-03-27  
**Status:** Ready for Architecture Review  
**Recommendation:** Proceed with VoPay + Premium tier (highest ROI, lowest risk, Canadian moat)
