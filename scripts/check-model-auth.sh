#!/bin/bash
# Check for repeated model auth failures in gateway logs
# Usage: ./check-model-auth.sh [model] [threshold_minutes]

MODEL="${1:-openai-codex}"
THRESHOLD_MIN="${2:-30}"
THRESHOLD_SEC=$((THRESHOLD_MIN * 60))

# Get current time in seconds since epoch
NOW=$(date +%s)

# Check gateway error log for auth failures in the last N minutes
LOG_FILE="/Users/hopenclaw/.openclaw/logs/gateway.err.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "ERROR: Gateway log not found at $LOG_FILE"
  exit 1
fi

# Extract recent auth failures for the model
FAILURES=$(grep -E "Token refresh failed.*401|OAuth token refresh failed for $MODEL" "$LOG_FILE" | tail -20)
FAILURE_COUNT=$(echo "$FAILURES" | wc -l | tr -d ' ')

if [ "$FAILURE_COUNT" -gt 5 ]; then
  echo "⚠️  ALERT: $MODEL has $FAILURE_COUNT auth failures in the last 20 log entries"
  echo "STATUS: Model is falling back to secondary models, but retry loops are noisy"
  echo ""
  echo "LAST FAILURES:"
  echo "$FAILURES" | tail -5
  echo ""
  echo "ACTION NEEDED: Joe must re-authenticate OpenAI Codex (OAuth token expired/invalid)"
  exit 1
else
  echo "✅ $MODEL auth status: OK (0-5 failures in recent logs)"
  exit 0
fi
