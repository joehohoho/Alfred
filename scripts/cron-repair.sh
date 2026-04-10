#!/bin/bash
# cron-repair.sh
# Diagnoses and repairs disabled cron jobs
# Usage: bash cron-repair.sh [job_name_pattern]

set -e

JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
WORKSPACE="$HOME/.openclaw/workspace"

if [[ ! -f "$JOBS_FILE" ]]; then
    echo "ERROR: $JOBS_FILE not found"
    exit 1
fi

# Function to re-enable a job
re_enable_job() {
    local job_id="$1"
    local job_name="$2"
    
    echo "[cron-repair] Re-enabling: $job_name (ID: $job_id)"
    
    # Use jq to update the job
    jq --arg id "$job_id" '.jobs[] | select(.id == $id) | .enabled = true | .state.consecutiveErrors = 0 | .state.lastRunStatus = null | ._autoDisabledAt = null | ._autoDisabledReason = null' "$JOBS_FILE" > /tmp/single_job.json || true
    
    # For now, just report what needs to be done
    echo "  Status: Would set enabled=true, reset consecutive errors"
    echo "  Next run: Check via 'openclaw cron list'"
}

echo "=== Cron Job Repair Diagnostics ==="
echo ""

# List all disabled jobs
echo "Disabled jobs:"
jq -r '.jobs[] | select(.enabled == false) | "\(.id) | \(.name) | \(.state.lastError // "unknown")"' "$JOBS_FILE" | while IFS='|' read -r id name error; do
    echo "  [$id] $name"
    echo "    Last error: ${error:0:80}"
    echo ""
done

echo ""
echo "REPAIR OPTIONS:"
echo "1. Check gateway/auth: openclaw gateway status"
echo "2. Verify Discord channel IDs: jq '.jobs[] | select(.enabled==false) | {name, to: .delivery.to}' $JOBS_FILE"
echo "3. Re-enable via Command Center: Use the UI to toggle enabled=true"
echo "4. Monitor next run: openclaw cron list | grep -E '(Evening|Daily|Inquiry)'"
echo ""
echo "NOTE: Do NOT manually edit $JOBS_FILE; use Command Center or openclaw cron update"
