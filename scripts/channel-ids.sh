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

echo "✅ Channel IDs loaded. Use \$DISCORD_DAILYCONFIG, \$DISCORD_GENERAL, etc." >&2
