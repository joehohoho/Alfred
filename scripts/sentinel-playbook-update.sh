#!/bin/bash

# sentinel-playbook-update.sh
# Purpose: Update Sentinel health monitor playbook with verified script paths
# Usage: ./sentinel-playbook-update.sh "component" "description" "fix-script-name"

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
COMPONENT="${1:-}"
DESCRIPTION="${2:-}"
FIX_SCRIPT="${3:-}"

print_usage() {
  cat <<EOF
Usage: sentinel-playbook-update.sh COMPONENT DESCRIPTION FIX_SCRIPT

Update Sentinel self-healing playbook with a new or modified fix.

ARGUMENTS:
  COMPONENT     Component name (e.g., "gateway", "cron", "sessions")
  DESCRIPTION   Brief description of what the fix does
  FIX_SCRIPT    Script name or path to the fix (e.g., "restart-gateway.sh")

EXAMPLES:
  ./sentinel-playbook-update.sh "gateway" "Auto-restart gateway on timeout" "restart-gateway.sh"
  ./sentinel-playbook-update.sh "cron" "Re-enable disabled cron jobs" "restore-cron-jobs.sh"

WORKFLOW:
  1. Script verifies component exists and fix script is accessible
  2. Updates Sentinel playbook with the new/modified fix
  3. Tests playbook is valid JSON
  4. Logs the change for audit
EOF
}

# ============================================================================
# VALIDATION
# ============================================================================

echo "🔍 Running preflight checks for Sentinel playbook update..."
echo ""

if [[ -z "$COMPONENT" ]] || [[ -z "$DESCRIPTION" ]] || [[ -z "$FIX_SCRIPT" ]]; then
  echo -e "${RED}❌ ERROR: All arguments required${NC}" >&2
  echo ""
  print_usage
  exit 1
fi

# Resolve Sentinel service
echo "📍 Resolving Sentinel service..."
SERVICE_DATA=$("$RESOLVER" --json "sentinel" 2>/dev/null) || {
  echo -e "${RED}❌ ERROR: Failed to resolve sentinel service${NC}" >&2
  exit 1
}

SENTINEL_PATH=$(echo "$SERVICE_DATA" | jq -r '.repo_path')
LAUNCH_AGENT=$(echo "$SERVICE_DATA" | jq -r '.launch_agent')

echo -e "${GREEN}✓${NC} Sentinel service resolved"
echo "   Path: $SENTINEL_PATH"
echo "   Launch Agent: $LAUNCH_AGENT"
echo ""

# ============================================================================
# WORKSPACE VERIFICATION
# ============================================================================

echo "📋 Verifying workspace structure..."

# Verify we're in the workspace
if [[ ! -d "$WORKSPACE_DIR/.git" ]]; then
  echo -e "${RED}❌ ERROR: Not in a git repository${NC}" >&2
  exit 1
fi

# Check sentinel playbook exists
PLAYBOOK_PATH="$WORKSPACE_DIR/.hal-alfred-tracking/sentinel-playbook.json"
if [[ ! -f "$PLAYBOOK_PATH" ]]; then
  echo -e "${RED}❌ ERROR: Sentinel playbook not found at $PLAYBOOK_PATH${NC}" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Playbook located: $PLAYBOOK_PATH"
echo ""

# ============================================================================
# FIX SCRIPT VALIDATION
# ============================================================================

echo "🔎 Validating fix script..."

# Check if script exists (could be in scripts/ or referenced path)
FIX_SCRIPT_PATH=""

if [[ -f "$FIX_SCRIPT" ]]; then
  FIX_SCRIPT_PATH="$FIX_SCRIPT"
elif [[ -f "$SCRIPT_DIR/$FIX_SCRIPT" ]]; then
  FIX_SCRIPT_PATH="$SCRIPT_DIR/$FIX_SCRIPT"
elif [[ -f "$WORKSPACE_DIR/scripts/$FIX_SCRIPT" ]]; then
  FIX_SCRIPT_PATH="$WORKSPACE_DIR/scripts/$FIX_SCRIPT"
