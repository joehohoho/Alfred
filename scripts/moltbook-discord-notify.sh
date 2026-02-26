#!/usr/bin/env bash
# moltbook-discord-notify.sh - Post Moltbook Weekly Review to Discord webhook
# Usage: bash moltbook-discord-notify.sh "Title" "Body text"
# Body supports markdown (Discord flavour)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a

DISCORD_WEBHOOK="${DISCORD_WEBHOOK_MOLTBOOK:?DISCORD_WEBHOOK_MOLTBOOK not set in .env}"

TITLE="${1:-Moltbook Weekly Review}"
BODY="${2:-No content provided}"

# Discord limits embeds to 4096 chars; truncate if needed
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
        'color': 0x5865F2,
        'footer': {
            'text': 'Moltbook Weekly Review • OpenClaw Alfred'
        }
    }]
}
print(json.dumps(payload))
" "$TITLE" "$BODY")

RESPONSE=$(curl -s -o /tmp/discord-moltbook-response.txt -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$DISCORD_WEBHOOK")

if [ "$RESPONSE" = "204" ] || [ "$RESPONSE" = "200" ]; then
  echo "✅ Posted to Discord (HTTP $RESPONSE)"
else
  echo "❌ Discord post failed (HTTP $RESPONSE)"
  cat /tmp/discord-moltbook-response.txt
  exit 1
fi
