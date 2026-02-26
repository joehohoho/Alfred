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

PAYLOAD=$(python3 -c "
import json, sys
title = sys.argv[1]
body = sys.argv[2]
payload = {
    'username': 'Alfred 🎩',
    'embeds': [{
        'title': title,
        'description': body,
        'color': 0xF5A623,
        'footer': {'text': 'CoinUsUp Audit • OpenClaw Alfred'}
    }]
}
print(json.dumps(payload))
" "$TITLE" "$BODY")

RESPONSE=$(curl -s -o /tmp/discord-cuu-response.txt -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d "$PAYLOAD" "$DISCORD_WEBHOOK")

if [ "$RESPONSE" = "204" ] || [ "$RESPONSE" = "200" ]; then
  echo "✅ Posted to CUU Discord (HTTP $RESPONSE)"
else
  echo "❌ Discord post failed (HTTP $RESPONSE)"
  cat /tmp/discord-cuu-response.txt
  exit 1
fi
