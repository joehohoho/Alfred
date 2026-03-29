#!/bin/bash
# agent-discord-post.sh
# Safe Discord posting helper for agents spawned by OpenClaw
# Automatically resolves friendly channel names to numeric IDs
# Usage: bash agent-discord-post.sh "channel_name" "Your message here"
# Example: bash agent-discord-post.sh "dailyconfig" "Update complete"

set -e

CHANNEL_INPUT="$1"
MESSAGE="$2"

if [[ -z "$CHANNEL_INPUT" || -z "$MESSAGE" ]]; then
    echo "ERROR: Usage: $0 <channel_name|id> \"<message>\"" >&2
    exit 1
fi

# Resolve the channel name to ID
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHANNEL_MAP_FILE="$SCRIPT_DIR/discord-channel-map.sh"

if [[ ! -f "$CHANNEL_MAP_FILE" ]]; then
    echo "ERROR: discord-channel-map.sh not found in $SCRIPT_DIR" >&2
    exit 1
fi

# Source the mapping functions
source "$CHANNEL_MAP_FILE"

# Try to resolve
CHANNEL_ID="$CHANNEL_INPUT"
if [[ ! "$CHANNEL_INPUT" =~ ^[0-9]+$ ]]; then
    # Not already a numeric ID, try to resolve friendly name
    RESOLVED=$(resolve_discord_channel "$CHANNEL_INPUT" 2>/dev/null || echo "")
    if [[ -n "$RESOLVED" ]]; then
        CHANNEL_ID="$RESOLVED"
    else
        echo "ERROR: Could not resolve Discord channel: $CHANNEL_INPUT" >&2
        echo "Available channels:"
        bash "$CHANNEL_MAP_FILE" list
        exit 1
    fi
fi

# Post to Discord using the message tool
# The message tool expects numeric channel IDs
echo "[agent] Posting to Discord channel: $CHANNEL_ID"
echo "Message: $MESSAGE"

# Call the message tool (available in OpenClaw agent context)
message action=send channel=discord target="$CHANNEL_ID" message="$MESSAGE"

echo "[agent] ✅ Discord post complete"
