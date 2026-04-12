#!/bin/bash
# hal-dispatch-with-retry.sh - Wrapper around hal-dispatch-ws.js with token-safe retry logic
# Usage: hal-dispatch-with-retry.sh <task_description> [--card-id <id>] [--dry-run]

set -euo pipefail

TASK_DESC="$1"
CARD_ID=""
DRY_RUN=""
DASHBOARD_API="http://localhost:3001/api"

# Parse optional arguments
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --card-id) CARD_ID="$2"; shift 2 ;;
    --dry-run) DRY_RUN="1"; shift ;;
    *) shift ;;
  esac
done

# Configuration
MAX_RETRIES=3
RETRY_DELAYS=(1 3 9)
TOKEN_BUDGET_PER_RETRY=2000
SESSION_SPEND_CAP_USD=2.00
API_QUOTA_THRESHOLD=10000

LOG_FILE="/Users/hopenclaw/.openclaw/workspace/logs/hal-dispatch-retry.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

check_token_budget() {
  # Fetch context usage from dashboard (safe parsing)
  local context_pct=$(curl -s "http://localhost:3001/api/status" 2>/dev/null | jq -r '.context_usage_pct // 50' 2>/dev/null || echo "50")
  # Estimate remaining tokens (rough: assuming max 200k tokens, context_pct% used)
  # If context is 50%, then 100-50=50%, so remaining ≈ 50% of 200k = 100k tokens
  local estimated_remaining=$(( (100 - context_pct) * 2000 ))
  [[ $estimated_remaining -lt 0 ]] && estimated_remaining=0
  echo "$estimated_remaining"
}

check_api_quota() {
  # Placeholder: query Anthropic API usage if .env has ANTHROPIC_API_KEY
  # For now, return 0 (assume quota available)
  echo "0"
}

classify_error() {
  local error_msg="$1"
  if [[ "$error_msg" =~ "rate_limit\|429\|TooManyRequests" ]]; then
    echo "RATE_LIMIT"
  elif [[ "$error_msg" =~ "timeout\|TIMEOUT\|connection\|Connection" ]]; then
    echo "TRANSIENT"
  elif [[ "$error_msg" =~ "BLOCKED" ]]; then
    echo "BLOCKED_IDLE"
  else
    echo "PERMANENT"
  fi
}

dispatch_hal() {
  local retry_count=$1
  
  log "🚀 HAL Dispatch (Attempt $((retry_count + 1))/$MAX_RETRIES): $TASK_DESC"
  
  # Pre-flight checks
  local token_remaining=$(check_token_budget)
  if [[ $token_remaining -lt $TOKEN_BUDGET_PER_RETRY ]]; then
    log "⚠️  ABORT: Insufficient token budget ($token_remaining < $TOKEN_BUDGET_PER_RETRY). Skipping retry."
    return 2  # Insufficient tokens signal
  fi
  
  local quota_pct=$(check_api_quota)
  if [[ $quota_pct -gt 90 ]]; then
    log "⚠️  WARNING: API quota at ${quota_pct}%. Retries may fail."
  fi
  
  if [[ -n "$DRY_RUN" ]]; then
    log "[DRY-RUN] Would dispatch: $TASK_DESC"
    return 0
  fi
  
  # Call actual dispatcher
  OUTPUT=$(node /Users/hopenclaw/.openclaw/workspace/scripts/hal-dispatch-ws.js "$TASK_DESC" 2>&1 || true)
  EXIT_CODE=$?
  
  if [[ $EXIT_CODE -eq 0 ]] && [[ "$OUTPUT" =~ "OK" ]]; then
    SESSION_KEY=$(echo "$OUTPUT" | grep "OK session=" | cut -d'=' -f2 || echo "unknown")
    log "✅ HAL dispatch succeeded (session: $SESSION_KEY)"
    
    if [[ -n "$CARD_ID" ]]; then
      curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
        -H "Content-Type: application/json" \
        -d "{\"author\":\"alfred\",\"text\":\"✅ Dispatched to HAL (attempt $((retry_count + 1))/$MAX_RETRIES, session: $SESSION_KEY)\"}" >/dev/null || true
    fi
    return 0
  fi
  
  # Dispatch failed — classify error
  ERROR_CLASS=$(classify_error "$OUTPUT")
  log "❌ Dispatch failed: $ERROR_CLASS"
  log "   Output: $OUTPUT"
  
  case "$ERROR_CLASS" in
    BLOCKED_IDLE)
      log "HAL is in forced idle. Cannot retry. Blocking."
      if [[ -n "$CARD_ID" ]]; then
        curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
          -H "Content-Type: application/json" \
          -d "{\"author\":\"alfred\",\"text\":\"❌ HAL is in forced idle (maintenance mode). Wake HAL from Command Center before retrying.\"}" >/dev/null || true
      fi
      return 1
      ;;
    PERMANENT)
      log "Permanent error. No retry."
      if [[ -n "$CARD_ID" ]]; then
        curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
          -H "Content-Type: application/json" \
          -d "{\"author\":\"alfred\",\"text\":\"❌ HAL dispatch failed (permanent error): $ERROR_CLASS\"}" >/dev/null || true
      fi
      return 1
      ;;
    *)
      # Transient or rate limit — signal retry
      return 1
      ;;
  esac
}

main() {
  log "=== HAL Dispatch with Retry (Token-Safe) ==="
  log "Task: $TASK_DESC"
  if [[ -n "$CARD_ID" ]]; then
    log "Card: $CARD_ID"
  fi
  
  for retry_count in $(seq 0 $((MAX_RETRIES - 1))); do
    if dispatch_hal "$retry_count"; then
      return 0
    fi
    
    # Check if we should retry
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 2 ]]; then
      # Token budget exhausted — no retry
      log "Retry aborted: insufficient tokens"
      return 1
    fi
    
    # Can retry — wait with exponential backoff
    if [[ $retry_count -lt $((MAX_RETRIES - 1)) ]]; then
      local delay=${RETRY_DELAYS[$retry_count]}
      log "⏳ Transient error. Retrying in ${delay}s..."
      sleep "$delay"
    fi
  done
  
  log "❌ Max retries exhausted ($MAX_RETRIES attempts)"
  if [[ -n "$CARD_ID" ]]; then
    curl -s -X POST "${DASHBOARD_API}/kanban/${CARD_ID}/comments" \
      -H "Content-Type: application/json" \
      -d "{\"author\":\"alfred\",\"text\":\"❌ HAL dispatch exhausted $MAX_RETRIES retries. Check token budget and HAL status.\"}" >/dev/null || true
  fi
  
  return 1
}

main "$@"
