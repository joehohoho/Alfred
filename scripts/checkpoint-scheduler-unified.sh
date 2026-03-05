#!/bin/bash
# checkpoint-scheduler-unified.sh - Consolidated checkpoint + sync + status in single scheduler pass
# Replaces: separate heartbeat, checkpoint, sync calls with unified observability
# Usage: checkpoint-scheduler-unified.sh [--dry-run]

set -euo pipefail

DRY_RUN="${1:-}"
WORKSPACE="$HOME/.openclaw/workspace"
STATE_FILE="$WORKSPACE/tmp/checkpoint-state.json"
MEMORY_FILE="$WORKSPACE/memory/$(date '+%Y-%m-%d').md"
ACTIVE_TASK="$WORKSPACE/ACTIVE-TASK.md"

# Create state file if missing
mkdir -p "$(dirname "$STATE_FILE")"
if [[ ! -f "$STATE_FILE" ]]; then
  jq -n '{"last_run": null, "last_context_hash": null, "last_write": null}' > "$STATE_FILE"
fi

# Read state (safely handle missing/invalid JSON)
STATE=$(cat "$STATE_FILE" 2>/dev/null || echo '{}')
LAST_RUN=$(echo "$STATE" | jq -r '.last_run // empty' 2>/dev/null || echo "")
LAST_HASH=$(echo "$STATE" | jq -r '.last_context_hash // ""' 2>/dev/null || echo "")
LAST_CONTEXT=$(echo "$STATE" | jq -r '.last_context // 0' 2>/dev/null || echo "0")

# === UNIFIED PASS: Context + Task + Status ===

# 1. Capture current state
CURRENT_CONTEXT_PCT=$(curl -s "http://localhost:3001/api/status" 2>/dev/null | jq -r '.context_usage_pct // 35' 2>/dev/null || echo "35")
CURRENT_TASK=$(grep "^Status:" "$ACTIVE_TASK" 2>/dev/null | head -1 || echo "Status: idle")
CURRENT_HASH=$(echo "$CURRENT_CONTEXT_PCT|$CURRENT_TASK" | sha256sum | cut -d' ' -f1)

# 2. Threshold-based write logic (avoid redundant writes)
CONTEXT_DELTA=5  # Write if context changes by >5%
WRITE_THRESHOLD=1  # Token value: 1 = always write on state change; 0 = conservative (only >10% delta)

CONTEXT_CHANGED=0
if [[ -n "$LAST_CONTEXT" ]] && [[ "$LAST_CONTEXT" != "0" ]]; then
  # Safe arithmetic: use awk for cross-platform compatibility
  DELTA=$(awk -v curr="$CURRENT_CONTEXT_PCT" -v last="$LAST_CONTEXT" 'BEGIN {d = curr - last; print (d < 0) ? -d : d}')
  if (( $(echo "$DELTA > $CONTEXT_DELTA" | bc -l 2>/dev/null) || [[ "$DELTA" -gt "$CONTEXT_DELTA" ]] )); then
    CONTEXT_CHANGED=1
  fi
fi

STATE_CHANGED=0
if [[ "$CURRENT_HASH" != "$LAST_HASH" ]]; then
  STATE_CHANGED=1
fi

# 3. Conditional writes (only if state changed AND above threshold)
if [[ $STATE_CHANGED -eq 1 ]] && [[ $CONTEXT_CHANGED -eq 1 || $WRITE_THRESHOLD -eq 1 ]]; then
  if [[ -z "$DRY_RUN" ]]; then
    # Update ACTIVE-TASK.md checkpoint
    CHECKPOINT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    sed -i '' "s/^**Last Updated:** .*/**Last Updated:** $CHECKPOINT_TIME AST/" "$ACTIVE_TASK" 2>/dev/null || true
    sed -i '' "s/- Context: .*/- Context: ~${CURRENT_CONTEXT_PCT}%/" "$ACTIVE_TASK" 2>/dev/null || true
    
    # Append to daily memory log
    cat >> "$MEMORY_FILE" << EOF
## Checkpoint ($(date '+%Y-%m-%d %H:%M:%S'))
- Context: ${CURRENT_CONTEXT_PCT}%
- Task State: $CURRENT_TASK
- Hash: $CURRENT_HASH (delta: state_changed=$STATE_CHANGED)

EOF
    
    echo "✅ Checkpoint written (context: ${CURRENT_CONTEXT_PCT}%, state_changed=$STATE_CHANGED)"
  else
    echo "[DRY-RUN] Would write checkpoint: context=${CURRENT_CONTEXT_PCT}%, state_changed=$STATE_CHANGED"
  fi
  
  # Update state file
  jq -n \
    --arg last_run "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    --arg last_hash "$CURRENT_HASH" \
    --arg last_context "$CURRENT_CONTEXT_PCT" \
    '{last_run: $last_run, last_context_hash: $last_hash, last_context: $last_context}' \
    > "$STATE_FILE"
else
  echo "⏭️  No-op: state unchanged (hash: $CURRENT_HASH = $LAST_HASH). Skipping write."
fi

# === OBSERVABILITY COUNTERS ===

COUNTER_FILE="$WORKSPACE/logs/checkpoint-counters.json"
mkdir -p "$(dirname "$COUNTER_FILE")"

if [[ ! -f "$COUNTER_FILE" ]]; then
  jq -n '{"total_runs": 0, "writes": 0, "skips": 0, "errors": 0}' > "$COUNTER_FILE"
fi

COUNTERS=$(cat "$COUNTER_FILE")
COUNTERS=$(echo "$COUNTERS" | jq ".total_runs += 1")
if [[ $STATE_CHANGED -eq 1 ]]; then
  COUNTERS=$(echo "$COUNTERS" | jq ".writes += 1")
else
  COUNTERS=$(echo "$COUNTERS" | jq ".skips += 1")
fi

echo "$COUNTERS" > "$COUNTER_FILE"

# Log summary
SUMMARY=$(echo "$COUNTERS" | jq -r '"\(.total_runs) runs | \(.writes) writes | \(.skips) skips"')
echo "📊 Scheduler stats: $SUMMARY"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Unified checkpoint complete" >> "$WORKSPACE/logs/checkpoint.log"

exit 0
