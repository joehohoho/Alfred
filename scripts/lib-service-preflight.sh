#!/bin/bash

# lib-service-preflight.sh
# Purpose: Preflight hook library for UI/infrastructure changes
# Sourced by scripts that modify services (dashboard, gateway, cron, etc.)
# Ensures changes target the CORRECT repo path and owner
#
# Usage in your script:
#   source "$SCRIPT_DIR/lib-service-preflight.sh"
#   preflight_resolve_service "dashboard"
#   preflight_validate_edit "command-center" "src/"
#   preflight_check_approval "gateway"
#
# Prevents: editing wrong paths, missing owner approvals, unsafe restarts

set -e

SCRIPT_DIR="${SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
WORKSPACE_DIR="${WORKSPACE_DIR:-$(dirname "$SCRIPT_DIR")}"
RESOLVER="$SCRIPT_DIR/resolve-service-path.sh"
SERVICE_MAP="$WORKSPACE_DIR/config/service-map.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Global state (set by preflight_resolve_service)
_RESOLVED_SERVICE=""
_SERVICE_DATA=""

# ============================================================================
# CORE: Resolve service by name/alias
# ============================================================================

preflight_resolve_service() {
  local service_query="$1"
  
  if [[ -z "$service_query" ]]; then
    echo -e "${RED}❌ ERROR: Service name required${NC}" >&2
    return 1
  fi
  
  if [[ ! -f "$RESOLVER" ]]; then
    echo -e "${RED}❌ ERROR: Resolver not found at $RESOLVER${NC}" >&2
    return 1
  fi
  
  # Call resolver and capture JSON output
  _SERVICE_DATA=$("$RESOLVER" --json "$service_query" 2>/dev/null) || {
    echo -e "${RED}❌ ERROR: Failed to resolve service: $service_query${NC}" >&2
    echo "   Run: $RESOLVER --help" >&2
    return 1
  }
  
  # Extract service key from JSON
  _RESOLVED_SERVICE=$(echo "$_SERVICE_DATA" | jq -r '.name' 2>/dev/null)
  
  if [[ -z "$_RESOLVED_SERVICE" ]]; then
    echo -e "${RED}❌ ERROR: Invalid service data returned${NC}" >&2
    return 1
  fi
  
  return 0
}

# ============================================================================
# Get resolved metadata
# ============================================================================

preflight_get_repo_path() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved. Call preflight_resolve_service first${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.repo_path'
}

preflight_get_launch_agent() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.launch_agent // empty'
}

preflight_get_owner() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.owner'
}

preflight_get_local_url() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.local_url // empty'
}

preflight_get_restart_safe() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.restart_safe'
}

preflight_get_restart_requires_approval() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ ERROR: No service resolved${NC}" >&2
    return 1
  fi
  echo "$_SERVICE_DATA" | jq -r '.restart_requires_approval // false'
}

# ============================================================================
# Validation: Check if a path is safe to edit
# ============================================================================

preflight_validate_edit() {
  local service_key="$1"
  local target_path="$2"
  
  if [[ -z "$service_key" ]] || [[ -z "$target_path" ]]; then
    echo -e "${RED}❌ ERROR: service_key and target_path required${NC}" >&2
    return 1
  fi
  
  if [[ ! -f "$SERVICE_MAP" ]]; then
    echo -e "${RED}❌ ERROR: Service map not found${NC}" >&2
    return 1
  fi
  
  # Get safe_edits list from preflight_rules
  local safe_edits=$(jq -r ".preflight_rules[\"$service_key\"].safe_edits[]?" "$SERVICE_MAP" 2>/dev/null)
  
  if [[ -z "$safe_edits" ]]; then
    echo -e "${YELLOW}⚠️  WARNING: No safe_edits defined for $service_key${NC}" >&2
    echo "   Treating all edits as potentially risky" >&2
    return 1
  fi
  
  # Check if target_path matches any safe_edit pattern
  local is_safe=false
  while read -r safe_pattern; do
    if [[ "$target_path" == "$safe_pattern"* ]]; then
      is_safe=true
      break
    fi
  done <<< "$safe_edits"
  
  if [[ "$is_safe" == true ]]; then
    echo -e "${GREEN}✓${NC} Path is safe to edit: $target_path"
    return 0
  else
    echo -e "${RED}❌ ERROR: Path is NOT in safe_edits list: $target_path${NC}" >&2
    echo -e "${YELLOW}Safe paths for $service_key:${NC}" >&2
    while read -r safe_pattern; do
      echo "  - $safe_pattern" >&2
    done <<< "$safe_edits"
    return 1
  fi
}

# ============================================================================
# Approval check: Does this change require owner approval?
# ============================================================================

