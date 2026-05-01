#!/bin/bash
# channel-ids.sh — Verified Discord channel ID mapping
# Source this file in scripts that need to post to Discord
# Usage: source ~/.openclaw/workspace/scripts/channel-ids.sh
#        message(action=send, channel=discord, to="$DISCORD_DAILYCONFIG", ...)
#        CHANNEL_ID=$(resolve_discord_channel "dailyconfig")

# VERIFIED Discord Channel IDs (from active cron jobs + manual verification)
# `dailyconfig` is kept as a legacy alias for the current `config-and-memory-review` channel.
export DISCORD_DAILYCONFIG="1476943999515496530"           # #config-and-memory-review (legacy alias: #dailyconfig)
export DISCORD_CONFIG_AND_MEMORY_REVIEW="1476943999515496530"  # #config-and-memory-review
export DISCORD_GENERAL="1476571891043926036"               # #general
export DISCORD_ALERTS="1476592867865657599"                # #alerts
export DISCORD_DEVOPS="1484566371412213934"                # #devops

# Helper function to resolve channel name/ID to numeric ID
resolve_discord_channel() {
  local channel="${1:-}"

  if [[ -z "$channel" ]]; then
    echo ""
    return 1
  fi

  # Strip leading # if present
  channel="${channel#\#}"

  # Already a Discord snowflake/channel id
  if [[ "$channel" =~ ^[0-9]+$ ]]; then
    echo "$channel"
    return 0
  fi

  # Map friendly names to IDs
  case "$channel" in
    dailyconfig|config-and-memory-review) echo "$DISCORD_DAILYCONFIG" ;;
    general) echo "$DISCORD_GENERAL" ;;
    alerts) echo "$DISCORD_ALERTS" ;;
    devops) echo "$DISCORD_DEVOPS" ;;
    *)
      echo ""
      return 1
      ;;
  esac
}

# Keep sourcing silent so command substitution and wrapper scripts stay clean.
return 0 2>/dev/null || true
