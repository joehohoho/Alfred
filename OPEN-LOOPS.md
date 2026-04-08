# Open Loops — Single Source of Truth

**Last updated:** 2026-04-08 15:58 UTC  
**Next sync:** 2026-04-09 09:00 ADT (morning standup)  
**Auto-refresh:** Daily at 08:55 AM via `scripts/refresh-open-loops.sh`

---

## 🎯 Pending Questions for Joe
_Source: Command Center notifications (manual review + input)_

- [ ] **Passive Income Targets (Q2)**
  - Context: Market Signal Lab launch; need revenue targets
  - Questions: 
    - Specific target revenue: $X/month?
    - Timeline: immediate (March) vs. Q2 (April-May)?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **App Growth Strategy (Priority)**
  - Context: CoinUsUp + Even Us Up competing for Q2 cycles
  - Questions:
    - Which app to prioritize for Q2 growth?
    - Resource allocation: HAL bandwidth vs. Alfred focus?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **Market Signal Lab Scope Clarification**
  - Context: Product roadmap + external user interest
  - Questions:
    - Ship as public product vs. keep as internal trading tool?
    - If public: pricing model + feature gates?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: NORMAL

---

## 📊 Active Kanban Cards (In Progress or Blocked)
_Source: Auto-populated by refresh script (last sync: 2026-04-08 15:58 UTC)_

| Card ID | Title | Owner | Priority | Status | Blocker | Due |
|---------|-------|-------|----------|--------|---------|-----|
| null | null | unassigned | NORMAL | in_progress | none | TBD |
| null | null | unassigned | NORMAL | in_progress | none | TBD |
| null | null | unassigned | NORMAL | 🚫 blocked | unspecified | TBD |
| null | null | unassigned | NORMAL | 🚫 blocked | unspecified | TBD |

---

## 🔔 Pending Notifications (Unanswered)
_Source: Auto-populated from `/goals/notifications.json` (last sync: 2026-04-08 15:58 UTC)_

| Title | Asked | Assigned To | Status | Next Action |
|-------|-------|-------------|--------|-------------|
| How much of your time should passive income get vs. client work right now? | 2026-04-05T13:00:00.860Z | alfred | awaiting-answer | follow up |
| What would make your consulting work more systematic or scalable? | 2026-04-04T13:00:00.684Z | joe | awaiting-answer | review / respond |
| For Even Us Up, what's the smallest win that would feel like real progress? | 2026-04-03T13:00:00.747Z | alfred | awaiting-answer | follow up |
| 
## Implementation 100% Complete — Last Step: Stripe Dashboard Config

**Card:** Implement 14-day free trial (task_1773156748695_23b9e471)
**Status:** Review, 16 days pending
**Code status:** ✅ Backend + Frontend COMPLETE. All tests passing. Ready to deploy.

## What's Blocking (5-minute manual task)

Update 12 product prices in Stripe dashboard with trial configuration:
- **Basic Monthly (US/CA)** — set trial_period_days: 14
- **Basic Annual (US/CA)** — set trial_period_days: 14
- **Pro Monthly (US/CA)** — set trial_period_days: 14
- **Pro Annual (US/CA)** — set trial_period_days: 14

Steps:
1. Go to https://dashboard.stripe.com/products
2. For each Basic/Pro price (US/CA), edit settings → Set trial_period_days: 14
3. Reply "Stripe config done" in kanban or here

(Enterprise tier: NO trial, leave as-is)

## If You Don't Want Trials
No problem — just reply "skip trial for now" and I'll close the card.

## Timeline  
Once config complete: 4 hours to staging test + deploy to production (same day).

What's the call? | 2026-04-03T06:34:13.496Z | joe | awaiting-answer | review / respond |
| 
## Blueprint Complete — Waiting on ONE Clarification

**Card:** Bill Review & Invoice Audit Automation (task_1774058538023_ae4bf3d2)
**Status:** Blocked 11 days in Review
**What's ready:** Complete market validation, MVP blueprint, 6-week execution plan (in ideas/ folder)

## Your Decision (2 options)

**Option A: Personal Tool**
- Use it to audit your own invoices, consulting contract costs
- Not a product, just for your operations
- I build a simple, lightweight version (weekend work)

