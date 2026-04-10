#!/bin/bash
# game-mode-check.sh — Check current Game Mode state
# Returns: 0 if active, 1 if paused

PAUSE_MARKER="$HOME/.openclaw/game-mode/paused.marker"

if [ -f "$PAUSE_MARKER" ]; then
  echo "paused"
  exit 1
else
  echo "active"
  exit 0
fi
