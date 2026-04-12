#!/bin/bash
# cron-manifest-check.sh — Validate cron registry vs. actual state
# Detects dead reminders, missing crons, and script drift
# Usage: bash scripts/cron-manifest-check.sh [--verbose] [--fix]

set -e

WORKSPACE="$HOME/.openclaw/workspace"
REGISTRY="$WORKSPACE/.hal-alfred-tracking/cron-registry.json"
AUDIT_LOG="$WORKSPACE/.hal-alfred-tracking/cron-manifest-audit.log"
ALERT_WEBHOOK="${DISCORD_WEBHOOK_ALERTS:-}"
VERBOSE=${1:-""}
FIX_MODE=${2:-""}

mkdir -p "$(dirname "$AUDIT_LOG")"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Helper: Log audit event
log_audit() {
  local level="$1"
  local event="$2"
  local detail="${3:-}"
  echo "$TIMESTAMP | $level | $event | $detail" >> "$AUDIT_LOG"
  if [[ "$VERBOSE" == "--verbose" ]]; then
    echo "[$level] $event ${detail:+— $detail}"
  fi
}

# Helper: Send Discord alert
send_alert() {
  local severity="$1"
  local message="$2"
  
  if [[ -z "$ALERT_WEBHOOK" ]]; then
    return 0
  fi
  
  local emoji="🚨"
  [[ "$severity" == "warning" ]] && emoji="⚠️"
  [[ "$severity" == "info" ]] && emoji="ℹ️"
  
  curl -s -X POST "$ALERT_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{
      \"content\": \"$emoji **Cron Manifest Check**: $message\",
      \"username\": \"Alfred\"
    }" 2>/dev/null || true
}

# Check 1: Validate registry file exists and is valid JSON
if [[ ! -f "$REGISTRY" ]]; then
  log_audit "ERROR" "REGISTRY_NOT_FOUND" "$REGISTRY missing; cannot proceed"
  send_alert "error" "Cron registry not found at $REGISTRY"
  exit 1
fi

if ! jq -e . < "$REGISTRY" > /dev/null 2>&1; then
  log_audit "ERROR" "REGISTRY_INVALID_JSON" "Registry is not valid JSON"
  send_alert "error" "Cron registry contains invalid JSON; manual repair required"
  exit 1
fi

log_audit "INFO" "MANIFEST_CHECK_START" "Validating cron registry"

# Check 2: Get all LaunchAgents actually running
ACTUAL_AGENTS=$(launchctl list | grep -E "com\.alfred|ai\.openclaw" | awk '{print $3}' | sort)
REGISTERED_AGENTS=$(jq -r '.crons[] | select(.type == "launchagent") | .launchAgentId' "$REGISTRY" | sort)

# Check 3: Detect missing agents
MISSING_AGENTS=""
while IFS= read -r agent; do
  if [[ -n "$agent" ]] && ! echo "$ACTUAL_AGENTS" | grep -q "^${agent}$"; then
    MISSING_AGENTS+="$agent "
    log_audit "ERROR" "AGENT_MISSING" "$agent not running"
    send_alert "error" "LaunchAgent **$agent** is missing/not running"
  fi
done <<< "$REGISTERED_AGENTS"

# Check 4: Detect extra agents (not in registry)
EXTRA_AGENTS=""
while IFS= read -r agent; do
  if [[ -n "$agent" ]] && ! jq -r '.crons[] | select(.type == "launchagent") | .launchAgentId' "$REGISTRY" | grep -q "^${agent}$"; then
    EXTRA_AGENTS+="$agent "
    log_audit "WARNING" "AGENT_NOT_IN_REGISTRY" "$agent is running but not registered"
  fi
done <<< "$ACTUAL_AGENTS"

# Check 5: Validate backing scripts exist
MISSING_SCRIPTS=""
while IFS= read -r script; do
  if [[ -n "$script" ]] && [[ ! -f "$WORKSPACE/$script" ]]; then
    MISSING_SCRIPTS+="$script "
    log_audit "ERROR" "SCRIPT_MISSING" "$script not found"
    send_alert "error" "Backing script **$script** is missing"
  fi
