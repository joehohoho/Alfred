#!/bin/bash
# web-search-rate-limiter.sh
# Enforce 1 search per minute (Brave free tier limit) + exponential backoff on 429 errors
# Usage: bash scripts/web-search-rate-limiter.sh <query> [options...]

set -e

RATE_LIMIT_LOG="$HOME/.openclaw/workspace/.web-search-rate-limit.json"
RATE_LIMIT_PER_MINUTE=1
RATE_WINDOW_SECONDS=60
MAX_RETRIES=3
INITIAL_BACKOFF=2
MAX_BACKOFF=30

# Init log file
init_rate_log() {
    if [ ! -f "$RATE_LIMIT_LOG" ]; then
        echo '{"last_search_unix": 0, "queue": [], "last_429_unix": 0}' > "$RATE_LIMIT_LOG"
    fi
}

# Get time elapsed since last search
get_time_since_last_search() {
    init_rate_log
    local last_unix=$(jq -r '.last_search_unix' "$RATE_LIMIT_LOG")
    local now_unix=$(date +%s)
    echo $((now_unix - last_unix))
}

# Get time since last 429 error
get_time_since_last_429() {
    init_rate_log
    local last_429_unix=$(jq -r '.last_429_unix // 0' "$RATE_LIMIT_LOG")
    local now_unix=$(date +%s)
    echo $((now_unix - last_429_unix))
}

# Record a search
record_search() {
    local now_unix=$(date +%s)
    jq ".last_search_unix = $now_unix" "$RATE_LIMIT_LOG" > "$RATE_LIMIT_LOG.tmp"
    mv "$RATE_LIMIT_LOG.tmp" "$RATE_LIMIT_LOG"
}

# Record a 429 error
record_429() {
    local now_unix=$(date +%s)
    jq ".last_429_unix = $now_unix" "$RATE_LIMIT_LOG" > "$RATE_LIMIT_LOG.tmp"
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

# Check if we should back off after recent 429
backoff_if_needed() {
    local time_since_429=$(get_time_since_last_429)
    
    # If we had a 429 recently, wait a bit longer before trying again
    if [ "$time_since_429" -lt 60 ]; then
        local wait_seconds=$((60 - time_since_429))
        echo "[web-search-rate-limiter] 429 backoff: waiting ${wait_seconds}s before retry" >&2
        sleep "$wait_seconds"
    fi
}

# Execute search with exponential backoff on 429
execute_search_with_retry() {
    local query="$1"
    shift || true
    local attempt=1
    local backoff=$INITIAL_BACKOFF
    
    while [ "$attempt" -le "$MAX_RETRIES" ]; do
        echo "[web-search-rate-limiter] Attempt $attempt/$MAX_RETRIES..." >&2
        
        # Execute the search via OpenClaw tool
        web_search_result=$(web_search --query "$query" "$@" 2>&1) || {
            local exit_code=$?
            
            # Check if it's a 429 error
            if echo "$web_search_result" | grep -q "429"; then
                record_429
                
                if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                    local wait=$((backoff < MAX_BACKOFF ? backoff : MAX_BACKOFF))
                    echo "[web-search-rate-limiter] Hit 429 (rate limited). Backing off ${wait}s..." >&2
                    sleep "$wait"
                    backoff=$((backoff * 2))
                    attempt=$((attempt + 1))
                    continue
                else
                    echo "[web-search-rate-limiter] Max retries exhausted after 429 errors" >&2
                    echo "$web_search_result" >&2
                    return 1
                fi
            else
                # Other error, don't retry
                echo "[web-search-rate-limiter] Search failed (non-429): $web_search_result" >&2
                return "$exit_code"
            fi
        }
        
        # Success
        echo "$web_search_result"
        return 0
    done
    
    echo "[web-search-rate-limiter] Unexpectedly exhausted retries" >&2
    return 1
}

# Main
query="${1:?query required}"
shift || true

# Enforce rate limit
enforce_rate_limit

# Check for recent 429s and back off if needed
backoff_if_needed

# Record this search
record_search

# Execute with retry on 429
execute_search_with_retry "$query" "$@"
