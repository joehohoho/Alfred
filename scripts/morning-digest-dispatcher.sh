#!/bin/bash
# morning-digest-dispatcher.sh
#
# Runs at 09:00 AST daily.
# Collects non-expired items from outbox, builds structured digest, delivers via Command Center + Discord.
#
# Usage:
#   bash scripts/morning-digest-dispatcher.sh [--force]
#
# --force : Run immediately instead of checking time (for testing)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
OUTBOX_DIR="$WORKSPACE/outbox"
OUTBOX_ACTIVE="$OUTBOX_DIR/active.json"
TRACKING_DIR="$WORKSPACE/tracking"
CONFIG_DIR="$WORKSPACE/config"
MEMORY_DIR="$WORKSPACE/memory"

mkdir -p "$OUTBOX_DIR" "$TRACKING_DIR"

# Source outbox library
source "$SCRIPT_DIR/outbox-lib.sh"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Constants
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIGEST_LOG="$TRACKING_DIR/digest-dispatch.log"
DISCORD_ALERTS_CHANNEL="1476571891043926036"  # alerts channel
COMMAND_CENTER_API="http://localhost:3001/api/notifications"

touch "$DIGEST_LOG"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Logging
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

digest_log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$DIGEST_LOG"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Digest Building
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

build_digest_message() {
  local active_json_path="$1"
  python3 << EOFPYTHON
import json
import sys
from datetime import datetime
from collections import defaultdict

try:
    with open("$active_json_path", 'r') as f:
        data = json.load(f)
    items = data.get('items', [])
except Exception as e:
    print("ERROR: " + str(e), file=sys.stderr)
    sys.exit(1)

if not items:
    print("NO_ITEMS")
    sys.exit(0)

# Group by priority
by_priority = defaultdict(list)
for item in items:
    priority = item.get('priority', 'normal')
    by_priority[priority].append(item)

# Build message
lines = []
lines.append("Morning Digest — " + datetime.now().strftime("%A, %B %d, %Y"))
lines.append("Total items: " + str(len(items)))
lines.append("")

# Count by priority
counts = {
    'critical': len(by_priority.get('critical', [])),
    'high': len(by_priority.get('high', [])),
    'normal': len(by_priority.get('normal', [])),
    'low': len(by_priority.get('low', []))
}

# Group by type within each priority
def format_items_by_type(priority_items):
    by_type = defaultdict(list)
    for item in priority_items:
        item_type = item.get('type', 'update')
        by_type[item_type].append(item)
    
    result = []
    for item_type in ['question', 'alert', 'update']:
        if item_type in by_type:
            result.append((item_type, by_type[item_type]))
    return result

# CRITICAL section
if counts['critical'] > 0:
    lines.append("=" * 70)
    lines.append("🔴 CRITICAL (" + str(counts['critical']) + " items)")
    lines.append("=" * 70)
    for item in by_priority['critical']:
        lines.append("")
        lines.append("• " + item['title'])
        if item.get('message'):
            msg = item['message'][:200]
            if len(item.get('message', '')) > 200:
                msg += "..."
            lines.append("  " + msg)
        if item.get('source'):
            lines.append("  [from: " + item['source'] + "]")
    lines.append("")

# HIGH section
if counts['high'] > 0:
    lines.append("=" * 70)
    lines.append("⚠️  HIGH (" + str(counts['high']) + " items)")
    lines.append("=" * 70)
    for item in by_priority['high']:
        lines.append("• " + item['title'])
    lines.append("")

# NORMAL section (by type)
if counts['normal'] > 0:
    lines.append("=" * 70)
    lines.append("📋 NORMAL (" + str(counts['normal']) + " items)")
    lines.append("=" * 70)
    
    by_type_items = format_items_by_type(by_priority['normal'])
    for item_type, items_of_type in by_type_items:
        lines.append("")
        lines.append(item_type.capitalize() + "s (" + str(len(items_of_type)) + "):")
        for item in items_of_type:
            lines.append("  • " + item['title'])
    lines.append("")

# LOW section (footer)
if counts['low'] > 0:
    lines.append("… and " + str(counts['low']) + " lower-priority items")
    lines.append("")

# Footer
lines.append("=" * 70)
lines.append("Digest prepared: " + datetime.now().isoformat())
lines.append("View full details: Command Center Dashboard")

print("\n".join(lines))
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Discord Post
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

post_to_discord() {
  local critical_count="$1"
  local high_count="$2"
  local items_json="$3"

  if [[ $critical_count -eq 0 && $high_count -eq 0 ]]; then
    return 0  # Skip Discord post if no critical/high items
  fi

  python3 << EOFPYTHON
import json
import sys

items_data = json.loads("""$items_json""")
items = items_data.get('items', [])

# Filter to critical + high only
filtered = [i for i in items if i['priority'] in ('critical', 'high')]

if not filtered:
    sys.exit(0)

# Build Discord message
lines = []
lines.append("🔴 **Morning Digest Alert**")
lines.append("")

critical = [i for i in filtered if i['priority'] == 'critical']
high = [i for i in filtered if i['priority'] == 'high']

if critical:
    lines.append(f"**Critical ({len(critical)})**:")
    for i, item in enumerate(critical, 1):
        lines.append(f"{i}. {item['title']}")
    lines.append("")

if high:
    lines.append(f"**High Priority ({len(high)})**:")
    for i, item in enumerate(high, 1):
        lines.append(f"{i}. {item['title']}")
    lines.append("")

lines.append("See Command Center for full digest.")

message = "\n".join(lines)

# Post to Discord via message tool
print(json.dumps({"discord_message": message}))
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Command Center Notification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

post_to_command_center() {
  local digest_title="$1"
  local digest_message="$2"
  local digest_batch_id="$3"

  python3 << EOFPYTHON
import json
import sys
import subprocess

notification = {
    "type": "update",
    "title": """$digest_title""",
    "message": """$digest_message""",
    "source": "morning-digest"
}

# POST to Command Center API
response = subprocess.run(
    ['curl', '-s', '-w', '\\n%{http_code}', '-X', 'POST',
     'http://localhost:3001/api/notifications',
     '-H', 'Content-Type: application/json',
     '-d', json.dumps(notification)],
    capture_output=True,
    text=True
)

lines = response.stdout.split('\n')
http_code = lines[-1].strip() if lines[-1].strip() else '000'
body = '\n'.join(lines[:-1])

if http_code.startswith('20'):
    try:
        result = json.loads(body)
        print(f"NOTIF_ID:{result.get('id', 'unknown')}")
    except:
        print(f"NOTIF_ID:unknown")
else:
    print(f"ERROR: HTTP {http_code}")
    sys.exit(1)
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Mark Delivered
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

mark_all_delivered() {
  local digest_batch_id="$1"
  local items_json="$2"

  python3 << EOFPYTHON
import json
from datetime import datetime

try:
    items_data = json.loads("""$items_json""")
    items = items_data.get('items', [])
    
    # Get IDs to mark delivered
    ids_to_mark = set(item['id'] for item in items)
    
    # Re-read and update messages ledger
    messages = []
    try:
        with open("$OUTBOX_DIR/messages.jsonl", 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        msg = json.loads(line)
                        messages.append(msg)
                    except:
                        pass
    except FileNotFoundError:
        pass
    
    # Mark items as delivered
    delivered_count = 0
    for msg in messages:
        if msg['id'] in ids_to_mark:
            msg['delivered'] = True
            msg['delivered_at'] = datetime.utcnow().isoformat() + 'Z'
            msg['digest_batch'] = """$digest_batch_id"""
            delivered_count += 1
    
    # Write back ledger
    with open("$OUTBOX_DIR/messages.jsonl", 'w') as f:
        for msg in messages:
            f.write(json.dumps(msg, ensure_ascii=True) + '\\n')
    
    print("Marked " + str(delivered_count) + " items as delivered")
except Exception as e:
    import sys
    print("Error marking delivered: " + str(e), file=sys.stderr)
EOFPYTHON
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Execution
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
  local force_run="${1:---force}"

  digest_log "START"

  # Check if we should run (only at 09:00 unless --force)
  if [[ "$force_run" != "--force" ]]; then
    local hour=$(date +%H)
    if [[ "$hour" != "09" ]]; then
      digest_log "SKIP: Not 09:00 AST (current hour: $hour)"
      return 0
    fi
  fi

  # Reload active items from ledger
  outbox_reload_active
  
  # Check if anything to deliver
  if [[ ! -f "$OUTBOX_ACTIVE" ]]; then
    digest_log "NO_ITEMS: No active outbox file"
    return 0
  fi

  local item_count=$(python3 -c "import json; data=json.load(open('$OUTBOX_ACTIVE')); print(data.get('count', 0))" 2>/dev/null || echo 0)
  
  if [[ $item_count -eq 0 ]]; then
    digest_log "NO_ITEMS: Outbox is empty"
    return 0
  fi

  digest_log "PROCESSING: $item_count items"

  # Generate digest message
  local digest_message=$(build_digest_message "$OUTBOX_ACTIVE")
  
  if [[ "$digest_message" == "NO_ITEMS" ]]; then
    digest_log "NO_ITEMS: Digest building returned NO_ITEMS"
    return 0
  fi

  # Extract counts for Discord
  local critical_count=$(python3 -c "import json; data=json.load(open('$OUTBOX_ACTIVE')); print(len([i for i in data['items'] if i['priority']=='critical']))" 2>/dev/null || echo 0)
  local high_count=$(python3 -c "import json; data=json.load(open('$OUTBOX_ACTIVE')); print(len([i for i in data['items'] if i['priority']=='high']))" 2>/dev/null || echo 0)

  # Build digest batch ID
  local digest_batch_id="digest_$(date +%s)_$(head -c 4 /dev/urandom | xxd -p)"

  # Post to Command Center
  digest_log "POSTING to Command Center"
  local cc_response=$(post_to_command_center "Morning Digest — $(date '+%A, %B %d')" "$digest_message" "$digest_batch_id")
  
  if [[ "$cc_response" == *"ERROR"* ]]; then
    digest_log "FAILED: $cc_response"
    return 1
  fi

  # Extract notification ID
  local notif_id=$(echo "$cc_response" | grep "NOTIF_ID:" | cut -d: -f2)
  digest_log "POSTED to Command Center: notif_id=$notif_id"

  # Post to Discord if critical/high items
  if [[ $((critical_count + high_count)) -gt 0 ]]; then
    digest_log "POSTING to Discord (alerts): $critical_count critical, $high_count high"
    
    # Read active.json to pass to post_to_discord
    local active_json=$(cat "$OUTBOX_ACTIVE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)))")
    post_to_discord "$critical_count" "$high_count" "$active_json"
  fi

  # Mark all items as delivered
  digest_log "MARKING items as delivered"
  local active_json=$(cat "$OUTBOX_ACTIVE" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin)))")
  mark_all_delivered "$digest_batch_id" "$active_json"

  # Reload active items (will skip delivered items)
  outbox_reload_active

  # Cleanup expired items
  outbox_cleanup_expired

  # Rotate ledger if needed
  outbox_rotate_ledger

  digest_log "COMPLETE: batch_id=$digest_batch_id items=$item_count critical=$critical_count high=$high_count"
  
  return 0
}

main "$@"
