#!/bin/bash
# backup-weekly.sh — Weekly backup automation for OpenClaw state
# Called by: LaunchAgent com.alfred.backup-weekly (Sundays 2 AM)
# Purpose: Archive config + workspace, verify integrity, maintain 4-week rotation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
BACKUP_DIR="$WORKSPACE/.backups"
LOG_FILE="$BACKUP_DIR/backup.log"

mkdir -p "$BACKUP_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

log "Starting weekly backup..."

# Create timestamped backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/openclaw-backup_$BACKUP_DATE.tar.gz"

# Run backup
if openclaw backup create \
  --output "$BACKUP_PATH" \
  --verify \
  --json 2>&1 | tee -a "$LOG_FILE"; then
  
  SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
  log "✅ Backup created: $BACKUP_PATH ($SIZE)"
  
  # Cleanup old backups (keep 4 weeks = ~4 backups)
  log "Cleaning up old backups (keeping 4 most recent)..."
  ls -t "$BACKUP_DIR"/openclaw-backup_*.tar.gz 2>/dev/null | tail -n +5 | xargs -r rm -v | tee -a "$LOG_FILE"
  
else
  log "❌ Backup failed!"
  exit 1
fi

log "Backup complete"
