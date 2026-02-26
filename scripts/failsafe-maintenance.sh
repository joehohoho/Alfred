#!/bin/bash
# failsafe-maintenance.sh — Set/clear maintenance mode to suppress false alerts
# Usage:
#   failsafe-maintenance.sh on          # Enable maintenance (30 min default)
#   failsafe-maintenance.sh on 60       # Enable for 60 minutes
#   failsafe-maintenance.sh off         # Clear maintenance flag
#   failsafe-maintenance.sh status      # Check current status

FLAG="$HOME/.openclaw/workspace/data/failsafe-maintenance.flag"
mkdir -p "$(dirname "$FLAG")"

case "${1:-status}" in
  on)
    DURATION="${2:-30}"
    echo "maintenance:$(date +%s):${DURATION}m" > "$FLAG"
    echo "✅ Maintenance mode ON for ${DURATION} minutes — failsafe checks suppressed"
    ;;
  off)
    rm -f "$FLAG"
    echo "✅ Maintenance mode OFF — failsafe checks resumed"
    ;;
  status)
    if [ -f "$FLAG" ]; then
      AGE=$(( $(date +%s) - $(stat -f %m "$FLAG" 2>/dev/null || echo 0) ))
      REMAINING=$(( 1800 - AGE ))
      if [ "$REMAINING" -gt 0 ]; then
        echo "🟡 Maintenance mode ACTIVE — expires in ~$(( REMAINING / 60 ))m $(( REMAINING % 60 ))s"
      else
        echo "⚪ Maintenance flag present but EXPIRED (will be removed on next ping)"
      fi
    else
      echo "✅ Normal operation — no maintenance flag"
    fi
    ;;
  *)
    echo "Usage: failsafe-maintenance.sh <on [minutes]|off|status>"
    exit 1
    ;;
esac
