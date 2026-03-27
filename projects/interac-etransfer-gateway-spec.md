# Even Us Up: Interac e-Transfer Settlement Gateway
## Technical Implementation Specification v1.0

**Card ID:** task_1774645727467_321632ca  
**Target Timeline:** 6-8 weeks (phased rollout)  
**Status:** Specification & Research Phase  
**Date:** 2026-03-27

---

## Executive Summary

Integrate Interac e-Transfer settlement directly into Even Us Up to eliminate manual payment friction and create closure-loop tracking. This is a **Canadian moat** — Splitwise doesn't support Interac Direct; Interac is the default settlement method for 95% of Canadian households.

**Revenue Opportunity:** Freemium (free tracking) → Premium ($2.99/mo for auto-settlement + analytics) = $12-30k/yr per 500 users @ $6 ARPU.

**Competitive Advantage:**
- Fastest settlement path: "settle debt" → API auto-request → auto-deposit tracking (no manual Interac app)
- Closure loop: Settlement → confirmation → archive (improves retention & repeat settlement tracking)
- Canada-first positioning vs US-centric Splitwise

---

## Part 1: Canadian Payment Infrastructure

### 1.1 Interac Direct (Automatic Deposits)

**What it is:**
- Interac's API-driven payment method for *receiving* Interac transfers without manual security questions
- Allows automated deposits directly to user's bank account
- Already widely available through Canadian financial institutions

**How it works:**
1. Business/app (Even Us Up) registers with Interac Direct
2. Payer initiates transfer via Interac mobile banking → specifies receiver's registered email/phone
3. Receiver (if registered with Interac Direct) auto-deposits without security questions
4. Settlement completes in near-real-time (typically minutes)

**Key Facts:**
- **No security questions:** Interac Direct is friction-free for registered receivers
- **Payer experience:** Still uses their bank's Interac UI (natural for Canadians)
- **Receiver experience:** Automatic deposit, no app required
- **Cost:** Bank-dependent (many offer free Interac Direct registration for personal accounts; business fees vary $10-50/mo)

### 1.2 Interac Direct Registration Requirements

**For Even Us Up:**
- Register business with Interac Direct (requires: business license, registered bank account, compliance setup)
- Users opt-in to Interac Direct via app (consent + bank account linking)
- API to register/manage user settlement accounts

**For Users:**
- Link their Interac Direct account (email/phone already in system is sufficient)
- Opt-in to receive auto-deposits
- View settlement status in Even Us Up

### 1.3 Regulatory & Compliance

**FINTRAC (AML/KYC):**
- Know Your Customer (KYC) requirements
- Transaction reporting for transfers >$10,000
- Suspicious transaction reporting

**PCMLTFA (Proceeds of Crime/Money Laundering):**
- Customer due diligence (CDD)
- Record-keeping (transaction history, customer profiles)
- Compliance officer required for businesses processing settlements

**PCI-DSS:**
- NOT required for Interac Direct (no card data, only bank account routing)
- Bank account data still needs encryption in transit + at rest

**Implementation Path:**
1. Partner with acquiring bank (RBC, TD, BMO, Scotiabank, or fintech like Paysafe/VoPay)
2. Execute MSA (Merchant Service Agreement) with compliance schedule
3. Implement KYC flow for users
4. Set up transaction reporting to FINTRAC (if threshold met)

---

## Part 2: Technical Architecture

### 2.1 Integration Options

#### Option A: **VoPay Interac Direct (RECOMMENDED)**
- **Provider:** VoPay (Canadian fintech)
- **API:** RESTful, well-documented, sandbox available
- **What it does:** Abstraction layer over Interac Direct; handles KYC, settlement, webhook callbacks
- **Cost:** $0.25-0.75 per transaction (volume-based) + $50/mo setup
- **Setup time:** 2-4 weeks
- **Pros:** 
  - Full-featured (payout, validation, webhooks)
  - Canadian focus (built for Canadian use cases)
  - Sandbox for testing
  - Handles compliance reporting (FINTRAC integration optional)
- **Cons:** 
  - Per-transaction cost affects margin
  - Requires MSA + KYC on both sides

#### Option B: **Paysafe Interac**
- **Provider:** Paysafe (international payment platform)
- **API:** Robust, enterprise-grade
- **Cost:** $0.50-1.00 per transaction + $100/mo
- **Setup time:** 4-6 weeks
- **Pros:**
  - Mature platform, excellent docs
  - Handles multi-currency (if future expansion)
  - Strong compliance tooling
