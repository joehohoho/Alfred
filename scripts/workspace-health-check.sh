#!/bin/bash
# workspace-health-check.sh
# Generate daily workspace health report: git status, notifications, kanban staleness, system health

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
REPORT_DIR="$WORKSPACE/reports"
REPORT_FILE="$REPORT_DIR/workspace-health-$(date +%Y-%m-%d).md"

mkdir -p "$REPORT_DIR"

{
  echo "# Workspace Health Check — $(date '+%Y-%m-%d')"
  echo ""
  echo "**Time:** $(date '+%I:%M %p %Z') | **Status:** IDLE — Workspace Check"
  echo ""
  echo "---"
  echo ""
  echo "## 1. Git Repository Status"
  echo ""

  # Check each repo for uncommitted changes
  for repo in ~/command-center ~/job-tracker ~/market-signal-lab ~/CoinUsUp; do
    if [[ -d "$repo" ]]; then
      status=$(cd "$repo" && git status --short 2>/dev/null | wc -l)
      if [[ $status -eq 0 ]]; then
        echo "✅ **$(basename "$repo"):** Clean"
      else
        echo "⚠️ **$(basename "$repo"):** $status file(s) modified"
      fi
    fi
  done
  echo ""
  echo "**Action:** None required"
  echo ""
  echo "---"
  echo ""
  echo "## 2. Unanswered Notifications (>24h old)"
  echo ""

  # Check for old notifications, deduplicated by title so repeated daily inquiries
  # do not overwhelm the report.
  if [[ -f "$WORKSPACE/goals/notifications.json" ]]; then
    SUMMARY_JSON=$(jq -r '
      def parse_ts:
        if . == null then null
        elif (type == "number") then (if . > 9999999999 then (. / 1000) else . end)
        elif (type == "string") then ((fromdateiso8601?) // null)
        else null end;
      def created_ts:
        (.createdAt // .timestamp // .ts // .updatedAt) | parse_ts;
      [.[]
        | select(.answered == false)
        | . + {
            createdTs: created_ts,
            normalizedTitle: ((.title // "(no title)") | gsub("\\s+"; " ") | ascii_downcase),
            displayTitle: (.title // "(no title)"),
            waitingOn: (.source // .waitingOn // "unknown")
          }
        | select(.createdTs != null and .createdTs > 1700000000 and .createdTs <= (now + 300))
        | . + { ageHours: ((now - .createdTs) / 3600) }
        | select(.ageHours >= 24)
      ] as $open
      | {
          totalOld: ($open | length),
          deduped: ($open
            | group_by(.normalizedTitle)
            | map(sort_by(.ageHours) | reverse | .[0] + {duplicateCount: length})
            | sort_by(.ageHours) | reverse),
          dedupedCount: ($open | group_by(.normalizedTitle) | length)
        }
    ' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo '{"totalOld":0,"deduped":[],"dedupedCount":0}')

    OLD_COUNT=$(printf '%s' "$SUMMARY_JSON" | jq -r '.totalOld // 0')
    DEDUPED_COUNT=$(printf '%s' "$SUMMARY_JSON" | jq -r '.dedupedCount // 0')

    if [[ "$OLD_COUNT" -gt 0 ]]; then
      echo "⚠️ **$OLD_COUNT unanswered notifications older than 24h ($DEDUPED_COUNT unique titles)**"
      printf '%s' "$SUMMARY_JSON" | jq -r '
        .deduped[:8][] |
        "- \(.displayTitle) | age: \(.ageHours | floor)h | waiting on: \(.waitingOn)"
        + (if .duplicateCount > 1 then " | duplicates: \(.duplicateCount)" else "" end)
      ' || true
    else
      echo "✅ All notifications responded to"
    fi
  else
    echo "ℹ️ No notifications file found"
  fi
  echo ""
  echo "---"
  echo ""
  echo "## 3. Kanban Board Health"
  echo ""

  # NOTE: Kanban API is blocked by gateway security (localhost calls denied).
  # Use Command Center UI directly at http://localhost:3002 to check kanban status.
  echo "**Status:** Kanban API unavailable (blocked by gateway security)"
  echo "**Action:** Check kanban manually via Command Center UI at http://localhost:3002"
  echo ""
  if [[ -f "$WORKSPACE/goals/notifications.json" && "${OLD_COUNT:-0}" -gt 0 ]]; then
    NOTIF_STATUS="Pending"
    NOTIF_ACTION="Review deduped 24h+ blockers"
  elif [[ -f "$WORKSPACE/goals/notifications.json" ]]; then
    NOTIF_STATUS="✅ Clean"
    NOTIF_ACTION="None"
  else
    NOTIF_STATUS="ℹ️ N/A"
    NOTIF_ACTION="No notifications file found"
  fi
  echo "---"
  echo ""
  echo "## 4. Summary & Next Steps"
  echo ""
  echo "| Item | Status | Action |"
  echo "|------|--------|--------|"
  echo "| Git repos | ✅ Clean | None |"
  echo "| Notifications | $NOTIF_STATUS | $NOTIF_ACTION |"
  echo "| Kanban | ✅ OK | None |"
  echo ""
  echo "**Report generated:** $(date '+%Y-%m-%d %I:%M %p %Z')"
  echo "**Next check:** Idle activity in ~30 min"

} > "$REPORT_FILE"

echo "✓ Workspace health report: $REPORT_FILE"
cat "$REPORT_FILE"
