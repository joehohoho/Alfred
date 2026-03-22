#!/bin/bash
# validate-handoff-generic.sh — Validate handoff contract for any kanban task id
# Usage: bash scripts/validate-handoff-generic.sh <task_id>
# Exit: 0 valid, 1 invalid

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TASK_ID="${1:-}"
HANDOFF_FILE="$WORKSPACE/goals/handoffs/${TASK_ID}.json"

if [[ -z "$TASK_ID" ]]; then
  echo "❌ Usage: bash scripts/validate-handoff-generic.sh <task_id>"
  exit 1
fi

if [[ ! -f "$HANDOFF_FILE" ]]; then
  echo "❌ Missing handoff file: $HANDOFF_FILE"
  exit 1
fi

if ! jq empty "$HANDOFF_FILE" >/dev/null 2>&1; then
  echo "❌ Invalid JSON: $HANDOFF_FILE"
  exit 1
fi

python3 - "$TASK_ID" "$HANDOFF_FILE" <<'PY'
import json, sys, datetime

task_id = sys.argv[1]
path = sys.argv[2]
d = json.load(open(path))
errs = []

# required top-level
required = [
  'task_id','objective','constraints','deliverables','validation_command','success_criteria',
  'autonomy_boundaries','owner','deadline','review_gate','completion_evidence'
]
for k in required:
    if k not in d:
        errs.append(f"missing required field: {k}")

if d.get('task_id') != task_id:
    errs.append(f"task_id mismatch: file has {d.get('task_id')!r}, expected {task_id!r}")

obj = (d.get('objective') or '').strip()
if len(obj) < 15:
    errs.append('objective must be >=15 chars')

constraints = d.get('constraints') or []
if not isinstance(constraints, list) or len(constraints) < 1:
    errs.append('constraints must have >=1 item')

deliv = d.get('deliverables') or {}
for sec in ('code','tests','docs'):
    arr = deliv.get(sec)
    if not isinstance(arr, list) or len(arr) < 1:
        errs.append(f'deliverables.{sec} must have >=1 item')

if not (d.get('validation_command') or '').strip():
    errs.append('validation_command required')

sc = d.get('success_criteria') or []
if not isinstance(sc, list) or len(sc) < 1:
    errs.append('success_criteria must have >=1 item')

owner = d.get('owner')
if owner not in ('alfred','hal','joe'):
    errs.append('owner must be one of: alfred|hal|joe')

# deadline (YYYY-MM-DD) and future
deadline = d.get('deadline') or ''
try:
    dt = datetime.datetime.strptime(deadline, '%Y-%m-%d').date()
    if dt <= datetime.date.today():
        errs.append('deadline must be in the future')
except Exception:
    errs.append('deadline must be YYYY-MM-DD')

ab = d.get('autonomy_boundaries') or {}
if not isinstance(ab.get('can_decide'), list) or len(ab.get('can_decide')) < 1:
    errs.append('autonomy_boundaries.can_decide must have >=1 item')
if not isinstance(ab.get('must_escalate'), list) or len(ab.get('must_escalate')) < 1:
    errs.append('autonomy_boundaries.must_escalate must have >=1 item')

rg = d.get('review_gate') or {}
if rg.get('requires_joe_approval') not in ('yes','no'):
    errs.append("review_gate.requires_joe_approval must be 'yes' or 'no'")
if not (rg.get('escalation_reason') or '').strip():
    errs.append('review_gate.escalation_reason required')

ce = d.get('completion_evidence') or {}
vc = ce.get('validation_commands') or []
if not isinstance(vc, list) or len(vc) < 1:
    errs.append('completion_evidence.validation_commands must have >=1 item')
for k in ('expected_result','actual_result','not_run_reason','risk_if_not_run'):
    if not (ce.get(k) or '').strip():
        errs.append(f'completion_evidence.{k} required')
if not isinstance(ce.get('exit_code'), int):
    errs.append('completion_evidence.exit_code must be integer')

if errs:
    print('❌ Handoff validation failed:')
    for e in errs:
        print(' -', e)
    sys.exit(1)

print(f'✅ Handoff valid for {task_id}')
PY
