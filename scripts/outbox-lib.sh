#!/bin/bash
# outbox-lib.sh — Shared library for quiet-hours outbox operations
#
# Functions:
#   is_quiet_hours          — Check if current time is in quiet hours (11 PM - 9 AM AST)
#   outbox_append           — Append message to outbox
#   outbox_dedup_check      — Check if message would duplicate within window
#   outbox_active_list      — List all non-expired items
#   outbox_mark_delivered   — Mark item as delivered
#   outbox_cleanup_expired  — Remove expired items and archive them
#   outbox_rotate_ledger    — Rotate messages.jsonl if too large

set -euo pipefail

OUTBOX_DIR="${OUTBOX_DIR:=${HOME}/.openclaw/workspace/outbox}"
OUTBOX_MESSAGES="${OUTBOX_MESSAGES:=${OUTBOX_DIR}/messages.jsonl}"
OUTBOX_ACTIVE="${OUTBOX_ACTIVE:=${OUTBOX_DIR}/active.json}"
OUTBOX_ARCHIVE="${OUTBOX_ARCHIVE:=${OUTBOX_DIR}/archive}"
OUTBOX_LOG="${OUTBOX_LOG:=${HOME}/.openclaw/workspace/tracking/outbox.log}"
OUTBOX_MAX_SIZE="${OUTBOX_MAX_SIZE:=$((10 * 1024 * 1024))}"  # 10 MB

mkdir -p "$OUTBOX_DIR" "$OUTBOX_ARCHIVE"
touch "$OUTBOX_LOG"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Quiet-Hours Detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

is_quiet_hours() {
  # Get current hour in AST/ADT (America/Moncton)
  local hour
  hour=$(TZ="America/Moncton" date +%H)
  
  # Quiet hours: 23:00 (11 PM) through 08:59 (8:59 AM) = don't ping Joe
  # Allowed: 09:00 (9 AM) through 22:59 (10:59 PM) = can ping directly
  if [[ $hour -ge 23 ]] || [[ $hour -lt 9 ]]; then
    return 0  # Quiet hours
  else
    return 1  # Awake hours
  fi
}

get_current_time_iso() {
  date -u +'%Y-%m-%dT%H:%M:%SZ'
}

