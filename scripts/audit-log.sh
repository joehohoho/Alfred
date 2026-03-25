#!/bin/bash
# audit-log.sh — Centralized audit/error log writer
# Usage: audit-log.sh <level> <source> <message> [--detail "extra info"]
#
# Levels: error, warn, info, success
# Sources: hal-dispatch, gateway-watchdog, session-cleanup, work-executor,
#          idle-loop, comment-delivery, notification, cron, backtest, etc.
#
# Appends one JSON line to ~/.openclaw/logs/audit.jsonl
# Auto-rotates when file exceeds 5MB (keeps last 2 rotations)

AUDIT_FILE="$HOME/.openclaw/logs/audit.jsonl"
MAX_SIZE=5242880  # 5MB

# Parse arguments
LEVEL="${1:-info}"
SOURCE="${2:-unknown}"
MESSAGE="${3:-}"
DETAIL=""
AGENT="${AUDIT_AGENT:-alfred}"

shift 3 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --detail) DETAIL="$2"; shift 2 ;;
    --agent) AGENT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

[[ -z "$MESSAGE" ]] && exit 0

mkdir -p "$(dirname "$AUDIT_FILE")"

# Auto-rotate if file exceeds 5MB
if [[ -f "$AUDIT_FILE" ]]; then
  FILE_SIZE=$(wc -c < "$AUDIT_FILE" 2>/dev/null || echo "0")
  if [[ "$FILE_SIZE" -gt "$MAX_SIZE" ]]; then
    [[ -f "${AUDIT_FILE}.1" ]] && mv -f "${AUDIT_FILE}.1" "${AUDIT_FILE}.2"
    mv -f "$AUDIT_FILE" "${AUDIT_FILE}.1"
  fi
fi

# Build JSON line — use python3 for safe JSON escaping (< 30ms)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
python3 -c "
import json, sys
entry = {'ts': sys.argv[1], 'level': sys.argv[2], 'source': sys.argv[3], 'message': sys.argv[4], 'agent': sys.argv[5]}
detail = sys.argv[6] if len(sys.argv) > 6 else ''
if detail:
    entry['detail'] = detail
print(json.dumps(entry, separators=(',', ':')))
" "$TS" "$LEVEL" "$SOURCE" "$MESSAGE" "$AGENT" "$DETAIL" >> "$AUDIT_FILE" 2>/dev/null
