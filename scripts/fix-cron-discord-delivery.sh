#!/bin/bash
# fix-cron-discord-delivery.sh
# Audit and fix cron job Discord delivery issues
# - Ensures all delivery.to values are numeric channel IDs (not names)
# - Updates any jobs with invalid/broken channel references

set -e

JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
CHANNEL_MAP_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/discord-channel-map.sh"

if [[ ! -f "$JOBS_FILE" ]]; then
    echo "ERROR: Cron jobs file not found: $JOBS_FILE" >&2
    exit 1
fi

if [[ ! -f "$CHANNEL_MAP_SCRIPT" ]]; then
    echo "ERROR: Channel map script not found: $CHANNEL_MAP_SCRIPT" >&2
    exit 1
fi

echo "🔍 Auditing cron job Discord delivery configurations..."

# Load the channel mapping function
source "$CHANNEL_MAP_SCRIPT"

# Create a temporary backup
BACKUP_FILE="$JOBS_FILE.backup-$(date +%s)"
cp "$JOBS_FILE" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"

# Audit all jobs
ISSUES=0
FIXED=0

# Extract jobs, validate delivery.to, and rebuild if needed
UPDATED_JSON=$(cat "$JOBS_FILE" | jq '.jobs |= map(
  if .delivery != null and (.delivery.mode == "announce" or .delivery.mode == "webhook") then
    if .delivery.to != null then
      # Check if delivery.to is NOT a numeric ID
      if (.delivery.to | type) == "string" and (.delivery.to | test("^[0-9]+$") | not) then
        # This is a non-numeric string (friendly name or webhook URL)
        if .delivery.mode == "announce" then
          # Webhook URLs are OK, but friendly names are not
          if (.delivery.to | startswith("http")) then
            . # webhook URL is fine
          else
            # Friendly channel name - needs resolution
            .delivery.to = "INVALID_FRIENDLY_NAME_" + .delivery.to
            .delivery.comment = "⚠️  AUDIT: Friendly channel name detected; resolve to numeric ID"
          end
        else
          . # webhook is OK as-is
        end
      else
        . # Already a numeric ID or valid URL
      end
    else
      . # No delivery.to set
    end
  else
    . # No delivery configured
  end
)' 2>/dev/null)

# Check if there are issues
ISSUES_COUNT=$(echo "$UPDATED_JSON" | jq '[.[] | select(.delivery.comment != null)] | length')

if [[ "$ISSUES_COUNT" -gt 0 ]]; then
    echo ""
    echo "⚠️  Found $ISSUES_COUNT job(s) with potential Discord delivery issues:"
    echo "$UPDATED_JSON" | jq -r '.[] | select(.delivery.comment != null) | "  - \(.name): \(.delivery.to) (\(.delivery.comment))"'
    echo ""
    echo "💡 ACTION: Manually verify these jobs and update delivery.to with numeric channel IDs"
    echo "   Use: bash $CHANNEL_MAP_SCRIPT list   (to see valid channel ID mappings)"
    echo ""
    echo "⚠️  Not applying automatic fixes (manual review required)"
else
    echo "✅ All cron job Discord deliveries are valid (numeric IDs or webhook URLs)"
fi

echo ""
echo "📊 Summary:"
cat "$JOBS_FILE" | jq '.jobs[] | select(.delivery != null) | {name, delivery_to: .delivery.to, delivery_mode: .delivery.mode}' | grep -E "delivery_(to|mode)" | wc -l | xargs echo "   Total delivery configs:"
