#!/bin/bash
# sentinel.sh — Unified Self-Monitoring & Self-Healing System
#
# Runs every 5 minutes via LaunchAgent. Zero LLM cost (pure bash).
# Checks ALL systems in a single pass, auto-fixes what it can,
# escalates what it can't, and never retries the same failed fix.
#
# Architecture:
#   - State machine per component (healthy → degraded → down → recovering → healthy)
#   - Fix playbook: each failure type has a sequence of fixes to try
#   - Escalation: Tier 1 (auto-fix, silent) → Tier 2 (retry different approach, notify)
#                 → Tier 3 (exhausted, notify + stop retrying for 2h)
#   - Discord alerts: state transitions only (not every check)
#   - Audit log: every action logged
#   - Config changes: backup before, rollback if fails

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
STATE_FILE="$WORKSPACE/.hal-alfred-tracking/sentinel-state.json"
AUDIT="$SCRIPT_DIR/audit-log.sh"
DISCORD_WEBHOOK="${DISCORD_WEBHOOK_ALERTS:-}"
LOG="$HOME/.openclaw/logs/sentinel.log"

# Load Discord webhook from .env if not set
if [[ -z "$DISCORD_WEBHOOK" && -f "$WORKSPACE/.env" ]]; then
  DISCORD_WEBHOOK=$(grep "DISCORD_WEBHOOK_ALERTS" "$WORKSPACE/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
fi

MAX_FIX_ATTEMPTS=3       # Max times to try the same fix before giving up
ESCALATION_COOLDOWN=7200 # 2 hours before retrying after all fixes exhausted
NOTIFY_COOLDOWN=1800     # 30 min between Discord notifications for same component

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

# --- Discord notification (rate-limited per component) ---
notify_discord() {
  local title="$1" message="$2" color="${3:-16711680}" # Default red
  [[ -z "$DISCORD_WEBHOOK" ]] && return 0

  curl -s --max-time 10 -X POST "$DISCORD_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"🔧 Sentinel: $title\",\"description\":\"$message\",\"color\":$color,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    > /dev/null 2>&1 || true
}

# --- State machine ---
read_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo '{}'
  fi
}

write_state() {
  local new_state="$1"
  echo "$new_state" > "$STATE_FILE"
}

get_component() {
  local component="$1"
  read_state | python3 -c "
import json, sys
state = json.load(sys.stdin)
comp = state.get('$component', {})
print(json.dumps(comp))
" 2>/dev/null || echo '{}'
}

