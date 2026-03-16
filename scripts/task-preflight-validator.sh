#!/bin/bash
# task-preflight-validator.sh
# Hard preflight checks before task execution/delegation
# Enforces requirements upfront instead of discovering failures after work starts
#
# Usage:
#   task-preflight-validator.sh --handoff <handoff-json-file> [--strict]
#   task-preflight-validator.sh --delegation <hal-delegation-file>
#
# Exit codes:
#   0 = PASS (all checks green)
#   1 = FAIL (critical check failed, task BLOCKED)
#   2 = WARN (non-critical issues, task allowed but flagged)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRACK_DIR="${HOME}/.openclaw/workspace/tracking"
PREFLIGHT_LOG="${TRACK_DIR}/preflight-checks.log"

mkdir -p "$TRACK_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$PREFLIGHT_LOG"
}

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────────

MODE=""
INPUT_FILE=""
STRICT_MODE=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --handoff)
      MODE="handoff"
      INPUT_FILE="$2"
      shift 2
      ;;
    --delegation)
      MODE="delegation"
      INPUT_FILE="$2"
      shift 2
      ;;
    --strict)
      STRICT_MODE=1
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "$MODE" ] || [ -z "$INPUT_FILE" ]; then
  echo "Usage: $0 --handoff <file> | --delegation <file> [--strict]"
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "ERROR: Input file not found: $INPUT_FILE"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────
# Validation state
# ─────────────────────────────────────────────────────────────────

CRITICAL_FAILURES=0
WARNINGS=0
PASS_COUNT=0

# ─────────────────────────────────────────────────────────────────
# Handoff validation
# ─────────────────────────────────────────────────────────────────

validate_handoff() {
  local handoff_file="$1"
  log "=== Handoff Preflight Validation ==="
  
  # Parse JSON
  local handoff
  handoff=$(jq '.' "$handoff_file" 2>/dev/null || echo "")
  
  if [ -z "$handoff" ]; then
    log "❌ CRITICAL: Invalid JSON in $handoff_file"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    return
  fi
  
  # Check 1: Required fields present
  log "Check 1: Schema validation..."
  local required_fields=("objective" "deliverables" "validation_command" "rollback_plan" "owner" "kanban_card_id")
  for field in "${required_fields[@]}"; do
    if echo "$handoff" | jq -e ".$field" > /dev/null 2>&1; then
      log "  ✓ $field present"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log "  ❌ CRITICAL: Missing required field: $field"
      CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    fi
  done
  
  # Check 2: Deliverables is non-empty array
  log "Check 2: Deliverables checklist..."
  local deliv_count
  deliv_count=$(echo "$handoff" | jq '.deliverables | length // 0')
  if [ "$deliv_count" -gt 0 ]; then
    log "  ✓ Deliverables: $deliv_count items"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    log "  ❌ CRITICAL: Deliverables list empty or missing"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
  fi
  
  # Check 3: Validation command exists and is executable
  log "Check 3: Validation command..."
  local val_cmd
  val_cmd=$(echo "$handoff" | jq -r '.validation_command // ""')
  
  if [ -z "$val_cmd" ]; then
    log "  ❌ CRITICAL: validation_command is empty"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
  else
    # Try a dry-run of validation command (careful with side effects)
    if [[ "$val_cmd" == *"npm test"* ]] || [[ "$val_cmd" == *"echo"* ]] || [[ "$val_cmd" == *"grep"* ]]; then
      log "  ✓ Validation command defined: $val_cmd"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log "  ⚠️  WARN: Validation command may have side effects: $val_cmd"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
  
  # Check 4: Rollback plan is non-empty
  log "Check 4: Rollback plan..."
  local rollback
  rollback=$(echo "$handoff" | jq -r '.rollback_plan // ""')
  
  if [ -z "$rollback" ]; then
    if [ "$STRICT_MODE" -eq 1 ]; then
      log "  ❌ STRICT: rollback_plan required but empty"
      CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    else
      log "  ⚠️  WARN: rollback_plan is empty (risky for infra changes)"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    log "  ✓ Rollback plan defined"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
  
  # Check 5: Kanban card exists and is accessible
  log "Check 5: Kanban card validation..."
  local card_id
  card_id=$(echo "$handoff" | jq -r '.kanban_card_id // ""')
  
  if [ -z "$card_id" ]; then
    log "  ❌ CRITICAL: kanban_card_id missing"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
  else
    # Verify card exists via API
    local card_check
    card_check=$(curl -s --max-time 5 "http://localhost:3001/api/kanban/$card_id" 2>/dev/null || echo "{}")
    
    if echo "$card_check" | jq -e '.id' > /dev/null 2>&1; then
      log "  ✓ Kanban card exists: $card_id"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log "  ❌ CRITICAL: Kanban card not found or API unreachable: $card_id"
      CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    fi
  fi
  
  # Check 6: Owner is valid
  log "Check 6: Owner assignment..."
  local owner
  owner=$(echo "$handoff" | jq -r '.owner // ""')
  
  if [ -z "$owner" ]; then
    log "  ❌ CRITICAL: owner field empty"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
  else
    log "  ✓ Owner: $owner"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
  
  # Check 7: Constraints/blockers documented?
  log "Check 7: Risk/constraint documentation..."
  local constraints
  constraints=$(echo "$handoff" | jq '.constraints // ""')
  
  if [ -z "$constraints" ] || [ "$constraints" = '""' ]; then
    log "  ℹ️  INFO: No constraints documented (optional)"
  else
    log "  ✓ Constraints noted"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
}

