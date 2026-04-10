#!/bin/bash
# validate-cron-discord-refs.sh
# Check cron jobs for Discord channel references and validate they use IDs not names
# Usage: bash scripts/validate-cron-discord-refs.sh

set -e

WORKSPACE="$HOME/.openclaw/workspace"
CRON_FILE="$HOME/.openclaw/cron/jobs.json"

if [[ ! -f "$CRON_FILE" ]]; then
    echo "❌ No cron jobs file found at: $CRON_FILE"
    exit 1
fi

echo "=== Cron Job Discord Reference Validation ==="
echo ""

# Check for friendly channel names in message payloads
ISSUES=0
JOBS_WITH_ISSUES=()

# Using jq to safely parse JSON
while IFS= read -r job_name payload; do
    # Check if payload contains friendly Discord channel names
    if echo "$payload" | grep -qiE '(#dailyconfig|#general|#alerts|#devops|#bot-spam|target.*=.*"#|to.*=.*"#)'; then
        echo "⚠️  Job '$job_name' contains Discord friendly channel names in payload:"
        echo "   $payload" | head -c 100
        echo "..."
        ISSUES=$((ISSUES + 1))
        JOBS_WITH_ISSUES+=("$job_name")
    fi
done < <(jq -r '.jobs[] | "\(.name) \(.payload.message // .payload.text // "")"' "$CRON_FILE" 2>/dev/null)

# Check delivery targets
while IFS= read -r job_name delivery_to; do
    # Ensure delivery.to is numeric (11-18 digit Discord ID) or empty
    if [[ ! -z "$delivery_to" ]] && [[ ! "$delivery_to" =~ ^[0-9]{17,19}$ ]]; then
        if [[ "$delivery_to" != "null" ]] && [[ ! "$delivery_to" =~ ^https?:// ]]; then
            echo "⚠️  Job '$job_name' has non-numeric Discord target: $delivery_to"
            ISSUES=$((ISSUES + 1))
            JOBS_WITH_ISSUES+=("$job_name")
        fi
    fi
done < <(jq -r '.jobs[] | "\(.name) \(.delivery.to // "")"' "$CRON_FILE" 2>/dev/null)

echo ""
if [[ $ISSUES -eq 0 ]]; then
    echo "✅ All cron jobs use correct Discord references (numeric IDs)!"
else
    echo "❌ Found $ISSUES cron job issue(s) with Discord references"
    echo ""
    echo "⚠️  Affected jobs:"
    for job in "${JOBS_WITH_ISSUES[@]}"; do
        echo "   - $job"
    done
    exit 1
fi
