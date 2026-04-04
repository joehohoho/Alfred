#!/bin/bash
# web-search-guard.sh
# Prevents Brave Search API rate-limit 429 errors by enforcing a backoff after limit hits
# Usage: web-search-guard.sh check|reset
#
# Design:
#   - Stores last 429 error timestamp
#   - On check: blocks searches for 90 seconds after last error
#   - On reset: clears the guard (manual reset after cooldown)
#
# Integration:
#   - Before calling web_search: run `bash web-search-guard.sh check`
#   - If it returns 1, skip the search and retry later
#   - On 429 error response: automatically update guard via gateway plugin

set -e

GUARD_FILE="$HOME/.openclaw/workspace/.search-guard.state"
COOLDOWN_SECONDS=90

# Ensure guard file exists
if [ ! -f "$GUARD_FILE" ]; then
    echo '{"last_429_at": 0}' > "$GUARD_FILE"
fi

check_guard() {
    local state=$(cat "$GUARD_FILE")
    local last_429=$(echo "$state" | jq -r '.last_429_at // 0' 2>/dev/null || echo 0)
    local now=$(date +%s)
    local elapsed=$((now - last_429))

    if [ "$elapsed" -lt "$COOLDOWN_SECONDS" ]; then
        local wait=$((COOLDOWN_SECONDS - elapsed))
        echo "[GUARD-ACTIVE] Rate limit cooldown active for ${wait}s. Skip web_search requests." >&2
        return 1  # Guard is active, skip search
    else
        echo "[GUARD-CLEAR] Cooldown expired. Searches allowed." >&2
        return 0  # Guard expired, searches allowed
    fi
}

set_guard() {
    local now=$(date +%s)
    echo "{\"last_429_at\": $now}" > "$GUARD_FILE"
    echo "[GUARD-SET] Rate limit 429 error logged. Cooldown starts (${COOLDOWN_SECONDS}s)." >&2
}

reset_guard() {
    echo '{"last_429_at": 0}' > "$GUARD_FILE"
    echo "[GUARD-RESET] Manual reset complete. Searches allowed." >&2
}

# Main
case "${1:-check}" in
    check)
        check_guard
        ;;
    set)
        set_guard
        ;;
    reset)
        reset_guard
        ;;
    *)
        echo "Usage: web-search-guard.sh {check|set|reset}" >&2
        exit 1
        ;;
esac
