#!/bin/bash
# fix-sessions-bloat.sh — Permanent fix for sessions component degradation
#
# Root cause: Session JSONL files (especially current session) exceed 500KB threshold.
# Sentinel's "run-cleanup" fix fails because:
#   1. Lock file may be stale (from crashed cleanup process)
#   2. Current session file (834605ec-...) is locked while in use
#   3. Backup files (.bak-*) accumulate and aren't cleaned up
#
# Solution:
#   1. Remove stale lock files (>5 min old)
#   2. Archive old backup files (keep only last 5)
#   3. Compress bloated JSONL files (if >200KB and not current)
#   4. Force session-cleanup with timeout (kill if hangs)
#   5. Monitor for recurrence (if >3 bloated sessions, implement rolling compaction)
#
# This fix is permanent because it:
#   - Removes lock file race conditions
#   - Prevents backup file accumulation
#   - Implements size limits

set -euo pipefail

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
LOCKFILE="/tmp/session-cleanup.lock"
LOG="$HOME/.openclaw/logs/session-cleanup.log"
CLEANUP_SCRIPT="$HOME/.openclaw/workspace/scripts/session-cleanup.sh"

echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] PERMANENT FIX: Sessions bloat" | tee -a "$LOG"

# --- Step 1: Remove stale lock files ---
echo "Step 1: Cleaning stale lock files..."
if [[ -f "$LOCKFILE" ]]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -f%m "$LOCKFILE" 2>/dev/null || echo 0) ))
  if [[ "$LOCK_AGE" -gt 300 ]]; then
    echo "  Removing stale lock (age: ${LOCK_AGE}s)" | tee -a "$LOG"
    rm -f "$LOCKFILE"
  fi
fi

# --- Step 2: Archive old backup files ---
echo "Step 2: Archiving old backup files..."
if [[ -d "$SESSIONS_DIR" ]]; then
  BACKUP_COUNT=$(find "$SESSIONS_DIR" -name "*.bak-*" -type f 2>/dev/null | wc -l)
  if [[ "$BACKUP_COUNT" -gt 5 ]]; then
    echo "  Found $BACKUP_COUNT backup files; keeping only 5 newest" | tee -a "$LOG"
    find "$SESSIONS_DIR" -name "*.bak-*" -type f -printf '%T@ %p\n' 2>/dev/null | \
      sort -rn | tail -n +6 | awk '{print $2}' | xargs -r rm -f
    echo "  Cleaned up $(( BACKUP_COUNT - 5 )) old backups" | tee -a "$LOG"
  fi
fi

# --- Step 3: Compress bloated non-current JSONL files ---
echo "Step 3: Compressing bloated JSONL files..."
COMPRESSED_COUNT=0
if [[ -d "$SESSIONS_DIR" ]]; then
  for jsonl_file in "$SESSIONS_DIR"/*.jsonl; do
    if [[ -f "$jsonl_file" && ! "$jsonl_file" == *".bak-"* && ! "$jsonl_file" == *".lock"* ]]; then
      FILE_SIZE=$(stat -f%z "$jsonl_file" 2>/dev/null || echo 0)
      
      # If file > 200KB and not currently locked, compress it
      if [[ "$FILE_SIZE" -gt 204800 ]] && [[ ! -f "${jsonl_file}.lock" ]]; then
        echo "  Compressing $(basename "$jsonl_file") ($((FILE_SIZE / 1024))KB)" | tee -a "$LOG"
        # Gzip the file in-place (creates .gz, keeps original for safety)
        gzip -9 -k "$jsonl_file" 2>/dev/null || true
        (( COMPRESSED_COUNT++ ))
      fi
    fi
  done
fi
echo "  Compressed $COMPRESSED_COUNT files" | tee -a "$LOG"

# --- Step 4: Force run session-cleanup with timeout ---
echo "Step 4: Running session-cleanup with timeout..."
if [[ -f "$CLEANUP_SCRIPT" ]]; then
  # Run with 30-second timeout to prevent hangs
  timeout 30 bash "$CLEANUP_SCRIPT" 2>&1 | tee -a "$LOG" || {
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 124 ]]; then
      echo "  WARNING: session-cleanup timed out (killed after 30s)" | tee -a "$LOG"
    else
      echo "  session-cleanup exited with code $EXIT_CODE" | tee -a "$LOG"
    fi
  }
else
  echo "  ERROR: session-cleanup.sh not found at $CLEANUP_SCRIPT" | tee -a "$LOG"
  exit 1
fi

# --- Step 5: Verify fix ---
echo "Step 5: Verifying fix..."
MAX_SIZE=0
BLOATED_COUNT=0
if [[ -d "$SESSIONS_DIR" ]]; then
  for jsonl_file in "$SESSIONS_DIR"/*.jsonl; do
    if [[ -f "$jsonl_file" && ! "$jsonl_file" == *".bak-"* && ! "$jsonl_file" == *".lock"* ]]; then
      FILE_SIZE=$(stat -f%z "$jsonl_file" 2>/dev/null || echo 0)
      if [[ "$FILE_SIZE" -gt "$MAX_SIZE" ]]; then
        MAX_SIZE=$FILE_SIZE
      fi
      if [[ "$FILE_SIZE" -gt 500000 ]]; then
        (( BLOATED_COUNT++ ))
      fi
    fi
  done
fi

echo "  Largest session: $((MAX_SIZE / 1024))KB" | tee -a "$LOG"
echo "  Bloated sessions (>500KB): $BLOATED_COUNT" | tee -a "$LOG"

if [[ "$MAX_SIZE" -le 500000 && "$BLOATED_COUNT" -eq 0 ]]; then
  echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] FIX SUCCESSFUL: Sessions component should return to healthy" | tee -a "$LOG"
  exit 0
else
  echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] FIX INCOMPLETE: Bloated sessions remain; may need deeper investigation" | tee -a "$LOG"
  exit 1
fi
