#!/bin/bash
set -euo pipefail

CARD_ID=""
TO_COLUMN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --card-id)
      CARD_ID="${2:-}"
      shift 2
      ;;
    --to-column)
      TO_COLUMN="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$CARD_ID" || -z "$TO_COLUMN" ]]; then
  echo "Usage: kanban-evidence-gate.sh --card-id <id> --to-column <col>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AUDIT_LOG="$WORKSPACE_DIR/tracking/evidence-gate-audit.log"
mkdir -p "$(dirname "$AUDIT_LOG")"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log_event() { echo "$(ts) | $*" >> "$AUDIT_LOG"; }

# Gate only review/done; pass-through otherwise.
if [[ "$TO_COLUMN" != "review" && "$TO_COLUMN" != "done" ]]; then
  echo "GATE:PASS card=$CARD_ID col=$TO_COLUMN"
  exit 0
fi

CARD_JSON=$(curl -s --max-time 10 "http://localhost:3001/api/kanban/$CARD_ID" || true)

# Fail-open if API is unavailable or card payload is not usable.
if [[ -z "$CARD_JSON" ]] || ! echo "$CARD_JSON" | jq -e . >/dev/null 2>&1; then
  echo "GATE:WARN card=$CARD_ID col=$TO_COLUMN reason=fetch_error_fail_open" >&2
  log_event "GATE:PASS | card=$CARD_ID | col=$TO_COLUMN | evidence_found=unknown | fail_open=true"
  echo "GATE:PASS card=$CARD_ID col=$TO_COLUMN"
  exit 0
fi

if echo "$CARD_JSON" | jq -e '.error? != null' >/dev/null 2>&1; then
  echo "GATE:WARN card=$CARD_ID col=$TO_COLUMN reason=api_error_fail_open" >&2
  log_event "GATE:PASS | card=$CARD_ID | col=$TO_COLUMN | evidence_found=unknown | fail_open=true"
  echo "GATE:PASS card=$CARD_ID col=$TO_COLUMN"
  exit 0
fi

COMMENTS_JSON=$(echo "$CARD_JSON" | jq -c '.comments // []')

OVERRIDE_COMMENT=$(echo "$COMMENTS_JSON" | jq -r '
  map(select((.author // "" | ascii_downcase) as $a | ($a=="alfred" or $a=="hal") and ((.text // "") | contains("## EVIDENCE OVERRIDE"))))
  | last // empty
')

if [[ -n "$OVERRIDE_COMMENT" ]]; then
  OVERRIDE_TEXT=$(echo "$OVERRIDE_COMMENT" | jq -r '.text // ""')
  OVERRIDE_AUTHOR=$(echo "$OVERRIDE_COMMENT" | jq -r '.author // "unknown"')
  OVERRIDE_REASON=$(printf '%s\n' "$OVERRIDE_TEXT" | sed -nE 's/^reason:[[:space:]]*(.*)$/\1/p' | head -1)
  [[ -z "$OVERRIDE_REASON" ]] && OVERRIDE_REASON="unspecified"

  log_event "GATE:OVERRIDE | card=$CARD_ID | col=$TO_COLUMN | reason=\"$OVERRIDE_REASON\" | author=$OVERRIDE_AUTHOR"
  echo "GATE:OVERRIDE card=$CARD_ID"
  exit 0
fi

EVIDENCE_TEXT=$(echo "$COMMENTS_JSON" | jq -r '
  map(select((.author // "" | ascii_downcase) as $a | ($a=="alfred" or $a=="hal") and ((.text // "") | contains("## EVIDENCE"))))
  | map(.text // "")
  | last // ""
')

if [[ -z "$EVIDENCE_TEXT" ]]; then
  MISSING="summary_of_changes,validation_steps,validation_results,artifacts"
  log_event "GATE:BLOCK | card=$CARD_ID | col=$TO_COLUMN | missing=$MISSING"
  echo "GATE:BLOCK card=$CARD_ID col=$TO_COLUMN missing=$MISSING"
  exit 1
fi

missing_fields=()
for field in summary_of_changes validation_steps validation_results artifacts; do
  value=$(printf '%s\n' "$EVIDENCE_TEXT" | sed -nE "s/^${field}:[[:space:]]*(.*)$/\1/p" | head -1)
  if [[ -z "${value// }" ]]; then
    missing_fields+=("$field")
  fi
done

if [[ ${#missing_fields[@]} -gt 0 ]]; then
  joined=$(IFS=,; echo "${missing_fields[*]}")
  log_event "GATE:BLOCK | card=$CARD_ID | col=$TO_COLUMN | missing=$joined"
  echo "GATE:BLOCK card=$CARD_ID col=$TO_COLUMN missing=$joined"
  exit 1
fi

log_event "GATE:PASS | card=$CARD_ID | col=$TO_COLUMN | evidence_found=true"
echo "GATE:PASS card=$CARD_ID col=$TO_COLUMN"
exit 0
