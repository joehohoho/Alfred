#!/bin/bash
# log-rotation-archival.sh
# Daily log rotation and archival
# Purpose: Keep logs organized, compressed, and archived for long-term retention
#
# Features:
# 1. Daily rotation: Move logs >7 days old to archive
# 2. Compression: gzip reduces 610 KB → ~150 KB per file
# 3. Cleanup: Remove logs >90 days old
# 4. Verification: Ensure archive integrity
# 5. Index: Maintain manifest of archived logs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
ARCHIVE_DIR="$WORKSPACE/memory/logs/archive"
ROTATION_LOG="$TRACK_DIR/log-rotation.log"
ARCHIVE_MANIFEST="$ARCHIVE_DIR/manifest.json"

mkdir -p "$TRACK_DIR" "$ARCHIVE_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$ROTATION_LOG"; }

# Log files to manage (in TRACK_DIR)
LOG_FILES=(
  "hal-dispatch.log"
  "alfred-execution.log"
  "alfred-proactive.log"
)

log "Log rotation started"

# ─────────────────────────────────────────────────────────────────────────────
# 1. ROTATE: Move logs >7 days old to archive
# ─────────────────────────────────────────────────────────────────────────────

rotate_old_logs() {
  local logfile="$1"
  local full_path="$TRACK_DIR/$logfile"
  
  if [[ ! -f "$full_path" ]]; then
    log "SKIP: $logfile not found"
    return
  fi
  
  local file_age_days=$(( ($(date +%s) - $(stat -f%m "$full_path" 2>/dev/null || echo 0)) / 86400 ))
  
  if [[ "$file_age_days" -ge 7 ]]; then
    local archive_date=$(date -j -f "%s" "$(stat -f%m "$full_path" 2>/dev/null || echo 0)" +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")
    local archive_name="${logfile%.log}_${archive_date}.log.gz"
    local archive_path="$ARCHIVE_DIR/$archive_name"
    
    log "ARCHIVE: $logfile (age=${file_age_days}d) → $archive_name"
    
    # Backup original
    cp "$full_path" "$full_path.bak"
    
    # Compress and move to archive
    gzip -c "$full_path" > "$archive_path"
    
    # Verify archive integrity
    if gzip -t "$archive_path" 2>/dev/null; then
      # Remove original and backup
      rm -f "$full_path" "$full_path.bak"
      log "OK: Archived and removed $logfile (compressed size: $(ls -lh "$archive_path" | awk '{print $5}'))"
      
      # Re-create empty log file to prevent missing file errors
      touch "$full_path"
      
      # Update manifest
      update_manifest "$archive_name" "$(stat -f%m "$archive_path" 2>/dev/null || date +%s)" "$(stat -f%z "$archive_path" 2>/dev/null || echo 0)"
    else
      # Restore from backup if compression failed
      log "ERROR: Archive compression failed for $logfile — restoring"
      mv "$full_path.bak" "$full_path"
      rm -f "$archive_path"
    fi
  else
    log "KEEP: $logfile (age=${file_age_days}d, threshold=7d)"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. COMPRESS: Gzip existing logs in archive
# ─────────────────────────────────────────────────────────────────────────────

compress_archive_logs() {
  log "Compressing uncompressed logs in archive..."
  
  for log_gz in "$ARCHIVE_DIR"/*.log; do
    [[ ! -f "$log_gz" ]] && continue
    [[ "$log_gz" == *".gz" ]] && continue
    
    log "COMPRESS: $log_gz"
    gzip "$log_gz" || log "ERROR: Failed to compress $log_gz"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. CLEANUP: Remove logs >90 days old
# ─────────────────────────────────────────────────────────────────────────────

cleanup_old_archives() {
  log "Cleaning up archives >90 days old..."
  
  local cutoff_epoch=$(( $(date +%s) - 7776000 ))  # 90 days in seconds
  local cleaned=0
  
  for archive in "$ARCHIVE_DIR"/*.log.gz; do
    [[ ! -f "$archive" ]] && continue
    
    local file_epoch=$(stat -f%m "$archive" 2>/dev/null || echo "0")
    
    if [[ "$file_epoch" -lt "$cutoff_epoch" ]]; then
      log "REMOVE: $(basename "$archive") (age >90d)"
      rm -f "$archive"
      cleaned=$((cleaned + 1))
    fi
  done
  
  log "Cleaned up $cleaned old archives"
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. MANIFEST: Update archive index for tracking
# ─────────────────────────────────────────────────────────────────────────────

update_manifest() {
  local filename="$1"
  local timestamp="$2"
  local size="$3"
  
  python3 -c "
import json, os, time
manifest_path = '$ARCHIVE_MANIFEST'
try:
    with open(manifest_path) as f:
        manifest = json.load(f)
except:
    manifest = {'created': time.time(), 'entries': []}

# Remove existing entry with same filename
manifest['entries'] = [e for e in manifest['entries'] if e['filename'] != '$filename']

# Add new entry
manifest['entries'].append({
    'filename': '$filename',
    'archived_date': time.strftime('%Y-%m-%d', time.localtime($timestamp)),
    'archived_timestamp': int($timestamp),
    'size_bytes': int($size),
    'compressed': '$filename'.endswith('.gz')
})

# Sort by date descending
manifest['entries'].sort(key=lambda x: x['archived_timestamp'], reverse=True)

# Keep only last 365 entries (1 year of daily rotations)
manifest['entries'] = manifest['entries'][:365]

# Update manifest metadata
manifest['last_updated'] = time.time()
manifest['total_size_bytes'] = sum(e['size_bytes'] for e in manifest['entries'])

with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2)
"
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. SUMMARY: Report disk usage and status
# ─────────────────────────────────────────────────────────────────────────────

print_summary() {
  log ""
  log "=== LOG ROTATION SUMMARY ==="
  
  # Current logs size
  local current_size=0
  for logfile in "${LOG_FILES[@]}"; do
    [[ -f "$TRACK_DIR/$logfile" ]] && current_size=$((current_size + $(stat -f%z "$TRACK_DIR/$logfile" 2>/dev/null || echo 0)))
  done
  
  # Archive size
  local archive_size=0
  for archive in "$ARCHIVE_DIR"/*.log.gz; do
    [[ -f "$archive" ]] && archive_size=$((archive_size + $(stat -f%z "$archive" 2>/dev/null || echo 0)))
  done
  
  log "Current logs: ~$(( current_size / 1024 )) KB"
  log "Archive size: ~$(( archive_size / 1024 )) KB (compressed)"
  log "Archive entries: $(ls "$ARCHIVE_DIR"/*.log.gz 2>/dev/null | wc -l | awk '{print $1}')"
  
  # Estimate daily growth
  local daily_growth=$(python3 -c "
import json
try:
    with open('$ARCHIVE_MANIFEST') as f:
        m = json.load(f)
    if len(m['entries']) > 7:
        # Average of last 7 entries
        recent = m['entries'][:7]
        avg_size = sum(e['size_bytes'] for e in recent) / len(recent)
        print(f'{int(avg_size / 1024)} KB')
    else:
        print('unknown')
except:
    print('unknown')
" 2>/dev/null || echo "unknown")
  
  log "Est. daily growth: ~$daily_growth"
  
  # Projection
  if [[ "$daily_growth" != "unknown" ]]; then
    local daily_num=$(echo "$daily_growth" | sed 's/ KB//')
    if [[ -n "$daily_num" ]] && [[ "$daily_num" =~ ^[0-9]+$ ]]; then
      local projected_year=$((daily_num * 365 / 1024))
      log "Projected annual growth: ~${projected_year} MB"
    fi
  fi
  
  log "Retention: 90 days (auto-cleanup beyond this)"
  log ""
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

log "Starting log rotation cycle..."

# Process each log file
for logfile in "${LOG_FILES[@]}"; do
  rotate_old_logs "$logfile"
done

# Compress any uncompressed logs in archive
compress_archive_logs

# Clean up very old archives
cleanup_old_archives

# Print summary
print_summary

log "Log rotation cycle complete"
