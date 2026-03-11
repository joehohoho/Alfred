#!/bin/bash
# queue-status-tracker.sh
# Unified queue status tracking (B4)
# Monitors Alfred queue for stale tasks and provides unified status view

set -euo pipefail

TRACK_DIR="${1:-.hal-alfred-tracking}"
QUEUE_DIR="${2:-.alfred-queue}"
QUEUE_STATUS_FILE="$TRACK_DIR/queue-status.json"

mkdir -p "$TRACK_DIR"

python3 << 'PYEOF'
import json
from pathlib import Path
import time
import sys

queue_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".alfred-queue")
queue_status_file = Path(sys.argv[2] if len(sys.argv) > 2 else ".hal-alfred-tracking/queue-status.json")

queue_status = {
  "timestamp": time.time(),
  "queued_tasks": 0,
  "stale_tasks": 0,
  "tasks": {}
}

now = time.time()
queue_timeout = 21600  # 6 hours

# Scan Alfred queue
for queue_file in queue_dir.glob("task-*.json"):
  try:
    task = json.loads(queue_file.read_text())
    card_id = task.get("card_id", "unknown")
    queued_at = task.get("queued_at", 0)
    age_seconds = now - queued_at
    is_stale = age_seconds > queue_timeout
    
    queue_status["tasks"][card_id] = {
      "queued_at": queued_at,
      "age_seconds": int(age_seconds),
      "is_stale": is_stale,
      "priority": task.get("priority", "normal")
    }
    
    queue_status["queued_tasks"] += 1
    if is_stale:
      queue_status["stale_tasks"] += 1
  except:
    pass

# Write status
queue_status_file.write_text(json.dumps(queue_status, indent=2))

# Print summary
print(f"Queue Status: {queue_status['queued_tasks']} queued, {queue_status['stale_tasks']} stale")
PYEOF
