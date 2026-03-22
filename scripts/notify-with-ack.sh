#!/bin/bash
# notify-with-ack.sh — Send a Discord webhook notification with retry + delivery tracking.
#
# Wraps Discord webhook calls with:
#   - 3 retries, 5s exponential backoff (5s, 10s, 20s)
#   - Delivery state logged to .hal-notify-ack/ack-log.jsonl
#   - Exit 0 on success, 1 on permanent failure
#   - Alfred monitoring via check-notify-ack.sh
#
# Usage:
#   notify-with-ack.sh --webhook <url_or_env_var> --message "text" [--title "title"] [--ack-id "unique-id"]
#   notify-with-ack.sh --webhook DISCORD_WEBHOOK_HAL_COMPLETIONS --message "Done" --ack-id "hal-task-123"
#
# Options:
#   --webhook     Webhook URL or env var name (resolved from .env if not a URL)
#   --message     Message body (required)
#   --title       Optional title prefix (bold in Discord)
#   --ack-id      Unique ID for delivery tracking (auto-generated if omitted)
#   --source      Script/context that triggered this notification (for audit)
#   --dry-run     Print what would be sent without actually sending

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
ENV_FILE="$WORKSPACE/.env"
ACK_DIR="$WORKSPACE/.hal-notify-ack"
ACK_LOG="$ACK_DIR/ack-log.jsonl"
ERR_LOG="$ACK_DIR/error-log.jsonl"

mkdir -p "$ACK_DIR"
[[ -f "$ENV_FILE" ]] && set -a && source "$ENV_FILE" && set +a 2>/dev/null || true

# ── Argument parsing ─────────────────────────────────────────────────────────
WEBHOOK_ARG=""
MESSAGE=""
TITLE=""
ACK_ID=""
SOURCE_LABEL="${BASH_SOURCE[-1]:-unknown}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --webhook)  WEBHOOK_ARG="$2"; shift 2 ;;
    --message)  MESSAGE="$2";     shift 2 ;;
    --title)    TITLE="$2";       shift 2 ;;
    --ack-id)   ACK_ID="$2";      shift 2 ;;
    --source)   SOURCE_LABEL="$2";shift 2 ;;
    --dry-run)  DRY_RUN=true;     shift ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$WEBHOOK_ARG" || -z "$MESSAGE" ]]; then
  echo "Usage: notify-with-ack.sh --webhook <url|ENV_VAR> --message \"text\" [--title \"t\"] [--ack-id id]" >&2
  exit 1
fi

# Resolve webhook — accept raw URL or env var name
if [[ "$WEBHOOK_ARG" =~ ^https?:// ]]; then
  WEBHOOK_URL="$WEBHOOK_ARG"
else
  WEBHOOK_URL="${!WEBHOOK_ARG:-}"
  if [[ -z "$WEBHOOK_URL" ]]; then
    echo "ERROR: env var '$WEBHOOK_ARG' is not set or empty" >&2
    exit 1
  fi
fi

# Generate ACK ID if not provided
if [[ -z "$ACK_ID" ]]; then
  ACK_ID="notify-$(date +%s)-$(python3 -c 'import random,string; print("".join(random.choices(string.ascii_lowercase, k=6)))')"
fi

# Build full message
if [[ -n "$TITLE" ]]; then
  FULL_MESSAGE="**${TITLE}**
${MESSAGE}"
else
  FULL_MESSAGE="$MESSAGE"
fi

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
log_ack() {
  local status="$1" attempt="$2" err="${3:-}"
  python3 -c "
import json, sys
entry = {
    'ack_id': sys.argv[1],
    'status': sys.argv[2],
    'attempt': int(sys.argv[3]),
    'ts': sys.argv[4],
    'source': sys.argv[5],
    'error': sys.argv[6] if sys.argv[6] else None,
}
print(json.dumps(entry))
" "$ACK_ID" "$status" "$attempt" "$(ts)" "$SOURCE_LABEL" "$err" >> "$ACK_LOG"
}

# ── Retry logic ───────────────────────────────────────────────────────────────
MAX_RETRIES=3
BACKOFF=(5 10 20)   # seconds between attempts
SUCCESS=false

for attempt in 1 2 3; do
  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY-RUN] Would POST to webhook (ack_id=$ACK_ID):"
    echo "  $FULL_MESSAGE"
    log_ack "dry_run" "$attempt"
    SUCCESS=true
    break
  fi

  PAYLOAD=$(python3 -c "import json,sys; print(json.dumps({'content': sys.argv[1]}))" "$FULL_MESSAGE")

  HTTP_CODE=$(curl -s -o /tmp/notify-ack-response.txt -w "%{http_code}" \
    -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    --max-time 15 \
    --retry 0 2>/tmp/notify-ack-curl-err.txt || echo "000")

  RESPONSE=$(cat /tmp/notify-ack-response.txt 2>/dev/null || echo "")
  CURL_ERR=$(cat /tmp/notify-ack-curl-err.txt 2>/dev/null || echo "")

  if [[ "$HTTP_CODE" =~ ^2 ]]; then
    # Success
    log_ack "delivered" "$attempt"
    echo "✅ Notification delivered (ack_id=$ACK_ID, attempt=$attempt, HTTP=$HTTP_CODE)"
    SUCCESS=true
    break
  elif [[ "$HTTP_CODE" == "429" ]]; then
    # Rate limited — honour retry-after header if present
    RETRY_AFTER=$(grep -i "retry-after" /tmp/notify-ack-response.txt 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "${BACKOFF[$((attempt-1))]}")
    log_ack "rate_limited" "$attempt" "HTTP 429, retry after ${RETRY_AFTER}s"
    echo "⚠️  Rate limited (attempt $attempt). Waiting ${RETRY_AFTER}s..."
    sleep "$RETRY_AFTER"
  elif [[ "$HTTP_CODE" == "000" ]]; then
    ERR_MSG="curl error: ${CURL_ERR:-network failure}"
    log_ack "failed" "$attempt" "$ERR_MSG"
    echo "⚠️  Network error (attempt $attempt): $ERR_MSG"
    [[ $attempt -lt $MAX_RETRIES ]] && sleep "${BACKOFF[$((attempt-1))]}"
  else
    ERR_MSG="HTTP $HTTP_CODE: ${RESPONSE:0:200}"
    log_ack "failed" "$attempt" "$ERR_MSG"
    echo "⚠️  Failed (attempt $attempt): $ERR_MSG"
    # 4xx (not 429) → permanent failure, no retry
    if [[ "$HTTP_CODE" =~ ^4 ]]; then
      echo "❌ Permanent failure (HTTP $HTTP_CODE). No further retries."
      break
    fi
    [[ $attempt -lt $MAX_RETRIES ]] && sleep "${BACKOFF[$((attempt-1))]}"
  fi
done

if [[ "$SUCCESS" == false ]]; then
  # Final failure — log to error log for monitoring
  python3 -c "
import json, sys
entry = {
    'ack_id': sys.argv[1],
    'status': 'UNDELIVERED',
    'ts': sys.argv[2],
    'source': sys.argv[3],
    'message_preview': sys.argv[4][:120],
}
print(json.dumps(entry))
" "$ACK_ID" "$(ts)" "$SOURCE_LABEL" "$FULL_MESSAGE" >> "$ERR_LOG"
  echo "❌ Notification undelivered after $MAX_RETRIES attempts (ack_id=$ACK_ID). Logged to $ERR_LOG"
  exit 1
fi
