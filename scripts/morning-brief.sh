#!/bin/bash
# morning-brief.sh — Build a concise Morning Brief snapshot using Haiku.
#
# Output: writes to MORNING-BRIEF-LATEST.md (workspace root + memory/)
#
# Usage:
#   bash scripts/morning-brief.sh
#   bash scripts/morning-brief.sh --stdout
#   bash scripts/morning-brief.sh --out /custom/path.md

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
DATA_SCRIPT="$WORKSPACE/scripts/morning-brief-data.sh"
OUT_FILE="$WORKSPACE/memory/MORNING-BRIEF-LATEST.md"
PRINT_STDOUT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stdout) PRINT_STDOUT=1; shift ;;
    --out) OUT_FILE="${2:-}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -x "$DATA_SCRIPT" ]]; then
  echo "ERROR: missing executable data script: $DATA_SCRIPT" >&2
  exit 1
fi

RAW_DATA="$(bash "$DATA_SCRIPT" 2>&1 || true)"
NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOCAL_TS="$(TZ=America/Moncton date '+%A, %Y-%m-%d %H:%M %Z')"

# Build prompt without heredoc (avoids RAW_DATA line-break issues)
PROMPT="You are Alfred preparing Joe's morning brief.

Rules:
- Output plain markdown only (no code fences)
- Keep it concise and actionable
- Focus on: (1) system health, (2) weather in Dieppe, (3) overnight work highlights, (4) blockers/risks
- Include a short 'Top 3 priorities today' section
- If data is missing, state it explicitly

Header format:
# Morning Brief -- ${LOCAL_TS}

Data:
${RAW_DATA}"

BRIEF=""
if command -v claude >/dev/null 2>&1; then
  BRIEF="$(printf '%s' "$PROMPT" | claude --model claude-haiku-4-5 --no-markdown -p "" 2>/dev/null || true)"
fi

if [[ -z "${BRIEF// }" ]]; then
  BRIEF="# Morning Brief -- ${LOCAL_TS}

> Fallback mode: Haiku synthesis unavailable. Raw data snapshot included.

## Source Data Snapshot
${RAW_DATA}"
fi

FINAL_OUTPUT="${BRIEF}

---
_generated_at_utc: ${NOW_ISO}
_generator: scripts/morning-brief.sh"

if [[ $PRINT_STDOUT -eq 1 ]]; then
  printf '%s\n' "$FINAL_OUTPUT"
  exit 0
fi

mkdir -p "$(dirname "$OUT_FILE")"
printf '%s\n' "$FINAL_OUTPUT" > "$OUT_FILE"
printf '%s\n' "$FINAL_OUTPUT" > "$WORKSPACE/MORNING-BRIEF-LATEST.md"

echo "OK: wrote morning brief to $OUT_FILE"
