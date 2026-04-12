#!/bin/bash

# ui-service-preflight.sh
# Purpose: Mandatory preflight validation for UI and infrastructure service changes
# Prevents: editing wrong paths, missing approvals, incorrect service targeting
#
# Usage:
#   ui-service-preflight.sh check "dashboard"
#   ui-service-preflight.sh check "gateway" --strict
#   ui-service-preflight.sh list
#   ui-service-preflight.sh validate-path "command-center" "src/components"
#
# Example in a script:
#   if ! ~/scripts/ui-service-preflight.sh check "dashboard"; then
#     echo "Preflight failed; cannot proceed"
#     exit 1
#   fi

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
RESOLVER="$SCRIPT_DIR/resolve-service-path.sh"
SERVICE_MAP="$WORKSPACE_DIR/config/service-map.json"

# Source the library
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_help() {
  cat <<EOF
Usage: ui-service-preflight.sh COMMAND [OPTIONS]

Mandatory preflight validation for UI and infrastructure service changes.

COMMANDS:

  check SERVICE [--strict]
    Validate that SERVICE can be safely modified
    --strict: Fail if ANY approval is required
    
    Example: ui-service-preflight.sh check "dashboard"

  list
    List all registered services and their properties
    
    Example: ui-service-preflight.sh list

  validate-path SERVICE PATH
    Confirm that PATH is in the safe_edits list for SERVICE
    
    Example: ui-service-preflight.sh validate-path "command-center" "src/"

  info SERVICE
    Print full metadata for SERVICE
    
    Example: ui-service-preflight.sh info "gateway"

  rules SERVICE
    Print preflight rules (safe/dangerous edits, restart info)
    
    Example: ui-service-preflight.sh rules "cron-scheduler"

SERVICES AVAILABLE:
  - command-center (aliases: dashboard, cc, control-ui)
  - gateway (aliases: openclaw-gateway, core, backend)
  - workspace (aliases: workspace, home, ~)
  - cron-scheduler (aliases: cron, scheduler, jobs)
  - sentinel (aliases: sentinel, health-monitor, watchdog)

EXIT CODES:
  0 = Validation passed
  1 = Validation failed
  2 = Invalid arguments

EXAMPLES:

  Check if dashboard is safe to modify:
    ./ui-service-preflight.sh check "dashboard"

  Validate a specific edit path:
    ./ui-service-preflight.sh validate-path "command-center" "src/components"

  View rules for cron scheduler:
    ./ui-service-preflight.sh rules "cron-scheduler"

  List all services:
    ./ui-service-preflight.sh list

EOF
}

# ============================================================================
# COMMAND: list
# ============================================================================

