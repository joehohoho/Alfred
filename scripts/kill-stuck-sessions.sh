#!/bin/bash
# kill-stuck-sessions.sh
# Detect sessions stuck in "processing" state for >5 minutes and force-close them
# Logs all actions to audit.jsonl
# Called by sentinel.sh on unhealthy diagnostics

set -e

STUCK_THRESHOLD_SECONDS=300  # 5 minutes
WORKSPACE_DIR="$HOME/.openclaw/workspace"
AUDIT_LOG="$HOME/.openclaw/logs/audit.jsonl"

# Ensure audit log exists
mkdir -p "$(dirname "$AUDIT_LOG")"

# Helper: log to audit.jsonl
log_audit() {
    local level="$1"
    local message="$2"
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"level\":\"$level\",\"source\":\"kill-stuck-sessions\",\"message\":\"$message\"}" >> "$AUDIT_LOG"
}

# Get stuck sessions from gateway diagnostics
# Format: sessionId | state | ageSeconds
stuck_sessions=$(curl -s http://localhost:18789/api/diagnostics 2>/dev/null | jq -r '.sessions[] | select(.state == "processing" and .ageSeconds > '"$STUCK_THRESHOLD_SECONDS"') | "\(.sessionId)|\(.state)|\(.ageSeconds)"' 2>/dev/null || echo "")

if [[ -z "$stuck_sessions" ]]; then
    echo "[$(date +'%H:%M:%S')] No stuck sessions detected."
    exit 0
fi

while IFS='|' read -r session_id state age_seconds; do
    echo "[$(date +'%H:%M:%S')] 🔴 Stuck session detected: $session_id (state=$state, age=${age_seconds}s)"
    
    # Attempt to kill the session via gateway API
    kill_result=$(curl -s -X POST "http://localhost:18789/api/sessions/$session_id/kill" \
        -H "Content-Type: application/json" \
        -d '{"reason":"stuck_timeout"}' 2>/dev/null || echo "error")
    
    if [[ "$kill_result" == *"ok"* ]]; then
        echo "  ✅ Successfully killed session $session_id"
        log_audit "info" "Killed stuck session $session_id (age=${age_seconds}s)"
    else
        echo "  ⚠️  Kill attempt failed or timed out. Trying fallback..."
        # Fallback: try to restart gateway if kill fails (may help reset session state)
        log_audit "warn" "Failed to kill stuck session $session_id via API. Session remains."
    fi
done <<< "$stuck_sessions"

echo "[$(date +'%H:%M:%S')] Stuck session cleanup complete."
