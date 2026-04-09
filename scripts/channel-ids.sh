#!/bin/bash
# channel-ids.sh — Verified Discord channel ID mapping
# Source this file in scripts that need to post to Discord
# Usage: source ~/.openclaw/workspace/scripts/channel-ids.sh
#        message(action=send, channel=discord, to="$DISCORD_DAILYCONFIG", ...)

# VERIFIED Discord Channel IDs (from active cron jobs + manual verification)
export DISCORD_DAILYCONFIG="1476598143016505446"           # #dailyconfig
export DISCORD_GENERAL="1476571891043926036"               # #general  
export DISCORD_ALERTS="1476592867865657599"                # #alerts
export DISCORD_DEVOPS="1484566371412213934"                # #devops

# Helper function to resolve channel name/ID to numeric ID
resolve_discord_channel() {
  local channel="$1"
  # Strip leading # if present
  channel="${channel#\#}"
  # Map friendly names to IDs
  case "$channel" in
    dailyconfig) echo "1476598143016505446" ;;
    general) echo "1476571891043926036" ;;
    alerts) echo "1476592867865657599" ;;
    devops) echo "1484566371412213934" ;;
    *) echo "$channel" ;;  # Assume it's already a numeric ID
  esac
}

echo "✅ Channel IDs loaded. Use \$DISCORD_DAILYCONFIG, \$DISCORD_GENERAL, etc., or call resolve_discord_channel() for friendly names." >&2
