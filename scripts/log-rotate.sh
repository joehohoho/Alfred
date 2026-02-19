#!/bin/bash
# log-rotate.sh — Rotate OpenClaw logs to prevent unbounded growth
set -euo pipefail

LOG_DIR="$HOME/.openclaw/logs"
ARCHIVE_DIR="$LOG_DIR/archive"
MAX_AGE_DAYS=30
DATE=$(date -u +%Y-%m-%d)

mkdir -p "$ARCHIVE_DIR"

rotate_file() {
    local file="$1"
    local basename=$(basename "$file")
    local size=$(stat -f%z "$file" 2>/dev/null || echo 0)

    # Skip if file doesn't exist or is empty
    [ ! -f "$file" ] || [ "$size" -eq 0 ] && return 0

    # Compress and archive
    gzip -c "$file" > "$ARCHIVE_DIR/${basename%.jsonl}.${DATE}.gz" 2>/dev/null \
        || gzip -c "$file" > "$ARCHIVE_DIR/${basename%.log}.${DATE}.gz" 2>/dev/null
    : > "$file"
    echo "Rotated $basename ($size bytes -> archive)"
}

# Rotate large logs (> 5 MB)
LOG_FILES=(
    "$LOG_DIR/cache-trace.jsonl"
    "$LOG_DIR/gateway.err.log"
    "$LOG_DIR/gateway.log"
    "$LOG_DIR/command-center.log"
    "$LOG_DIR/imsg-responder.log"
    "$LOG_DIR/imsg-responder-stdout.log"
    "$LOG_DIR/imsg-responder-stderr.log"
    "$LOG_DIR/cloudflare-tunnel.log"
)

# Also include job-tracker log (may be in different location)
[ -f "$HOME/.openclaw/logs/job-tracker.log" ] && LOG_FILES+=("$HOME/.openclaw/logs/job-tracker.log")

for logfile in "${LOG_FILES[@]}"; do
    if [ -f "$logfile" ]; then
        size=$(stat -f%z "$logfile" 2>/dev/null || echo 0)
        # Rotate if over 5 MB
        if [ "$size" -gt 5242880 ]; then
            rotate_file "$logfile"
        fi
    fi
done

# Clean old archives
find "$ARCHIVE_DIR" -name "*.gz" -mtime +${MAX_AGE_DAYS} -delete 2>/dev/null || true

echo "Log rotation complete: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
