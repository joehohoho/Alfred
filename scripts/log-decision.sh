#!/bin/bash
# log-decision.sh — Log a decision (answer to a pending question)
# Usage: bash scripts/log-decision.sh "Decision Title" "Joe's answer" "Why" "Review date (YYYY-MM-DD)"

set -e

WORKSPACE="$HOME/.openclaw/workspace"
TITLE="$1"
ANSWER="$2"
REASONING="$3"
REVIEW_DATE="$4"

if [[ -z "$TITLE" ]] || [[ -z "$ANSWER" ]] || [[ -z "$REASONING" ]] || [[ -z "$REVIEW_DATE" ]]; then
  echo "❌ Usage: bash scripts/log-decision.sh <title> <answer> <reasoning> <review_date>"
  echo ""
  echo "Example:"
  echo "  bash scripts/log-decision.sh \\"
  echo "    'Passive Income Targets' \\"
  echo "    '\$10k/month by Q2 (April-May)' \\"
  echo "    'Market Signal Lab + app growth combo can hit this target' \\"
  echo "    '2026-04-10'"
  exit 1
fi

# Validate review date format
if ! [[ "$REVIEW_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "❌ Invalid review date format: $REVIEW_DATE (expected: YYYY-MM-DD)"
  exit 1
fi

# Validate review date is in the future
review_epoch=$(date -j -f "%Y-%m-%d" "$REVIEW_DATE" +%s 2>/dev/null || echo 0)
now_epoch=$(date +%s)
if [[ $review_epoch -le $now_epoch ]]; then
  echo "❌ Review date must be in the future: $REVIEW_DATE"
  exit 1
fi

# Determine month for monthly file
month=$(date +%Y-%m)
decision_file="$WORKSPACE/decisions/${month}.md"

# Create monthly file if it doesn't exist
if [[ ! -f "$decision_file" ]]; then
  echo "📝 Creating monthly decision file: $decision_file"
  cat > "$decision_file" << EOF
# Decisions — $(date +%B\ %Y)

_Monthly decisions log. Prevents repeated decision-making and preserves strategic continuity._

---

EOF
fi

# Append decision entry
cat >> "$decision_file" << EOF
## Decision: $TITLE
**Date asked:** [from previous entry or manually set]
**Date decided:** $(date -u +%Y-%m-%d)
**Decided by:** Joe
**Decision:** $ANSWER
**Why:** $REASONING
**Implication:** [Set by Alfred when reviewing decision impact]
**Review date:** $REVIEW_DATE
**Status:** ✅ DECIDED (do NOT re-ask before review date)

---

EOF

echo "✅ Decision logged: $TITLE"
echo "   Answer: $ANSWER"
echo "   Review: $REVIEW_DATE"

# Update decision index
echo "🔄 Updating decision index..."
bash "$WORKSPACE/scripts/update-decision-index.sh"

echo "✅ Complete! Decision is live in decisions/$month.md"
