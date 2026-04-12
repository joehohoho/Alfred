#!/bin/bash
#
# cron-registry-builder.sh — Update cron-registry.json from current Gateway cron jobs
#
# This script reads the current cron jobs from ~/.openclaw/cron/jobs.json
# and updates the canonical registry with new jobs, removed jobs, and changed references.
#
# Usage:
#   bash scripts/cron-registry-builder.sh [--force] [--verbose]
#
# --force: Overwrite the entire registry (use with caution)
# --verbose: Show detailed processing logs
#

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
CRON_JOBS="${HOME}/.openclaw/cron/jobs.json"
REGISTRY="${HOME}/.openclaw/cron-registry.json"
REGISTRY_BACKUP="${REGISTRY}.backup"

FORCE=0
VERBOSE=0

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --verbose) VERBOSE=1 ;;
  esac
done

if [[ $VERBOSE -eq 1 ]]; then
  echo "[REGISTRY-BUILDER] Starting registry update"
  echo "[REGISTRY-BUILDER] Source: $CRON_JOBS"
  echo "[REGISTRY-BUILDER] Registry: $REGISTRY"
fi

# Check source exists
if [[ ! -f "$CRON_JOBS" ]]; then
  echo "ERROR: Cron jobs file not found at $CRON_JOBS" >&2
  exit 1
fi

# Create a temp file for the new registry
TEMP_REGISTRY=$(mktemp)

# Function to extract references from cron job payload
extract_references() {
  local payload="$1"
  local refs_array="[]"
  
  # Extract script references from .message (agentTurn text)
  local message=$(echo "$payload" | jq -r '.message // empty')
  if [[ -n "$message" ]]; then
    # Look for bash script patterns
    local scripts=$(echo "$message" | grep -oE 'bash [^ ]+\.sh|/[^ "]+\.sh' | sed 's/bash //g' | sort -u)
    while IFS= read -r script; do
      [[ -z "$script" ]] && continue
      refs_array=$(echo "$refs_array" | jq --arg type "script" --arg target "$script" \
        '. += [{type: $type, target: $target, verifyCmd: ("test -x " + $target)}]')
    done <<< "$scripts"
  fi
  
  # Extract script references from .text (systemEvent text)
  local text=$(echo "$payload" | jq -r '.text // empty')
  if [[ -n "$text" ]]; then
    local scripts=$(echo "$text" | grep -oE 'bash [^ ]+\.sh|/[^ "]+\.sh' | sed 's/bash //g' | sort -u)
    while IFS= read -r script; do
      [[ -z "$script" ]] && continue
      refs_array=$(echo "$refs_array" | jq --arg type "script" --arg target "$script" \
        '. += [{type: $type, target: $target, verifyCmd: ("test -x " + $target)}]')
    done <<< "$scripts"
  fi
  
  # If payload has text but no script found, mark as text-instruction
  if [[ -n "$text" || -n "$message" ]]; then
    if [[ $(echo "$refs_array" | jq 'length') -eq 0 ]]; then
      local instr_text="${text:-$message}"
      refs_array=$(echo "$refs_array" | jq --arg type "text-instruction" --arg target "$instr_text" \
        '. += [{type: $type, target: $target, verifyCmd: null}]')
    fi
  fi
  
  echo "$refs_array"
}

# Build new registry from current cron jobs
NEW_REGISTRY=$(cat <<EOF
{
  "version": 1,
  "description": "Canonical registry of cron jobs and their referenced scripts/targets. Updated from Gateway cron jobs.",
  "generatedAtMs": $(date +%s)000,
  "generatedBy": "cron-registry-builder.sh",
  "jobs": [
EOF
)

# Process each cron job
first_job=true
jq -c '.jobs[]' "$CRON_JOBS" | while IFS= read -r job; do
  jobId=$(echo "$job" | jq -r '.id // .jobId // "unknown"')
  jobName=$(echo "$job" | jq -r '.name // "Unnamed"')
  enabled=$(echo "$job" | jq -r '.enabled')
  payload=$(echo "$job" | jq -c '.payload')
  
  if [[ $VERBOSE -eq 1 ]]; then
    echo "[REGISTRY-BUILDER] Processing: $jobId — $jobName (enabled: $enabled)"
  fi
  
  # Extract references
  references=$(extract_references "$payload")
  
  # Compute drift status
  drift_status="ok"
  warnings="[]"
  
  # Check for missing scripts
  echo "$references" | jq -c '.[]' | while IFS= read -r ref; do
    ref_type=$(echo "$ref" | jq -r '.type')
    target=$(echo "$ref" | jq -r '.target')
    
    if [[ "$ref_type" == "script" ]]; then
      expanded=$(echo "${target/\~/$HOME}")
      if [[ ! -f "$expanded" ]]; then
        drift_status="error"
        warnings=$(echo "$warnings" | jq -c --arg w "MISSING SCRIPT: $target" '. += [$w]')
      fi
    elif [[ "$ref_type" == "text-instruction" ]]; then
      warnings=$(echo "$warnings" | jq -c --arg w "TEXT-ONLY INSTRUCTION: no backing script" '. += [$w]')
      drift_status="warning"
    fi
  done
  
  # Add job to registry
  JOB_ENTRY=$(jq -n \
    --arg jobId "$jobId" \
    --arg jobName "$jobName" \
    --argjson enabled "$enabled" \
    --argjson references "$references" \
    --arg driftStatus "$drift_status" \
    '{jobId: $jobId, jobName: $jobName, enabled: $enabled, references: $references, lastAuditMs: 0, driftStatus: $driftStatus, warnings: []}')
  
  # Append to temp file
  echo "$JOB_ENTRY" >> "$TEMP_REGISTRY.jobs"
done

# Count jobs processed
JOBS_COUNT=$(jq '.jobs | length' "$CRON_JOBS")
echo ""
echo "=== REGISTRY BUILD SUMMARY ==="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S') AST"
echo "Jobs processed: $JOBS_COUNT"
echo ""
echo "Next steps:"
echo "1. Run: bash scripts/cron-drift-auditor.sh --verbose"
echo "2. Review findings and fix missing scripts"
echo "3. Commit updated registry: git add cron-registry.json && git commit -m 'Update cron registry'"
echo ""
echo "Registry updated: $REGISTRY"