preflight_check_approval() {
  local service_key="$1"
  
  if [[ -z "$service_key" ]]; then
    echo -e "${RED}❌ ERROR: service_key required${NC}" >&2
    return 1
  fi
  
  if [[ ! -f "$SERVICE_MAP" ]]; then
    echo -e "${RED}❌ ERROR: Service map not found${NC}" >&2
    return 1
  fi
  
  local requires_approval=$(jq -r ".preflight_rules[\"$service_key\"].approval_required // false" "$SERVICE_MAP")
  local owner=$(jq -r ".services[\"$service_key\"].owner" "$SERVICE_MAP")
  local owner_contact=$(jq -r ".services[\"$service_key\"].owner_contact" "$SERVICE_MAP")
  
  if [[ "$requires_approval" == "true" ]]; then
    echo -e "${YELLOW}⚠️  APPROVAL REQUIRED${NC}"
    echo "   Service: $service_key"
    echo "   Owner: $owner ($owner_contact)"
    echo "   This service requires explicit approval before changes"
    return 1
  else
    echo -e "${GREEN}✓${NC} No approval required for $service_key"
    return 0
  fi
}

# ============================================================================
# Restart safety check
# ============================================================================

preflight_check_restart_safety() {
  local service_key="$1"
  
  if [[ -z "$service_key" ]]; then
    echo -e "${RED}❌ ERROR: service_key required${NC}" >&2
    return 1
  fi
  
  if [[ ! -f "$SERVICE_MAP" ]]; then
    echo -e "${RED}❌ ERROR: Service map not found${NC}" >&2
    return 1
  fi
  
  local restart_safe=$(jq -r ".services[\"$service_key\"].restart_safe" "$SERVICE_MAP")
  local restart_requires_approval=$(jq -r ".services[\"$service_key\"].restart_requires_approval // false" "$SERVICE_MAP")
  
  if [[ "$restart_safe" != "true" ]]; then
    echo -e "${RED}⚠️  DANGER: Service is NOT safe to restart${NC}"
    echo "   Service: $service_key"
    echo "   Restart may cause outages or data loss"
    return 1
  fi
  
  if [[ "$restart_requires_approval" == "true" ]]; then
    echo -e "${YELLOW}⚠️  APPROVAL REQUIRED${NC}"
    echo "   Service: $service_key"
    echo "   Restart requires explicit approval"
    return 1
  fi
  
  echo -e "${GREEN}✓${NC} Service is safe to restart: $service_key"
  return 0
}

# ============================================================================
# Full preflight checklist
# ============================================================================

preflight_full_check() {
  local service_query="$1"
  local target_path="$2"  # optional
  
  echo -e "${BLUE}▶ Running full preflight checks...${NC}"
  echo ""
  
  # Step 1: Resolve service
  echo "Step 1: Resolving service..."
  if ! preflight_resolve_service "$service_query"; then
    return 1
  fi
  
  local repo_path=$(preflight_get_repo_path)
  local service_key=$(jq -r '.services | keys[0]' "$SERVICE_MAP" 2>/dev/null || echo "")
  
  echo -e "${GREEN}✓${NC} Service resolved"
  echo "   Name: $_RESOLVED_SERVICE"
  echo "   Path: $repo_path"
  echo "   Owner: $(preflight_get_owner)"
  echo ""
  
  # Step 2: Verify repo exists
  echo "Step 2: Verifying repository..."
  if [[ ! -d "$repo_path" ]]; then
    echo -e "${RED}❌ ERROR: Repository not found at $repo_path${NC}" >&2
    return 1
  fi
  echo -e "${GREEN}✓${NC} Repository exists: $repo_path"
  echo ""
  
  # Step 3: Check approval
  echo "Step 3: Checking approval requirements..."
  if ! preflight_check_approval "$service_key"; then
    echo -e "${YELLOW}   ⚠️  Approval required - cannot proceed${NC}"
    return 1
  fi
  echo ""
  
  # Step 4: Validate target path (if provided)
  if [[ -n "$target_path" ]]; then
    echo "Step 4: Validating edit path..."
    if ! preflight_validate_edit "$service_key" "$target_path"; then
      echo "   ❌ Path validation failed"
      return 1
    fi
    echo ""
  fi
  
  echo -e "${GREEN}✓ All preflight checks passed${NC}"
  return 0
}

# ============================================================================
# Debug: Print resolved service metadata
# ============================================================================

preflight_print_service_info() {
  if [[ -z "$_SERVICE_DATA" ]]; then
    echo -e "${RED}❌ No service resolved${NC}" >&2
    return 1
  fi
  
  echo -e "${BLUE}Service Information:${NC}"
  echo "$_SERVICE_DATA" | jq '.' 2>/dev/null || echo "Failed to parse service data"
}

# ============================================================================
# Ensure all functions export successfully
# ============================================================================

return 0 2>/dev/null || true
