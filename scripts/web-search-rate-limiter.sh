#!/bin/bash
# web-search-rate-limiter.sh
# Enforce 1 search per minute (Brave free tier limit)
# Usage: bash scripts/web-search-rate-limiter.sh <query> [options...]

set -e

RATE_LIMIT_LOG="$HOME/.openclaw/workspace/.web-search-rate-limit.json"
RATE_LIMIT_PER_MINUTE=1
RATE_WINDOW_SECONDS=60

# Init log file
init_rate_log() {
    if [ ! -f "$RATE_LIMIT_LOG" ]; then
        echo '{"last_search_unix": 0, "queue": []}' > "$RATE_LIMIT_LOG"
    fi
}

# Get time elapsed since last search
get_time_since_last_search() {
    init_rate_log
    local last_unix=$(jq -r '.last_search_unix' "$RATE_LIMIT_LOG")
    local now_unix=$(date +%s)
    echo $((now_unix - last_unix))
}

# Record a search
record_search() {
    local now_unix=$(date +%s)
    jq ".last_search_unix = $now_unix" "$RATE_LIMIT_LOG" > "$RATE_LIMIT_LOG.tmp"
    mv "$RATE_LIMIT_LOG.tmp" "$RATE_LIMIT_LOG"
}

# Wait if needed to respect rate limit
enforce_rate_limit() {
    local time_since=$(get_time_since_last_search)
    
    if [ "$time_since" -lt "$RATE_WINDOW_SECONDS" ]; then
        local wait_seconds=$((RATE_WINDOW_SECONDS - time_since))
        echo "[web-search-rate-limiter] Rate limit: waiting ${wait_seconds}s before next search" >&2
        sleep "$wait_seconds"
    fi
}

# Main
query="${1:?query required}"
shift || true

# Enforce rate limit
enforce_rate_limit

# Record this search
record_search

# Execute the search via OpenClaw tool
# Pass through all arguments to the web_search tool
web_search_result=$(web_search --query "$query" "$@" 2>&1) || {
    echo "[web-search-rate-limiter] Search failed: $web_search_result" >&2
    exit 1
}

echo "$web_search_result"
