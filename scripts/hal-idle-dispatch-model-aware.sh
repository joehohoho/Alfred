#!/bin/bash
# hal-idle-dispatch-model-aware.sh (NEW 2026-03-09)
# Updated version of hal-idle-dispatch-cron.sh with model selection + quota gates
#
# Wraps the existing Kanban + Proactive dispatch with:
# 1. Quota gate checks (prevent context/quota collisions)
# 2. Model selection logging (for monitoring)
# 3. Graceful fallback if gates fail
#
# Keeps existing WebSocket dispatch to HAL's gateway intact.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
CONFIG="$WORKSPACE/HAL-QUOTA-CONFIG.json"
LOG_DIR="$WORKSPACE/.hal-spawn-logs"

mkdir -p "$LOG_DIR"

ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(ts)] $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# QUOTA GATE CHECKS (NEW)
# ─────────────────────────────────────────────────────────────────────────────

quota_gates_check() {
  local alfred_context=$(session_status 2>/dev/null | jq -r '.context_usage_pct // 0' || echo "0")
  local quota_consumed=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  
  # Read gate thresholds from config
  local context_limit=$(jq -r '.quota_gates.alfred_context_limit_pct // 75' "$CONFIG" 2>/dev/null || echo "75")
  local quota_limit=$(jq -r '.quota_gates.subscription_quota_limit_pct // 85' "$CONFIG" 2>/dev/null || echo "85")
  
  # Gate 1: Alfred context
  if (( $(echo "$alfred_context > $context_limit" | bc -l 2>/dev/null || echo "0") )); then
    log "[QUOTA-GATE] REJECT: Alfred context at ${alfred_context}% (threshold: ${context_limit}%)"
    return 1
  fi
  
  # Gate 2: Subscription quota
  if (( $(echo "$quota_consumed > $quota_limit" | bc -l 2>/dev/null || echo "0") )); then
    log "[QUOTA-GATE] REJECT: Subscription quota at ${quota_consumed}% (threshold: ${quota_limit}%)"
    return 1
  fi
  
  log "[QUOTA-GATE] PASS: Alfred context ${alfred_context}%, Quota ${quota_consumed}%"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# DETERMINE HAL MODEL TIER (based on current quota)
# ─────────────────────────────────────────────────────────────────────────────

determine_model_tier() {
  local quota_consumed=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  local austerity_threshold=$(jq -r '.quota_austerity.enabled_at_pct // 70' "$CONFIG" 2>/dev/null || echo "70")
  
  # In austerity mode at high quota consumption
  if (( $(echo "$quota_consumed > $austerity_threshold" | bc -l 2>/dev/null || echo "0") )); then
    log "[MODEL] Austerity mode (quota ${quota_consumed}%): using LOCAL/Codex only"
    echo "local"
    return 0
  fi
  
  # Normal mode: prefer Codex for HAL tasks (existing behavior)
  log "[MODEL] Normal mode (quota ${quota_consumed}%): Codex with LOCAL fallback"
  echo "codex"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN: Call existing dispatch with quota checks
# ─────────────────────────────────────────────────────────────────────────────

main() {
  log "═══════════════════════════════════════════════════════════════════════════"
  log "HAL IDLE DISPATCH (Model-Aware, 2026-03-09)"
  
  # Gate check FIRST
  if ! quota_gates_check; then
    log "[ABORT] Quota gates failed — rejecting dispatch"
    echo "[ACTION:ABORT] reason=quota_gates_failed"
    exit 1
  fi
  
  # Determine model tier
  local model_tier=$(determine_model_tier)
  log "Selected model tier: $model_tier"
  
  # Log dispatch attempt
  local dispatch_log="$LOG_DIR/dispatch-$(date +%s).json"
  cat > "$dispatch_log" <<EOF
{
  "timestamp": "$(ts)",
  "action": "dispatch_check",
  "model_tier": "$model_tier",
  "quota_gates": "PASS"
}
EOF
  
  # Call original dispatch script
  log "Launching original HAL dispatcher (hal-idle-dispatch-cron.sh)..."
  
  # Call original script and pass through its output
  "$SCRIPT_DIR/hal-idle-dispatch-cron.sh"
  local exit_code=$?
  
  log "═══════════════════════════════════════════════════════════════════════════"
  exit $exit_code
}

main "$@"
