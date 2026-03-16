# Review Escalation Engine

## Overview

Automatic escalation + action layer that eliminates stuck review cards. Replaces manual "check the board" cycles with:
- **Automatic promotion** of extremely stale cards (>7 days)
- **Digest notifications** with action buttons (approve/defer/review)
- **Time-tracking** to measure and reduce review wait time

---

## The Problem

Current state:
- Review cards wait indefinitely (4-5 cards stuck, some >7 days)
- Joe must manually navigate kanban board to approve
- No SLA enforcement → artificial throughput bottleneck
- Context reload for each status check → token waste

This costs:
- ~4–5 hrs/week manual approval checking
- $X/week in wasted context reloads
- Delayed ship dates for completed work

---

## The Solution

Cron job that runs every 30–60 min:

1. **Fetch review column** from kanban API
2. **Identify stale cards:**
   - 24–72h: warning notification
   - 72h–7d: critical notification
   - >7d: auto-promote to "blocked" lane + escalation comment
3. **Send single digest** (not per-card spam) with links to board
4. **Log metrics** for dashboard (optional)

---

## Usage

### Manual trigger
```bash
bash scripts/review-escalation-engine.sh
```

Output:
```
[2026-03-16 13:20:15] Fetching kanban board...
[2026-03-16 13:20:15] Found 2 cards >7 days in review — promoting to blocked...
[2026-03-16 13:20:15] ✓ Promoted to blocked: Fix auth bug (9d stale)
[2026-03-16 13:20:15] ✓ Promoted to blocked: Add email notifications (8d stale)
[2026-03-16 13:20:15] Sending digest notification: 1 critical, 3 warning...
[2026-03-16 13:20:16] Review escalation complete: promoted=2, warned=3, critical=1
```

### Dry-run (no actual changes)
```bash
bash scripts/review-escalation-engine.sh --dry-run
```

Output shows what would be done without making changes.

### Cron schedule (automated)

Add to cron (or use existing dashboard cron setup):

```bash
# Every 30 minutes
*/30 * * * * bash /Users/hopenclaw/.openclaw/workspace/scripts/review-escalation-engine.sh >> /Users/hopenclaw/.openclaw/workspace/logs/review-escalation.log 2>&1
```

Or use OpenClaw cron API:
```bash
curl -X POST http://localhost:7777/api/cron/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "review-escalation",
    "schedule": { "kind": "every", "everyMs": 1800000 },
    "payload": { "kind": "systemEvent", "text": "bash /Users/hopenclaw/.openclaw/workspace/scripts/review-escalation-engine.sh" },
    "delivery": { "mode": "none" },
    "sessionTarget": "main",
    "enabled": true
  }'
```

---

## Escalation Flow

```
Card in review
    ↓
    ├─ <24h → ✅ OK (no action)
    │
    ├─ 24–72h → ⚠️  WARNING
    │           (digest notification, tracked)
    │
    ├─ 72h–7d → 🚨 CRITICAL
    │           (digest notification, tracked)
    │
    └─ >7d → 🚨🚨 AUTO-PROMOTE
             (move to "blocked" lane)
             (post escalation comment)
             (log incident)
```

### Thresholds

Configurable in script (top of file):

```bash
WARN_THRESHOLD=24          # Hours
CRITICAL_THRESHOLD=72      # Hours
AUTO_PROMOTE_THRESHOLD=$((7 * 24))  # 7 days in hours
```

---

## Notification Format

Single digest (not per-card):

```
🔴 **Review Bottleneck Alert** (4 cards waiting)

🚨 CRITICAL (>72h):
  • Fix login redirect bug — 96 hours
  • Implement password reset — 80 hours

⚠️  WARNING (24-72h):
  • Refactor database layer — 48 hours
  • Add caching optimization — 36 hours

Actions: Review board at http://localhost:3001 or approve/defer from notification.
```

---

## Logs & Monitoring

### Main log
Location: `~/.openclaw/workspace/logs/review-escalation.log`

Format:
```
[2026-03-16 13:20:15] Fetching kanban board...
[2026-03-16 13:20:15] Found 2 cards >7 days in review — promoting to blocked...
[2026-03-16 13:20:15] ✓ Promoted to blocked: ...
[2026-03-16 13:20:16] Review escalation complete: promoted=2, warned=3, critical=1
```

### Latest state (JSON)
Location: `~/.openclaw/workspace/tracking/review-escalation-latest.json`

