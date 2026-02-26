#!/usr/bin/env bash
# coinusup-discord-notify.sh - Post CoinUsUp audit/updates to Discord webhook
# Usage: bash coinusup-discord-notify.sh "Title" "Body text"

DISCORD_WEBHOOK="https://discord.com/api/webhooks/1476457667542122577/Wk-o7UOsakQ9juR9_f6CjlKaoOUtTsifeixj1B8i4q_EETBLCSpkvheElI3cMZmeT5SE"

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
