#!/bin/bash
# self-improvement-notification-discipline.sh — advisory scoring for notification quality
# Usage: bash scripts/self-improvement-notification-discipline.sh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
SRC="$WORKSPACE/goals/notifications.json"
OUT="$WORKSPACE/memory/notification-discipline-report.json"

if [[ ! -f "$SRC" ]]; then
  echo '[]' > "$OUT"
  echo "⚠️  notifications.json missing, wrote empty report"
  exit 0
fi

jq '
  def text_fields: [(.title // ""), (.message // ""), (.source // ""), (.next_action // ""), (.status // "")]
    | map(tostring)
    | join(" ");
  def asks_joe($text): $text | test("waiting on you|you need to do|please reply|decision needed|what you need to do|can you|could you|approve|reply|provide|update|choose|decide|share with me|message me|your task|clarification needed|blocked on clarification|question"; "i");
  map(select((.answered // false) != true))
  | map(
      (text_fields) as $text
      | {
          title: (.title // .message // "(untitled)"),
          createdAt: (.createdAt // .created_at // "unknown"),
          urgency: (
            if ($text | test("URGENT|CRITICAL|BLOCKER"; "i")) then "high"
            else "normal" end
          ),
          likely_owner: (
            if ((.waitingOn // "") != "") then .waitingOn
            elif asks_joe($text) then "joe"
            elif ((.assigned_to // "") != "") then .assigned_to
            else "alfred" end
          ),
          recommended_route: (
            if ($text | test("URGENT|CRITICAL|BLOCKER"; "i")) then "send-now"
            elif asks_joe($text) then "send-now"
            else "digest" end
          )
        }
    )
' "$SRC" > "$OUT"

echo "✅ Wrote $OUT"
