# Review Lane Auto-Approval UX — Phase 1 Research Findings

**Date:** Sun 2026-03-22 10:00 ADT  
**Objective:** Audit approval workflow bottleneck; design notification + SLA escalation system  
**Status:** ✅ Complete

---

## Problem Statement

Review cards stall in the Review column because:
1. **Manual board navigation required** — Joe must go to kanban board to approve/reject
2. **No in-notification controls** — Approval actions only available on board, not in Command Center notifications
3. **No SLA enforcement** — Cards age indefinitely without escalation
4. **Impact:** 4-5h/week manual approval polling; review queue ages

**Example case (Mar 21):**
- 5 review cards awaiting approval (CoinUsUp recurring donations, Bill audit blueprint, Voice-to-SOP plan, Niche SaaS blueprint, etc.)
- All blocked on Joe's approval
- No escalation → no reminder that cards are aging

---

## Current Architecture

### Kanban API (`backend/src/routes/kanban.ts`)
**Existing endpoints:**
- `POST /api/kanban/:cardId/move` — Move card to column (e.g., move to review)
- `POST /api/kanban/:cardId/blocker` — Add blocker (moves to blocked column)
- `POST /api/kanban/:cardId/unblock` — Unblock with answer (moves back to in_progress)
- `POST /api/kanban/:cardId/comments` — Add comment to card (audit trail)

**Missing:** No endpoints for approve/reject actions on review cards.

### Notification System (`backend/src/routes/notifications.ts`)
**Current payload structure:**
```typescript
interface Notification {
  id: string;
  type: NotificationType;  // "goal-created" | "question" | "alert" | "update" | "kanban-action" | "kanban-blocked"
  title: string;
  message: string;
  goalId?: string;
  taskId?: string;
  source?: string;
  answered: boolean;
  userAnswer?: string;
  createdAt: string;
  answeredAt: string | null;
  deliveryStatus?: DeliveryStatus;  // "pending" | "sent" | "failed"
}
```

**Missing:** No payload support for action buttons, SLA metadata, or approval context.

### UI Components
- **Notifications page:** Shows notification list but lacks interactive approve/reject buttons
- **Kanban board:** Has approve/reject UI available on card detail modal, but requires manual navigation

---

## Design Solution

### 1. Extend Notification Payload (Backend)

Add new optional fields to support actionable notifications:

```typescript
interface NotificationAction {
  id: string;           // e.g., "approve" | "reject"
  label: string;        // "Approve" | "Reject" | "Request Changes"
  variant: string;      // "primary" | "danger" | "secondary"
  handler: "kanban-approve" | "kanban-reject" | "kanban-request-changes";
  cardId: string;       // target card for action
  context?: Record<string, any>;
}

interface Notification {
  // ... existing fields ...
  actions?: NotificationAction[];    // [NEW] Actionable buttons
  cardId?: string;                   // [NEW] Link to kanban card
  slaMetadata?: {                    // [NEW] SLA escalation tracking
    createdAt: string;
    dueAt: string;                   // When 72h reminder fires
    escalateAt: string;              // When 7-day auto-promote fires
    status: "on-track" | "reminder-sent" | "escalated";
  };
}
```

### 2. New Kanban API Endpoints

**POST /api/kanban/:cardId/approve**
```json
{
  "approverComment": "Looks good, ship it",
  "moveToColumn": "done"
}
```

**POST /api/kanban/:cardId/reject**
```json
{
  "reason": "Needs revision on pricing strategy",
  "moveToColumn": "todo"
}
```

**POST /api/kanban/:cardId/request-changes**
```json
{
  "feedback": "Please update Stripe prices before shipping",
  "moveToColumn": "blocked"
}
```

Each endpoint will:
- Move card to target column
- Add comment with approval action (audit trail)
- Send notification answer back to Alfred with Joe's context

### 3. SLA Escalation Logic

**Trigger:** When card moves to `review` column

**Timeline:**
- **T+0h:** Card enters review, SLA timer starts
- **T+72h:** Send reminder notification if still in review
- **T+168h (7d):** Auto-promote low-risk deliverables to done (optional)

**Low-risk criteria:**
- Alfred marked `alfredReviewed: true`
- No blockers or feedback in comments
- Card type: "task" or "goal" (not "idea")

### 4. Notification Page UI Changes

**Frontend component updates:**
- Detect `actions` array in notification payload
- Render approve/reject/request-changes buttons inline (if actions present)
- Show SLA status: "On track / Reminder sent / Escalated"
- Display countdown to escalation (if applicable)

**Example notification card:**
```
┌─────────────────────────────────────────┐
│ CoinUsUp Recurring Donations           │
│ ✅ Code complete, testing evidence posted│
│                                         │
│ In review since: 1h 23m                 │
│ SLA: Due in 70h 37m                     │
│                                         │
│ [✅ Approve] [❌ Reject] [⚠️ Changes]   │
└─────────────────────────────────────────┘
```

### 5. Audit Trail (Card Comments)

Each approval action will post a comment:
```
**[APPROVAL] Joe approved this card**
Time: 2026-03-22 10:15 ADT
Action: Approved & Moved to Done
Comment: "Looks good, ship it"
```

---

## Implementation Phases

### Phase 2: Backend Enhancement
- [ ] Extend Notification type with actions + SlaMetadata
- [ ] Add approve/reject/request-changes endpoints
- [ ] Implement SLA escalation cron job
- [ ] Audit trail integration (post comment on approval)

### Phase 3: Frontend Enhancement
- [ ] Update Notifications page to render action buttons
- [ ] Add SLA countdown display
- [ ] Wire approve/reject buttons to new API endpoints
- [ ] Test end-to-end: notification → action → card move → audit trail

### Phase 4: Safety & Testing
- [ ] Validation: ensure only review cards can be approved
- [ ] Permission checks: only Joe/admin can approve
- [ ] Error handling: failed actions, network errors
- [ ] E2E testing: full approval workflow

---

## Scope & Impact

**Scope:** Kanban API + Notification system + Frontend UI  
**Files affected:**
- `backend/src/types.ts` — Extend Notification interface
- `backend/src/routes/kanban.ts` — Add approve/reject endpoints
- `backend/src/readers/kanban.ts` — SLA logic + escalation
- `frontend/src/pages/Notifications.tsx` — Render action buttons
- `frontend/src/components/NotificationCard.tsx` — New component for actions

**Cost estimate:** ~3-4h backend + 2h frontend + 1h testing = **5-6h total**

**Expected outcome:**
- Approval actions available in-notification (no board navigation needed)
- SLA escalation removes approval polling (Joe gets reminder, not responsible for tracking)
- Audit trail ensures transparency (comments on every approval)

---

## Next Steps

**Phase 2 ready for implementation:** All design decisions made, no blockers identified.

Awaiting Joe's confirmation to proceed with backend enhancement.
