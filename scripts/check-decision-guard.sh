#!/bin/bash
# check-decision-guard.sh — Check if a question has been recently asked/decided
# Usage: bash scripts/check-decision-guard.sh "Question Title" "Days since acceptable to re-ask"
# Exit: 0 = safe to ask, 1 = skip (already asked/decided recently)

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
QUESTION_TITLE="${1:-}"
REASK_DAYS="${2:-7}"

if [[ -z "$QUESTION_TITLE" ]]; then
  echo "❌ Usage: bash scripts/check-decision-guard.sh <question_title> [days_before_reask]" >&2
  exit 1
fi

found=0
for file in "$WORKSPACE"/decisions/20??-??.md; do
  [[ -f "$file" ]] || continue

  block=$(awk -v title="$QUESTION_TITLE" '
    $0 == "## Decision: " title {flag=1; print; next}
    flag && /^## Decision: / {exit}
    flag {print}
  ' "$file")

  [[ -n "$block" ]] || continue
  found=1

  decided_date=$(printf '%s\n' "$block" | sed -n 's/^\*\*Date decided:\*\*[[:space:]]*//p' | head -1 | tr -d ' ')
  review_date=$(printf '%s\n' "$block" | sed -n 's/^\*\*Review date:\*\*[[:space:]]*//p' | head -1 | tr -d ' ')
  status_line=$(printf '%s\n' "$block" | sed -n 's/^\*\*Status:\*\*[[:space:]]*//p' | head -1)

  if [[ -z "$decided_date" || "$status_line" == *PENDING* ]]; then
    echo "⏳ Question '$QUESTION_TITLE' is still pending, skip for now"
    exit 1
  fi

  if [[ -n "$review_date" ]]; then
    review_epoch=$(date -j -f "%Y-%m-%d" "$review_date" +%s 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    if [[ "$review_epoch" -gt "$now_epoch" ]]; then
      echo "❌ Question '$QUESTION_TITLE' decided on $decided_date, review date $review_date, skip"
      exit 1
    else
      echo "🔄 Question '$QUESTION_TITLE' review date passed, OK to re-ask"
      exit 0
    fi
  fi

  decided_epoch=$(date -j -f "%Y-%m-%d" "$decided_date" +%s 2>/dev/null || echo 0)
  now_epoch=$(date +%s)
  age_days=$(( (now_epoch - decided_epoch) / 86400 ))
  if [[ "$age_days" -lt "$REASK_DAYS" ]]; then
    echo "❌ Question '$QUESTION_TITLE' decided $age_days days ago, skip"
    exit 1
  fi

  echo "✅ Question '$QUESTION_TITLE' exceeds re-ask window, OK to ask"
  exit 0
done

if [[ "$found" -eq 0 ]]; then
  echo "✅ Question '$QUESTION_TITLE' is new, safe to ask"
  exit 0
fi
