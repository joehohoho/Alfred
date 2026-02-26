#!/bin/bash
# openclaw-maintenance-weekly.sh
# Low-risk weekly maintenance snapshot for OpenClaw infra.
# Safe: read-only checks + optional report file generation.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
LOG_DIR="$HOME/.openclaw/logs"
REPORT_DIR="$WORKSPACE/reports"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
REPORT_FILE="${1:-$REPORT_DIR/maintenance-weekly-$(date +%Y-%m-%d).md}"

mkdir -p "$REPORT_DIR"

{
  echo "# OpenClaw Weekly Maintenance Snapshot"
  echo "- Generated: $NOW_UTC"
  echo "- Host: $(hostname)"
  echo ""

  echo "## 1) LaunchAgent health"
  if command -v launchctl >/dev/null 2>&1; then
    AGENTS=(
      "com.ollama.keepalive"
      "com.openclaw.imsg-responder"
      "com.alfred.dashboard-nextjs"
      "com.cloudflare.tunnel"
    )

    for agent in "${AGENTS[@]}"; do
      if launchctl list | grep -q "$agent"; then
        status=$(launchctl list | awk -v a="$agent" '$0 ~ a {print $1; exit}')
        echo "- ✅ $agent (status=$status)"
      else
        echo "- ❌ $agent (not loaded)"
      fi
    done
  else
    echo "- launchctl unavailable on this host"
  fi
  echo ""

  echo "## 2) Recent critical errors (last 24h)"
  if [ -f "$LOG_DIR/gateway.err.log" ]; then
    no_tool_count=$(grep -c "No tool call found" "$LOG_DIR/gateway.err.log" || true)
    timeout_count=$(grep -c "timed out" "$LOG_DIR/gateway.err.log" || true)
    ws_expired_count=$(grep -c "device signature expired" "$LOG_DIR/gateway.err.log" || true)
    echo "- gateway.err.log:"
    echo "  - No tool call found: $no_tool_count"
    echo "  - timed out: $timeout_count"
    echo "  - device signature expired: $ws_expired_count"
  else
    echo "- gateway.err.log missing"
  fi
  echo ""

  echo "## 3) Log growth (top 10 files)"
  if [ -d "$LOG_DIR" ]; then
    find "$LOG_DIR" -maxdepth 1 -type f -name "*.log" -print0 \
      | xargs -0 ls -lhS 2>/dev/null \
      | head -10 \
      | awk '{print "- "$9" ("$5")"}'
  else
    echo "- Log directory missing: $LOG_DIR"
  fi
  echo ""

  echo "## 4) Git safety snapshot"
  if [ -d "$WORKSPACE/.git" ]; then
    echo "- Branch: $(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    echo "- Working tree changes: $(git -C "$WORKSPACE" status --porcelain | wc -l | tr -d ' ') file(s)"
    echo "- Recent commits (3):"
    git -C "$WORKSPACE" log --oneline -3 | sed 's/^/  - /'
  else
    echo "- Not a git workspace"
  fi
  echo ""

  echo "## 5) Suggested actions"
  echo "- Run log rotation: bash $WORKSPACE/scripts/log-rotate.sh"
  echo "- Run LaunchAgent check: bash $WORKSPACE/scripts/launchagent-health.sh"
  echo "- Run session watchdog manually if needed: bash $WORKSPACE/scripts/session-watchdog.sh"
} > "$REPORT_FILE"

echo "Weekly maintenance snapshot written: $REPORT_FILE"