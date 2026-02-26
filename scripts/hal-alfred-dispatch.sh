#!/bin/bash
# hal-alfred-dispatch.sh
# Route a task to HAL or Alfred based on playbook thresholds.
# If HAL → sends to HAL agent via WebSocket.
# If Alfred → logs and exits 0 (Alfred handles it directly).
#
# Usage:
#   hal-alfred-dispatch.sh --task "describe task" [--file path] [--external] [--risk]
#   hal-alfred-dispatch.sh --task "describe task" --json   (output routing JSON + dispatch result)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
ROUTER="$SCRIPT_DIR/hal-alfred-route-auto.sh"
DISPATCHER="$SCRIPT_DIR/hal-dispatch-ws.js"
TRACKER="$SCRIPT_DIR/hal-alfred-track.sh"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
DISPATCH_LOG="$TRACK_DIR/dispatch.jsonl"

mkdir -p "$TRACK_DIR"

TASK=""
OUTPUT_JSON=0
EXTRA_ARGS=()
TASK_ID=""

print_help() {
  cat <<'EOF'
HAL ↔ Alfred dispatcher

Usage:
  hal-alfred-dispatch.sh --task "describe the task" [options]

Options:
  --task <text>          Task description (required)
  --file <path>          Include file for complexity estimation (repeatable)
  --external             Task involves external action
  --risk                 Task is high-risk
  --recent-failures <n>  Recent failure count (escalates at >=2)
  --latency-ms <n>       Recent latency ms (escalates at >12000)
  --queue-depth <n>      Queue depth (escalates at >2)
  --task-id <id>         Optional task ID for tracking
  --json                 Output JSON
  -h, --help             Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)
      TASK="${2:-}"
      shift 2
      ;;
    --task-id)
      TASK_ID="${2:-}"
      shift 2
      ;;
    --json)
      OUTPUT_JSON=1
      EXTRA_ARGS+=(--json)
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      # Pass everything else through to the router
      EXTRA_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$TASK" ]]; then
  echo "Error: --task is required" >&2
  print_help >&2
  exit 1
fi

[[ -z "$TASK_ID" ]] && TASK_ID="dispatch-$(date +%s)"

# ── Step 1: Route decision ──────────────────────────────────────────────────
ROUTE_JSON=$("$ROUTER" --text "$TASK" --json "${EXTRA_ARGS[@]}")
ROUTE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['route'])")
REASON=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['reason'])")
CONFIDENCE=$(echo "$ROUTE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['confidence'])")

# ── Step 2: Log routing decision ─────────────────────────────────────────────
if [[ -x "$TRACKER" ]]; then
  "$TRACKER" --decision "$ROUTE_JSON" --task-id "$TASK_ID" >> "$TRACK_DIR/routing.jsonl" 2>/dev/null || true
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DISPATCH_RESULT="pending"

# ── Step 3: Dispatch ──────────────────────────────────────────────────────────
HAL_SESSION_KEY=""
if [[ "$ROUTE" == "HAL" ]]; then
  DISPATCH_OUT=$(node "$DISPATCHER" "$TASK" 2>/tmp/hal-dispatch-err) && DISPATCH_OK=1 || DISPATCH_OK=0
  if [[ $DISPATCH_OK -eq 1 ]]; then
    DISPATCH_RESULT="dispatched_to_hal"
    # Extract session key from output (format: "OK session=agent:hal:task-...")
    HAL_SESSION_KEY=$(echo "$DISPATCH_OUT" | sed -n 's/^OK session=//p')
  else
    ERR=$(cat /tmp/hal-dispatch-err)
    DISPATCH_RESULT="hal_dispatch_failed"
    echo "WARNING: HAL dispatch failed ($ERR) — task stays with Alfred" >&2
    ROUTE="Alfred"
    REASON="HAL dispatch failed; fallback to Alfred"
  fi
else
  DISPATCH_RESULT="handled_by_alfred"
fi

# ── Step 4: Log dispatch ──────────────────────────────────────────────────────
python3 - "$TIMESTAMP" "$TASK_ID" "$ROUTE" "$CONFIDENCE" "$DISPATCH_RESULT" "$TASK" "$HAL_SESSION_KEY" <<'PY' >> "$DISPATCH_LOG"
import sys, json
ts, task_id, route, conf, result, task, session_key = sys.argv[1:8]
entry = {
  "timestamp": ts,
  "task_id": task_id,
  "route": route,
  "confidence": float(conf),
  "dispatch_result": result,
  "task": task[:200]
}
if session_key:
    entry["hal_session_key"] = session_key
print(json.dumps(entry, separators=(',', ':')))
PY

# ── Step 5: Output ──────────────────────────────────────────────────────────
if [[ $OUTPUT_JSON -eq 1 ]]; then
  python3 - "$ROUTE_JSON" "$DISPATCH_RESULT" "$TASK_ID" <<'PY'
import sys, json
route_json = json.loads(sys.argv[1])
dispatch_result = sys.argv[2]
task_id = sys.argv[3]
route_json["dispatch_result"] = dispatch_result
route_json["task_id"] = task_id
print(json.dumps(route_json, ensure_ascii=False))
PY
else
  if [[ "$DISPATCH_RESULT" == "dispatched_to_hal" ]]; then
    echo "→ Routed to HAL (confidence=$CONFIDENCE): $REASON"
    [[ -n "$HAL_SESSION_KEY" ]] && echo "  session: $HAL_SESSION_KEY"
  elif [[ "$DISPATCH_RESULT" == "handled_by_alfred" ]]; then
    echo "→ Handled by Alfred (confidence=$CONFIDENCE): $REASON"
  else
    echo "→ HAL dispatch failed; Alfred handling (confidence=$CONFIDENCE)"
  fi
fi
