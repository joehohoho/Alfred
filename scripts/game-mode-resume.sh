#!/bin/bash
# game-mode-resume.sh — Resume all Alfred/HAL work after gaming
# Usage: bash game-mode-resume.sh
#
# Actions:
# 1. Verify pause state was saved
# 2. Re-enable all LaunchAgents from saved state
# 3. Remove pause marker
# 4. Signal gateway to resume dispatch
# 5. Restore work queue

set -e

PAUSE_STATE_DIR="$HOME/.openclaw/game-mode"
PAUSE_MARKER="$PAUSE_STATE_DIR/paused.marker"
SAVED_STATE="$PAUSE_STATE_DIR/saved-state.json"

if [ ! -f "$PAUSE_MARKER" ]; then
  echo "❌ Game Mode not active (no pause marker found)"
  exit 1
fi

if [ ! -f "$SAVED_STATE" ]; then
  echo "❌ Pause state not found. Cannot safely resume."
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Game Mode: RESUME initiated..."

# 1. Re-enable all LaunchAgents from saved state
AGENTS=$(python3 -c "
import json
try:
  with open('$SAVED_STATE') as f:
    data = json.load(f)
    for agent in data.get('agents_disabled', []):
      print(agent)
except:
  pass
")

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring LaunchAgents..."
for agent in $AGENTS; do
  launchctl start "$agent" 2>/dev/null || true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Started: $agent"
done

# 2. Signal gateway to resume task dispatch
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Signaling gateway resume..."
curl -s -X POST "http://localhost:3001/api/system/game-mode" \
  -H "Content-Type: application/json" \
  -d '{"mode":"active","reason":"gaming_complete"}' 2>/dev/null || true

# 3. Remove pause marker and state
rm -f "$PAUSE_MARKER" "$SAVED_STATE"

# 4. Trigger a work heartbeat (wake pending work)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Waking work queue..."
curl -s -X POST "http://localhost:3001/api/heartbeat/wake" 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Game Mode: RESUMED"
echo "   • All work restored"
echo "   • LaunchAgents re-enabled"
echo "   • Gateway resumed"
echo "   • Work queue awakened"
echo ""
echo "   Enjoy your gaming! 🎮"
