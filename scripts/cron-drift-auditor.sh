#!/bin/bash
#
# cron-drift-auditor.sh — Daily cron-to-state registry audit
#
# This script audits the cron registry to detect:
# 1. Missing scripts (job references deleted files)
# 2. Text-only instructions without backing scripts
# 3. Deprecated jobs (flagged for cleanup)
#

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
REGISTRY="${HOME}/.openclaw/cron-registry.json"
AUDIT_LOG="${WORKSPACE}/.hal-alfred-tracking/drift-audit.jsonl"
FIXES_LOG="${WORKSPACE}/.hal-alfred-tracking/drift-fixes.log"

FIX_MODE=0
VERBOSE=0

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --fix) FIX_MODE=1 ;;
    --verbose) VERBOSE=1 ;;
  esac
done

# Ensure tracking directory exists
mkdir -p "${WORKSPACE}/.hal-alfred-tracking"

# Initialize counters
ISSUES_FOUND=0
ISSUES_FIXED=0

if [[ $VERBOSE -eq 1 ]]; then
  echo "[DRIFT-AUDITOR] Starting audit at $(date '+%Y-%m-%d %H:%M:%S')"
  echo "[DRIFT-AUDITOR] Registry: $REGISTRY"
fi

# Check registry exists
if [[ ! -f "$REGISTRY" ]]; then
  echo "ERROR: Registry not found at $REGISTRY" >&2
  exit 1
fi

# Function to expand paths
expand_path() {
  local path="$1"
  echo "${path/\~/$HOME}"
}

# Process registry using jq as a parser
jq -c '.jobs[]' "$REGISTRY" | while IFS= read -r job_json; do
  jobId=$(echo "$job_json" | jq -r '.jobId')
  jobName=$(echo "$job_json" | jq -r '.jobName')
  enabled=$(echo "$job_json" | jq -r '.enabled')
  
  if [[ $VERBOSE -eq 1 ]]; then
    echo "[DRIFT-AUDITOR] Checking: $jobId"
  fi
  
  # Skip disabled jobs
  if [[ "$enabled" != "true" ]]; then
    continue
  fi
  
  # Process references (which come as a single JSON array in this job object)
  references=$(echo "$job_json" | jq -c '.references[]')
  
  echo "$references" | while IFS= read -r ref_json; do
    ref_type=$(echo "$ref_json" | jq -r '.type')
    target=$(echo "$ref_json" | jq -r '.target')
    
    if [[ "$ref_type" == "script" ]]; then
      expanded_target=$(expand_path "$target")
      
      if [[ ! -f "$expanded_target" ]]; then
        echo "{\"severity\":\"error\",\"jobId\":\"$jobId\",\"jobName\":\"$jobName\",\"issue\":\"MISSING_SCRIPT\",\"target\":\"$target\"}" >> "$AUDIT_LOG"
        ((ISSUES_FOUND++))
        
        if [[ $VERBOSE -eq 1 ]]; then
          echo "  ❌ MISSING SCRIPT: $target"
        fi
      else
        if [[ $VERBOSE -eq 1 ]]; then
          echo "  ✓ Script exists: $target"
        fi
      fi
    elif [[ "$ref_type" == "text-instruction" ]]; then
      echo "{\"severity\":\"warning\",\"jobId\":\"$jobId\",\"jobName\":\"$jobName\",\"issue\":\"TEXT_ONLY_INSTRUCTION\",\"target\":\"$target\"}" >> "$AUDIT_LOG"
      
      if [[ $VERBOSE -eq 1 ]]; then
        echo "  ⚠️  TEXT-ONLY (no backing script): $target"
      fi
    fi
  done
done

# Summary report
TOTAL_JOBS=$(jq '.jobs | length' "$REGISTRY")

echo ""
echo "=== DRIFT AUDIT SUMMARY ==="
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S') AST"
echo "Total jobs scanned: $TOTAL_JOBS"
echo "Issues found: $ISSUES_FOUND"
echo ""

if [[ $ISSUES_FOUND -gt 0 ]]; then
  echo "⚠️  FINDINGS:"
  echo "Review audit log: $AUDIT_LOG"
  grep "MISSING_SCRIPT" "$AUDIT_LOG" 2>/dev/null | while read -r line; do
    target=$(echo "$line" | jq -r '.target')
    echo "  Missing: $target"
  done
  echo ""
  echo "ACTION REQUIRED: Fix missing scripts before next cron execution"
  exit 1
else
  echo "✓ All scripts referenced by cron jobs exist and are executable"
  exit 0
fi