get_current_time_epoch() {
  date +%s
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Logging
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$OUTBOX_LOG"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Generate Message ID
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

generate_msg_id() {
  local epoch=$(date +%s)
  local rand=$(head -c 4 /dev/urandom | xxd -p)
  echo "msg_${epoch}_${rand}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Append Function
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_append() {
  local type="update"
  local priority="normal"
  local title=""
  local message=""
  local source="manual"
  local goal_id=""
  local task_id=""
  local channel="command_center"
  local discord_target=""
  local dedup_key=""
  local dedup_window_hours=24
  local expires_in_hours=24

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --type) type="$2"; shift 2 ;;
      --priority) priority="$2"; shift 2 ;;
      --title) title="$2"; shift 2 ;;
      --message) message="$2"; shift 2 ;;
      --source) source="$2"; shift 2 ;;
      --goal-id) goal_id="$2"; shift 2 ;;
      --task-id) task_id="$2"; shift 2 ;;
      --channel) channel="$2"; shift 2 ;;
      --discord-target) discord_target="$2"; shift 2 ;;
      --dedup-key) dedup_key="$2"; shift 2 ;;
      --dedup-window-hours) dedup_window_hours="$2"; shift 2 ;;
      --expires-in-hours) expires_in_hours="$2"; shift 2 ;;
      *) echo "ERROR: Unknown argument $1" >&2; return 1 ;;
    esac
  done

  # Validation
  if [[ -z "$title" || -z "$message" ]]; then
    echo "ERROR: title and message are required" >&2
    outbox_log "APPEND_FAILED: missing title or message"
    return 1
  fi

  # Generate IDs
  local msg_id=$(generate_msg_id)
  local timestamp=$(get_current_time_iso)
  local epoch=$(get_current_time_epoch)
  
  # Default dedup key if not provided
  if [[ -z "$dedup_key" ]]; then
    dedup_key="${source}:$(echo "$title" | md5sum | awk '{print $1}' | cut -c1-8)"
  fi

  # Check for duplicates
  local is_dup=0
  if outbox_dedup_check "$dedup_key" "$dedup_window_hours"; then
    is_dup=1
    outbox_log "APPEND_DEDUP: key=$dedup_key already exists within ${dedup_window_hours}h window"
  fi

  # Calculate expiry
  local expires_epoch=$((epoch + expires_in_hours * 3600))
  local expires_at=$(date -u -d "@$expires_epoch" +'%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -j -f '%s' "$expires_epoch" +'%Y-%m-%dT%H:%M:%SZ')

  # Build JSON (safe escaping via python3)
  local json=$(python3 << EOFPYTHON
import json, sys, os
msg = {
    "id": "$msg_id",
    "timestamp": "$timestamp",
    "type": "$type",
    "priority": "$priority",
    "title": """$title""",
    "message": """$message""",
    "source": "$source",
    "goal_id": """$goal_id""" if "$goal_id" else None,
    "task_id": """$task_id""" if "$task_id" else None,
    "channel": "$channel",
    "discord_target": """$discord_target""" if "$discord_target" else None,
    "dedup_key": "$dedup_key",
    "is_duplicate": $is_dup,
    "expires_at": "$expires_at",
    "delivered": False,
    "delivered_at": None,
    "digest_batch": None
}
print(json.dumps(msg, ensure_ascii=True))
EOFPYTHON
  )

  if [[ $? -ne 0 ]]; then
    echo "ERROR: Failed to generate JSON for message" >&2
    outbox_log "APPEND_FAILED: json generation failed"
    return 1
  fi

  # Append to ledger (write-ahead log)
  echo "$json" >> "$OUTBOX_MESSAGES"

  # Update active.json
  outbox_reload_active

  outbox_log "APPEND_OK: id=$msg_id type=$type source=$source dedup=$is_dup"
  echo "$msg_id"
  return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Deduplication Check
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_dedup_check() {
  local dedup_key="$1"
  local window_hours="${2:-24}"
  local cutoff_epoch=$(($(get_current_time_epoch) - window_hours * 3600))

  # Check active.json first (faster)
  if [[ -f "$OUTBOX_ACTIVE" ]]; then
    python3 << EOFPYTHON
import json, sys
from datetime import datetime

try:
    with open("$OUTBOX_ACTIVE", 'r') as f:
        data = json.load(f)
    for item in data.get('items', []):
        if item['dedup_key'] == "$dedup_key":
            # Parse ISO timestamp
            ts_str = item.get('timestamp', '0')
            try:
                ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                epoch = int(ts.timestamp())
                if epoch > $cutoff_epoch:
                    sys.exit(0)  # Found recent match
            except:
                pass
except:
    pass
sys.exit(1)  # No match found
EOFPYTHON
    return $?
  fi
  return 1
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Reload Active Index from Ledger
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_reload_active() {
  local now=$(get_current_time_epoch)

  # Load ledger, filter non-expired, build active
  python3 << EOFPYTHON
import json, sys
from datetime import datetime

messages = []
active_items = []

try:
    with open("$OUTBOX_MESSAGES", 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                messages.append(msg)
            except:
                pass  # Skip malformed lines
except FileNotFoundError:
    pass

# Filter non-expired and not-delivered
from datetime import datetime
for msg in messages:
    # Skip already delivered items
    if msg.get('delivered', False):
        continue
    
    expires_at = msg.get('expires_at', '')
    try:
        if expires_at:
            ts = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            expires_epoch = int(ts.timestamp())
        else:
            expires_epoch = 0
        if expires_epoch > $now:
            active_items.append(msg)
    except:
        # If we can't parse expiry, keep the item
        active_items.append(msg)

# Sort by priority (critical first) then timestamp
priority_order = {'critical': 0, 'high': 1, 'normal': 2, 'low': 3}
active_items.sort(key=lambda x: (priority_order.get(x.get('priority', 'normal'), 99), x.get('timestamp', '')))

# Write active.json
output = {
    'count': len(active_items),
    'timestamp': '$(get_current_time_iso)',
    'items': active_items
}

with open("$OUTBOX_ACTIVE", 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=True)

print(f"Reloaded: {len(active_items)} active items")
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# List Active Items
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_active_list() {
  if [[ -f "$OUTBOX_ACTIVE" ]]; then
    cat "$OUTBOX_ACTIVE"
  else
    echo "{\"count\": 0, \"items\": []}"
  fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Mark Item as Delivered
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_mark_delivered() {
  local msg_id="$1"
  local digest_batch="${2:-}"

  python3 << EOFPYTHON
import json

messages = []
found = False

try:
    with open("$OUTBOX_MESSAGES", 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                if msg['id'] == "$msg_id":
                    msg['delivered'] = True
                    msg['delivered_at'] = '$(get_current_time_iso)'
                    if """$digest_batch""":
                        msg['digest_batch'] = """$digest_batch"""
                    found = True
                messages.append(msg)
            except:
                pass
except FileNotFoundError:
    pass

if found:
    with open("$OUTBOX_MESSAGES", 'w') as f:
        for msg in messages:
            f.write(json.dumps(msg, ensure_ascii=True) + '\n')
    print("Marked as delivered")
else:
    print("Message not found", file=__import__('sys').stderr)
    sys.exit(1)
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Cleanup Expired Items
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_cleanup_expired() {
  local now=$(get_current_time_epoch)
  local today=$(date +%Y-%m-%d)
  local archive_file="$OUTBOX_ARCHIVE/${today}.jsonl"

  python3 << EOFPYTHON
import json, os

active_items = []
expired_items = []

try:
    with open("$OUTBOX_MESSAGES", 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                expires_at = msg.get('expires_at', '')
                expires_epoch = int(expires_at[:10]) if expires_at and len(expires_at) > 10 else 0
                if expires_epoch > $now:
                    active_items.append(msg)
                else:
                    expired_items.append(msg)
            except:
                pass
except FileNotFoundError:
    pass

# Archive expired items
if expired_items:
    try:
        with open("$archive_file", 'a') as f:
            for msg in expired_items:
                f.write(json.dumps(msg, ensure_ascii=True) + '\n')
    except Exception as e:
        print(f"Archive failed: {e}", file=__import__('sys').stderr)

print(f"Cleaned up: {len(expired_items)} expired items")
EOFPYTHON

  outbox_log "CLEANUP_EXPIRED: $(($(wc -l < "$archive_file" 2>/dev/null || echo 0))) items archived to $archive_file"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Rotate Ledger if Too Large
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

outbox_rotate_ledger() {
  if [[ ! -f "$OUTBOX_MESSAGES" ]]; then
    return 0
  fi

  local size=$(stat -f%z "$OUTBOX_MESSAGES" 2>/dev/null || stat -c%s "$OUTBOX_MESSAGES" 2>/dev/null || echo 0)

  if [[ $size -gt $OUTBOX_MAX_SIZE ]]; then
    local today=$(date +%Y-%m-%d)
    local archive_file="$OUTBOX_ARCHIVE/${today}-ledger.jsonl"
    
    mv "$OUTBOX_MESSAGES" "$archive_file"
    touch "$OUTBOX_MESSAGES"
    outbox_log "ROTATE_LEDGER: Rotated to $archive_file (size was $size bytes)"
  fi
}

# Export functions for sourcing
export -f is_quiet_hours
export -f get_current_time_iso
export -f get_current_time_epoch
export -f outbox_log
export -f generate_msg_id
export -f outbox_append
export -f outbox_dedup_check
export -f outbox_reload_active
export -f outbox_active_list
export -f outbox_mark_delivered
export -f outbox_cleanup_expired
export -f outbox_rotate_ledger
