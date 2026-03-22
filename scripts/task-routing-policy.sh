#!/usr/bin/env bash
# task-routing-policy.sh
# Phase 2 policy engine: thread category + delegation threshold + safety gates.

set -euo pipefail

TASK_TEXT=""
STRICT=0
OUTPUT_JSON=0

usage() {
  cat <<'EOF'
Usage:
  task-routing-policy.sh --text "task description" [--strict] [--json]
  echo "task" | task-routing-policy.sh --json

Flags:
  --text <text>   Task text (or stdin)
  --strict        Hard-fail on policy violations
  --json          JSON output
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text) TASK_TEXT="${2:-}"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    --json) OUTPUT_JSON=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$TASK_TEXT" && ! -t 0 ]]; then
  TASK_TEXT="$(cat)"
fi
if [[ -z "$TASK_TEXT" ]]; then
  echo "Error: task text required" >&2
  exit 1
fi

TASK_LC="$(printf '%s' "$TASK_TEXT" | tr '[:upper:]' '[:lower:]')"
TEXT_BYTES=$(printf '%s' "$TASK_TEXT" | wc -c | tr -d ' ')
EST_STEPS=$((1 + TEXT_BYTES / 160))
[[ $EST_STEPS -gt 12 ]] && EST_STEPS=12

contains_any() {
  local hay="$1"; shift
  for n in "$@"; do
    [[ "$hay" == *"$n"* ]] && return 0
  done
  return 1
}

CATEGORY="general"
if contains_any "$TASK_LC" "gateway" "cron" "config" "security" "reliability" "infra"; then
  CATEGORY="infra"
elif contains_any "$TASK_LC" "code" "coding" "refactor" "test" "build" "module" "implement"; then
  CATEGORY="coding"
elif contains_any "$TASK_LC" "research" "analyze" "compare" "investigate" "summary"; then
  CATEGORY="research"
elif contains_any "$TASK_LC" "monitor" "health" "incident" "ops" "runbook"; then
  CATEGORY="ops"
elif contains_any "$TASK_LC" "remind" "reminder" "schedule" "follow-up"; then
  CATEGORY="reminders"
fi

# complexity bumps
if contains_any "$TASK_LC" "multi-step" "end-to-end" "across modules" "integrate" "orchestrate"; then
  EST_STEPS=$((EST_STEPS + 2))
fi
if contains_any "$TASK_LC" "implement" "refactor" "architecture" "migration"; then
  EST_STEPS=$((EST_STEPS + 2))
fi
[[ $EST_STEPS -gt 12 ]] && EST_STEPS=12

MUST_DELEGATE=0
if [[ $EST_STEPS -ge 3 ]] || contains_any "$TASK_LC" "multi-step" "end-to-end" "across modules" "refactor" "build" "integrate"; then
  MUST_DELEGATE=1
fi

HIGH_RISK=0
if contains_any "$TASK_LC" "security" "legal" "financial" "production" "irreversible"; then
  HIGH_RISK=1
fi

EXTERNAL_ACTION=0
if contains_any "$TASK_LC" "send" "publish" "post" "email" "message" "notify"; then
  EXTERNAL_ACTION=1
fi

THREAD_REQUIRED=0
[[ $MUST_DELEGATE -eq 1 ]] && THREAD_REQUIRED=1

RECOMMENDED_MODEL="haiku"
case "$CATEGORY" in
  coding) RECOMMENDED_MODEL="default" ;;
  infra) RECOMMENDED_MODEL="default" ;;
  research) RECOMMENDED_MODEL="haiku" ;;
  ops|reminders|general) RECOMMENDED_MODEL="haiku" ;;
esac
[[ $HIGH_RISK -eq 1 ]] && RECOMMENDED_MODEL="opus"

VIOLATIONS=()
if [[ $STRICT -eq 1 && $MUST_DELEGATE -eq 1 ]]; then
  VIOLATIONS+=("must-delegate task cannot run inline in strict mode")
fi
if [[ $STRICT -eq 1 && $HIGH_RISK -eq 1 && $EXTERNAL_ACTION -eq 1 ]]; then
  VIOLATIONS+=("high-risk external action requires explicit human approval")
fi

if [[ $OUTPUT_JSON -eq 1 ]]; then
  python3 - <<PY
import json
print(json.dumps({
  "category": "$CATEGORY",
  "estimated_steps": $EST_STEPS,
  "must_delegate": bool($MUST_DELEGATE),
  "thread_required": bool($THREAD_REQUIRED),
  "high_risk": bool($HIGH_RISK),
  "external_action": bool($EXTERNAL_ACTION),
  "recommended_model": "$RECOMMENDED_MODEL",
  "strict": bool($STRICT),
  "violations": ${#VIOLATIONS[@]}
}))
PY
else
  echo "category=$CATEGORY"
  echo "estimated_steps=$EST_STEPS"
  echo "must_delegate=$MUST_DELEGATE"
  echo "thread_required=$THREAD_REQUIRED"
  echo "high_risk=$HIGH_RISK"
  echo "external_action=$EXTERNAL_ACTION"
  echo "recommended_model=$RECOMMENDED_MODEL"
fi

if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  for v in "${VIOLATIONS[@]}"; do
    echo "POLICY_VIOLATION: $v" >&2
  done
  exit 2
fi
