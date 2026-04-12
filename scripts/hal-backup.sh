#!/bin/bash
#
# hal-backup.sh — Periodic backup of HAL state/session snapshots
#
# This script captures HAL's current state (session files, logs, tracking data)
# and archives them for recovery/analysis purposes.
#
# Runs as a cron job to ensure HAL state is regularly backed up.
#

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
HAL_TRACKING="${WORKSPACE}/.hal-alfred-tracking"
BACKUP_DIR="${HOME}/.hal-alfred-backups"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_NAME="hal-state-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

mkdir -p "$BACKUP_DIR"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting HAL state backup..."

# Create backup directory
mkdir -p "$BACKUP_PATH"

# Backup HAL tracking directory if it exists
if [[ -d "$HAL_TRACKING" ]]; then
  cp -r "$HAL_TRACKING" "$BACKUP_PATH/tracking" 2>/dev/null || true
  log "✓ Backed up: HAL tracking data"
fi

# Backup recent session logs if they exist
if [[ -d "${HOME}/.openclaw/logs" ]]; then
  mkdir -p "$BACKUP_PATH/logs"
  # Get last 7 days of logs
  find "${HOME}/.openclaw/logs" -name "*.log" -mtime -7 -exec cp {} "$BACKUP_PATH/logs/" \; 2>/dev/null || true
  log "✓ Backed up: Recent logs (last 7 days)"
fi

# Create metadata file
cat > "$BACKUP_PATH/metadata.json" <<EOF
{
  "backupTime": "$(date -u +%s)000",
  "timestamp": "$(date '+%Y-%m-%d %H:%M:%S') AST",
  "purpose": "HAL state snapshot for recovery",
  "contents": ["tracking", "logs", "metadata.json"]
}
EOF

log "✓ Backup complete: $BACKUP_PATH"

# Cleanup old backups (keep last 7)
log "Cleaning up old backups..."
ls -dt "${BACKUP_DIR}"/hal-state-* 2>/dev/null | tail -n +8 | while read -r old_backup; do
  rm -rf "$old_backup"
  log "  Removed: $(basename "$old_backup")"
done

log "✓ HAL state backup complete"
exit 0
