#!/bin/bash
# self-improvement-loop-closure.sh — classify work into closure states without mutating source systems
# Usage: bash scripts/self-improvement-loop-closure.sh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
OUT="$WORKSPACE/memory/self-improvement-loop-closure.json"
API="http://localhost:3001/api/kanban"

data=$(curl -s --max-time 10 "$API" 2>/dev/null || echo '[]')
if ! echo "$data" | jq -e . >/dev/null 2>&1; then
  echo '[]' > "$OUT"
  echo "⚠️  Kanban API unavailable, wrote empty closure snapshot"
  exit 0
fi

echo "$data" | jq '
  map({
    id: .id,
    title: .title,
    column: .column,
    closure_state: (
      if .column == "done" then "closed"
      elif .column == "review" then "built"
      elif .column == "blocked" then "blocked"
      elif .column == "in_progress" then "planned"
      else "planned" end
    ),
    needs_followup: (if .column == "review" or .column == "blocked" then true else false end)
  })
' > "$OUT"

echo "✅ Wrote $OUT"
