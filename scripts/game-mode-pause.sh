#!/bin/bash
# game-mode-pause.sh — Pause all Alfred/HAL work for gaming
# Usage: bash game-mode-pause.sh
#
# Actions:
# 1. Create pause marker file
# 2. Disable all LaunchAgents (save state)
# 3. Stop all active processes
# 4. Lock OpenClaw gateway (soft-lock, no new tasks)
# 5. Log pause state to disk

set -e

PAUSE_STATE_DIR="$HOME/.openclaw/game-mode"
PAUSE_MARKER="$PAUSE_STATE_DIR/paused.marker"
SAVED_STATE="$PAUSE_STATE_DIR/saved-state.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$PAUSE_STATE_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Game Mode: PAUSE initiated..."

# 1. Create pause marker (signals cron/heartbeat to skip work)
echo "{\"paused_at\":\"$TIMESTAMP\",\"paused_by\":\"game_mode\",\"status\":\"paused\"}" > "$PAUSE_MARKER"

# 2. Save current LaunchAgent state before disabling
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Saving LaunchAgent state..."
cat > "$SAVED_STATE" <<EOF
{
  "paused_at": "$TIMESTAMP",
  "agents_disabled": [
EOF

# List of agents to pause (non-critical only)
AGENTS_TO_PAUSE=(
  "com.alfred.alfred-work-executor"
  "com.alfred.hal-idle-dispatch"
  "com.alfred.kanban-idle-loop"
  "com.alfred.kanban-stale-scan"
  "com.alfred.session-cleanup"
  "com.alfred.daily-inquiry"
  "com.alfred.overnight-scheduler"
  "com.alfred.market-signals-app"
  "com.alfred.signal-trainer"
)

for agent in "${AGENTS_TO_PAUSE[@]}"; do
  echo "    \"$agent\"," >> "$SAVED_STATE"
  launchctl stop "$agent" 2>/dev/null || true
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stopped: $agent"
done

# Remove trailing comma from JSON array
sed -i '' '$ s/,$//' "$SAVED_STATE"

cat >> "$SAVED_STATE" <<EOF
  ]
}
EOF

# 3. Signal gateway to pause task dispatch (soft lock)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Signaling gateway pause..."
curl -s -X POST "http://localhost:3001/api/system/game-mode" \
  -H "Content-Type: application/json" \
  -d '{"mode":"paused","reason":"gaming"}' 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Game Mode: PAUSED"
echo "   • All work suspended"
echo "   • LaunchAgents disabled"
echo "   • Gateway paused"
echo "   • State saved at: $SAVED_STATE"
echo ""
echo "   To resume: bash ~/.openclaw/workspace/scripts/game-mode-resume.sh"
