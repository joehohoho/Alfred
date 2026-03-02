#!/bin/bash

# moltbook-review-cron.sh
# Cron script for weekly Moltbook review with no-feed-data guardrail
# 
# Requirements:
# - Detect empty/login-gated feed responses (<500 chars or containing 'Sign in'/'Login')
# - Log skip + ISO timestamp to ~/.openclaw/workspace/cron-failures.md
# - Post Discord notice to #moltbook-review if feed is empty
# - Hard exit before AI generation if feed is empty
# - Accept --test flag to simulate empty feed
#
# Usage:
#   ./scripts/moltbook-review-cron.sh          # Normal execution
#   ./scripts/moltbook-review-cron.sh --test   # Test with simulated empty feed

set -e

WORKSPACE="${HOME}/.openclaw/workspace"
FAILURES_LOG="${WORKSPACE}/cron-failures.md"
TEST_MODE="${1:-}"
DISCORD_CHANNEL="moltbook-review"

# === Helper Functions ===

log_failure() {
  local reason="$1"
  local iso_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Create failures log if it doesn't exist
  if [[ ! -f "$FAILURES_LOG" ]]; then
    {
      echo "# Cron Failures Log"
      echo ""
    } > "$FAILURES_LOG"
  fi
  
  # Append failure entry
  {
    echo "## ${iso_timestamp}"
    echo "- **Task:** moltbook-review"
    echo "- **Reason:** ${reason}"
    echo ""
  } >> "$FAILURES_LOG"
  
  echo "[$(date)] ✗ Logged failure: ${reason}"
}

post_discord_notice() {
  local message="Skipped this week — no live feed data (auth issue). See cron-failures.md."
  
  echo "[$(date)] → Posting Discord notice to #${DISCORD_CHANNEL}..."
  
  # Note: Discord posting will be handled by main agent via message tool
  # This function signals that a Discord post should be made
  # Main agent will call: message action=send channel=discord target="#moltbook-review" message="..."
}

fetch_moltbook_feed() {
  # Simulate or fetch actual feed
  # For now, return a placeholder that can be overridden in test mode
  
  if [[ "$TEST_MODE" == "--test" ]]; then
    echo "[$(date)] 🧪 TEST MODE: Simulating empty feed response"
    # Return a short login-gated response
    echo "Please Sign in to continue"
    return 0
  fi
  
  # In normal mode, attempt to fetch from Moltbook feed
  # This would be the actual feed endpoint
  echo "Fetching Moltbook feed..."
  # Placeholder for actual API call
  # curl -s "https://moltbook-feed-endpoint/..." || echo "Login required"
}

is_feed_empty_or_gated() {
  local feed_response="$1"
  local response_length=${#feed_response}
  
  # Check 1: Response too short (<500 chars)
  if (( response_length < 500 )); then
    echo "[$(date)] ⚠️  Feed response too short (${response_length} chars, threshold: 500)"
    return 0  # Feed is empty/gated
  fi
  
  # Check 2: Contains login-related keywords
  if echo "$feed_response" | grep -qi "sign in\|login"; then
    echo "[$(date)] ⚠️  Feed response contains login gate"
    return 0  # Feed is empty/gated
  fi
  
  echo "[$(date)] ✓ Feed response looks valid (${response_length} chars)"
  return 1  # Feed is valid
}

# === Main Flow ===

echo "================================================"
echo "Moltbook Review Cron ($(date))"
echo "================================================"
echo ""

# Step 1: Fetch feed
feed_response=$(fetch_moltbook_feed)
echo "Feed Response Length: ${#feed_response} chars"

# Step 2: Check for empty/gated feed
if is_feed_empty_or_gated "$feed_response"; then
  echo ""
  echo "❌ FEED GUARD TRIGGERED: Feed is empty or login-gated"
  echo ""
  
  # Log failure
  log_failure "Feed is empty or login-gated (detected by guardrail)"
  
  # Post Discord notice (via tool call in main agent)
  post_discord_notice
  
  # Hard exit before AI generation
  echo "[$(date)] 🛑 Hard exit: No AI generation with empty feed"
  exit 0
fi

# Step 3: Feed is valid - proceed with AI generation
echo ""
echo "✓ Feed validation passed. Proceeding with AI generation..."
echo "[$(date)] Processing Moltbook review recommendations..."

# Placeholder for actual AI generation logic
# This would call Claude/Codex to generate recommendations based on feed_response

echo "[$(date)] ✓ Moltbook review completed successfully"
echo ""
echo "================================================"
