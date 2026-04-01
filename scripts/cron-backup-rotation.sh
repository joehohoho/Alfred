#!/bin/sh
# Cron Backup Rotation — Archive old cron job backups to prevent bloat
# Run: bash scripts/cron-backup-rotation.sh

set -e

CRON_DIR="$HOME/.openclaw/cron"
ARCHIVE_DIR="$CRON_DIR/backups-archive"
KEEP_COUNT=3

if [ ! -d "$CRON_DIR" ]; then
  echo "Error: cron directory not found at $CRON_DIR"
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"
echo "[cron-backup-rotation] Starting cleanup in $CRON_DIR..."

# Count .bak files
BACKUP_COUNT=$(ls -1 "$CRON_DIR"/jobs.json.bak* 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -le $KEEP_COUNT ]; then
  echo "[cron-backup-rotation] Found $BACKUP_COUNT backups (keep: $KEEP_COUNT). No rotation needed."
  exit 0
fi

echo "[cron-backup-rotation] Found $BACKUP_COUNT backups. Archiving oldest..."

# Get all .bak files sorted by modification time (oldest first)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_FILE="$ARCHIVE_DIR/jobs-backups-$TIMESTAMP.tar.gz"
ARCHIVED=0

# Keep newest KEEP_COUNT files; move older ones to archive
ls -1t "$CRON_DIR"/jobs.json.bak* 2>/dev/null | tail -n +$((KEEP_COUNT + 1)) | while read -r file; do
  tar -czf "$ARCHIVE_FILE" -C "$CRON_DIR" "$(basename "$file")" 2>/dev/null || true
  rm -f "$file"
  echo "[cron-backup-rotation] Archived: $(basename "$file")"
done

# Clean up archive files older than 30 days
find "$ARCHIVE_DIR" -name "*.tar.gz" -type f -mtime +30 -exec rm -f {} \; 2>/dev/null || true

NEW_SIZE=$(du -sh "$CRON_DIR" | awk '{print $1}')
echo "[cron-backup-rotation] Done. Cron dir: $NEW_SIZE (keeping $KEEP_COUNT newest backups)"
