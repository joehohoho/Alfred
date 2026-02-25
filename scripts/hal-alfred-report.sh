#!/bin/bash
# HAL ↔ Alfred routing metrics and recommendations
# 
# Usage:
#   hal-alfred-report.sh [--days 7] [--detail]
#   hal-alfred-report.sh --recommendations

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
TRACK_LOG="$TRACK_DIR/routing.jsonl"
OUTCOME_LOG="$TRACK_DIR/outcomes.jsonl"

DAYS=7
DETAIL=0
RECOMMENDATIONS=0

print_help() {
  cat <<'EOF'
HAL ↔ Alfred routing report

Usage:
  hal-alfred-report.sh [--days 7] [--detail]
    Shows routing metrics and quality summary

  hal-alfred-report.sh --recommendations
    Shows tuning recommendations based on performance

Options:
  --days <n>             Analysis window (default: 7)
  --detail               Show per-task breakdown
  --recommendations      Show tuning recommendations only
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --days)
      DAYS="$2"
      shift 2
      ;;
    --detail)
      DETAIL=1
      shift
      ;;
    --recommendations)
      RECOMMENDATIONS=1
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

python3 - "$TRACK_LOG" "$OUTCOME_LOG" "$DAYS" "$DETAIL" "$RECOMMENDATIONS" <<'PY'
import sys,json,os
from datetime import datetime, timedelta
from collections import defaultdict

track_log_path = sys.argv[1]
outcome_log_path = sys.argv[2]
days = int(sys.argv[3])
detail = int(sys.argv[4])
recommendations = int(sys.argv[5])

if not os.path.exists(track_log_path):
  print("No routing data found yet. Start routing tasks with:")
  print("  hal-alfred-route-with-tracking.sh --text '<task>'")
  sys.exit(0)

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
outcomes = {}
try:
  with open(outcome_log_path) as f:
    for line in f:
      if not line.strip(): continue
      entry = json.loads(line)
      if entry.get('timestamp', '') >= cutoff:
        task_id = entry.get('task_id')
        outcomes[task_id] = entry
except FileNotFoundError:
  pass

if not routing:
  print("No routing decisions in past {} days.".format(days))
  sys.exit(0)

# Compute stats
stats = {
  "HAL": {"total": 0, "success": 0, "rework": 0, "escalated": 0, "failed": 0, "unknown": 0, "confidence_avg": []},
  "Alfred": {"total": 0, "success": 0, "rework": 0, "escalated": 0, "failed": 0, "unknown": 0, "confidence_avg": []}
}

for task_id, decision in routing.items():
  route = decision.get('route', 'unknown')
  if route not in stats: continue
  
  confidence = decision.get('confidence', 0)
  stats[route]['total'] += 1
  stats[route]['confidence_avg'].append(confidence)
  
  # Check outcome
  if task_id in outcomes:
    result = outcomes[task_id].get('result', 'unknown')
    if result in stats[route]:
      stats[route][result] += 1
  else:
    stats[route]['unknown'] += 1

# Helper to compute percentages
def pct(num, denom):
  return (num / denom * 100) if denom > 0 else 0

