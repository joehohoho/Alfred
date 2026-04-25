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
  DIRTY_REPOS=0
  DIRTY_REPO_LINES=()
  for repo in ~/command-center ~/job-tracker ~/market-signal-lab ~/CoinUsUp; do
    if [[ -d "$repo" ]]; then
      status=$(cd "$repo" && git status --short 2>/dev/null | wc -l | tr -d ' ')
      if [[ $status -eq 0 ]]; then
        echo "✅ **$(basename "$repo"):** Clean"
      else
        echo "⚠️ **$(basename "$repo"):** $status file(s) modified"
        DIRTY_REPOS=$((DIRTY_REPOS + 1))
        DIRTY_REPO_LINES+=("$(basename "$repo") ($status modified)")
      fi
    fi
  done
  echo ""
  if [[ "$DIRTY_REPOS" -gt 0 ]]; then
    echo "**Action:** Review modified repos: ${DIRTY_REPO_LINES[*]}"
  else
    echo "**Action:** None required"
  fi
  echo ""
  echo "---"
  echo ""
  echo "## 2. Unanswered Notifications (>24h old)"
  echo ""

  # Check for old notifications, grouped by actionable topic instead of exact
  # title text so repeated reminders with slightly different wording collapse.
  if [[ -f "$WORKSPACE/goals/notifications.json" ]]; then
    SUMMARY_JSON=$(jq -r '
      def parse_ts:
        if . == null then null
        elif (type == "number") then (if . > 9999999999 then (. / 1000) else . end)
        elif (type == "string") then ((sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601?) // (fromdateiso8601?) // null)
        else null end;
      def created_ts:
        (.createdAt // .timestamp // .ts // .updatedAt) | parse_ts;
      def text_blob:
        [(.title // ""), (.message // ""), (.source // ""), (.sourceTag // ""), (.waitingOn // .waiting_on // ""), (.taskId // ""), (.goalId // ""), (.cardId // "")]
        | map(tostring | ascii_downcase)
        | join(" ");
      def classify_waiting_on:
        text_blob as $t
        | if (.waitingOn // .waiting_on // "") != "" then (.waitingOn // .waiting_on)
          elif ($t | test("waiting on you|you need to do|please reply|decision needed|what you need to do|can you|could you|would you|should i|approve|provide|update|reply with|your decision|need your decision|need your approval|scope clarification|clarification needed|which option|a or b|stripe|dashboard|manual config|manual task|unblocks testing")) then "joe"
          elif ((.source // .sourceTag // "") | tostring | ascii_downcase | test("^daily-inquiry$|daily-inquiry|review-escalation|manual|question|approval|blocker")) then "joe"
          elif ($t | test("[?]|waiting on|blocked on|clarification|approval|approve|decision|reply|respond|provide|update|choose|pick|which|what should|what do you")) then "joe"
          elif (.assigned_to // "") != "" then .assigned_to
          else "alfred"
          end;
      def topic_key:
        text_blob as $t
        | if (.taskId // .cardId // "") != "" then "card:" + (.taskId // .cardId)
          elif ($t | test("task_[0-9]+_[a-z0-9]+")) then "card:" + (($t | capture("(?<id>task_[0-9]+_[a-z0-9]+)").id) // "unknown")
          elif ($t | test("stripe") and ($t | test("trial|price|prices|14-day|14 day|coinusup"))) then "topic:coinusup-trial-stripe"
          elif ($t | test("bill review|invoice audit|build direction|personal tool|saas mvp|option a|option b")) then "topic:bill-review-scope"
          elif ($t | test("grant writer|4-week mvp build|go/no-go|go/no go")) then "topic:grant-writer-go-no-go"
          elif ($t | test("freshness scanner|superseded|contradiction zones|archive")) then "topic:freshness-cleanup"
          elif ($t | test("trader signal|spec documents|development sprint|blueprint|tech spec|mvp plan|bootstrap guide|executive summary")) then "topic:trader-signal-approval"
          else "title:" + ((.title // "(no title)") | gsub("\\s+"; " ") | ascii_downcase)
          end;
      def topic_label:
        if .topicKey == "topic:coinusup-trial-stripe" then "CoinUsUp trial Stripe unblock"
        elif .topicKey == "topic:bill-review-scope" then "Bill Review scope decision"
        elif .topicKey == "topic:grant-writer-go-no-go" then "AI Grant Writer go/no-go"
        elif .topicKey == "topic:freshness-cleanup" then "Freshness cleanup follow-up"
        elif .topicKey == "topic:trader-signal-approval" then "Trader Signal approval"
        else (.title // "(no title)")
        end;
      def is_superseded_or_archived:
        text_blob as $t
        | (
            ($t | test("\\bsuperseded\\b|\\barchiv(?:e|ed|ing)\\b|obsolete|no longer relevant|replaced by"))
            or ((.status // "") | tostring | ascii_downcase | test("superseded|archived|obsolete"))
            or ((.deliveryStatus // "") | tostring | ascii_downcase | test("superseded|archived"))
          );
      . as $root
      | (if ($root | type) == "array" then $root elif ($root | type) == "object" and ($root | has("items")) then $root.items else [] end) as $items
      | [$items[]
        | select(.answered == false)
        | select(is_superseded_or_archived | not)
        | . + {
            createdTs: created_ts,
            displayTitle: (.title // "(no title)"),
            waitingOn: classify_waiting_on,
            topicKey: topic_key
          }
        | . + { topicLabel: topic_label }
        | select(.createdTs != null and .createdTs > 1700000000 and .createdTs <= (now + 300))
        | . + { ageHours: ((now - .createdTs) / 3600) }
        | select(.ageHours >= 24)
      ] as $open
      | {
          totalOld: ($open | length),
          deduped: ($open
            | group_by(.topicKey)
            | map(sort_by(.ageHours) | reverse | .[0] + {duplicateCount: length})
            | sort_by(.ageHours) | reverse),
          dedupedCount: ($open | group_by(.topicKey) | length)
        }
    ' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo '{"totalOld":0,"deduped":[],"dedupedCount":0}')

    OLD_COUNT=$(printf '%s' "$SUMMARY_JSON" | jq -r '.totalOld // 0')
    DEDUPED_COUNT=$(printf '%s' "$SUMMARY_JSON" | jq -r '.dedupedCount // 0')

    if [[ "$OLD_COUNT" -gt 0 ]]; then
      echo "⚠️ **$OLD_COUNT unanswered notifications older than 24h ($DEDUPED_COUNT actionable topics)**"
      printf '%s' "$SUMMARY_JSON" | jq -r '
        .deduped[:8][] |
        "- \(.topicLabel) | age: \(.ageHours | floor)h | waiting on: \(.waitingOn)"
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

  KANBAN_JSON=$(curl -s --max-time 5 http://localhost:3001/api/kanban 2>/dev/null || true)
  if [[ -n "$KANBAN_JSON" ]] && printf '%s' "$KANBAN_JSON" | jq -e '.' >/dev/null 2>&1; then
    KANBAN_SUMMARY=$(printf '%s' "$KANBAN_JSON" | jq -r '
      def col_len(name): (.columns[name] // []) | length;
      {
        ideas: col_len("ideas"),
        todo: col_len("todo"),
        in_progress: col_len("in_progress"),
        review: col_len("review"),
        done: col_len("done")
      }
    ' 2>/dev/null || echo '{}')

    KANBAN_TODO=$(printf '%s' "$KANBAN_SUMMARY" | jq -r '.todo // 0')
    KANBAN_IN_PROGRESS=$(printf '%s' "$KANBAN_SUMMARY" | jq -r '.in_progress // 0')
    KANBAN_REVIEW=$(printf '%s' "$KANBAN_SUMMARY" | jq -r '.review // 0')
    KANBAN_DONE=$(printf '%s' "$KANBAN_SUMMARY" | jq -r '.done // 0')

    echo "**Status:** API reachable"
    echo "**Counts:** todo $KANBAN_TODO, in_progress $KANBAN_IN_PROGRESS, review $KANBAN_REVIEW, done $KANBAN_DONE"

    if [[ "$KANBAN_IN_PROGRESS" -gt 0 || "$KANBAN_REVIEW" -gt 0 ]]; then
      echo "**Action:** Check active/review cards for follow-up"
    else
      echo "**Action:** None required"
    fi
  else
    echo "**Status:** Kanban API unavailable"
    echo "**Action:** Check Command Center UI at http://localhost:3002"
  fi
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
  if [[ "${DIRTY_REPOS:-0}" -gt 0 ]]; then
    GIT_STATUS="⚠️ Dirty ($DIRTY_REPOS repo(s))"
    GIT_ACTION="Review modified repos"
  else
    GIT_STATUS="✅ Clean"
    GIT_ACTION="None"
  fi
  echo "| Git repos | $GIT_STATUS | $GIT_ACTION |"
  echo "| Notifications | $NOTIF_STATUS | $NOTIF_ACTION |"
  if [[ -n "${KANBAN_JSON:-}" ]] && printf '%s' "$KANBAN_JSON" | jq -e '.' >/dev/null 2>&1; then
    if [[ "${KANBAN_IN_PROGRESS:-0}" -gt 0 || "${KANBAN_REVIEW:-0}" -gt 0 ]]; then
      KANBAN_STATUS="⚠️ Active"
      KANBAN_ACTION="Review in_progress/review cards"
    else
      KANBAN_STATUS="✅ Clean"
      KANBAN_ACTION="None"
    fi
  else
    KANBAN_STATUS="⚠️ Unavailable"
    KANBAN_ACTION="Check UI manually"
  fi
  echo "| Kanban | $KANBAN_STATUS | $KANBAN_ACTION |"
  echo ""
  echo "**Report generated:** $(date '+%Y-%m-%d %I:%M %p %Z')"
  echo "**Next check:** Idle activity in ~30 min"

} > "$REPORT_FILE"

echo "✓ Workspace health report: $REPORT_FILE"
cat "$REPORT_FILE"
