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

MESSAGE="🧠 **${TITLE}**

${BODY}

_Moltbook Weekly Review • OpenClaw Alfred_"
ACK_ID="moltbook-$(date +%s)"

if bash "$SCRIPT_DIR/notify-with-ack.sh" \
  --webhook DISCORD_WEBHOOK_MOLTBOOK \
  --message "$MESSAGE" \
  --ack-id "$ACK_ID" \
  --source "moltbook-discord-notify.sh"; then
  echo "✅ Posted to Discord (ack_id=$ACK_ID)"
else
  echo "❌ Discord post failed (ack_id=$ACK_ID)" >&2
  exit 1
fi
