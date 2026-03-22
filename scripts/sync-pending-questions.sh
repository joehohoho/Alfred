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
# Backward-compatible marker variants seen in older ACTIVE-TASK templates
ALT_START_MARKERS=(
  "<!--PENDING-Q-START-->"
  "<!-- PENDING-QUESTIONS-START -->"
  "<!--PENDING-QUESTIONS-START-->"
)
ALT_END_MARKERS=(
  "<!--PENDING-Q-END-->"
  "<!-- PENDING-QUESTIONS-END -->"
  "<!--PENDING-QUESTIONS-END-->"
)
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
python3 - "$ACTIVE_TASK" "$TMPFILE" "$START_MARKER" "$END_MARKER" "${ALT_START_MARKERS[@]}" -- "${ALT_END_MARKERS[@]}" <<'PYEOF'
import re
import sys

args = sys.argv[1:]
active_task_file = args[0]
tmp_file = args[1]
primary_start = args[2]
primary_end = args[3]

# Split args into alt starts / alt ends around sentinel --
rest = args[4:]
if '--' in rest:
    split = rest.index('--')
    alt_starts = rest[:split]
    alt_ends = rest[split + 1:]
else:
    alt_starts = []
    alt_ends = []

with open(tmp_file, 'r') as f:
    pending_md = f.read().strip()

with open(active_task_file, 'r') as f:
    content = f.read()

start_markers = [primary_start] + alt_starts
end_markers = [primary_end] + alt_ends

start_idx = -1
start_marker_used = None
for m in start_markers:
    i = content.find(m)
    if i != -1:
        start_idx = i
        start_marker_used = m
        break

end_idx = -1
end_marker_used = None
if start_idx != -1:
    for m in end_markers:
        i = content.find(m, start_idx)
        if i != -1:
            end_idx = i
            end_marker_used = m
            break

if start_idx != -1 and end_idx != -1:
    # Normalize to canonical markers while replacing section body
    new_content = (
        content[:start_idx]
        + primary_start
        + '\n'
        + pending_md
        + '\n'
        + primary_end
        + content[end_idx + len(end_marker_used):]
    )
else:
    # Drift recovery: append canonical marker block under "## Pending Questions" header if present,
    # otherwise append at end of file.
    block = f"\n{primary_start}\n{pending_md}\n{primary_end}\n"
    header_match = re.search(r'^##\s+Pending Questions\s*$', content, flags=re.MULTILINE)
    if header_match:
        insert_at = header_match.end()
        new_content = content[:insert_at] + block + content[insert_at:]
    else:
        if not content.endswith('\n'):
            content += '\n'
        new_content = content + '\n## Pending Questions\n' + block

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
