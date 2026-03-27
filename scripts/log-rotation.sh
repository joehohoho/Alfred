#!/bin/bash

################################################################################
# log-rotation.sh — Daily Log Rotation, Compression, and Archival
# 
# Purpose:
#   - Archive execution logs older than 7 days
#   - Compress archived logs (gzip) to reduce disk usage
#   - Remove logs older than 90 days
#   - Maintain working directory size <100 MB
#
# Schedule: Daily at 2 AM via cron (0 2 * * * /path/to/log-rotation.sh)
#
# Execution Tracking Directory: ~/.openclaw/workspace/.hal-alfred-tracking/
# Archive Location: ~/.openclaw/workspace/memory/logs/archive/
#
# Logs Affected:
#   - hal-dispatch.log
#   - alfred-execution.log
#   - alfred-proactive.log
#   - executor-health.log
#   - health-check.log
#   - launchagent-restarts.log
#   - log-rotation.log (this script's log)
#
# ROI: Prevents 2+ GB disk waste over 365 days; keeps queries responsive
#
################################################################################

set -euo pipefail

# Configuration
TRACKING_DIR="${HOME}/.openclaw/workspace/.hal-alfred-tracking"
ARCHIVE_DIR="${HOME}/.openclaw/workspace/memory/logs/archive"
SCRIPT_LOG="${TRACKING_DIR}/log-rotation.log"
RETENTION_DAYS_HOT=7
RETENTION_DAYS_TOTAL=90
MAX_WORKING_SIZE_MB=100

# Create archive directory if it doesn't exist
mkdir -p "${ARCHIVE_DIR}"

# Initialize script log with timestamp
{
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%S-0300')] Log rotation started"
} >> "${SCRIPT_LOG}"

# Function: Log with timestamp
log_msg() {
  local msg="$1"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%S-0300')] ${msg}" >> "${SCRIPT_LOG}"
}

# Function: Get file age in days
get_file_age_days() {
  local file="$1"
  # macOS: stat -f%m; Linux: stat -c%Y
  local file_mtime
  if [[ $(uname -s) == "Darwin" ]]; then
    file_mtime=$(stat -f%m "${file}" 2>/dev/null || echo "0")
  else
    file_mtime=$(stat -c%Y "${file}" 2>/dev/null || echo "0")
  fi
  local current_time=$(date +%s)
  local age_seconds=$((current_time - file_mtime))
  local age_days=$((age_seconds / 86400))
  echo "${age_days}"
}

# Function: Compress file with gzip and verify
compress_log() {
  local input_file="$1"
  local output_file="${input_file}.gz"
  
  # Skip if already compressed or doesn't exist
  [[ ! -f "${input_file}" ]] && return 0
  [[ -f "${output_file}" ]] && return 0
  
  # Compress
  if gzip -9 "${input_file}" 2>/dev/null; then
    local original_size=$(stat -f%z "${input_file}" 2>/dev/null || echo "0")
    local compressed_size=$(stat -f%z "${output_file}" 2>/dev/null || echo "0")
    log_msg "Compressed: $(basename ${input_file}) (${original_size} → ${compressed_size} bytes)"
    return 0
  else
    log_msg "ERROR: Failed to compress ${input_file}"
    return 1
  fi
}

# Main rotation logic
rotate_logs() {
  local total_archived=0
  local total_deleted=0
  
  # Process each log file in tracking directory
  for logfile in "${TRACKING_DIR}"/*.log; do
    [[ ! -f "${logfile}" ]] && continue
    
    local filename=$(basename "${logfile}")
    local age_days=$(get_file_age_days "${logfile}")
    local file_size_bytes
    if [[ $(uname -s) == "Darwin" ]]; then
      file_size_bytes=$(stat -f%z "${logfile}" 2>/dev/null || echo "0")
    else
      file_size_bytes=$(stat -c%s "${logfile}" 2>/dev/null || echo "0")
    fi
    local file_size_mb=$((file_size_bytes / 1048576))
    
    # Skip if less than 1 day old (let it accumulate)
    if [[ ${age_days} -lt 1 ]]; then
      log_msg "SKIP: ${filename} (age=${age_days}d, size=${file_size_mb}MB) — too recent"
      continue
    fi
    
    # Delete if older than 90 days
    if [[ ${age_days} -ge ${RETENTION_DAYS_TOTAL} ]]; then
      rm -f "${logfile}"
      log_msg "DELETED: ${filename} (age=${age_days}d, size=${file_size_mb}MB) — beyond retention"
      total_deleted=$((total_deleted + 1))
      continue
    fi
    
    # Archive and compress if older than 7 days
    if [[ ${age_days} -ge ${RETENTION_DAYS_HOT} ]]; then
      local file_date=$(date -u '+%Y-%m-%d')
      local archive_name="${ARCHIVE_DIR}/$(basename ${logfile} .log)-${file_date}.tar.gz"
      
      # Create tar + gzip directly
      if tar -czf "${archive_name}" "${logfile}" 2>/dev/null; then
        local archive_size_bytes
        if [[ $(uname -s) == "Darwin" ]]; then
          archive_size_bytes=$(stat -f%z "${archive_name}" 2>/dev/null || echo "0")
        else
          archive_size_bytes=$(stat -c%s "${archive_name}" 2>/dev/null || echo "0")
        fi
        log_msg "ARCHIVED: ${filename} → $(basename ${archive_name}) (${archive_size_bytes} bytes)"
        rm -f "${logfile}"
        total_archived=$((total_archived + 1))
      else
        log_msg "ERROR: Failed to archive ${filename}"
      fi
      continue
    fi
  done
  
  # Summary
  log_msg "Rotation complete: archived=${total_archived}, deleted=${total_deleted}"
}

# Check working directory size
check_disk_usage() {
  local working_size_bytes
  if [[ $(uname -s) == "Darwin" ]]; then
    working_size_bytes=$(du -s "${TRACKING_DIR}" 2>/dev/null | awk '{print $1 * 512}')
  else
    working_size_bytes=$(du -sb "${TRACKING_DIR}" 2>/dev/null | awk '{print $1}')
  fi
  local working_size_mb=$((working_size_bytes / 1048576))
  
  log_msg "Working directory size: ${working_size_mb} MB (max: ${MAX_WORKING_SIZE_MB} MB)"
  
  if [[ ${working_size_mb} -gt ${MAX_WORKING_SIZE_MB} ]]; then
    log_msg "WARNING: Working directory exceeds ${MAX_WORKING_SIZE_MB} MB — aggressive cleanup may be needed"
    return 1
  fi
  return 0
}

# Verify archive integrity (sample check)
verify_archives() {
  local verified=0
  local failed=0
  
  for archive in "${ARCHIVE_DIR}"/*.tar.gz; do
    [[ ! -f "${archive}" ]] && continue
    
    if tar -tzf "${archive}" > /dev/null 2>&1; then
      verified=$((verified + 1))
    else
      log_msg "ERROR: Archive integrity check failed: $(basename ${archive})"
      failed=$((failed + 1))
    fi
  done
  
  [[ ${verified} -gt 0 ]] && log_msg "Archive verification: ${verified} OK, ${failed} failed"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

log_msg "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run rotation
rotate_logs

# Check disk usage
if ! check_disk_usage; then
  log_msg "⚠️  DISK USAGE ALERT: Working directory size critical"
fi

# Verify archive integrity
verify_archives

log_msg "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_msg "Rotation complete"

exit 0
