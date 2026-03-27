# Even Us Up: Interac e-Transfer Settlement Gateway
## Implementation Guide & Architecture

**Version:** 1.0  
**Status:** Phase 1 MVP Ready for Development  
**Target Launch:** Week of April 24, 2026 (4 weeks)  
**Owner:** HAL (development) + Alfred (QA + integration)

---

## 📋 Quick Start

### What is this?

Even Us Up's new **settlement closure feature** — users settle debts directly through the app using Interac e-Transfer without manually leaving to their banking app.

**Current State:** Users manually send Interac transfers outside the app = no closure tracking, no receipt, limited retention.

**Solution:** In-app settlement with Interac Direct = user requests settlement → payer sends via their bank → confirmation in app → closure + receipt tracking.

### Three Phases

| Phase | Timeline | Feature | Revenue |
|-------|----------|---------|---------|
| **1 - MVP** | 4 weeks | Register Interac email → Request settlement → Manual confirm | Free (build user base) |
| **2 - Auto-Send** | 2 weeks | VoPay API integration → Auto-send Interac transfers | Free (feature demo) |
| **3 - Premium** | 2 weeks | Freemium tier ($2.99/mo) → Auto-settle + analytics | Revenue ($300-500/mo initial) |

**This document covers Phase 1 only.**

---

## 🏗️ Architecture Overview

### System Flow (MVP)

```
User A (in app)
    ↓
    ├─ Register Interac email ("Register for Settlement")
    ├─ KYC email verification (1-2 min)
    ├─ Settlement methods saved
    ↓
Settle debt ($50 owed by User B)
    ↓
    ├─ Create settlement request
    ├─ System generates reference # (EUU-20260327-ABC123)
    ├─ Show QR code + payment link
    ├─ User can share link or tell User B
    ↓
User B (external to app)
    ↓
    ├─ Click link or enter reference #
    ├─ Open their bank app → Interac transfer
    ├─ Amount: $50, Ref: EUU-20260327-ABC123
    ├─ Send transfer to User A's registered email
    ↓
User A (back in app)
    ↓
    ├─ Settlement status still "pending" (manual confirm)
    ├─ Option 1: Click "I've been paid" → enter confirmation #
    ├─ Option 2: Wait for webhook (Phase 2, auto-confirm)
    ├─ Status → CONFIRMED
    ├─ Receipt: Date, amount, reference #, confirmation time
    ↓
Dashboard
    ├─ Settlement history visible
    ├─ Closure loop complete (metrics for retention)
```

### Database Schema (Summary)

**Four new tables:**

1. **settlement_methods** — User's registered payment methods (Interac email, status)
2. **user_kyc** — KYC verification (email, phone, DOB, status)
3. **settlement_requests** — Individual settlement transactions (from/to, amount, status)
4. **compliance_events** — Audit log (for FINTRAC, optional Phase 2)

See `migrations/20260327_interac_settlement_schema.sql` for full details.

### Technology Stack

**Backend:**
- Supabase PostgreSQL + RLS policies
- Node.js + Express (new API routes) OR Supabase Functions
- TypeScript (strict mode)
- Email service: SendGrid or Resend (for KYC verification)

**Frontend:**
- React 18 + TypeScript + Zustand
- New components: KYCForm, SettlementModal, SettlementHistory, InteracSetup
- Mobile-first CSS (responsive to 375px)

**Testing:**
- Jest + React Testing Library (unit + integration)
- Cypress (E2E settlement flow)
- Supabase local emulator (DB testing)

---

## 📂 File Structure

### Phase 1 Deliverables

