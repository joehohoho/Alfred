# Even Us Up: Quick Wins Discovery (2026-03-21)

## Overview
**Card:** Even Us Up: Quick Wins (task_1774130449066_c34541f7)  
**Timeline:** 3 weeks | **Impact:** +10-15% engagement | **Tech:** 2/5 each  
**Three independent sub-tasks, all low-complexity, well-scoped.**

---

## Codebase Summary

### Tech Stack
- **Frontend:** React 18 + TypeScript + Zustand (state) + Vite
- **Backend:** Supabase (PostgreSQL) with RLS enabled
- **Styling:** CSS-in-JS (custom solution)
- **Deployment:** Vercel

### Architecture
```
Expense_Sharing/
├── components/       # 25+ React components
├── stores/          # Zustand stores (expenseStore, templateStore, etc)
├── utils/           # Business logic (settlements.ts, expenses.ts, analytics.ts)
├── services/        # db.ts (Supabase queries)
├── types.ts         # TypeScript interfaces
└── migrations/      # Supabase SQL migrations
```

### Key Data Model
```typescript
Expense:
- isRecurring?: boolean
- recurringFrequency?: RecurringFrequency (enum: DAILY, WEEKLY, MONTHLY, etc)
- recurringBillingDate?: string (ISO date: when bill cycles)
- splitType: SplitType (EVEN | PERCENTAGE | AMOUNT)
- splits: Split[] (array of {memberId, value})

RecurringFrequency enum: DAILY | WEEKLY | BIWEEKLY | MONTHLY | QUARTERLY | YEARLY

ExpenseTemplate:
- id, household_id, name, amount, category, payer_id
- split_type, splits (JSONB)
- is_recurring?, recurring_frequency?
```

---

## Feature 1: Recurring Expenses Toggle (Tech: 2/5)

### Current State
✅ **Data model complete:** Expense.isRecurring, .recurringFrequency, .recurringBillingDate all exist in types.ts  
✅ **Expansion logic functional:** utils/expenses.ts has `expandRecurringExpenses()` that:
  - Takes a recurring expense + billing date
  - Generates occurrences from start date to today (on-the-fly)
  - Creates unique IDs per occurrence (e.g., `expense-id-2026-03-21`)
  - Supports all 6 frequencies correctly

✅ **Settlement integration:** settlements.ts uses `expandRecurringExpenses()` before calculating debts  
⚠️ **UI gap:** No Expense form fields for frequency/billing date selector

### Work Required
1. **Add UI to ExpenseForm component:**
   - Checkbox: "This is a recurring expense?"
   - When checked, show:
     - Frequency dropdown (6 options)
     - Date picker: "First billing date" (when does the cycle occur?)
   - Validation: billing date must be ≤ today or future (depends on requirement)
   
2. **Wire to store:** expenseStore already handles isRecurring/recurringFrequency/recurringBillingDate in add/update

3. **Test recurring expansion:** Verify that settling a household with 10+ recurring expenses correctly expands them up to today

### Edge Cases
- Monthly recurring on 31st (Feb handling)
- Leap year transitions
- Timezone edge cases (use UTC consistently)
- User edits billing date of existing recurring expense (should it retroactively expand past occurrences?)

### Acceptance Criteria
- [ ] ExpenseForm has checkbox + frequency dropdown + date picker
- [ ] Recurring expenses appear in settlement calculations correctly
- [ ] UI saves and loads recurring data without loss
- [ ] Edge cases tested (31st, leap years, timezone)

---

## Feature 2: Bill Rules (Reusable Split Patterns) (Tech: 2/5)

### Current State
✅ **ExpenseTemplate schema exists:** Tables defined in Supabase  
✅ **templateStore has CRUD:** Basic add/fetch/delete implemented  
⚠️ **UI gap:** No "Rules" management UI or quick-apply mechanism on Expense form  
⚠️ **Schema clarity:** Need to define "rule apply logic" (category filter? exact match? auto-apply?)

### Use Case
User: "I always split rent 50/50 with Jane, and it's always $2000 total"  
Solution:
1. Create rule: "Rent Split" → payer=Joe, category=Rent, splits=[Joe:50%, Jane:50%], amount=$2000
2. On Expense form: "Quick Rules" dropdown → select "Rent Split" → auto-fill payer + splits
3. User only changes date, confirm

### Work Required
1. **Create Rules UI (settings page or modal):**
   - New/Edit/Delete rule forms
   - Rule fields: name, category, payer, default amount, split pattern
   - Display active rules in a table

