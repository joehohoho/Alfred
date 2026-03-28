#!/bin/bash
# discord-send.sh - Safe Discord message sender with automatic channel ID resolution
# Usage: bash discord-send.sh <channel_name_or_id> "<message>"
# Example: bash discord-send.sh "dailyconfig" "Daily update complete"

set -e

COMMAND="$1"

# Load the channel mapping
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/discord-channel-map.sh"

# Handle list command
if [[ "$COMMAND" == "list" ]]; then
    bash "$SCRIPT_DIR/discord-channel-map.sh" list
    exit 0
fi

CHANNEL_NAME_OR_ID="$1"
MESSAGE="$2"

if [[ -z "$CHANNEL_NAME_OR_ID" || -z "$MESSAGE" ]]; then
    echo "ERROR: Usage: $0 <channel_name_or_id> \"<message>\"" >&2
    echo "       Or: $0 list" >&2
    exit 1
fi

# Try to resolve the channel name
RESOLVED_ID=""
if [[ "$CHANNEL_NAME_OR_ID" =~ ^[0-9]+$ ]]; then
    # Already a numeric ID
    RESOLVED_ID="$CHANNEL_NAME_OR_ID"
else
    # Try to resolve friendly name
    RESOLVED_ID=$(resolve_discord_channel "$CHANNEL_NAME_OR_ID" 2>/dev/null || echo "")
    if [[ -z "$RESOLVED_ID" ]]; then
        echo "ERROR: Could not resolve Discord channel '$CHANNEL_NAME_OR_ID'. Check discord-channel-map.sh." >&2
        exit 1
    fi
fi

# Send the message using the message tool
# Note: This assumes message tool is available in the OpenClaw context
if command -v message &> /dev/null || [[ -n "$OPENCLAW_AVAILABLE" ]]; then
    message action=send channel=discord target="$RESOLVED_ID" message="$MESSAGE"
else
    echo "ERROR: OpenClaw message tool not available. Run this from within an OpenClaw session." >&2
    exit 1
fi
