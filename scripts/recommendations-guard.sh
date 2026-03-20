#!/bin/bash
# recommendations-guard.sh — validates key recommendation implementations remain in place.
# Exit 0 = all checks pass, 1 = one or more missing/broken.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
FAIL=0

check_file() {
  local path="$1"
  local label="$2"
  if [[ -f "$path" ]]; then
    echo "✅ $label"
  else
    echo "❌ $label (missing: $path)"
    FAIL=1
  fi
}

check_grep() {
  local pattern="$1"
  local file="$2"
  local label="$3"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "✅ $label"
  else
    echo "❌ $label"
    FAIL=1
  fi
}

echo "=== Recommendation Guard ==="

check_file "$WORKSPACE/scripts/morning-brief.sh" "morning-brief.sh exists"
check_file "$WORKSPACE/scripts/hal-skills.json" "hal-skills.json exists"
check_file "$WORKSPACE/scripts/kanban-create.sh" "kanban-create.sh exists"

check_grep "MORNING-BRIEF-LATEST.md" "$WORKSPACE/AGENTS.md" "boot sequence reads MORNING-BRIEF-LATEST.md"
check_grep "hal-context-\${CARD_ID}" "$WORKSPACE/scripts/kanban-create.sh" "kanban-create writes hal-context-<card_id>.md"
check_grep "HAL_SKILLS_FILE" "$WORKSPACE/scripts/hal-get-idle-task.sh" "HAL card matching references hal-skills.json"

echo "---"
if [[ $FAIL -eq 0 ]]; then
  echo "PASS: all recommendation checks are in place"
  exit 0
fi

echo "FAIL: one or more recommendation checks failed"
exit 1
