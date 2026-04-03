#!/bin/bash
# Monitor and summarize "read tool called without path" errors from gateway logs
# This prevents silent failures and helps debug agent tool call issues

LOG_FILE="$HOME/.openclaw/logs/gateway.err.log"
SUMMARY_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/read-errors-summary.jsonl"

if [ ! -f "$LOG_FILE" ]; then
  echo "Gateway log not found: $LOG_FILE"
  exit 1
fi

# Extract read errors from last 24 hours
ERROR_COUNT=$(grep "read tool called without path" "$LOG_FILE" | tail -100 | wc -l)
LAST_ERROR=$(grep "read tool called without path" "$LOG_FILE" | tail -1)
LAST_ERROR_TIME=$(echo "$LAST_ERROR" | awk '{print $1, $2}')

if [ "$ERROR_COUNT" -gt 0 ]; then
  # Log summary entry
  SUMMARY_JSON=$(jq -n \
    --arg count "$ERROR_COUNT" \
    --arg last_time "$LAST_ERROR_TIME" \
    --arg last_log "$LAST_ERROR" \
    '{
      timestamp: (now | todate),
      error_type: "read_without_path",
      count_last_100_lines: ($count | tonumber),
      last_error_time: $last_time,
      sample: $last_log
    }')
  
  echo "$SUMMARY_JSON" >> "$SUMMARY_FILE"
  
  # Alert if count is high
  if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "[⚠️] HIGH: $ERROR_COUNT 'read without path' errors in last 100 gateway.err.log lines"
    echo "Last error: $LAST_ERROR_TIME"
  else
    echo "[ℹ️] Found $ERROR_COUNT 'read without path' errors (normal rate)"
  fi
else
  echo "[✅] No 'read without path' errors detected"
fi
