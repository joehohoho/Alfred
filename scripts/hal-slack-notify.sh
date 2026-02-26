#!/bin/bash
# hal-slack-notify.sh
# Post a HAL task completion to the HAL completions Discord channel.
#
# Usage:
#   bash hal-slack-notify.sh "Task Title" "Summary of what HAL did"
#
# Or pipe in a full message:
#   echo "Full message here" | bash hal-slack-notify.sh --raw

set -euo pipefail

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1476448356925702185/UDPUJvuUicQQFSdVLo3s18tlPjrFyp4w-fft4FL0ihygVzXP2VLpYTWsBLVS4eaujhkc"

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
  MESSAGE="✅ **${TITLE}**
${SUMMARY}

_Posted by Alfred • HAL completions_"
fi

curl -s -X POST "$DISCORD_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys; print(json.dumps({'content':sys.argv[1]}))" "${MESSAGE}")"

echo "Posted to HAL completions Discord: ${TITLE}"