- **Cons:**
  - Higher cost than VoPay
  - Overkill for MVP (designed for high-volume B2B)

#### Option C: **Direct Bank Integration (Stripe, Wise, or banking APIs)**
- **Cost:** Variable ($0.25-1.50 per transaction)
- **Setup:** 6-12 weeks (regulatory review)
- **Pros:** Full control, lower long-term costs
- **Cons:** 
  - Requires full compliance build-out (FINTRAC, KYC, etc.)
  - High implementation cost initially

**RECOMMENDATION: VoPay for MVP (Phase 1), migrate to direct bank integration if volume justifies.**

### 2.2 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Even Us Up Frontend                    │
│  - Settlement modal ("Settle with Interac Direct")      │
│  - Recipient email/phone selector                        │
│  - Settlement status + receipt                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Even Us Up Backend (Supabase)                 │
│  - Settlement request creation & tracking              │
│  - User KYC status (verified/pending/failed)            │
│  - Settlement history + audit logs                      │
│  - Webhook receiver for payment confirmations           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         VoPay API (or Paysafe / Bank API)              │
│  - Initiate settlement request                          │
│  - Validate recipient (Interac Direct eligible)         │
│  - Poll/webhook for transaction status                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│       Interac Network (ACSS)                           │
│  - Settlement routing                                   │
│  - Fund transfer to recipient bank                      │
│  - Confirmation + clearing                             │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Data Model

**New/Extended DB Tables:**

```sql
-- Settlement Methods (existing, extend)
CREATE TABLE settlement_methods (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id),
  member_id UUID NOT NULL REFERENCES members(id),
  method_type ENUM('interac_direct', 'cash', 'bank_transfer', 'manual'),
  status ENUM('pending_kyc', 'active', 'suspended', 'failed'),
  
  -- Interac Direct specific
  interac_email VARCHAR(255),
  interac_phone VARCHAR(20),
  bank_account_id UUID, -- masked/encrypted in VoPay
  kyc_verified_at TIMESTAMP,
  kyc_failed_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Settlement Requests (new)
CREATE TABLE settlement_requests (
  id UUID PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id),
  from_member_id UUID NOT NULL REFERENCES members(id),
  to_member_id UUID NOT NULL REFERENCES members(id),
  amount DECIMAL(10, 2) NOT NULL,
  
  -- Settlement status
  status ENUM('pending', 'sent', 'confirmed', 'failed', 'cancelled'),
  settlement_method ENUM('interac_direct', 'cash', 'manual'),
  
  -- VoPay/Integration tracking
  external_id VARCHAR(255), -- VoPay transaction ID
  payment_reference VARCHAR(255), -- Reference number for user
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Audit
  notes TEXT,
  error_message TEXT,
  
  -- Metadata
  webhook_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- KYC / Compliance (new)
CREATE TABLE user_kyc (
  id UUID PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES members(id),
  status ENUM('pending', 'submitted', 'verified', 'rejected', 'suspended'),
  
  -- KYC data (encrypted)
  full_name VARCHAR(255),
  date_of_birth DATE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Interac Direct registration
  interac_email VARCHAR(255),
  interac_phone VARCHAR(20),
  
  -- Verification
  verification_method ENUM('email', 'sms', 'bank_account'),
  verification_token VARCHAR(255), -- For email/SMS verification
  verified_at TIMESTAMP,
  
  -- Rejection/Failure tracking
  rejection_reason TEXT,
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Events (for FINTRAC reporting)
CREATE TABLE compliance_events (
  id UUID PRIMARY KEY,
  event_type ENUM('kyc_submitted', 'kyc_verified', 'settlement_created', 'settlement_confirmed', 'high_value_transaction', 'suspicious_activity'),
  household_id UUID NOT NULL,
  member_id UUID,
  settlement_request_id UUID,
  
  amount DECIMAL(10, 2),
  description TEXT,
  risk_score INT, -- 1-100 (>80 triggers review)
  
  reported_to_fintrac BOOLEAN DEFAULT FALSE,
  report_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.4 API Endpoints (New)

```typescript
// Settlement Methods Management
POST   /api/settlement-methods/interac-direct
       Body: { interac_email, interac_phone, consent: true }
       → Initiates KYC flow

GET    /api/settlement-methods
       → List user's registered settlement methods

DELETE /api/settlement-methods/:methodId
       → Unregister settlement method

// Settlement Requests
POST   /api/settlements/create
       Body: { from_member_id, to_member_id, amount, settlement_method }
       → Creates settlement request (validates KYC, calls VoPay API)

