# Even Us Up: Settlement Clarity Redesign — Phase 1 Specification

**Status:** Ready for Design Review  
**Priority:** CRITICAL (blocker for adoption)  
**Effort Estimate:** 5-8 hours implementation + 1-2 hours testing  
**Owner:** Product/Engineering  
**Dependencies:** None (can start immediately)

---

## Problem Statement

**Current State:**
- Settlement modal is reactive (appears only when user clicks "Settle Up")
- No proactive reminder or dashboard indicator
- Distinction between group expenses and peer-to-peer unclear
- Settlement language is ambiguous ("Pay" vs "Settle" vs "Send")
- Interac instructions are buried or missing entirely
- Users don't see pending settlements → they forget to settle → lower retention

**Evidence:**
- Q2 Growth Plan (2026-03-18) flagged as Priority: HIGH
- Expected to reduce settlement friction by 60%
- Likely 10-15% improvement in settlement rate (40% → 60%)

**User Impact:**
- New user completes group setup but can't figure out how to settle
- Users close app thinking they've settled when they haven't
- High abandonment rate before first settlement

---

## Solution Overview

### Three Components (MVP)

1. **Proactive Settlement Card** (Dashboard)
   - Always visible reminder of pending settlements
   - Shows top 3 settlements owed/owing
   - One-click to settlement modal

2. **Redesigned Settlement Modal**
   - Clear "who owes whom" display
   - Interac-first settlement method
   - Pre-filled Interac instructions
   - Confirmation receipt (email + in-app)

3. **Interac-First Language**
   - Replace "Pay" with "Send via Interac"
   - Add Interac visual badge
   - Streamlined instructions

---

## Component 1: Dashboard Settlement Card

### Placement
- Dashboard grid (top right, after balance card)
- Visible on every dashboard load
- Dismissible (X button) but re-appears after 24h or new settlement created

### Content

**Card Header:**
```
🔔 Settle Up
You have 3 pending settlements
```

**Card Body (List of 3 Settlements):**
```
1. You owe $45 to Alice
   → Send via Interac [ACTION BUTTON]

2. Bob owes you $20
   → Waiting for payment [WAITING BADGE]

3. You owe $10 to Charlie
   → Send via Interac [ACTION BUTTON]
```

**Card Footer:**
```
View all settlements → [LINK]
```

### Behavior

**Click "Send via Interac":**
- Open settlement modal (see Component 2)
- Pre-fill recipient + amount
- Auto-scroll to Interac instruction block

**Click "View all settlements":**
- Navigate to full settlements page (existing page or enhanced)
- Show all pending + completed settlements
- Filter by: owed/owing, group, recent

**Dismiss (X button):**
- Card hidden for 24 hours
- Re-appears if new settlement created or next login

### Styling

