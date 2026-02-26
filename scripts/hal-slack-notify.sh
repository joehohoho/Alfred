#!/bin/bash
# hal-slack-notify.sh
# Post a HAL task completion to Joe's HAL completions Slack channel (C0AH618DE5C).
#
# Usage:
#   bash hal-slack-notify.sh "Task Title" "Summary of what HAL did"
#
# Or pipe in a full message:
#   echo "Full message here" | bash hal-slack-notify.sh --raw

set -euo pipefail

HAL_SLACK_CHANNEL="C0AH618DE5C"
GATEWAY_URL="http://localhost:8765"

TITLE="${1:-}"
SUMMARY="${2:-}"
RAW_MODE=false

if [[ "${1:-}" == "--raw" ]]; then
  RAW_MODE=true
  MESSAGE=$(cat /dev/stdin)
elif [[ -z "$TITLE" ]]; then
  echo "Usage: $0 \"Task Title\" \"Summary\"" >&2
  echo "   or: echo \"message\" | $0 --raw" >&2
  exit 1
else
  MESSAGE="✅ *${TITLE}*
${SUMMARY}

_Posted by Alfred • HAL completions_"
fi

# Send via openclaw message tool (channel=slack)
openclaw message send \
  --channel slack \
  --to "channel:${HAL_SLACK_CHANNEL}" \
  --message "${MESSAGE}" 2>/dev/null \
|| \
# Fallback: post via gateway HTTP if CLI not available
curl -s -X POST "${GATEWAY_URL}/message" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys; print(json.dumps({'channel':'slack','to':'channel:${HAL_SLACK_CHANNEL}','message':sys.argv[1]}))" "${MESSAGE}")" \
>/dev/null \
|| echo "[hal-slack-notify] Warning: could not post to Slack — message was: ${MESSAGE}" >&2

echo "Posted to HAL completions channel (${HAL_SLACK_CHANNEL}): ${TITLE}"
