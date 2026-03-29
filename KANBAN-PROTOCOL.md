# KANBAN-PROTOCOL.md — Kanban Board Operations

Single source for task execution state on the kanban board.

## On `[KANBAN-COMMENT]`
When Joe comments on a kanban card, Alfred MUST:
1. Parse the card ID from the message header: `(card_id, column: ...)`
2. Respond in the current chat channel (normal reply)
3. **ALSO post the reply back to the card as a comment** via API:
   ```bash
   curl -s -X POST http://localhost:3001/api/kanban/<card_id>/comments \
     -H "Content-Type: application/json" \
     -d "{\"author\":\"alfred\",\"text\":\"<response>\"}"
   ```
4. If action is taken (task started, card moved, etc.) — note it in the card comment too.

**This step is mandatory.** Responding only in chat means Joe sees nothing on the board.

## Cron Job Configuration (SAFEGUARD — Added 2026-03-17)
**Always use explicit channel IDs** in `delivery.to` field. Never assume implicit routing.
- Example: `"delivery": { "mode": "announce", "to": "C0AEE0PLKB4" }` (verify channel ID before deploy)
- Reason: Implicit Discord routing has caused 6 job auto-disables (Mar 10-17)
- Prevention: Add channel ID validation step to cron job creation workflow

## On `[KANBAN-ASSIGNMENT]`
1. Move card to in_progress:  
   `bash ~/.openclaw/workspace/scripts/kanban-move.sh <CARD_ID> in_progress`
2. Do the work
3. Move to review:  
   `bash ~/.openclaw/workspace/scripts/kanban-move.sh <CARD_ID> review`
4. If blocked:  
   `bash ~/.openclaw/workspace/scripts/kanban-blocker.sh <CARD_ID> "question"`

## On `[KANBAN-UNBLOCK]`
Resume work and move to review when complete.

## Alfred-HAL Handoff Contract
When dispatching to HAL, include:
1. **Objective** — One-line goal + constraints (e.g., "Fix login bug without breaking email flow")
2. **Deliverables Checklist** — Exact files/artifacts needed (code, test evidence, rollback steps, migration guides)
3. **Validation Commands** — How to verify success (test command + expected output)
4. **Ownership** — Alfred owns final kanban move + Joe notification (HAL doesn't move to done)

**Why:** Eliminates back-and-forth on acceptance criteria; reduces cards stuck in review waiting for clarification.

### Critical constraint
**HAL only picks up a new Kanban card when `in_progress` is empty.** Alfred may have multiple in_progress cards (parallel work), but the HAL idle dispatcher will not auto-assign a new card while any card is already in_progress. Proactive pool tasks (no board move) can always run.

### HAL completion → Discord (REQUIRED)
When HAL finishes a task (card moves to review with HAL results), post to the HAL completions Discord channel:
`bash ~/.openclaw/workspace/scripts/hal-discord-notify.sh "Task Title" "One-paragraph summary of what HAL delivered"`
Webhook: Discord HAL completions channel — Joe's directive (updated 2026-02-26).

## KNOWN ISSUE: Kanban Approval Bottleneck (Identified 2026-03-07, Confirmed 2026-03-09)
**Problem:** 4-5 review cards stall indefinitely waiting for Joe approval. Notifications sent but no approve/reject buttons in notification UI. Joe must navigate to kanban board separately to approve, creating friction.

**Impact:** ~4-5 hrs/week of manual approval checking. Slows iterative work cycles.

**Suggested fixes (from WORKFLOW-EFFICIENCY-SCAN.md):**
1. Add approve/reject action buttons to approval notifications (2h) — fastest UX improvement
2. Auto-promote review cards after 7 days of inactivity (1h) — fallback auto-escalation
3. Batch approval notifications (reduce daily noise)

**Status:** Known issue, recommended for next workflow optimization cycle.

## Chat-assigned tasks (non-kanban message)
Create a card first:
`bash ~/.openclaw/workspace/scripts/kanban-create.sh task "<title>" "<description>" urgent`
Then follow normal move flow.

## Scripts Reference
- `kanban-move.sh`
- `kanban-blocker.sh`
- `kanban-update.sh`
- `kanban-create.sh`
- `hal-discord-notify.sh` — HAL completion → Discord webhook (`DISCORD_WEBHOOK_HAL_COMPLETIONS`)
