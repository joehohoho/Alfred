#!/bin/bash
# HAL ↔ Alfred routing tracker
# Logs routing decisions and provides metrics on HAL vs Alfred outcomes
#
# Usage:
#   hal-alfred-track.sh --decision <decision_json> [--outcome <outcome>] [--task-id <id>]
#   hal-alfred-track.sh --summary [--days 7]
#   hal-alfred-track.sh --stats

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
TRACK_LOG="$TRACK_DIR/routing.jsonl"
OUTCOME_LOG="$TRACK_DIR/outcomes.jsonl"

mkdir -p "$TRACK_DIR"

print_help() {
  cat <<'EOF'
HAL ↔ Alfred routing tracker

Commands:
  Log a routing decision:
    hal-alfred-track.sh --decision <json> [--task-id <id>]
      <json> should be the output of hal-alfred-route-auto.sh --json

  Update outcome of a routed task:
    hal-alfred-track.sh --outcome <result> --task-id <id>
      <result> is one of: success, rework, escalated, failed

  Show summary of recent routing decisions:
    hal-alfred-track.sh --summary [--days 7]

  Show routing metrics:
    hal-alfred-track.sh --stats [--days 7]

  Clean old logs (keep last N days):
    hal-alfred-track.sh --cleanup --days 30
EOF
}

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//"/\\"}
  s=${s//$'\n'/\\n}
  printf '%s' "$s"
}

cmd_decision() {
  local decision_json="$1"
  local task_id="${2:-unknown}"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Validate JSON
  if ! echo "$decision_json" | python3 -m json.tool > /dev/null 2>&1; then
    echo "Error: invalid JSON" >&2
    return 1
  fi
  
  # Extract route and confidence from decision
  local route=$(echo "$decision_json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('route','unknown'))")
  local confidence=$(echo "$decision_json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('confidence',0))")
  
  # Log as JSONL
  python3 - "$timestamp" "$task_id" "$route" "$confidence" "$decision_json" <<'PY'
import sys,json
timestamp, task_id, route, confidence, decision_json = sys.argv[1:6]
entry = {
  "timestamp": timestamp,
  "task_id": task_id,
  "route": route,
  "confidence": float(confidence),
  "decision": json.loads(decision_json)
}
print(json.dumps(entry, separators=(',', ':')))
PY
}

cmd_outcome() {
  local result="$1"
  local task_id="$2"
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  if [[ ! "$result" =~ ^(success|rework|escalated|failed)$ ]]; then
    echo "Error: result must be success|rework|escalated|failed" >&2
    return 1
  fi
  
  python3 - "$timestamp" "$task_id" "$result" <<'PY'
import sys,json
timestamp, task_id, result = sys.argv[1:4]
entry = {
  "timestamp": timestamp,
  "task_id": task_id,
  "result": result
}
print(json.dumps(entry, separators=(',', ':')))
PY
}

