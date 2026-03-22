# 2026-03-22: Review Lane Auto-Approval UX — Phase 1 Research Complete

**Time:** 10:00-10:20 ADT  
**Card:** task_1774182651318_79b657e0 (Review Lane Auto-Approval UX)  
**Status:** Research Complete → Card Moved to Review  
**Model:** LOCAL (haiku-4-5)  
**Tokens:** ~2,400  
**Cost:** ~$0.02  

---

## Summary

Completed full Phase 1 research for the approval bottleneck fix. Designed end-to-end solution to eliminate manual board navigation and add SLA escalation. Card moved to review pending Joe's approval for Phase 2 implementation.

---

## Problem Analysis

**Issue:** Review cards stall indefinitely because:
1. Approval actions only available on kanban board (requires navigation away from notifications)
2. No SLA escalation — cards age without reminder
3. Joe spends 4-5h/week manually checking review queue

**Current state (as of Mar 21):**
- 5+ review cards awaiting approval
- Oldest card: 1h+ with no escalation
- No in-notification approval mechanism

---

## Solution Design

### Backend Changes
1. **Extend Notification type** (types.ts)
   - Add `actions` array (approve/reject/request-changes buttons)
   - Add `slaMetadata` (createdAt, dueAt 72h, escalateAt 7d, status)
   - Add `cardId` reference

2. **New Kanban API Endpoints**
   - `POST /api/kanban/:cardId/approve` → Move to done + comment
   - `POST /api/kanban/:cardId/reject` → Move to todo + feedback
   - `POST /api/kanban/:cardId/request-changes` → Move to blocked + feedback

3. **SLA Escalation Cron**
   - 72h reminder notification if card still in review
   - Optional 7d auto-promote for low-risk cards (alfredReviewed=true, no blockers)

### Frontend Changes
1. **Notifications page** — Render action buttons inline
2. **NotificationCard component** — Show SLA countdown + approval context
3. **End-to-end flow** — Approve → Move → Comment → Done

### Audit Trail
- Each approval posts card comment with action + timestamp + feedback
- Full history preserved on card

---

## Implementation Estimate

**Backend:** 3-4h
- Extend types + validation
- Add 3 new endpoints
- Implement SLA cron logic

**Frontend:** 2h  
- Update notification rendering
- Add action buttons + handlers
- SLA status display

**Testing:** 1h
- E2E workflow test
- Permission validation
- Error handling

**Total: 5-6h** (distributed, no blockers)

---

## Files to Modify

**Backend:**
- `backend/src/types.ts` — Notification interface
- `backend/src/routes/kanban.ts` — Approve/reject endpoints
- `backend/src/readers/kanban.ts` — SLA logic + cron

**Frontend:**
- `frontend/src/pages/Notifications.tsx` — Render actions
- `frontend/src/components/NotificationCard.tsx` — New component

---

## Next Steps

**Phase 2 Ready:** All design decisions made. No blockers identified. Awaiting Joe approval to proceed with backend implementation.

**Research artifact:** `/workspace/research/REVIEW-AUTOAPPROVAL-UX-RESEARCH.md` (full findings + API design)

---

## Metrics

- **Approval polling time saved:** 4-5h/week (when implemented)
- **Card age reduction:** 7d max (with auto-promote) vs. unlimited now
- **Approval latency:** Instant (in-notification) vs. manual board navigation (5+ min)