update_component() {
  local component="$1" field="$2" value="$3"
  python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
if '$component' not in state:
    state['$component'] = {'status': 'unknown', 'fixAttempts': [], 'lastCheck': '', 'lastNotified': 0, 'lastFixTime': 0}
state['$component']['$field'] = $value
state['$component']['lastCheck'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null
}

# --- Fix attempt tracking ---
should_attempt_fix() {
  local component="$1"
  python3 -c "
import json, time
with open('$STATE_FILE') as f:
    state = json.load(f)
comp = state.get('$component', {})
attempts = comp.get('fixAttempts', [])
last_fix = comp.get('lastFixTime', 0)
now = time.time()

# If in escalation cooldown (all fixes exhausted), don't try
if len(attempts) >= $MAX_FIX_ATTEMPTS and (now - last_fix) < $ESCALATION_COOLDOWN:
    print('COOLDOWN')
elif len(attempts) >= $MAX_FIX_ATTEMPTS:
    # Cooldown expired — reset attempts for a fresh try
    print('RESET')
else:
    print('OK')
" 2>/dev/null
}

record_fix_attempt() {
  local component="$1" fix_name="$2" success="$3"
  python3 -c "
import json, time
with open('$STATE_FILE') as f:
    state = json.load(f)
comp = state.setdefault('$component', {'status': 'unknown', 'fixAttempts': [], 'lastCheck': '', 'lastNotified': 0, 'lastFixTime': 0})
comp['fixAttempts'].append({'fix': '$fix_name', 'success': $success, 'at': time.time()})
comp['lastFixTime'] = time.time()
# Keep only last 10 attempts
comp['fixAttempts'] = comp['fixAttempts'][-10:]
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null
}

reset_component() {
  local component="$1"
  python3 -c "
import json, time
with open('$STATE_FILE') as f:
    state = json.load(f)
state['$component'] = {'status': 'healthy', 'fixAttempts': [], 'lastCheck': '$(date -u +%Y-%m-%dT%H:%M:%SZ)', 'lastNotified': 0, 'lastFixTime': 0}
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" 2>/dev/null
}

should_notify() {
  local component="$1"
  python3 -c "
import json, time
with open('$STATE_FILE') as f:
    state = json.load(f)
comp = state.get('$component', {})
last = comp.get('lastNotified', 0)
print('yes' if time.time() - last > $NOTIFY_COOLDOWN else 'no')
" 2>/dev/null
}

mark_notified() {
  local component="$1"
  update_component "$component" "lastNotified" "$(python3 -c 'import time; print(time.time())')"
}

# --- Config backup/rollback ---
backup_config() {
  local file="$1"
  cp "$file" "${file}.sentinel-backup" 2>/dev/null || true
}

rollback_config() {
  local file="$1"
  if [[ -f "${file}.sentinel-backup" ]]; then
    cp "${file}.sentinel-backup" "$file"
    log "ROLLBACK: Restored $file from backup"
    bash "$AUDIT" warn "sentinel" "Config rollback: $(basename $file)" --detail "Restored from .sentinel-backup"
    return 0
  fi
  return 1
}

# ═══════════════════════════════════════════════════════════════
# HEALTH CHECKS + FIX PLAYBOOKS
# ═══════════════════════════════════════════════════════════════

check_gateway() {
  local component="gateway"
  local pid=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1)

  if [[ -z "$pid" ]]; then
    log "CHECK $component: DOWN (no process)"
    local should=$(should_attempt_fix "$component")

    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      log "FIX $component: Restarting gateway via LaunchAgent"
      launchctl kickstart gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
      sleep 8

      local new_pid=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1)
      if [[ -n "$new_pid" ]]; then
        record_fix_attempt "$component" "launchctl-restart" "True"
        update_component "$component" "status" "\"healthy\""
        bash "$AUDIT" success "sentinel" "Gateway auto-restarted" --detail "PID=$new_pid"
        if [[ "$(should_notify $component)" == "yes" ]]; then
          notify_discord "Gateway Recovered" "Gateway was down. Auto-restarted successfully (PID $new_pid)." 3066993
          mark_notified "$component"
        fi
      else
        record_fix_attempt "$component" "launchctl-restart" "False"
        update_component "$component" "status" "\"down\""
        bash "$AUDIT" error "sentinel" "Gateway restart failed"
        if [[ "$(should_notify $component)" == "yes" ]]; then
          notify_discord "Gateway Down" "Gateway is down and auto-restart failed. Manual intervention needed." 16711680
          mark_notified "$component"
        fi
      fi
    elif [[ "$should" == "COOLDOWN" ]]; then
      log "CHECK $component: DOWN (in escalation cooldown)"
    fi
  else
    # Gateway is running — check if it's healthy
    local http=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:18789 2>/dev/null || echo "000")
    if [[ "$http" == "200" ]]; then
      local prev_status=$(get_component "$component" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
      if [[ "$prev_status" != "healthy" ]]; then
        reset_component "$component"
        bash "$AUDIT" success "sentinel" "Gateway healthy" --detail "HTTP 200, PID=$pid"
        if [[ "$prev_status" == "down" || "$prev_status" == "degraded" ]]; then
          notify_discord "Gateway Healthy" "Gateway is back to normal (HTTP 200, PID $pid)." 3066993
          mark_notified "$component"
        fi
      else
        update_component "$component" "status" "\"healthy\""
      fi
    else
      update_component "$component" "status" "\"degraded\""
      log "CHECK $component: DEGRADED (HTTP $http)"
    fi
  fi
}

