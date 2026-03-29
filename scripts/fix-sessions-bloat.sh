#!/bin/bash

# Fix: Sessions bloat cleanup
# Problem: ~/.openclaw/agents/main/sessions/sessions.json has grown to 352KB
# Root cause: JSONL file accumulates all session entries without pruning old ones
# Solution: Archive old entries (>30 days) and keep recent sessions only

SESSION_FILE="$HOME/.openclaw/agents/main/sessions/sessions.json"
ARCHIVE_DIR="$HOME/.openclaw/agents/main/sessions/archive"
CURRENT_TIME=$(date +%s)
THIRTY_DAYS_AGO=$((CURRENT_TIME - 2592000))  # 30 days in seconds

echo "[$(date)] Starting sessions bloat fix..."
echo "Input file: $SESSION_FILE"
echo "Size before: $(du -h "$SESSION_FILE" | cut -f1)"

# Create archive directory if needed
mkdir -p "$ARCHIVE_DIR"

# Backup original
cp "$SESSION_FILE" "$ARCHIVE_DIR/sessions-backup-$(date +%s).json"
echo "Backup created: sessions-backup-*.json"

# Process the JSONL file: keep recent (<30 days), archive old (>30 days)
if [ -f "$SESSION_FILE" ]; then
  # Create temp files
  RECENT=$(mktemp)
  ARCHIVED=$(mktemp)
  
  while IFS= read -r line; do
    if [ -z "$line" ]; then
      continue  # Skip empty lines
    fi
    
    # Parse the line as JSON and extract timestamp if available
    timestamp=$(echo "$line" | jq -r '.updatedAt // .createdAt // .timestamp // "0"' 2>/dev/null)
    
    # Convert ISO timestamp to unix time if present
    if [[ "$timestamp" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2} ]]; then
      entry_time=$(date -jf "%Y-%m-%dT%H:%M:%S" "${timestamp:0:19}" "+%s" 2>/dev/null || echo 0)
    else
      entry_time=0
    fi
    
    # Keep recent entries, archive old ones
    if [ "$entry_time" -gt "$THIRTY_DAYS_AGO" ] || [ "$entry_time" -eq 0 ]; then
      echo "$line" >> "$RECENT"
    else
      echo "$line" >> "$ARCHIVED"
    fi
  done < "$SESSION_FILE"
  
  # Replace sessions file with recent entries only
  mv "$RECENT" "$SESSION_FILE"
  
  # Gzip archive for storage
  if [ -s "$ARCHIVED" ]; then
    gzip -c "$ARCHIVED" > "$ARCHIVE_DIR/sessions-archive-$(date +%Y-%m-%d).jsonl.gz"
    echo "Archived $(wc -l < "$ARCHIVED") old entries to: sessions-archive-*.jsonl.gz"
  fi
  
  rm -f "$ARCHIVED"
  
  echo "Size after: $(du -h "$SESSION_FILE" | cut -f1)"
  echo "[$(date)] Sessions bloat fix complete"
else
  echo "ERROR: Session file not found at $SESSION_FILE"
  exit 1
fi
