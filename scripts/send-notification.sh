#!/bin/bash
# send-notification.sh — Post a question/notification to Command Center
#
# Usage:
#   send-notification.sh <type> <title> <message> [goalId] [taskId] [source]
#
# Types: question, alert, update
# Source: optional tag identifying the origin (e.g., "daily-inquiry", "code-review")
#
# ⚠️  QUALITY REQUIREMENT (for type=question):
#   Your message MUST include ALL of:
#   1. Context — what you were doing, which project/system
#   2. Specific question — not vague, precise
#   3. Options — at least 2 proposed solutions
#   4. Recommendation — pick one and explain why
#   5. Default action — what happens if Joe doesn't respond
#   See NOTIFICATION-ROUTING.md "Notification Quality Standards" for details.
#
# Examples:
#   send-notification.sh question "CoinUsUp Deploy" "Should I deploy the latest CoinUsUp changes to production? Changes include: fix auth timeout, update splash screen.\n\nOptions:\n1. Deploy now (all tests pass)\n2. Wait for next batch\n\nRecommendation: Deploy now — both fixes are low-risk.\nDefault: Will deploy tomorrow if no response."
#   send-notification.sh alert "High Token Spend" "Today's Anthropic spend hit $8.50, approaching daily budget."
#   send-notification.sh question "Slack Channel Setup" "I found 3 new Slack channels. Should I add them to the allowlist?\n\n1. #app-coinusup\n2. #app-evenusup\n3. #general\n\nRecommendation: Add all 3 — they match existing projects.\nDefault: Will add all 3 tomorrow if no response."
#   send-notification.sh question "Daily Inquiry" "What's your vision for next quarter?" "" "" "daily-inquiry"

TYPE="${1:-question}"
TITLE="${2:-Alfred has a question}"
MESSAGE="${3:-No details provided}"
GOAL_ID="${4:-}"
TASK_ID="${5:-}"
SOURCE="${6:-}"

API="http://localhost:3001/api/notifications"

# Build JSON safely with python3 to handle special chars in message
JSON=$(python3 -c "
import json, sys
d = {'type': sys.argv[1], 'title': sys.argv[2], 'message': sys.argv[3]}
if sys.argv[4]:
    d['goalId'] = sys.argv[4]
if sys.argv[5]:
    d['taskId'] = sys.argv[5]
if sys.argv[6]:
    d['source'] = sys.argv[6]
print(json.dumps(d))
" "$TYPE" "$TITLE" "$MESSAGE" "$GOAL_ID" "$TASK_ID" "$SOURCE")

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