POST   /api/settlements/:id/send
       → Initiates actual payment (calls VoPay to send Interac transfer)

GET    /api/settlements/:id
       → Fetch status (polls VoPay if still pending)

GET    /api/settlements/history
       Query: { household_id, limit, offset }
       → Settlement history + receipts

// Webhooks (for VoPay callbacks)
POST   /api/webhooks/vopay
       Body: { event: 'payment.confirmed' | 'payment.failed', ... }
       → VoPay → updates DB with settlement status

// KYC / Compliance
POST   /api/kyc/start
       Body: { full_name, dob, address, email, phone }
       → Submits KYC (can be auto-filled from household profile)

POST   /api/kyc/verify
       Body: { verification_code }
       → Confirms email/SMS verification

GET    /api/kyc/status
       → Check KYC status for current user
```

### 2.5 Frontend Components

**New React Components:**

```typescript
// Settlement Method Setup
<InteracDirectSetup />
  - Email input + phone input
  - Consent checkbox ("I authorize Even Us Up to...")
  - KYC flow (or redirect to KYC page if not verified)
  - Status indicator (pending/verified/failed)

// Settlement Initiation
<SettlementModal />
  - Show net balance ("Alice owes you $42.18")
  - Settlement method selector (Interac Direct / Cash / Manual)
  - Recipient email/phone (pre-filled if registered)
  - Amount input (read-only if single debt, editable if multiple)
  - Send button + confirmation
  - Status: pending → sent → confirmed

