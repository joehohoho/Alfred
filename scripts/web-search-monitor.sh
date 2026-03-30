#!/bin/bash
# web-search-monitor.sh
# Monitors web_search rate-limit events and quota usage from gateway logs
# Runs as a monitor job (every 6 hours) to check for exhausted quota
# Outputs: audit log entries + alerts when quota is low

set -e

GATEWAY_ERR_LOG="${1:~/.openclaw/logs/gateway.err.log}"
AUDIT_LOG="$HOME/.openclaw/logs/audit.jsonl"

# Extract the most recent web_search rate-limit event from gateway logs
latest_rate_limit() {
    tail -200 "$GATEWAY_ERR_LOG" 2>/dev/null | grep -i "web_search.*429\|web_search.*rate.*limit" | tail -1 || echo ""
}

# Parse quota info from error response (macOS-compatible)
parse_quota() {
    local line="$1"
    # Look for: "quota_limit":2000,"quota_current":171
    local quota_limit=$(echo "$line" | sed -E 's/.*"quota_limit":([0-9]+).*/\1/' | head -1)
    local quota_current=$(echo "$line" | sed -E 's/.*"quota_current":([0-9]+).*/\1/' | head -1)
    
    # Validate parsing (if sed didn't match, value will contain the original string)
    if ! [[ "$quota_limit" =~ ^[0-9]+$ ]]; then quota_limit="0"; fi
    if ! [[ "$quota_current" =~ ^[0-9]+$ ]]; then quota_current="0"; fi
    
    echo "$quota_limit:$quota_current"
}

# Log to audit log
log_audit() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local json="{\"timestamp\":\"$timestamp\",\"level\":\"$level\",\"component\":\"web-search-monitor\",\"message\":\"$message\"}"
    echo "$json" >> "$AUDIT_LOG"
}

# Main
latest=$(latest_rate_limit)

if [ -z "$latest" ]; then
    echo "[web-search-monitor] No rate-limit events found in last 200 lines. Quota appears OK."
    exit 0
fi

quota=$(parse_quota "$latest")
limit=$(echo "$quota" | cut -d: -f1)
current=$(echo "$quota" | cut -d: -f2)

if [ "$limit" -eq 0 ] || [ "$current" -eq 0 ]; then
    echo "[web-search-monitor] Could not parse quota. Raw event: $latest"
    exit 0
fi

remaining=$((limit - current))
pct_used=$((current * 100 / limit))

echo "[web-search-monitor] Quota: $current/$limit used ($pct_used%), $remaining remaining"

# Alert thresholds
if [ $remaining -le 10 ]; then
    log_audit "error" "Web search quota exhausted: $remaining/$limit remaining. Disable web_search calls or request new API key."
    echo "ALERT: Web search quota critically low ($remaining remaining). Contact administrator."
elif [ $pct_used -ge 90 ]; then
    log_audit "warn" "Web search quota nearing limit: $current/$limit used ($pct_used%)"
    echo "WARNING: Web search quota at $pct_used% usage."
elif [ $pct_used -ge 70 ]; then
    log_audit "info" "Web search quota monitor: $current/$limit used ($pct_used%)"
fi

exit 0
