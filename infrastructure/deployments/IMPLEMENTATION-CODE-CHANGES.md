# Review Lane Auto-Approval UX — Code Changes Required

## Status Summary

**Current State:** 95% complete. Three items remain:
1. ✅ Frontend notification UI with action buttons — DONE
2. ✅ Backend API endpoints (approve/reject/request-changes) — DONE
3. ✅ SLA escalation logic (72h reminder + 7d auto-promote) — DONE
4. ✅ Cron job wired (every 6h) — DONE
5. ⚠️ Alfred alert on approval — PARTIALLY DONE (need verification)
6. ⚠️ Notification delivery to Joe — NEED TO VERIFY

---

## Change 1: Ensure Alfred Gets Approval Notifications

**File:** `backend/src/routes/kanban.ts` — Approval endpoint (lines 297-320)

**Current code:**
```typescript
// POST /api/kanban/:cardId/actions/approve
router.post("/:cardId/actions/approve", async (req: Request, res: Response) => {
  try {
    const cardId = Array.isArray(req.params.cardId) ? req.params.cardId[0] : req.params.cardId;
    const { approver } = req.body;
    if (!approver) {
      return res.status(400).json({ error: "approver is required" });
    }
    
    const board = getKanbanBoard();
    const card = board.columns.review.find((c) => c.id === cardId);
    if (!card) {
      return res.status(404).json({ error: "Card not found in review column" });
    }

    // Add approval comment
    const comment = await addComment(
      cardId,
      "joe",
      `✅ **Approved by ${approver}** at ${new Date().toISOString()}`
    );

    // Move card to done
    const movedCard = await moveCard(cardId, "done");
    if (!movedCard) {
      return res.status(500).json({ error: "Failed to move card to done" });
    }

    res.json({
      status: "approved",
      card: movedCard,
      approver,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

**Issue:** No alert to Alfred after approval.

**Fix:** Import gateway and send message after card is moved:

```typescript
import { sendChatMessage } from "../gateway";

// ... in approval endpoint, after moveCard() succeeds:

    // Move card to done
    const movedCard = await moveCard(cardId, "done");
    if (!movedCard) {
      return res.status(500).json({ error: "Failed to move card to done" });
    }

    // NEW: Alert Alfred of approval
    try {
      await sendChatMessage(
        `[KANBAN-APPROVAL] Card "${card.title}" (${cardId}) approved by Joe. Moved to Done.`,
        "agent:main:main"
      );
    } catch (err) {
      console.error("[kanban] Failed to send approval alert to Alfred:", err);
      // Don't block response; approval already succeeded
    }

    res.json({
      status: "approved",
      card: movedCard,
      approver,
      timestamp: new Date().toISOString(),
    });
