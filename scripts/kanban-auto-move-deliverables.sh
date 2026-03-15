#!/bin/bash
# kanban-auto-move-deliverables.sh — Auto-move completed deliverable cards (Review→Done)
# Purpose: Enforce Joe's Feb 27 directive — completed HAL deliverables auto-move without waiting for approval
# Runs: Periodically (via cron or idle-dispatch) to prevent review backlog

DASHBOARD_API="http://localhost:3001/api/kanban"

# Fetch all review-column cards
REVIEW_CARDS=$(curl -s "$DASHBOARD_API" 2>/dev/null | jq -r '.[] | select(.column == "review") | @json' 2>/dev/null)

if [ -z "$REVIEW_CARDS" ]; then
  exit 0
fi

MOVED_COUNT=0

# For each review card, check if it's a completed deliverable
while IFS= read -r card_json; do
  CARD_ID=$(echo "$card_json" | jq -r '.id' 2>/dev/null)
  CARD_TITLE=$(echo "$card_json" | jq -r '.title' 2>/dev/null)
  CARD_DESC=$(echo "$card_json" | jq -r '.description // ""' 2>/dev/null)
  CARD_LABELS=$(echo "$card_json" | jq -r '.labels | join(",") // ""' 2>/dev/null)
  CARD_CHECKLIST=$(echo "$card_json" | jq -r '.checklist // []' 2>/dev/null)
  
  # Heuristics to detect completed deliverables:
  # 1. Card has "deliverable" label
  # 2. Card description contains "## Deliverables" section with completion markers
  # 3. Card checklist is 100% complete
  
  IS_DELIVERABLE=0
  IS_COMPLETE=0
  
  # Check for "deliverable" label
  if [[ "$CARD_LABELS" == *"deliverable"* ]]; then
    IS_DELIVERABLE=1
  fi
  
  # Check if description has deliverables section with completion markers
  if [[ "$CARD_DESC" == *"## Deliverables"* ]]; then
    IS_DELIVERABLE=1
    # Count checklist: if all items are checked (✅ or [x]), mark complete
    CHECKLIST_ITEMS=$(echo "$CARD_CHECKLIST" | jq -r '.[] | select(.text != null) | .text' 2>/dev/null | wc -l)
    CHECKLIST_DONE=$(echo "$CARD_CHECKLIST" | jq -r '.[] | select(.completed == true) | .text' 2>/dev/null | wc -l)
    
    if [ "$CHECKLIST_ITEMS" -gt 0 ] && [ "$CHECKLIST_ITEMS" -eq "$CHECKLIST_DONE" ]; then
      IS_COMPLETE=1
    fi
  fi
  
  # Move to done if it's a completed deliverable
  if [ "$IS_DELIVERABLE" = "1" ] && [ "$IS_COMPLETE" = "1" ]; then
    MOVE_API="http://localhost:3001/api/kanban/${CARD_ID}/move"
    MOVE_JSON=$(python3 -c "import json; print(json.dumps({'toColumn': 'done', 'skipNotify': True}))" 2>/dev/null)
    
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$MOVE_API" \
      -H "Content-Type: application/json" \
      -d "$MOVE_JSON" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "AUTO-MOVED: '$CARD_TITLE' → done (completed deliverable)"
      ((MOVED_COUNT++))
    fi
  fi
done < <(echo "$REVIEW_CARDS")

# Log summary
if [ "$MOVED_COUNT" -gt 0 ]; then
  echo "✅ Kanban auto-move: $MOVED_COUNT completed deliverables moved to done"
fi
