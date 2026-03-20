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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

DISCORD_WEBHOOK="${DISCORD_WEBHOOK_HAL_COMPLETIONS:?DISCORD_WEBHOOK_HAL_COMPLETIONS not set in .env}"

# Shared-channel outbound is allowed during quiet hours; still pass through policy preflight.
bash "$SCRIPT_DIR/policy-preflight.sh" \
  --script "hal-slack-notify.sh" \
  --action notify \
  --external 1 \
  --target-class shared_channel \
  --priority normal \
  --approved "${POLICY_APPROVED:-0}" \
  --audit-only "${POLICY_AUDIT_ONLY:-0}"

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
