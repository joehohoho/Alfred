#!/bin/bash
# morning-brief-data.sh - Gathers all data for the morning brief
# Outputs structured text that the LLM just needs to lightly format.
# Keeps the LLM's job simple: summarize pre-gathered data.

set -o pipefail

echo "=== SYSTEM HEALTH ==="
bash "$HOME/.openclaw/workspace/scripts/cron-health-check.sh" 2>&1
echo ""
bash "$HOME/.openclaw/workspace/scripts/launchagent-health.sh" 2>&1
echo ""

echo "=== WEATHER: Dieppe, NB ==="
curl -s --max-time 10 'wttr.in/Dieppe,NB?format=%C+%t+feels+like+%f+wind+%w+humidity+%h+UV+%u' 2>/dev/null || echo "Weather unavailable"
echo ""
curl -s --max-time 10 'wttr.in/Dieppe,NB?format=3' 2>/dev/null || true
echo ""

echo "=== OVERNIGHT WORK ==="
TODAY=$(date +%Y-%m-%d)
MEMORY_FILE="$HOME/.openclaw/workspace/memory/${TODAY}.md"
if [ -f "$MEMORY_FILE" ]; then
    cat "$MEMORY_FILE"
else
    echo "No daily log for today yet."
fi
echo ""

YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d 'yesterday' +%Y-%m-%d 2>/dev/null)
YESTERDAY_FILE="$HOME/.openclaw/workspace/memory/${YESTERDAY}.md"
if [ -f "$YESTERDAY_FILE" ]; then
    echo "=== YESTERDAY'S LOG ==="
    tail -30 "$YESTERDAY_FILE"
fi