# RECOMMENDATIONS MODE
if recommendations:
  print("\n" + "="*60)
  print("HAL ↔ Alfred Routing — Tuning Recommendations")
  print("="*60)
  
  hal_stats = stats.get("HAL", {})
  alfred_stats = stats.get("Alfred", {})
  
  hal_total = hal_stats.get('total', 0)
  alfred_total = alfred_stats.get('total', 0)
  
  print("\n1. VOLUME")
  if hal_total > 0 and alfred_total > 0:
    ratio = hal_total / alfred_total
    if ratio > 2:
      print(f"   ⚠ HAL routed 2.5x more than Alfred ({hal_total} vs {alfred_total})")
      print("   → Consider lowering HAL step threshold or raising input_kb threshold")
    elif ratio < 0.5:
      print(f"   ⚠ Alfred routed 2x+ more than HAL ({alfred_total} vs {hal_total})")
      print("   → Consider raising step threshold or lowering input_kb threshold")
    else:
      print(f"   ✓ Balanced routing (HAL {hal_total}, Alfred {alfred_total})")
  elif hal_total > 0:
    print(f"   ℹ Only HAL routed so far ({hal_total} tasks) — need more Alfred routes")
  elif alfred_total > 0:
    print(f"   ℹ Only Alfred routed so far ({alfred_total} tasks) — need more HAL routes")
  
  print("\n2. SUCCESS RATES")
  for route in ["HAL", "Alfred"]:
    s = stats[route]
    total = s['total']
    if total == 0: continue
    success_rate = pct(s['success'], total)
    rework_rate = pct(s['rework'], total)
    escalate_rate = pct(s['escalated'], total)
    
    print(f"\n   {route}:")
    print(f"      Success: {success_rate:.0f}% | Rework: {rework_rate:.0f}% | Escalated: {escalate_rate:.0f}%")
    
    if success_rate >= 80:
      print(f"      ✓ Strong performance ({success_rate:.0f}% success)")
    elif success_rate >= 60:
      print(f"      → Moderate performance, watch trends")
    else:
      print(f"      ⚠ Low success rate ({success_rate:.0f}%), consider threshold adjustments")
  
  print("\n3. CONFIDENCE CALIBRATION")
  for route in ["HAL", "Alfred"]:
    s = stats[route]
    if not s['confidence_avg']: continue
    avg_conf = sum(s['confidence_avg']) / len(s['confidence_avg'])
    success_rate = pct(s['success'], s['total'])
    
    print(f"\n   {route}:")
    print(f"      Avg confidence: {avg_conf:.2f} | Success rate: {success_rate:.0f}%")
    
    if avg_conf > 0.9 and success_rate < 70:
      print(f"      ⚠ Overconfident: high confidence but low success")
      print(f"         → Increase confidence thresholds for escalation")
    elif avg_conf < 0.75 and success_rate > 85:
      print(f"      ⚠ Underconfident: low confidence but high success")
      print(f"         → Reduce escalation triggers")
  
  print("\n4. THRESHOLD TUNING TARGETS (Section 8 of playbook)")
  print("   Current thresholds (playbook defaults):")
  print("   - HAL step limit: 4")
  print("   - HAL input limit: 8 KB")
  print("   - HAL file limit: 6")
  print("\n   If tuning needed:")
  if pct(stats["HAL"]['success'], stats["HAL"]['total'] or 1) < 70:
    print("   → Lower step threshold (4 → 3) to reduce HAL overload")
  if pct(stats["Alfred"]['success'], stats["Alfred"]['total'] or 1) < 70:
    print("   → Raise step threshold (4 → 5) to reduce Alfred overload")
  
  sys.exit(0)

# REGULAR REPORT MODE
print("\n" + "="*60)
print(f"HAL ↔ Alfred Routing Report (last {days} days)")
print("="*60)

for route in ["HAL", "Alfred"]:
  s = stats[route]
  total = s['total']
  if total == 0:
    print(f"\n{route}: 0 decisions")
    continue
  
  success = s['success']
  rework = s['rework']
  escalated = s['escalated']
  failed = s['failed']
  unknown = s['unknown']
  avg_conf = sum(s['confidence_avg']) / len(s['confidence_avg']) if s['confidence_avg'] else 0
  
  success_pct = pct(success, total)
  rework_pct = pct(rework, total)
  escalate_pct = pct(escalated, total)
  unknown_pct = pct(unknown, total)
  
  print(f"\n{route}:")
  print(f"  Total decisions: {total}")
  print(f"  Outcomes: {success} success, {rework} rework, {escalated} escalated, {failed} failed, {unknown} unknown")
  print(f"  Success rate: {success_pct:.1f}%")
  print(f"  Rework rate: {rework_pct:.1f}%")
  print(f"  Escalation rate: {escalate_pct:.1f}%")
  print(f"  Avg confidence: {avg_conf:.2f}")
  print(f"  Outcome coverage: {100-unknown_pct:.0f}% (outcomes recorded)")

if detail:
  print("\n" + "="*60)
  print("Detailed Task Breakdown")
  print("="*60)
  
  for route in ["HAL", "Alfred"]:
    print(f"\n{route}:")
    for task_id, decision in sorted(routing.items()):
      if decision.get('route') != route:
        continue
      confidence = decision.get('confidence', 0)
      outcome = outcomes.get(task_id, {}).get('result', 'unknown')
      print(f"  {task_id:<40} conf={confidence:.2f} outcome={outcome}")

print("\n" + "="*60)
print("Next steps:")
print("  • Track more tasks: hal-alfred-route-with-tracking.sh --text '...'")
print("  • Update outcomes: hal-alfred-track.sh --outcome success --task-id <id>")
print("  • Get recommendations: hal-alfred-report.sh --recommendations")
print("="*60 + "\n")
PY
