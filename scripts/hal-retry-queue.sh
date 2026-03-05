#!/bin/bash
# hal-retry-queue.sh - Persistent retry queue for HAL dispatch with token awareness
# Maintains a queue of failed dispatches and retries them when conditions are favorable
# Usage: hal-retry-queue.sh [--enqueue <task_desc>] [--process] [--status] [--clear]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
QUEUE_DIR="$WORKSPACE/.hal-retry-queue"
QUEUE_FILE="$QUEUE_DIR/queue.jsonl"
LOG_FILE="$QUEUE_DIR/retry-queue.log"

mkdir -p "$QUEUE_DIR"

# Configuration
MAX_RETRIES_PER_TASK=3
TOKEN_BUDGET_MIN=2000
CONTEXT_USAGE_THRESHOLD=75
RETRY_DELAYS=(30 90 300)  # seconds: 30s, 1.5m, 5m

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }
uuid() { python3 -c "import uuid; print(str(uuid.uuid4())[:8])"; }

# ─── API Helpers ──────────────────────────────────────────────────────────

get_context_usage() {
  curl -s "http://localhost:3001/api/status" 2>/dev/null \
    | jq -r '.context_usage_pct // 50' 2>/dev/null || echo "50"
}

get_token_remaining() {
  local context_pct=$(get_context_usage)
  # Rough estimate: 200k total, context_pct% used
  echo $(( (100 - context_pct) * 2000 ))
}

can_dispatch() {
  local tokens=$(get_token_remaining)
  local context=$(get_context_usage)
  
  if [[ $context -gt $CONTEXT_USAGE_THRESHOLD ]]; then
    log "⚠️  Context usage too high ($context > $CONTEXT_USAGE_THRESHOLD). Skipping dispatch."
    return 1
  fi
  
  if [[ $tokens -lt $TOKEN_BUDGET_MIN ]]; then
    log "⚠️  Insufficient token budget ($tokens < $TOKEN_BUDGET_MIN). Skipping dispatch."
    return 1
  fi
  
  return 0
}

# ─── Queue Operations ─────────────────────────────────────────────────────

