#!/usr/bin/env bash
# coinusup-discord-notify.sh - Post CoinUsUp audit/updates to Discord webhook
# Usage: bash coinusup-discord-notify.sh "Title" "Body text"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

DISCORD_WEBHOOK="${DISCORD_WEBHOOK_CUU_APP_AUDIT:?DISCORD_WEBHOOK_CUU_APP_AUDIT not set in .env}"

TITLE="${1:-CoinUsUp Update}"
BODY="${2:-No content provided}"

MAX=4000
if [ ${#BODY} -gt $MAX ]; then
  BODY="${BODY:0:$MAX}...(truncated)"
fi

MESSAGE="🪙 **${TITLE}**

${BODY}

_CoinUsUp Audit • OpenClaw Alfred_"
ACK_ID="cuu-$(date +%s)"

if bash "$SCRIPT_DIR/notify-with-ack.sh" \
  --webhook DISCORD_WEBHOOK_CUU_APP_AUDIT \
  --message "$MESSAGE" \
  --ack-id "$ACK_ID" \
  --source "coinusup-discord-notify.sh"; then
  echo "✅ Posted to CUU Discord (ack_id=$ACK_ID)"
else
  echo "❌ Discord post failed (ack_id=$ACK_ID)" >&2
  exit 1
fi