cmd_list() {
  if [[ ! -f "$SERVICE_MAP" ]]; then
    echo -e "${RED}❌ Service map not found${NC}" >&2
    return 1
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Registered Services${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  local services=$(jq -r '.services | keys[]' "$SERVICE_MAP")
  
  while read -r service_key; do
    local name=$(jq -r ".services[\"$service_key\"].name" "$SERVICE_MAP")
    local owner=$(jq -r ".services[\"$service_key\"].owner" "$SERVICE_MAP")
    local aliases=$(jq -r ".services[\"$service_key\"].aliases | join(\", \")" "$SERVICE_MAP")
    local repo_path=$(jq -r ".services[\"$service_key\"].repo_path" "$SERVICE_MAP")
    
    echo -e "${CYAN}$service_key${NC}"
    echo "  Name: $name"
    echo "  Owner: $owner"
    echo "  Aliases: $aliases"
    echo "  Path: $repo_path"
    echo ""
  done <<< "$services"
}

# ============================================================================
# COMMAND: check
# ============================================================================

cmd_check() {
  local service_query="$1"
  local strict=false
  
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --strict) strict=true; shift ;;
      *) service_query="$1"; shift ;;
    esac
  done
  
  if [[ -z "$service_query" ]]; then
    echo -e "${RED}❌ Service name required${NC}" >&2
    return 2
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Preflight Check: $service_query${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Resolve service
  if ! preflight_resolve_service "$service_query"; then
    return 1
  fi
  
  local repo_path=$(preflight_get_repo_path)
  local service_key=$(jq -r '.services | keys | .[0]' "$SERVICE_MAP")  # Get first (and usually only) matching key
  
  # Actually get the correct service key from the JSON
  if [[ -n "$_SERVICE_DATA" ]]; then
    # For simplicity, search the service map for the matching entry
    service_key=$(jq -r "
      .services | to_entries | 
      map(select(.value.aliases | map(ascii_downcase) | index(\"$(echo "$service_query" | tr '[:upper:]' '[:lower:]')\") != null)) |
      if length > 0 then .[0].key else empty end
    " "$SERVICE_MAP")
  fi
  
  echo "✓ Service resolved: $_RESOLVED_SERVICE"
  echo "  Path: $repo_path"
  echo ""
  
  # Check 1: Repo exists
  echo "Check 1: Repository exists"
  if [[ -d "$repo_path" ]]; then
    echo -e "  ${GREEN}✓${NC} Found at $repo_path"
  else
    echo -e "  ${RED}✗${NC} NOT found at $repo_path"
    return 1
  fi
  echo ""
  
  # Check 2: Approval requirements
  echo "Check 2: Approval requirements"
  if preflight_check_approval "$service_key" 2>/dev/null; then
    echo ""
  else
    if [[ "$strict" == "true" ]]; then
      echo -e "  ${RED}✗${NC} Approval required (strict mode fails)"
      return 1
    else
      echo -e "  ${YELLOW}⚠${NC} Approval required (warning only)"
      echo ""
    fi
  fi
  
  # Check 3: Restart safety (informational)
  echo "Check 3: Restart safety"
  if [[ "$service_key" != "workspace" ]] && [[ "$service_key" != "command-center" ]]; then
    # Only warn for services that restart might affect
    if preflight_check_restart_safety "$service_key" 2>/dev/null; then
      echo ""
    else
      echo ""
    fi
  else
    echo -e "  ${GREEN}✓${NC} Safe service (no restart impact)"
    echo ""
  fi
  
  # Summary
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✓ Preflight validation PASSED${NC}"
  echo ""
  echo "Ready to make changes to: $service_key"
  echo "Repository: $repo_path"
  echo ""
  
  return 0
}

# ============================================================================
# COMMAND: validate-path
# ============================================================================

cmd_validate_path() {
  local service_query="$1"
  local target_path="$2"
  
  if [[ -z "$service_query" ]] || [[ -z "$target_path" ]]; then
    echo -e "${RED}❌ Service name and path required${NC}" >&2
    return 2
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Path Validation: $service_query / $target_path${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  # Find service key
  local service_key=$(jq -r "
    .services | to_entries | 
    map(select(.value.aliases | map(ascii_downcase) | index(\"$(echo "$service_query" | tr '[:upper:]' '[:lower:]')\") != null)) |
    if length > 0 then .[0].key else empty end
  " "$SERVICE_MAP")
  
  if [[ -z "$service_key" ]]; then
    echo -e "${RED}❌ Service not found: $service_query${NC}" >&2
    return 1
  fi
  
  echo "Service: $service_key"
  echo "Path: $target_path"
  echo ""
  
  if preflight_validate_edit "$service_key" "$target_path"; then
    echo ""
    echo -e "${GREEN}✓ Path validation PASSED${NC}"
    return 0
  else
    echo ""
    echo -e "${RED}✗ Path validation FAILED${NC}"
    return 1
  fi
}

# ============================================================================
# COMMAND: info
# ============================================================================

cmd_info() {
  local service_query="$1"
  
  if [[ -z "$service_query" ]]; then
    echo -e "${RED}❌ Service name required${NC}" >&2
    return 2
  fi
  
  if ! preflight_resolve_service "$service_query"; then
    return 1
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Service Information${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  echo "$_SERVICE_DATA" | jq '.' 2>/dev/null || {
    echo -e "${RED}Failed to parse service data${NC}" >&2
    return 1
  }
  
  return 0
}

# ============================================================================
# COMMAND: rules
# ============================================================================

cmd_rules() {
  local service_query="$1"
  
  if [[ -z "$service_query" ]]; then
    echo -e "${RED}❌ Service name required${NC}" >&2
    return 2
  fi
  
  # Find service key
  local service_key=$(jq -r "
    .services | to_entries | 
    map(select(.value.aliases | map(ascii_downcase) | index(\"$(echo "$service_query" | tr '[:upper:]' '[:lower:]')\") != null)) |
    if length > 0 then .[0].key else empty end
  " "$SERVICE_MAP")
  
  if [[ -z "$service_key" ]]; then
    echo -e "${RED}❌ Service not found: $service_query${NC}" >&2
    return 1
  fi
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Preflight Rules: $service_key${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  local rules=$(jq ".preflight_rules[\"$service_key\"]" "$SERVICE_MAP")
  
  if [[ "$rules" == "null" ]]; then
    echo -e "${YELLOW}No rules defined for this service${NC}"
    return 0
  fi
  
  echo "$rules" | jq '.' 2>/dev/null || {
    echo -e "${RED}Failed to parse rules${NC}" >&2
    return 1
  }
  
  return 0
}

# ============================================================================
# MAIN
# ============================================================================

COMMAND="${1:-}"

case "$COMMAND" in
  check)
    shift
    cmd_check "$@"
    ;;
  list)
    cmd_list
    ;;
  validate-path)
    shift
    cmd_validate_path "$@"
    ;;
  info)
    shift
    cmd_info "$@"
    ;;
  rules)
    shift
    cmd_rules "$@"
    ;;
  --help|-h|help)
    print_help
    ;;
  *)
    echo -e "${RED}❌ Unknown command: $COMMAND${NC}" >&2
    echo ""
    print_help
    exit 2
    ;;
esac
