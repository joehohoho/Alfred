#!/bin/bash
# web-search-queue.sh
# Manages a queue of web_search requests with rate-limiting (1 req per 61s for Brave Free tier)
# Usage: web-search-queue.sh add|process|status
#
# Design:
#   - add: Enqueue a search request with timestamp
#   - process: Check queue, execute next ready request, update state
#   - status: Show queue depth and next execution time
#
# Implementation:
#   - Queue stored in ~/.openclaw/workspace/.search-queue.jsonl (append-only)
#   - Last execution time stored in ~/.openclaw/workspace/.search-queue.state
#   - Rate limit: 61 seconds between requests (Brave Free tier = 1 req/min)

set -e

QUEUE_DIR="$HOME/.openclaw/workspace"
QUEUE_FILE="$QUEUE_DIR/.search-queue.jsonl"
STATE_FILE="$QUEUE_DIR/.search-queue.state"
RATE_LIMIT_SECONDS=61

# Ensure queue file exists
mkdir -p "$QUEUE_DIR"
touch "$QUEUE_FILE"

# Initialize state if missing
if [ ! -f "$STATE_FILE" ]; then
    echo '{"last_execution": 0, "request_count": 0}' > "$STATE_FILE"
fi

get_state() {
    cat "$STATE_FILE"
}

set_state() {
    local last_exec=$1
    local req_count=$2
    echo "{\"last_execution\": $last_exec, \"request_count\": $req_count}" > "$STATE_FILE"
}

queue_add() {
    local query="$1"
    local count="${2:-5}"
    local timestamp=$(date +%s)
    local id=$(uuidgen | tr '[:upper:]' '[:lower:]' | head -c 8)

    # Append to queue (JSONL format: one request per line)
    echo "{\"id\":\"$id\",\"query\":\"$query\",\"count\":$count,\"enqueued_at\":$timestamp,\"executed_at\":null}" >> "$QUEUE_FILE"
    echo "[+] Queued search #$id: '$query' (count=$count)" >&2
    return 0
}

queue_process() {
    local state=$(get_state)
    local last_exec=$(echo "$state" | grep -o '"last_execution":[0-9]*' | cut -d: -f2)
    local req_count=$(echo "$state" | grep -o '"request_count":[0-9]*' | cut -d: -f2)
    local now=$(date +%s)
    local time_since_last=$((now - last_exec))

    # Check if rate limit allows execution
    if [ $time_since_last -lt $RATE_LIMIT_SECONDS ]; then
        local wait_time=$((RATE_LIMIT_SECONDS - time_since_last))
        echo "[⏳] Rate limit: next request available in ${wait_time}s (last: ${time_since_last}s ago)" >&2
        return 1
    fi

    # Find first unexecuted request in queue
    local next_request=$(grep '"executed_at":null' "$QUEUE_FILE" | head -1)
    
    if [ -z "$next_request" ]; then
        echo "[✓] Queue empty" >&2
        return 0
    fi

    # Extract request fields
    local req_id=$(echo "$next_request" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    local req_query=$(echo "$next_request" | grep -o '"query":"[^"]*"' | cut -d'"' -f4)
    local req_count=$(echo "$next_request" | grep -o '"count":[0-9]*' | cut -d: -f2)

    echo "[→] Executing search #$req_id: '$req_query' (count=$req_count)..." >&2

    # Execute web_search (this will output result or error to stdout)
    # Note: This runs in the current session context; actual execution depends on OpenClaw's tool routing
    echo "SEARCH_REQUEST: id=$req_id query=$req_query count=$req_count" >&2

    # Update queue file: mark this request as executed
    local new_queue=$(mktemp)
    while IFS= read -r line; do
        if echo "$line" | grep -q "\"id\":\"$req_id\""; then
            echo "$line" | sed "s/\"executed_at\":null/\"executed_at\":$now/" >> "$new_queue"
        else
            echo "$line" >> "$new_queue"
        fi
    done < "$QUEUE_FILE"
    mv "$new_queue" "$QUEUE_FILE"

    # Update state
    req_count=$((req_count + 1))
    set_state "$now" "$req_count"

    echo "[✓] Marked #$req_id as executed. Total requests processed: $req_count" >&2
    return 0
}

queue_status() {
    local state=$(get_state)
    local last_exec=$(echo "$state" | grep -oE '"last_execution":\s*[0-9]+' | grep -oE '[0-9]+' || echo 0)
    local req_count=$(echo "$state" | grep -oE '"request_count":\s*[0-9]+' | grep -oE '[0-9]+' || echo 0)
    local now=$(date +%s)
    local pending=$(grep -c '"executed_at":null' "$QUEUE_FILE" || echo 0)

    echo "=== Web Search Queue Status ===" >&2
    echo "Total requests processed: $req_count" >&2
    echo "Pending requests: $pending" >&2

    if [ "$last_exec" -eq 0 ]; then
        echo "Last execution: never (ready now)" >&2
    else
        local time_since=$((now - last_exec))
        echo "Last execution: ${time_since}s ago" >&2
        if [ $time_since -lt $RATE_LIMIT_SECONDS ]; then
            local wait=$((RATE_LIMIT_SECONDS - time_since))
            echo "Next execution: in ${wait}s" >&2
        else
            echo "Next execution: ready now" >&2
        fi
    fi

    return 0
}

# Main
case "${1:-status}" in
    add)
        queue_add "$2" "$3"
        ;;
    process)
        queue_process
        ;;
    status)
        queue_status
        ;;
    *)
        echo "Usage: web-search-queue.sh {add|process|status} [query] [count]" >&2
        exit 1
        ;;
esac
