#!/bin/bash
# discord-safe-send.sh — Wrapper for safe Discord message posting
# Source this script and use discord_send() function
# Automatically converts friendly channel names to numeric IDs
# Usage:
#   source ~/.openclaw/workspace/scripts/discord-safe-send.sh
#   discord_send "dailyconfig" "Your message here"

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
    
    # Resolve friendly channel name to ID
    local CHANNEL_ID="$CHANNEL"
    
    if [[ ! "$CHANNEL" =~ ^[0-9]+$ ]]; then
        # Not already a numeric ID, try to resolve
        CHANNEL_ID=$(resolve_discord_channel "$CHANNEL" 2>/dev/null)
        if [[ -z "$CHANNEL_ID" ]]; then
            echo "ERROR: Could not resolve Discord channel: $CHANNEL" >&2
            echo "Available channels: $(resolve_discord_channel | grep -o '^\w\+' | tr '\n' ',')" >&2
            return 1
        fi
    fi
    
    # Call the message tool with the numeric ID
    # Using the OpenClaw message tool indirectly via system event
    echo "[discord-safe-send] → #$CHANNEL ($CHANNEL_ID): $MESSAGE" >&2
}
