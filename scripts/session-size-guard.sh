#!/bin/bash
# session-size-guard.sh — Prevents main session from bloating beyond safe limits
# Runs via cron. Checks session JSONL file sizes and resets any that exceed the threshold.
# This prevents context overflow errors when falling back to models without context1m.

set -euo pipefail

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
BACKUP_DIR="$SESSIONS_DIR/backups"

# 3MB threshold (~150k tokens). Sonnet's 195k limit minus room for system prompt.
MAX_SIZE_BYTES=$((3 * 1024 * 1024))

# Only guard the main persistent session (not isolated/ephemeral ones)
GUARDED_KEYS=("agent:main:main")

NOTIFICATION_URL="http://localhost:3001/api/notifications"

log() {
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [session-size-guard] $*"
}

notify() {
  local title="$1"
  local message="$2"
  curl -sf -X POST "$NOTIFICATION_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"warning\",\"title\":\"$title\",\"message\":\"$message\"}" \
    >/dev/null 2>&1 || true
}

if [ ! -f "$SESSIONS_JSON" ]; then
  log "sessions.json not found, nothing to do"
  exit 0
fi

mkdir -p "$BACKUP_DIR"

for key in "${GUARDED_KEYS[@]}"; do
  session_id=$(python3 -c "
import json, sys
with open('$SESSIONS_JSON') as f:
    data = json.load(f)
entry = data.get('$key')
if entry and isinstance(entry, dict):
    print(entry.get('sessionId', ''))
" 2>/dev/null)

  if [ -z "$session_id" ]; then
    continue
  fi

  session_file="$SESSIONS_DIR/${session_id}.jsonl"
  if [ ! -f "$session_file" ]; then
    continue
  fi

  file_size=$(stat -f%z "$session_file" 2>/dev/null || echo 0)
  file_size_mb=$(echo "scale=1; $file_size / 1048576" | bc)

  if [ "$file_size" -gt "$MAX_SIZE_BYTES" ]; then
    log "Session '$key' ($session_id) is ${file_size_mb}MB (limit: $((MAX_SIZE_BYTES / 1048576))MB) — resetting"

    # Backup
    backup_name="${session_id}.$(date +%Y%m%d-%H%M%S).jsonl"
    cp "$session_file" "$BACKUP_DIR/$backup_name"
    log "Backed up to backups/$backup_name"

    # Remove session file
    rm "$session_file"

    # Remove from sessions.json
    python3 -c "
import json
with open('$SESSIONS_JSON') as f:
    data = json.load(f)
if '$key' in data:
    del data['$key']
with open('$SESSIONS_JSON', 'w') as f:
    json.dump(data, f, indent=2)
"
    log "Removed '$key' from sessions.json"

    notify "Session Reset" "Main session was ${file_size_mb}MB (over 3MB limit). Auto-reset to prevent context overflow. Backup saved."

    # Clean up old backups (keep last 5)
    ls -t "$BACKUP_DIR"/*.jsonl 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
  else
    log "Session '$key' ($session_id) is ${file_size_mb}MB — OK"
  fi
done
