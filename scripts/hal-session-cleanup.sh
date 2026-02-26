#!/bin/bash
# hal-session-cleanup.sh
# Deletes completed HAL task sessions from disk to prevent dead-session buildup.
# Safe to run on a cron (e.g., nightly). Only touches agent:hal:task-* sessions.
# agent:hal:main is never touched.
#
# Usage: bash hal-session-cleanup.sh [--dry-run] [--older-than-hours <n>]

set -euo pipefail

DRY_RUN=0
OLDER_THAN_HOURS=24  # default: clean sessions older than 24h
SESSIONS_DIR="$HOME/.openclaw/agents/hal/sessions"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --older-than-hours) OLDER_THAN_HOURS="${2:-24}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$SESSIONS_DIR" ]]; then
  echo "No HAL sessions dir found at $SESSIONS_DIR — nothing to clean."
  exit 0
fi

CUTOFF_EPOCH=$(( $(date +%s) - OLDER_THAN_HOURS * 3600 ))
DELETED=0
SKIPPED=0

for f in "$SESSIONS_DIR"/*.jsonl; do
  [[ -f "$f" ]] || continue
  BASENAME=$(basename "$f" .jsonl)

  # Only touch isolated task sessions — never main
  if [[ "$BASENAME" != agent:hal:task-* ]] && [[ "$BASENAME" != hal:task-* ]]; then
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  FILE_MTIME=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  if [[ "$FILE_MTIME" -lt "$CUTOFF_EPOCH" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      echo "[dry-run] would delete: $f"
    else
      rm -f "$f"
      echo "deleted: $BASENAME"
    fi
    DELETED=$((DELETED + 1))
  fi
done

echo "hal-session-cleanup: deleted=$DELETED skipped=$SKIPPED older_than=${OLDER_THAN_HOURS}h dry_run=$DRY_RUN"
