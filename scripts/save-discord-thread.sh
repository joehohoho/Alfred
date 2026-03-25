#!/bin/bash
# save-discord-thread.sh — Save a thread digest when Alfred posts to Discord
#
# Creates a compact file per thread that can be loaded on-demand when Joe replies.
# Files are tiny (~1-5KB each) and NOT loaded into context unless needed.
#
# Usage:
#   save-discord-thread.sh <thread-id> <topic> <content-file-or-stdin>
#   echo "message content" | save-discord-thread.sh <thread-id> <topic>
#   save-discord-thread.sh <thread-id> <topic> --content "inline content"
#   save-discord-thread.sh <thread-id> <topic> --append "additional part"
#
# Thread IDs: Use the Discord channel/thread ID, or a human-readable key.
# Files stored at: ~/.openclaw/workspace/discord-threads/<thread-id>.md

set -euo pipefail

THREADS_DIR="$HOME/.openclaw/workspace/discord-threads"
MANIFEST="$THREADS_DIR/manifest.json"
mkdir -p "$THREADS_DIR"

THREAD_ID="${1:-}"
TOPIC="${2:-}"
CONTENT=""
MODE="create"

# Parse args
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --content) CONTENT="$2"; shift 2 ;;
    --append) CONTENT="$2"; MODE="append"; shift 2 ;;
    --card) CARD_ID="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Read from stdin if no content provided
if [[ -z "$CONTENT" ]]; then
  if [[ ! -t 0 ]]; then
    CONTENT=$(cat)
  fi
fi

if [[ -z "$THREAD_ID" || -z "$TOPIC" ]]; then
  echo "Usage: save-discord-thread.sh <thread-id> <topic> [--content \"...\"] [--append \"...\"] [--card <cardId>]"
  exit 1
fi

THREAD_FILE="$THREADS_DIR/${THREAD_ID}.md"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ "$MODE" == "append" && -f "$THREAD_FILE" ]]; then
  # Append a new part to existing thread
  PART_NUM=$(grep -c "^## Part" "$THREAD_FILE" 2>/dev/null || echo "0")
  NEXT_PART=$((PART_NUM + 1))
  echo "" >> "$THREAD_FILE"
  echo "## Part $NEXT_PART (${NOW})" >> "$THREAD_FILE"
  echo "$CONTENT" >> "$THREAD_FILE"
else
  # Create new thread file
  cat > "$THREAD_FILE" <<EOF
# Thread: ${TOPIC}
Posted: ${NOW}
${CARD_ID:+Card: ${CARD_ID}}
Thread ID: ${THREAD_ID}

## Part 1
${CONTENT}
EOF
fi

# Update manifest (compact index for quick lookup)
python3 -c "
import json, os, sys

manifest_path = '$MANIFEST'
try:
    with open(manifest_path) as f:
        manifest = json.load(f)
except:
    manifest = {}

manifest['$THREAD_ID'] = {
    'topic': '$TOPIC',
    'file': '${THREAD_ID}.md',
    'updatedAt': '$NOW',
    'parts': int('$(grep -c "^## Part" "$THREAD_FILE" 2>/dev/null || echo "1")'),
}

# Prune entries older than 60 days
from datetime import datetime, timedelta
cutoff = (datetime.utcnow() - timedelta(days=60)).isoformat() + 'Z'
manifest = {k: v for k, v in manifest.items() if v.get('updatedAt', '') > cutoff or k == '$THREAD_ID'}

with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2)
" 2>/dev/null

echo "Thread digest saved: $THREAD_FILE"
