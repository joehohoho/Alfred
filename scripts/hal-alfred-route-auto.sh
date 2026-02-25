#!/bin/bash
# HAL ↔ Alfred auto-routing wrapper
# Auto-estimates --steps, --input-kb, --files from task text + optional files,
# then calls scripts/hal-alfred-route.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_ROUTER="$SCRIPT_DIR/hal-alfred-route.sh"

if [[ ! -x "$BASE_ROUTER" ]]; then
  echo "Error: base router not found or not executable: $BASE_ROUTER" >&2
  exit 1
fi

TASK_TEXT=""
OUTPUT_JSON=0
EXPLAIN=0
FILES_LIST=()
FORCE_EXTERNAL=0
FORCE_RISK=0

print_help() {
  cat <<'EOF'
HAL ↔ Alfred auto router

Usage:
  scripts/hal-alfred-route-auto.sh --text "task description"
  scripts/hal-alfred-route-auto.sh --text "analyze these" --file ./a.log --file ./b.log
  echo "refactor auth across modules" | scripts/hal-alfred-route-auto.sh --json

Options:
  --text <text>          Task description (if omitted, reads stdin)
  --file <path>          Include file for input/file-size estimation (repeatable)
  --json                 Return JSON from base router
  --explain              Print/attach estimation + gate explanations
  --external             Force external-action flag
  --risk                 Force high-risk flag
  -h, --help             Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --text)
      TASK_TEXT="${2:-}"
      shift 2
      ;;
    --file)
      FILES_LIST+=("${2:-}")
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
    --external)
      FORCE_EXTERNAL=1
      shift
      ;;
    --risk)
      FORCE_RISK=1
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

if [[ -z "$TASK_TEXT" && ! -t 0 ]]; then
  TASK_TEXT="$(cat)"
fi

if [[ -z "$TASK_TEXT" ]]; then
  echo "Error: provide --text or stdin" >&2
  exit 1
fi

TASK_LC="$(printf '%s' "$TASK_TEXT" | tr '[:upper:]' '[:lower:]')"
TEXT_BYTES=$(printf '%s' "$TASK_TEXT" | wc -c | tr -d ' ')

# File-based estimates
FILES_COUNT=0
FILE_BYTES_TOTAL=0
FILES_FOUND=0
FILES_MISSING=0
for f in "${FILES_LIST[@]:-}"; do
  if [[ -n "$f" ]]; then
    if [[ -f "$f" ]]; then
      FILES_COUNT=$((FILES_COUNT + 1))
      FILES_FOUND=$((FILES_FOUND + 1))
      sz=$(wc -c < "$f" | tr -d ' ')
      FILE_BYTES_TOTAL=$((FILE_BYTES_TOTAL + sz))
    else
      # treat missing file as a referenced section/file for complexity count
      FILES_COUNT=$((FILES_COUNT + 1))
      FILES_MISSING=$((FILES_MISSING + 1))
    fi
  fi
done

if [[ $FILES_COUNT -eq 0 ]]; then
  FILES_COUNT=1
fi

TOTAL_BYTES=$((TEXT_BYTES + FILE_BYTES_TOTAL))
INPUT_KB=$(( (TOTAL_BYTES + 1023) / 1024 ))
[[ $INPUT_KB -lt 1 ]] && INPUT_KB=1

# Step estimation heuristic
STEPS=1
EXPLAIN_EST=()

# baseline from task length (roughly every 120 chars = +1 step up to +4)
LENGTH_BUMP=$(( TEXT_BYTES / 120 ))
if [[ $LENGTH_BUMP -gt 4 ]]; then LENGTH_BUMP=4; fi
STEPS=$((STEPS + LENGTH_BUMP))
EXPLAIN_EST+=("length_bump:+$LENGTH_BUMP (text_bytes=$TEXT_BYTES)")

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

if contains_any "$TASK_LC" "analyze" "investigate" "compare" "summarize" "extract"; then
  STEPS=$((STEPS + 1))
  EXPLAIN_EST+=("keywords.analysis:+1")
fi
if contains_any "$TASK_LC" "refactor" "architecture" "design" "plan" "strategy" "multi-step" "across modules"; then
  STEPS=$((STEPS + 2))
  EXPLAIN_EST+=("keywords.complexity:+2")
