#!/bin/bash
# overnight-scheduler.sh - Consolidates and staggers overnight maintenance tasks
# Prevents rate-limit cascades by spreading load across low-traffic hours
# Runs as a single scheduled task instead of independent crons

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
LOG_FILE="$WORKSPACE/logs/overnight-scheduler.log"

mkdir -p "$(dirname "$LOG_FILE")"

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

CONTEXT_THRESHOLD=60
TOKEN_THRESHOLD=5000

get_context_usage() {
  curl -s "http://localhost:3001/api/status" 2>/dev/null \
    | jq -r '.context_usage_pct // 50' 2>/dev/null || echo "50"
}

get_token_remaining() {
  local context_pct=$(get_context_usage)
  echo $(( (100 - context_pct) * 2000 ))
}

check_conditions() {
  local context=$(get_context_usage)
  local tokens=$(get_token_remaining)
  
  log "📊 System status: context=${context}%, tokens=${tokens}k remaining"
  
  if [[ $context -gt $CONTEXT_THRESHOLD ]]; then
    log "⚠️  Context too high, skipping tasks"
    return 1
  fi
  
  if [[ $tokens -lt $TOKEN_THRESHOLD ]]; then
    log "⚠️  Tokens too low, skipping tasks"
    return 1
  fi
  
  return 0
}

# ─── Task: Rate-Limit Recovery ────────────────────────────────────────────
# Checks if we're recovering from rate limits and backs off further
task_rate_limit_recovery() {
  log "🔄 Task: Rate-limit recovery check"
  
  # Query gateway state
  local state=$(curl -s "http://localhost:3001/api/gateway-state" 2>/dev/null || echo '{}')
  local is_throttled=$(echo "$state" | jq -r '.is_throttled // false')
  
  if [[ "$is_throttled" == "true" ]]; then
    log "⚠️  Gateway is throttled, increasing backoff"
    # Store backoff state for other tasks to respect
    echo "last_throttle=$(date +%s)" > "$WORKSPACE/.rate-limit-state"
  fi
}

# ─── Task: Log Rotation ────────────────────────────────────────────────────
# Rotates old logs without blocking dispatch
task_log_rotation() {
  log "🔄 Task: Log rotation"
  
  find ~/Library/Logs -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null || true
  find ~/Library/Logs -name "*.gz" -mtime +30 -delete 2>/dev/null || true
  
  log "✅ Log rotation complete"
}

# ─── Task: Session Cleanup ────────────────────────────────────────────────
# Cleans old session files (synchronous, non-blocking)
task_session_cleanup() {
  log "🔄 Task: Session cleanup"
  
  # Remove session files older than 48 hours
  find "$WORKSPACE/.openclaw-sessions" -name "*.json" -mtime +2 -delete 2>/dev/null || true
  
  log "✅ Session cleanup complete"
}

# ─── Task: HAL Retry Queue Processing ──────────────────────────────────────
# Processes any pending retries (batched, respectful of context)
task_hal_retry_queue() {
  log "🔄 Task: HAL retry queue"
  
  bash "$SCRIPT_DIR/hal-retry-queue.sh" --process
}

# ─── Task: Lease Monitoring ───────────────────────────────────────────────
# Checks for stale in_progress cards blocking HAL dispatch
task_lease_monitoring() {
  log "🔄 Task: Lease monitoring (auto-unblock)"
  
  bash "$SCRIPT_DIR/hal-lease-monitor-enhanced.sh"
}

# ─── Task: Disk Space Check ───────────────────────────────────────────────
task_disk_check() {
  log "🔄 Task: Disk space check"
  
  local usage=$(df -h "$WORKSPACE" | tail -1 | awk '{print $5}' | tr -d '%')
  
  if [[ $usage -gt 85 ]]; then
    log "⚠️  ALERT: Disk usage at ${usage}%"
    # Could trigger cleanup or notification here
  else
    log "✅ Disk usage at ${usage}%"
  fi
}

# ─── Main Orchestration ────────────────────────────────────────────────────

main() {
  log "=== Overnight Maintenance Cycle ==="
  
  # Check if conditions allow tasks
  if ! check_conditions; then
    log "⏭️  Skipping all tasks (conditions not favorable)"
    return 1
  fi
  
  # Low-cost, non-LLM tasks (always safe)
  log "▶️  Running low-cost tasks..."
  task_log_rotation
  task_disk_check
  sleep 5
  
  # Conditional LLM tasks (respect context/tokens)
  log "▶️  Running conditional tasks..."
  task_rate_limit_recovery
  sleep 3
  
  task_session_cleanup
  sleep 3
  
  # HAL dispatch tasks (highest priority, but respects conditions)
  log "▶️  Running HAL tasks..."
  task_lease_monitoring
  sleep 5
  
  task_hal_retry_queue
  
  log "✅ Overnight maintenance cycle complete"
}

main "$@"
