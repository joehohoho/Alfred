#!/bin/bash
# agents-size-guard.sh — Check AGENTS.md size and alert if approaching limit
# Limit: 20,000 characters. Warn at 85% (17,000), critical at 95% (19,000).

AGENTS_FILE="$HOME/.openclaw/workspace/AGENTS.md"
LIMIT=20000
WARN_THRESHOLD=17000
CRITICAL_THRESHOLD=19000

if [ ! -f "$AGENTS_FILE" ]; then
  echo "ERROR: AGENTS.md not found at $AGENTS_FILE"
  exit 1
fi

CHAR_COUNT=$(wc -c < "$AGENTS_FILE" | tr -d ' ')
PERCENT=$(( CHAR_COUNT * 100 / LIMIT ))

echo "AGENTS.md: ${CHAR_COUNT}/${LIMIT} chars (${PERCENT}%)"

if [ "$CHAR_COUNT" -ge "$CRITICAL_THRESHOLD" ]; then
  echo "🚨 CRITICAL: AGENTS.md at ${PERCENT}% capacity (${CHAR_COUNT} chars). Extract sections NOW."
  # Send notification to Command Center
  bash "$HOME/.openclaw/workspace/scripts/send-notification.sh" \
    "question" \
    "🚨 AGENTS.md Size Critical" \
    "AGENTS.md is at ${CHAR_COUNT}/${LIMIT} chars (${PERCENT}%). Risk of system crash. Sections need to be extracted to satellite files immediately. Current largest sections should be moved to standalone files with one-line references." \
    "" "" "agents-size-guard"
  exit 2
elif [ "$CHAR_COUNT" -ge "$WARN_THRESHOLD" ]; then
  echo "⚠️ WARNING: AGENTS.md at ${PERCENT}% capacity (${CHAR_COUNT} chars). Plan extraction soon."
  bash "$HOME/.openclaw/workspace/scripts/send-notification.sh" \
    "question" \
    "⚠️ AGENTS.md Size Warning" \
    "AGENTS.md is at ${CHAR_COUNT}/${LIMIT} chars (${PERCENT}%). Getting close to the 20,000 char limit. Consider extracting the largest remaining section to a satellite file." \
    "" "" "agents-size-guard"
  exit 1
else
  echo "✅ OK: AGENTS.md at ${PERCENT}% capacity. Safe."
  exit 0
fi
