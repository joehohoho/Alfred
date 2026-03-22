#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="$WORKSPACE_DIR/data"
OUT_JSON="$DATA_DIR/cc-telemetry.json"

mkdir -p "$DATA_DIR"

collect_files() {
  local days="$1"
  find "$WORKSPACE_DIR/logs" "$WORKSPACE_DIR/tracking" -type f -mtime "-$days" 2>/dev/null || true
}

FILES_7D="$(collect_files 7)"
FILES_30D="$(collect_files 30)"

count_matches() {
  local regex="$1"
  local files_text="$2"
  if [[ -z "$files_text" ]]; then
    echo 0
    return
  fi
  # shellcheck disable=SC2086
  local n
  n=$(echo "$files_text" | xargs grep -Eho "$regex" 2>/dev/null | wc -l | tr -d ' ' || true)
  echo "${n:-0}"
}

last_access_iso() {
  local regex="$1"
  local files_text="$2"
  if [[ -z "$files_text" ]]; then
    echo "null"
    return
  fi

  local newest=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if grep -Eq "$regex" "$f" 2>/dev/null; then
      mt=$(stat -f "%m" "$f" 2>/dev/null || echo 0)
      if [[ "$mt" -gt "$newest" ]]; then
        newest="$mt"
      fi
    fi
  done <<< "$files_text"

  if [[ "$newest" -eq 0 ]]; then
    echo "null"
    return
  fi
  date -u -r "$newest" +"%Y-%m-%dT%H:%M:%SZ"
}

REG_KANBAN='(http://localhost:3001)?/api/kanban([^[:alnum:]_]|$)'
REG_MOVE='(http://localhost:3001)?/api/kanban/[^[:space:]/]+/move([^[:alnum:]_]|$)'
REG_COMMENTS='(http://localhost:3001)?/api/kanban/[^[:space:]/]+/comments([^[:alnum:]_]|$)'
REG_HEALTH='(http://localhost:3001)?/api/health([^[:alnum:]_]|$)'
REG_CRON='(http://localhost:3001)?/api/cron([^[:alnum:]_]|$)'

KANBAN_7=$(count_matches "$REG_KANBAN" "$FILES_7D")
KANBAN_30=$(count_matches "$REG_KANBAN" "$FILES_30D")
KANBAN_LAST=$(last_access_iso "$REG_KANBAN" "$FILES_30D")

MOVE_7=$(count_matches "$REG_MOVE" "$FILES_7D")
MOVE_30=$(count_matches "$REG_MOVE" "$FILES_30D")
MOVE_LAST=$(last_access_iso "$REG_MOVE" "$FILES_30D")

COMMENTS_7=$(count_matches "$REG_COMMENTS" "$FILES_7D")
COMMENTS_30=$(count_matches "$REG_COMMENTS" "$FILES_30D")
COMMENTS_LAST=$(last_access_iso "$REG_COMMENTS" "$FILES_30D")

HEALTH_7=$(count_matches "$REG_HEALTH" "$FILES_7D")
HEALTH_30=$(count_matches "$REG_HEALTH" "$FILES_30D")
HEALTH_LAST=$(last_access_iso "$REG_HEALTH" "$FILES_30D")

CRON_7=$(count_matches "$REG_CRON" "$FILES_7D")
CRON_30=$(count_matches "$REG_CRON" "$FILES_30D")
CRON_LAST=$(last_access_iso "$REG_CRON" "$FILES_30D")

GENERATED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq -n \
  --arg generated_at "$GENERATED_AT" \
  --arg kanban_last "$KANBAN_LAST" --argjson kanban_7 "$KANBAN_7" --argjson kanban_30 "$KANBAN_30" \
  --arg move_last "$MOVE_LAST" --argjson move_7 "$MOVE_7" --argjson move_30 "$MOVE_30" \
  --arg comments_last "$COMMENTS_LAST" --argjson comments_7 "$COMMENTS_7" --argjson comments_30 "$COMMENTS_30" \
  --arg health_last "$HEALTH_LAST" --argjson health_7 "$HEALTH_7" --argjson health_30 "$HEALTH_30" \
  --arg cron_last "$CRON_LAST" --argjson cron_7 "$CRON_7" --argjson cron_30 "$CRON_30" \
'
{
  generated_at: $generated_at,
  endpoints: {
    "/api/kanban": {
      last_accessed: (if $kanban_last=="null" then null else $kanban_last end),
      count_7d: $kanban_7,
      count_30d: $kanban_30
    },
    "/api/kanban/*/move": {
      last_accessed: (if $move_last=="null" then null else $move_last end),
      count_7d: $move_7,
      count_30d: $move_30
    },
    "/api/kanban/*/comments": {
      last_accessed: (if $comments_last=="null" then null else $comments_last end),
      count_7d: $comments_7,
      count_30d: $comments_30
    },
    "/api/health": {
      last_accessed: (if $health_last=="null" then null else $health_last end),
      count_7d: $health_7,
      count_30d: $health_30
    },
    "/api/cron": {
      last_accessed: (if $cron_last=="null" then null else $cron_last end),
      count_7d: $cron_7,
      count_30d: $cron_30
    }
  },
  pages: {
    kanban_board: {
      api_hits_7d: ($kanban_7 + $move_7 + $comments_7),
      value_score: 9,
      status: "active",
      strategic_tag: "critical"
    },
    health_api: {
      api_hits_7d: $health_7,
      value_score: 8,
      status: "active",
      strategic_tag: "critical"
    },
    cron_manager: {
      api_hits_7d: $cron_7,
      value_score: 7,
      status: "active",
      strategic_tag: "support"
    },
    ops_health_dashboard: {
      api_hits_7d: $health_7,
      value_score: 6,
      status: "unknown",
      strategic_tag: "support"
    },
    notification_center: {
      api_hits_7d: $comments_7,
      value_score: 7,
      status: "unknown",
      strategic_tag: "support"
    }
  }
}
' > "$OUT_JSON"

echo "Telemetry updated: $OUT_JSON"
echo "Stale endpoints (count_7d == 0):"
jq -r '.endpoints | to_entries[] | select(.value.count_7d == 0) | "- \(.key)"' "$OUT_JSON" || true
