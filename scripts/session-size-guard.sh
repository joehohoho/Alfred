#!/bin/bash
# session-size-guard.sh — Prevents main session from bloating beyond safe limits
# Runs via LaunchAgent (com.alfred.session-size-guard) every 2 hours.
# Checks session JSONL file sizes and resets any that exceed the threshold.
# This prevents context overflow errors when falling back to models without context1m.
#
# Why LaunchAgent instead of OpenClaw cron:
#   systemEvent crons go through the LLM in the main session. If the main session
#   is bloated (the thing we're trying to fix), the cron itself fails from context
#   overflow. LaunchAgent runs the shell script directly — no LLM involved.

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
BACKUP_DIR="$SESSIONS_DIR/backups"

# 500KB threshold (~50k tokens). Lower threshold prevents rate limit exhaustion —
# an 841KB session was burning through Haiku's TPM limits on 2026-03-02.
# Old 3MB threshold only caught context overflow, not rate limit strain.
MAX_SIZE_BYTES=$((500 * 1024))

NOTIFICATION_URL="http://localhost:3001/api/notifications"
VERBOSE=${SESSION_SIZE_GUARD_VERBOSE:-0}

log() {
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') [session-size-guard] $*"
}

notify() {
  local title="$1"
  local message="$2"
  curl -sf --max-time 10 -X POST "$NOTIFICATION_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"warning\",\"title\":\"$title\",\"message\":\"$message\"}" \
    >/dev/null 2>&1 || true
}

if [ ! -f "$SESSIONS_JSON" ]; then
  [ "$VERBOSE" = "1" ] && log "sessions.json not found, nothing to do"
  exit 0
fi

# Look up agent:main:main session
session_id=$(python3 -c "
import json, os
path = os.path.expanduser('$SESSIONS_JSON')
with open(path) as f:
    data = json.load(f)
entry = data.get('agent:main:main')
if entry and isinstance(entry, dict):
    print(entry.get('sessionId', ''))
" 2>/dev/null)

if [ -z "$session_id" ]; then
  [ "$VERBOSE" = "1" ] && log "No agent:main:main session found"
  exit 0
fi

session_file="$SESSIONS_DIR/${session_id}.jsonl"
if [ ! -f "$session_file" ]; then
  [ "$VERBOSE" = "1" ] && log "Session file not found: $session_file"
  exit 0
fi

file_size=$(stat -f%z "$session_file" 2>/dev/null || echo 0)
file_size_mb=$(echo "scale=1; $file_size / 1048576" | bc)

if [ "$file_size" -le "$MAX_SIZE_BYTES" ]; then
  [ "$VERBOSE" = "1" ] && log "Session $session_id is ${file_size_mb}MB — OK"
  exit 0
fi

# === Session exceeds threshold — reset it ===

log "Session $session_id is ${file_size_mb}MB (limit: $((MAX_SIZE_BYTES / 1048576))MB) — resetting"

mkdir -p "$BACKUP_DIR"

# Backup the session file
backup_name="${session_id}.$(date +%Y%m%d-%H%M%S).jsonl"
cp "$session_file" "$BACKUP_DIR/$backup_name"
log "Backed up to backups/$backup_name"

# Remove from sessions.json FIRST (gateway checks this on startup)
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

# Delete session file
rm "$session_file"
log "Deleted bloated session file"

# Restart gateway (respects circuit breaker)
CB_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/rate-limit-circuit-breaker.json"
CB_SKIP=false
if [[ -f "$CB_FILE" ]]; then
  CB_T=$(python3 -c "import json; print(json.load(open('$CB_FILE')).get('tripped_at',0))" 2>/dev/null || echo "0")
  CB_C=$(python3 -c "import json; print(json.load(open('$CB_FILE')).get('cooldown_min',10))" 2>/dev/null || echo "10")
  NOW_S=$(date +%s)
  if [[ "$CB_T" -gt 0 ]] && [[ $(( NOW_S - CB_T )) -lt $(( CB_C * 60 )) ]]; then
    CB_SKIP=true
  fi
fi
if [[ "$CB_SKIP" == "true" ]]; then
  log "Circuit breaker active — skipping gateway restart (cooldown ${CB_C}m)"
else
  log "Restarting gateway..."
  launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null
  sleep 3
  log "Gateway restarted"
fi

# Notify Command Center
notify "Session Size Guard" "Main session was ${file_size_mb}MB (over 3MB limit). Auto-reset and gateway restarted. Backup: $backup_name"

# Clean up old backups (keep last 5)
ls -t "$BACKUP_DIR"/*.jsonl 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

log "RESET COMPLETE"
exit 0
