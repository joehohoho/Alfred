#!/bin/bash
# failsafe-recover-hal.sh — Recovery steps when HAL (Ollama) is confirmed down
# Called by failsafe-ping.sh after failsafe-verify.sh confirms the outage.
# Alfred calls this directly.

LOG="$HOME/.openclaw/logs/failsafe.log"
NOTIFY_URL="http://localhost:3001/api/notifications"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] [recover:hal] $*" | tee -a "$LOG"; }

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

is_hal_up() {
  pgrep -x ollama > /dev/null 2>&1 || return 1
  curl -sf --max-time 5 "http://127.0.0.1:11434/api/tags" > /dev/null 2>&1
}

log "=== HAL Recovery Started ==="

# ── Step 1: Start Ollama via LaunchAgent ────────────────────────────────────
log "Step 1: Starting Ollama via launchctl..."
launchctl kickstart -k "gui/$(id -u)/com.ollama.ollama" 2>/dev/null
sleep 8

if is_hal_up; then
  log "Step 1 SUCCESS: Ollama recovered via launchctl kickstart"
  notify "✅ HAL Recovered" "Ollama was down but recovered via launchctl restart (Step 1). HAL is back online."
  exit 0
fi

# ── Step 2: Try starting ollama serve directly ──────────────────────────────
log "Step 2: Attempting direct ollama serve..."
nohup ollama serve > /tmp/ollama-recovery.log 2>&1 &
sleep 8

if is_hal_up; then
  log "Step 2 SUCCESS: Ollama recovered via direct serve"
  notify "✅ HAL Recovered" "Ollama recovered via direct 'ollama serve' (Step 2). Note: not running via LaunchAgent — may need attention."
  exit 0
fi

# ── Step 3: Kill stale ollama processes and retry ───────────────────────────
log "Step 3: Killing stale ollama processes and retrying..."
pkill -f "ollama" 2>/dev/null
sleep 3
launchctl kickstart "gui/$(id -u)/com.ollama.ollama" 2>/dev/null
sleep 10

if is_hal_up; then
  log "Step 3 SUCCESS: Ollama recovered after process cleanup"
  notify "✅ HAL Recovered" "Ollama recovered after killing stale processes and restarting (Step 3)."
  exit 0
fi

# ── Step 4: Escalate ────────────────────────────────────────────────────────
log "Step 4: All recovery steps failed — escalating to Joe"
notify "🚨 HAL Recovery Failed" "HAL (Ollama) is down and could not be automatically recovered after 3 attempts. Manual check required: 'ollama serve' in terminal, or check Activity Monitor for Ollama."

exit 1
