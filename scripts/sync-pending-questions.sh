#!/bin/bash
# sync-pending-questions.sh — Sync unanswered notifications into ACTIVE-TASK.md
# Ensures pending questions survive session death/reset.
# Called by: kanban-idle-loop.sh (every 30m), Session Checkpoint cron (every 20m)
# Usage: sync-pending-questions.sh
#
# FIX (2026-03-01): Use temp file for pending markdown to avoid shell string
# interpolation bugs when notification text contains quotes/backticks.

NOTIF_FILE="$HOME/.openclaw/workspace/goals/notifications.json"
ACTIVE_TASK="$HOME/.openclaw/workspace/ACTIVE-TASK.md"
START_MARKER="<!-- PENDING-Q-START -->"
END_MARKER="<!-- PENDING-Q-END -->"
TMPFILE=$(mktemp /tmp/sync-pending-questions.XXXXXX)

cleanup() { rm -f "$TMPFILE"; }
trap cleanup EXIT

# Bail if files don't exist
[ -f "$NOTIF_FILE" ] || { echo "No notifications file"; exit 0; }
[ -f "$ACTIVE_TASK" ] || { echo "No ACTIVE-TASK.md"; exit 0; }

# Extract unanswered notifications and write to temp file (avoids interpolation bugs)
python3 - "$NOTIF_FILE" "$TMPFILE" <<'PYEOF'
import json, sys
from datetime import datetime

notif_file, tmp_file = sys.argv[1], sys.argv[2]

try:
    with open(notif_file) as f:
        notifs = json.load(f)
except Exception as e:
    print(f"Error reading notifications: {e}", file=sys.stderr)
    sys.exit(0)

unanswered = [n for n in notifs if not n.get('answered', False)]

lines = []
if not unanswered:
    lines.append('_(none)_')
else:
    for n in unanswered:
        nid = n.get('id', '?')
        title = n.get('title', 'Untitled')
        ntype = n.get('type', 'unknown')
        created = n.get('createdAt', '')
        msg = n.get('message', '')
        snippet = msg[:150].replace('\n', ' ')
        if len(msg) > 150:
            snippet += '...'

        date_str = ''
        if created:
            try:
                dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                date_str = dt.strftime('%b %d %H:%M')
            except Exception:
                date_str = created[:16]

        lines.append(f'- **{title}** (_{ntype}_, {date_str})')
        lines.append(f'  ID: `{nid}` — {snippet}')
        lines.append('')

with open(tmp_file, 'w') as f:
    f.write('\n'.join(lines))
PYEOF

if [ $? -ne 0 ]; then
    echo "WARN: Failed to generate pending questions markdown" >&2
    exit 1
fi

# Count pending for logging
COUNT=$(python3 -c "
import json
with open('$NOTIF_FILE') as f:
    notifs = json.load(f)
print(sum(1 for n in notifs if not n.get('answered', False)))
" 2>/dev/null || echo "0")

# Replace content between markers in ACTIVE-TASK.md using temp file (safe for all content)
python3 - "$ACTIVE_TASK" "$TMPFILE" "$START_MARKER" "$END_MARKER" <<'PYEOF'
import sys

active_task_file, tmp_file, marker_start, marker_end = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with open(tmp_file, 'r') as f:
    pending_md = f.read().strip()

with open(active_task_file, 'r') as f:
    content = f.read()

start_idx = content.find(marker_start)
end_idx = content.find(marker_end)

if start_idx == -1 or end_idx == -1:
    print('WARN: Markers not found in ACTIVE-TASK.md', file=sys.stderr)
    sys.exit(1)

new_content = (
    content[:start_idx + len(marker_start)]
    + '\n'
    + pending_md
    + '\n'
    + content[end_idx:]
)

with open(active_task_file, 'w') as f:
    f.write(new_content)
PYEOF

if [ $? -eq 0 ]; then
    if [ "$COUNT" = "0" ]; then
        echo "No pending questions"
    else
        echo "Synced $COUNT pending question(s) to ACTIVE-TASK.md"
    fi
else
    echo "WARN: Failed to update ACTIVE-TASK.md" >&2
    exit 1
fi

exit 0
