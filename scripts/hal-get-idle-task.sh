#!/bin/bash
# hal-get-idle-task.sh
# Finds the best task from Kanban To Do column that qualifies for HAL routing.
# Outputs JSON: { task_id, title, description, priority, confidence } or empty string.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTER="$SCRIPT_DIR/hal-alfred-route-auto.sh"
API="http://localhost:3001/api/kanban"
HAL_SKILLS_FILE="$SCRIPT_DIR/hal-skills.json"

# Phase 3 change: do NOT block HAL dispatch just because cards exist in in_progress.
# HAL should continue pulling actionable To Do cards even when in_progress contains
# stale/unactionable/waiting cards. Queue lockup prevention > strict single-slot blocking.
BOARD_JSON=$(curl -s "$API")

# Get To Do cards using correct board structure
TODO_JSON=$(echo "$BOARD_JSON" | python3 -c "
import sys, json
board = json.load(sys.stdin)
cards = board.get('columns', {}).get('todo', [])
print(json.dumps(cards))
" 2>/dev/null)

if [[ -z "$TODO_JSON" || "$TODO_JSON" == "[]" ]]; then
  echo "" ; exit 0
fi

match_hal_skill() {
  local task_text="$1"

  [[ -f "$HAL_SKILLS_FILE" ]] || { echo ""; return 0; }

  python3 - "$HAL_SKILLS_FILE" "$task_text" <<'PY' 2>/dev/null || true
import json, re, sys

skills_file = sys.argv[1]
text = (sys.argv[2] or "").lower()
text = re.sub(r"\s+", " ", text)

try:
    data = json.load(open(skills_file, "r", encoding="utf-8"))
except Exception:
    print("")
    raise SystemExit(0)

for blocked in data.get("alfredOnlyKeywords", []):
    if blocked.lower() in text:
        print("")
        raise SystemExit(0)

best = None
for s in data.get("skills", []):
    keywords = [k.lower() for k in s.get("keywords", [])]
    hits = [k for k in keywords if k in text]
    if not hits:
        continue
    conf = float(s.get("confidence", data.get("defaultConfidence", 0.9)))
    candidate = {
        "name": s.get("name", "unknown"),
        "confidence": conf,
        "hits": hits,
    }
    if best is None or len(candidate["hits"]) > len(best["hits"]) or (
        len(candidate["hits"]) == len(best["hits"]) and candidate["confidence"] > best["confidence"]
    ):
        best = candidate

if not best:
    print("")
else:
    print(json.dumps(best, ensure_ascii=False))
PY
}

# Score each card; pick first that routes to HAL
while IFS= read -r card; do
  CARD_ID=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  TITLE=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null)
  DESC=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null)
  PRIORITY=$(echo "$card" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null)

  [[ -z "$CARD_ID" || -z "$TITLE" ]] && continue

  TASK_TEXT="$TITLE. $DESC"

  SKILL_MATCH_JSON=$(match_hal_skill "$TASK_TEXT")
  if [[ -n "$SKILL_MATCH_JSON" ]]; then
    ROUTE="HAL"
    CONFIDENCE=$(echo "$SKILL_MATCH_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence',0.92))" 2>/dev/null)
  else
    ROUTE_JSON=$("$ROUTER" --text "$TASK_TEXT" --json 2>/dev/null || echo '{"route":"Alfred"}')
    ROUTE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('route','Alfred'))" 2>/dev/null)
    CONFIDENCE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('confidence',0))" 2>/dev/null)
  fi

  if [[ "$ROUTE" == "HAL" ]]; then
    python3 -c "
import json,sys
title=sys.argv[1]; desc=sys.argv[2]; cid=sys.argv[3]; pri=sys.argv[4]; conf=sys.argv[5]
print(json.dumps({'task_id':cid,'title':title,'description':desc,'priority':pri,'confidence':float(conf)}))
" "$TITLE" "$DESC" "$CARD_ID" "$PRIORITY" "$CONFIDENCE"
    exit 0
  fi
done < <(echo "$TODO_JSON" | python3 -c "
import sys,json
for c in json.load(sys.stdin):
    print(json.dumps(c))
")

echo ""
