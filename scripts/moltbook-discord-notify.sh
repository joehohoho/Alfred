#!/usr/bin/env bash
# moltbook-discord-notify.sh - Post Moltbook Weekly Review to Discord webhook
# Usage: bash moltbook-discord-notify.sh "Title" "Body text"
# Body supports markdown (Discord flavour)

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1476452614685196450/G-DztcCMH6U28-hOIPHx8UBn_qDPD711-tbb6zZVMaOAUDsaDhJYgct8A_oAfxJM7P-s"

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
