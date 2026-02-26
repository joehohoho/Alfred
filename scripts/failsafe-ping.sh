#!/bin/bash
# failsafe-ping.sh — Mutual health check for Alfred and HAL
# Run every 5 minutes via LaunchAgent (com.alfred.failsafe-ping)
# Checks both agents; on failure, runs verification before triggering recovery.
#
# Exit codes: 0=all healthy, 1=Alfred degraded, 2=HAL degraded, 3=both degraded

WORKSPACE="$HOME/.openclaw/workspace"
SCRIPTS="$WORKSPACE/scripts"
STATE_FILE="$WORKSPACE/data/failsafe-state.json"
MAINTENANCE_FLAG="$WORKSPACE/data/failsafe-maintenance.flag"
LOG="$HOME/.openclaw/logs/failsafe.log"
NOTIFY_URL="http://localhost:3001/api/notifications"

mkdir -p "$(dirname "$STATE_FILE")"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $*" | tee -a "$LOG"; }

# ── Maintenance mode check ──────────────────────────────────────────────────
# If flag file exists and is < 30 minutes old, skip all checks silently
if [ -f "$MAINTENANCE_FLAG" ]; then
  AGE=$(( $(date +%s) - $(stat -f %m "$MAINTENANCE_FLAG" 2>/dev/null || echo 0) ))
  if [ "$AGE" -lt 1800 ]; then
    log "MAINTENANCE MODE active (flag age ${AGE}s) — skipping checks"
    exit 0
  else
    log "MAINTENANCE FLAG expired — removing"
    rm -f "$MAINTENANCE_FLAG"
  fi
fi

# ── Alfred health check ─────────────────────────────────────────────────────
check_alfred() {
  # 1. Gateway process running?
  GW_PID=$(launchctl list | awk '/ai\.openclaw\.gateway/ && $1 != "-" {print $1}')
  [ -z "$GW_PID" ] && return 1

  # 2. Gateway HTTP responding?
  GW_PORT=$(grep -o '"port":[0-9]*' ~/.openclaw/openclaw.json 2>/dev/null | head -1 | grep -o '[0-9]*')
  GW_PORT="${GW_PORT:-18789}"
  curl -sf --max-time 5 "http://127.0.0.1:${GW_PORT}/" > /dev/null 2>&1 || return 1

  return 0
}

# ── HAL health check ────────────────────────────────────────────────────────
check_hal() {
  # 1. Ollama process running?
  pgrep -x ollama > /dev/null 2>&1 || return 1

  # 2. Ollama API responding?
  curl -sf --max-time 5 "http://127.0.0.1:11434/api/tags" > /dev/null 2>&1 || return 1

  # 3. HAL agent directory exists?
  [ -d "$HOME/.openclaw/agents/hal" ] || return 1

  return 0
}

# ── Send notification ───────────────────────────────────────────────────────
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

# ── Write state ─────────────────────────────────────────────────────────────
write_state() {
  local alfred_status="$1" hal_status="$2"
  python3 -c "
import json
state = {
  'alfred': '$alfred_status',
  'hal': '$hal_status',
  'checked_at': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
  'checker': 'failsafe-ping'
}
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null
}

# ── Main logic ──────────────────────────────────────────────────────────────
log "=== Failsafe Ping ==="

ALFRED_OK=true
HAL_OK=true
EXIT_CODE=0

# Check Alfred
if check_alfred; then
  log "Alfred: HEALTHY (gateway up)"
else
  log "Alfred: DEGRADED — running verification..."
  if bash "$SCRIPTS/failsafe-verify.sh" alfred; then
    log "Alfred: CONFIRMED DOWN — triggering recovery"
    notify "🔴 Alfred Down" "Alfred gateway is confirmed down. HAL is attempting recovery."
    bash "$SCRIPTS/failsafe-recover-alfred.sh"
    ALFRED_OK=false
    EXIT_CODE=$((EXIT_CODE + 1))
  else
    log "Alfred: Verification inconclusive — likely restart/upgrade in progress. Skipping recovery."
  fi
fi

# Check HAL
if check_hal; then
  log "HAL: HEALTHY (Ollama up)"
else
  log "HAL: DEGRADED — running verification..."
  if bash "$SCRIPTS/failsafe-verify.sh" hal; then
    log "HAL: CONFIRMED DOWN — triggering recovery"
    notify "🔴 HAL Down" "HAL (Ollama) is confirmed down. Alfred is attempting recovery."
    bash "$SCRIPTS/failsafe-recover-hal.sh"
    HAL_OK=false
    EXIT_CODE=$((EXIT_CODE + 2))
  else
    log "HAL: Verification inconclusive — likely restart/upgrade in progress. Skipping recovery."
  fi
fi

# Write shared state
ALFRED_STATUS="healthy"; $ALFRED_OK || ALFRED_STATUS="down"
HAL_STATUS="healthy"; $HAL_OK || HAL_STATUS="down"
write_state "$ALFRED_STATUS" "$HAL_STATUS"

log "State written → alfred:$ALFRED_STATUS hal:$HAL_STATUS"
exit $EXIT_CODE
