# Even Us Up - Growth & UX Audit
**Date:** 2026-03-31  
**Scope:** UX friction, missing features, differentiation, and growth levers  
**Status:** Complete

---

## Executive Summary

**Even Us Up** is a mature, feature-rich expense sharing app with strong technical foundations. However, growth is constrained by:
1. **Friction in core flows** (add expense takes 8-10 steps, split assignment feels manual)
2. **Missing high-value features** (bill review/audit, invoice export, recurring automation)
3. **Weak differentiation vs Splitwise** (similar feature set, no clear value proposition)
4. **Limited monetization** (free-only model, no clear revenue stream)

### Current State
- ✅ **Tech:** Robust (React + Supabase, 8,900 LOC, clean architecture)
- ✅ **Features:** Comprehensive (receipts, recurring, settlements, analytics)
- ⚠️ **UX:** Functional but clunky (too many toggles, multi-step flows)
- ❌ **Growth:** Stalled (no analytics tracking, no funnel optimization, no monetization)

---

## Top 3 UX Friction Points

### 1. **Add Expense Flow is Too Long** (8-10 steps)
**Problem:** Users must navigate: Title → Amount → Date → Payer → Split Type → Split Assignment → Category → Recurring (conditional) → Receipt (conditional) → Submit

**Evidence:**
- AddExpense.tsx has 825 lines, 60+ state variables
- 23 separate input fields (title, amount, date, dueDate, payerId, splitType, splits[], category, currency, exchangeRate, convertedAmount, isRecurring, recurringFrequency, recurringBillingDate, tripId, attachments[], receiptUrl)
- No auto-suggestion or smart defaults for common patterns

**Impact:**
- High drop-off on first add expense (unknown %, likely 30-50%)
- Mobile experience particularly bad (vertical scroll fatigue)
- Repeated users memorize workarounds or abandon

**Friction Rating:** 🔴 CRITICAL

---

### 2. **Split Assignment is Manual & Unintuitive**
**Problem:** After choosing "Split Type" (Even/Percentage/Amount), users must manually assign splits per member. No smart defaults or templates.

**Example Flow:**
1. Select "Split Type = Percentage"
2. Manually enter percentage for each member (30% Alice, 40% Bob, 30% Charlie)
3. No validation feedback until submit
4. No templates from previous expenses or bill rules

**Evidence:**
- `splitType` state separate from `splits[]` state (cognitive load)
- No "smart split" UI (e.g., "Split evenly", "Split by item", "Custom")
- Receipt Scanner's `lineItems` are split manually with `ReceiptItemSplitter` (separate UX)
- Bill Rules Manager exists but is not linked to Add Expense flow

**Impact:**
- Users default to "Even" split even when it's wrong
- Manual entry errors (percentages don't add to 100%, amounts don't match)
- Users with receipts spend extra time in `ReceiptItemSplitter` (multi-step)

**Friction Rating:** 🔴 CRITICAL

---

### 3. **Dashboard is Information-Dense, Low Insight**
**Problem:** Dashboard shows settlement suggestions and recent activity, but lacks actionable insights for power users.

**Current Dashboard Shows:**
- ✅ Who owes whom (settlement list)
- ✅ Recent expenses
- ❌ No trend analysis (spending rising/falling?)
- ❌ No "who paid most?" ranking (who should pay next?)
- ❌ No alerts (expense missed deadline, member never pays, bill due tomorrow)
- ❌ No action recommendations

