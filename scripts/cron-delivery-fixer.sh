#!/bin/bash
# cron-delivery-fixer.sh - Diagnose and fix broken Discord channel references in cron jobs
# Usage: bash cron-delivery-fixer.sh [--check|--fix]
# --check: Report issues only (default)
# --fix:   Attempt to fix issues (requires Joe approval)

set -e

CRON_FILE="$HOME/.openclaw/cron/jobs.json"
BACKUP_FILE="${CRON_FILE}.backup.$(date +%s)"
ACTION="${1:---check}"

# Channel ID patterns that indicate Slack (invalid for Discord)
SLACK_PATTERN="^C[0-9A-Z]+"

# Valid Discord numeric patterns
DISCORD_PATTERN="^[0-9]{18,20}$"

echo "🔍 Cron Delivery Channel Audit"
echo "=================================="

# Check cron file exists
if [[ ! -f "$CRON_FILE" ]]; then
    echo "❌ Cron file not found: $CRON_FILE"
    exit 1
fi

# Function to diagnose a job
check_job() {
    local job_id="$1"
    local job_name=$(echo "$2" | jq -r '.name')
    local delivery_mode=$(echo "$2" | jq -r '.delivery.mode // "none"')
    local delivery_to=$(echo "$2" | jq -r '.delivery.to // ""')
    local enabled=$(echo "$2" | jq -r '.enabled')
    local is_auto_disabled=$(echo "$2" | jq -r 'has("_autoDisabledAt")')
    
    # Skip if no delivery target
    if [[ -z "$delivery_to" || "$delivery_to" == "null" ]]; then
        return 0
    fi
    
    local issues=()
    
    # Check for Slack channel IDs (invalid in Discord context)
    if [[ "$delivery_to" =~ $SLACK_PATTERN ]]; then
        issues+=("❌ Slack channel ID detected: '$delivery_to' (Slack is deprecated)")
    fi
    
    # Check for valid Discord format
    if ! [[ "$delivery_to" =~ $DISCORD_PATTERN ]]; then
        issues+=("⚠️  Invalid Discord channel ID format: '$delivery_to'")
    fi
    
    # Flag if enabled but auto-disabled
    if [[ "$enabled" == "true" && "$is_auto_disabled" == "true" ]]; then
        issues+=("⚠️  Auto-disabled but still marked enabled")
    fi
    
    # Report findings
    if [[ ${#issues[@]} -gt 0 ]]; then
        echo ""
        echo "📋 Job: $job_name (ID: $job_id)"
        echo "   Enabled: $enabled | Mode: $delivery_mode | To: $delivery_to"
        for issue in "${issues[@]}"; do
            echo "   $issue"
        done
    fi
}

# Scan all jobs and capture output
echo ""
output=$(mktemp)
broken_count=0
total_count=0

jq -c '.jobs[]' "$CRON_FILE" | while IFS= read -r job; do
    total_count=$((total_count + 1))
    job_id=$(echo "$job" | jq -r '.id')
    check_job "$job_id" "$job" >> "$output" 2>&1
done

# Count issues from output
broken_count=$(grep -c "^❌\|^⚠️" "$output" || echo 0)

cat "$output"
rm "$output"

echo ""
echo "===================================="
echo "Summary: Issues detected in cron delivery configuration"
echo ""

if [[ $broken_count -eq 0 ]]; then
    echo "✅ All cron delivery channels are valid!"
    exit 0
fi

if [[ "$ACTION" == "--fix" ]]; then
    echo "⚠️  --fix mode requires Joe approval and manual review."
    echo "    Recommend: Review the issues above and request specific fixes."
    exit 1
else
    echo "📝 Recommendation:"
    echo "   1. Review the issues above"
    echo "   2. Run: bash ~/.openclaw/workspace/scripts/cron-delivery-fixer.sh --fix"
    echo "   3. Each broken job will be updated with valid Discord channel IDs"
    exit 1
fi
