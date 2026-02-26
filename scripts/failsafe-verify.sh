#!/bin/bash
# failsafe-verify.sh — Confirm an agent is truly down before triggering recovery
# Usage: failsafe-verify.sh <alfred|hal>
# Exit: 0=confirmed down (act), 1=inconclusive (skip recovery)
#
# Strategy: 3 checks over 3 minutes. Must fail ALL 3 to confirm truly down.
# Also checks if a recent launchctl start/kickstart explains the blip.

AGENT="${1:-alfred}"
LOG="$HOME/.openclaw/logs/failsafe.log"
CHECKS=3
INTERVAL=60  # seconds between checks

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] [verify:$AGENT] $*" | tee -a "$LOG"; }

check_alfred() {
  GW_PID=$(launchctl list | awk '/ai\.openclaw\.gateway/ && $1 != "-" {print $1}')
  [ -z "$GW_PID" ] && return 1
  GW_PORT=$(grep -o '"port":[0-9]*' ~/.openclaw/openclaw.json 2>/dev/null | head -1 | grep -o '[0-9]*')
  GW_PORT="${GW_PORT:-18789}"
  curl -sf --max-time 5 "http://127.0.0.1:${GW_PORT}/" > /dev/null 2>&1
}

check_hal() {
  pgrep -x ollama > /dev/null 2>&1 || return 1
  curl -sf --max-time 5 "http://127.0.0.1:11434/api/tags" > /dev/null 2>&1
}

# ── Recent restart check ────────────────────────────────────────────────────
# If the service was started within the last 3 minutes, it's likely still warming up
recent_restart() {
  local label="$1"
  # Check launchctl for recent activity in gateway log
  local log_file="$HOME/.openclaw/logs/gateway.log"
  [ "$AGENT" = "hal" ] && log_file="/tmp/ollama.log"

  if [ -f "$log_file" ]; then
    local age=$(( $(date +%s) - $(stat -f %m "$log_file" 2>/dev/null || echo 0) ))
    # If log was touched in last 3 minutes, likely a fresh start
    [ "$age" -lt 180 ] && return 0
  fi
  return 1
}

# ── Run N checks ─────────────────────────────────────────────────────────────
log "Starting $CHECKS-check verification (${INTERVAL}s apart)"

FAIL_COUNT=0

for i in $(seq 1 $CHECKS); do
  log "Check $i/$CHECKS..."

  # Check for recent restart on first iteration
  if [ "$i" -eq 1 ] && recent_restart "$AGENT"; then
    log "Recent restart detected — skipping recovery (inconclusive)"
    exit 1
  fi

  if [ "$AGENT" = "alfred" ]; then
    check_alfred && { log "Check $i: UP — not truly down"; exit 1; }
  else
    check_hal && { log "Check $i: UP — not truly down"; exit 1; }
  fi

  FAIL_COUNT=$((FAIL_COUNT + 1))
  log "Check $i: DOWN ($FAIL_COUNT/$CHECKS)"

  # Don't sleep after last check
  [ "$i" -lt "$CHECKS" ] && sleep "$INTERVAL"
done

log "CONFIRMED DOWN after $FAIL_COUNT/$CHECKS failed checks"
exit 0
