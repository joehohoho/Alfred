#!/bin/bash
# HAL ↔ Alfred router with automatic decision tracking
# 
# Usage:
#   hal-alfred-route-with-tracking.sh --text "task desc" [--track-id <task_id>] [--explain] [--json]
#   echo "task desc" | hal-alfred-route-with-tracking.sh [--track-id <id>] [--json] [--explain]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROUTER="$SCRIPT_DIR/hal-alfred-route-auto.sh"
TRACKER="$SCRIPT_DIR/hal-alfred-track.sh"

if [[ ! -x "$ROUTER" ]] || [[ ! -x "$TRACKER" ]]; then
  echo "Error: base router or tracker not found" >&2
  exit 1
fi

TASK_TEXT=""
TRACK_ID=""
OUTPUT_JSON=0
EXPLAIN=0

print_help() {
  cat <<'EOF'
HAL ↔ Alfred router with tracking

Usage:
  hal-alfred-route-with-tracking.sh --text "task" [--track-id <id>] [--explain] [--json]
  echo "task" | hal-alfred-route-with-tracking.sh [--track-id <id>] [--explain]

Options:
  --text <text>          Task description (or from stdin)
  --track-id <id>        Task ID for tracking (optional)
  --explain              Show gate-by-gate and estimation breakdowns
  --json                 Return JSON output (still tracks to disk)
  -h, --help             Show help

The routing decision is always logged to .hal-alfred-tracking/ on disk.
Use `hal-alfred-track.sh --stats` to view metrics.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text)
      TASK_TEXT="$2"
      shift 2
      ;;
    --track-id)
      TRACK_ID="$2"
      shift 2
      ;;
    --json)
      OUTPUT_JSON=1
      shift
      ;;
    --explain)
      EXPLAIN=1
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TASK_TEXT" && ! -t 0 ]]; then
  TASK_TEXT="$(cat)"
fi

if [[ -z "$TASK_TEXT" ]]; then
  echo "Error: provide --text or stdin" >&2
  exit 1
fi

# Generate default track ID if not provided
if [[ -z "$TRACK_ID" ]]; then
  TRACK_ID="auto_$(date +%s)_$(echo "$TASK_TEXT" | md5sum | cut -d' ' -f1 | cut -c1-8)"
fi

# Call router and capture decision
ROUTER_ARGS=(--text "$TASK_TEXT")
[[ $OUTPUT_JSON -eq 1 ]] && ROUTER_ARGS+=(--json)
[[ $EXPLAIN -eq 1 ]] && ROUTER_ARGS+=(--explain)

DECISION=$("$ROUTER" "${ROUTER_ARGS[@]}")

# Log the decision (extract JSON if --json was used)
if [[ $OUTPUT_JSON -eq 1 ]]; then
  DECISION_JSON="$DECISION"
else
  # Convert human-readable output back to JSON — just re-run with --json
  DECISION_JSON=$("$ROUTER" --text "$TASK_TEXT" --json)
fi

"$TRACKER" --decision "$DECISION_JSON" --task-id "$TRACK_ID"

# Output the decision (in requested format)
echo "$DECISION"

if [[ -z "$OUTPUT_JSON" ]]; then
  echo ""
  echo "[tracked as: $TRACK_ID]"
fi
