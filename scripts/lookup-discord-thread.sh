#!/bin/bash
# lookup-discord-thread.sh — Look up thread context when processing a Discord reply
#
# Called by Alfred when he receives a Discord message and needs context.
# Searches by thread ID, channel ID, or keyword in topic.
#
# Usage:
#   lookup-discord-thread.sh <thread-or-channel-id>
#   lookup-discord-thread.sh --search "growth audit"
#   lookup-discord-thread.sh --recent 5
#
# Returns the thread digest content if found, or "NO_MATCH" if not.
# Alfred should read the output and use it as context for his reply.

set -euo pipefail

THREADS_DIR="$HOME/.openclaw/workspace/discord-threads"
MANIFEST="$THREADS_DIR/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "NO_MATCH: No thread manifest found"
  exit 0
fi

MODE="lookup"
QUERY=""
RECENT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --search) MODE="search"; QUERY="$2"; shift 2 ;;
    --recent) MODE="recent"; RECENT="${2:-5}"; shift 2 ;;
    --list) MODE="list"; shift ;;
    *) QUERY="$1"; shift ;;
  esac
done

case "$MODE" in
  lookup)
    # Direct lookup by thread/channel ID
    THREAD_FILE="$THREADS_DIR/${QUERY}.md"
    if [[ -f "$THREAD_FILE" ]]; then
      cat "$THREAD_FILE"
    else
      # Try partial match in manifest
      MATCH=$(python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
for k, v in m.items():
    if '$QUERY' in k or '$QUERY' in v.get('topic','').lower():
        print(v['file'])
        break
else:
    print('')
" 2>/dev/null)
      if [[ -n "$MATCH" && -f "$THREADS_DIR/$MATCH" ]]; then
        cat "$THREADS_DIR/$MATCH"
      else
        echo "NO_MATCH: Thread ID '$QUERY' not found in manifest"
      fi
    fi
    ;;

  search)
    # Search by keyword in topic
    python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
query = '$QUERY'.lower()
matches = [(k, v) for k, v in m.items() if query in v.get('topic','').lower()]
if not matches:
    print('NO_MATCH: No threads match \"$QUERY\"')
else:
    for k, v in matches[:5]:
        print(f'[{v[\"updatedAt\"][:10]}] {v[\"topic\"]} ({v[\"parts\"]} parts) → {v[\"file\"]}')
" 2>/dev/null
    ;;

  recent)
    # Show N most recent threads
    python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
sorted_threads = sorted(m.items(), key=lambda x: x[1].get('updatedAt',''), reverse=True)[:$RECENT]
for k, v in sorted_threads:
    print(f'[{v[\"updatedAt\"][:10]}] {v[\"topic\"]} ({v[\"parts\"]} parts) → {v[\"file\"]}')
" 2>/dev/null
    ;;

  list)
    # List all threads
    python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
for k, v in sorted(m.items(), key=lambda x: x[1].get('updatedAt',''), reverse=True):
    print(f'[{v[\"updatedAt\"][:10]}] {k}: {v[\"topic\"]} ({v[\"parts\"]} parts)')
" 2>/dev/null
    ;;
esac
