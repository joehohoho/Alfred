# Quiet-Hours Outbox

This directory stores messages captured during quiet hours (11 PM - 9 AM AST) for delivery in a structured morning digest at 09:00 AST.

## Files

- **`messages.jsonl`** — Append-only ledger of all messages (write-ahead log)
- **`active.json`** — Denormalized index of non-expired items (regenerated daily)
- **`archive/`** — Expired items rotated by date
- **`logs/`** — Diagnostic logs and statistics

## Integration

Scripts can append to this outbox via:

```bash
source ~/.openclaw/workspace/scripts/outbox-lib.sh

outbox_append \
  --type "alert" \
  --title "Something happened" \
  --message "Details here" \
  --source "my-script"
```

Or via the wrapper:

```bash
bash ~/.openclaw/workspace/scripts/quiet-hours-outbox-append.sh \
  --type "alert" \
  --title "Something happened" \
  --message "Details here" \
  --source "my-script"
```

## Delivery

The `morning-digest-dispatcher.sh` cron job runs at 09:00 AST daily to:

1. Load all non-expired items
2. Build a structured digest
3. Post to Command Center (notification)
4. Post to Discord (if critical/high items)
5. Mark items as delivered
6. Archive expired items

## Quiet Hours

**When:** 11:00 PM - 08:59 AM AST (20:00 UTC - 12:59 UTC)

**Behavior:**
- Direct notifications to Joe are blocked
- All updates/questions/alerts append to outbox instead
- Morning digest delivers them all at 09:00 AST in one structured message

**Outside quiet hours:**
- Messages can be sent directly (immediate, not queued)
- Outbox still works but direct is preferred for real-time updates

## Manual Testing

```bash
# Append a test message
bash ~/.openclaw/workspace/scripts/quiet-hours-outbox-append.sh \
  --type "alert" \
  --title "Test message" \
  --message "Testing the outbox system" \
  --source "test"

# View current outbox
cat ~/.openclaw/workspace/outbox/active.json | jq '.'

# Run digest immediately (normally 09:00 only)
bash ~/.openclaw/workspace/scripts/morning-digest-dispatcher.sh --force
```

## Monitoring

Check digest execution and stats:

```bash
tail -f ~/.openclaw/workspace/tracking/digest-dispatch.log
tail -f ~/.openclaw/workspace/tracking/outbox.log
```
