#!/bin/bash
# sentinel-diagnose.sh — Dispatches diagnostic tasks to Alfred/HAL when sentinel can't auto-fix
#
# Called by sentinel.sh when:
#   1. Auto-fix fails 3x for a component (escalation)
#   2. Same component fails 5+ times in 24h (recurring pattern)
#
# The LLM agent investigates, identifies root cause, and implements a fix.
# Results are written to sentinel-playbook.json so the sentinel learns new fix patterns.
#
# Usage: sentinel-diagnose.sh <component> <status> <error-context> [--recurring]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
PLAYBOOK="$WORKSPACE/.hal-alfred-tracking/sentinel-playbook.json"
DIAG_LOG="$WORKSPACE/.hal-alfred-tracking/sentinel-diagnostics.jsonl"
AUDIT="$SCRIPT_DIR/audit-log.sh"
STATE_FILE="$WORKSPACE/.hal-alfred-tracking/sentinel-state.json"

# Rate limit: max 3 diagnostic dispatches per day (LLM budget protection)
DAILY_DIAG_CAP=3
# Cooldown: don't dispatch same component diagnosis within 4h
DIAG_COOLDOWN=14400

COMPONENT="${1:?Usage: sentinel-diagnose.sh <component> <status> <error-context>}"
STATUS="${2:-unknown}"
ERROR_CONTEXT="${3:-No additional context}"
RECURRING="${4:-}"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*"; }

# --- Check if we should dispatch (rate limiting) ---

should_dispatch() {
  python3 -c "
import json, time, os

diag_log = '$DIAG_LOG'
component = '$COMPONENT'
now = time.time()

# Check daily cap
today_count = 0
if os.path.exists(diag_log):
    with open(diag_log) as f:
        for line in f:
            try:
                e = json.loads(line)
                if now - e.get('dispatchedAt', 0) < 86400:
                    today_count += 1
            except:
                pass

if today_count >= $DAILY_DIAG_CAP:
    print('DAILY_CAP')
    exit()

# Check per-component cooldown
if os.path.exists(diag_log):
    with open(diag_log) as f:
        for line in f:
            try:
                e = json.loads(line)
                if e.get('component') == component and now - e.get('dispatchedAt', 0) < $DIAG_COOLDOWN:
                    print('COOLDOWN')
                    exit()
            except:
                pass

print('OK')
" 2>/dev/null
}

# --- Check playbook for known fixes ---

check_playbook() {
  python3 -c "
import json, os

playbook_file = '$PLAYBOOK'
component = '$COMPONENT'

if not os.path.exists(playbook_file):
    print('NO_PLAYBOOK')
    exit()

with open(playbook_file) as f:
    playbook = json.load(f)

fixes = playbook.get(component, [])
if not fixes:
    print('NO_KNOWN_FIX')
else:
    # Return the most recent successful fix
    successful = [f for f in fixes if f.get('success')]
    if successful:
        latest = successful[-1]
        print(f'KNOWN_FIX|{latest.get(\"fix_script\", \"\")}|{latest.get(\"description\", \"\")}')
    else:
        print('ALL_FIXES_FAILED')
" 2>/dev/null
}

# --- Try a known fix from playbook first ---

try_playbook_fix() {
  local fix_info="$1"
  local fix_script=$(echo "$fix_info" | cut -d'|' -f2)
  local fix_desc=$(echo "$fix_info" | cut -d'|' -f3)

  if [[ -n "$fix_script" && -f "$WORKSPACE/scripts/$fix_script" ]]; then
    log "PLAYBOOK: Trying known fix for $COMPONENT: $fix_desc"
    bash "$AUDIT" info "sentinel-diag" "Trying playbook fix for $COMPONENT" --detail "$fix_desc"

    if bash "$WORKSPACE/scripts/$fix_script" 2>/dev/null; then
      log "PLAYBOOK: Fix succeeded for $COMPONENT"
      bash "$AUDIT" success "sentinel-diag" "Playbook fix worked: $COMPONENT" --detail "$fix_desc"
      return 0
    else
      log "PLAYBOOK: Fix failed for $COMPONENT"
      bash "$AUDIT" warn "sentinel-diag" "Playbook fix failed: $COMPONENT" --detail "$fix_desc"
      return 1
    fi
  fi
  return 1
}

# --- Build diagnostic context (compact, token-efficient) ---

