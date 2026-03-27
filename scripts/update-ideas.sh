#!/bin/bash
# update-ideas.sh — Safely update ideas.json with JSON validation

set -euo pipefail

IDEAS_FILE="$HOME/.openclaw/workspace/goals/ideas.json"

if [[ ! -f "$IDEAS_FILE" ]]; then
  echo "❌ ideas.json not found at $IDEAS_FILE"
  exit 1
fi

# Function to safely update an idea field by ID
update_idea() {
  local idea_id="$1"
  local field="$2"
  local value="$3"
  
  # Use jq to safely update the JSON
  local temp_file=$(mktemp)
  trap "rm -f $temp_file" EXIT
  
  if jq --arg id "$idea_id" --arg fld "$field" --arg val "$value" \
    '(.[] | select(.id == $id) | .[$fld]) |= $val' "$IDEAS_FILE" > "$temp_file"; then
    
    # Validate the result is valid JSON
    if jq empty "$temp_file" 2>/dev/null; then
      mv "$temp_file" "$IDEAS_FILE"
      echo "✅ Updated idea '$idea_id' field '$field'"
      return 0
    else
      echo "❌ Resulting JSON is invalid"
      return 1
    fi
  else
    echo "❌ jq update failed"
    return 1
  fi
}

# Function to add a new idea
add_idea() {
  local temp_file=$(mktemp)
  trap "rm -f $temp_file" EXIT
  
  cat > "$temp_file" << 'EOF'
{
  "id": "NEW_ID_HERE",
  "title": "New Idea",
  "description": "Description here",
  "category": "passive-income",
  "status": "active",
  "effort": "medium",
  "potential": "medium",
  "evaluation": {
    "score": 0,
    "notes": "To be evaluated"
  }
}
EOF

  if jq '. += [input]' "$IDEAS_FILE" "$temp_file" > "${IDEAS_FILE}.tmp"; then
    if jq empty "${IDEAS_FILE}.tmp" 2>/dev/null; then
      mv "${IDEAS_FILE}.tmp" "$IDEAS_FILE"
      echo "✅ Added new idea"
      return 0
    else
      rm -f "${IDEAS_FILE}.tmp"
      echo "❌ Resulting JSON is invalid"
      return 1
    fi
  else
    echo "❌ Failed to add idea"
    return 1
  fi
}

# Function to validate JSON
validate_json() {
  if jq empty "$IDEAS_FILE" 2>/dev/null; then
    echo "✅ ideas.json is valid JSON"
    return 0
  else
    echo "❌ ideas.json has JSON syntax errors"
    jq . "$IDEAS_FILE" 2>&1 | head -10
    return 1
  fi
}

case "${1:-}" in
  validate)
    validate_json
    ;;
  update)
    if [[ $# -lt 4 ]]; then
      echo "Usage: $0 update <idea_id> <field> <value>"
      exit 1
    fi
    update_idea "$2" "$3" "$4"
    ;;
  add)
    add_idea
    ;;
  *)
    echo "Usage: $0 {validate|update <id> <field> <value>|add}"
    exit 1
    ;;
esac
