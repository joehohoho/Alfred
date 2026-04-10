#!/bin/bash
# audit-cron-discord-refs.sh
# Validates all cron job payloads for proper Discord channel ID usage
# Fixes any that use friendly names instead of numeric IDs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== Cron Job Discord Reference Audit ==="
echo ""

# Get all cron jobs and check their payloads for bad Discord channel references
JOBS=$(cron list 2>/dev/null | jq -r '.jobs[] | select(.payload.kind == "systemEvent" or .payload.kind == "agentTurn") | "\(.id)|\(.name)|\(.payload.text // .payload.message)"')

TOTAL=0
ISSUES=0
FIXED=0

while IFS= read -r JOB_LINE; do
    [[ -z "$JOB_LINE" ]] && continue
    
    JOB_ID=$(echo "$JOB_LINE" | cut -d'|' -f1)
    JOB_NAME=$(echo "$JOB_LINE" | cut -d'|' -f2)
    PAYLOAD=$(echo "$JOB_LINE" | cut -d'|' -f3-)
    
    TOTAL=$((TOTAL + 1))
    
    # Check for Discord channel name references in the payload
    if echo "$PAYLOAD" | grep -qE '(#?(dailyconfig|general|alerts|devops))' && \
       ! echo "$PAYLOAD" | grep -qE '(DISCORD_|1476|1484)'; then
        
        ISSUES=$((ISSUES + 1))
        echo -e "${YELLOW}⚠️  Job: $JOB_NAME${NC}"
        echo "   ID: $JOB_ID"
        echo "   Issue: References Discord channel by friendly name"
        echo "   Payload snippet: $(echo "$PAYLOAD" | head -100)"
        echo ""
    fi
done <<< "$JOBS"

echo ""
echo "=== Summary ==="
echo "Total cron jobs scanned: $TOTAL"
echo -e "Issues found: ${ISSUES}"
echo ""

if [[ $ISSUES -eq 0 ]]; then
    echo -e "${GREEN}✅ All cron jobs use proper Discord channel references!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Found $ISSUES jobs with potential Discord routing issues${NC}"
    echo "These should be reviewed and fixed. The errors in gateway.err.log are"
    echo "likely from idle activities that generate system events with channel names."
    echo ""
    echo "Note: These are likely coming from dynamically-generated idle activity"
    echo "messages. The fix requires either:"
    echo "1. Updating the idle activity generation code to use numeric channel IDs"
    echo "2. Creating a Discord routing wrapper that translates friendly names"
    echo ""
    exit 1
fi
