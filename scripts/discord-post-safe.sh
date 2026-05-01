#!/bin/bash
# discord-post-safe.sh — Safe Discord posting wrapper
# Converts friendly channel names to numeric IDs before calling message tool
# Usage: bash discord-post-safe.sh "dailyconfig" "Your message"

set -euo pipefail

CHANNEL_NAME="${1:?Channel name required}"
MESSAGE="${2:?Message required}"

# Map friendly names to verified numeric Discord IDs
case "$CHANNEL_NAME" in
  dailyconfig|"#dailyconfig"|config-and-memory-review|"#config-and-memory-review")
    CHANNEL_ID="1476943999515496530"
    ;;
  general|"#general")
    CHANNEL_ID="1476571891043926036"
    ;;
  alerts|"#alerts")
    CHANNEL_ID="1476592867865657599"
    ;;
  devops|"#devops")
    CHANNEL_ID="1484566371412213934"
    ;;
  *)
    # Assume already numeric
    if [[ "$CHANNEL_NAME" =~ ^[0-9]+$ ]]; then
      CHANNEL_ID="$CHANNEL_NAME"
    else
      echo "❌ ERROR: Unknown Discord channel '$CHANNEL_NAME'" >&2
      exit 1
    fi
    ;;
esac

# Use jq to properly escape JSON
jq -n \
  --arg action "send" \
  --arg channel "discord" \
  --arg to "$CHANNEL_ID" \
  --arg message "$MESSAGE" \
  '{action: $action, channel: $channel, to: $to, message: $message}'
