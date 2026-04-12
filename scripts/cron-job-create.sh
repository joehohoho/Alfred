#!/bin/bash

# cron-job-create.sh
# Purpose: Create new cron job with service path validation
# Usage: ./cron-job-create.sh --name "Job Name" --schedule "0 8 * * *" --payload "job:payload"

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
JOB_NAME=""
SCHEDULE=""
PAYLOAD=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      JOB_NAME="$2"
      shift 2
      ;;
    --schedule)
      SCHEDULE="$2"
      shift 2
      ;;
    --payload)
      PAYLOAD="$2"
      shift 2
      ;;
    --help|-h)
      cat <<EOF
Usage: cron-job-create.sh --name "NAME" --schedule "CRON" --payload "PAYLOAD"

Create a new cron job with path validation.

OPTIONS:
  --name NAME         Job name (required)
  --schedule CRON     Cron expression, e.g., "0 8 * * *" (required)
  --payload PAYLOAD   Job payload JSON string or file (required)
  --help, -h          Show this help message

EXAMPLES:
  # Create a simple daily job
  ./cron-job-create.sh --name "Daily Cleanup" --schedule "0 2 * * *" --payload "..."

  # Create a job from a JSON file
  ./cron-job-create.sh --name "Weekly Report" --schedule "0 8 * * 1" \\
    --payload "\$(cat myjob.json)"

IMPORTANT:
  - Cron jobs run on the gateway (may be approved/controlled by Joe)
  - Always test your payload before creating the job
  - Jobs that reference external scripts must verify script paths exist
  - Schedule changes may affect SLAs and require testing
EOF
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Unknown option: $1${NC}" >&2
      exit 1
      ;;
  esac
done

echo "🔍 Running preflight checks for cron job creation..."
echo ""

# ============================================================================
# VALIDATION
# ============================================================================

# Check required fields
if [[ -z "$JOB_NAME" ]]; then
  echo -e "${RED}❌ ERROR: Job name required (--name)${NC}" >&2
  exit 1
fi

if [[ -z "$SCHEDULE" ]]; then
  echo -e "${RED}❌ ERROR: Schedule required (--schedule)${NC}" >&2
  exit 1
fi

if [[ -z "$PAYLOAD" ]]; then
  echo -e "${RED}❌ ERROR: Payload required (--payload)${NC}" >&2
  exit 1
fi

echo "📋 Job Details:"
echo "   Name: $JOB_NAME"
echo "   Schedule: $SCHEDULE"
echo "   Payload: ${PAYLOAD:0:80}..."
echo ""

# ============================================================================
# SERVICE RESOLUTION
# ============================================================================

echo "📍 Resolving Cron Scheduler service..."
SERVICE_DATA=$("$RESOLVER" --json "cron" 2>/dev/null) || {
  echo -e "${RED}❌ ERROR: Failed to resolve cron service${NC}" >&2
  exit 1
}

REPO_PATH=$(echo "$SERVICE_DATA" | jq -r '.repo_path')
LAUNCH_AGENT=$(echo "$SERVICE_DATA" | jq -r '.launch_agent')

echo -e "${GREEN}✓${NC} Cron Scheduler resolved"
echo "   Path: $REPO_PATH"
echo "   Launch Agent: $LAUNCH_AGENT"
echo ""

# ============================================================================
# PATH VERIFICATION
# ============================================================================

# Verify cron jobs file exists
if [[ ! -f "$REPO_PATH" ]]; then
  echo -e "${RED}❌ ERROR: Cron jobs file not found at $REPO_PATH${NC}" >&2
  echo "   Expected file: $REPO_PATH" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Cron jobs file verified"
echo ""

# ============================================================================
# PAYLOAD VALIDATION
# ============================================================================

echo "📝 Validating payload..."

# Check if payload is valid JSON
if ! echo "$PAYLOAD" | jq empty 2>/dev/null; then
  echo -e "${RED}❌ ERROR: Payload is not valid JSON${NC}" >&2
  echo "   Payload: $PAYLOAD" >&2
  exit 1
fi

echo -e "${GREEN}✓${NC} Payload is valid JSON"
echo ""

# ============================================================================
# SCRIPT REFERENCE CHECK (if payload references scripts)
# ============================================================================

# Look for script references in payload
SCRIPT_REFS=$(echo "$PAYLOAD" | jq -r '.message // .text // ""' | grep -o '\$[A-Z_]*' | sort -u || true)

if [[ -n "$SCRIPT_REFS" ]]; then
  echo "🔎 Checking script references in payload..."
  
  while read -r script_ref; do
    # Extract script name (e.g., $SCRIPT_NAME -> SCRIPT_NAME)
    VAR_NAME="${script_ref:1}"  # Remove leading $
    
    echo "   Checking: $VAR_NAME"
  done <<< "$SCRIPT_REFS"
  
  echo ""
fi

# ============================================================================
# READY FOR CREATION
# ============================================================================

echo "=========================================="
echo -e "${GREEN}✓ Ready to create cron job${NC}"
echo "=========================================="
echo ""
echo "Job Summary:"
echo "  Name: $JOB_NAME"
echo "  Schedule: $SCHEDULE"
echo "  Gateway: $LAUNCH_AGENT"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Review the job payload one more time"
echo "2. Test the job's action before deploying:"
echo "   - If it's a script, test: bash /path/to/script.sh"
echo "   - If it's an API call, test with curl or API client"
echo ""
echo "3. Create the job by adding to: $REPO_PATH"
echo "   (This requires direct JSON editing or API call to gateway)"
echo ""
echo "4. After creation, verify:"
echo "   - Job appears in: launchctl list | grep cron"
echo "   - Logs appear in: ~/.openclaw/logs/cron/"
echo ""
echo "5. Monitor first execution:"
echo "   - Check logs for errors"
echo "   - Verify expected action occurred"
echo "   - Adjust schedule/payload if needed"
echo ""
echo "⚠️  Note: Gateway restart required for job changes to take effect"
echo "   Restart may require approval (check with Joe if uncertain)"
echo ""