fi
if contains_any "$TASK_LC" "implement" "build" "integrate" "orchestrate" "end-to-end"; then
  STEPS=$((STEPS + 2))
  EXPLAIN_EST+=("keywords.implementation:+2")
fi
if contains_any "$TASK_LC" "security" "compliance" "legal" "financial" "production"; then
  STEPS=$((STEPS + 2))
  EXPLAIN_EST+=("keywords.risk:+2")
fi

if [[ $FILES_COUNT -ge 3 ]]; then
  STEPS=$((STEPS + 1))
  EXPLAIN_EST+=("files>=3:+1")
fi
if [[ $FILES_COUNT -ge 7 ]]; then
  STEPS=$((STEPS + 1))
  EXPLAIN_EST+=("files>=7:+1")
fi

if [[ $STEPS -lt 1 ]]; then STEPS=1; fi
if [[ $STEPS -gt 12 ]]; then STEPS=12; EXPLAIN_EST+=("clamp:12"); fi

PASS_ARGS=(--steps "$STEPS" --input-kb "$INPUT_KB" --files "$FILES_COUNT" --text "$TASK_TEXT")
[[ $OUTPUT_JSON -eq 1 ]] && PASS_ARGS+=(--json)
[[ $EXPLAIN -eq 1 ]] && PASS_ARGS+=(--explain)
[[ $FORCE_EXTERNAL -eq 1 ]] && PASS_ARGS+=(--external)
[[ $FORCE_RISK -eq 1 ]] && PASS_ARGS+=(--risk)

if [[ $OUTPUT_JSON -eq 1 && $EXPLAIN -eq 1 ]]; then
  ROUTER_JSON="$($BASE_ROUTER "${PASS_ARGS[@]}")"
  EXPLAIN_LIST=""
  for i in "${!EXPLAIN_EST[@]}"; do
    [[ $i -gt 0 ]] && EXPLAIN_LIST+=$'\n'
    EXPLAIN_LIST+="${EXPLAIN_EST[$i]}"
  done
  ROUTER_JSON_ENV="$ROUTER_JSON" \
  EXPLAIN_LIST_ENV="$EXPLAIN_LIST" \
  STEPS_ENV="$STEPS" INPUT_KB_ENV="$INPUT_KB" FILES_COUNT_ENV="$FILES_COUNT" \
  TEXT_BYTES_ENV="$TEXT_BYTES" FILE_BYTES_TOTAL_ENV="$FILE_BYTES_TOTAL" \
  FILES_FOUND_ENV="$FILES_FOUND" FILES_MISSING_ENV="$FILES_MISSING" \
  python3 - <<'PY'
import json, os
base = json.loads(os.environ["ROUTER_JSON_ENV"])
explain_list = [x for x in os.environ.get("EXPLAIN_LIST_ENV", "").split("\n") if x]
base["auto_estimate"] = {
  "steps": int(os.environ["STEPS_ENV"]),
  "input_kb": int(os.environ["INPUT_KB_ENV"]),
  "files": int(os.environ["FILES_COUNT_ENV"]),
  "text_bytes": int(os.environ["TEXT_BYTES_ENV"]),
  "file_bytes_total": int(os.environ["FILE_BYTES_TOTAL_ENV"]),
  "files_found": int(os.environ["FILES_FOUND_ENV"]),
  "files_missing": int(os.environ["FILES_MISSING_ENV"]),
  "explain": explain_list,
}
print(json.dumps(base, ensure_ascii=False))
PY
else
  if [[ $EXPLAIN -eq 1 ]]; then
    echo "Auto-estimate breakdown:"
    echo "- text_bytes: $TEXT_BYTES"
    echo "- file_bytes_total: $FILE_BYTES_TOTAL"
    echo "- files: total=$FILES_COUNT, found=$FILES_FOUND, missing_refs=$FILES_MISSING"
    echo "- estimated_steps: $STEPS"
    for line in "${EXPLAIN_EST[@]}"; do
      echo "  - $line"
    done
    echo
  fi
  "$BASE_ROUTER" "${PASS_ARGS[@]}"
fi
