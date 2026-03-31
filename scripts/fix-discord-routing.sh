#!/bin/bash
# fix-discord-routing.sh - Diagnose and fix Discord channel routing issues
# Resolves: "Unknown target" errors by validating Discord channel IDs in scripts and cron jobs

set -e

WORKSPACE="${HOME}/.openclaw/workspace"
DISCORD_MAP="$WORKSPACE/scripts/discord-channel-map.sh"
CRON_JOBS="$HOME/.openclaw/cron/jobs.json"
TEMP_DIR="/tmp/discord-routing-fix"

mkdir -p "$TEMP_DIR"

echo "=== Discord Channel Routing Diagnostic ==="
echo "Workspace: $WORKSPACE"
echo "Timestamp: $(date -Iseconds)"
echo

# 1. Check discord-channel-map.sh exists
if [[ ! -f "$DISCORD_MAP" ]]; then
    echo "❌ ERROR: discord-channel-map.sh not found at $DISCORD_MAP"
    exit 1
fi

# 2. Extract friendly names and IDs
echo "📋 Loading Discord channel mappings..."
source "$DISCORD_MAP"
echo "✅ Found discord-channels and discord-users objects"
echo

# 3. Search for message tool calls with friendly names (not numeric IDs)
echo "🔍 Scanning for message tool calls with non-numeric targets..."
FOUND_ISSUES=0

# Common patterns that fail: "dailyconfig", "general", "#channel", channel names without IDs
ISSUE_PATTERNS=("dailyconfig" "general" "#moltbook" "evening-routine" "alerts")

for pattern in "${ISSUE_PATTERNS[@]}"; do
    matches=$(grep -r "message.*$pattern" "$WORKSPACE" --include="*.sh" --include="*.md" 2>/dev/null | grep -v "discord-channel-map\|CRON-DELIVERY\|memory" | head -5)
    if [[ -n "$matches" ]]; then
        echo "⚠️  Found references to '$pattern':"
        echo "$matches" | head -3
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

echo

# 4. Validate cron job delivery configs
echo "🔍 Validating cron job delivery configurations..."

# Check jobs.json for delivery entries with friendly names (non-numeric IDs)
INVALID_JOBS=$(grep -o '"to":"[^"]*"' "$CRON_JOBS" | grep -v '^\"to\":\"[0-9]' | wc -l)

if [[ $INVALID_JOBS -gt 0 ]]; then
    echo "⚠️  Found $INVALID_JOBS cron jobs with non-numeric Discord target IDs"
    grep -B5 '"to":"[^"]*"' "$CRON_JOBS" | grep -E '"name"|"to"' | head -10
else
    echo "✅ All cron jobs have numeric Discord IDs"
fi

echo

# 5. Summary and recommendations
echo "=== RECOMMENDATIONS ==="
if [[ $FOUND_ISSUES -eq 0 && $INVALID_JOBS -eq 0 ]]; then
    echo "✅ No Discord routing issues detected."
    echo "   If errors persist, the issue may be:"
    echo "   - A script passing empty target variable"
    echo "   - Discord API authentication issues (OpenAI Codex token problems)"
    echo "   - Gateway misconfiguration"
else
    echo "⚠️  Issues detected. To fix:"
    echo "   1. For scripts: Use \`bash agent-discord-post.sh CHANNEL_NAME MESSAGE\`"
    echo "      (it auto-resolves friendly names to numeric IDs)"
    echo "   2. For cron jobs: Ensure 'to' field contains numeric Discord ID"
    echo "   3. Example: \"to\": \"1476598143016505446\" (NOT \"to\": \"dailyconfig\")"
fi

echo
echo "=== GATEWAY ERROR LOG CHECK ==="
# Check recent gateway errors related to Discord
ERROR_COUNT=$(grep -c "Unknown target.*Discord" ~/.openclaw/logs/gateway.err.log 2>/dev/null || echo "0")
CRON_DELIVERY_FAILURES=$(grep -c "delivery payload failed.*Unknown Channel" ~/.openclaw/logs/gateway.err.log 2>/dev/null || echo "0")

echo "Recent 'Unknown target' errors: $ERROR_COUNT"
echo "Recent 'Unknown Channel' errors: $CRON_DELIVERY_FAILURES"

if [[ $ERROR_COUNT -gt 5 || $CRON_DELIVERY_FAILURES -gt 5 ]]; then
    echo "⚠️  High error rate. This suggests:"
    echo "   A) Friendly channel names are being used directly with message tool"
    echo "   B) Cron jobs have invalid 'to' values"
    echo "   C) Gateway channel config may be missing Discord plugin mappings"
fi

echo
echo "=== OPENAI CODEX AUTH ERROR CHECK ==="
TOKEN_ERRORS=$(grep -c "refresh_token_reused\|OAuth token refresh failed" ~/.openclaw/logs/gateway.err.log 2>/dev/null || echo "0")
if [[ $TOKEN_ERRORS -gt 10 ]]; then
    echo "🚨 CRITICAL: $TOKEN_ERRORS OpenAI Codex token refresh failures detected"
    echo "   This is blocking multiple cron jobs and agents"
    echo "   ACTION: Need to re-authenticate OpenAI Codex (gateway config)"
    echo "   This requires Joe's approval to modify ~/.openclaw/openclaw.json"
else
    echo "✅ OpenAI Codex auth errors: $TOKEN_ERRORS (monitor but not critical yet)"
fi

echo
echo "Diagnostic complete. Results saved."
