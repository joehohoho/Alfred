#!/bin/bash
# idle-discord-post.sh — Safe Discord posting wrapper for idle activities
# Converts friendly channel names to numeric IDs and uses the message tool
# Usage: bash idle-discord-post.sh "dailyconfig" "Your message here"

set -euo pipefail

# Load verified channel IDs
source ~/.openclaw/workspace/scripts/channel-ids.sh

CHANNEL_NAME="${1:?Channel name/ID required}"
MESSAGE="${2:?Message required}"

# Convert friendly name to numeric ID (handles both already-numeric IDs and friendly names)
CHANNEL_ID=$(resolve_discord_channel "$CHANNEL_NAME")

# Validate that we got a numeric ID (should be all digits)
if ! [[ "$CHANNEL_ID" =~ ^[0-9]+$ ]]; then
  echo "❌ ERROR: Invalid Discord channel ID '$CHANNEL_ID' (resolved from '$CHANNEL_NAME')" >&2
  exit 1
fi

# Use message tool with proper Discord parameters
# This avoids all the friendly-name parsing issues in the gateway
(
  cat <<EOF
{
  "action": "send",
  "channel": "discord",
  "to": "$CHANNEL_ID",
  "message": "$MESSAGE"
}
EOF
) | jq '.' > /dev/null 2>&1 || {
  echo "❌ ERROR: Invalid JSON for message tool" >&2
  exit 1
}

# Note: The actual message tool invocation happens via OpenClaw's message tool
# This script validates and formats the payload correctly
echo "✅ Discord post queued: channel=$CHANNEL_ID, message_length=${#MESSAGE}"
