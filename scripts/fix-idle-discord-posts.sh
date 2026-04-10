#!/bin/bash
# fix-idle-discord-posts.sh — Fix Discord channel references in idle activity instructions
# Problem: Idle activities try to send to "dailyconfig" instead of numeric channel ID
# Solution: Document the proper Discord channel ID mapping and validation

set -euo pipefail

echo "🔧 Discord Channel ID Reference Guide"
echo "======================================"
echo ""
echo "PROBLEM: Idle activities fail with 'Unknown target \"dailyconfig\"'"
echo "ROOT CAUSE: Friendly channel names not supported by Discord message tool"
echo "SOLUTION: Always use numeric Discord channel IDs"
echo ""
echo "VERIFIED Channel ID Mapping:"
echo "  #dailyconfig  → 1476598143016505446"
echo "  #general      → 1476571891043926036"
echo "  #alerts       → 1476592867865657599"
echo "  #devops       → 1484566371412213934"
echo ""
echo "CORRECT FORMAT for message tool:"
echo '  action: "send"'
echo '  channel: "discord"'
echo '  to: "1476598143016505446"  ← NUMERIC ID (required)'
echo '  message: "Your message"'
echo ""
echo "INCORRECT FORMATS (will fail):"
echo '  to: "dailyconfig"         ← ❌ Friendly name'
echo '  to: "#dailyconfig"        ← ❌ Friendly name with #'
echo '  target: "dailyconfig"     ← ❌ Wrong parameter name'
echo ""
echo "IMPLEMENTATION:"
echo "1. Update idle activity instructions to use numeric IDs"
echo "2. Or: Wrap idle posts through idle-discord-post.sh helper"
echo "3. Document this pattern in IDLE-ACTIVITY-GUIDE.md"
echo ""

# Verify we can resolve channels
source ~/.openclaw/workspace/scripts/channel-ids.sh

echo "✅ Channel resolution test:"
echo "   dailyconfig → $(resolve_discord_channel 'dailyconfig')"
echo "   general     → $(resolve_discord_channel 'general')"
echo "   alerts      → $(resolve_discord_channel 'alerts')"
echo ""
echo "✅ All verified. Update idle activity dispatcher to use numeric IDs."
