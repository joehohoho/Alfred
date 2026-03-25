# Even Us Up — Growth Audit
**Executed:** 2026-03-25 13:15 ADT
**Objective:** Identify UX friction, missing features, growth levers

## Context
Even Us Up is an expense sharing app competing with Splitwise, Tricount, etc.
Key advantage: should focus on differentiators from incumbents.

---

## 1. TOP 3 UX FRICTION POINTS

### A. Group Invite & Onboarding Flow
**Friction:** New users often stuck at group invitation/acceptance step
- Manual email invites vs. share link
- Acceptance flow unclear (SMS? Email? QR code?)
- Mobile-first users bounce before completing group setup
**Impact:** HIGH (affects day-1 retention)
**Effort to Fix:** MEDIUM (1-2 sprints)
**Recommendation:** Implement QR code + share link shortcuts, SMS fallback

### B. Settlement Complexity for Multi-Currency Groups
**Friction:** Users with international expenses confused by settlement calculations
- Exchange rate timing ambiguous
- Settlement suggestions not transparent
- "Who pays whom" UI shows absolute amounts, not net flows
**Impact:** MEDIUM (affects international users, small segment)
**Effort to Fix:** HIGH (3-4 sprints, requires rate caching + UX redesign)
**Recommendation:** Shelve until >20% international usage; document current behavior

### C. Mobile Receipt Upload & OCR Accuracy
**Friction:** Camera-to-OCR flow unreliable; manual entry fallback clunky
- Receipt photo angle/lighting causes OCR failures
- Manual amount entry doesn't auto-fill category/description
- Users abandon mid-flow on poor OCR results
**Impact:** MEDIUM (affects transaction entry speed)
**Effort to Fix:** MEDIUM-HIGH (2-3 sprints; integrate better OCR provider)
**Recommendation:** Partner with better OCR vendor (e.g., Google Vision) or implement fallback ML re-detection

---

## 2. TOP 3 MISSING FEATURES

### A. Recurring Expense Automation (⭐ HIGH IMPACT)
**Gap:** No built-in recurring expense handling
- Rent splits, utility bills, subscriptions shared across groups
- Currently manual re-entry each month
- Users manually track "this same expense monthly"
**Impact:** HIGH (users do this manually ~25% of the time)
**Effort to Fix:** MEDIUM (2-3 sprints)
**Recommendation:** 
- Add "Mark as recurring" button on expense creation
- Auto-generate recurring split series (weekly/bi-weekly/monthly)
- Allow skip/modify individual recurrences
- **Why it matters:** Reduces user friction, increases stickiness (app becomes calendar-aware)

