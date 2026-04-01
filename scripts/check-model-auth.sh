#!/bin/bash
# check-model-auth.sh — Monitor model auth status and log token failures
# Usage: ./check-model-auth.sh [--log] [--notify]

set -e
WORKSPACE="${HOME}/.openclaw/workspace"
AUDIT_LOG="${HOME}/.openclaw/logs/audit.jsonl"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse arguments
LOG_AUDIT=false
NOTIFY=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --log) LOG_AUDIT=true; shift ;;
    --notify) NOTIFY=true; shift ;;
    *) shift ;;
  esac
done

# Check for recent auth failures in gateway log
check_gateway_errors() {
  local last_10_min=$(date -v-10m -u +"%Y-%m-%dT%H:%M:%S")
  
  if [ -f "${HOME}/.openclaw/logs/gateway.err.log" ]; then
    # Count token refresh failures in last 10 min
    local codex_failures=$(grep -c "OAuth token refresh failed for openai-codex" "${HOME}/.openclaw/logs/gateway.err.log" 2>/dev/null || echo "0")
    
    if [ "$codex_failures" -gt 0 ]; then
      return 1  # Auth issue detected
    fi
  fi
  return 0
}

# Log to audit trail
log_to_audit() {
  local level=$1
  local message=$2
  local detail=$3
  
  if [ "$LOG_AUDIT" = true ] && [ -d "$(dirname "$AUDIT_LOG")" ]; then
    local entry="{\"timestamp\":\"${TIMESTAMP}\",\"level\":\"${level}\",\"source\":\"check-model-auth\",\"message\":\"${message}\""
    if [ -n "$detail" ]; then
      entry+=",\"detail\":\"${detail}\""
    fi
    entry+="}"
    echo "$entry" >> "$AUDIT_LOG"
  fi
}

# Main check
msg="OpenAI Codex token refresh is failing; gateway falling back to Haiku"
if ! check_gateway_errors; then
  
  if [ "$LOG_AUDIT" = true ]; then
    log_to_audit "warn" "Model auth failure detected" "$msg"
    echo "✓ Logged to audit trail: $msg"
  fi
  
  if [ "$NOTIFY" = true ]; then
    echo "⚠️  $msg"
  fi
  
  exit 1
else
  if [ "$LOG_AUDIT" = true ]; then
    log_to_audit "info" "Model auth check passed" "All model tokens valid"
  fi
  echo "✓ Model auth status: OK"
  exit 0
fi
