#!/bin/bash

# Validate Discord channel IDs in cron jobs
# Purpose: Detect invalid/non-existent Discord channels in delivery configs

CRON_FILE="$HOME/.openclaw/cron/jobs.json"
DISCORD_GUILD="1473610337529102349"  # From openclaw.json config

if [ ! -f "$CRON_FILE" ]; then
  echo "Error: $CRON_FILE not found"
  exit 1
fi

echo "🔍 Validating Discord channel references in cron jobs..."
echo ""

# Extract all jobs with Discord delivery
jq -r '.jobs[] | 
  select(.delivery != null and .delivery.channel == "discord") | 
  "\(.id)||\(.name)||\(.delivery.to)||\(.delivery.mode)"' "$CRON_FILE" | \
while IFS='||' read -r job_id name channel_id mode; do
  # Discord channel IDs should be 18-20 digit numeric strings
  if [[ ! "$channel_id" =~ ^[0-9]{18,20}$ ]]; then
    echo "⚠️  INVALID: Job '$name' (id: $job_id)"
    echo "   Delivery: $mode → Channel: '$channel_id' (NOT a valid Discord ID)"
  else
    echo "✅ OK: Job '$name' → Channel: $channel_id"
  fi
done

echo ""
echo "Summary: Check the Discord guild config for valid channels."
echo "Guild: $DISCORD_GUILD"
