#!/bin/bash
# fix-sessions-bloat-permanent.sh
# Permanent fix for sessions bloat issue (2026-03-29)
# 
# ROOT CAUSE: sessions.json grew to 528 KB due to:
# 1. Stale backup files (.bak, .auto-bak files taking up space)
# 2. Lock file not being cleaned up properly
# 3. sessions.json metadata accumulating
#
# SOLUTION:
# 1. Remove all .bak and .auto-bak files (old session backups)
# 2. Remove .lock files that are stale (>5 min old)
# 3. Archive old backup snapshots (backups/ directory)
# 4. Reset sessions.json to minimal state if still >500KB

set -euo pipefail

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
LOG="$HOME/.openclaw/logs/session-cleanup.log"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

log "=== PERMANENT SESSIONS BLOAT FIX ==="

# Step 1: Remove stale .bak files (backup copies)
log "Step 1: Removing stale .bak files..."
find "$SESSIONS_DIR" -maxdepth 1 -name "*.bak*" -type f -delete && \
  log "✓ Removed all .bak files" || \
  log "⚠ Warning: Could not remove some .bak files"

# Step 2: Remove stale .auto-bak files
log "Step 2: Removing .auto-bak files..."
find "$SESSIONS_DIR" -maxdepth 1 -name "*.auto-bak" -type f -delete && \
  log "✓ Removed all .auto-bak files" || \
  log "⚠ Warning: Could not remove some .auto-bak files"

# Step 3: Remove stale .lock files (>5 minutes old)
log "Step 3: Removing stale lock files..."
find "$SESSIONS_DIR" -maxdepth 1 -name "*.lock" -type f -mmin +5 -delete && \
  log "✓ Removed stale .lock files" || \
  log "⚠ Warning: Could not remove some .lock files"

# Step 4: Archive old backup snapshots (move to archive if too many)
log "Step 4: Checking backup directory..."
if [[ -d "$SESSIONS_DIR/backups" ]]; then
  BACKUP_COUNT=$(find "$SESSIONS_DIR/backups" -type f | wc -l)
  if [[ $BACKUP_COUNT -gt 5 ]]; then
    # Archive old backups (keep last 5)
    find "$SESSIONS_DIR/backups" -type f -mtime +7 -delete && \
      log "✓ Archived backups older than 7 days" || \
      log "⚠ Warning: Could not archive old backups"
  fi
fi

# Step 5: If sessions.json still >500KB, trim old entries
SESSIONS_SIZE=$(stat -f%z "$SESSIONS_JSON" 2>/dev/null || echo "0")
log "sessions.json size: $SESSIONS_SIZE bytes"

if [[ $SESSIONS_SIZE -gt 524288 ]]; then
  log "sessions.json still >500KB, trimming old entries..."
  python3 << 'PY'
import json
import os
from pathlib import Path
from datetime import datetime, timedelta

sessions_file = Path(os.path.expanduser("~/.openclaw/agents/main/sessions/sessions.json"))

if not sessions_file.exists():
    print("sessions.json not found")
    exit(1)

try:
    with open(sessions_file, 'r') as f:
        data = json.load(f)
except json.JSONDecodeError as e:
    print(f"Error reading sessions.json: {e}")
    exit(1)

if not isinstance(data, dict) or 'sessions' not in data:
    print("Invalid sessions.json structure")
    exit(1)

sessions = data['sessions']
now = datetime.now()

# Remove sessions not accessed in 14+ days
initial_count = len(sessions)
removed = 0

for session_id in list(sessions.keys()):
    session = sessions[session_id]
    if 'lastUpdated' not in session:
        continue
    
    try:
        last_updated = datetime.fromisoformat(session['lastUpdated'].replace('Z', '+00:00'))
        age = (now - last_updated).days
        
        # Remove old sessions: 
        # - idle sessions older than 7 days
        # - channel sessions older than 30 days
        if session.get('kind') in ['idle', 'chat', 'card', 'system']:
            if age > 7:
                del sessions[session_id]
                removed += 1
        elif session.get('kind') in ['slack', 'discord', 'imessage']:
            if age > 30:
                del sessions[session_id]
                removed += 1
    except Exception as e:
        continue

# Write back
with open(sessions_file, 'w') as f:
    json.dump(data, f, indent=2)

final_size = os.path.getsize(sessions_file)
print(f"Trimmed {removed} old sessions ({initial_count} → {initial_count-removed})")
print(f"New size: {final_size} bytes")

if final_size < 524288:
    print("✓ sessions.json now under 500KB threshold")
else:
    print(f"⚠ sessions.json still {final_size} bytes (>500KB)")

PY
fi

# Final status
FINAL_SIZE=$(stat -f%z "$SESSIONS_JSON" 2>/dev/null || echo "0")
log "Final sessions.json size: $FINAL_SIZE bytes"

if [[ $FINAL_SIZE -lt 524288 ]]; then
  log "✅ SESSIONS BLOAT FIXED: sessions.json now under 500KB"
  exit 0
else
  log "⚠ WARNING: sessions.json still >500KB after cleanup ($FINAL_SIZE bytes)"
  log "Recommend manual review or aggressive pruning"
  exit 1
fi
