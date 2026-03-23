# Quiet-Hours Outbox System (2026-03-23)

## Overview

**Problem:** During quiet hours (11 PM - 9 AM AST), Alfred cannot send direct notifications to Joe (iMessage, Discord DMs). However, proactive jobs, cron tasks, and overnight code reviews still generate results that need attention.

**Solution:** A durable outbox system that:
1. Captures overnight updates/questions/alerts
2. Deduplicates and prioritizes them
3. Delivers a structured morning digest at **09:00 AST** (end of quiet hours)
4. Supports both Command Center notifications and Discord posts

---

## Architecture

### Three Components

#### 1. Outbox Storage (`~/.openclaw/workspace/outbox/`)

```
outbox/
├── messages.jsonl          # Append-only ledger of all outbox items
├── active.json             # Current items (timestamp < 24h ago, not expired)
└── INDEX.md               # Quick reference + stats
```

**Message Format (JSONL):**
```json
{
  "id": "msg_1711219200_abc123",
  "timestamp": "2026-03-24T02:15:00Z",
  "type": "question|alert|update",
  "priority": "critical|high|normal|low",
  "title": "Brief subject",
  "message": "Full context",
  "source": "daily-inquiry|code-review|cron-task|manual",
  "goal_id": "optional",
  "task_id": "optional",
  "channel": "command_center|discord|both",
  "discord_target": "channel_id_or_null",
  "dedup_key": "optional_for_dedup",
  "expires_at": "2026-03-25T09:00:00Z",
  "delivered": false,
  "delivered_at": null,
  "digest_batch": null
}
```

#### 2. Outbox Collector

**Script:** `scripts/quiet-hours-outbox-append.sh`

Captures messages from:
- Daily inquiry jobs
- Code review jobs
- Cron task results
- Manual system events
- Alerts triggered during quiet hours

**Behavior:**
- Append to `outbox/messages.jsonl` (write-ahead log)
- Update `outbox/active.json` (denormalized index)
- Dedup by key: `source:dedup_key` within 24-hour window
- Auto-expire items older than 24h
- Log to `outbox/INDEX.md` (summary stats)

#### 3. Morning Digest Dispatcher

**Script:** `scripts/morning-digest-dispatcher.sh` (runs at 09:00 AST via cron)

**Process:**
1. Load all non-expired items from `outbox/active.json`
2. Group by type: `critical` → `high` → `normal` → `low`
3. Build digest message with:
   - **Critical items:** List with full context
   - **High items:** Summarized (title + 1-liner)
   - **Normal items:** Grouped by category (alerts, questions, updates)
   - **Low items:** Optional footer ("n other items, see dashboard")
4. Post to Command Center as a single `update` notification
5. Mirror to Discord (alerts channel) if any critical/high items
6. Mark delivered, timestamp delivery time
7. Rotate `messages.jsonl` (move to archive if >10MB)

---

## Integration Points

### How Jobs Feed the Outbox

#### Pattern A: Direct Append (Simple)
```bash
#!/bin/bash
# my-job.sh
source ~/.openclaw/workspace/scripts/outbox-lib.sh

result=$(do_work)

# Append to outbox (not direct-to-Joe since quiet hours)
outbox_append \
  --type "alert" \
  --title "Job completed" \
  --message "$result" \
  --source "my-job" \
  --priority "normal"
```

#### Pattern B: Conditional Direct OR Outbox (Smart)
```bash
#!/bin/bash
# my-job.sh

source ~/.openclaw/workspace/scripts/outbox-lib.sh

result=$(do_work)

if is_quiet_hours; then
  # Append to outbox for morning digest
  outbox_append --type "update" --title "..." --message "$result" --source "my-job"
else
  # Send directly (Joe is awake)
  send-notification.sh "update" "..." "$result"
fi
```

