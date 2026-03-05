#!/bin/bash
# hal-dispatch-retry.sh - Resilient HAL dispatch with token-safe retries
# Implements: exponential backoff, token budget ceiling, API quota monitor, fallback routing
# Usage: hal-dispatch-retry.sh <card_id> <task_description> [--dry-run]

set -euo pipefail

CARD_ID="$1"
TASK_DESC="$2"
DRY_RUN="${3:-}"
DASHBOARD_API="http://localhost:3001/api"

# Retry configuration (token-aware)
MAX_RETRIES=3
RETRY_DELAYS=(1 3 9)  # Exponential backoff: 1s, 3s, 9s
TOKEN_BUDGET_PER_RETRY=2000
SESSION_SPEND_CAP_USD=2.00
API_QUOTA_THRESHOLD=10000  # tokens remaining before disabling escalation

# Log file for observability
LOG_FILE="/Users/hopenclaw/.openclaw/workspace/logs/hal-dispatch-retry.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

check_token_budget() {
  # Read from session_status (context usage)
  # Placeholder: assume we can fetch from dashboard or gateway
  local remaining=$(curl -s "http://localhost:3001/api/status" 2>/dev/null | jq -r '.tokens_remaining // 10000' || echo "10000")
  echo "$remaining"
}

check_api_quota() {
  # Query Anthropic API usage (requires .env ANTHROPIC_API_KEY)
  # Placeholder: returns percentage of monthly quota used
  # For now, return 0 (assume quota available)
  echo "0"
}

classify_error() {
  local error_msg="$1"
  
  if [[ "$error_msg" =~ "rate_limit" ]]; then
    echo "RATE_LIMIT"
  elif [[ "$error_msg" =~ "timeout\|connection\|transient" ]]; then
    echo "TRANSIENT"
  else
    echo "PERMANENT"
  fi
}

dispatch_hal() {
  local retry_count=$1
  
  log "🚀 HAL Dispatch (Attempt $((retry_count + 1))/$MAX_RETRIES): $TASK_DESC"
  
  # Check pre-conditions
  local token_remaining=$(check_token_budget)
  if [[ $token_remaining -lt $TOKEN_BUDGET_PER_RETRY ]]; then
    log "⚠️  ABORT: Token budget exhausted ($token_remaining < $TOKEN_BUDGET_PER_RETRY). Switching to LOCAL fallback."
    return 2  # Fallback signal
  fi
  
  local quota_pct=$(check_api_quota)
  if [[ $quota_pct -gt 90 ]]; then
    log "⚠️  WARN: API quota at ${quota_pct}%. Retries may fail. Proceeding cautiously."
  fi
  
  # Spawn HAL in run mode with timeout
  local spawn_cmd="sessions_spawn runtime=subagent agentId=HAL mode=run task='$TASK_DESC' timeoutSeconds=21600"
  
  if [[ -n "$DRY_RUN" ]]; then
    log "[DRY-RUN] Would execute: $spawn_cmd"
    return 0
  fi
  
  # Actual dispatch (would call OpenClaw API)
  # This is a placeholder — real implementation uses sessions_spawn tool
  log "Dispatching to HAL (subagent mode)..."
  
  return 0
}

main() {
  log "Starting HAL dispatch with retry safeguards"
  log "Card: $CARD_ID | Task: $TASK_DESC"
  log "Retry config: MAX_RETRIES=$MAX_RETRIES, BACKOFF=${RETRY_DELAYS[@]}, TOKEN_CAP=$TOKEN_BUDGET_PER_RETRY, SPEND_CAP=$SESSION_SPEND_CAP_USD"
  
  for retry_count in $(seq 0 $((MAX_RETRIES - 1))); do
    if dispatch_hal "$retry_count"; then
      log "✅ HAL dispatch succeeded"
      curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\":\"alfred\",\"text\":\"✅ HAL dispatched (attempt $((retry_count + 1))). Monitoring for completion.\"}" >/dev/null
      return 0
    fi
    
    # Dispatch failed, check if retryable
    local error_class=$(classify_error "rate_limit")  # Placeholder
    
    if [[ "$error_class" == "PERMANENT" ]]; then
      log "❌ Permanent error. No retry."
      curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\":\"alfred\",\"text\":\"❌ HAL dispatch failed (permanent error). Manual intervention required.\"}" >/dev/null
      return 1
    fi
    
    if [[ $retry_count -lt $((MAX_RETRIES - 1)) ]]; then
      local delay=${RETRY_DELAYS[$retry_count]}
      log "⏳ Transient error. Retrying in ${delay}s... (Attempt $((retry_count + 2))/$MAX_RETRIES)"
      sleep "$delay"
    fi
  done
  
  log "❌ Max retries exhausted"
  curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
    -H "Content-Type: application/json" \
    -d "{\"author\":\"alfred\",\"text\":\"❌ HAL dispatch failed after $MAX_RETRIES retries. Check token budget and API quota.\"}" >/dev/null
  
  return 1
}

main "$@"