2. **Add quick-apply to ExpenseForm:**
   - Show "Apply Rule" dropdown above splits section
   - On select, populate: category, payer, splits, (optionally amount)
   - User can still override after applying

3. **Schema refinement (Supabase):**
   - Clarify if rules are household-scoped (likely yes)
   - Add category_filter field if multiple rules per category allowed

4. **templateStore expansion:**
   - Add `applyTemplate()` method to apply rule to a new expense
   - Handle partial override logic

### Edge Cases
- Rule deletes but past expenses reference it (fine, rule is just a template)
- Multiple rules for same category (show dropdown)
- Rule with splits that don't match current household members (skip invalid members)

### Acceptance Criteria
- [ ] Rules management UI (CRUD)
- [ ] Quick-apply dropdown on Expense form
- [ ] Rules correctly populate splits without mutation
- [ ] Rules are household-scoped
- [ ] No impact on existing expenses when rule is edited/deleted

---

## Feature 3: Simplify Debts Algorithm (Tech: 2/5)

### Current Algorithm (settlements.ts)
**Greedy matching approach:**
1. Calculate balances: who owes, who is owed
2. Sort debtors (ascending) and creditors (descending)
3. Match smallest debtor to largest creditor (greedy pair-off)
4. Generate Settlement transactions

**Example:**
```
A owes $100, B owes $50, C is owed $200
Debtors: [B:$50, A:$100]
Creditors: [C:$200]
Result: [B→C:$50, A→C:$100]  (2 txns)
```

**Limitation:** Works but generates ~30-40% more transactions than optimal

### Optimal Algorithm Enhancements
Need to add:
1. **Cycle Detection + Cancellation:**
   - If A→B→C→A (circular), net to 0
   - Example: A owes B $50, B owes C $30, C owes A $20 → cancel out
   - Result: A owes B $20 (1 txn instead of 3)

2. **Net-Out Optimization:**
   - If A owes B $100 and B owes A $30 → A owes B $70
   - Reduces redundant transactions

3. **Multi-leg Path Compression:**
   - If A owes B $50, B owes C $50, and no one else → A owes C $50 (cut out B)
   - Harder to implement but valuable for large households

### Implementation Approach
**Recommended:** Cycle cancellation + net-out (covers ~80% of optimization)
- Harder algorithms (path compression) likely not worth the complexity (diminishing returns for typical households)

### Test Data Needed
- Sample 100+ expenses across 5-10 household members
- Before/after txn count comparison
- Verification that total amounts balance (no value lost)

### Acceptance Criteria
- [ ] Cycle cancellation implemented and tested
- [ ] Net-out optimization implemented and tested
- [ ] At least 35% reduction in settlement txn count on realistic data
- [ ] All edge cases pass (zero amounts, multi-cycle, different currencies)
- [ ] Performance <100ms for 500 members + 1000 expenses

---

## Implementation Plan (High-Level)

### Order Recommendation
**Sequential approach (each task ~16h, 3 weeks total = ~5-6h/week for 3 weeks):**

1. **Feature 1 (Recurring):** Lowest risk, fastest to validate (UI + test)
2. **Feature 2 (Rules):** Medium complexity, independent from #1
3. **Feature 3 (Debts):** Algorithmic complexity, needs test data prep

### Deployment Strategy
- **No DB migrations needed** (all schema already present)
- **No breaking changes** (all new features additive)
- **Staged rollout:** Feature flags optional but not necessary (each feature independent)

---

## Known Issues / Tech Debt (Out of Scope)

1. **Timezone handling:** App doesn't explicitly handle user timezones (uses UTC, may cause edge case bugs)
2. **Currency exchange:** Expense supports originalAmount + exchangeRate but not fully tested
3. **RLS policies:** Supabase RLS enabled but currently allows all operations (security gap if multi-user)
4. **Performance:** Settlement calculation on 1000+ expenses may slow (should be fine for typical households)

---

## Next Actions
1. ✅ Discovery complete
2. → Create formal handoff contract (JSON)
3. → Option A: Spawn HAL subagent to implement all 3 features
4. → Option B: Joe reviews plan, approves, provides additional context
5. → Option C: Alfred implements Feature 1 end-to-end as proof-of-concept

**Recommendation:** Given 3-week timeline and independent scope, suggest HAL dispatch with feature parallelization (work on multiple features simultaneously if HAL capacity available).