done < <(jq -r '.crons[] | select(.script) | .script' "$REGISTRY")

# Check 6: Detect stale runs (for tracked crons)
STALE_CRONS=""
STALE_THRESHOLD=3600  # 1 hour

while IFS= read -r row; do
  CRON_ID=$(echo "$row" | jq -r '.id')
  CRON_NAME=$(echo "$row" | jq -r '.name')
  LAST_RUN=$(echo "$row" | jq -r '.lastRun // empty')
  IS_CRITICAL=$(echo "$row" | jq -r '.critical // false')
  
  if [[ -n "$LAST_RUN" ]] && [[ "$IS_CRITICAL" == "true" ]]; then
    LAST_RUN_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$LAST_RUN" "+%s" 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    TIME_SINCE=$((NOW_EPOCH - LAST_RUN_EPOCH))
    
    if [[ $TIME_SINCE -gt $STALE_THRESHOLD ]]; then
      STALE_CRONS+="$CRON_NAME "
      log_audit "ERROR" "CRON_STALE" "$CRON_ID has not run in $((TIME_SINCE / 60)) minutes"
      send_alert "error" "Critical cron **$CRON_NAME** stale (last run: ${TIME_SINCE}s ago)"
    fi
  fi
done < <(jq -c '.crons[]' "$REGISTRY")

# Check 7: Count consecutive failures
FAILING_CRONS=""
FAILURE_THRESHOLD=3

while IFS= read -r row; do
  CRON_ID=$(echo "$row" | jq -r '.id')
  CRON_NAME=$(echo "$row" | jq -r '.name')
  FAILURES=$(echo "$row" | jq -r '.consecutiveFailures // 0')
  
  if [[ $FAILURES -ge $FAILURE_THRESHOLD ]]; then
    FAILING_CRONS+="$CRON_NAME ($FAILURES failures) "
    log_audit "ERROR" "CRON_FAILING" "$CRON_ID has $FAILURES consecutive failures"
    send_alert "error" "Cron **$CRON_NAME** failing: $FAILURES consecutive failures"
  fi
done < <(jq -c '.crons[]' "$REGISTRY")

# Summary
TOTAL_ISSUES=0
[[ -n "$MISSING_AGENTS" ]] && TOTAL_ISSUES=$((TOTAL_ISSUES + $(echo "$MISSING_AGENTS" | wc -w)))
[[ -n "$MISSING_SCRIPTS" ]] && TOTAL_ISSUES=$((TOTAL_ISSUES + $(echo "$MISSING_SCRIPTS" | wc -w)))
[[ -n "$STALE_CRONS" ]] && TOTAL_ISSUES=$((TOTAL_ISSUES + $(echo "$STALE_CRONS" | wc -w)))
[[ -n "$FAILING_CRONS" ]] && TOTAL_ISSUES=$((TOTAL_ISSUES + $(echo "$FAILING_CRONS" | wc -w)))

if [[ $TOTAL_ISSUES -eq 0 ]]; then
  log_audit "INFO" "MANIFEST_CHECK_PASS" "All crons healthy"
  echo "✅ All crons healthy"
  exit 0
else
  log_audit "WARNING" "MANIFEST_CHECK_FOUND_ISSUES" "Found $TOTAL_ISSUES issues"
  echo "⚠️  Found $TOTAL_ISSUES issues:"
  
  if [[ -n "$MISSING_AGENTS" ]]; then
    echo "  • Missing agents: $MISSING_AGENTS"
  fi
  if [[ -n "$MISSING_SCRIPTS" ]]; then
    echo "  • Missing scripts: $MISSING_SCRIPTS"
  fi
  if [[ -n "$STALE_CRONS" ]]; then
    echo "  • Stale crons: $STALE_CRONS"
  fi
  if [[ -n "$FAILING_CRONS" ]]; then
    echo "  • Failing crons: $FAILING_CRONS"
  fi
  
  exit 1
fi