```json
{
  "warning": [
    { "id": "card-1", "title": "Bug fix", "age_hours": 36 },
    { "id": "card-2", "title": "Feature", "age_hours": 48 }
  ],
  "critical": [
    { "id": "card-3", "title": "Security fix", "age_hours": 96 }
  ],
  "auto_promote": [
    { "id": "card-4", "title": "Refactor", "age_hours": 192 }
  ],
  "timestamp": "2026-03-16T13:20:16Z",
  "promoted": 1
}
```

### Escalation comment (posted to card)
```
🚨 AUTO-ESCALATION: Stale in review for 9d. Promoting to blocked. Awaiting decision or rollback.
```

---

## Success Metrics

### Before
- Median review wait: ~5–7 days
- Max review wait: >2 weeks (some cards never move)
- Manual approval checks: 4–5 per day
- Context reloads for status: 10+/day

### After (target)
- Median review wait: 1–2 days (auto-promotion forces decision)
- Max review wait: 7 days (hard limit, auto-promote)
- Manual checks: 0 (notifications sent automatically)
- Context reloads: 0 (digest replaces manual checking)

---

## Customization

### Change thresholds

Edit script (lines ~20):
```bash
WARN_THRESHOLD=24              # Change to 12 for more aggressive
CRITICAL_THRESHOLD=72          # Change to 48 for tighter tracking
AUTO_PROMOTE_THRESHOLD=$((7 * 24))  # Change to 3 days: $((3 * 24))
```

### Change notification routing

By default, notifications route via `scripts/send-notification.sh` (Command Center).

To send to Slack instead:
```bash
# Edit script, replace notification section with:
message action=send \
  channel=slack \
  target="#review-alerts" \
  message="$MSG"
```

### Filter to specific lanes

Only check review column currently. To also check "blocked":
```bash
# In Python section, change:
for column in ["review", "blocked"]:
    cards = board.get('columns', {}).get(column, [])
    # ... rest of logic
```

---

## Troubleshooting

### "Kanban API unreachable"
```
Error: Kanban API unreachable
(Is the dashboard running? Try: launchctl start com.alfred.dashboard-nextjs)
```

**Fix:**
```bash
launchctl start com.alfred.dashboard-nextjs
sleep 5
bash scripts/review-escalation-engine.sh
```

### No cards promoted despite stale cards visible
Check if cards have `updatedAt` timestamp:
```bash
curl -s http://localhost:3001/api/kanban | jq '.columns.review[0]'
# Should see: "updatedAt": "2026-03-09T14:32:10.000Z"
```

### Notification not sent
Check if `send-notification.sh` exists and is executable:
```bash
ls -la scripts/send-notification.sh
bash scripts/send-notification.sh "Test" "Is this working?" "normal"
```

---

## Integration with Other Systems

### Alert to dashboard
Script writes JSON summary to `tracking/review-escalation-latest.json` — dashboard can poll this for live metrics.

### Alert to Discord/Slack
Modify script to call message tool:
```bash
message action=send \
  channel=discord \
  target="review-alerts-channel" \
  message="$MSG"
```

### Link in Daily Inquiry
Include review status in daily standup:
```bash
# In daily-inquiry.sh:
REVIEW_STATUS=$(jq '.warning | length' ~/.openclaw/workspace/tracking/review-escalation-latest.json)
echo "📋 Review cards waiting: $REVIEW_STATUS"
```

---

## Deployment Checklist

- [ ] Copy script to `scripts/review-escalation-engine.sh`
- [ ] Make executable: `chmod +x scripts/review-escalation-engine.sh`
- [ ] Test with `--dry-run`: `bash scripts/review-escalation-engine.sh --dry-run`
- [ ] Test live (single run): `bash scripts/review-escalation-engine.sh`
- [ ] Add to cron (every 30 min) or existing scheduler
- [ ] Verify notification routing works
- [ ] Monitor logs for 24h
- [ ] Update ACTIVE-TASK.md with deployment status

---

## Next Steps

1. **Deploy:** Add cron job (see "Cron schedule" section)
2. **Monitor:** Watch `review-escalation.log` for first 48h
3. **Tune:** Adjust thresholds based on feedback
4. **Integrate:** Link to dashboard metrics + daily standup
5. **Measure:** Track median/max review wait time weekly

Expected outcome: 50%+ reduction in review wait time, zero manual status checks.