#### Pattern C: Always Quiet (Critical Only)
```bash
#!/bin/bash
# my-critical-job.sh

source ~/.openclaw/workspace/scripts/outbox-lib.sh

result=$(do_work)

if [ "$CRITICAL" = "true" ]; then
  # Critical always bypasses quiet hours (gateway emergency alerts)
  send-notification.sh "alert" "CRITICAL" "$result"
else
  # Normal items → outbox
  outbox_append --type "update" --title "..." --message "$result" --source "my-job"
fi
```

---

## Deduplication Rules

**Key:** `source:dedup_key` or `source:title_hash` (if no explicit key)

**Window:** 24 hours (items older than 24h from last occurrence are included again)

**Examples:**

```bash
# Daily inquiry — dedup for 7 days
outbox_append --type "question" \
  --title "Passive income ideas?" \
  --message "..." \
  --source "daily-inquiry" \
  --dedup_key "daily-inquiry:passive-income" \
  --dedup_window_hours 168  # 7 days

# Code review — dedup for 2 hours (catch rapid fixes)
outbox_append --type "alert" \
  --title "CoinUsUp PR#42 review" \
  --message "..." \
  --source "code-review" \
  --dedup_key "code-review:pr-42" \
  --dedup_window_hours 2
```

---

## Expiry Rules

**Default:** 24 hours (items auto-expire at 24h)

**Override:** Set `expires_at` in message:

```bash
outbox_append --type "update" \
  --title "..." \
  --message "..." \
  --expires_in_hours 48  # Custom expiry
```

**Expired items:**
- Removed from `outbox/active.json` during next digest
- Archived to `outbox/archive/YYYY-MM-DD.jsonl` for audit
- Logged as "expired" in `outbox/INDEX.md`

---

## Digest Format

### Command Center Notification

```
TYPE: update
TITLE: Morning Digest — 9 items (3 critical, 2 high, 4 normal)

MESSAGE:
---

🔴 CRITICAL (3 items)
─────────────────────

1. Gateway out of memory
   Context: Allocated 85% of system RAM
   Impact: Cron jobs queuing up
   
2. Anthropic API 429 rate-limit hit
   Context: 15 messages in last 60 min
   Impact: New tasks blocked
   
3. Backup sync failed
   Context: S3 auth token expired
   Impact: Tier-2 backup not syncing

─────────────────────

⚠️  HIGH (2 items)
─────────────────────

1. CoinUsUp PR#42 needs review (2 hrs old)
2. Daily inquiry: 3 passive income ideas available

─────────────────────

📋 NORMAL (4 items)
─────────────────────

Questions (2):
  • Should I update React dependencies?
  • Passive income: stock signal app viable?

Alerts (1):
  • Even Us Up: 0 errors, 2 warnings

Updates (1):
  • Alfred system improvements: 3 new optimizations

View all: [Command Center Dashboard](link)
```

### Discord Post (Alerts Channel)

**Only critical + high items**, formatted for Discord readability:

```
🔴 **Morning Digest — 3 Critical Items**

1️⃣  **Gateway out of memory** (85% allocated)
    → Cron jobs queueing up

2️⃣  **API 429 rate-limit hit**
    → New tasks blocked for ~30 min

3️⃣  **Backup sync failed** (S3 auth)
    → Tier-2 backups paused

Full digest: See Command Center notifications
```

---

## Quiet-Hours Detection

**Function:** `is_quiet_hours` in `outbox-lib.sh`

```bash
is_quiet_hours() {
  local tz="America/Moncton"
  local hour=$(date +%H --date="TZ=$tz now")
  # 11 PM (23) through 8 AM (08) = quiet
  [ "$hour" -ge 23 ] || [ "$hour" -lt 9 ]
}
```

---

## Cron Job Integration

### Add to Cron Jobs List

**Job:** `morning-digest-dispatcher`

```json
{
  "name": "Morning Digest Dispatcher",
  "description": "Deliver quiet-hours outbox as structured morning digest at 09:00 AST",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *",
    "tz": "America/Moncton"
  },
  "enabled": true,
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run morning digest: bash ~/.openclaw/workspace/scripts/morning-digest-dispatcher.sh",
    "timeoutSeconds": 60
  },
  "delivery": {
    "mode": "announce",
    "to": "1476595177190592533"
  }
}
```

