#!/bin/bash
# failsafe-recover-alfred.sh — Recovery steps when Alfred (gateway) is confirmed down
# Called by failsafe-ping.sh after failsafe-verify.sh confirms the outage.
# HAL can also call this directly.

LOG="$HOME/.openclaw/logs/failsafe.log"
NOTIFY_URL="http://localhost:3001/api/notifications"
BACKUP_DIR="$HOME/.openclaw/agents/main/sessions/backups"
GW_PORT=$(grep -o '"port":[0-9]*' ~/.openclaw/openclaw.json 2>/dev/null | head -1 | grep -o '[0-9]*')
GW_PORT="${GW_PORT:-18789}"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] [recover:alfred] $*" | tee -a "$LOG"; }

notify() {
  local title="$1" msg="$2"
  python3 -c "
import json, urllib.request
data = json.dumps({'type':'system','title':'$title','message':'$msg'}).encode()
req = urllib.request.Request('$NOTIFY_URL', data=data, headers={'Content-Type':'application/json'})
try:
    urllib.request.urlopen(req, timeout=5)
except: pass
" 2>/dev/null
}

is_alfred_up() {
  GW_PID=$(launchctl list | awk '/ai\.openclaw\.gateway/ && $1 != "-" {print $1}')
  [ -n "$GW_PID" ] || return 1
  curl -sf --max-time 5 "http://127.0.0.1:${GW_PORT}/" > /dev/null 2>&1
}

log "=== Alfred Recovery Started ==="

# ── Step 1: Simple restart ──────────────────────────────────────────────────
log "Step 1: Restarting gateway via launchctl..."
launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null
sleep 5

if is_alfred_up; then
  log "Step 1 SUCCESS: Gateway recovered via restart"
  notify "✅ Alfred Recovered" "Gateway was down but recovered successfully via restart (Step 1). No data loss."
  exit 0
fi

# ── Step 2: Check for corrupted session (tool-call loop pattern) ────────────
log "Step 2: Checking for corrupted main session..."
SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"

if [ -f "$SESSIONS_JSON" ]; then
  MAIN_SESSION_ID=$(python3 -c "
import json, os
with open('$SESSIONS_JSON') as f:
    data = json.load(f)
entry = data.get('agent:main:main')
if entry:
    print(entry.get('sessionId',''))
" 2>/dev/null)

  if [ -n "$MAIN_SESSION_ID" ]; then
    SESSION_FILE="$SESSIONS_DIR/${MAIN_SESSION_ID}.jsonl"
    if [ -f "$SESSION_FILE" ]; then
      log "Step 2: Backing up and clearing corrupted session $MAIN_SESSION_ID"
      mkdir -p "$BACKUP_DIR"
      cp "$SESSION_FILE" "$BACKUP_DIR/${MAIN_SESSION_ID}.failsafe-$(date +%Y%m%d-%H%M%S).bak"
      rm "$SESSION_FILE"
      python3 -c "
import json
with open('$SESSIONS_JSON') as f: data = json.load(f)
data.pop('agent:main:main', None)
with open('$SESSIONS_JSON','w') as f: json.dump(data, f, indent=2)
" 2>/dev/null
      log "Step 2: Session cleared — restarting gateway..."
      launchctl kickstart -k "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null
      sleep 5

      if is_alfred_up; then
        log "Step 2 SUCCESS: Gateway recovered after session clear"
        notify "✅ Alfred Recovered" "Gateway recovered after clearing corrupted session (Step 2). Session was backed up."
        exit 0
      fi
    fi
  fi
fi

# ── Step 3: Stop, wait, start ───────────────────────────────────────────────
log "Step 3: Full stop/start cycle..."
launchctl stop "ai.openclaw.gateway" 2>/dev/null
sleep 3
launchctl start "ai.openclaw.gateway" 2>/dev/null
sleep 8

if is_alfred_up; then
  log "Step 3 SUCCESS: Gateway recovered via stop/start"
  notify "✅ Alfred Recovered" "Gateway recovered via full stop/start cycle (Step 3)."
  exit 0
fi

# ── Step 4: Escalate to Joe ─────────────────────────────────────────────────
log "Step 4: All recovery steps failed — escalating to Joe"
notify "🚨 Alfred Recovery Failed" "Alfred gateway is down and could not be automatically recovered after 3 attempts. Manual intervention required. Check: launchctl list | grep openclaw, and openclaw gateway status."

exit 1
