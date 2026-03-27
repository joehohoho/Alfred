# Even Us Up: Onboarding Wizard — Phase 1 Specification

**Status:** Ready for Design Review  
**Priority:** CRITICAL (blocker for activation)  
**Effort Estimate:** 8-12 hours implementation + 2 hours testing  
**Owner:** Product/Engineering  
**Dependencies:** Settlement redesign (should be familiar to new users)

---

## Problem Statement

**Current State:**
- New users sign up and see blank dashboard
- No guidance on what to do next
- No sample group or starter expense to demonstrate app
- Gap between signup and first expense = major dropout point
- Activation rate stuck at 30%

**Evidence:**
- Q2 Growth Plan (2026-03-18) flagged as Priority: HIGH
- Blank state → confusion → abandon (classic SaaS dropout)
- Expected to improve activation by 15-20%

**User Impact:**
- New user completes signup, logs in, sees empty dashboard, closes app
- Users who persist must manually create group + understand splits
- Friction point before first settlement (compound problem with settlement clarity fix)

---

## Solution Overview

### Three-Part Wizard (MVP)

1. **Step 1: Create Your First Group**
   - Group name + description
   - Group type selector (optional: Roommates, Household, Friends, Trip)

2. **Step 2: Invite Members** (Optional in MVP)
   - Add group members (email invites)
   - Initial member defaults (user's own email)

3. **Step 3: Add First Expense**
   - Expense amount + category
   - Simple split (equal, no custom)
   - Who paid (defaulted to current user)

### Post-Wizard: Onboarding Success

- Group created and live
- First expense added (sample if wizard not completed)
- Dashboard shows group + upcoming settlement
- Settlement card appears (from settlement redesign)
- User is primed for settlement (knows they'll need to settle)

---

## Detailed Specification

### Wizard Entry Point

**Triggers:**
1. First login after signup (automatic)
2. Dashboard "Get Started" button (if wizard dismissed)
3. Direct link: `/onboarding` (fallback)

**Flow:**
- Modal presentation (not full page)
- Modal is non-dismissible on first login (no X button)
- Mobile: full-screen modal (bottom sheet on scroll)
- Desktop: centered modal (30% width, max 500px)

**Progress Indicator:**
- Step indicator at top: "1 of 3" | "2 of 3" | "3 of 3"
- Progress bar (visual, shows 33% → 66% → 100%)

---

## Step 1: Create Your First Group

### Form Fields

**Field 1: Group Name** (Required)
```
Label: "What's your group called?"
Placeholder: "Roommates", "Household", "Trip to Mexico", "Friends"
Input type: Text
Validation: 2-50 characters, no special characters except spaces & hyphens
Error: "Group name must be 2-50 characters"
Auto-focus: Yes (cursor starts here)
```

**Field 2: Group Type** (Optional, Phase 1.1)
```
Label: "What type of group?"
Options:
  ◯ Roommates (suggested if nothing selected)
  ◯ Household
  ◯ Friends
  ◯ Travel
  ◯ Other

Behavior: Cosmetic only (affects emoji/color in UI)
```

**Field 3: Description** (Optional)
```
Label: "Add a note (optional)"
Placeholder: "Share rent, utilities, and groceries"
Input type: Textarea
Validation: 0-200 characters
Error: None (optional field)
```

### Buttons

**Primary Button: "Continue to Members"**
- Enabled: Group name filled
- On click: Validate group name → proceed to Step 2
- Loading state: Show spinner while creating group

**Secondary Button: "Skip & Go to Dashboard"** (hidden until filled)
- On click: Create group with defaults
- Navigate to dashboard
- Show "Group created! Now add your first expense" prompt

### Defaults
- Group type: "Roommates" (if not selected)
- Description: empty (optional)
- Currency: CAD (auto-detected)

### Success State
```
Group created: "Roommates Split"
Created at: 2026-03-27
Next: Invite members or add expense
```

---

## Step 2: Invite Members (Optional MVP, Enhanced Phase 1.2)

**PHASE 1.1 MVP:** Minimal member flow (just show it's optional)
- Show "Add members (optional)" prompt
- "Skip and add expenses instead" button
- Continue button

**PHASE 1.2 ENHANCEMENT:** Full invite flow
```
Label: "Who's in this group?"
Input: Email field
Placeholder: "person@example.com"
Button: "+ Add another member"

Members list (below input):
✓ user@example.com (you)
- friend@example.com [Remove]
- roommate@example.com [Remove]

Buttons:
[Continue to Expenses] [Add Without Inviting]
```

### Behavior (Phase 1.2)
- Auto-populate current user's email (non-removable)
- Allow adding 1-10 additional members
- Send invite emails after wizard completes
- Non-response is OK (user can still add expenses)

---

## Step 3: Add First Expense

### Form Fields

**Field 1: Expense Amount** (Required)
```
Label: "How much to split?"
Input type: Currency field
Prefix: "$"
Placeholder: "45.00"
Validation: 0.01 - 10,000.00
Error: "Amount must be between $0.01 and $10,000"
Auto-focus: No (but pre-filled with sample if demo mode)
```

**Field 2: Category** (Required)
```
Label: "What's this for?"
Type: Dropdown (not checkbox)
Options:
  📍 Rent (most common)
  ⚡ Utilities
  🛒 Groceries
  🍽️ Dining
  🎬 Entertainment
  🏠 Household
  💼 Other

Default: "Groceries" (neutral, relatable)
```

**Field 3: Who Paid?** (Informational, no input needed)
```
Label: "Who paid?"
Display: "You paid (user@example.com)"
(This is assumed; can be edited in app after wizard)
```

**Field 4: How to Split?** (Simple option only)
```
Label: "How to split?"
Options:
  ◉ Equal split (RECOMMENDED)
  ◯ Custom split (advanced, defer to app)

Equal split explanation: "Each member pays their share"
Disabled: Custom split (grayed out, with "Available in app" hint)
```

### Preview (After Filling)

```
Expense Summary:
├─ Amount: $45.00
├─ Category: Groceries
├─ Paid by: You
└─ Split equally among 2 members (you + 1 member)
   └─ Each owes: $22.50
```

### Buttons

**Primary Button: "Create Expense & Finish"**
- Enabled: Amount + category filled
- On click: Create expense → finish wizard → show success

**Secondary Button: "Go to Dashboard"**
- Skip expense (create sample instead)

---

## Wizard Completion & Success State

### Upon Completion:

**Screen 1: Success Screen** (2-3 seconds)
```
✅ You're All Set!

Your group "Roommates Split" is ready to go.
First expense: $45 for Groceries (split equally)

What's next?
[View Group] [Add Another Expense] [Back to Dashboard]
```

**Then: Redirect to Dashboard**
- Show group card
- Show settlement card (from settlement redesign)
- Show "First expense added" toast notification

### Data Created:

1. **Group**
   - ID: auto-generated
   - Name: user input
   - Type: selected or default
   - Created_at: now
   - Currency: CAD
   - Members: [user, invited_members]

2. **Expense**
   - ID: auto-generated
   - Group_id: newly created group
   - Amount: user input
   - Category: selected
   - Paid_by: current user
   - Created_at: now
   - Splits: equal (each member gets amount/member_count)

3. **Settlement** (auto-calculated)
   - For each member (except payer):
     - Amount owed: expense_amount / member_count
     - Due_date: now + 7 days (or immediate)
     - Status: pending

---

## Alternative: Sample/Demo Group (Post-Wizard)

### Option A: Sample Group Auto-Seeded

If user **dismisses wizard** or **skips to dashboard**, show sample group:

```
Demo Group: "How Even Us Up Works"

Sample expenses:
├─ Rent: $600 (3 people)
├─ Utilities: $45 (3 people)
└─ Groceries: $30 (3 people)

Settlements pending:
└─ You owe $225 to Sarah

[Delete Group] [Get Started with Your Own]
```

**Benefits:**
- User sees live data + settlement mechanics
- Sample is deletable (no friction)
- Onboards user to app features

**Timeline:**
- Auto-create on first login if wizard skipped
- Auto-delete if untouched after 7 days

---

## Mobile Responsiveness

### Mobile-Specific Changes:

1. **Wizard Modal**
   - Full-screen bottom sheet (not modal)
   - Slide up from bottom
   - X button to dismiss (only after Step 1)

2. **Form Fields**
   - Full width (padding: 16px)
   - Large touch targets (min 44px height)
   - No label floating (label stays above)

3. **Number Pad**
   - For currency field: show numeric keyboard
   - Decimal auto-formatted (no manual . entry)

4. **Member List (Step 2)**
   - Vertical list (no side-by-side)
   - Swipe to remove (or tap Remove button)

### Testing Scenarios:
- iPhone SE (smallest screen)
- iPhone 12 (standard)
- iPad (landscape)
- Android (various sizes)

---

## Implementation Checklist

### Frontend (React/Next.js)

- [ ] **OnboardingWizard.tsx** (main container)
  - State management: current step, form data
  - Step progress indicator
  - Next/back navigation
  - Modal/sheet presentation

- [ ] **OnboardingStep1.tsx** (Group creation)
  - Form validation (group name required)
  - Input field focus management
  - Error display

- [ ] **OnboardingStep2.tsx** (Member invites)
  - Email input field
  - Add/remove members
  - Email validation

- [ ] **OnboardingStep3.tsx** (First expense)
  - Currency input (formatted)
  - Category dropdown
  - Preview section
  - Calculation logic (equal split)

- [ ] **OnboardingSuccess.tsx**
  - Success message + summary
  - Next action buttons
  - Redirect logic

- [ ] **Types & Validation**
  - TypeScript interfaces for form data
  - Input validation functions (email, amount, name)
  - Error message strings

### Backend (Express/Node.js)

- [ ] **Group Creation Endpoint**
  ```
  POST /api/groups
  Body: { name, description?, type?, currency }
  Returns: { groupId, createdAt, ... }
  ```

- [ ] **Expense Creation Endpoint**
  ```
  POST /api/expenses
  Body: { groupId, amount, category, paidBy, splits }
  Returns: { expenseId, settlements, ... }
  ```

- [ ] **Settlement Auto-Calculation**
  - Calculate equal split automatically
  - Create settlement records for each member
  - Trigger settlement card update (dashboard)

- [ ] **Member Invitation Service**
  - Email invitation template
  - Send invites after wizard completes
  - Track invite status (accepted, pending, declined)

- [ ] **Analytics Tracking**
  - Log wizard started, step progression, completion
  - Track abandonment points

### Database Updates

- [ ] Add `group.onboarding_completed` flag (boolean)
- [ ] Add `user.onboarding_status` (enum: not_started, in_progress, completed)
- [ ] Ensure expense + settlement creation is atomic (transaction)

### Analytics & Tracking

- [ ] **Wizard Events**
  - `onboarding_wizard_started` — User enters wizard
  - `onboarding_step1_completed` — Group created
  - `onboarding_step2_completed` — Members added (if applicable)
  - `onboarding_step3_completed` — First expense added
  - `onboarding_wizard_completed` — Full wizard done
  - `onboarding_wizard_abandoned` — User dismisses at step N

- [ ] **Dashboard Metrics**
  - `onboarding_completion_rate` — % of new users completing wizard
  - `time_to_first_expense` — Minutes from signup to expense
  - `wizard_abandonment_by_step` — Where users drop off

### Testing

- [ ] **Unit Tests**
  - Form validation (amount, email, name)
  - Equal split calculation
  - Group + expense creation

- [ ] **E2E Tests**
  - Full wizard flow (all 3 steps)
  - Step skipping (go to dashboard)
  - Form validation + error messages
  - Success screen → dashboard navigation

- [ ] **Visual Regression**
  - Each step appearance (desktop + mobile)
  - Error states
  - Loading states

- [ ] **Accessibility**
  - Keyboard navigation (tab through fields)
  - Screen reader support (labels, error messages)
  - Focus indicators

---

## Design Mockups Required

**Designer Deliverables:**
1. Wizard Step 1: Group creation form
2. Wizard Step 2: Member invitations
3. Wizard Step 3: First expense form
4. Success screen
5. Sample group (demo)
6. Mobile variants (all above, bottom sheet)

**Design Review Gate:**
- Joe review before engineering starts
- Feedback cycle: designer → Joe → engineering
- Target: Mocks ready by mid-Week 1

---

## Success Metrics

| Metric | Target | Tracking Method |
|--------|--------|-----------------|
| Wizard starts (% of signups) | 90%+ | Analytics |
| Wizard completion rate | 70%+ | Analytics |
| Time to first expense | <5 min (after signup) | Analytics |
| Activation rate (first settlement) | 30% → 50% | Cohort analysis |
| First-week retention | +20% (estimated) | Retention cohort |
| Member invites sent | 50%+ of users | Analytics |

---

## Rollout Strategy

### Phase 1: Soft Launch (Week 2)
- Enable for 10% of new signups (A/B test)
- Monitor completion rate + funnel
- Collect user feedback

### Phase 1.5: Ramp Up (Week 2-3)
- If >70% completion: expand to 100%
- If <70%: debug + iterate (redesign step 2 or 3)

### Phase 1.2: Polish (Week 3-4)
- Add full member invitation flow (if MVP is successful)
- Add sample/demo group auto-seeding

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Wizard feels too slow (3 steps) | Time each step: target <1 min per step; skip steps if possible |
| Form validation errors confusing | Clear error messages; inline help; examples |
| Users abandon at Step 2 (members) | Make Step 2 optional; skip/do-later button |
| Equal split too simple | Defer custom split to in-app (after onboarding); no-impact decision |
| Currency selection missing | Default to CAD; allow change in group settings later |

---

## Post-Launch Monitoring

**First 2 Weeks:**
- Monitor completion rate (should be 70%+)
- Monitor time per step (should be <1 min each)
- Check abandonment by step (adjust design if needed)
- Collect user feedback (support, surveys)

**Next Steps:**
- Full member invitation flow (Phase 1.2)
- Sample group auto-seeding (Phase 1.2)
- Onboarding email sequence (Phase 2)

---

## Connection to Settlement Redesign

**Why These Two Features Together:**

The onboarding wizard primes users for settlement:
1. User creates group + expense (wizard)
2. User sees settlement on dashboard (settlement card)
3. User understands "I need to settle" (from card + settlement modal clarity)
4. User confidently sends Interac payment (clear instructions)

**Without settlement redesign:** Wizard success limited (user still confused at settlement step)  
**Without wizard:** Settlement redesign success limited (no new users to benefit)

**Together:** 15-25% activation improvement expected

---

## Appendix: Sample Data (Dev/Testing)

### Test Case 1: Happy Path
```
1. Sign up: testuser@example.com
2. Start wizard
3. Step 1: Group name "Test Roommates"
4. Step 2: Add member test2@example.com
5. Step 3: Amount $100, Category Rent
6. Success: Group created, expense added
```

### Test Case 2: Skip Members
```
1. Sign up
2. Start wizard
3. Step 1: Group name "Solo Group"
4. Step 2: Skip/continue without members
5. Step 3: Add expense
6. Success: Group created with only initiator
```

### Test Case 3: Abandon at Step 2
```
1. Sign up
2. Start wizard
3. Step 1: Complete
4. Step 2: Click "Go to Dashboard"
5. Result: Group created, sample expense pre-filled
```

---

**Prepared by:** Alfred  
**Date:** 2026-03-27  
**Status:** Ready for design kickoff
