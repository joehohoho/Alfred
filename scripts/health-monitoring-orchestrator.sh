#!/bin/bash
# health-monitoring-orchestrator.sh
# Master orchestrator for all health monitoring and maintenance tasks
# Runs the 3 improvements in a coordinated way with proper error handling
#
# Schedule:
# - HAL health check: every 5 minutes (via LaunchAgent)
# - LaunchAgent health: every 5 minutes (via LaunchAgent)
# - Log rotation: daily at 2 AM (via cron)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
ORCH_LOG="$TRACK_DIR/health-orchestrator.log"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$ORCH_LOG"; }

# ─────────────────────────────────────────────────────────────────────────────
# Validate all health monitoring scripts exist
# ─────────────────────────────────────────────────────────────────────────────

validate_scripts() {
  local required_scripts=(
    "hal-health-monitor.sh"
    "log-rotation-archival.sh"
    "launchagent-health-check.sh"
  )
  
  local missing=0
  for script in "${required_scripts[@]}"; do
    if [[ ! -f "$SCRIPT_DIR/$script" ]]; then
      log "ERROR: Missing required script: $script"
      missing=$((missing + 1))
    fi
  done
  
  if [[ $missing -gt 0 ]]; then
    log "FATAL: $missing required scripts are missing"
    return 1
  fi
  
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Run HAL health check
# ─────────────────────────────────────────────────────────────────────────────

run_hal_health_check() {
  log "Running HAL health check..."
  if bash "$SCRIPT_DIR/hal-health-monitor.sh" 2>&1 | tee -a "$ORCH_LOG"; then
    log "HAL health check completed successfully"
    return 0
  else
    local exit_code=$?
    log "HAL health check failed with exit code $exit_code"
    return $exit_code
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Run LaunchAgent health check
# ─────────────────────────────────────────────────────────────────────────────

run_launchagent_health_check() {
  log "Running LaunchAgent health check..."
  if bash "$SCRIPT_DIR/launchagent-health-check.sh" 2>&1 | tee -a "$ORCH_LOG"; then
    log "LaunchAgent health check completed successfully"
    return 0
  else
    local exit_code=$?
    log "LaunchAgent health check completed with exit code $exit_code"
    return $exit_code
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Run log rotation (typically called from cron, not orchestrator)
# ─────────────────────────────────────────────────────────────────────────────

run_log_rotation() {
  log "Running log rotation and archival..."
  if bash "$SCRIPT_DIR/log-rotation-archival.sh" 2>&1 | tee -a "$ORCH_LOG"; then
    log "Log rotation completed successfully"
    return 0
  else
    local exit_code=$?
    log "Log rotation failed with exit code $exit_code"
    return $exit_code
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Main execution
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local mode="${1:-full}"  # "full", "hal", "launchagent", "logs"
  
  log "Health monitoring orchestrator started (mode=$mode)"
  
  # Validate scripts exist
  if ! validate_scripts; then
    log "FATAL: Script validation failed"
    return 1
  fi
  
  local exit_code=0
  
  case "$mode" in
    full)
      # Run all checks in parallel for efficiency
      run_hal_health_check || exit_code=$?
      run_launchagent_health_check || exit_code=$?
      ;;
    hal)
      run_hal_health_check || exit_code=$?
      ;;
    launchagent)
      run_launchagent_health_check || exit_code=$?
      ;;
    logs)
      run_log_rotation || exit_code=$?
      ;;
    *)
      log "ERROR: Unknown mode: $mode"
      exit_code=1
      ;;
  esac
  
  log "Orchestrator completed (exit_code=$exit_code)"
  return $exit_code
}

main "$@"