build_diagnostic_context() {
  python3 -c "
import json, os, subprocess, time

component = '$COMPONENT'
error_ctx = '''$ERROR_CONTEXT'''
recurring = '$RECURRING' == '--recurring'

context = {
    'component': component,
    'status': '$STATUS',
    'error': error_ctx,
    'recurring': recurring,
    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}

# Add component-specific diagnostics (keep compact — max 500 chars each)

if component == 'gateway':
    # Last 5 gateway errors
    try:
        errors = subprocess.check_output(
            'tail -10 ~/.openclaw/logs/gateway.err.log 2>/dev/null | tail -5',
            shell=True, text=True, timeout=5
        ).strip()[:500]
        context['recent_errors'] = errors
    except: pass

elif component == 'hal':
    context['hal_http'] = subprocess.getoutput('curl -s --max-time 3 -o /dev/null -w \"%{http_code}\" http://192.168.2.79:18789 2>/dev/null')[:10]
    context['fail_count'] = subprocess.getoutput('cat ~/.openclaw/workspace/.hal-alfred-tracking/hal-dispatch-fail-count.txt 2>/dev/null')[:10]
    try:
        errors = subprocess.check_output(
            'tail -5 ~/.openclaw/logs/hal-idle-dispatch.log 2>/dev/null',
            shell=True, text=True, timeout=5
        ).strip()[:500]
        context['dispatch_log'] = errors
    except: pass

elif component == 'idle_loop':
    try:
        with open(os.path.expanduser('~/.openclaw/workspace/goals/idle-state.json')) as f:
            idle = json.load(f)
        context['last_activity'] = idle.get('lastActivityAt', 'never')
        context['cooldown'] = idle.get('cooldownMinutes', '?')
    except: pass

elif component == 'cc':
    context['cc_status'] = subprocess.getoutput('curl -s --max-time 3 http://localhost:3001/api/chat/status 2>/dev/null')[:100]

elif component == 'config':
    try:
        with open(os.path.expanduser('~/.openclaw/openclaw.json')) as f:
            cfg = json.load(f)
        cui = cfg.get('gateway',{}).get('controlUi',{})
        context['dangerouslyDisableDeviceAuth'] = cui.get('dangerouslyDisableDeviceAuth')
        context['allowedOrigins'] = cui.get('allowedOrigins')
        context['bind'] = cfg.get('gateway',{}).get('bind')
    except: pass

elif component == 'models':
    try:
        errors = subprocess.check_output(
            'grep -c \"OAuth.*failed\|token.*refresh\|CODEX_QUOTA\" ~/.openclaw/logs/gateway.err.log 2>/dev/null',
            shell=True, text=True, timeout=5
        ).strip()[:20]
        context['total_model_errors'] = errors
    except: pass

# Add sentinel fix history for this component
try:
    with open('$STATE_FILE') as f:
        state = json.load(f)
    comp_state = state.get(component, {})
    context['fix_attempts'] = comp_state.get('fixAttempts', [])[-5:]
except: pass

# Add playbook history
try:
    if os.path.exists('$PLAYBOOK'):
        with open('$PLAYBOOK') as f:
            pb = json.load(f)
        context['known_fixes'] = [f.get('description','') for f in pb.get(component, [])][-3:]
except: pass

print(json.dumps(context, indent=2))
" 2>/dev/null
}

# --- Dispatch diagnostic to Alfred via gateway ---

dispatch_to_alfred() {
  local diag_context="$1"

  local message="[SENTINEL-DIAGNOSTIC] The sentinel system detected a persistent issue with the '$COMPONENT' component that auto-fix could not resolve.

COMPONENT: $COMPONENT
STATUS: $STATUS
$([ -n "$RECURRING" ] && echo "⚠️ RECURRING ISSUE — this component has failed 5+ times in 24h")

DIAGNOSTIC CONTEXT:
$diag_context

YOUR TASK:
1. Read the diagnostic context above carefully
2. Investigate the root cause — check the specific logs and config mentioned
3. Implement a PERMANENT fix (not a temporary workaround)
4. Test your fix by verifying the component returns to healthy
5. Document what you found and fixed by running:
   bash scripts/sentinel-playbook-update.sh '$COMPONENT' '<description of fix>' '<script name if you created one>'
6. Update today's memory file with the diagnosis and fix
7. DO NOT modify openclaw.json without sending Joe a notification first

IMPORTANT: This is an autonomous diagnostic task. Fix the issue, don't just report it."

  # Send to Alfred's main session via Command Center
  local result=$(curl -s --max-time 15 -X POST "http://localhost:3001/api/kanban/wake" 2>/dev/null)
  local wake_action=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin).get('action','none'))" 2>/dev/null || echo "none")

  # Also send the diagnostic message directly
  curl -s --max-time 10 -X POST "http://localhost:3001/api/chat/send" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json; print(json.dumps({'message': '''$message'''}))" 2>/dev/null)" \
    > /dev/null 2>&1 || true

  log "Dispatched diagnostic to Alfred for $COMPONENT"
  return 0
}

