#!/bin/bash
# STATE-MANAGER.SH — Unified state cache management library
# Handles all working-state.json operations: create, read, update, checkpoint, recovery

set -euo pipefail

STATE_DIR="${STATE_DIR:-$HOME/.openclaw/workspace/state}"
STATE_FILE="$STATE_DIR/working-state.json"
METRICS_FILE="$STATE_DIR/metrics.jsonl"
BACKUPS_DIR="$STATE_DIR/backups"

# Ensure directories exist
mkdir -p "$STATE_DIR" "$BACKUPS_DIR" "$STATE_DIR/archives"

# ============================================================================
# INITIALIZATION
# ============================================================================

STATE_INIT() {
  # Create empty state file if it doesn't exist
  if [[ ! -f "$STATE_FILE" ]]; then
    cat > "$STATE_FILE.tmp" <<'EOF'
{
  "state_version": "1.0",
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "session_id": "",
  "active_work": {
    "current_task": {},
    "blocked_by": []
  },
  "pending_decisions": [],
  "session_checkpoint": {},
  "memory_references": {
    "loaded_files": [],
    "long_term_decisions": []
  }
}
EOF
    mv "$STATE_FILE.tmp" "$STATE_FILE"
    echo "Initialized empty state file: $STATE_FILE"
  fi
}

# ============================================================================
# READ OPERATIONS
# ============================================================================

STATE_GET() {
  # Get field from state using jq path
  # Usage: STATE_GET '.active_work.current_task.title'
  local jq_path="${1:-.}"
  
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "null"
    return 0
  fi
  
  jq -r "$jq_path" "$STATE_FILE" 2>/dev/null || echo "null"
}

STATE_GET_CURRENT_TASK() {
  STATE_GET '.active_work.current_task'
}

STATE_GET_STATUS() {
  STATE_GET '.active_work.current_task.status'
}

STATE_GET_BLOCKERS() {
  STATE_GET '.active_work.blocked_by'
}

STATE_GET_PENDING_DECISIONS() {
  STATE_GET '.pending_decisions'
}

STATE_GET_CONTEXT_PCT() {
  STATE_GET '.active_work.current_task.context_snapshot.context_pct'
}

# ============================================================================
# WRITE OPERATIONS (Atomic)
# ============================================================================

STATE_WRITE_ATOMIC() {
  # Write new state atomically: temp → validate → rename → backup
  # Usage: STATE_WRITE_ATOMIC "$new_json_object"
  local new_state="$1"
  local tmp_file="$STATE_FILE.tmp.$$"
  local backup_file="$BACKUPS_DIR/working-state-$(date +%s).json"
  
  # Write to temp file
  echo "$new_state" > "$tmp_file"
  
  # Validate it's valid JSON
  if ! jq . "$tmp_file" > /dev/null 2>&1; then
    echo "ERROR: Invalid JSON in state update" >&2
    rm -f "$tmp_file"
    return 1
  fi
  
  # Make backup of current state
  if [[ -f "$STATE_FILE" ]]; then
    cp "$STATE_FILE" "$backup_file"
  fi
  
  # Atomic rename
  mv "$tmp_file" "$STATE_FILE"
  
  # Log to metrics
  METRICS_APPEND "state_write" "success" "$STATE_FILE"
  
  return 0
}