**Option B: External SaaS Product**  
- Sell to Canadian SMBs, law firms, construction companies
- 6-week MVP build + customer validation
- Fits passive income goals (-10k/mo target)

## What I Need
**Just reply:** "A" or "B" (in Discord, kanban comment, or notification reply)

## Impact
- If A: Move to Blocked, focus on CoinUsUp/Signal App
- If B: Start building immediately (timeline slips to April 7 if delayed further)

No other info needed. Just the scope direction. | 2026-04-03T06:34:13.495Z | joe | awaiting-answer | review / respond |
| [REMINDER] Stripe Trial Config - 12 prices need trial_period_days=14 (8 days pending) | 2026-04-03T02:34:16.506Z | alfred | awaiting-answer | follow up |
| [REMINDER] Bill Review SaaS - Scope Clarification Needed (8 days pending) | 2026-04-03T02:34:13.207Z | alfred | awaiting-answer | follow up |
| Bill Review & Invoice Audit card (task_1774058538023_ae4bf3d2) is in review, blocked on clarification:

**Question:** In early March, you marked new product ideas off-limits to focus on improving existing apps (CoinUsUp, Even Us Up, Signal App). Your recent comment on this card suggests you may want to reconsider.

**Before I proceed with an MVP**, I need clarity on 3 points:

1. **Does this change the consulting→product boundary?** (It was explicitly off-limits Mar 1, 9, and 19)
2. **Priority:** Should this be prioritized over CoinUsUp Phase 5 work or Signal App quality improvements?
3. **Scope:** Is this a personal tool for your own invoice audits, or an external product?

**If yes to 1+3:** I can scope and build the MVP this week. 
**If it's deprioritized:** I'll move the card to Archived and focus on active product work.

Waiting on your decision. | 2026-03-31T18:31:10.236Z | alfred | awaiting-answer | follow up |
| [URGENT] 3 Review Cards Blocked — Need Your Decisions | 2026-03-28T09:12:07.989Z | joe | awaiting-answer | review / respond |
| CoinUsUp Free Trial Stripe Config | 2026-03-27T06:36:20.697Z | joe | awaiting-answer | review / respond |
| (untitled) | 2026-03-25T16:18:58.370Z | alfred | awaiting-answer | follow up |
| (untitled) | 2026-03-25T16:18:58.370Z | alfred | awaiting-answer | follow up |
| (untitled) | 2026-03-25T16:18:58.368Z | alfred | awaiting-answer | follow up |
| CoinUsUp Recurring Donations — Stripe Keys Needed to Proceed with Testing | 2026-03-24T10:37:13.358Z | joe | awaiting-answer | review / respond |

---

## 📋 Tasks Pending HAL Dispatch (To Do Queue)
_Source: Auto-populated from kanban board (last sync: 2026-04-08 15:58 UTC)_

| Priority | Card ID | Title | Est. Hours | Age | Blocker? |
|----------|---------|-------|-----------|-----|----------|


---

## 📅 Upcoming Deadlines (Next 7 Days)
_Source: Kanban board + Calendar (last sync: 2026-04-08 15:58 UTC)_

- No deadlines in next 7 days ✅

---

## 🔄 Sync Protocol

**Morning Standup (09:00 AM ADT):**
1. Open this file
2. Review "Pending Questions" — any new answers from Joe overnight?
3. Review "Active Kanban Cards" — any blockers to unblock?
4. Review "Pending Notifications" — which ones need attention today?
5. Review "Tasks Pending HAL Dispatch" — pick top 3 for queue
6. Check "Upcoming Deadlines" — any urgent dates?

**Refresh Schedule:**
- Auto-refresh: 08:55 AM daily (runs `scripts/refresh-open-loops.sh`)
- Manual refresh: Anytime with `bash scripts/refresh-open-loops.sh`
- Git commit: Auto-committed after each refresh (timestamped)

---

## 📝 Manual Sections (Joe's Domain)

### Pending Questions
**Keep entries here manually** — Joe adds answers directly or via notifications.

When Joe answers, Alfred logs it to `decisions/YYYY-MM.md` and moves to "Decided" section. Questions not answered within 7 days are escalated via Command Center notification.

### Note Log
Use this for personal notes, reminders, or context that doesn't fit kanban cards:

- [Add as needed]

---

**Created:** 2026-03-09 | **By:** Alfred | **Status:** ✅ LIVE
