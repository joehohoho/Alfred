#!/bin/bash
# run-with-ollama-backoff.sh - Wrapper for cron tasks that depend on ollama
# Usage: run-with-ollama-backoff.sh <max_retries> <initial_delay_min> <task_name> [task_command...]
# 
# Example:
#   run-with-ollama-backoff.sh 3 5 "evening-routine" bash /path/to/task.sh
#
# Exit codes:
#   0 = Task completed successfully
#   1 = Task deferred (ollama overwhelmed)
#   2 = Unrecoverable error

set -e

MAX_RETRIES=${1:-3}
INITIAL_DELAY_MIN=${2:-5}
TASK_NAME=${3:-"unknown"}
shift 3

# Source the health check
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/check-ollama-health.sh" 2>/dev/null || {
    echo "❌ Failed to load health check script"
    exit 2
}

# Global state file
STATE_DIR="${HOME}/.openclaw/workspace/memory"
mkdir -p "$STATE_DIR"
RETRY_FILE="${STATE_DIR}/.ollama-backoff-${TASK_NAME}"

get_retry_count() {
    if [ -f "$RETRY_FILE" ]; then
        cat "$RETRY_FILE"
    else
        echo 0
    fi
}

increment_retry() {
    local count=$(get_retry_count)
    echo $((count + 1)) > "$RETRY_FILE"
}

clear_retry() {
    rm -f "$RETRY_FILE"
}

# Main logic
echo "[ollama-backoff] Checking health for task: $TASK_NAME"

# Check ollama health
if bash "${SCRIPT_DIR}/check-ollama-health.sh" >/dev/null 2>&1; then
    echo "✅ ollama healthy - proceeding with task"
    clear_retry
    "$@"  # Execute the task
    exit 0
else
    # ollama is overwhelmed
    RETRY_COUNT=$(get_retry_count)
    
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        increment_retry
        DELAY_MIN=$((INITIAL_DELAY_MIN * (2 ** RETRY_COUNT)))  # Exponential backoff
        echo "⏳ ollama overwhelmed (retry $RETRY_COUNT/$MAX_RETRIES) - deferring $TASK_NAME for ${DELAY_MIN} minutes"
        exit 1
    else
        echo "❌ ollama still overwhelmed after $MAX_RETRIES retries - giving up"
        clear_retry
        exit 2
    fi
fi