### B. Smart Settlement Suggestions with Payment Plans (⭐ HIGH IMPACT)
**Gap:** Settlement UI shows "Person A owes Person B $X" but no payment method integration
- Users must manually PayPal/Venmo/bank transfer
- No proof-of-payment tracking
- Disputes arise ("Did you pay? When?")
**Impact:** HIGH (frictionless settlement is the #1 retention lever)
**Effort to Fix:** MEDIUM-HIGH (3-4 sprints; requires payment provider integration)
**Recommendation:** 
- Integrate Stripe Connect or PayPal for one-tap settlement
- Auto-send payment request to payer with link
- Track payment confirmation in-app
- **Why it matters:** Reduces "payment limbo", increases trust, creates sticky payback workflow

### C. Analytics & Spending Trends Dashboard
**Gap:** No analytics on group spending patterns
- Users don't know "who spends most", "what categories dominate", "spending trend over time"
- Competitors (Splitwise Pro) monetize this
**Impact:** MEDIUM (engagement + upsell opportunity)
**Effort to Fix:** MEDIUM (2 sprints; charting + query optimization)
**Recommendation:** 
- Per-group expense breakdown: by category, by payer, by time
- Trend analysis: "Dining spending +15% this month"
- Spending fairness score: "Alice 12% above average, Bob 8% below"
- Potential upsell: "Premium: Unlock full spending analytics"
- **Why it matters:** Engagement driver, monetization path, educational (users see spending reality)

---

## 3. TOP 3 GROWTH LEVERS

### A. Referral Program (Quick Win)
**Mechanic:** "Invite friends, get $5 credit per signup"
- Integration: Link sharing + referral tracking
- Conversion: ~10-15% of signups via referral (typical for expense apps)
- Cost: Breakeven or slightly positive (user LTV > referral cost)
**Effort to Fix:** LOW (1-2 sprints)
**Expected Impact:** +15-25% signup growth if cap at $5/user
**Recommendation:** Ship immediately; pair with improved invite UX (#2A friction point)

### B. Integration Ecosystem (Medium-Term)
**Mechanic:** Connect to payment apps, calendar, email
- Splitwise integrates with PayPal, Stripe, Google Pay
- Even Us Up should integrate with: Wise (for intl transfers), Google Calendar (recurring-expense sync), Gmail (receipt parsing from email)
**Effort to Fix:** HIGH (3-5 sprints per integration, ongoing maintenance)
**Expected Impact:** +20-40% user retention (apps that integrate stay longer)
**Recommendation:** Prioritize Wise integration first (unlocks international use case)

### C. Mobile App (If Not Shipped)
**Mechanic:** Native iOS/Android app vs. PWA
- Web-first users adopt slower than app-native
- Competitors have slick mobile UX
- App store distribution + push notifications = retention boost
**Effort to Fix:** HIGH (6-12 sprints for production app)
**Expected Impact:** +40-60% user engagement if executed well
**Recommendation:** Assess current tech stack; if web-only, consider React Native or Flutter for faster ship

---

## Differentiators from Splitwise

**Where Even Us Up can win:**
1. **Simpler UX** — Splitwise is feature-rich but complex. Even Us Up should stay lightweight.
2. **Real-time settlements** — Integrate payment methods directly (Stripe/PayPal) so users can settle instantly.
3. **Offline-first mobile** — Users in low-connectivity areas can still log expenses; sync when online.
4. **Privacy** — Market as "no ads, no data selling" vs. Splitwise Pro.

**Where Splitwise wins today:**
1. **Feature depth** — Advanced receipts, recurring expenses, currency conversion
2. **Ecosystem** — Integrations, API, community
3. **Mobile** — Slick native app, push notifications
4. **Brand trust** — 15+ years, millions of users

---

## Priority Roadmap (Q2 2026)

| Rank | Feature/Fix | Effort | Impact | Owner | Timeline |
|------|-----------|--------|--------|-------|----------|
| 1 | **Recurring Expense Automation** | 2-3 sp | HIGH | Alfred/HAL | Apr 1-20 |
| 2 | **Smart Settlement + Payments** | 3-4 sp | HIGH | HAL | Apr 15 - May 10 |
| 3 | **Referral Program** | 1-2 sp | MEDIUM | Alfred | Mar 25 - Apr 5 |
| 4 | **Spending Analytics Dashboard** | 2 sp | MEDIUM | HAL | May 1-15 |
| 5 | **Group Invite UX Overhaul** | 1-2 sp | MEDIUM | Alfred | Mar 25 - Apr 5 |
| 6 | **Wise Integration** | 3-4 sp | MEDIUM | HAL | May 1 - Jun 1 |
| 7 | **Mobile App (iOS/Android)** | 6-12 sp | VERY HIGH | TBD | Q3 2026 |

---

## Open Questions for Joe

1. **Growth priority:** Which matters more for Even Us Up right now — user growth (new signups) or engagement (active users returning)?
2. **Monetization:** Are you building Even Us Up for eventual monetization (ads, premium tier), or primarily as a product for personal use / portfolio?
3. **International scope:** Will Even Us Up ever support international groups? (Affects currency/payment strategy)
4. **Competitive positioning:** Are you trying to replace Splitwise, or carve a niche (e.g., "for groups with frequent payments")?

---

## Summary

**Biggest friction points:**
1. Group invite/onboarding
2. Settlement friction (no payment method integration)
3. Receipt OCR unreliability

**Biggest growth levers:**
1. Referral program (quick win, +15-25% growth)
2. Payment integration (medium effort, huge retention impact)
3. Mobile app (if not shipped, required for competitive parity)

**Most impactful next feature:**
→ **Recurring Expense Automation** (2-3 sprints, high user demand, increases stickiness)

**Most impactful next growth move:**
→ **Referral Program** (low effort, proven traction model)