---

## File Layout

```
~/.openclaw/workspace/
├── outbox/                          # NEW: Quiet-hours outbox storage
│   ├── messages.jsonl              # Append-only ledger (all messages, ever)
│   ├── active.json                 # Denormalized index (current items)
│   ├── archive/                    # Expired items by date
│   │   ├── 2026-03-22.jsonl
│   │   └── 2026-03-23.jsonl
│   ├── INDEX.md                    # Summary stats + quick lookup
│   └── DIGEST-TEMPLATE.md          # Formatting guide
│
├── scripts/
│   ├── outbox-lib.sh               # NEW: Library functions
│   ├── quiet-hours-outbox-append.sh # NEW: Append to outbox
│   └── morning-digest-dispatcher.sh # NEW: 09:00 delivery
│
└── docs/
    └── QUIET-HOURS-OUTBOX.md       # This file
```

---

## Safety & Reliability

### Write-Ahead Log
- `messages.jsonl` is append-only (never modified)
- `active.json` is denormalized from `messages.jsonl` (regenerated daily)
- **Recovery:** If `active.json` is corrupted, rebuild from `messages.jsonl`

### Backup
- `outbox/` directory included in hourly backups
- Archive rotated when main ledger >10MB
- Expiry rules prevent unbounded growth (default 24h)

### Error Handling
- Failed append → logged to `tracking/outbox.log`, non-blocking
- Failed delivery → item remains in `active.json`, retried next day
- Malformed JSON → logged, skipped during digest

### Testing

```bash
# Append a test message
bash scripts/quiet-hours-outbox-append.sh \
  --type "alert" \
  --title "Test message" \
  --message "Testing the outbox" \
  --source "manual-test"

# View current outbox
cat outbox/active.json | jq '.items | length'

# Run digest immediately (normally 09:00 only)
bash scripts/morning-digest-dispatcher.sh --force
```

---

## Expected Impact

### Current State
- Overnight jobs generate results but Joe misses them
- No structured summary of what happened during quiet hours
- Questions/alerts scattered across logs, Discord, undefined channels
- No dedup → duplicate questions asked repeatedly

### After Implementation
- **Better signal quality:** All overnight results captured in one place
- **Fewer missed updates:** Single morning digest tells Joe what changed
- **Reduced daytime interruption:** Non-critical items batched, not scattered
- **Dedup confidence:** Same question won't cycle every 4 days
- **Audit trail:** Every update logged to `messages.jsonl` with timestamp

### Metrics to Track
- **Items/day appended to outbox**
- **Dedup rate** (% of items that would duplicate)
- **Digest delivery rate** (% successfully sent at 09:00)
- **Item types** (% question vs alert vs update)
- **Priority distribution** (% critical vs high vs normal)

---

## Migration Notes

### Existing Cron Jobs
- No changes to existing jobs unless they currently block on quiet hours
- Recommend gradually converting to Pattern B (conditional direct OR outbox)

### Quiet-Hours Policy Transition
- Current: Quiet hours block direct notifications
- New: Quiet hours feed to outbox, digest at 09:00
- No change to Joe's actual workload (he still sees everything)
- Just cleaner delivery format

### Discord Channel Routing
- Outbox doesn't replace Discord posts for code reviews, project updates
- Outbox only handles system notifications/questions from automated jobs
- Discord remains primary for narrative/discussion (HAL completions, research)

---

## Future Enhancements (Post-MVP)

1. **Customizable digest schedule** — Option for 09:00, 12:00, 18:00 deliveries
2. **Importance sampling** — Keep top 3 critical items, summarize rest
3. **Per-category filters** — Joe opts in/out of categories (e.g., skip code reviews)
4. **Weekly summary** — Aggregate outbox stats into Friday digest
5. **Auto-action suggestions** — "Based on alerts, I recommend: X, Y, Z"
6. **Rich formatting** — Code blocks, inline charts, linked context
7. **Digest reply channel** — Joe can reply to digest items in Discord thread