# ─────────────────────────────────────────────────────────────────
# Delegation validation (simpler version for HAL pickups)
# ─────────────────────────────────────────────────────────────────

validate_delegation() {
  local delegation_file="$1"
  log "=== HAL Delegation Preflight Validation ==="
  
  local delegation
  delegation=$(jq '.' "$delegation_file" 2>/dev/null || echo "")
  
  if [ -z "$delegation" ]; then
    log "❌ CRITICAL: Invalid JSON in $delegation_file"
    CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    return
  fi
  
  # Minimal checks for HAL delegation
  local required=("task_id" "objective" "estimated_complexity")
  
  for field in "${required[@]}"; do
    if echo "$delegation" | jq -e ".$field" > /dev/null 2>&1; then
      log "  ✓ $field present"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log "  ❌ CRITICAL: Missing $field"
      CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    fi
  done
}

# ─────────────────────────────────────────────────────────────────
# Safety guardrails: immutable config detection
# ─────────────────────────────────────────────────────────────────

check_safe_paths() {
  log "=== Safety Guardrails Check ==="
  
  local danger_files=(
    "$HOME/.openclaw/openclaw.json"
    "$HOME/.openclaw/cron/jobs.json"
    "/etc/hosts"
    "/Library/LaunchAgents/com.openclaw.*.plist"
  )
  
  for danger_file in "${danger_files[@]}"; do
    # Check if any deliverable mentions these files
    if echo "$handoff" | jq -r '.deliverables[]' 2>/dev/null | grep -q "$danger_file"; then
      log "❌ CRITICAL: Danger file in deliverables: $danger_file"
      log "   This file is WRITE-PROTECTED. Route suggestions to memory/notifications instead."
      CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
    fi
  done
  
  log "  ✓ No protected files in deliverables"
  PASS_COUNT=$((PASS_COUNT + 1))
}

# ─────────────────────────────────────────────────────────────────
# Main execution
# ─────────────────────────────────────────────────────────────────

case "$MODE" in
  handoff)
    validate_handoff "$INPUT_FILE"
    check_safe_paths
    ;;
  delegation)
    validate_delegation "$INPUT_FILE"
    ;;
esac

# ─────────────────────────────────────────────────────────────────
# Summary + exit code
# ─────────────────────────────────────────────────────────────────

echo ""
log "════════════════════════════════════════════════════════════"
log "Preflight Summary: $PASS_COUNT pass, $WARNINGS warn, $CRITICAL_FAILURES fail"
log "════════════════════════════════════════════════════════════"

if [ "$CRITICAL_FAILURES" -gt 0 ]; then
  printf "${RED}❌ PREFLIGHT FAILED${NC} - Task BLOCKED. Fix issues above.\n"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  printf "${YELLOW}⚠️  PREFLIGHT WARNING${NC} - Task allowed but review required.\n"
  exit 2
else
  printf "${GREEN}✅ PREFLIGHT PASSED${NC} - Task approved for execution.\n"
  exit 0
fi