cmd_summary() {
  local days="${1:-7}"
  local cutoff=$(date -u -d "$days days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-${days}d +"%Y-%m-%dT%H:%M:%SZ")
  
  if [[ ! -f "$TRACK_LOG" ]]; then
    echo "No routing decisions tracked yet."
    return 0
  fi
  
  echo "Routing Decisions (last $days days)"
  echo "==================================="
  
  local total=0
  local to_hal=0
  local to_alfred=0
  
  while IFS= read -r line; do
    local timestamp=$(echo "$line" | python3 -c "import sys,json;print(json.load(sys.stdin).get('timestamp',''))")
    if [[ "$timestamp" < "$cutoff" ]]; then
      continue
    fi
    
    local task_id=$(echo "$line" | python3 -c "import sys,json;print(json.load(sys.stdin).get('task_id','?'))")
    local route=$(echo "$line" | python3 -c "import sys,json;print(json.load(sys.stdin).get('route','?'))")
    local confidence=$(echo "$line" | python3 -c "import sys,json;print(json.load(sys.stdin).get('confidence',0))")
    
    printf "%-40s %-8s confidence=%.2f\n" "$task_id" "$route" "$confidence"
    
    total=$((total + 1))
    [[ "$route" == "HAL" ]] && to_hal=$((to_hal + 1))
    [[ "$route" == "Alfred" ]] && to_alfred=$((to_alfred + 1))
  done < "$TRACK_LOG"
  
  echo ""
  echo "Summary: Total=$total | HAL=$to_hal | Alfred=$to_alfred"
}

cmd_stats() {
  local days="${1:-7}"
  
  if [[ ! -f "$TRACK_LOG" ]]; then
    echo "No routing decisions tracked yet."
    return 0
  fi
  
  python3 - "$TRACK_LOG" "$OUTCOME_LOG" "$days" <<'PY'
import sys,json
from datetime import datetime, timedelta
from collections import defaultdict

track_log_path = sys.argv[1]
outcome_log_path = sys.argv[2]
days = int(sys.argv[3])

cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat() + 'Z'

# Load routing decisions
routing = {}
with open(track_log_path) as f:
  for line in f:
    if not line.strip(): continue
    entry = json.loads(line)
    if entry.get('timestamp', '') >= cutoff:
      routing[entry.get('task_id')] = entry

# Load outcomes
outcomes = defaultdict(list)
if sys.path.append if hasattr(sys, 'platform') else None or True:  # always true
  try:
    with open(outcome_log_path) as f:
      for line in f:
        if not line.strip(): continue
        entry = json.loads(line)
        if entry.get('timestamp', '') >= cutoff:
          outcomes[entry.get('task_id')].append(entry)
  except FileNotFoundError:
    pass

# Compute stats
stats = defaultdict(lambda: {"total": 0, "success": 0, "rework": 0, "escalated": 0, "failed": 0, "confidence_avg": []})

for task_id, decision in routing.items():
  route = decision.get('route', 'unknown')
  confidence = decision.get('confidence', 0)
  stats[route]['total'] += 1
  stats[route]['confidence_avg'].append(confidence)
  
  # Check outcome
  if task_id in outcomes and outcomes[task_id]:
    result = outcomes[task_id][-1].get('result', 'unknown')
    if result in stats[route]:
      stats[route][result] += 1

print(f"\nRouting Stats (last {days} days)")
print("=" * 50)

for route in ['HAL', 'Alfred']:
  if route not in stats: continue
  s = stats[route]
  total = s['total']
  if total == 0: continue
  
  success_pct = (s['success'] / total * 100) if total > 0 else 0
  rework_pct = (s['rework'] / total * 100) if total > 0 else 0
  escalate_pct = (s['escalated'] / total * 100) if total > 0 else 0
  avg_conf = sum(s['confidence_avg']) / len(s['confidence_avg']) if s['confidence_avg'] else 0
  
  print(f"\n{route}:")
  print(f"  Total decisions: {total}")
  print(f"  Outcomes: {s['success']} success, {s['rework']} rework, {s['escalated']} escalated, {s['failed']} failed")
  print(f"  Success rate: {success_pct:.1f}%")
  print(f"  Rework rate: {rework_pct:.1f}%")
  print(f"  Escalation rate: {escalate_pct:.1f}%")
  print(f"  Avg confidence: {avg_conf:.2f}")

print()
PY
}

ACTION="${1:-}"
DECISION_JSON=""
TASK_ID=""
OUTCOME=""
DAYS=7

while [[ $# -gt 0 ]]; do
  case "$1" in
    --decision)
      ACTION="decision"
      DECISION_JSON="$2"
      shift 2
      ;;
    --outcome)
      ACTION="outcome"
      OUTCOME="$2"
      shift 2
      ;;
    --task-id)
      TASK_ID="$2"
      shift 2
      ;;
    --days)
      DAYS="$2"
      shift 2
      ;;
    --summary)
      ACTION="summary"
      shift
      ;;
    --stats)
      ACTION="stats"
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      print_help >&2
      exit 1
      ;;
  esac
done

case "$ACTION" in
  decision)
    cmd_decision "$DECISION_JSON" "$TASK_ID" >> "$TRACK_LOG"
    ;;
  outcome)
    cmd_outcome "$OUTCOME" "$TASK_ID" >> "$OUTCOME_LOG"
    ;;
  summary)
    cmd_summary "$DAYS"
    ;;
  stats)
    cmd_stats "$DAYS"
    ;;
  *)
    echo "Usage: hal-alfred-track.sh [--decision|--outcome|--summary|--stats|--help] ..." >&2
    exit 1
    ;;
esac
