#!/bin/bash
# session-watchdog.sh — Detect and auto-repair corrupted main sessions
# Called by LaunchAgent every 10 minutes
# Detects the "No tool call found" loop and resets the session automatically
#
# How it works:
#   1. Checks gateway.err.log for repeated "No tool call found" errors
#   2. If 3+ occurrences of the SAME call_id in the last 15 minutes = session stuck
#   3. Backs up the corrupted session, deletes it, cleans sessions.json
#   4. Gateway auto-creates a fresh session on next request
#
# Usage: session-watchdog.sh

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
ERR_LOG="$HOME/.openclaw/logs/gateway.err.log"
BACKUP_DIR="$SESSIONS_DIR/backups"
THRESHOLD=3
WINDOW_MINUTES=15

echo "=== Session Watchdog ($(date +%H:%M:%S)) ==="

if [ ! -f "$ERR_LOG" ]; then
  echo "  No error log found"
  exit 0
fi

# Detect stuck call_id via Python (avoids all shell quoting issues)
STUCK_CALL_ID=$(python3 << 'PYEOF'
import re, os
from datetime import datetime, timezone, timedelta

err_log = os.path.expanduser("~/.openclaw/logs/gateway.err.log")
window = timedelta(minutes=15)
now = datetime.now(timezone.utc)
cutoff = now - window
threshold = 3

pattern = re.compile(r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z).*No tool call found.*call_id (\S+)')

call_counts = {}
with open(err_log) as f:
    for line in f:
        m = pattern.match(line)
        if not m:
            continue
        ts_str, call_id = m.groups()
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            continue
        if ts >= cutoff:
            call_id = re.sub(r'[.\s"]+$', "", call_id)
            call_counts[call_id] = call_counts.get(call_id, 0) + 1

for cid, count in call_counts.items():
    if count >= threshold:
        print(cid)
        break
PYEOF
)

if [ -z "$STUCK_CALL_ID" ]; then
  echo "  No stuck sessions detected"
  exit 0
fi

echo "  DETECTED: Stuck call_id $STUCK_CALL_ID"

# Find main session ID via Python
MAIN_SESSION_ID=$(python3 << 'PYEOF'
import json, os
path = os.path.expanduser("~/.openclaw/agents/main/sessions/sessions.json")
with open(path) as f:
    data = json.load(f)
entry = data.get("agent:main:main")
if entry:
    print(entry["sessionId"])
PYEOF
)

if [ -z "$MAIN_SESSION_ID" ]; then
  echo "  WARN: No main session found — may already be cleaned"
  exit 0
fi

SESSION_FILE="$SESSIONS_DIR/${MAIN_SESSION_ID}.jsonl"

if [ ! -f "$SESSION_FILE" ]; then
  echo "  WARN: Session file not found"
  exit 0
fi

if ! grep -q "$STUCK_CALL_ID" "$SESSION_FILE" 2>/dev/null; then
  echo "  WARN: Stuck call_id not in main session — skipping"
  exit 0
fi

echo "  Repairing session: $MAIN_SESSION_ID"

# Backup
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="${MAIN_SESSION_ID}.$(date +%Y%m%d-%H%M%S).jsonl.bak"
cp "$SESSION_FILE" "$BACKUP_DIR/$BACKUP_NAME"
echo "  Backed up to: backups/$BACKUP_NAME"

# Delete session file
rm "$SESSION_FILE"
echo "  Deleted corrupted session file"

# Remove from sessions.json
python3 << 'PYEOF'
import json, os
path = os.path.expanduser("~/.openclaw/agents/main/sessions/sessions.json")
with open(path) as f:
    data = json.load(f)
if "agent:main:main" in data:
    del data["agent:main:main"]
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print("  Removed agent:main:main from sessions.json")
PYEOF

# Restart gateway
echo "  Restarting gateway..."
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null
sleep 2
echo "  Gateway restarted"

# Send notification to Command Center
python3 << PYEOF
import json, urllib.request
data = json.dumps({
    "type": "system",
    "title": "Session Auto-Repaired",
    "message": "Session was stuck in a tool-call loop (call_id: $STUCK_CALL_ID). Watchdog auto-repaired: backed up and reset session. Alfred will start fresh on next message."
}).encode()
req = urllib.request.Request("http://localhost:3001/api/notifications", data=data, headers={"Content-Type": "application/json"})
try:
    urllib.request.urlopen(req, timeout=5)
except Exception:
    pass
PYEOF

echo "  Notification sent"
echo "  REPAIR COMPLETE"
exit 0
