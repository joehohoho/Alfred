#!/bin/bash

# resolve-service-path.sh
# Purpose: Resolve service names/aliases to canonical metadata (repo path, launch agent, URL, owner)
# Usage:   ./resolve-service-path.sh "Command Center"
#          ./resolve-service-path.sh "dashboard"
#          ./resolve-service-path.sh --json "gateway"
#          ./resolve-service-path.sh --help

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_MAP="$WORKSPACE_DIR/config/service-map.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
OUTPUT_FORMAT="text"  # text or json
SERVICE_QUERY=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --json)
      OUTPUT_FORMAT="json"
      shift
      ;;
    --help|-h)
      print_help
      exit 0
      ;;
    *)
      SERVICE_QUERY="$1"
      shift
      ;;
  esac
done

print_help() {
  cat <<EOF
Usage: resolve-service-path.sh [OPTIONS] SERVICE_NAME

Resolve a service name/alias to canonical metadata (repo path, launch agent, URL, owner).

OPTIONS:
  --json          Output as JSON (default: formatted text)
  --help, -h      Show this help message

EXAMPLES:
  ./resolve-service-path.sh "Command Center"
  ./resolve-service-path.sh "dashboard"
  ./resolve-service-path.sh --json "gateway"
  ./resolve-service-path.sh "cron"

SERVICES AVAILABLE:
  - Command Center (aliases: dashboard, cc, control-ui, command-center-ui)
  - Gateway (aliases: gateway, core, api-server, backend)
  - Workspace (aliases: workspace, home, ~)
  - Cron Scheduler (aliases: cron, scheduler, jobs, background-tasks)
  - Sentinel (aliases: sentinel, health-monitor, self-heal, watchdog)
EOF
}

validate_service_map() {
  if [[ ! -f "$SERVICE_MAP" ]]; then
    echo -e "${RED}❌ ERROR: Service map not found at $SERVICE_MAP${NC}" >&2
    exit 1
  fi

  # Validate JSON
  if ! jq empty "$SERVICE_MAP" 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Service map is invalid JSON${NC}" >&2
    exit 1
  fi
}

# Fuzzy match: find service by alias
resolve_service() {
  local query="$1"
  local query_lower=$(echo "$query" | tr '[:upper:]' '[:lower:]')  # Convert to lowercase
  
  # Try exact match first (fastest)
  local service=$(jq -r "
    .services | to_entries | 
    map(select(.value.aliases | map(. | ascii_downcase) | index(\"$query_lower\") != null)) |
    if length == 1 then .[0].key else empty end
  " "$SERVICE_MAP" 2>/dev/null)
  
  if [[ -z "$service" ]]; then
    # Try fuzzy match: partial string match
    service=$(jq -r "
      .services | to_entries | 
      map(
        select(
          .key | ascii_downcase | contains(\"$query_lower\") or
          .value.aliases | map(ascii_downcase | contains(\"$query_lower\")) | any
        )
      ) |
      if length == 1 then .[0].key else empty end
    " "$SERVICE_MAP" 2>/dev/null)
  fi
  
  if [[ -z "$service" ]]; then
    echo -e "${RED}❌ ERROR: No service found matching '$query'${NC}" >&2
    echo -e "${YELLOW}Available services: command-center, gateway, workspace, cron-scheduler, sentinel${NC}" >&2
    return 1
  fi
  
  echo "$service"
}

output_text_format() {
  local service=$1
  local data=$(jq ".services[\"$service\"]" "$SERVICE_MAP")
  
  if [[ -z "$service" ]] || echo "$data" | jq -e '.' > /dev/null 2>&1 && [[ "$data" == "null" ]]; then
    return 1
  fi
  
  echo -e "${GREEN}✓ Resolved: $(echo "$data" | jq -r '.name')${NC}"
  echo ""
  echo "Service Key:      $service"
  echo "Owner:            $(echo "$data" | jq -r '.owner')"
  echo "Repo Path:        $(echo "$data" | jq -r '.repo_path')"
  echo "Launch Agent:     $(echo "$data" | jq -r '.launch_agent // "N/A"')"
  echo "Local URL:        $(echo "$data" | jq -r '.local_url // "N/A"')"
  echo "Port:             $(echo "$data" | jq -r '.port // "N/A"')"
  echo "Language:         $(echo "$data" | jq -r '.language')"
  echo "Docker:           $(echo "$data" | jq -r '.docker')"
  echo "Safe to Restart:  $(echo "$data" | jq -r '.restart_safe')"
  
  if echo "$data" | jq -e '.restart_requires_approval' | grep -q "true"; then
    echo -e "${RED}⚠️  Restart requires Joe approval${NC}"
  fi
  
  echo ""
  echo "Notes: $(echo "$data" | jq -r '.notes')"
}

output_json_format() {
  local service=$1
  local output=$(jq ".services[\"$service\"]" "$SERVICE_MAP")
  if [[ "$output" == "null" ]]; then
    echo -e "${RED}❌ ERROR: Service not found${NC}" >&2
    return 1
  fi
  echo "$output"
}

# Main logic
main() {
  if [[ -z "$SERVICE_QUERY" ]]; then
    echo -e "${RED}❌ ERROR: Service name required${NC}" >&2
    print_help
    exit 1
  fi
  
  validate_service_map
  
  local resolved_service=$(resolve_service "$SERVICE_QUERY") || exit 1
  
  if [[ "$OUTPUT_FORMAT" == "json" ]]; then
    output_json_format "$resolved_service"
  else
    output_text_format "$resolved_service" || exit 1
  fi
}

main
