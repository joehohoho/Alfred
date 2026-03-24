# ACTIVE-TASK.md

**Status:** in_progress  
**Kanban Card:** task_1774062049248_7486f8ba (CoinUsUp Recurring Donations - Stripe Subscriptions)  
**Started:** 2026-03-24 00:05 ADT  
**Phase:** Phase A - Hook + API Implementation

---

## Objective

Implement Stripe Subscriptions (recurring donations) in the CoinUsUp app so users can set up automatic monthly/yearly donations.

**Current State:** 50-60% complete (schema done, hooks need logic, APIs need implementation)

---

## What's Already Built ✅

- ✅ Database schema (3 tables + RLS + analytics view)
- ✅ Stripe edge functions (checkout, webhook, portal)
- ✅ React hooks (skeletal structure, ready for implementation)
- ✅ UI components (RecurringDonationsPanel ~80% done)
- ✅ Donations page (integration wired, needs testing)
- ✅ Full API reference documentation

---

## What Needs Implementation 🔄

### Phase A (Current): Hook + API Logic (2-3 hours)

**Hooks to implement logic:**
1. `useRecurringDonations` — Query subscriptions
2. `useRecurringDonationTiers` — CRUD tiers
3. `useRecurringDonationManager` — Pause/resume/cancel

**API routes needed:**
1. `GET /api/donations/recurring/subscriptions` → useRecurringDonations
2. `GET /api/donations/recurring/tiers` → useRecurringDonationTiers  
3. `POST/PATCH /api/donations/recurring/tiers/*` → CRUD
4. `POST /api/donations/recurring/{action}` → pause/resume/cancel

**Current work:**
- [ ] Implement useRecurringDonations query with Supabase
- [ ] Implement useRecurringDonationTiers CRUD
- [ ] Implement useRecurringDonationManager mutations
- [ ] Create API routes in Next.js
- [ ] Wire hooks to API routes

---

### Phase B: End-to-End Checkout Testing (2 hours)
- [ ] Test checkout flow (UI → Edge Function → Stripe → Webhook)
- [ ] Verify subscription created in database
- [ ] Test success/cancel redirects
- [ ] Test error cases

---

### Phase C: Automation + Retention (3-4 hours)
- [ ] Build automation queue processor
- [ ] Failed payment recovery workflow
- [ ] Email reminders + retention campaigns

---

### Phase D: Testing + Polish (2-3 hours)
- [ ] Unit tests, integration tests, E2E tests
- [ ] Error handling + edge cases
- [ ] Documentation

---

## Immediate Next Steps

1. Implement hook logic (start now)
2. Create API routes (30 min)
3. Test with Stripe test mode (1 hour)
4. Verify database state (30 min)
5. Move to Phase B

---

## Files Being Modified

- `src/hooks/useRecurringDonations.ts`
- `src/hooks/useRecurringDonationTiers.ts`
- `src/hooks/useRecurringDonationManager.ts`
- `src/app/api/donations/recurring/*` (new routes)
- `RECURRING_DONATIONS_STATUS.md` (created, comprehensive status)

---

## Key Files for Reference

- **Status:** `CoinUsUp/RECURRING_DONATIONS_STATUS.md` (full breakdown)
- **API Docs:** `CoinUsUp/RECURRING_DONATIONS_API_REFERENCE.md`
- **Schema:** `CoinUsUp/supabase/migrations/20260321005000_...sql`
- **UI:** `CoinUsUp/src/components/donations/RecurringDonationsPanel.tsx`

---

## Previous Card

**Market Signals App (task_1774281167052_9830e89e):** ✅ Moved to review

---

**Key Discovery:** Work is 50-60% done! Not starting from scratch.

**Phase A Status:**
- ✅ Created manage-recurring-donation-subscription edge function
- 🔄 Need to: Refine other edge functions + test E2E
- 🔄 All React hooks already implemented ✓

**Progress Updated:** 2026-03-24 00:35 ADT
