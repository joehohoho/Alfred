#!/bin/bash
# hal-spawn-model-aware.sh
# Spawn HAL tasks with intelligent model selection from Anthropic subscription
# Includes quota monitoring to prevent context/quota collisions with Alfred
#
# Usage:
#   hal-spawn-model-aware.sh "Task description" [complexity: 1-10] [type: general|code|security]
#
# Examples:
#   hal-spawn-model-aware.sh "Refactor auth module" 5 code
#   hal-spawn-model-aware.sh "Implement feature X" 7 general
#   hal-spawn-model-aware.sh "Security audit payment flow" 9 security

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
LOG_DIR="$WORKSPACE/.hal-spawn-logs"
QUOTA_CHECK="$LOG_DIR/quota-check.log"

mkdir -p "$LOG_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# ARGUMENTS
# ─────────────────────────────────────────────────────────────────────────────

TASK="${1:-}"
COMPLEXITY="${2:-5}"  # 1-10 scale
TASK_TYPE="${3:-general}"  # general|code|security

if [[ -z "$TASK" ]]; then
  echo "ERROR: Task description required"
  echo "Usage: $0 \"Task description\" [complexity] [type]"
  exit 1
fi

# Validate complexity
if ! [[ "$COMPLEXITY" =~ ^[0-9]+$ ]] || [[ $COMPLEXITY -lt 1 ]] || [[ $COMPLEXITY -gt 10 ]]; then
  echo "ERROR: Complexity must be 1-10"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# QUOTA SAFETY CHECKS
# ─────────────────────────────────────────────────────────────────────────────

quota_check() {
  local alfred_context_pct=$(session_status 2>/dev/null | jq -r '.context_usage_pct // 0' || echo "0")
  local quota_consumed=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | Alfred Context: ${alfred_context_pct}% | Subscription Quota: ${quota_consumed}%" >> "$QUOTA_CHECK"
  
  # HARD GATES: Don't spawn HAL if quotas are dangerously high
  if (( $(echo "$alfred_context_pct > 75" | bc -l) )); then
    echo "[QUOTA-GATE] REJECT: Alfred context at ${alfred_context_pct}% (threshold: 75%)"
    echo "[QUOTA-GATE] ACTION: Wait for Alfred session to compress before spawning HAL"
    return 1
  fi
  
  if (( $(echo "$quota_consumed > 85" | bc -l) )); then
    echo "[QUOTA-GATE] REJECT: Subscription quota at ${quota_consumed}% (threshold: 85%)"
    echo "[QUOTA-GATE] ACTION: Wait for quota reset or reduce HAL complexity"
    return 1
  fi
  
  # WARNING: Notify if quotas are trending high
  if (( $(echo "$alfred_context_pct > 60" | bc -l) )); then
    echo "[QUOTA-WARN] Alfred context elevated at ${alfred_context_pct}%; consider LOCAL model"
  fi
  
  if (( $(echo "$quota_consumed > 70" | bc -l) )); then
    echo "[QUOTA-WARN] Subscription quota at ${quota_consumed}%; reduce HAL tier complexity"
  fi
  
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# MODEL SELECTION LOGIC
# ─────────────────────────────────────────────────────────────────────────────

select_model() {
  local task_type="$1"
  local complexity="$2"
  local quota_consumed="${3:-0}"
  
  # Hard gate: If quota >70%, aggressively use LOCAL/Codex only
  if (( $(echo "$quota_consumed > 70" | bc -l) )); then
    if [[ "$task_type" == "code" ]]; then
      echo "codex"
      return 0
    else
      echo "local"
      return 0
    fi
  fi
  
  # Standard routing
  case "$task_type" in
    code)
      if [[ $complexity -le 7 ]]; then
        echo "codex"  # Code tasks prefer Codex
      else
        echo "sonnet"  # Complex code → Sonnet
      fi
      ;;
    security)
      if [[ $complexity -ge 8 ]]; then
        echo "opus"  # Ultra-complex security → Opus
      else
        echo "sonnet"  # Security-sensitive → Sonnet
      fi
      ;;
    general|*)
      if [[ $complexity -le 2 ]]; then
        echo "local"  # Trivial tasks → LOCAL
      elif [[ $complexity -le 5 ]]; then
        echo "haiku"  # Normal work → Haiku
      else
        echo "sonnet"  # Complex work → Sonnet
      fi
      ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# SPAWN HAL WITH SELECTED MODEL
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "[${timestamp}] HAL SPAWN REQUEST"
  echo "  Task: $TASK"
  echo "  Complexity: ${COMPLEXITY}/10"
  echo "  Type: $TASK_TYPE"
  
  # Check quotas before spawning
  if ! quota_check; then
    echo "[ABORT] Quota safety gates failed. Rejecting spawn."
    exit 1
  fi
  
  # Get quota for model selection
  local quota_consumed=$(curl -s http://localhost:3000/status 2>/dev/null | jq '.usage.consumed_pct // 0' || echo "0")
  
  # Select optimal model
  local model=$(select_model "$TASK_TYPE" "$COMPLEXITY" "$quota_consumed")
  echo "  Model Selected: $model (quota: ${quota_consumed}%)"
  
  # Log spawn request
  local spawn_log="$LOG_DIR/${timestamp//[:-]/}_spawn.json"
  cat > "$spawn_log" <<EOF
{
  "timestamp": "$timestamp",
  "task": "$TASK",
  "complexity": $COMPLEXITY,
  "task_type": "$TASK_TYPE",
  "model": "$model",
  "quota_consumed_pct": $quota_consumed,
  "spawn_script": "hal-spawn-model-aware.sh"
}
EOF
  echo "  Log: $spawn_log"
  
  # ─────────────────────────────────────────────────────────────────────────
  # SPAWN HAL SUBAGENT WITH SELECTED MODEL
  # ─────────────────────────────────────────────────────────────────────────
  
  echo "[SPAWN] Launching HAL subagent with model=$model..."
  
  # Use sessions_spawn with explicit model parameter
  local session_result
  if sessions_spawn \
      --runtime subagent \
      --task "$TASK" \
      --model "anthropic/claude-${model}-4-5" \
      --mode run \
      --label "hal-${TASK_TYPE}-${COMPLEXITY}" \
      --sandbox inherit \
      2>&1; then
    
    echo "[SUCCESS] HAL spawned with $model (complexity=$COMPLEXITY)"
    echo "  ✓ Model: $model"
    echo "  ✓ Quota check: PASS"
    echo "  ✓ Context limits: SAFE"
    echo "[DONE] Task will execute in background. Monitor with: session_history <session_key>"
    
  else
    echo "[ERROR] HAL spawn failed. Check gateway status."
    exit 1
  fi
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

main "$@"
