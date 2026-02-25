#!/bin/bash
# HAL ↔ Alfred routing helper
# Uses thresholds from HAL-ALFRED-ROUTING-PLAYBOOK.md

set -euo pipefail

# Defaults (playbook-aligned)
EST_STEPS=3
INPUT_KB=2
FILES=1
EXTERNAL_ACTION=0
HIGH_RISK=0
OUTPUT_JSON=0
EXPLAIN=0
TASK_TEXT=""
STEPS_EXPLICIT=0  # set to 1 when user passes --steps explicitly

print_help() {
  cat <<'EOF'
HAL ↔ Alfred routing helper

Decides route using deterministic thresholds:
- HAL if ALL true:
  1) steps <= 4
  2) input_kb <= 8
  3) no external action
  4) not high-risk (security/legal/financial/irreversible)

Options:
  --text <text>          Task description text
  --steps <n>            Estimated steps (default: 3)
  --input-kb <n>         Estimated input size in KB (default: 2)
  --files <n>            Number of files/sections involved (default: 1)
  --external             Mark as outbound/high-impact external action
  --risk                 Mark as high-risk decision/action
  --json                 Output JSON
  --explain              Include gate-by-gate explanation
  -h, --help             Show help

If --text is omitted, stdin is used when present.
EOF
}

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//"/\\"}
  s=${s//$'\n'/\\n}
  printf '%s' "$s"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text)
      TASK_TEXT="${2:-}"
      shift 2
      ;;
    --steps)
      EST_STEPS="${2:-3}"
      STEPS_EXPLICIT=1
      shift 2
      ;;
    --input-kb)
      INPUT_KB="${2:-2}"
      shift 2
      ;;
    --files)
      FILES="${2:-1}"
      shift 2
      ;;
    --external)
      EXTERNAL_ACTION=1
      shift
      ;;
    --risk)
      HIGH_RISK=1
      shift
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
      print_help >&2
      exit 1
      ;;
  esac
done

# Read stdin if no --text provided
if [[ -z "$TASK_TEXT" && ! -t 0 ]]; then
  TASK_TEXT="$(cat)"
fi

TASK_LC="$(printf '%s' "$TASK_TEXT" | tr '[:upper:]' '[:lower:]')"

# STEPS_EXPLICIT=1 means the caller passed --steps explicitly — respect it, don't bump.

# Keyword-based trigger detection
TRIGGERS=()
EXPLAIN_LINES=()
KEYWORD_STEP_BUMP=0

contains_any() {
  local haystack="$1"
  shift
  for needle in "$@"; do
    if [[ "$haystack" == *"$needle"* ]]; then
      return 0
    fi
  done
  return 1
}

if contains_any "$TASK_LC" "refactor" "architecture" "multi-step" "tradeoff" "design doc" "strategy" "plan"; then
  TRIGGERS+=("complexity")
  # Complexity keywords mean more coordination steps — bump by 2 when using defaults
  KEYWORD_STEP_BUMP=$((KEYWORD_STEP_BUMP + 2))
fi

if contains_any "$TASK_LC" "security" "compliance" "legal" "financial" "irreversible" "delete production"; then
  HIGH_RISK=1
  TRIGGERS+=("risk")
fi

if contains_any "$TASK_LC" "post to" "send message" "email" "publish" "tweet" "notify client"; then
  EXTERNAL_ACTION=1
  TRIGGERS+=("external_action")
fi

if contains_any "$TASK_LC" "codegen" "generate code" "new feature" "cross-module" "across modules" "large context"; then
  TRIGGERS+=("code_or_context")
  # Code-generation / multi-module tasks are inherently more steps
  KEYWORD_STEP_BUMP=$((KEYWORD_STEP_BUMP + 2))
fi

# Apply keyword bump to step estimate only when user hasn't provided --steps explicitly
if [[ $STEPS_EXPLICIT -eq 0 && $KEYWORD_STEP_BUMP -gt 0 ]]; then
  EST_STEPS=$((EST_STEPS + KEYWORD_STEP_BUMP))
fi

# Deterministic rule checks from playbook
RULE_STEPS_OK=0
RULE_INPUT_OK=0
RULE_EXTERNAL_OK=0
RULE_RISK_OK=0
RULE_FILES_OK=1

[[ "$EST_STEPS" -le 4 ]] && RULE_STEPS_OK=1
[[ "$INPUT_KB" -le 8 ]] && RULE_INPUT_OK=1
[[ "$EXTERNAL_ACTION" -eq 0 ]] && RULE_EXTERNAL_OK=1
[[ "$HIGH_RISK" -eq 0 ]] && RULE_RISK_OK=1

if [[ "$FILES" -gt 6 ]]; then
  TRIGGERS+=("context")
  RULE_FILES_OK=0
