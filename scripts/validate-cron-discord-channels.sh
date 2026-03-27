#!/bin/bash
# Validate Discord channel IDs in cron job delivery config
# Purpose: identify which cron jobs are trying to post to invalid/missing Discord channels

set -e

CRON_FILE="$HOME/.openclaw/cron/jobs.json"
WORKSPACE="$HOME/.openclaw/workspace"

echo "=== Cron Delivery Channel Validation ===" 
echo "Scanning: $CRON_FILE"
echo ""

# Extract all announce jobs and validate their channels
cat "$CRON_FILE" | jq -r '.jobs[] | select(.delivery.mode=="announce") | "\(.id)|\(.name)|\(.delivery.channel)|\(.delivery.to)"' | while IFS='|' read job_id job_name channel channel_id; do
  
  if [[ -z "$channel" ]]; then
    echo "❌ MISSING CHANNEL: $job_name (ID: $job_id)"
    echo "   delivery.channel is null or empty"
    echo ""
    continue
  fi
  
  if [[ -z "$channel_id" ]]; then
    echo "❌ MISSING CHANNEL_ID: $job_name (ID: $job_id)"
    echo "   delivery.to is empty"
    echo ""
    continue
  fi
  
  # Check if this looks like a valid Discord snowflake ID (18-20 digits)
  if ! [[ "$channel_id" =~ ^[0-9]{18,20}$ ]]; then
    echo "⚠️  INVALID FORMAT: $job_name (ID: $job_id)"
    echo "   Channel ID '$channel_id' doesn't match Discord snowflake format"
    echo ""
    continue
  fi
  
  echo "✅ $job_name"
  echo "   Channel: $channel | ID: $channel_id"
  echo ""
done

echo ""
echo "=== Summary ==="
echo "To fix: Cron jobs with ❌ or ⚠️ should use delivery.mode='none' or get explicit valid Discord channel IDs."