check_command_center() {
  local component="cc"
  local connected=$(curl -s --max-time 3 http://localhost:3001/api/chat/status 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('connected',False))" 2>/dev/null || echo "False")
  local http=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")

  if [[ "$http" == "000" || "$http" == "404" ]]; then
    log "CHECK $component: DOWN (HTTP $http)"
    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"
      log "FIX $component: Restarting CC LaunchAgent"
      launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.alfred.dashboard-nextjs.plist 2>/dev/null || true
      sleep 2
      launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.alfred.dashboard-nextjs.plist 2>/dev/null || true
      sleep 6
      local check=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")
      if [[ "$check" == "200" ]]; then
        record_fix_attempt "$component" "restart-launchagent" "True"
        reset_component "$component"
        bash "$AUDIT" success "sentinel" "Command Center auto-restarted"
      else
        record_fix_attempt "$component" "restart-launchagent" "False"
        update_component "$component" "status" "\"down\""
        bash "$AUDIT" error "sentinel" "CC restart failed (HTTP $check)"
        if [[ "$(should_notify $component)" == "yes" ]]; then
          notify_discord "Command Center Down" "CC is down and restart failed (HTTP $check)." 16711680
          mark_notified "$component"
        fi
      fi
    fi
  elif [[ "$connected" != "True" ]]; then
    # CC is up but not connected to gateway — check if gateway is running
    log "CHECK $component: DEGRADED (WS disconnected)"
    update_component "$component" "status" "\"degraded\""
    # The gateway check will handle gateway restarts; CC auto-reconnects
  else
    local prev=$(get_component "$component" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
    if [[ "$prev" != "healthy" ]]; then
      reset_component "$component"
      if [[ "$prev" == "down" ]]; then
        notify_discord "Command Center Recovered" "CC is back online and connected to gateway." 3066993
        mark_notified "$component"
      fi
    fi
    update_component "$component" "status" "\"healthy\""
  fi
}

check_hal() {
  local component="hal"

  # Skip HAL health check if HAL is sleeping (forced idle)
  local hal_sleeping=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/workspace/.hal-alfred-tracking/hal-forced-idle.json')).get('forcedIdle', False))" 2>/dev/null || echo "False")
  if [[ "$hal_sleeping" == "True" ]]; then
    log "CHECK $component: SLEEPING (forced idle — skipping health check)"
    update_component "$component" "status" "\"sleeping\""
    return
  fi

  local http=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://192.168.2.79:18789 2>/dev/null || echo "000")

  if [[ "$http" != "200" ]]; then
    log "CHECK $component: DOWN (HTTP $http)"
    update_component "$component" "status" "\"down\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      # Fix 1: Reset fail counter (in case it's just a stale counter issue)
      echo "0" > "$WORKSPACE/.hal-alfred-tracking/hal-dispatch-fail-count.txt"
      record_fix_attempt "$component" "reset-fail-counter" "False"
      bash "$AUDIT" warn "sentinel" "HAL unreachable (HTTP $http)" --detail "Reset fail counter, awaiting next check"

      if [[ "$(should_notify $component)" == "yes" ]]; then
        notify_discord "HAL Unreachable" "HAL gateway at 192.168.2.79:18789 is not responding (HTTP $http). HAL's PC may be sleeping or gateway crashed." 16776960
        mark_notified "$component"
      fi
    fi
  else
    # HAL HTTP OK — test WebSocket
    local ws=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" \
      -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
      "http://192.168.2.79:18789/ws" 2>/dev/null | tr -d '[:space:]')
    [[ -z "$ws" ]] && ws="000"

    if [[ "$ws" == "101" ]]; then
      # Fully healthy — ALWAYS reset fail counter so dispatches aren't blocked
      local fail_count=$(cat "$WORKSPACE/.hal-alfred-tracking/hal-dispatch-fail-count.txt" 2>/dev/null || echo "0")
      if [[ "$fail_count" -gt 0 ]]; then
        echo "0" > "$WORKSPACE/.hal-alfred-tracking/hal-dispatch-fail-count.txt"
        log "FIX $component: Reset fail counter from $fail_count to 0 (HAL healthy via HTTP+WS)"
        bash "$AUDIT" info "sentinel" "HAL healthy — reset fail counter from $fail_count"
      fi

      local prev=$(get_component "$component" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
      if [[ "$prev" != "healthy" ]]; then
        reset_component "$component"
        bash "$AUDIT" success "sentinel" "HAL recovered (HTTP+WS healthy)"
        if [[ "$prev" == "down" ]]; then
          notify_discord "HAL Recovered" "HAL gateway is back online (HTTP 200, WS 101). Dispatch will resume." 3066993
          mark_notified "$component"
        fi
      fi
      update_component "$component" "status" "\"healthy\""
    else
      log "CHECK $component: DEGRADED (HTTP 200 but WS $ws)"
      update_component "$component" "status" "\"degraded\""
      # Reset fail counter — HTTP works, dispatch might succeed
      local fc=$(cat "$WORKSPACE/.hal-alfred-tracking/hal-dispatch-fail-count.txt" 2>/dev/null || echo "0")
      [[ "$fc" -gt 10 ]] && echo "0" > "$WORKSPACE/.hal-alfred-tracking/hal-dispatch-fail-count.txt"
    fi
  fi
}

check_idle_loop() {
  local component="idle_loop"

  local last_activity=$(python3 -c "
import json
from datetime import datetime, timezone
with open('$WORKSPACE/goals/idle-state.json') as f:
    d = json.load(f)
last = d.get('lastActivityAt', '')
if last:
    dt = datetime.fromisoformat(last.replace('Z','+00:00'))
    print(f'{(datetime.now(timezone.utc) - dt).total_seconds() / 3600:.1f}')
else:
    print('999')
" 2>/dev/null || echo "999")

  local stale=$(echo "$last_activity" | awk '{print ($1 > 2) ? "yes" : "no"}')

  if [[ "$stale" == "yes" ]]; then
    log "CHECK $component: STALLED (last activity ${last_activity}h ago)"
    update_component "$component" "status" "\"degraded\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      # Fix 1: Re-enable cron if disabled
      local was_disabled=$(python3 -c "
import json
with open('$HOME/.openclaw/cron/jobs.json') as f:
    data = json.load(f)
jobs = data if isinstance(data, list) else data.get('jobs', [])
for j in jobs:
    if isinstance(j, str): continue
    if j.get('name') == 'Kanban Idle Loop':
        if not j.get('enabled', True):
            j['enabled'] = True
            with open('$HOME/.openclaw/cron/jobs.json', 'w') as f:
                json.dump(data, f, indent=2)
            print('FIXED')
        else:
            print('ALREADY_ENABLED')
        break
" 2>/dev/null || echo "ERROR")

      if [[ "$was_disabled" == "FIXED" ]]; then
        log "FIX $component: Re-enabled Kanban Idle Loop cron"
        record_fix_attempt "$component" "re-enable-cron" "True"
        bash "$AUDIT" success "sentinel" "Re-enabled idle loop cron" --detail "Was disabled, now enabled"
        notify_discord "Idle Loop Fixed" "Idle loop cron was disabled. Sentinel re-enabled it. Activities will resume." 3066993
        mark_notified "$component"
      else
        # Fix 2: Reset the cooldown so idle activities can fire
        python3 -c "
import json
with open('$WORKSPACE/goals/idle-state.json') as f:
    d = json.load(f)
d['cooldownMinutes'] = 15
with open('$WORKSPACE/goals/idle-state.json', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null
        record_fix_attempt "$component" "reset-cooldown" "True"
        log "FIX $component: Reset idle cooldown to 15 min"
        bash "$AUDIT" info "sentinel" "Reset idle loop cooldown" --detail "Stalled ${last_activity}h, cooldown reset"
      fi
    elif [[ "$should" == "COOLDOWN" ]]; then
      if [[ "$(should_notify $component)" == "yes" ]]; then
        notify_discord "Idle Loop Stalled" "Idle loop hasn't run in ${last_activity}h. Auto-fix attempts exhausted. Gateway may need restart." 16776960
        mark_notified "$component"
      fi
    fi
  else
    local prev=$(get_component "$component" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
    if [[ "$prev" != "healthy" && "$prev" != "unknown" ]]; then
      reset_component "$component"
      bash "$AUDIT" success "sentinel" "Idle loop recovered"
    fi
    update_component "$component" "status" "\"healthy\""
  fi
}

check_sessions() {
  local component="sessions"

  local main_size=$(python3 -c "
import os, glob
files = glob.glob(os.path.expanduser('$HOME/.openclaw/agents/main/sessions/*.jsonl'))
sizes = [os.path.getsize(f) for f in files]
print(max(sizes) if sizes else 0)
" 2>/dev/null || echo "0")

  if [[ "$main_size" -gt 500000 ]]; then
    log "CHECK $component: BLOATED (largest session ${main_size} bytes)"
    update_component "$component" "status" "\"degraded\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      # Run session cleanup directly
      log "FIX $component: Running session cleanup"
      bash "$WORKSPACE/scripts/session-cleanup.sh" 2>/dev/null || true

      local new_size=$(find "$HOME/.openclaw/agents/main/sessions/" -name "*.jsonl" -exec stat -f%z {} \; 2>/dev/null | sort -rn | head -1 | tr -d '[:space:]')
      [[ -z "$new_size" ]] && new_size=0
      if [[ "$new_size" -lt "$main_size" ]]; then
        record_fix_attempt "$component" "run-cleanup" "True"
        bash "$AUDIT" success "sentinel" "Session cleanup reduced from ${main_size} to ${new_size} bytes"
        [[ "$new_size" -lt 200000 ]] && reset_component "$component"
      else
        record_fix_attempt "$component" "run-cleanup" "False"
        bash "$AUDIT" warn "sentinel" "Session cleanup did not reduce size (${main_size} → ${new_size})"
      fi
    fi
  else
    update_component "$component" "status" "\"healthy\""
  fi
}

check_config_integrity() {
  local component="config"

  # Check critical openclaw.json settings haven't been tampered with
  local issues=$(python3 -c "
import json
issues = []
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
cui = c.get('gateway',{}).get('controlUi',{})
if not cui.get('dangerouslyDisableDeviceAuth', False):
    issues.append('dangerouslyDisableDeviceAuth is False')
if cui.get('allowedOrigins') != ['*']:
    issues.append(f'allowedOrigins is {cui.get(\"allowedOrigins\")} (expected [\"*\"])')
bind = c.get('gateway',{}).get('bind','')
if bind != 'lan':
    issues.append(f'bind is {bind} (expected lan)')
if issues:
    print('|'.join(issues))
else:
    print('OK')
" 2>/dev/null || echo "PARSE_ERROR")

  if [[ "$issues" != "OK" && "$issues" != "PARSE_ERROR" ]]; then
    log "CHECK $component: TAMPERED ($issues)"
    update_component "$component" "status" "\"degraded\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      log "FIX $component: Restoring critical config settings"
      backup_config "$HOME/.openclaw/openclaw.json"

      python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
c.setdefault('gateway',{}).setdefault('controlUi',{})['dangerouslyDisableDeviceAuth'] = True
c['gateway']['controlUi']['allowedOrigins'] = ['*']
c['gateway']['bind'] = 'lan'
with open('$HOME/.openclaw/openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
" 2>/dev/null

      # Restart gateway to pick up fix
      pkill -f openclaw-gateway 2>/dev/null || true
      sleep 6

      local new_pid=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1)
      if [[ -n "$new_pid" ]]; then
        # Verify the fix worked
        local verify=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:18789 2>/dev/null)
        if [[ "$verify" == "200" ]]; then
          record_fix_attempt "$component" "restore-config" "True"
          reset_component "$component"
          bash "$AUDIT" success "sentinel" "Config restored and gateway healthy" --detail "Fixed: $issues"
          notify_discord "Config Auto-Repaired" "Critical gateway config was tampered with. Sentinel restored settings and restarted gateway.\n\nIssues fixed: $issues" 3066993
          mark_notified "$component"
        else
          # Rollback
          rollback_config "$HOME/.openclaw/openclaw.json"
          pkill -f openclaw-gateway 2>/dev/null || true
          sleep 6
          record_fix_attempt "$component" "restore-config" "False"
          bash "$AUDIT" error "sentinel" "Config fix failed — rolled back" --detail "$issues"
          notify_discord "Config Fix Failed" "Attempted to fix config but verification failed. Rolled back to backup. Issues: $issues" 16711680
          mark_notified "$component"
        fi
      fi
    fi
  else
    update_component "$component" "status" "\"healthy\""
  fi
}

check_disk() {
  local component="disk"
  local log_size=$(du -sm "$HOME/.openclaw/logs/" 2>/dev/null | cut -f1 || echo "0")

  if [[ "$log_size" -gt 100 ]]; then
    log "CHECK $component: LARGE (logs ${log_size}MB)"
    update_component "$component" "status" "\"degraded\""
    # Trigger log rotation
    bash "$WORKSPACE/scripts/log-rotate.sh" 2>/dev/null || true
    bash "$AUDIT" info "sentinel" "Triggered log rotation (logs ${log_size}MB)"
  else
    update_component "$component" "status" "\"healthy\""
  fi
}

check_model_health() {
  local component="models"

  # Check for recent model failures in gateway error log
  local recent_failures
  recent_failures=$(grep "$(date -u +%Y-%m-%dT%H)" "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null | grep -c "token.*refresh\|OAuth.*failed\|billing.*low\|CODEX_QUOTA" 2>/dev/null || true)
  recent_failures="${recent_failures:-0}"
  recent_failures=$(echo "$recent_failures" | tr -d '[:space:]')
  [[ -z "$recent_failures" || ! "$recent_failures" =~ ^[0-9]+$ ]] && recent_failures=0

  if [[ "$recent_failures" -gt 3 ]]; then
    log "CHECK $component: DEGRADED ($recent_failures model failures this hour)"
    update_component "$component" "status" "\"degraded\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      # Check current model config
      local primary=$(python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
print(c.get('agents',{}).get('defaults',{}).get('model',{}).get('primary','unknown'))
" 2>/dev/null)
      local fallbacks=$(python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
fb = c.get('agents',{}).get('defaults',{}).get('model',{}).get('fallbacks',[])
print(len(fb))
" 2>/dev/null)

      if [[ "$fallbacks" == "0" ]]; then
        # No fallbacks configured — restore them
        log "FIX $component: No model fallbacks configured — restoring Sonnet + Haiku"
        backup_config "$HOME/.openclaw/openclaw.json"
        python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
model = c.setdefault('agents',{}).setdefault('defaults',{}).setdefault('model',{})
if not model.get('fallbacks'):
    model['fallbacks'] = ['openai-codex/gpt-5.3-codex', 'anthropic/claude-sonnet-4-6', 'anthropic/claude-haiku-4-5']
with open('$HOME/.openclaw/openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
" 2>/dev/null
        record_fix_attempt "$component" "restore-fallbacks" "True"
        bash "$AUDIT" success "sentinel" "Restored model fallback chain" --detail "primary=$primary, added Sonnet+Haiku fallbacks"
        # Restart gateway for new config
        pkill -f openclaw-gateway 2>/dev/null || true
        sleep 6
        notify_discord "Model Config Fixed" "No fallback models were configured. Sentinel restored Codex → Sonnet → Haiku chain and restarted gateway." 3066993
        mark_notified "$component"
      else
        record_fix_attempt "$component" "check-fallbacks" "True"
        log "CHECK $component: $recent_failures failures but fallbacks configured ($fallbacks)"
        bash "$AUDIT" info "sentinel" "Model failures detected ($recent_failures) but fallbacks are in place"
      fi
    fi
  else
    update_component "$component" "status" "\"healthy\""
  fi
}

check_dispatch_pipeline() {
  local component="dispatch"

  # Check if any cards are stuck in in_progress for >12 hours
  local stuck=$(curl -s --max-time 5 http://localhost:3001/api/kanban 2>/dev/null | python3 -c "
import json, sys
from datetime import datetime, timezone
d = json.load(sys.stdin)
cards = d.get('columns',{}).get('in_progress',[])
now = datetime.now(timezone.utc)
stuck = []
for c in cards:
    updated = datetime.fromisoformat(c.get('updatedAt','2020-01-01T00:00:00Z').replace('Z','+00:00'))
    hours = (now - updated).total_seconds() / 3600
    if hours > 12:
        stuck.append(f'{c.get(\"title\",\"?\")[:30]} ({hours:.0f}h)')
if stuck:
    print('|'.join(stuck))
else:
    print('OK')
" 2>/dev/null || echo "API_ERROR")

  if [[ "$stuck" != "OK" && "$stuck" != "API_ERROR" ]]; then
    log "CHECK $component: STUCK cards ($stuck)"
    update_component "$component" "status" "\"degraded\""

    local should=$(should_attempt_fix "$component")
    if [[ "$should" == "OK" || "$should" == "RESET" ]]; then
      [[ "$should" == "RESET" ]] && reset_component "$component"

      # Wake Alfred to deal with stuck cards
      log "FIX $component: Waking Alfred to handle stuck cards"
      curl -s --max-time 10 -X POST "http://localhost:3001/api/kanban/wake" > /dev/null 2>&1 || true
      record_fix_attempt "$component" "wake-alfred" "True"
      bash "$AUDIT" warn "sentinel" "Stuck cards detected — woke Alfred" --detail "$stuck"
    fi
  elif [[ "$stuck" == "API_ERROR" ]]; then
    log "CHECK $component: CC API unreachable"
  else
    # Also check: is the work executor running? (should run every 15 min)
    local executor_age=$(stat -f%m "$HOME/.openclaw/logs/alfred-work-executor.log" 2>/dev/null || echo "0")
    local now_epoch=$(date +%s)
    local age_min=$(( (now_epoch - executor_age) / 60 ))

    if [[ "$age_min" -gt 30 ]]; then
      log "CHECK $component: Work executor stale (${age_min}m since last run)"
      update_component "$component" "status" "\"degraded\""
      # LaunchAgent should auto-recover — just log
      bash "$AUDIT" warn "sentinel" "Work executor hasn't run in ${age_min}m"
    else
      update_component "$component" "status" "\"healthy\""
    fi
  fi
}

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

main() {
  # Ensure state file exists
  [[ -f "$STATE_FILE" ]] || echo '{}' > "$STATE_FILE"

  log "=== Sentinel check ==="

  check_gateway
  check_command_center
  check_hal
  check_idle_loop
  check_sessions
  check_config_integrity
  check_model_health
  check_dispatch_pipeline
  check_disk

  # Summary
  local summary=$(python3 -c "
import json
with open('$STATE_FILE') as f:
    state = json.load(f)
statuses = {k: v.get('status','unknown') for k, v in state.items()}
down = [k for k,v in statuses.items() if v == 'down']
degraded = [k for k,v in statuses.items() if v == 'degraded']
if down:
    print(f'DOWN: {\", \".join(down)}')
elif degraded:
    print(f'DEGRADED: {\", \".join(degraded)}')
else:
    print('ALL HEALTHY')
" 2>/dev/null || echo "STATE_ERROR")

  log "Summary: $summary"

  # Update memory with sentinel status
  echo "$summary" > "$WORKSPACE/.hal-alfred-tracking/sentinel-summary.txt"

  # --- Diagnostic dispatch for unresolved issues ---
  # Check for components that are down/degraded with exhausted fix attempts
  # or recurring failures (5+ in 24h)
  python3 -c "
import json, time, os

with open('$STATE_FILE') as f:
    state = json.load(f)

for comp, data in state.items():
    status = data.get('status', 'healthy')
    if status == 'healthy':
        continue

    attempts = data.get('fixAttempts', [])
    now = time.time()

    # Condition 1: All auto-fix attempts exhausted
    exhausted = len(attempts) >= $MAX_FIX_ATTEMPTS

    # Condition 2: Recurring — 5+ failures in last 24h
    recent_failures = sum(1 for a in attempts if not a.get('success') and now - a.get('at', 0) < 86400)
    recurring = recent_failures >= 5

    if exhausted or recurring:
        flag = '--recurring' if recurring else ''
        error_ctx = f'Status: {status}, fix attempts: {len(attempts)}, recent failures (24h): {recent_failures}'
        print(f'{comp}|{status}|{error_ctx}|{flag}')
" 2>/dev/null | while IFS='|' read -r comp status error_ctx flag; do
    log "ESCALATE: Dispatching diagnostic for $comp ($status)"
    bash "$SCRIPT_DIR/sentinel-diagnose.sh" "$comp" "$status" "$error_ctx" $flag 2>/dev/null || true
  done
}

main "$@"