```
Expense_Sharing/
├── migrations/
│   └── 20260327_interac_settlement_schema.sql  # DB tables + RLS
├── types/
│   └── settlement.ts  # All TypeScript types
├── services/
│   ├── kyc.service.ts  # KYC verification logic
│   ├── settlement.service.ts  # Settlement creation + confirmation
│   └── compliance.service.ts  # Logging + FINTRAC prep
├── components/
│   ├── KYCForm.tsx  # Email verification form
│   ├── InteracDirectSetup.tsx  # Email/phone registration
│   ├── SettlementModal.tsx  # Create settlement request
│   ├── ManualConfirmation.tsx  # Confirm with reference #
│   └── SettlementHistory.tsx  # View past settlements
├── stores/
│   └── settlement.store.ts  # Zustand store (state mgmt)
├── pages/
│   ├── Settlement.tsx  # Settlement page (if separate route)
│   └── Settings/SettlementMethods.tsx  # Manage payment methods
├── __tests__/
│   ├── settlement.service.test.ts
│   ├── kyc.service.test.ts
│   └── e2e/settlement.cy.ts  # Cypress E2E tests
├── docs/
│   ├── SETTLEMENT_FLOW.md  # Architecture docs
│   ├── API_REFERENCE.md  # API endpoints
│   ├── KYC_COMPLIANCE.md  # Regulatory requirements
│   └── DEPLOYMENT.md  # Deployment steps
└── [existing files...]

/.openclaw/workspace/
├── migrations/
│   └── 20260327_interac_settlement_schema.sql  # SQL migration
├── types/
│   └── settlement.ts  # TypeScript definitions
└── projects/
    ├── interac-etransfer-gateway-spec.md  # Full spec
    ├── INTERAC_GATEWAY_README.md  # This file
    └── interac-gateway-mvp-handoff.json  # HAL handoff contract
```

---

## 🚀 Implementation Checklist

### Week 1: Schema + API Foundation

- [ ] Run SQL migration (settlement_methods, user_kyc, settlement_requests, compliance_events)
- [ ] Verify RLS policies work (test user isolation)
- [ ] Create settlement.ts types (✅ already done)
- [ ] Stub out API routes (create empty handlers)
- [ ] Set up email service (SendGrid or Resend)
- [ ] Create Zustand settlement store

**Deliverable:** DB is live, API routes ready for implementation, no UI yet.

### Week 2: KYC + Settlement Creation

- [ ] Implement KYC form (email input + validation)
- [ ] Email verification flow (send code, verify code)
- [ ] Settlement method registration API
- [ ] Settlement request creation API (validate user has KYC)
- [ ] Generate reference # (EUU-20260327-ABC123 format)
- [ ] Add unit tests (>80% coverage for critical paths)

**Deliverable:** User can register Interac email and create settlement request (no manual confirmation yet).

### Week 3: Manual Confirmation + History

