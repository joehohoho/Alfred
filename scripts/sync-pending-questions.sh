#!/bin/bash
# sync-pending-questions.sh — Sync unanswered notifications into ACTIVE-TASK.md
# Ensures pending questions survive session death/reset.
# Called by: kanban-idle-loop.sh (every 30m), Session Checkpoint cron (every 20m)
# Usage: sync-pending-questions.sh

NOTIF_FILE="$HOME/.openclaw/workspace/goals/notifications.json"
ACTIVE_TASK="$HOME/.openclaw/workspace/ACTIVE-TASK.md"
START_MARKER="<!-- PENDING-Q-START -->"
END_MARKER="<!-- PENDING-Q-END -->"

# Bail if files don't exist
[ -f "$NOTIF_FILE" ] || { echo "No notifications file"; exit 0; }
[ -f "$ACTIVE_TASK" ] || { echo "No ACTIVE-TASK.md"; exit 0; }

# Extract unanswered notifications and format as markdown
PENDING_MD=$(python3 -c "
import json, sys
from datetime import datetime

try:
    with open('$NOTIF_FILE') as f:
        notifs = json.load(f)
except Exception:
    sys.exit(0)

unanswered = [n for n in notifs if not n.get('answered', False)]

if not unanswered:
    print('_(none)_')
    sys.exit(0)

for n in unanswered:
    nid = n.get('id', '?')
    title = n.get('title', 'Untitled')
    ntype = n.get('type', 'unknown')
    created = n.get('createdAt', '')
    msg = n.get('message', '')
    # Truncate message to first 150 chars for summary
    snippet = msg[:150].replace('\n', ' ')
    if len(msg) > 150:
        snippet += '...'

    # Format date
    date_str = ''
    if created:
        try:
            dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            date_str = dt.strftime('%b %d %H:%M')
        except Exception:
            date_str = created[:16]

    print(f'- **{title}** (_{ntype}_, {date_str})')
    print(f'  ID: \`{nid}\` — {snippet}')
    print()
" 2>/dev/null)

# Count for logging
COUNT=$(python3 -c "
import json
with open('$NOTIF_FILE') as f:
    notifs = json.load(f)
print(sum(1 for n in notifs if not n.get('answered', False)))
" 2>/dev/null || echo "0")

# Replace content between markers in ACTIVE-TASK.md
python3 -c "
import sys

marker_start = '$START_MARKER'
marker_end = '$END_MARKER'
pending_md = '''$PENDING_MD'''

with open('$ACTIVE_TASK', 'r') as f:
    content = f.read()

# Find and replace between markers
start_idx = content.find(marker_start)
end_idx = content.find(marker_end)

if start_idx == -1 or end_idx == -1:
    # Markers not found — skip (ACTIVE-TASK.md needs the markers added)
    print('WARN: Markers not found in ACTIVE-TASK.md', file=sys.stderr)
    sys.exit(1)

new_content = (
    content[:start_idx + len(marker_start)]
    + '\n'
    + pending_md.strip()
    + '\n'
    + content[end_idx:]
)

with open('$ACTIVE_TASK', 'w') as f:
    f.write(new_content)
" 2>/dev/null

if [ $? -eq 0 ]; then
    if [ "$COUNT" = "0" ]; then
        echo "No pending questions"
    else
        echo "Synced $COUNT pending question(s) to ACTIVE-TASK.md"
    fi
else
    echo "WARN: Failed to update ACTIVE-TASK.md" >&2
fi

exit 0