STATE_SET_CURRENT_TASK() {
  # Update current task (all fields)
  # Usage: STATE_SET_CURRENT_TASK '{"card_id": "...", "title": "...", ...}'
  local task_json="$1"
  
  local current_state=$(cat "$STATE_FILE")
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local new_state=$(echo "$current_state" | jq --argjson task "$task_json" \
    --arg ts "$timestamp" \
    '.active_work.current_task = $task | .last_updated = $ts')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_SET_STATUS() {
  # Update task status
  # Usage: STATE_SET_STATUS "in_progress"
  local new_status="$1"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg status "$new_status" \
    '.active_work.current_task.status = $status | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_SET_PROGRESS() {
  # Update progress description
  # Usage: STATE_SET_PROGRESS "Completed research phase, moving to design"
  local progress_text="$1"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg progress "$progress_text" \
    '.active_work.current_task.progress = $progress | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_SET_NEXT_STEP() {
  # Update next step (used for recovery)
  # Usage: STATE_SET_NEXT_STEP "Resume implementation from checkpoint"
  local next_step="$1"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg next_step "$next_step" \
    '.active_work.current_task.next_step = $next_step | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_ADD_BLOCKER() {
  # Add a blocker to current task
  # Usage: STATE_ADD_BLOCKER "approval" "Waiting for Joe to approve Phase 2"
  local blocker_type="$1"
  local description="$2"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg type "$blocker_type" \
    --arg desc "$description" \
    '.active_work.blocked_by += [{"type": $type, "description": $desc, "since": now | todate}] | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_CLEAR_BLOCKERS() {
  # Remove all blockers
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    '.active_work.blocked_by = [] | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_ADD_PENDING_DECISION() {
  # Add pending decision
  # Usage: STATE_ADD_PENDING_DECISION "notif_xxx" "Should we do X?" "waiting"
  local decision_id="$1"
  local question="$2"
  local status="${3:-waiting}"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg id "$decision_id" \
    --arg q "$question" \
    --arg status "$status" \
    '.pending_decisions += [{"id": $id, "question": $q, "status": $status, "created": now | todate}] | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

STATE_RESOLVE_DECISION() {
  # Remove decision from pending
  # Usage: STATE_RESOLVE_DECISION "notif_xxx"
  local decision_id="$1"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg id "$decision_id" \
    '.pending_decisions |= map(select(.id != $id)) | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

# ============================================================================
# CHECKPOINT OPERATIONS
# ============================================================================

STATE_CHECKPOINT() {
  # Write checkpoint when context exceeds threshold
  # Usage: STATE_CHECKPOINT "Gateway auto-restart triggered"
  local reason="${1:-Context threshold exceeded}"
  local context_pct=$(STATE_GET_CONTEXT_PCT)
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg reason "$reason" \
    --arg context "$context_pct" \
    '.session_checkpoint = {
      "last_checkpoint": now | todate,
      "context_at_checkpoint": ($context | tonumber),
      "reason": $reason,
      "recovery_steps": [
        "Load working-state.json",
        "Resume from current_task.next_step"
      ]
    } | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
  
  METRICS_APPEND "session_checkpoint" "written" "$reason"
  echo "Checkpoint created: $reason (context: $context_pct%)"
}

STATE_RECOVER_FROM_CHECKPOINT() {
  # Recover session from last checkpoint
  # This runs automatically on session startup if needed
  
  local checkpoint=$(STATE_GET '.session_checkpoint')
  local task=$(STATE_GET_CURRENT_TASK)
  local next_step=$(STATE_GET '.active_work.current_task.next_step')
  
  if [[ "$checkpoint" == "null" || -z "$next_step" || "$next_step" == "null" ]]; then
    return 0  # No checkpoint to recover from
  fi
  
  echo "Recovering session from checkpoint..."
  echo "Last checkpoint: $(STATE_GET '.session_checkpoint.last_checkpoint')"
  echo "Reason: $(STATE_GET '.session_checkpoint.reason')"
  echo "Next step: $next_step"
  
  METRICS_APPEND "session_recovery" "auto_resumed" "$(STATE_GET '.active_work.current_task.card_id')"
  
  return 0
}

# ============================================================================
# CONTEXT SNAPSHOT
# ============================================================================

STATE_UPDATE_CONTEXT_SNAPSHOT() {
  # Update context usage metrics (called during work)
  # Usage: STATE_UPDATE_CONTEXT_SNAPSHOT "haiku" 12450 33
  local model="$1"
  local tokens_used="$2"
  local context_pct="$3"
  
  local current_state=$(cat "$STATE_FILE")
  local new_state=$(echo "$current_state" | jq \
    --arg model "$model" \
    --arg tokens "$tokens_used" \
    --arg pct "$context_pct" \
    '.active_work.current_task.context_snapshot = {
      "model": $model,
      "tokens_used": ($tokens | tonumber),
      "context_pct": ($pct | tonumber)
    } | .last_updated = now | todate')
  
  STATE_WRITE_ATOMIC "$new_state"
}

# ============================================================================
# METRICS LOGGING
# ============================================================================

METRICS_INIT() {
  if [[ ! -f "$METRICS_FILE" ]]; then
    touch "$METRICS_FILE"
    echo "Initialized metrics file: $METRICS_FILE"
  fi
}

METRICS_APPEND() {
  # Append JSON event to metrics log
  # Usage: METRICS_APPEND "state_write" "success" "some_context"
  local event_type="$1"
  local status="$2"
  local context="${3:-}"
  
  local event_json=$(jq -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg type "$event_type" \
    --arg stat "$status" \
    --arg ctx "$context" \
    '{timestamp: $ts, event_type: $type, status: $stat, context: $ctx}')
  
  echo "$event_json" >> "$METRICS_FILE"
}

METRICS_SUMMARY() {
  # Print summary of metrics from last N hours
  # Usage: METRICS_SUMMARY 24  (last 24 hours)
  local hours="${1:-24}"
  local cutoff_time=$(date -u -d "-${hours} hours" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || \
                     date -u -v-${hours}H +%Y-%m-%dT%H:%M:%SZ)
  
  echo "=== Metrics Summary (last $hours hours) ==="
  jq --arg cutoff "$cutoff_time" \
    'select(.timestamp > $cutoff) | [.event_type, .status] | @csv' \
    "$METRICS_FILE" | sort | uniq -c | sort -rn
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

STATE_DISPLAY() {
  # Pretty-print current state
  jq . "$STATE_FILE" | head -50
}

STATE_VALIDATE() {
  # Validate state file integrity
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "ERROR: State file not found: $STATE_FILE"
    return 1
  fi
  
  if ! jq . "$STATE_FILE" > /dev/null 2>&1; then
    echo "ERROR: State file is invalid JSON"
    return 1
  fi
  
  # Check required fields
  local version=$(STATE_GET '.state_version')
  if [[ "$version" == "null" ]]; then
    echo "ERROR: state_version field missing"
    return 1
  fi
  
  echo "✅ State file valid (version: $version)"
  return 0
}

# ============================================================================
# BOOTSTRAP
# ============================================================================

STATE_INIT
METRICS_INIT

# Export functions for sourcing
export -f STATE_GET STATE_GET_CURRENT_TASK STATE_GET_STATUS STATE_GET_BLOCKERS
export -f STATE_GET_PENDING_DECISIONS STATE_GET_CONTEXT_PCT
export -f STATE_WRITE_ATOMIC STATE_SET_CURRENT_TASK STATE_SET_STATUS STATE_SET_PROGRESS
export -f STATE_SET_NEXT_STEP STATE_ADD_BLOCKER STATE_CLEAR_BLOCKERS
export -f STATE_ADD_PENDING_DECISION STATE_RESOLVE_DECISION
export -f STATE_CHECKPOINT STATE_RECOVER_FROM_CHECKPOINT
export -f STATE_UPDATE_CONTEXT_SNAPSHOT
export -f METRICS_INIT METRICS_APPEND METRICS_SUMMARY
export -f STATE_DISPLAY STATE_VALIDATE
