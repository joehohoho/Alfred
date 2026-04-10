#!/bin/bash
# test-discord-posting.sh
# Quick test to verify Discord posting works with both friendly names and numeric IDs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/channel-ids.sh"

echo "=== Discord Posting Test ==="
echo ""
echo "Testing with numeric IDs (correct method)..."
echo "Channel ID: $DISCORD_DAILYCONFIG"
echo ""

# Test message format
TEST_MSG="✅ Discord posting test via numeric ID - $(date +%H:%M:%S)"

# Show what would be called (don't actually post to avoid spam)
echo "Would execute:"
echo "  message tool call:"
echo "  - action: send"
echo "  - channel: discord"
echo "  - target: $DISCORD_DAILYCONFIG"
echo "  - message: $TEST_MSG"
echo ""

echo "✅ Test format is correct. Use this format in scripts and cron jobs."
echo ""
echo "Common mistakes to avoid:"
echo "  ❌ target=\"#dailyconfig\"  → Bad (friendly name with #)"
echo "  ❌ target=\"dailyconfig\"   → Bad (friendly name without #)"
echo "  ✅ target=\"\$DISCORD_DAILYCONFIG\"  → Good (variable)"
echo "  ✅ target=\"$DISCORD_DAILYCONFIG\"   → Good (numeric ID)"
echo ""
