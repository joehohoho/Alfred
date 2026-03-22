#!/bin/bash
# web-search-safe.sh
# Wrapper for web_search tool with exponential backoff and rate-limit handling
# Usage: web-search-safe.sh "query" [count]
# Returns: stdout from web_search tool (JSON)

set -e

QUERY="${1:?ERROR: query required}"
COUNT="${2:-5}"
MAX_RETRIES=3
INITIAL_DELAY=2

# Brave Search free tier: 1 req/min (60s), 2000 req/month
# This script implements exponential backoff: 2s, 4s, 8s

web_search_with_retry() {
    local query="$1"
    local count="$2"
    local attempt=0
    local delay=$INITIAL_DELAY

    while [ $attempt -lt $MAX_RETRIES ]; do
        attempt=$((attempt + 1))

        # Call web_search via session message (gateway tool interface)
        local result
        if result=$(sessions_send --message "web_search query=\"$query\" count=$count" --label "search-worker" --timeoutSeconds 30 2>&1); then
            # Check if response contains rate limit error
            if echo "$result" | grep -q "429\|rate.*limit\|RATE_LIMITED"; then
                echo "[attempt $attempt/$MAX_RETRIES] Rate limited. Waiting ${delay}s..." >&2
                sleep "$delay"
                delay=$((delay * 2))
                continue
            fi
            # Success
            echo "$result"
            return 0
        else
            echo "[attempt $attempt/$MAX_RETRIES] web_search failed: $result" >&2
            sleep "$delay"
            delay=$((delay * 2))
            continue
        fi
    done

    echo "ERROR: web_search exhausted $MAX_RETRIES attempts for query: $query" >&2
    return 1
}

# Main
web_search_with_retry "$QUERY" "$COUNT"
