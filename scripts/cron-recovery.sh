#!/bin/bash
# cron-recovery.sh — Auto-fix common cron drift and dead reminder issues
# Usage: bash scripts/cron-recovery.sh [--auto-fix] [--verbose]

set -e

WORKSPACE="$HOME/.openclaw/workspace"
REGISTRY="$WORKSPACE/.hal-alfred-tracking/cron-registry.json"
AUDIT_LOG="$WORKSPACE/.hal-alfred-tracking/cron-recovery-audit.log"
ALERT_WEBHOOK="${DISCORD_WEBHOOK_ALERTS:-}"
AUTO_FIX=${1:-""}
VERBOSE=${2:-""}

mkdir -p "$(dirname "$AUDIT_LOG")"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RECOVERED=0
FAILED=0

# Helper: Log event
log_event() {
  local action="$1"
  local detail="$2"
  echo "$TIMESTAMP | $action | $detail" >> "$AUDIT_LOG"
  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo "[$action] $detail"
  fi
}

# Helper: Send alert
send_alert() {
  local severity="$1"
  local message="$2"
  
  if [[ -z "$ALERT_WEBHOOK" ]]; then
    return 0
  fi
  
  local emoji="🔧"
  [[ "$severity" == "success" ]] && emoji="✅"
  [[ "$severity" == "warning" ]] && emoji="⚠️"
  
  curl -s -X POST "$ALERT_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{
      \"content\": \"$emoji **Cron Recovery**: $message\",
      \"username\": \"Alfred\"
    }" 2>/dev/null || true
}

echo "🔧 Starting cron recovery checks..."
log_event "START" "Cron recovery initiated (auto_fix=$([[ -n '$AUTO_FIX' ]] && echo 'enabled' || echo 'disabled'))"

# Recovery 1: Restart missing agents
echo "  → Checking for missing LaunchAgents..."

REGISTERED_AGENTS=$(jq -r '.crons[] | select(.type == "launchagent") | .launchAgentId' "$REGISTRY")

while IFS= read -r agent; do
  if [[ -z "$agent" ]]; then
    continue
  fi
  
  # Check if agent is running
  if ! launchctl list | grep -q "^[0-9-]*[[:space:]]*[0-9]*[[:space:]]*${agent}$"; then
    echo "    ⚠️  Agent not running: $agent"
    
    if [[ -n "$AUTO_FIX" ]]; then
      # Try to restart
      if launchctl start "$agent" 2>/dev/null; then
        echo "    ✅ Restarted $agent"
        log_event "RECOVERY_SUCCESS" "Restarted LaunchAgent $agent"
        send_alert "success" "Restarted missing LaunchAgent **$agent**"
        RECOVERED=$((RECOVERED + 1))
      else
        echo "    ❌ Failed to restart $agent"
        log_event "RECOVERY_FAILED" "Could not restart LaunchAgent $agent"
        send_alert "warning" "Failed to restart LaunchAgent **$agent** (plist may be invalid)"
        FAILED=$((FAILED + 1))
      fi
    else
      log_event "ISSUE_FOUND" "LaunchAgent $agent not running"
    fi
  fi
done <<< "$REGISTERED_AGENTS"

# Recovery 2: Fix LaunchAgent plist files
echo "  → Checking LaunchAgent plist files..."

LAUNCHD_PATHS=("$HOME/Library/LaunchAgents" "/Library/LaunchDaemons")

for agent in $REGISTERED_AGENTS; do
  PLIST_FOUND=0
  for plist_dir in "${LAUNCHD_PATHS[@]}"; do
    PLIST_FILE="$plist_dir/$agent.plist"
    if [[ -f "$PLIST_FILE" ]]; then
      PLIST_FOUND=1
      
      # Check if plist is readable
      if ! plutil -lint "$PLIST_FILE" > /dev/null 2>&1; then
        echo "    ⚠️  Invalid plist: $PLIST_FILE"
        
        if [[ -n "$AUTO_FIX" ]]; then
          # Try to backup and report for manual fix
          cp "$PLIST_FILE" "$PLIST_FILE.bak.$(date +%s)"
          log_event "PLIST_INVALID" "Invalid plist at $PLIST_FILE (backed up)"
          send_alert "warning" "Invalid plist for **$agent** (backed up for review)"
          FAILED=$((FAILED + 1))
        fi
      fi
      break
    fi
  done
  
  if [[ $PLIST_FOUND -eq 0 ]]; then
    echo "    ⚠️  No plist found for: $agent"
    log_event "PLIST_MISSING" "No plist file for LaunchAgent $agent"
    FAILED=$((FAILED + 1))
  fi
done

# Recovery 3: Validate cron scripts exist
echo "  → Checking backing scripts..."

while IFS= read -r script; do
  if [[ -z "$script" ]]; then
    continue
  fi
  
  FULL_PATH="$WORKSPACE/$script"
  if [[ ! -f "$FULL_PATH" ]]; then
    echo "    ⚠️  Script missing: $script"
    log_event "SCRIPT_MISSING" "Script not found: $script"
    send_alert "warning" "Backing script **$script** is missing"
    FAILED=$((FAILED + 1))
  elif [[ ! -x "$FULL_PATH" ]]; then
    echo "    ⚠️  Script not executable: $script"
    
    if [[ -n "$AUTO_FIX" ]]; then
      chmod +x "$FULL_PATH"
      echo "    ✅ Made executable: $script"
      log_event "RECOVERY_SUCCESS" "Made script executable: $script"
      RECOVERED=$((RECOVERED + 1))
    else
      log_event "ISSUE_FOUND" "Script not executable: $script"
    fi
  fi
done < <(jq -r '.crons[] | select(.script) | .script' "$REGISTRY")

# Recovery 4: Load unloaded LaunchAgents
echo "  → Checking LaunchAgent load state..."

for agent in $REGISTERED_AGENTS; do
  for plist_dir in "${LAUNCHD_PATHS[@]}"; do
    PLIST_FILE="$plist_dir/$agent.plist"
    if [[ -f "$PLIST_FILE" ]]; then
      # Check if loaded
      if ! launchctl list "$agent" > /dev/null 2>&1; then
        echo "    ⚠️  LaunchAgent not loaded: $agent"
        
        if [[ -n "$AUTO_FIX" ]]; then
          if launchctl load "$PLIST_FILE" 2>/dev/null; then
            echo "    ✅ Loaded $agent"
            log_event "RECOVERY_SUCCESS" "Loaded LaunchAgent $agent"
            send_alert "success" "Loaded unloaded LaunchAgent **$agent**"
            RECOVERED=$((RECOVERED + 1))
          else
            echo "    ❌ Failed to load $agent"
            log_event "RECOVERY_FAILED" "Could not load LaunchAgent $agent"
            FAILED=$((FAILED + 1))
          fi
        else
          log_event "ISSUE_FOUND" "LaunchAgent not loaded: $agent"
        fi
      fi
      break
    fi
  done
done

# Summary
echo ""
echo "🔧 Recovery Summary:"
echo "  ✅ Recovered: $RECOVERED"
echo "  ❌ Failed: $FAILED"

if [[ $FAILED -eq 0 ]]; then
  echo "✅ All cron systems recovered"
  log_event "COMPLETE" "Recovery finished successfully (recovered=$RECOVERED, failed=$FAILED)"
  exit 0
else
  echo "⚠️  Some issues could not be auto-fixed. Manual review required."
  log_event "COMPLETE" "Recovery finished with issues (recovered=$RECOVERED, failed=$FAILED)"
  exit 1
fi
