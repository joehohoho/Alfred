#!/bin/bash
# check-decision-guard.sh — Check if a question has been recently asked/decided
# Used by daily-inquiry.sh to prevent duplicate questions
# Usage: bash scripts/check-decision-guard.sh "Question Title" "Days since acceptable to re-ask"
# Exit: 0 = safe to ask, 1 = skip (already asked/decided recently)

WORKSPACE="$HOME/.openclaw/workspace"
QUESTION_TITLE="$1"
REASK_DAYS="${2:-7}"  # Default: don't re-ask within 7 days

if [[ -z "$QUESTION_TITLE" ]]; then
  echo "❌ Usage: bash scripts/check-decision-guard.sh <question_title> [days_before_reask]"
  exit 1
fi

# Search all monthly decision files for this question
for file in "$WORKSPACE"/decisions/20??-??.md; do
  if [[ ! -f "$file" ]]; then
    continue
  fi
  
  # Check if question title appears in this file
  if grep -q "## Decision: $QUESTION_TITLE" "$file"; then
    # Extract decided date
    decided_date=$(grep -A 3 "## Decision: $QUESTION_TITLE" "$file" | grep "^**Date decided:**" | sed 's/.*\*\*Date decided:\*\* //' | tr -d ' ')
    
    # If no date, it's pending
    if [[ -z "$decided_date" ]] || [[ "$decided_date" == "[PENDING" ]]; then
      echo "⏳ Question '$QUESTION_TITLE' is still PENDING — skip for now"
      return 1
    fi
    
    # Check if review date has passed
    review_date=$(grep -A 7 "## Decision: $QUESTION_TITLE" "$file" | grep "^**Review date:**" | sed 's/.*\*\*Review date:\*\* //')
    
    if [[ -n "$review_date" ]]; then
      review_epoch=$(date -j -f "%Y-%m-%d" "$review_date" +%s 2>/dev/null || echo 999999999999)
      now_epoch=$(date +%s)
      
      if [[ $review_epoch -gt $now_epoch ]]; then
        echo "✅ Question '$QUESTION_TITLE' decided on $decided_date, review date: $review_date — skip (still active)"
        return 1
      fi
    fi
    
    # If we got here, question was decided but review date passed
    echo "🔄 Question '$QUESTION_TITLE' review date passed — OK to re-ask"
    return 0
  fi
done

# Question not found in decision log — safe to ask (new question)
echo "✅ Question '$QUESTION_TITLE' is new — safe to ask"
return 0