fi

# Route decision
ROUTE="HAL"
REASON="All HAL gate conditions passed"

if [[ $RULE_STEPS_OK -eq 0 || $RULE_INPUT_OK -eq 0 || $RULE_EXTERNAL_OK -eq 0 || $RULE_RISK_OK -eq 0 || $RULE_FILES_OK -eq 0 ]]; then
  ROUTE="Alfred"
  REASON="One or more HAL gate conditions failed"
fi

# Confidence scoring (simple heuristic)
CONFIDENCE=0.85
[[ "$ROUTE" == "Alfred" ]] && CONFIDENCE=0.90
[[ ${#TRIGGERS[@]} -ge 2 ]] && CONFIDENCE=0.95
[[ ${#TRIGGERS[@]} -eq 0 && "$ROUTE" == "HAL" ]] && CONFIDENCE=0.80

CONFIDENCE_BAND="medium"
awk "BEGIN{exit !($CONFIDENCE >= 0.93)}" && CONFIDENCE_BAND="high"
awk "BEGIN{exit !($CONFIDENCE < 0.85)}" && CONFIDENCE_BAND="low"

RECOMMENDATION="Proceed with HAL"
[[ "$ROUTE" == "Alfred" ]] && RECOMMENDATION="Escalate to Alfred for synthesis/execution"

if [[ $STEPS_EXPLICIT -eq 0 && $KEYWORD_STEP_BUMP -gt 0 ]]; then
  EXPLAIN_LINES+=("steps.keyword_bump: +$KEYWORD_STEP_BUMP from triggers (${TRIGGERS[*]:-}) → est_steps=$EST_STEPS")
fi
EXPLAIN_LINES+=("gate.steps: $EST_STEPS <= 4 => $RULE_STEPS_OK")
EXPLAIN_LINES+=("gate.input_kb: $INPUT_KB <= 8 => $RULE_INPUT_OK")
EXPLAIN_LINES+=("gate.external: external=$EXTERNAL_ACTION => $RULE_EXTERNAL_OK")
EXPLAIN_LINES+=("gate.risk: risk=$HIGH_RISK => $RULE_RISK_OK")
EXPLAIN_LINES+=("gate.files: $FILES <= 6 => $RULE_FILES_OK")

if [[ "$OUTPUT_JSON" -eq 1 ]]; then
  TRIGGER_JSON="[]"
  if [[ ${#TRIGGERS[@]} -gt 0 ]]; then
    TRIGGER_JSON="["
    for i in "${!TRIGGERS[@]}"; do
      t="$(json_escape "${TRIGGERS[$i]}")"
      [[ $i -gt 0 ]] && TRIGGER_JSON+=","
      TRIGGER_JSON+="\"$t\""
    done
    TRIGGER_JSON+="]"
  fi

  EXPLAIN_JSON="[]"
  if [[ "$EXPLAIN" -eq 1 ]]; then
    EXPLAIN_JSON="["
    for i in "${!EXPLAIN_LINES[@]}"; do
      e="$(json_escape "${EXPLAIN_LINES[$i]}")"
      [[ $i -gt 0 ]] && EXPLAIN_JSON+=","
      EXPLAIN_JSON+="\"$e\""
    done
    EXPLAIN_JSON+="]"
  fi

  printf '{"route":"%s","reason":"%s","recommendation":"%s","confidence":%.2f,"confidence_band":"%s","inputs":{"steps":%s,"input_kb":%s,"files":%s,"external":%s,"risk":%s},"triggers":%s,"explain":%s}\n' \
    "$ROUTE" "$(json_escape "$REASON")" "$(json_escape "$RECOMMENDATION")" "$CONFIDENCE" "$CONFIDENCE_BAND" "$EST_STEPS" "$INPUT_KB" "$FILES" "$EXTERNAL_ACTION" "$HIGH_RISK" "$TRIGGER_JSON" "$EXPLAIN_JSON"
else
  echo "HAL ↔ Alfred Route Decision"
  echo "- Route: $ROUTE"
  echo "- Reason: $REASON"
  echo "- Recommendation: $RECOMMENDATION"
  echo "- Confidence: $CONFIDENCE ($CONFIDENCE_BAND)"
  echo "- Inputs: steps=$EST_STEPS, input_kb=$INPUT_KB, files=$FILES, external=$EXTERNAL_ACTION, risk=$HIGH_RISK"
  if [[ ${#TRIGGERS[@]} -gt 0 ]]; then
    echo "- Triggers: ${TRIGGERS[*]}"
  else
    echo "- Triggers: none"
  fi
  if [[ "$EXPLAIN" -eq 1 ]]; then
    echo "- Explain:"
    for line in "${EXPLAIN_LINES[@]}"; do
      echo "  - $line"
    done
  fi
fi
