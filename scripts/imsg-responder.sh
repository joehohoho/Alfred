#!/bin/bash
# imsg-responder.sh - Event-driven iMessage responder daemon
# Replaces the every-5-min cron polling job.
# Uses imsg watch (event-driven) with polling fallback.
# Only invokes Ollama when there's actually a new inbound message.

set -o pipefail

PARTICIPANT="+1-506-227-9553"
CHAT_ID=1
TRACKER="$HOME/.openclaw/workspace/memory/imsg-last-seen.json"
OLLAMA_URL="http://127.0.0.1:11434"
MODEL="llama3.2:1b"
LOG_DIR="$HOME/.openclaw/logs"
LOG="$LOG_DIR/imsg-responder.log"
POLL_INTERVAL=30
MAX_LOG_BYTES=1048576  # 1MB log rotation

SYSTEM_PROMPT="You are Alfred, a friendly AI assistant. Reply briefly (1-2 sentences max) in a casual, warm tone. Be helpful but concise."

mkdir -p "$LOG_DIR"
mkdir -p "$(dirname "$TRACKER")"
[ ! -f "$TRACKER" ] && echo '{"lastId": 0}' > "$TRACKER"

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1" >> "$LOG"
    # Rotate log if too large
    if [ -f "$LOG" ] && [ "$(stat -f%z "$LOG" 2>/dev/null || echo 0)" -gt "$MAX_LOG_BYTES" ]; then
        mv "$LOG" "$LOG.old"
    fi
}

get_last_id() {
    jq -r '.lastId // 0' "$TRACKER" 2>/dev/null || echo 0
}

save_last_id() {
    echo "{\"lastId\": $1}" > "$TRACKER"
}

json_escape() {
    python3 -c "import json,sys; print(json.dumps(sys.stdin.read().strip()))" <<< "$1"
}

generate_response() {
    local text="$1"
    local escaped_text
    escaped_text=$(json_escape "$text")
    local escaped_system
    escaped_system=$(json_escape "$SYSTEM_PROMPT")

    local result
    result=$(curl -s --max-time 60 "$OLLAMA_URL/api/chat" \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"$MODEL\",
            \"messages\": [
                {\"role\": \"system\", \"content\": $escaped_system},
                {\"role\": \"user\", \"content\": $escaped_text}
            ],
            \"stream\": false,
            \"keep_alive\": \"30s\"
        }" 2>/dev/null)

    if [ $? -ne 0 ] || [ -z "$result" ]; then
        log "ERROR: Ollama API call failed"
        return 1
    fi

    echo "$result" | jq -r '.message.content // empty' 2>/dev/null
}

process_message() {
    local json="$1"

    local msg_id is_from_me text
    msg_id=$(echo "$json" | jq -r '.id // 0' 2>/dev/null)
    is_from_me=$(echo "$json" | jq -r '.is_from_me // true' 2>/dev/null)
    text=$(echo "$json" | jq -r '.text // ""' 2>/dev/null)

    local last_id
    last_id=$(get_last_id)

    # Skip if not a new inbound message
    if [ "$is_from_me" != "false" ] || [ -z "$text" ] || [ "$msg_id" -le "$last_id" ] 2>/dev/null; then
        return 0
    fi

    log "INFO: New message (id=$msg_id): $text"

    # Check if Ollama is reachable
    if ! curl -s --max-time 3 "$OLLAMA_URL/api/tags" > /dev/null 2>&1; then
        log "ERROR: Ollama not reachable, skipping response"
        save_last_id "$msg_id"
        return 1
    fi

    local response
    response=$(generate_response "$text")

    if [ -n "$response" ]; then
        imsg send --to "$PARTICIPANT" --text "$response" 2>/dev/null
        log "INFO: Sent reply: $response"
    else
        log "WARN: Empty response from Ollama, no reply sent"
    fi

    save_last_id "$msg_id"
}

# Event-driven mode using imsg watch
watch_mode() {
    log "INFO: Starting event-driven mode (imsg watch)"
    imsg watch --json --chat-id "$CHAT_ID" --debounce 500ms 2>/dev/null | while IFS= read -r line; do
        [ -z "$line" ] && continue
        process_message "$line"
    done
    # If we get here, watch mode exited (probably permission error)
    return 1
}

# Polling fallback mode
poll_mode() {
    log "INFO: Starting polling mode (every ${POLL_INTERVAL}s)"
    while true; do
        local latest
        latest=$(imsg history --chat-id "$CHAT_ID" --limit 1 --json 2>/dev/null)
        if [ -n "$latest" ]; then
            process_message "$latest"
        fi
        sleep "$POLL_INTERVAL"
    done
}

# Cleanup on exit
cleanup() {
    log "INFO: iMessage responder shutting down (PID $$)"
    exit 0
}
trap cleanup SIGTERM SIGINT

# Prevent duplicate instances
PIDFILE="/tmp/imsg-responder.pid"
if [ -f "$PIDFILE" ]; then
    old_pid=$(cat "$PIDFILE" 2>/dev/null)
    if kill -0 "$old_pid" 2>/dev/null; then
        log "WARN: Already running (PID $old_pid), exiting"
        exit 0
    fi
fi
echo $$ > "$PIDFILE"

log "INFO: iMessage responder starting (PID $$)"

# Try watch mode first, fall back to polling
watch_mode || poll_mode
