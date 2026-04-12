#!/bin/bash

# gateway-config.sh
# Purpose: Safely modify OpenClaw Gateway configuration with preflight checks
# Usage: ./gateway-config.sh [--dry-run] [--help]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
RESOLVER="$SCRIPT_DIR/resolve-service-path.sh"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help|-h)
      cat <<EOF
Usage: gateway-config.sh [OPTIONS]

Safely modify OpenClaw Gateway configuration with preflight ownership and approval checks.

OPTIONS:
  --dry-run       Show what would happen without making changes
  --help, -h      Show this help message

IMPORTANT:
  - Gateway is owned by Joe (maintainer)
  - All configuration changes require Joe's explicit approval
  - Gateway restart may cause service interruptions
  - Always verify changes in staging before production

WORKFLOW:
  1. Run this script
  2. Review gateway details and safety checks
  3. If safe, make configuration edits
  4. Run tests
  5. Notify Joe for approval before restart
EOF
      exit 0
      ;;
    *)
      shift
      ;;
  esac
done

echo "🔍 Running preflight checks for Gateway configuration..."
echo ""

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

# 1. Resolve Gateway
echo "📍 Resolving OpenClaw Gateway service..."
SERVICE_DATA=$("$RESOLVER" --json "gateway" 2>/dev/null) || {
  echo -e "${RED}❌ ERROR: Failed to resolve gateway service${NC}" >&2
  exit 1
}

REPO_PATH=$(echo "$SERVICE_DATA" | jq -r '.repo_path')
OWNER=$(echo "$SERVICE_DATA" | jq -r '.owner')
LAUNCH_AGENT=$(echo "$SERVICE_DATA" | jq -r '.launch_agent')
RESTART_REQUIRES_APPROVAL=$(echo "$SERVICE_DATA" | jq -r '.restart_requires_approval')

echo -e "${GREEN}✓${NC} Gateway service resolved"
echo "   Owner: $OWNER"
echo "   Path: $REPO_PATH"
echo "   Launch Agent: $LAUNCH_AGENT"
echo ""

# 2. Verify ownership
if [[ "$OWNER" != "Joe" ]]; then
  echo -e "${RED}❌ ERROR: Gateway is owned by $OWNER, not Joe${NC}" >&2
  echo "   Configuration changes may not be appropriate." >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Ownership verified: Joe is maintainer"
echo ""

# 3. Check approval requirement
if [[ "$RESTART_REQUIRES_APPROVAL" == "true" ]]; then
  echo -e "${YELLOW}⚠️  APPROVAL REQUIRED${NC}"
  echo "   Gateway restart requires Joe's explicit approval"
  echo "   All configuration changes must be reviewed by Joe"
  echo ""
fi

# 4. Verify repo exists
if [[ ! -d "$REPO_PATH" ]]; then
  echo -e "${RED}❌ ERROR: Gateway repo not found at $REPO_PATH${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Gateway repository verified"
echo ""

# ============================================================================
# SAFETY WARNING
# ============================================================================

echo "=========================================="
echo -e "${YELLOW}⚠️  GATEWAY CONFIGURATION WARNING${NC}"
echo "=========================================="
echo ""
echo "This script modifies the OpenClaw Gateway, which is:"
echo "  • Mission-critical infrastructure"
echo "  • Owned and maintained by Joe"
echo "  • Subject to approval requirements for restarts"
echo ""
echo "Configuration changes that may require approval:"
echo "  • Model routing rules"
echo "  • Rate limits or cost controls"
echo "  • Authentication or security settings"
echo "  • Channel configuration"
echo "  • Launch agent settings"
echo ""
echo "=========================================="
echo ""

if [[ $DRY_RUN == true ]]; then
  echo -e "${BLUE}ℹ️  DRY RUN MODE${NC}"
  echo "No actual changes will be made. Use without --dry-run to proceed."
  echo ""
  echo "Gateway would be editable at: $REPO_PATH"
  echo "After changes, restart requires: Joe approval"
  exit 0
fi

# ============================================================================
# READY FOR EDITS
# ============================================================================

echo "📋 Next steps:"
echo ""
echo "1. Review current gateway config:"
echo "   cat $REPO_PATH/openclaw.json | jq ."
echo ""
echo "2. Make your configuration changes (with extreme care)"
echo ""
echo "3. Test changes:"
echo "   docker build -t openclaw-gateway $REPO_PATH"
echo "   docker run ... (test container)"
echo ""
echo "4. After testing, notify Joe:"
echo "   • Summarize changes"
echo "   • Include rollback plan"
echo "   • Request approval to restart"
echo ""
echo "5. Only after Joe approval, restart:"
echo "   launchctl restart $LAUNCH_AGENT"
echo ""
echo -e "${RED}DO NOT make changes without understanding consequences.${NC}"
echo ""
