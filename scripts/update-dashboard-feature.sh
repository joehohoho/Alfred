#!/bin/bash

# update-dashboard-feature.sh
# Purpose: Update Command Center dashboard with preflight path resolution
# Usage: ./update-dashboard-feature.sh <feature-name> [--no-build]
# Example: ./update-dashboard-feature.sh "game-mode" --no-build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
RESOLVER="$SCRIPT_DIR/resolve-service-path.sh"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
FEATURE_NAME="${1:-}"
NO_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-build)
      NO_BUILD=true
      shift
      ;;
    *)
      FEATURE_NAME="$1"
      shift
      ;;
  esac
done

# ============================================================================
# PREFLIGHT CHECKS
# ============================================================================

echo "🔍 Running preflight checks..."
echo ""

# 1. Verify resolver exists
if [[ ! -f "$RESOLVER" ]]; then
  echo -e "${RED}❌ ERROR: Resolver script not found at $RESOLVER${NC}" >&2
  exit 1
fi

# 2. Resolve Command Center path
echo "📍 Resolving Command Center service..."
SERVICE_DATA=$("$RESOLVER" --json "dashboard" 2>/dev/null) || {
  echo -e "${RED}❌ ERROR: Failed to resolve 'dashboard' service${NC}" >&2
  echo "   Run: $RESOLVER --help" >&2
  exit 1
}

# Extract critical metadata
REPO_PATH=$(echo "$SERVICE_DATA" | jq -r '.repo_path')
LAUNCH_AGENT=$(echo "$SERVICE_DATA" | jq -r '.launch_agent')
LOCAL_URL=$(echo "$SERVICE_DATA" | jq -r '.local_url')
SAFE_EDITS=$(echo "$SERVICE_DATA" | jq -r '.preflight_rules.safe_edits // []')

echo -e "${GREEN}✓${NC} Service resolved: Command Center"
echo "   Path: $REPO_PATH"
echo "   URL: $LOCAL_URL"
echo ""

# 3. Verify repo exists and has expected structure
if [[ ! -d "$REPO_PATH" ]]; then
  echo -e "${RED}❌ ERROR: Command Center repo not found at $REPO_PATH${NC}" >&2
  echo "   Resolved path may be wrong."
  echo "   Verify with: $RESOLVER --json dashboard" >&2
  exit 1
fi

if [[ ! -f "$REPO_PATH/package.json" ]]; then
  echo -e "${RED}❌ ERROR: package.json not found in Command Center repo${NC}" >&2
  echo "   Expected: $REPO_PATH/package.json" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Repository structure verified"
echo ""

# 4. Verify feature name provided
if [[ -z "$FEATURE_NAME" ]]; then
  echo -e "${RED}❌ ERROR: Feature name required${NC}" >&2
  echo ""
  echo "Usage: $0 <feature-name> [--no-build]"
  echo "Example: $0 game-mode --no-build"
  exit 1
fi

echo -e "${GREEN}✓${NC} Feature name: $FEATURE_NAME"
echo ""

# ============================================================================
# READY TO EDIT
# ============================================================================

cd "$REPO_PATH" || {
  echo -e "${RED}❌ ERROR: Failed to cd to $REPO_PATH${NC}" >&2
  exit 1
}

echo -e "${GREEN}✓${NC} Changed to repo directory: $REPO_PATH"
echo ""
echo "=========================================="
echo "READY: Command Center Feature Update"
echo "=========================================="
echo ""
echo "Feature: $FEATURE_NAME"
echo "Repo: $REPO_PATH"
echo "Build: $([[ $NO_BUILD == true ]] && echo "disabled" || echo "enabled")"
echo ""
echo "📋 Next steps:"
echo "1. Edit src/ files for your feature"
echo "2. Test locally at $LOCAL_URL (if running)"
echo "3. Run tests: npm test"
echo ""

if [[ $NO_BUILD == false ]]; then
  echo "Building..."
  echo ""
  
  if ! npm run build; then
    echo -e "${RED}❌ Build failed${NC}" >&2
    exit 1
  fi
  
  echo ""
  echo -e "${GREEN}✓${NC} Build complete"
else
  echo "⏭️  Build skipped (--no-build flag)"
fi

echo ""
echo -e "${GREEN}✓${NC} Feature update ready: $FEATURE_NAME"
echo ""
echo "📝 To deploy to production, run:"
echo "   launchctl restart $LAUNCH_AGENT"
echo "   (Verify at $LOCAL_URL)"
echo ""
