#!/bin/bash
# web-search-quota-check.sh
# Monitor Brave Search API quota and alert when approaching limit
# Tracks daily usage and prevents quota exhaustion
# Usage: bash scripts/web-search-quota-check.sh [--reset-daily]

set -e

QUOTA_LOG="$HOME/.openclaw/workspace/.web-search-quota.json"
QUOTA_LIMIT=2000  # Brave free tier monthly limit
DAILY_SAFE_LIMIT=30  # Conservative daily limit (leaves buffer for emergencies)
ALERT_THRESHOLD_PCT=80  # Alert when 80% of daily limit consumed

# Helper: init quota file if not exists
init_quota_log() {
    if [ ! -f "$QUOTA_LOG" ]; then
        cat > "$QUOTA_LOG" <<EOF
{
  "month_year": "$(date +%Y-%m)",
  "monthly_total": 0,
  "daily_total": 0,
  "last_date": "$(date +%Y-%m-%d)",
  "requests": []
}
EOF
    fi
}

# Helper: reset daily counter if date changed
reset_daily_if_needed() {
    local last_date=$(jq -r '.last_date' "$QUOTA_LOG")
    local today=$(date +%Y-%m-%d)
    
    if [ "$last_date" != "$today" ]; then
        jq ".daily_total = 0 | .last_date = \"$today\" | .requests = []" "$QUOTA_LOG" > "$QUOTA_LOG.tmp"
        mv "$QUOTA_LOG.tmp" "$QUOTA_LOG"
    fi
}

# Helper: log a search request
log_request() {
    local query="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    init_quota_log
    reset_daily_if_needed
    
    # Increment counters
    jq ".daily_total += 1 | .monthly_total += 1 | .requests += [{\"timestamp\": \"$timestamp\", \"query\": \"$query\"}]" "$QUOTA_LOG" > "$QUOTA_LOG.tmp"
    mv "$QUOTA_LOG.tmp" "$QUOTA_LOG"
}

# Helper: get current usage
get_usage() {
    init_quota_log
    reset_daily_if_needed
    
    local daily=$(jq -r '.daily_total' "$QUOTA_LOG")
    local monthly=$(jq -r '.monthly_total' "$QUOTA_LOG")
    
    echo "{\"daily\": $daily, \"monthly\": $monthly, \"daily_limit\": $DAILY_SAFE_LIMIT, \"monthly_limit\": $QUOTA_LIMIT}"
}

# Main: check quota before allowing search
can_search() {
    local usage=$(get_usage)
    local daily=$(echo "$usage" | jq -r '.daily')
    local monthly=$(echo "$usage" | jq -r '.monthly')
    
    # Check monthly limit (hard cap)
    if [ "$monthly" -ge "$QUOTA_LIMIT" ]; then
        echo "QUOTA_EXHAUSTED: Monthly limit ($QUOTA_LIMIT) reached. Searches blocked until reset."
        return 1
    fi
    
    # Check daily limit (soft cap with warning)
    if [ "$daily" -ge "$DAILY_SAFE_LIMIT" ]; then
        local pct=$((daily * 100 / DAILY_SAFE_LIMIT))
        echo "QUOTA_WARNING: Daily limit ($DAILY_SAFE_LIMIT) at ${pct}%. Remaining searches disabled. Reset at UTC midnight."
        return 1
    fi
    
    # Check alert threshold
    if [ "$daily" -gt 0 ]; then
        local pct=$((daily * 100 / DAILY_SAFE_LIMIT))
        if [ "$pct" -ge "$ALERT_THRESHOLD_PCT" ]; then
            echo "QUOTA_ALERT: Daily usage at ${pct}% ($daily/$DAILY_SAFE_LIMIT). Approaching limit."
        fi
    fi
    
    return 0
}

# Main: show status
show_status() {
    init_quota_log
    reset_daily_if_needed
    
    local usage=$(get_usage)
    local daily=$(echo "$usage" | jq -r '.daily')
    local monthly=$(echo "$usage" | jq -r '.monthly')
    local daily_limit=$(echo "$usage" | jq -r '.daily_limit')
    local monthly_limit=$(echo "$usage" | jq -r '.monthly_limit')
    
    local daily_pct=$((daily * 100 / daily_limit))
    local monthly_pct=$((monthly * 100 / monthly_limit))
    
    echo "Brave Search API Quota Status:"
    echo "  Daily:   $daily / $daily_limit ($daily_pct%)"
    echo "  Monthly: $monthly / $monthly_limit ($monthly_pct%)"
    echo "  Status:  $([ "$daily" -ge "$DAILY_SAFE_LIMIT" ] && echo "🔴 LIMIT REACHED" || echo "🟢 OK")"
}

# Parse arguments
case "${1:-status}" in
    log)
        log_request "${2:?query required}"
        ;;
    can-search)
        can_search
        ;;
    status|--status|-s)
        show_status
        ;;
    reset-daily|--reset-daily)
        jq ".daily_total = 0 | .requests = []" "$QUOTA_LOG" > "$QUOTA_LOG.tmp"
        mv "$QUOTA_LOG.tmp" "$QUOTA_LOG"
        echo "Daily quota reset."
        show_status
        ;;
    *)
        echo "Usage: web-search-quota-check.sh [log|can-search|status|reset-daily]"
        exit 1
        ;;
esac
