#!/bin/bash

# restart-cc.sh
# Purpose: Safely restart Command Center dashboard with preflight checks
# Usage: ./restart-cc.sh

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

echo "🔍 Running preflight checks for Command Center restart..."
echo ""

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

# 1. Resolve Command Center
echo "📍 Resolving Command Center service..."
SERVICE_DATA=$("$RESOLVER" --json "dashboard" 2>/dev/null) || {
  echo -e "${RED}❌ ERROR: Failed to resolve dashboard service${NC}" >&2
  exit 1
}

LAUNCH_AGENT=$(echo "$SERVICE_DATA" | jq -r '.launch_agent')
REPO_PATH=$(echo "$SERVICE_DATA" | jq -r '.repo_path')
LOCAL_URL=$(echo "$SERVICE_DATA" | jq -r '.local_url')
RESTART_SAFE=$(echo "$SERVICE_DATA" | jq -r '.restart_safe')

echo -e "${GREEN}✓${NC} Command Center service resolved"
echo "   Launch Agent: $LAUNCH_AGENT"
echo "   Path: $REPO_PATH"
echo "   URL: $LOCAL_URL"
echo ""

# 2. Verify repo exists
if [[ ! -d "$REPO_PATH" ]]; then
  echo -e "${RED}❌ ERROR: Repository not found at $REPO_PATH${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Repository path verified"
echo ""

# 3. Check if service is running
echo "🔎 Checking current service status..."
if launchctl list | grep -q "$LAUNCH_AGENT"; then
  STATUS=$(launchctl list | grep "$LAUNCH_AGENT" | awk '{print $1}')
  if [[ "$STATUS" == "-" ]]; then
    echo -e "${YELLOW}⚠️  Status: Running${NC}"
  else
    echo -e "${YELLOW}⚠️  Status: Stopped (PID would have been: $STATUS)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Service not found in launchctl list${NC}"
fi
echo ""

# ============================================================================
# RESTART
# ============================================================================

echo "🔄 Restarting Command Center..."
echo ""

if launchctl restart "$LAUNCH_AGENT"; then
  echo -e "${GREEN}✓${NC} Restart command sent"
else
  echo -e "${RED}❌ ERROR: Restart failed${NC}" >&2
  exit 1
fi

echo ""
echo "⏳ Waiting for service to start (5 seconds)..."
sleep 5

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Command Center Restarted${NC}"
echo "=========================================="
echo ""
echo "Service Details:"
echo "  Launch Agent: $LAUNCH_AGENT"
echo "  Repository: $REPO_PATH"
echo "  Local URL: $LOCAL_URL"
echo ""
echo "📝 Verification:"
echo "  1. Check logs: launchctl log $LAUNCH_AGENT"
echo "  2. Visit dashboard: $LOCAL_URL"
echo "  3. Verify no errors in browser console"
echo ""
