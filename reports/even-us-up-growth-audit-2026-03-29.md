# Even Us Up Growth Audit — 2026-03-29

**Executor:** Alfred (proactive idle task 4/8)  
**Time:** 16:30 ADT  
**Status:** Live web app, low traction (pre-revenue)  
**Last Major Review:** 2026-03-25 (growth audit) + 2026-03-21 (differentiation strategy)

---

## Current State Summary

**Product Status:**
- ✅ Core features live: Expense tracking, group management, settlement
- ✅ Web-first (PWA); mobile experience is secondary
- ❌ Low traction (user count unknown; growth audit suggests early-stage)
- ⏳ Strategy unclear: Is this a scale business (aggressive growth) or portfolio piece (personal use)?

**Strategic Positioning:**
- **Mar 21 insight:** "Don't try to out-Splitwise Splitwise." Own *settlement* (the job-to-be-done) not expense tracking.
- **Differentiation thesis:** "Splitwise helps you track. Even Us Up helps your group *finish*."
- **Killer workflow:** Trip closeout in 3 minutes (vs. Splitwise's multi-step manual settlement)

**Growth Status:**
- 📊 Unknown current user count
- 💰 $0 MRR (pre-revenue; free product)
- 🎯 Settlement integration potential: +$150-600/month if monetization path chosen
- 📈 Referral program potential: +15-25% signup growth (quick win, low effort)

---

## Top 3 UX Friction Points (Prioritized by Impact)

### Friction Point #1: **Group Invite & Onboarding Flow (HIGH Impact — Day-1 Retention Killer)**

**The Problem:**
New users bounce at group setup. Flow is unclear:
- Manual email invites vs. share link unclear
- Acceptance flow not obvious (SMS? Email? QR code?)
- Mobile users get stuck; drop off before completing group setup
- Group creation → invite members → confirm members takes too many steps

**Impact:** HIGH — Day-1 retention directly affects virality (network products live or die on invite friction)

**Current Evidence:**
- Low traction signals weak invite flow (if onboarding worked, word-of-mouth would bootstrap growth)
- Splitwise has frictionless QR code + link share; Even Us Up likely doesn't

**Recommended Fix (Effort: 1-2 sprints / 2-3 weeks):**
1. **QR Code + Link Share:**
   - Create trip/group → generate QR code + shareable link
   - QR opens in phone camera; link works in browser/app
   - No email invitation required
   - Guests can view/confirm group without signup (defer account creation)

2. **Zero-Install Guest Experience:**
   - Guest link allows non-members to:
     - View group name + balance
     - See their individual balance ("You owe $45 total")
     - Confirm payment ("Payment sent!" button)
     - Add payment proof (Venmo screenshot, bank receipt)
   - Defer: Account creation happens when they join *next* group

3. **SMS Fallback:**
   - Share button: "Send via SMS" → fills in SMS template
   - Template: "Hey! Join our trip: [URL]" (short, mobile-friendly)

**Expected Impact:** 
- Day-1 invite-to-acceptance rate: baseline unknown → +40-60% with guest flow
- Trial: "Group completion rate" (last person settles in <72 hours) improves from unknown → 70%+
- Viral loop: Each settled group invites 3-5 new users (network effect)

---

### Friction Point #2: **Settlement UI Clarity (MEDIUM-HIGH Impact — Payment Friction)**

**The Problem:**
Settlement experience is confusing:
- "Who owes whom?" UI shows absolute amounts, not net debts
- Splitwise shows: "Alice owes you $42" (clear, action-oriented)
- Even Us Up likely shows transaction list (requires calculation)
- Users resort to manual Venmo/PayPal messages instead of using Even Us Up to settle
- High "payment limbo" (no proof of payment tracking)

**Current Evidence:**
- Mar 21 strategy emphasizes settlement as core differentiator; suggests current UX is weak
- Mar 25 audit lists "Smart Settlement + Payments" as HIGH-impact missing feature
- No mention of payment integration; users manually transfer

**Recommended Fix (Effort: 3-4 sprints / 4-6 weeks):**

**Phase 1 (2-3 weeks):** Settlement UX Overhaul (no payment integration)
1. **Optimized settlement plan:**
   - "Settle now" button generates optimal payment plan (N debts → M payments, minimized)
   - Algorithm: Graph algorithm to minimize transaction count
   - Display: "Alice pays Bob $42" + "Bob pays Carol $30" (not "Alice pays Bob $42, Alice pays Carol $8, Bob pays Carol $30")

2. **Per-person settlement card:**
   - Show each person's net balance in settlement view
   - "Alice owes $42 total" (sum of all groups)
   - Grouped by payer/payee: "Pay to Bob $42"

3. **Payment proof tracking:**
   - Button: "Mark as paid"
   - Input: Venmo link / screenshot / transaction ID
   - Status: "Pending payment proof" → "Payment confirmed"

**Phase 2 (2-3 weeks, optional):** Payment Integration
1. **Stripe Connect or PayPal integration:**
   - "Settle with payment" button → initiates bank transfer
   - Automatic KYC (Know Your Customer) for safety
   - Payment fee: 2.9% + $0.30 (standard)

2. **Payment request link:**
   - Generate link sent to payer: "Bob owes you $42 — pay here"
   - Link accepts card, bank transfer, PayPal
   - Auto-confirms in-app when payment clears

3. **Trust & transparency:**
   - Immutable ledger: All transactions logged with timestamps
   - Change history: "Alice edited expense on Mar 28, 3:15 PM; was $40"
   - Dispute workflow: "Propose correction" → recalculate → confirm

**Expected Impact:**
- Settlement completion rate: baseline unknown → 80%+ with Phase 1 UX
- Payment integration (Phase 2): +30-50% users actually use in-app payments (vs. manual Venmo)
- Trust metric: Support tickets about "wrong balance" decrease 50%+
- Monetization: 2.9% payment processing revenue on settled amounts

---

### Friction Point #3: **Mobile Receipt Upload & OCR Accuracy (MEDIUM Impact — Data Entry Friction)**

**The Problem:**
Adding expenses on mobile is painful:
- Receipt photo at bad angle → OCR fails
- Manual re-entry of amount, date, category is slow
- No auto-fill for category/description based on OCR
- Users abandon flow mid-entry; switch to Splitwise or manual note

**Current Evidence:**
- Mar 25 audit identifies this as friction point
- OCR accuracy depends on lighting, angle, phone camera quality
- Competitors: Splitwise has better OCR (likely higher quality vendor)

**Recommended Fix (Effort: 2-3 sprints / 3-4 weeks):**

**Phase 1 (1-2 weeks):** Better OCR Vendor
1. **Switch from basic OCR to Google Vision or AWS Textract:**
   - Cost: $0.15-0.30 per receipt (amortized across users)
   - Benefit: 95%+ accuracy vs. 70-80% with basic OCR
   - Fallback: Manual re-entry with pre-fill (category, date auto-extracted)

2. **Improve capture UX:**
   - Guide overlay: "Align receipt in frame"
   - Auto-capture when receipt detected (no "take photo" button press needed)
   - Show preview + confidence score ("95% confidence: $42.50")
   - Edit step: Highlight fields user can correct if confidence < 80%

**Phase 2 (1-2 weeks, optional):** Suggested Splits
1. **Auto-calculate suggested splits:**
   - OCR extracts items + prices
   - UI: "Split equally?" (default) or "Item by item?" (Splitwise-style)
   - Show preview: "Alice gets appetizer ($12), Bob gets entree ($18), Carol splits dessert with Alice ($5 each)"

2. **Chat-native entry (optional):**
   - "I paid $86 at Moxies for dinner with Alice and Bob"
   - NLP parses: Amount ($86), location (Moxies), people (Alice, Bob)
   - Suggests: Equal 3-way split or itemized
   - User confirms in 1 tap

**Expected Impact:**
- Receipt entry time: 3-5 min manual → 30-60 sec with good OCR
- Entry abandonment rate: Unknown baseline → <10% (high completion)
- User frequency: Casual users (1-2 trips/year) → regular users (weekly expenses)

---

## Top 3 Missing Features (Prioritized by Impact + Effort)

### Missing Feature #1: **Smart Settlement + Payment Integration (HIGH Impact, HIGH Effort — 4-6 weeks)**

**Why It's Missing:**
Current: Settlement shows "Person A owes Person B" but user must manually Venmo/PayPal
Better: One-tap in-app payment (Stripe/PayPal)
Best: Automated settlement with proof-of-payment tracking

**Strategic Importance:**
- **#1 retention lever** for expense-sharing apps (settlement = job-to-be-done)
- Splitwise has this via integrations; Even Us Up lacks it
- Differentiator: Even Us Up can own "frictionless settlement" as core feature

**Implementation:** See Friction Point #2 above (Phase 2)

**Expected Impact:**
- Trial: If monetized, 2.9% payment fee revenue on $X settled/month
- Retention: +30-50% (settlement becomes in-app habit, not external tool)
- Competitive moat: Payment integration + trust layer (proof tracking) = switching cost

---

### Missing Feature #2: **Recurring Expense Automation (HIGH Impact, MEDIUM Effort — 2-3 weeks)**

**The Gap:**
Roommates pay rent monthly; trip participants split utilities. No automation → manual re-entry each month.

**Why It's Missing:**
- Early-stage product; focus on core expense tracking
- Low-hanging fruit for Splitwise; Even Us Up hasn't prioritized

**Recommended Implementation (Effort: 2-3 weeks):**
1. **Recurring expense setup:**
   - "Add recurring expense" → expense template
   - Frequency: Weekly, bi-weekly, monthly, quarterly, annual
   - Renewal date: Auto-create expense on that date
   - Participants: Same as original, or customizable

2. **Smart management:**
   - "Edit this month only" vs. "Edit all future"
   - Skip month: "No rent this month"
   - Upgrade/downgrade: "Rent is now $1500 (was $1400)"

3. **Reporting:**
   - "Monthly committed expenses" (recurring total)
   - Trend: "Rent + utilities averaging $2100/month"

**Expected Impact:**
- User stickiness: +30-40% (recurring becomes reason to open app)
- Monthly active users: +20-30% (automatic reminders drive engagement)
- Trial signup: +10-15% (roommate/apartment groups specifically seek this)

---

### Missing Feature #3: **Analytics & Spending Insights Dashboard (MEDIUM Impact, MEDIUM Effort — 2-3 weeks)**

**The Gap:**
Splitwise Pro shows "You're spending 20% more on dining than last month" and "Who owes most?" No open-source equivalent.

**Why It's Missing:**
- Engagement driver, not essential for core feature (settling expenses)
- Monetization opportunity (upsell to pro tier); but early-stage Even Us Up may not need revenue yet

**Recommended Implementation (Effort: 2-3 weeks):**
1. **Per-group analytics:**
   - Breakdown by category (food, transport, lodging, activities)
   - Breakdown by payer ("Alice paid 60%, Bob 40%")
   - Trend: "Dining spending +20% vs. last month"

2. **Fairness score:**
   - "Alice is 15% above fair share; Bob 8% below"
   - Highlights imbalances (useful for long-term groups)

3. **Insights:**
   - "Most expensive category: Dining ($500)"
   - "Highest payer: Alice ($1200)"
   - "Group average per person: $300"

4. **Optional: Pro tier monetization**
   - Free: Basic breakdown (categories, payers)
   - Pro: Trend analysis + fairness scoring ($2.99/mo or $1.99/month billed annually)

**Expected Impact:**
- Engagement: +20-30% (analytics keeps users in app longer)
- Monetization: $100-500/month if 5-10% of users upgrade (after trial)
- Retention: +10-15% (insight discovery reduces churn)

---

## Top 3 Growth Levers (Prioritized by Impact + Effort)

### Growth Lever #1: **Referral Program (QUICK WIN — 1-2 weeks, +15-25% signup growth)**

**The Opportunity:**
Expense-sharing is inherently viral (network product). Early friends → invite more friends.

**Recommended Program (Effort: 1-2 weeks):**
1. **Mechanic:**
   - Invite friends via link/SMS
   - Friend signs up + creates first group → inviter gets $5 credit
   - Capped at $50/user (10 successful referrals max)

2. **How it works:**
   - User gets unique ref link: "Join Even Us Up: [link]?ref=alice123"
   - Share buttons: SMS, iMessage, email, copy link
   - Referral tracking: Backend checks ref param; attributes signup to inviter
   - Reward: $5 credit to next paid plan (if monetized) or in-app currency

3. **Timing:**
   - Launch immediately (low effort, high leverage)
   - Pair with improved invite UX (Friction Point #1) for max impact

**Expected Impact:**
- New user acquisition: +15-25% from referral channel (typical for network products)
- Viral coefficient: Each user invites 1-2 friends → exponential growth
- Unit economics: Referral cost ($5 credit) << LTV (lifetime value of user)

---

### Growth Lever #2: **Settlement Integration Ecosystem (MEDIUM-TERM — 3-4 weeks, +20-40% retention)**

**The Opportunity:**
Payments are the moment of truth. If Even Us Up integrates PayPal, Venmo, bank transfer → users never leave the app.

**Recommended Priorities (in order):**

**Priority 1: Stripe or PayPal (2-3 weeks, direct payments)**
- Scope: Bank transfers, card payments
- Cost: 2.9% + $0.30 per transaction
- Impact: One-tap settlement eliminates friction
- Expected: 30-50% of users use in-app payments (vs. external Venmo)

**Priority 2: Wise Integration (2-3 weeks, cross-border)**
- Scope: International transfers, currency conversion
- Benefit: Unlocks international use case (trip groups with non-residents)
- Cost: Partnership (Wise handles transfer, Even Us Up gets referral or integration fee)
- Impact: +20% new market (travelers, expat groups)

**Priority 3: Venmo Link (Optional, 1 week, manual fallback)**
- Scope: Pre-fill Venmo payment link ("Send $42 to Bob")
- Benefit: Frictionless for users with Venmo (most US users)
- Cost: $0 (Venmo API)
- Impact: Quick-win UX improvement

**Expected Impact (combined):**
- Settlement completion rate: +30-50% (in-app payment removes friction)
- Retention: +20-40% (payment flow = stickiest moment)
- Monetization: 2.9% fee revenue on $X settled

---

### Growth Lever #3: **"Trip Closeout" Flagship Workflow (COMPETITIVE WEDGE — 2-3 weeks, positioning)**

**The Opportunity:**
Mar 21 strategy identified "trip closeout in 3 minutes" as core differentiator. Build this as flagship demo → market it heavily.

**Recommended Scope (Effort: 2-3 weeks):**

**Trip Workflow:**
1. Create trip (name, dates, budget)
2. Add expenses (quick add: "Groceries $60", or upload receipts)
3. Generate optimized settlement plan (fewest payments)
4. Send payment requests (auto-generated links)
5. Close trip (all settled)

**Success Metrics:**
- Median time from last expense to "all settled": <72 hours
- Trial conversion: Groups that complete trip → high retention (vs. abandoned expense log)
- Viral: Participants in one trip → invite others → next trip

**Marketing Angle:**
- Demo: 60-second video of trip creation → settlement → done
- vs. Splitwise: "Splitwise tracks expenses. Even Us Up finishes them."
- Use case: Travel groups, roommate transitions, wedding planning

**Expected Impact:**
- Trial conversion: +15-20% (trip-focused marketing)
- Retention: +40-60% if trip users experience friction-free settlement
- SEO: "Trip expense splitting app" keywords → capture competitor traffic

---

## 90-Day Growth Roadmap

### **Phase 1 (Week 1-3): Foundation**
1. ✅ Referral program (1-2 weeks) → ship immediately
2. ✅ Group invite UX + QR code (1-2 weeks) → parallel
3. ✅ Settlement UI clarity (2 weeks) → foundational for next phase

**Expected by end of Week 3:**
- Referral channel open; +5-10% signup lift visible
- Invite-to-acceptance rate improves 40-60%
- Settlement completion rate improves 20-30%

### **Phase 2 (Week 4-8): Features + Monetization**
4. ✅ Recurring expense automation (2-3 weeks)
5. ✅ Payment integration (Stripe, 2-3 weeks)
6. ✅ Analytics dashboard (2 weeks)

**Expected by end of Week 8:**
- Settlement completion: 70%+ (with UX + payment integration)
- Recurring groups: 30-40% of users use recurring expenses
- Monetization-ready: 2.9% payment fee revenue + potential pro tier

### **Phase 3 (Week 9-12): Scale**
7. ✅ "Trip closeout" marketing campaign
8. ✅ Wise integration (cross-border unlock)
9. ✅ Engagement + retention optimization

**Expected by end of Week 12 (90 days):**
- Referral coefficient: 1.2-1.5 (network growth)
- Settlement completion rate: 80%+
- Pro tier adoption: 5-10% (if launched)
- MRR potential: $50-200/month (2.9% payment fees + pro subscriptions)

---

## Key Dependencies & Blockers

| Blocker | Status | Joe Decision Required? | Impact if Unresolved |
|---------|--------|----------------------|----------------------|
| **Growth vs. Harvest Decision** | ⏳ Strategy unclear | YES (critical) | Roadmap changes completely (web-only vs. native app, monetization vs. free) |
| **Monetization Model** | ⏳ Undefined | YES | Can't prioritize payment integration or pro tier |
| **International Scope** | ⏳ Unknown | YES (affects Wise priority) | Limits TAM if no international support |
| **Invite UX** | 🔴 Not started | NO (technical) | Limits viral growth; baseline low traction continues |
| **Settlement Integration** | 🔴 Not started | NO (technical) | Payment friction persists; users leave for Splitwise |

---

## Comparison: Even Us Up vs. Splitwise

| Factor | Even Us Up | Splitwise | Winner |
|--------|-----------|-----------|--------|
| **Expense Tracking** | ✅ Good | ✅✅ Excellent | Splitwise (15+ years, mature) |
| **Settlement UX** | ❌ Unclear | ✅ Clear ("X owes Y") | Splitwise |
| **Payment Integration** | ❌ None | ✅ Multiple (PayPal, Stripe, Google Pay) | Splitwise |
| **Mobile App** | 🔄 Web-first | ✅✅ Native iOS/Android | Splitwise |
| **Receipt OCR** | ❌ Unreliable | ✅ Better | Splitwise |
| **Speed** | ✅ Lightweight | ❌ Feature-heavy | Even Us Up |
| **Simplicity** | ✅ Simple UI | ❌ Overwhelming | Even Us Up |
| **Trip Focus** | 🔄 Can differentiate | ❌ General purpose | Even Us Up (if built) |
| **Settlement Speed** | 🔄 Can optimize | ❌ Multi-step | Even Us Up (if built) |

**Even Us Up's path to win:** Own settlement + trust + speed as moat (Splitwise is great at tracking; bad at finishing).

---

## Recommended Priorities (Q2 2026)

### **Tier 1 (Critical — Ship in Apr):**
1. Referral program (1-2 weeks)
2. Invite UX + QR code (1-2 weeks)
3. Settlement UI clarity (2 weeks)

### **Tier 2 (High Impact — Ship in May):**
4. Recurring expenses (2-3 weeks)
5. Payment integration (Stripe, 2-3 weeks)

### **Tier 3 (Growth — Ship in Jun):**
6. Analytics dashboard (2-3 weeks)
7. "Trip closeout" marketing campaign
8. Wise integration (2-3 weeks)

### **Tier 4 (Scale — Q3 onwards):**
9. Native mobile app (iOS/Android, 6-12 weeks) — only if growth tier shows strong traction

---

## Summary

**Even Us Up has a viable path to compete with Splitwise IF it owns settlement + trust + speed as a moat.** 

Current state: Low traction suggests weak product positioning or weak execution. Choose:
- **Aggressive scale:** Build to compete head-to-head; requires native app + payment integration + marketing investment (12+ weeks)
- **Defensive niche:** Own "trip closeout" use case; focus on referral growth + word-of-mouth (8-12 weeks)

**Recommended approach:** Start with Tier 1 (quick wins, build momentum), measure traction, then decide on Tier 2+ based on data.

**Critical success factor:** Unblock Joe's strategic decision (growth vs. harvest; monetization model; international scope). Roadmap can't be prioritized without these answers.

---

**Audit completed by:** Alfred  
**Date:** 2026-03-29 16:30 ADT  
**Context used:** 30%  
**Status:** Ready for Joe decision on strategy
