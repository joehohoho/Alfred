#!/bin/bash
# send-notification.sh — Post a question/notification to Command Center
#
# Usage:
#   send-notification.sh <type> <title> <message> [goalId] [taskId]
#
# Types: question, alert, update
#
# Examples:
#   send-notification.sh question "CoinUsUp Deploy" "Should I deploy the latest CoinUsUp changes to production? Changes include: fix auth timeout, update splash screen."
#   send-notification.sh alert "High Token Spend" "Today's Anthropic spend hit $8.50, approaching daily budget."
#   send-notification.sh question "Slack Channel Setup" "I found 3 new Slack channels. Should I add them to the allowlist?\n\n1. #app-coinusup\n2. #app-evenusup\n3. #general"

TYPE="${1:-question}"
TITLE="${2:-Alfred has a question}"
MESSAGE="${3:-No details provided}"
GOAL_ID="${4:-}"
TASK_ID="${5:-}"

API="http://localhost:3001/api/notifications"

# Build JSON safely with python3 to handle special chars in message
JSON=$(python3 -c "
import json, sys
d = {'type': sys.argv[1], 'title': sys.argv[2], 'message': sys.argv[3]}
if sys.argv[4]:
    d['goalId'] = sys.argv[4]
if sys.argv[5]:
    d['taskId'] = sys.argv[5]
print(json.dumps(d))
" "$TYPE" "$TITLE" "$MESSAGE" "$GOAL_ID" "$TASK_ID")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  NOTIF_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id','unknown'))" 2>/dev/null)
  echo "OK: Notification sent (id=$NOTIF_ID)"
  exit 0
else
  echo "ERROR: HTTP $HTTP_CODE — $BODY" >&2
  exit 1
fi