// Settlement History
<SettlementHistory />
  - Table of past settlements
  - Columns: Date, From, To, Amount, Method, Status
  - Filters: status, date range, method
  - Receipt view (reference #, timestamp, confirmation)

// KYC Flow
<KYCForm />
  - Full name, DOB, address
  - Email + phone verification
  - Auto-population from household profile (prefill)
  - Submission → email verification link
  - Status page: pending/verified/failed

// Dashboard Status
<SettlementStatus />
  - Integration indicator (green = Interac Direct active)
  - Pending settlement requests (show count)
  - Recent settlement history snippet
```

---

## Part 3: Implementation Roadmap

### Phase 1: MVP (Weeks 1-4) — Auto-Request + Manual Confirmation

**Goal:** Allow users to generate Interac settlement requests; payers send via their Interac app.

**Features:**
- Settlement method registration (Interac Direct email/phone)
- KYC verification (email verification only, basic)
- Settlement request creation (generate reference # + QR)
- Payment request link (sharable, payer can send direct transfer)
- Settlement confirmation (manual: user enters confirmation #; or webhook from bank)
- Receipt tracking (store transaction reference, timestamp)

**Not Included:**
- Auto-API settlement (still requires payer to use Interac app)
- Full compliance reporting (FINTRAC)
- Premium billing (free tier only)

**Deliverables:**
- Backend: KYC schema, settlement request creation, webhook receiver
- Frontend: Settlement method setup, settlement modal, history view
- Testing: E2E test for settlement flow (mock VoPay API)
- Docs: User guide for Interac Direct setup

**Effort:** ~80-100 hours
**Owner:** HAL (code) + Alfred (integration testing)

### Phase 2: API Settlement (Weeks 5-6) — VoPay Integration

**Goal:** Auto-send Interac transfers via VoPay API (no user Interac app required).

**Features:**
- VoPay API integration (payout endpoint)
- Auto-send settlement requests (1-click or scheduled)
- Webhook callbacks for status updates
- Recipient validation (ensure Interac Direct eligible)
- Error handling + retry logic (failed transfers)
- Settlement receipt with transaction ID

**Deliverables:**
- Backend: VoPay API client, auto-send logic, error handling
- Frontend: Auto-send button + status updates
- Integration testing: VoPay sandbox
- Docs: VoPay integration runbook

**Effort:** ~60-80 hours
**Owner:** HAL (VoPay client) + Alfred (integration + testing)

### Phase 3: Premium Features (Weeks 7-8) — Monetization

**Goal:** Launch Premium tier ($2.99/mo) for auto-settlement + advanced analytics.

**Features:**
- Premium tier (Supabase RLS, feature gating)
- Subscription UI (pricing modal, billing management)
- Auto-settle on confirmation (users can toggle auto-settle per group)
- Settlement analytics (monthly settlement count, avg amount, trends)
- Multi-method rail (cash + bank transfer options for non-Interac users)
- Settlement receipts + tax-friendly CSV export

**Deliverables:**
- Backend: Subscription schema, feature gating, billing integration (Stripe?)
- Frontend: Pricing page, subscription management, analytics dashboard
- Docs: Premium feature guide + billing terms

**Effort:** ~80-100 hours
**Owner:** HAL (subscription logic) + Alfred (frontend + Stripe integration)

---

## Part 4: Regulatory & Compliance Setup

### 4.1 FINTRAC Compliance

**Requirements:**
1. **Customer Due Diligence (CDD):**
   - Collect: Full name, DOB, address, email, phone
   - Verify: Email + phone (SMS or email link)
   - Store: Encrypted in DB, not shared with VoPay

2. **Transaction Reporting:**
   - If >$10,000 single transaction: Suspicious Activity Report (SAR) if warranted
   - If pattern of transfers >$10,000: Mandatory reporting
   - Keep logs for 5 years

3. **Beneficial Ownership:**
   - For household groups: No FINTRAC requirement (personal use exemption)
   - For business groups: May need UBO information

**Implementation:**
- KYC schema (see Part 2.3)
- Compliance events table (track reportable transactions)
- FINTRAC reporting module (if revenue justifies; can defer to Phase 4)

### 4.2 Privacy & Data Protection

**PIPEDA (Canada's privacy law):**
- Consent for data collection + settlement processing
- Right to access, correct, delete personal data
- Opt-out mechanism for auto-settlement

**Implementation:**
- Consent checkbox in KYC flow
- Privacy policy update (settlement + KYC data handling)
- Data export feature (GDPR-like, not required by PIPEDA but good practice)

### 4.3 Compliance Timeline

| Phase | Task | Timeline | Owner |
|-------|------|----------|-------|
| MVP | Basic KYC (email verification) | Week 1-2 | HAL |
| MVP | Compliance events logging | Week 3 | Alfred |
| Phase 2 | VoPay MSA + KYC submission | Week 5 | Joe (legal) |
| Phase 3 | FINTRAC reporting module | Week 8+ | Alfred (deferred) |

---

## Part 5: Success Metrics & Milestones

### 5.1 MVP Success Criteria

- [ ] Users can register Interac Direct method (>80% success rate)
- [ ] KYC email verification works (<2 min completion)
- [ ] Settlement request created + reference # shown to user
- [ ] Payment link shareable (copy/QR code)
- [ ] Manual confirmation flow works (user enters transaction #)
- [ ] Settlement history shows past 50 requests
- [ ] No PII leaks (encrypt bank data, phone, DOB)

### 5.2 Phase 2 Success Criteria

- [ ] VoPay API calls succeed (>95% success rate)
- [ ] Settlement auto-sent within 1 minute of request
- [ ] Webhook callbacks verified (settlement status updates)
- [ ] Failed transfer retry logic works (3 attempts, exponential backoff)
- [ ] User receives email confirmation + receipt link
- [ ] API costs track <$0.50/transaction

### 5.3 Business Metrics (Q2-Q3 2026)

**Month 1-2 (MVP Launch):**
- Settlement request volume: 100+ requests
- KYC completion rate: >70%
- Manual confirmation adoption: >50%
- Churn reduction: +10-15% (settlement closure loop)

**Month 3-4 (Phase 2 Launch):**
- Auto-settle adoption: >40%
- Premium tier signup: 5-10% of active households
- Settlement success rate: >95%
- Monthly revenue from Premium: $100-300 (initial)

**Month 5-6 (Optimization):**
- Premium adoption: 15-20%
- Settlement closure time: <24 hours (avg)
- Customer support tickets for settlement: <5/week
- Monthly revenue: $500-1500

---

## Part 6: Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **VoPay integration delays** | Phase 2 slips 2-4 weeks | Maintain manual confirmation as fallback; start VoPay integration early (Week 3 of MVP) |
| **FINTRAC compliance unknown** | Legal risk if reporting incomplete | Consult with compliance lawyer early (Week 1); use VoPay's built-in reporting |
| **High chargeback/fraud rate** | Premium tier unsustainable | Require KYC verification before settlement; monitor fraud patterns; use VoPay's fraud detection |
| **Low Premium adoption** | Revenue < $200/mo | A/B test pricing ($1.99 vs $2.99 vs $3.99); bundle with other features (analytics, budget tracking) |
| **Settlement failures not handled** | User frustration, churn | Implement robust retry logic; clear error messages; fallback to manual confirmation |
| **User data breaches** | PIPEDA violations, trust loss | Encrypt PII (use Supabase encrypted fields); rotate keys quarterly; audit access logs |
| **Interac Direct not eligible** | Some users can't register | Provide fallback: cash tracking or manual bank transfer; expand to other rails (PayPal) in Phase 4 |

---

## Part 7: Technical Stack & Dependencies

**Backend:**
- Supabase PostgreSQL (extended schema)
- Node.js + Express (new API routes)
- VoPay SDK (npm: `vopay-sdk` or REST client)
- Stripe (optional, for Premium billing)
- Email service: SendGrid or Resend (KYC verification emails)
- Encryption: `libsodium` or AWS KMS for PII

**Frontend:**
- React 18 + TypeScript (existing stack)
- New components: KYC form, settlement modal, history view
- State management: Zustand (extend settlement store)
- Form validation: Zod or React Hook Form

**Testing:**
- Jest + React Testing Library (unit + integration)
- Supabase local emulator (DB testing)
- VoPay sandbox (API testing)
- Cypress (E2E settlement flow)

**Monitoring:**
- Sentry (error tracking)
- LogRocket (session replay for support)
- Custom: compliance_events table + FINTRAC reporting dashboard

---

## Part 8: Go-Live Checklist

### Pre-Launch (Week 4)
- [ ] VoPay sandbox testing 95%+ pass rate
- [ ] KYC verification tested end-to-end
- [ ] Settlement request creation + manual confirmation working
- [ ] Payment history view showing all data correctly
- [ ] Security audit passed (PII encryption, no leaks)
- [ ] Privacy policy updated
- [ ] Support docs written (user guide + FAQ)
- [ ] Internal testing with real payment (test transaction with small amount)

### Launch Day
- [ ] Feature flag: settlement disabled for all users (launch in canary)
- [ ] Enable for 10% of households first (24h observation)
- [ ] Monitor: API error rates, KYC completion rate, settlement success rate
- [ ] Support team on standby
- [ ] Slack/Discord channel for status updates

### Post-Launch (Week 1)
- [ ] Expand to 50% of households (if metrics good)
- [ ] Gather user feedback (survey, support tickets)
- [ ] Monitor for fraud or abuse patterns
- [ ] Bug fixes + performance optimization

### Post-Launch (Week 2)
- [ ] Full rollout to all households
- [ ] Begin Phase 2 planning (VoPay API integration)

---

## Part 9: Future Expansions (Phase 4+)

**4.1: Multi-Rail Settlement**
- Crypto (Ethereum USDC, stablecoin)
- PayPal integration (for US expansion)
- Bank transfer (EFT) for larger settlements

**4.2: B2B Billing**
- Even Us Up for businesses (roommate groups → small business shared expenses)
- Recurring bill splitting (landlord collects rent, auto-splits utilities)

**4.3: Global Settlement**
- Cross-border Interac (not available yet)
- Wise or Remitly integration for cross-country payments

---

## Summary: What Joe Needs to Know

**In Plain English:**

1. **The Opportunity:** Canada's #1 complaint with Splitwise is "I have to send money outside the app." Even Us Up solves this by automating Interac e-Transfer directly in the app. This is a unique moat — Splitwise can't do this for Canada.

2. **The Business Model:** Free tier (track expenses) → Premium ($2.99/mo for auto-settlement + analytics) = sustainable revenue without ads or investor pressure.

3. **The Plan:**
   - **MVP (4 weeks):** Users register their Interac email, request settlement, generate reference #, payer sends via their bank, manually confirm. Zero API costs.
   - **Phase 2 (2 weeks):** Integrate VoPay to auto-send Interac transfers (1-click settlement). Cost: $0.25-0.75 per transaction.
   - **Phase 3 (2 weeks):** Launch Premium tier + analytics dashboard.

4. **The Compliance:** KYC (verify email + DOB) + FINTRAC reporting (if transactions >$10k). Doable, not a blocker. VoPay handles most of it.

5. **The Risk:** If users don't verify Interac Direct, they fall back to manual confirmation. Still better than Splitwise (zero integration).

6. **The ROI:** If 500 users @ $6 ARPU (annual revenue), Premium tier at 15% adoption = $450/mo passive income. Scale to 5,000 users = $4,500/mo.

---

## Next Steps

1. **Joe Review:** Confirm MVP scope + Phase priorities
2. **Legal:** Preliminary FINTRAC/PIPEDA review (low-risk personal use exemption likely applies)
3. **VoPay Discussion:** Confirm sandbox access + cost structure
4. **Engineering:** Kick off MVP (Week 1 = KYC schema + settlement request creation)

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-27 21:30 ADT  
**Status:** Ready for Joe review & approval