- **Card background:** Light blue (Interac brand color: #0066CC, at 10% opacity)
- **Pending badge:** Orange ("Waiting for payment")
- **Action button:** Interac blue (#0066CC), white text, rounded
- **Font:** Bold for amounts, regular for names
- **Icons:** 🔔 bell (notification), ✅ checkmark (completed)

### Data Query

```sql
-- Get top 3 pending settlements for logged-in user
SELECT
  settlement_id,
  group_id,
  payer_user_id,
  payee_user_id,
  amount,
  currency,
  due_date,
  status
FROM settlements
WHERE (payer_user_id = :user_id OR payee_user_id = :user_id)
  AND status = 'pending'
ORDER BY due_date ASC, amount DESC
LIMIT 3
```

---

## Component 2: Settlement Modal Redesign

### Trigger
- Click "Send via Interac" button (from settlement card)
- Click "Settle Up" button (existing, in group details)
- Direct link: `/settle?id={settlement_id}`

### Modal Structure

**Header:**
```
Settle Up
Group: Roommates Split
```

**Section 1: Settlement Summary**
```
┌─────────────────────────────────┐
│  You owe $45.00 to Alice         │
│  for: Group meals (March 15)     │
└─────────────────────────────────┘
```

**Section 2: Settlement Method (Radio Buttons)**

```
☑ Send via Interac Direct (Recommended)
  Your Interac email: user@example.com
  Recipient Interac: alice@example.com
  [Optional: link to Interac setup guide]

☐ Manual Interac Transfer
  [Step-by-step instructions below]

☐ Mark as Paid in Cash
  [Date picker + notes field]

☐ Other Method
  [Notes field for manual entry]
```

**Section 3: Interac Instructions (Conditional)**

*Only shows if "Send via Interac Direct" OR "Manual Interac Transfer" selected*

**For Interac Direct (if available):**
```
Ready to send via Interac Direct?
[Complete Payment] [Cancel]
```

**For Manual Interac Transfer (fallback):**
```
📱 How to Send via Interac:

1. Open your banking app (RBC, TD, BMO, Scotiabank, etc.)
2. Select "Send Money" or "Interac e-Transfer"
3. Enter Alice's email: alice@example.com
4. Amount: $45.00
5. Message (optional): "Roommates split - March 15"
6. Send

⏱️ Typical delivery: 2-30 minutes

Questions? [Help]
```

**Section 4: Confirmation & Receipt**

*Only shows after payment completed (or marked as cash)*

```
✅ Settlement Complete!

Sent: $45.00 to alice@example.com
Time: March 27, 1:45 PM
Method: Interac Transfer

📧 Confirmation email sent to alice@example.com

[Back to Group] [View Receipt]
```

### Modal Behavior

**On Load:**
- Auto-select "Send via Interac Direct" (recommended)
- Show Interac instructions immediately
- Pre-fill amounts from settlement object

**On Method Change:**
- Update instructions section (conditional display)
- Show relevant fields (date picker for cash, notes, etc.)

**On Payment Completion:**
- Show confirmation section
- Send confirmation email to both payer + payee
- Log settlement as completed in database
- Refresh dashboard (settlement card disappears)

---

## Component 3: Settlement Confirmation Email

### Trigger
- User completes settlement (any method)
- Email sent to payer + payee

### Email Template

```
Subject: Settlement Confirmed — You sent $45.00 to Alice

Dear User,

This is to confirm that your settlement has been recorded.

─────────────────────────────────
Settlement Confirmation
─────────────────────────────────

Amount: $45.00 CAD
Sent to: Alice (alice@example.com)
Group: Roommates Split
Date: March 27, 2026, 1:45 PM

Method: Interac e-Transfer
Status: ✅ Completed

─────────────────────────────────

Questions? Need help?
View full settlement details →
[Link to settlement page in app]

Thanks for using Even Us Up!
─────────────────────────────────

Even Us Up Team
support@evenusup.com
```

### Email Behavior
- Sent to payer immediately (confirmation)
- Sent to payee (notification that they've been paid)
- Both emails include settlement ID (for support/auditing)

---

## Implementation Checklist

### Frontend (React/Next.js)

- [ ] **DashboardSettlementCard.tsx** (new component)
  - Query pending settlements on mount
  - Show top 3 with action buttons
  - Handle dismiss logic (localStorage + 24h timer)
  - Responsive design (mobile: full width, desktop: grid placement)

- [ ] **SettlementModal.tsx** (refactor existing)
  - Add method selector (radio buttons)
  - Conditional instruction rendering
  - Interac Direct API integration (if available)
  - Confirmation screen

- [ ] **SettlementConfirmation.tsx** (new component)
  - Show after settlement completed
  - Display receipt details
  - Link to settlement history

- [ ] **Forms & Validation**
  - Email validation (Interac Direct)
  - Amount validation (no negative, no more than owed)
  - Date validation (cash method)

### Backend (Express/Node.js)

- [ ] **Settlement Query Endpoint**
  ```
  GET /api/settlements/pending?user_id={id}&limit=3
  Returns: top 3 pending settlements, sorted by due date
  ```

- [ ] **Settlement Completion Endpoint**
  ```
  POST /api/settlements/{id}/complete
  Body: { method, notes?, date?, interacEmail? }
  Returns: confirmation object + receipt ID
  ```

- [ ] **Confirmation Email Service**
  - SendGrid or nodemailer integration
  - Template rendering
  - Send to payer + payee

- [ ] **Database Updates**
  - Add `settlement.method` column (enum: interac, cash, other)
  - Add `settlement.completed_at` timestamp
  - Add `settlement.notes` text field
  - Add `settlement.receipt_id` reference

### Analytics & Tracking

- [ ] **Dashboard Card Events**
  - `settlement_card_shown` — Card displayed on dashboard
  - `settlement_card_dismissed` — User clicked X
  - `settlement_card_clicked` — User clicked action button

- [ ] **Modal Events**
  - `settlement_modal_opened` — Modal displayed
  - `settlement_method_selected` — User selected method
  - `settlement_completed` — User sent payment
  - `settlement_abandoned` — User closed without paying

- [ ] **Dashboard Metric**
  - `settlement_card_completion_rate` — % of users who settle after seeing card

### Testing

- [ ] **Unit Tests**
  - Settlement card query logic
  - Dismiss timer logic
  - Email template rendering

- [ ] **E2E Tests**
  - Dashboard → settlement card → modal → completion flow
  - Method selection + instruction rendering
  - Confirmation email sent

- [ ] **Visual Regression**
  - Card styling (mobile + desktop)
  - Modal appearance
  - Email template rendering

---

## Design Mockups Required

**Designer Deliverables:**
1. Dashboard settlement card (2 states: has settlements, no settlements)
2. Settlement modal (3 method options shown)
3. Settlement confirmation screen
4. Email template (HTML)
5. Mobile responsive variants (all above)

**Design Review Gate:**
- Joe review of mockups before engineering starts
- Feedback cycle: designer → Joe → engineering
- Target: Mocks ready by end of Week 1, implementation Week 1-2

---

## Success Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Settlement card visibility | 95%+ of active users | Analytics |
| Settlement card CTR | >40% of viewers | Analytics |
| Settlement completion (after seeing card) | 70%+ | Analytics |
| Interac method adoption | 80%+ of settlements | Database query |
| Settlement rate improvement | 40% → 60% | Cohort analysis |
| Settlement confirmation email open rate | >50% | SendGrid analytics |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Settlement card clutters dashboard | Dismissible (shows again after 24h); soft positioning (not top-left) |
| Interac instructions too complex | Simplified 5-step guide; mobile-friendly layout; help link |
| Users abandon modal without paying | Confirmation prompt before closing; save draft option |
| Email delivery failures | SendGrid fallback; in-app confirmation as primary |
| Interac Direct API integration delays | MVP uses manual transfer instructions only; Direct added in Phase 2 |

---

## Dependencies & Prerequisites

- **None for MVP** (manual Interac instructions don't require external API)
- **Phase 2 Optional:** Interac Direct API integration (requires bank partnership)
- **Phase 2 Optional:** Email service (SendGrid or equivalent) — can use existing provider

---

## Timeline

**Week 1:**
- Day 1-2: Design mockups (Figma)
- Day 2: Joe review + feedback
- Day 3-5: Frontend implementation

**Week 2:**
- Day 1-2: Backend implementation + email service
- Day 3: Integration + testing
- Day 4-5: QA + launch prep

**Launch:** End of Week 2 (target: Friday, April 10)

---

## Post-Launch Monitoring

**First 2 Weeks:**
- Monitor dashboard card CTR (should be >40%)
- Monitor settlement completion rate (should improve to 60%+)
- Monitor email delivery + open rates
- Collect user feedback (support tickets, in-app feedback)
- A/B test card position (if engagement low)

**Next Steps:**
- Interac Direct API integration (Phase 2)
- Settlement history page enhancements
- Advanced filters + bulk settlements

---

## Appendix: Current Settlement Flow (Baseline)

**Current State:**
1. User in group view sees "Settle Up" button (bottom of group)
2. Click button → modal appears
3. Modal shows settlement amount + recipient
4. User manually navigates to Interac (app instructions not clear)
5. No confirmation tracking
6. Settlement not marked as complete

**Problems:**
- Step 4 is unclear (users get lost)
- Step 5 is missing (no confirmation mechanism)
- No proactive reminder (user must remember)

**Proposed Improvement:**
1. Dashboard card proactively shows settlement is needed
2. Click card → streamlined modal with clear Interac instructions
3. Settlement confirmation email + in-app receipt
4. Analytics tracks completion rate (can now measure success)

---

**Prepared by:** Alfred  
**Date:** 2026-03-27  
**Status:** Ready for design kickoff
