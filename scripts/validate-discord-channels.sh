#!/bin/bash
# validate-discord-channels.sh
# Validate that all Discord message calls use numeric channel IDs, not friendly names
# Prevents "Unknown Channel" errors in logs
# Usage: bash validate-discord-channels.sh [--fix]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIX_MODE="${1:---check}"

echo "[validate-discord-channels] Scanning for Discord channel name usage..."

# Pattern: message.*target="[^0-9] or message.*channel="[^0-9]
# This will catch friendly names like #dailyconfig, dailyconfig, general, etc.

VIOLATIONS=0
CHECKED_FILES=0

while IFS= read -r file; do
    if [[ ! -f "$file" ]]; then
        continue
    fi
    
    ((CHECKED_FILES++))
    
    # Look for message calls with non-numeric targets (excluding variables and comments)
    while IFS=: read -r line_num match; do
        # Skip comment lines (lines starting with # in the content)
        if [[ "$match" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        # Skip variable interpolation
        if [[ "$match" =~ target=\"\$ ]]; then
            continue
        fi
        
        echo "  ❌ $file:$line_num — Found friendly channel name in message call"
        echo "     $match" | sed 's/^/       /'
        ((VIOLATIONS++))
    done < <(grep -n 'message.*target="\(#\)\?[a-z]' "$file" 2>/dev/null)
done < <(find "$WORKSPACE_DIR/scripts" "$WORKSPACE_DIR/.openclaw/cron" -type f \( -name "*.sh" -o -name "*.json" \) 2>/dev/null)

echo ""
echo "[validate-discord-channels] Checked $CHECKED_FILES files"

if [[ $VIOLATIONS -eq 0 ]]; then
    echo "✅ No Discord channel name violations found"
    exit 0
else
    echo "❌ Found $VIOLATIONS violations"
    echo ""
    echo "FIX: Use numeric Discord channel IDs instead of friendly names."
    echo "Use scripts/agent-discord-post.sh for safe posting with name resolution:"
    echo "  bash scripts/agent-discord-post.sh \"dailyconfig\" \"Your message\""
    echo ""
    echo "Or map names to IDs using scripts/discord-channel-map.sh:"
    echo "  CHANNEL_ID=\$(bash scripts/discord-channel-map.sh resolve \"dailyconfig\")"
    exit 1
fi
