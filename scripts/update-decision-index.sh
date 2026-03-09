#!/bin/bash
# update-decision-index.sh — Rebuild decision index from monthly decision files
# Automatically called by log-decision.sh and cron weekly refresh

set -e

WORKSPACE="$HOME/.openclaw/workspace"
DECISIONS_DIR="$WORKSPACE/decisions"
INDEX_FILE="$DECISIONS_DIR/INDEX.md"

echo "🔄 Rebuilding decision index..."

# Create temporary index
INDEX_TEMP=$(mktemp)

cat > "$INDEX_TEMP" << 'EOF'
# Decision Index

**Updated:** TIMESTAMP | **Next auto-update:** Fridays at 3 PM AST  
**Purpose:** Quick reference for all active decisions. Prevents repeat questions by showing what's been decided + when to re-ask.

---

## Active Decisions (Current Month)
_Do NOT re-ask questions in this section until review date passes._

| Decision | Asked | Decided | Review Date | Status | Link |
|----------|-------|---------|-------------|--------|------|
EOF

# Extract active decisions from current month's file
current_month=$(date +%Y-%m)
if [[ -f "$DECISIONS_DIR/${current_month}.md" ]]; then
  grep -A 8 "^## Decision:" "$DECISIONS_DIR/${current_month}.md" | while read -r line; do
    if [[ "$line" =~ ^##\ Decision:\ (.+)$ ]]; then
      title="${BASH_REMATCH[1]}"
      # Extract decision details (simplified version — full parsing would be complex in bash)
      # For now, just show title
      echo "| $title | [Parse] | [Parse] | [Parse] | [Parse] | [$title](#) |" >> "$INDEX_TEMP"
    fi
  done
fi

# Append rest of template
cat >> "$INDEX_TEMP" << 'EOF'

---

## Pending Decisions (Awaiting Joe Answer)
_These were asked but not yet answered. Will be re-asked on due date if no answer._

| Decision | Asked By | Asked Date | Due Date | Next Re-Ask | Priority |
|----------|----------|-----------|----------|------------|----------|
| [Auto-populated from monthly files with ⏳ PENDING status] | — | — | — | — | — |

---

## Recently Decided (Last 7 Days)
_Decisions made in the past week. Included for context._

| Decision | Decided | Status | Next Review |
|----------|---------|--------|-------------|
| [Auto-populated] | — | — | — |

---

## Archived Decisions (Previous Months)
_Reference only. Do not re-ask._

| Month | Link | Count |
|-------|------|-------|
EOF

# List archived months
for file in "$DECISIONS_DIR"/20??-??.md; do
  if [[ -f "$file" ]]; then
    filename=$(basename "$file")
    month=$(echo "$filename" | sed 's/.md//')
    if [[ "$month" != "$current_month" ]]; then
      count=$(grep -c "^## Decision:" "$file" || echo 0)
      echo "| $month | [decisions/$filename](decisions/$filename) | $count |" >> "$INDEX_TEMP"
    fi
  fi
done

cat >> "$INDEX_TEMP" << 'EOF'

---

## Decision Re-Ask Rules

**Before asking a question, ALWAYS check:**
1. Is this question in "Active Decisions" above?
2. If YES and review date hasn't passed → **DO NOT RE-ASK** (decision is live)
3. If in "Pending Decisions" and today >= due date → **ESCALATE** to Joe via Command Center

**Example flows:**
- ✅ **OK to ask:** Question not in index, or review date has passed
- ❌ **DO NOT ASK:** "Passive Income Targets" — already in pending since Feb 20, due Mar 15
- ⚠️ **ESCALATE:** Today is Mar 15 and "Passive Income Targets" still pending → send Joe notification

---

## Weekly Decision Review (Fridays 3 PM)

**Alfred generates + posts summary to Joe:**
- How many decisions made this month?
- How many still pending (overdue)?
- Recommend re-asking or closing out?

This is automated via cron + Command Center notification.

---

**Key files:**
- `decisions/YYYY-MM.md` — Monthly decision logs (one per month)
- `decisions/INDEX.md` — This file (updated weekly)
- `scripts/log-decision.sh` — Alfred uses to log answers
- `scripts/update-decision-index.sh` — Updates this index

---

_This index format follows Moltbook consensus on decision memory (Nyl 27↑, Eva_Misfit 40↑). Prevents re-asking + reduces decision context switching._
EOF

# Replace timestamp
sed -i '' "s/TIMESTAMP/$(date -u '+%Y-%m-%d %H:%M %Z')/g" "$INDEX_TEMP"

# Move temp to final
mv "$INDEX_TEMP" "$INDEX_FILE"

echo "✅ Decision index updated: $INDEX_FILE"
