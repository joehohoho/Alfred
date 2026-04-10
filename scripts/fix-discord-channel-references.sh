#!/bin/bash
# fix-discord-channel-references.sh
# Audit and fix Discord channel references in scripts to use numeric IDs
# Run: bash scripts/fix-discord-channel-references.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"

# Source the verified channel IDs
source "$SCRIPT_DIR/channel-ids.sh"

# Counters
FOUND=0
FIXED=0
WARNINGS=0

echo "=== Discord Channel Reference Audit ==="
echo "Checking all shell scripts in: $SCRIPT_DIR"
echo ""

# Find all shell scripts and check for problematic patterns
while IFS= read -r file; do
    # Skip this script itself and helpers
    [[ "$file" == *"channel-ids.sh" ]] && continue
    [[ "$file" == *"discord-channel-map.sh" ]] && continue
    [[ "$file" == *"fix-discord-channel-references.sh" ]] && continue
    
    # Check for string channel names passed to message tool or Discord APIs
    if grep -qE '"(#?dailyconfig|#?general|#?alerts|#?devops|#?[a-z-]+)"\s*\)' "$file" 2>/dev/null || \
       grep -qE "target\s*=\s*['\"]#?[a-z]+" "$file" 2>/dev/null || \
       grep -qE "to\s*=\s*['\"]#?[a-z]+" "$file" 2>/dev/null; then
        
        FOUND=$((FOUND + 1))
        echo "⚠️  Found potential issue in: $(basename "$file")"
        
        # Try to fix common patterns
        if grep -q 'to.*"#dailyconfig"' "$file"; then
            echo "   → Fixing: to=\"#dailyconfig\" → to=\"\$DISCORD_DAILYCONFIG\""
            sed -i '' 's/to="*#*dailyconfig"*/to="$DISCORD_DAILYCONFIG"/g' "$file"
            FIXED=$((FIXED + 1))
        fi
        
        if grep -q 'target.*"#*dailyconfig"' "$file"; then
            echo "   → Fixing: target=\"#dailyconfig\" → target=\"\$DISCORD_DAILYCONFIG\""
            sed -i '' 's/target="*#*dailyconfig"*/target="$DISCORD_DAILYCONFIG"/g' "$file"
            FIXED=$((FIXED + 1))
        fi
        
        if grep -q 'to.*"#general"' "$file"; then
            echo "   → Fixing: to=\"#general\" → to=\"\$DISCORD_GENERAL\""
            sed -i '' 's/to="*#*general"*/to="$DISCORD_GENERAL"/g' "$file"
            FIXED=$((FIXED + 1))
        fi
        
        echo ""
    fi
done < <(find "$SCRIPT_DIR" -maxdepth 1 -type f -name "*.sh" -not -path "*/node_modules/*")

# Report
echo "=== Summary ==="
echo "✓ Scanned scripts: $(find "$SCRIPT_DIR" -maxdepth 1 -type f -name "*.sh" | wc -l)"
echo "⚠️  Found potential issues: $FOUND"
echo "✅ Fixed: $FIXED"
echo ""

if [[ $FOUND -eq 0 ]]; then
    echo "✅ All scripts use correct Discord channel references!"
else
    echo "📝 Note: Review fixed scripts manually to ensure changes are correct."
    echo "   Commit if fixes look good."
fi
