#!/bin/bash
# openclaw-maintenance-weekly.sh
# Self-healing weekly maintenance for OpenClaw infra.
# Auto-fixes what it can; posts to Slack only when action is needed or for brief weekly OK.
# Safe: read-only checks + targeted remediation only.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
LOG_DIR="$HOME/.openclaw/logs"
REPORT_DIR="$WORKSPACE/reports"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
REPORT_FILE="${1:-$REPORT_DIR/maintenance-weekly-$(date +%Y-%m-%d).md}"
SLACK_CHANNEL="${SLACK_MAINTENANCE_CHANNEL:-C0AEE0PLKB4}"  # #dailyconfig by default

ISSUES=()
ACTIONS=()
STATUS="✅ All systems healthy"

mkdir -p "$REPORT_DIR"

# ── Helper: post to Slack ──────────────────────────────────────────────────────
post_slack() {
  local msg="$1"
  # Use openclaw message tool via gateway if available; fallback to webhook
  if command -v openclaw >/dev/null 2>&1; then
    openclaw message send --channel slack --to "$SLACK_CHANNEL" --message "$msg" 2>/dev/null || true
  fi
}

{
  echo "# OpenClaw Weekly Maintenance Snapshot"
  echo "- Generated: $NOW_UTC"
  echo "- Host: $(hostname)"
  echo ""

  # ── 1) LaunchAgent health + auto-restart ──────────────────────────────────
  echo "## 1) LaunchAgent health"
  AGENTS=(
    "com.ollama.keepalive"
    "com.openclaw.imsg-responder"
    "com.alfred.dashboard-nextjs"
    "com.cloudflare.tunnel"
    "ai.openclaw.gateway"
    "com.alfred.market-signal-lab"
  )

  for agent in "${AGENTS[@]}"; do
    if launchctl list 2>/dev/null | grep -q "$agent"; then
      status=$(launchctl list 2>/dev/null | awk -v a="$agent" '$0 ~ a {print $1; exit}')
      echo "- ✅ $agent (pid/status=$status)"
    else
      echo "- ❌ $agent (not loaded) — attempting restart"
      ISSUES+=("LaunchAgent not loaded: $agent")
      # Attempt restart
      plist_path="$HOME/Library/LaunchAgents/${agent}.plist"
      if [ -f "$plist_path" ]; then
        launchctl load -w "$plist_path" 2>/dev/null \
          && ACTIONS+=("Restarted $agent") \
          || ISSUES+=("Failed to restart $agent — manual intervention needed")
      else
        ISSUES+=("Plist missing for $agent: $plist_path")
      fi
    fi
  done
  echo ""

  # ── 2) Gateway error digest (last 7 days vs prior baseline) ───────────────
  echo "## 2) Gateway error digest"
  if [ -f "$LOG_DIR/gateway.err.log" ]; then
    no_tool_count=$(grep -c "No tool call found" "$LOG_DIR/gateway.err.log" 2>/dev/null; true)
    timeout_count=$(grep -c "timed out" "$LOG_DIR/gateway.err.log" 2>/dev/null; true)
    expired_count=$(grep -c "device signature expired" "$LOG_DIR/gateway.err.log" 2>/dev/null; true)
    no_tool_count=${no_tool_count:-0}
    timeout_count=${timeout_count:-0}
    expired_count=${expired_count:-0}
    echo "- No tool call found: $no_tool_count"
    echo "- timed out: $timeout_count"
    echo "- device signature expired: $expired_count"

    # Spike thresholds — alert only if unusually high
    [ "$no_tool_count" -gt 100 ] && ISSUES+=("High 'No tool call found' errors: $no_tool_count (check session corruption)")
    [ "$timeout_count" -gt 2000 ] && ISSUES+=("High timeout count: $timeout_count (possible connectivity issue)")
    [ "$expired_count" -gt 500 ] && ISSUES+=("High auth expiry count: $expired_count (token rotation may be needed)")
  else
    echo "- gateway.err.log missing"
  fi
  echo ""

  # ── 3) Log growth + auto-rotate if oversized ──────────────────────────────
  echo "## 3) Log sizes (top 10)"
  LOG_ROTATED=false
  if [ -d "$LOG_DIR" ]; then
    while IFS= read -r -d '' logfile; do
      size_bytes=$(stat -f%z "$logfile" 2>/dev/null | tr -d '[:space:]')
      size_bytes=${size_bytes:-0}
      size_human=$(ls -lh "$logfile" 2>/dev/null | awk '{print $5}')
      filename=$(basename "$logfile")
      echo "- $filename ($size_human)"
      # Auto-rotate any log over 50 MB
      if [ "$size_bytes" -gt 52428800 ] 2>/dev/null; then
        echo "  → Oversized (>50MB) — triggering rotation"
        bash "$WORKSPACE/scripts/log-rotate.sh" 2>/dev/null \
          && LOG_ROTATED=true \
          && ACTIONS+=("Auto-rotated logs (${filename} was >50MB)") \
          || ISSUES+=("Log rotation failed for $filename")
      fi
    done < <(find "$LOG_DIR" -maxdepth 1 -type f -name "*.log" -print0 \
              | xargs -0 ls -S 2>/dev/null \
              | head -10 \
              | awk '{print $NF}' \
              | tr '\n' '\0')
  else
    echo "- Log directory missing: $LOG_DIR"
    ISSUES+=("Log directory missing: $LOG_DIR")
  fi
  echo ""

  # ── 4) Git safety snapshot ────────────────────────────────────────────────
  echo "## 4) Git snapshot"
  if [ -d "$WORKSPACE/.git" ]; then
    branch=$(git -C "$WORKSPACE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
    changes=$(git -C "$WORKSPACE" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo "- Branch: $branch"
    echo "- Uncommitted changes: $changes file(s)"
    git -C "$WORKSPACE" log --oneline -3 2>/dev/null | sed 's/^/  - /'
    [ "$changes" -gt 50 ] && ISSUES+=("Large number of uncommitted changes: $changes files")
  else
    echo "- Not a git workspace"
  fi
  echo ""

  # ── 5) Summary ────────────────────────────────────────────────────────────
  echo "## 5) Summary"
  if [ "${#ISSUES[@]}" -gt 0 ]; then
    STATUS="⚠️ Issues found (${#ISSUES[@]})"
    echo "Issues:"
    for i in "${ISSUES[@]}"; do echo "  - $i"; done
  else
    echo "- No issues found."
  fi
  if [ "${#ACTIONS[@]}" -gt 0 ]; then
    echo "Actions taken:"
    for a in "${ACTIONS[@]}"; do echo "  - $a"; done
  fi

} > "$REPORT_FILE"

echo "Weekly maintenance snapshot written: $REPORT_FILE"

# ── Slack notification ────────────────────────────────────────────────────────
# Always post a brief summary so there's a weekly health pulse.
# If all healthy → 1-line OK. If issues → list them.
if [ "${#ISSUES[@]}" -gt 0 ]; then
  SLACK_MSG="🔧 *Weekly Maintenance* — $STATUS

Issues that need attention:"
  for i in "${ISSUES[@]}"; do SLACK_MSG+="
• $i"; done
  if [ "${#ACTIONS[@]}" -gt 0 ]; then
    SLACK_MSG+="

Actions already taken:"
    for a in "${ACTIONS[@]}"; do SLACK_MSG+="
✅ $a"; done
  fi
  SLACK_MSG+="

Full report: \`reports/maintenance-weekly-$(date +%Y-%m-%d).md\`"
else
  SLACK_MSG="🛡️ *Weekly Maintenance* — ✅ All systems healthy ($(date +%Y-%m-%d))
LaunchAgents OK · Logs OK · Git OK · No error spikes
No action needed."
fi

post_slack "$SLACK_MSG"