- [ ] Manual confirmation API (user enters reference #, updates status)
- [ ] Settlement history API (list past settlements)
- [ ] SettlementHistory component (table view, filters, receipts)
- [ ] Manual confirmation UI (enter reference # modal)
- [ ] Compliance events logging (triggered on status changes)
- [ ] Add E2E tests (Cypress: register → create settlement → confirm)

**Deliverable:** User can manually confirm settlement, view history, see receipts.

### Week 4: Polish + Testing

- [ ] Security audit (no PII leaks, RLS enforced)
- [ ] Performance testing (settlement history loads <1s for 50 items)
- [ ] Mobile testing (iOS + Android, 375px width)
- [ ] Accessibility (WCAG 2.1 AA: focus states, labels, keyboard nav)
- [ ] Documentation (user guide, API reference, deployment)
- [ ] Internal testing with real data (50+ settlements)
- [ ] Bug fixes + edge cases

**Deliverable:** MVP ready for QA + production deployment.

---

## 🔑 Key Features (Phase 1)

### 1. KYC Verification (Email-Only)

**What it is:** Users verify their email to enable settlements. Minimal data collection for MVP.

**Flow:**
1. User clicks "Set Up Settlement" → KYC form
2. Enter: email, phone (optional)
3. Send verification code to email
4. User enters code → status = verified
5. Can now request settlements

**Why email-only for MVP:**
- Faster to build (no SMS service integration)
- Lower compliance risk (no DOB/address required)
- Can expand to full KYC in Phase 2 if needed

### 2. Settlement Method Registration

**What it is:** User registers their Interac Direct email/phone so others can send them transfers.

**Flow:**
1. User provides: email (or phone)
2. System validates: not already used by another user
3. Status = "pending_kyc" → after KYC verified → "active"
4. User sees "✓ Interac Direct ready" on dashboard

### 3. Settlement Request Creation

**What it is:** User initiates settlement for a debt.

**Flow:**
1. User views balance ("You owe Alex $50")
2. Click "Settle" → Settlement modal
3. Shows: payer, payee, amount, settlement method
4. Click "Request Settlement"
5. System generates: reference # (EUU-20260327-A1B2C3D4)
6. Shows: payment link (shareable), QR code, instructions
7. Status = "pending"

### 4. Manual Confirmation

**What it is:** Payer sends Interac transfer, then payee confirms receipt.

**Flow:**
1. Payee receives settlement request notification (email or in-app)
2. Payee sends Interac transfer via their bank
3. Interac confirms: "Transfer sent to [email] with reference EUU-20260327-..."
4. Payee clicks "I've been paid" in app
5. Enters reference # from Interac confirmation
6. System validates reference (unique, not already used)
7. Status = "confirmed"
8. Receipt visible: date, amount, method, confirmation time

### 5. Settlement History

**What it is:** Users see all past settlements in one view.

**Features:**
- Table: Date | From | To | Amount | Method | Status
- Filters: status, method, date range
- Receipt view: click settlement → see full details
- Export (future): CSV for taxes

---

## 🔐 Security & Compliance

### Data Encryption

**At Rest:**
- Supabase encryption (default): email, phone, address, DOB in user_kyc
- Option: Enable column-level encryption for extra security

**In Transit:**
- HTTPS required (enforced by API gateway)
- No PII in logs or error messages

### RLS Policies

All tables have Row-Level Security:

```sql
-- Users can only view their own KYC
CREATE POLICY "Users view own KYC"
  ON user_kyc FOR SELECT
  USING (member_id = (SELECT id FROM members WHERE auth_user_id = auth.uid()));
```

**Test:** User A cannot query User B's settlement methods.

### Rate Limiting

- KYC attempts: max 5 per hour (prevents brute-force)
- Settlement creation: no limit (can create multiple)
- Manual confirmation: max 10 per hour (prevents spam)

### FINTRAC Compliance (Phase 2)

Phase 1 is low-risk:
- No high-value transactions (typical even splits < $1000)
- Personal use exemption likely applies
- Email-only KYC is soft verification

Phase 2 will add:
- Full KYC (DOB, address verification)
- Compliance event logging (already schema-ready)
- FINTRAC reporting (if transactions > $10,000)

---

## 🧪 Testing Strategy

### Unit Tests

**Target:** >80% coverage for critical paths

```typescript
// Example: settlement.service.test.ts
describe('Settlement Service', () => {
  it('should create settlement request', () => {
    // Test: valid input → settlement created with reference #
  });
  
  it('should validate recipient has active settlement method', () => {
    // Test: user without KYC → error
  });
  
  it('should prevent self-settlement', () => {
    // Test: from_member_id == to_member_id → error
  });
  
  it('should confirm settlement with valid reference', () => {
    // Test: manual_reference matches → status = confirmed
  });
});
```

### Integration Tests

```typescript
// DB → API → Frontend
describe('Settlement Flow', () => {
  it('should register Interac email and create settlement', () => {
    // 1. User KYC verify
    // 2. Register settlement method
    // 3. Create settlement request
    // 4. Verify DB state
  });
});
```

### E2E Tests (Cypress)

```typescript
// Cypress: settlement.cy.ts
describe('Settlement E2E', () => {
  it('user A settles with user B', () => {
    cy.login('userA');
    cy.visit('/groups/1/balance');
    cy.contains('Settle').click();
    cy.get('input[name="interac_email"]').type('userA@example.com');
    cy.contains('Send verification code').click();
    // ... verify email, create settlement, confirm
  });
});
```

### Test Data

Provided in `/tests/fixtures/settlement.ts`:
- 5 sample households
- 10 members
- 20 sample settlements (various statuses)
- KYC statuses: pending, verified, rejected

---

## 📱 User Interface

### KYC Form

```
┌─────────────────────────────────┐
│ Set Up Settlement               │
├─────────────────────────────────┤
│                                 │
│ Email (for Interac Direct)      │
│ ☐ joe@example.com              │
│                                 │
│ Phone (optional)                │
│ ☐ 506-555-1234                 │
│                                 │
│ ☐ I consent to settlement       │
│   processing                    │
│                                 │
│ [Send Verification Code]        │
│                                 │
└─────────────────────────────────┘
```

### Settlement Modal

```
┌─────────────────────────────────┐
│ Settle Debt                     │
├─────────────────────────────────┤
│                                 │
│ You owe Alex $50.00             │
│                                 │
│ Settlement Method               │
│ ◉ Interac Direct (Fast)         │
│ ○ Cash                          │
│ ○ Manual Bank Transfer          │
│                                 │
│ Recipient: alex@example.com     │
│                                 │
│ [Cancel]  [Request Settlement]  │
│                                 │
└─────────────────────────────────┘
```

After settlement created:

```
┌─────────────────────────────────┐
│ Settlement Request Sent         │
├─────────────────────────────────┤
│                                 │
│ Reference #: EUU-20260327-A1B2  │
│                                 │
│ [QR Code]                       │
│                                 │
│ Instructions:                   │
│ 1. Open your Interac app        │
│ 2. Send $50 to Alex             │
│ 3. Enter reference # in notes   │
│ 4. Alex confirms receipt        │
│                                 │
│ [Copy Reference] [Share Link]   │
│                                 │
└─────────────────────────────────┘
```

### Settlement History

```
┌──────────────────────────────────────────────────────────┐
│ Settlement History                                       │
├──────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Status ▼] [This Month ▼]               │
├──────────────────────────────────────────────────────────┤
│ Date       | From    | To      | Amount | Status    | . |
│ 2026-03-26 | Joe→Ali | $50.00  | ✓ Paid | Details   │ . |
│ 2026-03-25 | Ali→Joe | $30.00  | ⏳ Pend| Details   │ . |
│ 2026-03-24 | Joe→Bob | $25.50  | ✗ Fail | Retry     │ . |
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 API Endpoints (Phase 1)

All endpoints require authentication (JWT token).

### KYC Endpoints

```
POST /api/kyc/start
  Body: { full_name, email, phone, interac_email, consent }
  Response: { status: 'submitted', verification_sent: true }
  
POST /api/kyc/verify
  Body: { verification_code }
  Response: { status: 'verified', message: 'KYC complete' }
  
GET /api/kyc/status
  Response: { status, verified_at, attempts, ... }
```

### Settlement Method Endpoints

```
POST /api/settlement-methods/interac-direct
  Body: { interac_email, interac_phone, consent }
  Response: { id, status: 'active', method_type, ... }
  
GET /api/settlement-methods
  Response: [{ id, status, method_type, ... }, ...]
  
DELETE /api/settlement-methods/:methodId
  Response: { success: true }
```

### Settlement Request Endpoints

```
POST /api/settlements/create
  Body: { from_member_id, to_member_id, amount, settlement_method }
  Response: { id, payment_reference, status, message, next_step }
  
GET /api/settlements/:id
  Response: { id, status, amount, payment_reference, ... }
  
POST /api/settlements/:id/confirm
  Body: { manual_reference }
  Response: { status: 'confirmed', confirmed_at, ... }
  
GET /api/settlements/history
  Query: { household_id, status, limit, offset }
  Response: { settlements: [...], total_count, page, total_amount }
  
POST /api/webhooks/vopay
  [Stub for Phase 2 VoPay callbacks]
  Response: { received: true }
```

All responses include:
- `success: boolean`
- `error?: { code, message, details }` (if failed)
- Standard HTTP status codes (200, 400, 401, 422, 500)

---

## 🚢 Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review approved
- [ ] Security audit passed (no PII leaks)
- [ ] Performance tested (settlement history <1s)
- [ ] Staging environment tested end-to-end
- [ ] User documentation complete
- [ ] Privacy policy updated

### Deployment Steps

1. **Database Migration:**
   ```bash
   npx supabase migration up 20260327_interac_settlement_schema
   ```

2. **Deploy Backend:**
   ```bash
   git push origin release/interac-gateway-mvp
   # Triggers CI/CD → automatic deploy to staging
   # Manual approval for production
   ```

3. **Deploy Frontend:**
   ```bash
   npm run build
   npm run deploy
   # Vercel auto-deploys to production
   ```

4. **Feature Flag (Rollout):**
   - Day 1: 10% of users
   - Day 3: 50% of users
   - Day 5: 100% of users

### Rollback Plan

If critical issues:
```bash
# DB: Can't rollback (settlement data exists)
# Instead: disable feature flag + hotfix

# Backend: Previous version still available
git revert <commit>
npm run deploy

# Frontend: Cached version available
# Redeploy previous build from Vercel dashboard
```

---

## 📊 Success Metrics

### MVP Launch (Week 4)

| Metric | Target | Why |
|--------|--------|-----|
| KYC completion rate | >70% | Users enable settlement |
| Settlement request volume | 100+ in first week | Usage signal |
| Manual confirmation adoption | >50% | Users confirm manually |
| Error rate | <1% | System stability |
| Load time (settlement history) | <1s | Performance baseline |

### Month 1

| Metric | Target | Why |
|--------|--------|-----|
| Churn reduction | +10% | Settlement closure improves retention |
| Repeat settlement users | >30% | Users settle multiple debts |
| Support tickets (settlement) | <5/week | UX is intuitive |
| Payment success rate | >90% | Manual confirmation works |

### Month 2

| Metric | Target | Why |
|--------|--------|-----|
| Settlement method adoption | >40% of households | Feature becoming popular |
| Average settlement closure time | <24h | Users confirming quickly |
| Premium interest (survey) | >5% mention auto-settle | Phase 2 demand signal |

---

## 🐛 Known Limitations (Phase 1)

1. **Manual Confirmation Required:** Payer must manually send Interac transfer. Phase 2 auto-sends.
2. **Email-Only KYC:** No DOB, address, phone verification. Phase 2 adds full KYC.
3. **No Retry Logic:** Failed settlements can't be automatically retried. User must create new request.
4. **No Bulk Settlement:** Can't settle multiple debts at once. Phase 3 feature.
5. **Canada-Only:** Interac Direct is Canada-specific. No US expansion yet.
6. **No Currency Conversion:** CAD only. Phase 4 feature.

---

## 📞 Support & Troubleshooting

### Common Issues

**"KYC email not arriving"**
- Check spam folder
- Try resending code (max 5 attempts/hour)
- Contact support if persistent

**"Settlement reference not found"**
- Double-check reference # from Interac confirmation (case-sensitive)
- Ensure Interac email matches registered email
- Try again in 1-2 minutes (system sync delay)

**"Can't register settlement method"**
- Ensure email is valid and not already registered
- Check if account is in good standing (no fraud flags)

---

## 🗺️ Roadmap

**Phase 2 (Weeks 5-6):** Auto-send via VoPay API  
**Phase 3 (Weeks 7-8):** Premium tier + analytics  
**Phase 4 (May 2026):** Multi-rail (PayPal, crypto), FINTRAC reporting  

---

## 📚 Additional Resources

- **Full Specification:** `projects/interac-etransfer-gateway-spec.md`
- **Handoff Contract:** `goals/handoffs/interac-gateway-mvp-handoff.json`
- **DB Schema:** `migrations/20260327_interac_settlement_schema.sql`
- **Types:** `types/settlement.ts`

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-27 21:45 ADT  
**Status:** Ready for development (awaiting Joe approval)
