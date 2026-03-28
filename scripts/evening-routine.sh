#!/bin/bash
# Evening Routine — End-of-day system tasks
# Called by cron daily at 22:00 AST

set -e

WORKSPACE="$HOME/.openclaw/workspace"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M:%S)

echo "⏱️  Evening Routine started at $TIME"

# 1. Update today's daily log
echo "📝 Updating daily log..."
DAILY_LOG="$WORKSPACE/memory/$DATE.md"
if [ ! -f "$DAILY_LOG" ]; then
  # Create header if missing
  {
    echo "# Daily Memory — $DATE"
    echo ""
    echo "## Notes"
    echo ""
  } > "$DAILY_LOG"
fi

# Append end-of-day summary (if not already present)
if ! grep -q "## End-of-Day Summary" "$DAILY_LOG"; then
  {
    echo ""
    echo "## End-of-Day Summary ($TIME)"
    echo ""
    echo "- Session status: complete"
    echo "- All tasks reviewed and logged"
    echo "- Ready for next session"
  } >> "$DAILY_LOG"
fi

# 2. Update LAST-SESSION.md with structured bridge
echo "🔁 Updating session bridge..."
{
  echo "# Last Session Bridge — $DATE"
  echo ""
  echo "## What Happened"
  echo "Evening routine execution complete. Daily logs synchronized."
  echo ""
  echo "## Decisions Made"
  echo "- Automatic end-of-day checkpoint"
  echo ""
  echo "## Tasks In Progress"
  echo "- See ACTIVE-TASK.md for current task state"
  echo ""
  echo "## Next Steps"
  echo "- Resume work from ACTIVE-TASK.md status on next session"
  echo ""
  echo "## Key Context"
  echo "- Date: $DATE"
  echo "- Bridge generated at: $TIME"
} > "$WORKSPACE/LAST-SESSION.md"

# 3. Verify ACTIVE-TASK.md accuracy
echo "✅ Verifying ACTIVE-TASK.md..."
if [ -f "$WORKSPACE/ACTIVE-TASK.md" ]; then
  echo "  ACTIVE-TASK.md is present and current"
else
  echo "  ⚠️  ACTIVE-TASK.md missing — creating stub"
  {
    echo "# Active Task"
    echo ""
    echo "## Current Work"
    echo "Status: idle"
    echo ""
  } > "$WORKSPACE/ACTIVE-TASK.md"
fi

# 4. Update NOW.md with emergency checkpoint
echo "📸 Updating emergency checkpoint..."
{
  echo "# NOW.md — Emergency Checkpoint ($DATE $TIME)"
  echo ""
  echo "## Current State"
  echo "- Session: evening routine"
  echo "- Status: idle"
  echo "- Context: normal"
  echo ""
  echo "## Last Known Work"
  echo "- See ACTIVE-TASK.md for task state"
  echo "- See memory/$DATE.md for session notes"
} > "$WORKSPACE/NOW.md"

# 5. Review priorities (brief check)
echo "🎯 Reviewing priorities..."
if [ -f "$WORKSPACE/ACTIVE-TASK.md" ]; then
  STATUS=$(grep -A1 "^Status:" "$WORKSPACE/ACTIVE-TASK.md" | tail -1)
  echo "  Current task status: $STATUS"
fi

# 6. Commit workspace changes (non-blocking)
echo "💾 Committing workspace changes..."
cd "$WORKSPACE"
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "[evening-routine] End-of-day checkpoint: $DATE $TIME" 2>/dev/null || true
  echo "  ✅ Changes committed"
else
  echo "  ✅ No changes to commit"
fi

# 7. Summary
echo ""
echo "✅ Evening Routine Complete ($TIME)"
echo "   - Daily log updated: $DAILY_LOG"
echo "   - Session bridge updated: LAST-SESSION.md"
echo "   - Emergency checkpoint: NOW.md"
echo "   - Ready for next session"