# --- Dispatch to HAL if available ---

dispatch_to_hal() {
  local diag_context="$1"

  # Check HAL sleep mode — don't dispatch if sleeping
  local hal_sleeping=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/workspace/.hal-alfred-tracking/hal-forced-idle.json')).get('forcedIdle', False))" 2>/dev/null || echo "False")
  if [[ "$hal_sleeping" == "True" ]]; then
    log "HAL sleeping — skipping diagnostic dispatch, falling back to Alfred"
    return 1
  fi

  local message="[SENTINEL-DIAGNOSTIC] Investigate and fix: $COMPONENT ($STATUS). Context: $diag_context"

  # Try HAL dispatch via Python (node blocked by macOS LaunchAgent sandbox)
  timeout 20 python3 "$SCRIPT_DIR/hal-dispatch-py.py" "$message" 2>/dev/null && {
    log "Dispatched diagnostic to HAL for $COMPONENT"
    return 0
  } || {
    log "HAL dispatch failed — falling back to Alfred"
    return 1
  }
}

# --- Record diagnostic dispatch ---

record_dispatch() {
  local agent="$1" success="$2"
  python3 -c "
import json, time, os

entry = {
    'component': '$COMPONENT',
    'status': '$STATUS',
    'agent': '$agent',
    'success': $success,
    'recurring': '$RECURRING' == '--recurring',
    'dispatchedAt': time.time(),
    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
}

with open('$DIAG_LOG', 'a') as f:
    f.write(json.dumps(entry) + '\n')

# Prune entries older than 30 days
if os.path.getsize('$DIAG_LOG') > 50000:
    cutoff = time.time() - 30 * 86400
    with open('$DIAG_LOG') as f:
        lines = f.readlines()
    with open('$DIAG_LOG', 'w') as f:
        for line in lines:
            try:
                e = json.loads(line)
                if e.get('dispatchedAt', 0) > cutoff:
                    f.write(line)
            except:
                f.write(line)
" 2>/dev/null
}

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

# Check rate limits
DISPATCH_CHECK=$(should_dispatch)
if [[ "$DISPATCH_CHECK" == "DAILY_CAP" ]]; then
  log "SKIP: Daily diagnostic cap reached ($DAILY_DIAG_CAP/day)"
  exit 0
fi
if [[ "$DISPATCH_CHECK" == "COOLDOWN" ]]; then
  log "SKIP: $COMPONENT diagnostic in cooldown (4h between dispatches)"
  exit 0
fi

# Check playbook for known fix
PLAYBOOK_RESULT=$(check_playbook)
if [[ "$PLAYBOOK_RESULT" == KNOWN_FIX* ]]; then
  if try_playbook_fix "$PLAYBOOK_RESULT"; then
    record_dispatch "playbook" "True"
    exit 0
  fi
fi

# Build diagnostic context
CONTEXT=$(build_diagnostic_context)

# Try HAL first (free LLM), fall back to Alfred
if dispatch_to_hal "$CONTEXT"; then
  record_dispatch "hal" "True"
  bash "$AUDIT" info "sentinel-diag" "Diagnostic dispatched to HAL: $COMPONENT" --detail "$STATUS"
else
  dispatch_to_alfred "$CONTEXT"
  record_dispatch "alfred" "True"
  bash "$AUDIT" info "sentinel-diag" "Diagnostic dispatched to Alfred: $COMPONENT" --detail "$STATUS"
fi

# Notify Discord
source "$WORKSPACE/.env" 2>/dev/null || true
if [[ -n "${DISCORD_WEBHOOK_ALERTS:-}" ]]; then
  curl -s --max-time 10 -X POST "$DISCORD_WEBHOOK_ALERTS" \
    -H "Content-Type: application/json" \
    -d "{\"embeds\":[{\"title\":\"🔍 Sentinel Diagnostic\",\"description\":\"Auto-fix failed for **$COMPONENT** ($STATUS). Dispatched diagnostic task to investigate and fix the root cause.\",\"color\":16776960,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}" \
    > /dev/null 2>&1 || true
fi