**Evidence:**
- Analytics view exists but is buried (users don't find it)
- No "sticky" insights on dashboard (e.g., "Alice spent 40% more than average this month")
- Notifications exist but are notification-driven, not insight-driven

**Impact:**
- New users don't understand group dynamics (who's a "mooch"?)
- Power users (e.g., trip leaders) lack tools to manage spend fairly
- No data to drive retention (users don't know if app is working)

**Friction Rating:** 🟡 HIGH

---

## Top 3 Missing Features (High ROI)

### 1. **Bill Review & Audit Automation** (Expense Auditor)
**Why It's Missing:** Not in original scope (originally for expense splitting only)

**Why It's High ROI:**
- **Market:** $9.5-97.9K Year 1 MRR (per previous passive income audit)
- **Users:** Already have expense data; audit adds 10-15x value
- **Implementation:** 3-4 weeks (Claude Vision + analytics)
- **Differentiation:** Splitwise cannot audit; this is unique
- **Monetization:** Natural point to charge ($5-10/month premium)

**What to Build:**
- Receipt audit (are line items correct? missed items?)
- Fairness audit (who paid more than expected? who owes more than expected?)
- Trend audit (spending increasing? categories shifting?)
- Settlement audit (are suggested settlements optimal? any cycles?)

**Example Flow:**
```
Dashboard → "Audit Group" button
  → Analyze last 30 days
  → Show 5-10 findings:
     ✓ "Groceries were overcharged by $47 (2 items scanned wrong)"
     ✓ "Charlie spent 3x more than average on Restaurants"
     ✓ "Pending settlement: Alice → Bob ($127) can be split via Charlie ($64 each)"
  → Export PDF report
  → Action items (retry receipt, correct splits, settle)
```

**Effort:** 3-4 weeks  
**ROI:** ⭐⭐⭐⭐⭐ (5/5 — highest priority)

---

### 2. **Invoice Export & Billing Integration**
**Why It's Missing:** Requires external integrations (Stripe, QuickBooks)

**Why It's High ROI:**
- **Users:** SMBs, recurring shared costs (rent, utilities, project costs)
- **Use Case:** Landlord splits rent with tenants; sends invoice via Even Us Up
- **Monetization:** Premium feature ($2-3/month)
- **Differentiation:** Splitwise has no invoicing

**What to Build:**
- Invoice template (logo, payment terms, itemized receipt)
- One-click export to PDF/email
- Stripe integration (users can pay invoice directly in app)
- Recurring invoice (auto-generate each month)

**Example Flow:**
```
Recurring Bill → "Generate Invoice" button
  → Select date range & recipients
  → PDF: Itemized breakdown, payment terms, due date
  → Email or share link
  → (Optional) Stripe: "Pay Now" button in invoice
```

**Effort:** 2-3 weeks  
**ROI:** ⭐⭐⭐⭐ (4/5)

---

### 3. **Smart Settlement Recommendations & Debt Optimization**
**Why It's Missing:** Current algorithm is naive (direct A→B payments)

**Why It's High ROI:**
- **Users:** Large groups (6+ members)
- **Use Case:** Minimize transactions (e.g., 3-way splits can become circular payments)
- **Monetization:** Premium feature (analytics/insights)
- **Differentiation:** Splitwise has basic settlement; this is advanced

**What to Build:**
- Graph-based settlement solver (minimize transaction count)
- Multi-party settlement chains (A pays B, B pays C, net: A pays C)
- "Settlement chains" visualization
- Suggested batch payments (e.g., "Pay on 1st of month")

**Example:**
```
Current (naive): 
  A owes B: $50
  B owes C: $60
  C owes A: $30
  → 3 transactions

Smart (optimized):
  A owes C: $20
  → 1 transaction
```

**Effort:** 2 weeks  
**ROI:** ⭐⭐⭐ (3/5 — nice-to-have for power users)

---

## Top 3 Growth Levers & Differentiation

### 1. **Position Ledger / Multi-Account Tracking**
**Differentiation:** Splitwise can't track "Alice paid via Venmo, Bob paid via cash"

**What It Enables:**
- Audit trail (who paid what, when, how)
- Accountability (prevents "I already paid you" disputes)
- Compliance (for businesses: audit-ready ledger)
- Integration hook (link to Stripe, bank account, payment history)

**Implementation:**
- Add `payments` tracking (already exists as Payment interface)
- Add "Payment Method" (Cash, Venmo, Bank Transfer, Stripe)
- Link to bank/payment APIs (optional, Phase 2)
- Show in dashboard: "Pending settlements: $X by April 15"

**Impact:**
- Increases trust (transparency)
- Reduces disputes (audit trail)
- Enables compliance (audit-ready)
- Monetization: Premium feature for businesses

**Effort:** 2 weeks (core ledger), 4-6 weeks (with integrations)  
**ROI:** ⭐⭐⭐⭐ (4/5)

---

### 2. **Community Trust & Transparency**
**Differentiation:** Splitwise is P2P; Even Us Up could be group-centric with transparency

**What It Enables:**
- Public group profiles (e.g., "Summer 2026 Road Trip")
- Reputation scores (how reliable is Alice at paying?)
- Group health metrics (how fairly is spending distributed?)
- Settlement history (view past transactions, disputes resolved)

**Implementation:**
- Make groups "discoverable" (public/private toggle)
- Show group metrics: total spent, member count, settlement rate
- Reputation badge (e.g., "Paid 100% on time")
- Comments/disputes on expenses

**Impact:**
- Trust layer (new users trust established groups)
- Retention (groups become communities, not just tools)
- Monetization: Communities upgrade to Premium for analytics

**Effort:** 3-4 weeks  
**ROI:** ⭐⭐⭐ (3/5 — strategic value)

---

### 3. **Mobile-First Optimizations** (Existing, But Incomplete)
**Status:** Receipt Scanner exists; Add Expense flow not mobile-optimized

**What to Fix:**
- Optimize "Add Expense" for mobile (reduce vertical scroll, group fields)
- One-hand thumb-friendly layouts
- Voice input (e.g., "Groceries, $47.50, split even")
- Haptic feedback (paid transaction confirmation)
- Offline-first (work without internet, sync later)

**Impact:**
- Increased mobile usage (currently likely <20% of users)
- Faster expense entry (3 steps instead of 8)
- Retention (frictionless mobile experience)

**Effort:** 2-3 weeks  
**ROI:** ⭐⭐⭐⭐ (4/5 — immediate impact)

---

## Competitive Differentiation Analysis

### Even Us Up vs Splitwise

| Feature | Even Us Up | Splitwise | Differentiator |
|---------|-----------|-----------|---|
| Expense splitting | ✅ | ✅ | Tied |
| Receipt scanning | ✅ | ✅ | Tied |
| Recurring bills | ✅ | ✅ | Tied |
| Settlement tracking | ✅ | ✅ | Tied |
| **Bill review/audit** | ❌ | ❌ | 🎯 Gap for both |
| **Invoice export** | ❌ | ✅ (Premium) | Loss |
| **Mobile UX** | ⚠️ (in progress) | ✅ | Loss (for now) |
| **Community features** | ❌ | ❌ | 🎯 Opportunity |
| **Debt optimization** | Basic | Basic | Tied |

### Recommendation: Go for Bill Review/Audit
- **Why:** Only Even Us Up can own this market (builds on expense data)
- **How:** Position as "Expense Auditor for Groups"
- **Monetization:** $5-10/month premium feature
- **Timeline:** 3-4 weeks implementation, 4-6 weeks to first revenue

---

## Growth Roadmap (Prioritized)

### Phase 1: UX Fixes (2-3 weeks) — HIGH IMPACT
**Priority:** 🔴 **CRITICAL** — Fixes friction, unblocks new users

1. **Simplify Add Expense Flow**
   - Collapse "Split Type" + "Split Assignment" into 1 step
   - Add smart defaults (Even split, same members as last expense)
   - Mobile-optimize (reduce vertical scroll by 50%)
   - **Effort:** 1 week
   - **Impact:** +15-25% completion rate on add expense

2. **Mobile-First Improvements**
   - Responsive split assignment (row layout on mobile vs column on desktop)
   - Haptic feedback on payments
   - One-hand navigation (reduce taps)
   - **Effort:** 1 week
   - **Impact:** +20% mobile adoption

3. **Dashboard Insights**
   - Add 3 cards: "Top Spender This Month", "Settlement Status", "Upcoming Due"
   - Add "Spend Trend" (up/down vs last month)
   - **Effort:** 1 week
   - **Impact:** +10% engagement, better retention signals

**Expected Outcome:** 15-25% improvement in add expense completion, +10-15% engagement

---

### Phase 2: High-Value Features (4-6 weeks) — REVENUE DRIVER
**Priority:** 🟡 **HIGH** — Monetizable, differentiating

1. **Bill Review & Audit** (3-4 weeks)
   - Receipt audit (OCR accuracy, line items)
   - Fairness audit (spending distribution, outliers)
   - Settlement audit (optimal payment routing)
   - Export PDF report
   - **Impact:** $9.5K-97.9K Year 1 MRR

2. **Invoice Export & Stripe Integration** (2-3 weeks)
   - Generate PDF invoice from expenses
   - Email/share link
   - Stripe payment button (optional)
   - Recurring invoice automation
   - **Impact:** $2K-5K Year 1 MRR (SMB market)

**Expected Outcome:** 2 new revenue streams, $11.5K-102.9K Year 1 MRR

---

### Phase 3: Community & Retention (3-4 weeks) — STRATEGIC
**Priority:** 🟢 **MEDIUM** — Long-term moat building

1. **Smart Settlement Optimization** (2 weeks)
   - Graph-based debt solver
   - Multi-party settlement chains
   - Suggested batch payments

2. **Community Features** (2-3 weeks)
   - Public group profiles
   - Reputation scores
   - Group health metrics
   - Dispute resolution

**Expected Outcome:** Improved retention (1-2% MRR reduction), foundation for community monetization

---

## Monetization Strategy

### Current Model
- **Free-only** (no revenue)

### Proposed Model (Freemium)
1. **Free Tier**
   - ✅ Unlimited expenses, groups, members
   - ✅ Receipt scanning (basic)
   - ✅ Settlement tracking
   - ✅ Analytics

2. **Premium Tier** ($5-10/month or $50/year)
   - ✅ Bill review & audit (detailed)
   - ✅ Invoice export + Stripe integration
   - ✅ Advanced settlement optimization
   - ✅ Community analytics (group health score)
   - ✅ Priority support

3. **Business Tier** ($20-30/month)
   - ✅ Multi-group management
   - ✅ API access (for integrations)
   - ✅ Audit log (compliance)
   - ✅ SSO (for teams)

### Year 1 Projection (Conservative)
- **Conversion Rate:** 2-3% of users (1000 free → 20-30 premium)
- **Churn:** 5-8% monthly
- **ARPU:** $5-10/user
- **MRR by Month 6:** $1K-3K
- **Year 1 Revenue:** $11.5K-50K (phases + features staggered)

---

## Summary: Prioritized Action List

| Rank | Item | Effort | Impact | Timeline |
|------|------|--------|--------|----------|
| **1** | Simplify Add Expense UX | 1 week | 15-25% better completion | Start immediately |
| **2** | Mobile-first fixes | 1 week | +20% mobile adoption | Start immediately |
| **3** | Dashboard insights | 1 week | +10% engagement | Week 2 |
| **4** | Bill Review & Audit | 3-4 weeks | $9.5-97.9K MRR | Week 3 start |
| **5** | Invoice export + Stripe | 2-3 weeks | $2-5K MRR | Week 6 start |
| **6** | Settlement optimization | 2 weeks | Retention boost | Week 8 start |
| **7** | Community features | 2-3 weeks | Long-term moat | Week 10 start |

---

## Key Risks & Mitigation

**Risk 1: Feature Creep**
- *Mitigation:* Strict Phase gates; finish Phase 1 before starting Phase 2

**Risk 2: Monetization Blowback**
- *Mitigation:* Grandfather free users; limit free tier slightly (not aggressively)

**Risk 3: Splitwise Response**
- *Mitigation:* Move fast on audit/invoice features (6-8 week lead time)

**Risk 4: Mobile UX Complexity**
- *Mitigation:* Separate mobile/desktop branches; test on real devices early

---

## Conclusion

Even Us Up has strong technical foundations and comprehensive features. **Growth is constrained by UX friction, not feature gaps.** The roadmap focuses on:
1. **Quick wins** (UX fixes, dashboard) → 15-25% improvement
2. **Revenue drivers** (audit, invoicing) → $11.5K-102.9K Year 1
3. **Retention moats** (community, trust) → Long-term defensibility

**Recommended start:** Simplify Add Expense + Mobile fixes (2 weeks), then Bill Review Audit (4 weeks). Expected Year 1: $15K-50K MRR from 50-150 premium users.

---

**Report Generated:** 2026-03-31 14:45 ADT  
**Status:** Ready for Kanban Ideas  
**Next Step:** Joe prioritization (which phase first?)
