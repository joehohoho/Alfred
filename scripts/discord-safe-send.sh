#!/bin/bash
# discord-safe-send.sh — Wrapper for safe Discord message posting
# Source this script and use discord_send() function
# Automatically converts friendly channel names to numeric IDs
# Usage:
#   source ~/.openclaw/workspace/scripts/discord-safe-send.sh
#   discord_send "dailyconfig" "Your message here"  # legacy alias → config-and-memory-review
#   discord_send "config-and-memory-review" "Your message here"

# Source channel ID mappings
source ~/.openclaw/workspace/scripts/channel-ids.sh 2>/dev/null || {
    echo "ERROR: Could not load channel-ids.sh" >&2
    return 1
}

# Send a message safely to Discord with automatic channel name resolution
discord_send() {
    local CHANNEL="$1"
    local MESSAGE="$2"

    if [[ -z "$CHANNEL" || -z "$MESSAGE" ]]; then
        echo "ERROR: discord_send requires channel and message" >&2
        echo "Usage: discord_send \"channel_name\" \"message\"" >&2
        return 1
    fi

    local CHANNEL_ID
    CHANNEL_ID=$(resolve_discord_channel "$CHANNEL" 2>/dev/null || true)
    if [[ -z "$CHANNEL_ID" ]]; then
        echo "ERROR: Could not resolve Discord channel: $CHANNEL" >&2
        echo "Available channels: dailyconfig, config-and-memory-review, general, alerts, devops" >&2
        return 1
    fi

    # Return a clean JSON payload that callers can hand to the message tool.
    jq -cn \
      --arg action "send" \
      --arg channel "discord" \
      --arg to "$CHANNEL_ID" \
      --arg message "$MESSAGE" \
      '{action: $action, channel: $channel, to: $to, message: $message}'
}