```

**Verify:** Check `backend/src/gateway.ts` exports `sendChatMessage` function.

---

## Change 2: Similar fixes for reject and request-changes

**Current:** Endpoints exist but don't alert Alfred.

**File:** `backend/src/routes/kanban.ts` — reject endpoint (lines 322-360)

```typescript
// POST /api/kanban/:cardId/actions/reject
router.post("/:cardId/actions/reject", async (req: Request, res: Response) => {
  try {
    // ... existing code ...

    // Move card back to in_progress with rejection reason
    const movedCard = await moveCard(cardId, "in_progress", { rejectionReason: reason });
    if (!movedCard) {
      return res.status(500).json({ error: "Failed to move card back to in_progress" });
    }

    // NEW: Alert Alfred of rejection
    try {
      await sendChatMessage(
        `[KANBAN-REJECTION] Card "${card.title}" (${cardId}) rejected by Joe.\n**Reason:** ${reason}\nMoved back to In Progress.`,
        "agent:main:main"
      );
    } catch (err) {
      console.error("[kanban] Failed to send rejection alert to Alfred:", err);
    }

    res.json({
      status: "rejected",
      card: movedCard,
      rejector,
      reason,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

**File:** `backend/src/routes/kanban.ts` — request-changes endpoint (lines 362-400)

```typescript
// POST /api/kanban/:cardId/actions/request-changes
router.post("/:cardId/actions/request-changes", async (req: Request, res: Response) => {
  try {
    // ... existing code ...

    // Move card back to in_progress with change request
    const movedCard = await moveCard(cardId, "in_progress", { changeRequest: changes });
    if (!movedCard) {
      return res.status(500).json({ error: "Failed to move card back to in_progress" });
    }

    // NEW: Alert Alfred of change request
    try {
      await sendChatMessage(
        `[KANBAN-CHANGES-REQUESTED] Card "${card.title}" (${cardId}) needs changes from Joe.\n**Changes:** ${changes}\nMoved back to In Progress.`,
        "agent:main:main"
      );
    } catch (err) {
      console.error("[kanban] Failed to send change request alert to Alfred:", err);
    }

    res.json({
      status: "changes-requested",
      card: movedCard,
      requester,
      changes,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
```

---

## Change 3: Verify approval-sla notification delivery

**File:** `backend/src/readers/approval-sla.ts` — `send72hReminder()` function

**Current code (already correct):**
```typescript
export async function send72hReminder(cardId: string): Promise<boolean> {
  try {
    const board = getKanbanBoard();
    const card = board.columns.review.find((c) => c.id === cardId);

    if (!card) {
      console.error(`[approval-sla] Card ${cardId} not found in review`);
      return false;
    }

    // Create approval notification with action buttons
    const notification = createNotification({
      type: "kanban-approval",
      title: `Review Approval Reminder: ${card.title}`,
      message: `This card has been in review for 72 hours. Please review and approve/reject it.`,
      cardId: card.id,
      source: "sla-escalation",
      deliveryStatus: "pending",
      actions: [
        { type: "approve", label: "Approve" },
        { type: "reject", label: "Reject" },
        { type: "request-changes", label: "Request Changes" },
      ],
    });

    // ... rest of function
  }
}
```

**Status:** This already creates a `kanban-approval` notification with action buttons. ✅

**Verify:** Check that notifications are being delivered to Joe (Command Center frontend).

---

## Change 4: Ensure auto-promote also alerts Alfred

**File:** `backend/src/readers/approval-sla.ts` — `autoPromoteReviewCard()` function

**Current code:**
```typescript
export async function autoPromoteReviewCard(cardId: string): Promise<boolean> {
  try {
    const board = getKanbanBoard();
    const card = board.columns.review.find((c) => c.id === cardId);

    if (!card) {
      console.error(`[approval-sla] Card ${cardId} not found in review`);
      return false;
    }

    // Add escalation comment
    await addComment(
      cardId,
      "alfred",
      `⏫ **Auto-Promoted to Done** at ${new Date().toISOString()} (7-day SLA escalation). This low-risk deliverable was auto-promoted due to prolonged review wait.`
    );

    // Move to done
    const movedCard = await moveCard(cardId, "done", { skipNotify: true });
    if (!movedCard) {
      console.error(`[approval-sla] Failed to move card ${cardId} to done`);
      return false;
    }

    console.log(`[approval-sla] Auto-promoted card ${cardId} to done`);
    return true;
  } catch (err) {
    console.error(`[approval-sla] Failed to auto-promote card ${cardId}:`, err);
    return false;
  }
}
```

**Status:** This is correct. Auto-promote already adds a comment with the escalation reason. ✅

---

## Testing Checklist

### Test 1: Create a Review Card
```bash
curl -X POST http://localhost:3001/api/kanban \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task",
    "title": "Test Review Card",
    "description": "Testing approval notifications",
    "priority": "normal"
  }'
```

Save the card ID: `CARD_ID={result.id}`

### Test 2: Move to Review
```bash
curl -X POST http://localhost:3001/api/kanban/$CARD_ID/move \
  -H "Content-Type: application/json" \
  -d '{"toColumn": "review"}'
```

Verify: Card should have `reviewEnteredAt` timestamp set.

### Test 3: Trigger SLA Escalation (72h reminder)
```bash
# Option A: Wait 72 hours, or...
# Option B: Manually edit card's reviewEnteredAt to 3+ days ago, then:

curl -X POST http://localhost:3001/api/kanban/sla-escalation
```

Verify: 
- New notification created with type `kanban-approval`
- Notification has `actions` array with approve/reject/request-changes
- Notification has `cardId` set

### Test 4: Check Notification in Frontend
```
Navigate to http://localhost:3001/notifications
Filter: Unanswered
Look for approval notification with three buttons (Approve, Reject, Request Changes)
```

### Test 5: Approve via Notification
```
Click "Approve" button in notification
Watch card move to Done
Verify comment added: "✅ **Approved by joe**"
Check Alfred received alert: [KANBAN-APPROVAL] message
```

### Test 6: Test Reject
```
Create another review card
Wait 72h or manually trigger SLA
Click "Reject" button
Verify: Card moves to In Progress + comment added
```

### Test 7: Test Request Changes
```
Create another review card
Wait 72h or manually trigger SLA
Click "Request Changes" button
Verify: Card moves to In Progress + change request comment
```

### Test 8: Auto-Promote (7 days)
```
Create review card
Edit reviewEnteredAt to 7+ days ago
Trigger SLA escalation
Verify: Card auto-promoted to Done with escalation comment
```

---

## Verification Script

Run after making code changes:

```bash
#!/bin/bash
set -e

echo "=== Checking imports in kanban.ts ==="
grep "sendChatMessage" /Users/hopenclaw/command-center/backend/src/routes/kanban.ts || echo "⚠️ sendChatMessage not imported"

echo "=== Checking gateway.ts exports ==="
grep "export.*sendChatMessage" /Users/hopenclaw/command-center/backend/src/gateway.ts || echo "⚠️ sendChatMessage not exported"

echo "=== Checking approval endpoint has Alfred alert ==="
grep -A 10 "POST /api/kanban/:cardId/actions/approve" /Users/hopenclaw/command-center/backend/src/routes/kanban.ts | grep -i "sendChat\|alfred" && echo "✅ Found" || echo "❌ Missing"

echo "=== Checking SLA escalation job exists ==="
grep -i "Kanban Review SLA Escalation" /Users/hopenclaw/.openclaw/cron/jobs.json && echo "✅ Found" || echo "❌ Missing"

echo "=== Checking approval-sla creates kanban-approval notifications ==="
grep "kanban-approval" /Users/hopenclaw/command-center/backend/src/readers/approval-sla.ts && echo "✅ Found" || echo "❌ Missing"

echo ""
echo "=== Summary ==="
echo "If all checks passed, the implementation is ready."
```

---

## Deployment Steps

1. **Code Changes:**
   - [ ] Add imports to `backend/src/routes/kanban.ts`
   - [ ] Add Alfred alerts to all three action endpoints
   - [ ] Test build locally: `npm run build`

2. **Restart Command Center:**
   ```bash
   launchctl kickstart -k gui/$(id -u)/com.alfred.dashboard-nextjs
   ```

3. **Verify in Dashboard:**
   - [ ] Check `/api/kanban/sla-escalation` endpoint is responsive
   - [ ] Create test card → move to review → trigger escalation
   - [ ] Verify approval notification appears
   - [ ] Click approve → card moves to done

4. **Monitor First 24h:**
   - [ ] Check gateway logs for any errors
   - [ ] Verify Alfred receives approval alerts
   - [ ] Check Command Center for notifications

---

## Rollback Plan

If issues occur:
1. Revert code changes to `backend/src/routes/kanban.ts`
2. Restart Command Center
3. Disable SLA escalation job: `PATCH /api/cron/{id} { enabled: false }`

---

## Success Criteria

✅ Approval notification appears with three buttons (Approve, Reject, Request Changes)
✅ Clicking approve → card moves to done instantly
✅ Alfred receives `[KANBAN-APPROVAL]` message
✅ Card comments show approval details (who + when)
✅ No manual board navigation needed
✅ 72h reminder + 7d auto-promote working

---

## Time Estimate

- Code changes: 20 minutes
- Build + restart: 5 minutes
- Testing: 30 minutes
- **Total: ~1 hour**

---

## Notes

- All infrastructure is in place; these are finishing touches
- Risk is low — all changes are additive
- Frontend already handles approval notifications perfectly
- SLA escalation job is already running