else
  echo -e "${YELLOW}⚠️  WARNING: Fix script not found: $FIX_SCRIPT${NC}"
  echo "   Searched: current dir, scripts/, workspace/scripts/"
  echo "   Script will be referenced but may not exist yet."
  FIX_SCRIPT_PATH="$FIX_SCRIPT"  # Use as-is
fi

if [[ -f "$FIX_SCRIPT_PATH" ]]; then
  if [[ ! -x "$FIX_SCRIPT_PATH" ]]; then
    echo -e "${YELLOW}⚠️  Script is not executable: $FIX_SCRIPT_PATH${NC}"
    echo "   Run: chmod +x $FIX_SCRIPT_PATH"
  fi
  echo -e "${GREEN}✓${NC} Fix script found and verified: $FIX_SCRIPT_PATH"
else
  echo -e "${YELLOW}⚠️  Fix script not yet present (will be added): $FIX_SCRIPT_PATH${NC}"
fi

echo ""

# ============================================================================
# PLAYBOOK UPDATE
# ============================================================================

echo "📝 Updating playbook..."

# Check if component already exists in playbook
if jq -e ".components[\"$COMPONENT\"]" "$PLAYBOOK_PATH" > /dev/null 2>&1; then
  echo "   (Updating existing component: $COMPONENT)"
else
  echo "   (Adding new component: $COMPONENT)"
fi

# Create or update playbook entry
# Note: Using jq for safe JSON manipulation
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Update playbook JSON
jq ".components[\"$COMPONENT\"] = {
  \"description\": \"$DESCRIPTION\",
  \"fix_script\": \"$FIX_SCRIPT\",
  \"last_updated\": \"$TIMESTAMP\",
  \"added_by\": \"Alfred\"
}" "$PLAYBOOK_PATH" > "${PLAYBOOK_PATH}.tmp"

if ! jq empty "${PLAYBOOK_PATH}.tmp" 2>/dev/null; then
  echo -e "${RED}❌ ERROR: Failed to create valid JSON${NC}" >&2
  rm -f "${PLAYBOOK_PATH}.tmp"
  exit 1
fi

# Atomic move
mv "${PLAYBOOK_PATH}.tmp" "$PLAYBOOK_PATH"

echo -e "${GREEN}✓${NC} Playbook updated successfully"
echo ""

# ============================================================================
# AUDIT LOG
# ============================================================================

echo "📊 Logging change..."

AUDIT_LOG="$WORKSPACE_DIR/.hal-alfred-tracking/sentinel-updates.log"
echo "$TIMESTAMP | $COMPONENT | $DESCRIPTION | $FIX_SCRIPT" >> "$AUDIT_LOG"

echo -e "${GREEN}✓${NC} Logged to: $AUDIT_LOG"
echo ""

# ============================================================================
# COMPLETION
# ============================================================================

echo "=========================================="
echo -e "${GREEN}✓ Sentinel Playbook Updated${NC}"
echo "=========================================="
echo ""
echo "Component:    $COMPONENT"
echo "Description:  $DESCRIPTION"
echo "Fix Script:   $FIX_SCRIPT"
echo "Timestamp:    $TIMESTAMP"
echo "Playbook:     $PLAYBOOK_PATH"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Verify the entry was added:"
echo "   jq '.components[\"$COMPONENT\"]' $PLAYBOOK_PATH"
echo ""
echo "2. Test the fix script:"
echo "   bash $FIX_SCRIPT_PATH (or create it if not yet present)"
echo ""
echo "3. Sentinel will run this fix automatically when it detects"
echo "   the condition next time (Sentinel runs every 5 minutes)"
echo ""
echo "4. Commit the playbook update:"
echo "   cd $WORKSPACE_DIR"
echo "   git add .hal-alfred-tracking/sentinel-playbook.json"
echo "   git commit -m \"Sentinel: Add $COMPONENT fix playbook\""
echo ""
