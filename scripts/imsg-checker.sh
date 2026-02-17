#!/bin/bash
# Simple iMessage checker - runs frequently, spawns responders for new messages

CHAT_ID=1
MEMORY_DIR="$HOME/.openclaw/workspace/memory"
TRACKER="$MEMORY_DIR/imsg-last-seen.json"

mkdir -p "$MEMORY_DIR"
[ ! -f "$TRACKER" ] && echo '{"lastId": 0}' > "$TRACKER"

while true; do
  # Get latest messages
  latest=$(imsg history --chat-id "$CHAT_ID" --limit 1 --json 2>/dev/null)
  [ -z "$latest" ] && sleep 5 && continue
  
  msg_id=$(echo "$latest" | jq -r '.id // 0')
  is_from_me=$(echo "$latest" | jq -r '.is_from_me // false')
  text=$(echo "$latest" | jq -r '.text // ""')
  
  last_id=$(cat "$TRACKER" | jq -r '.lastId // 0')
  
  # New incoming message
  if [ "$msg_id" -gt "$last_id" ] && [ "$is_from_me" = "false" ] && [ -n "$text" ]; then
    echo "{\"lastId\": $msg_id}" > "$TRACKER"
    
    # Spawn responder via local function call (not CLI)
    # This will be picked up by the agent
    echo "NEW_IMSG:$text" > /tmp/imsg-pending.txt
  fi
  
  sleep 5  # Check every 5 seconds
done