enqueue_task() {
  local task_desc="$1"
  local card_id="${2:-}"
  local task_id=$(uuid)
  
  local entry="{\"task_id\":\"$task_id\",\"task_desc\":\"$task_desc\",\"card_id\":\"$card_id\",\"retry_count\":0,\"created_at\":\"$(ts)\",\"last_retry_at\":null,\"status\":\"pending\"}"
  
  echo "$entry" >> "$QUEUE_FILE"
  log "📥 Enqueued task: $task_id ($task_desc)"
  
  # Post card comment if applicable
  if [[ -n "$card_id" ]]; then
    curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/comments" \
      -H "Content-Type: application/json" \
      -d "{\"author\":\"alfred\",\"text\":\"📥 Queued for retry (ID: $task_id, attempt 1/$MAX_RETRIES_PER_TASK)\"}" >/dev/null || true
  fi
}

process_queue() {
  if [[ ! -f "$QUEUE_FILE" ]]; then
    log "✅ Queue empty"
    return 0
  fi
  
  log "🔄 Processing retry queue..."
  
  local temp_file="$QUEUE_DIR/queue.tmp"
  : > "$temp_file"
  
  while IFS= read -r line; do
    if [[ -z "$line" ]]; then continue; fi
    
    local task_id=$(echo "$line" | jq -r '.task_id')
    local task_desc=$(echo "$line" | jq -r '.task_desc')
    local card_id=$(echo "$line" | jq -r '.card_id')
    local retry_count=$(echo "$line" | jq -r '.retry_count')
    local status=$(echo "$line" | jq -r '.status')
    
    # Skip if already succeeded or exhausted
    if [[ "$status" == "success" ]] || [[ "$status" == "exhausted" ]]; then
      echo "$line" >> "$temp_file"
      continue
    fi
    
    # Check if ready to retry (exponential backoff)
    local last_retry=$(echo "$line" | jq -r '.last_retry_at')
    if [[ "$last_retry" != "null" ]]; then
      local last_retry_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$last_retry" +%s 2>/dev/null || echo "0")
      local now_epoch=$(date +%s)
      local seconds_since=$((now_epoch - last_retry_epoch))
      local next_retry_delay=${RETRY_DELAYS[$((retry_count - 1))]}
      
      if [[ $seconds_since -lt $next_retry_delay ]]; then
        # Not yet ready for retry
        echo "$line" >> "$temp_file"
        continue
      fi
    fi
    
    # Ready to retry — check conditions
    if ! can_dispatch; then
      echo "$line" >> "$temp_file"
      continue
    fi
    
    # Attempt dispatch
    log "🚀 Retry $((retry_count + 1))/$MAX_RETRIES_PER_TASK: $task_id ($task_desc)"
    
    # Call the actual dispatcher
    if node "$SCRIPT_DIR/hal-dispatch-ws.js" "$task_desc" >/dev/null 2>&1; then
      # Success
      local updated=$(echo "$line" | jq ".status=\"success\" | .last_retry_at=\"$(ts)\"")
      echo "$updated" >> "$temp_file"
      log "✅ Retry succeeded: $task_id"
      
      if [[ -n "$card_id" ]]; then
        curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/comments" \
          -H "Content-Type: application/json" \
          -d "{\"author\":\"alfred\",\"text\":\"✅ Retry succeeded after $retry_count failures (ID: $task_id)\"}" >/dev/null || true
      fi
    else
      # Failed — check retry budget
      if [[ $retry_count -ge $((MAX_RETRIES_PER_TASK - 1)) ]]; then
        # Exhausted
        local updated=$(echo "$line" | jq ".status=\"exhausted\" | .last_retry_at=\"$(ts)\" | .retry_count=$((retry_count + 1))")
        echo "$updated" >> "$temp_file"
        log "❌ Retries exhausted: $task_id"
        
        if [[ -n "$card_id" ]]; then
          curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/comments" \
            -H "Content-Type: application/json" \
            -d "{\"author\":\"alfred\",\"text\":\"❌ Retry exhausted after $MAX_RETRIES_PER_TASK attempts. Manual intervention required.\"}" >/dev/null || true
        fi
      else
        # Schedule next retry
        local updated=$(echo "$line" | jq ".status=\"pending\" | .last_retry_at=\"$(ts)\" | .retry_count=$((retry_count + 1))")
        echo "$updated" >> "$temp_file"
        log "⏳ Will retry later: $task_id (attempt $((retry_count + 2))/$MAX_RETRIES_PER_TASK)"
        
        if [[ -n "$card_id" ]]; then
          local next_delay=${RETRY_DELAYS[$retry_count]}
          curl -s -X POST "http://localhost:3001/api/kanban/${card_id}/comments" \
            -H "Content-Type: application/json" \
            -d "{\"author\":\"alfred\",\"text\":\"⏳ Retry scheduled in ${next_delay}s (attempt $((retry_count + 2))/$MAX_RETRIES_PER_TASK, ID: $task_id)\"}" >/dev/null || true
        fi
      fi
    fi
  done < "$QUEUE_FILE"
  
  mv "$temp_file" "$QUEUE_FILE"
  log "✅ Queue processing complete"
}

show_status() {
  if [[ ! -f "$QUEUE_FILE" ]]; then
    echo "Queue empty"
    return 0
  fi
  
  echo "=== Retry Queue Status ==="
  jq -r '.task_id + " [" + .status + "] " + .task_desc + " (retry: " + (.retry_count|tostring) + "/$MAX_RETRIES_PER_TASK)"' "$QUEUE_FILE" | cat -n
}

clear_queue() {
  rm -f "$QUEUE_FILE"
  log "🗑️  Queue cleared"
}

# ─── Main ─────────────────────────────────────────────────────────────────

main() {
  case "${1:-}" in
    --enqueue)
      enqueue_task "$2" "${3:-}"
      ;;
    --process)
      process_queue
      ;;
    --status)
      show_status
      ;;
    --clear)
      clear_queue
      ;;
    *)
      echo "Usage: $0 [--enqueue <task> [card-id]] | [--process] | [--status] | [--clear]"
      exit 1
      ;;
  esac
}

main "$@"
