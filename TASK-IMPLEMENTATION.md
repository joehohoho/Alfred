# Review Lane Auto-Approval UX Implementation

## Audit Finding
Review cards stall because approval requires manual board navigation. No actionable controls exist in notifications.

## Implementation Plan

### Phase 1: Notification Payload Enhancement ✅
**File:** `backend/src/routes/notifications.ts` + `backend/src/types.ts`

**Changes:**
1. Extend `Notification` type with `actions[]` array (already in types.ts)
2. Add `slaMetadata` (already in types.ts) for SLA tracking
3. Create approval notification with action payloads in `approval-sla.ts`

**Status:** Mostly done. Need to:
- Ensure actions are delivered to frontend
- Validate action handlers work end-to-end

### Phase 2: Frontend Notification UI ✅
**File:** `frontend/src/components/NotificationCard.tsx` + `frontend/src/pages/Notifications.tsx`

**Changes:**
1. Render `actions[]` as buttons in notification card
2. Call `/api/kanban/:cardId/actions/{approve|reject|request-changes}`
3. Show loading state + success/error feedback
4. Optimistic UI update (hide after action)

### Phase 3: Kanban API Endpoints ✅
**File:** `backend/src/routes/kanban.ts`

**Endpoints exist:**
- `POST /api/kanban/:cardId/actions/approve`
- `POST /api/kanban/:cardId/actions/reject`
- `POST /api/kanban/:cardId/actions/request-changes`

**Review:** These work but need:
- Alert Joe via notification when action taken
- Add audit trail to card comments (already doing)
- Ensure SLA metadata cleared on approval

### Phase 4: SLA Escalation Job ✅
**File:** `backend/src/readers/approval-sla.ts`

**Exists:**
- `runSlaEscalation()` — 72h reminders + 7d auto-promote
- `send72hReminder()` — creates approval notification with actions
- `autoPromoteReviewCard()` — moves to done with comment

**Verify:**
- Cron trigger added to jobs
- Runs every 6h or daily
- Handles both Task and Goal types

### Phase 5: Frontend Components Update
**Changes needed:**
1. Ensure NotificationCard displays action buttons
2. Connect buttons to `/api/kanban/:cardId/actions/*` endpoints
3. Show inline approve/reject UI in notification

### Phase 6: Testing & Documentation
1. Create review card, mark as reviewed
2. Let 72h pass (or manually trigger)
3. Check notification appears with approve/reject/request-changes buttons
4. Click approve → card moves to done + comment added
5. Verify SLA metadata cleared

---

## Current Status: Deep Dive

### ✅ What Already Exists
1. **Notification actions schema** in types.ts
2. **API endpoints** for approve/reject/request-changes
3. **SLA escalation logic** (72h reminder + 7d auto-promote)
4. **Card move handlers** with comment generation

### ⚠️ What's Partially Done
1. **Notification payload** — actions array exists but needs frontend rendering
2. **SLA metadata** — defined in types but not fully integrated into move flow

### ❌ What's Missing
1. **Frontend components** — NotificationCard doesn't render action buttons yet
2. **Cron job** — SLA escalation not wired to cron (needs daily/6h trigger)
3. **Alert on approval** — when Joe approves via notification, need to notify Alfred
4. **Auto-move deliverables** — Feb 27 directive for low-risk auto-promote

---

## Deliverables

### For Command Center
- [ ] `NotificationCard.tsx` — Display approval actions as buttons
- [ ] `Notifications.tsx` — Wire up action handlers
- [ ] Frontend approval flow working end-to-end

### For Backend
- [ ] Verify SLA endpoints work
- [ ] Add approval notification alert to Alfred
- [ ] Cron job for daily SLA escalation

### For Workspace Scripts
- [ ] Document approval notification workflow
- [ ] Add SLA escalation to cron jobs config (if missing)

---

## Success Criteria
1. Review card receives 72h reminder notification with approve/reject/request-changes buttons
2. Clicking approve in notification → card moves to done + comment added
3. No manual board navigation needed
4. Alfred is alerted when Joe approves
5. 7-day auto-promote removes stale review cards (with audit trail)

---

## Notes
- Target impact: Remove 4-5h/week approval polling
- Estimated build time: 2-3h for frontend components + wiring
- Risk: Low — all API endpoints exist, just need UI glue
