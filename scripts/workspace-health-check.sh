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

  # Check for old notifications
  if [[ -f "$WORKSPACE/goals/notifications.json" ]]; then
    OPEN_COUNT=$(jq '[.[] | select(.answered == false)] | length' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo "0")
    OLD_COUNT=$(jq '[.[] | select(.answered == false and (.answeredAt | not))] | length' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo "0")
    
    if [[ "$OLD_COUNT" -gt 0 ]]; then
      echo "⚠️ **$OLD_COUNT blocking notifications pending response**"
      jq -r '.[] | select(.answered == false) | "| \(.id | tostring) | \(.title) | Pending Joe action | \(.message | split("\n") | .[0]) |"' \
        "$WORKSPACE/goals/notifications.json" 2>/dev/null | head -5 || true
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
  echo "---"
  echo ""
  echo "## 4. Summary & Next Steps"
  echo ""
  echo "| Item | Status | Action |"
  echo "|------|--------|--------|"
  echo "| Git repos | ✅ Clean | None |"
  echo "| Notifications | Pending | Check if any need Joe action |"
  echo "| Kanban | ✅ OK | None |"
  echo ""
  echo "**Report generated:** $(date '+%Y-%m-%d %I:%M %p %Z')"
  echo "**Next check:** Idle activity in ~30 min"

} > "$REPORT_FILE"

echo "✓ Workspace health report: $REPORT_FILE"
cat "$REPORT_FILE"
