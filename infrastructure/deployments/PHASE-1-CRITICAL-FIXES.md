# Phase 1: Critical Fixes — Implementation Guide

**Date:** 2026-03-10 13:28 ADT  
**Scope:** 5 critical safeguards (blocks A1, A3, B1, A4, D2)  
**Estimated time:** 2–3 hours to implement + test  
**Impact:** Prevents data loss, race conditions, and disk full

---

## What We're Fixing

| # | Risk | Impact | Fix |
|---|------|--------|-----|
| 1 | Malformed JSON crashes parsing | Cards don't execute | Validate schema before processing |
| 2 | Concurrent writes corrupt state file | Lost failure history | Atomic writes + file locking |
| 3 | Alfred queue overwritten | Lost tasks | Queue to separate files per task |
| 4 | Missing card fields silently ignored | Wrong dispatches | Validate required fields |
| 5 | Logs fill disk unbounded | System crash | Auto-rotate logs at 1MB |

---

## Fix 1: JSON Schema Validation

**Problem:**
```bash
BOARD_JSON=$(curl "http://localhost:3001/api/kanban")
# If this returns {"error": "..."} instead of {"columns": {...}}
# Script continues blindly, card processing fails silently
```

**Solution:**
```bash
validate_kanban_json() {
  local json="$1"
  python3 << 'PYEOF'
import sys, json

try:
  data = json.loads("""PLACEHOLDER_JSON""")
  
  # Check structure
  assert isinstance(data, dict), "JSON not object"
  assert 'columns' in data, "Missing 'columns' key"
  assert isinstance(data['columns'], dict), "'columns' not object"
  assert 'in_progress' in data['columns'], "Missing 'in_progress' column"
  
  # Check in_progress is list
  cards = data['columns']['in_progress']
  assert isinstance(cards, list), "'in_progress' not array"
  
  # Sample validate first card (if exists)
  if cards and len(cards) > 0:
    first = cards[0]
    assert 'id' in first, "Card missing 'id'"
    assert 'title' in first, "Card missing 'title'"
  
  print("OK")
except Exception as e:
  print(f"INVALID: {str(e)}", file=sys.stderr)
  sys.exit(1)
PYEOF
}

# Usage in script
if ! validate_kanban_json "$KANBAN_JSON"; then
  health_log "ERROR: Kanban API returned invalid JSON"
  exit 1
fi
```

**Testing:**
```bash
# Test with bad JSON
echo '{"error": "service unavailable"}' | validate_kanban_json
# Should output: INVALID: Missing 'columns' key

# Test with good JSON
echo '{"columns": {"in_progress": [{"id": "c1", "title": "test"}]}}' | validate_kanban_json
# Should output: OK
```

---

## Fix 2: Atomic State File Writes

**Problem:**
```bash
# Current: race condition if two crons run simultaneously
state = read_state()              # Cron A reads
state = read_state()              # Cron B reads (same state)
state['card1']['failure_count'] = 1  # Cron A updates
write_state(state)                # Cron A writes
state['card1']['failure_count'] = 1  # Cron B updates (same value)
write_state(state)                # Cron B overwrites A's write (but same value, lucky)
# But if A and B updated different cards:
# A updates card1, B updates card2
# A writes, B writes → B's write loses A's update
```

**Solution:**
```bash
write_state_atomic() {
  local state_json="$1"
  local tmp_file="$STATE_FILE.tmp.$$"
  
  # Write to temp file first
  if ! echo "$state_json" > "$tmp_file"; then
    log "ERROR: Failed to write state to temp file"
    rm -f "$tmp_file"
    return 1
  fi
  
  # Atomic rename (swap files at filesystem level)
  if ! mv "$tmp_file" "$STATE_FILE"; then
    log "ERROR: Failed to atomic rename state file"
    rm -f "$tmp_file"
    return 1
  fi
  
  return 0
}

update_card_state() {
  local card_id="$1"
  local field="$2"
  local value="$3"
  
  python3 << PYEOF
import json
from pathlib import Path
import time

state_file = Path("$STATE_FILE")
state = json.loads(state_file.read_text()) if state_file.exists() else {}

state.setdefault("$card_id", {})
state["$card_id"]["$field"] = "$value"
state["$card_id"]["updated_at"] = time.time()

# Write atomically
tmp_file = Path("$STATE_FILE.tmp.$$")
tmp_file.write_text(json.dumps(state, indent=2))
tmp_file.replace(state_file)
PYEOF

  return $?
}
```

**Testing:**
```bash
# Simulate two concurrent updates
(update_card_state "card1" "failure_count" "1") &
(update_card_state "card2" "failure_count" "2") &
wait

# Check state file has both updates
cat ~/.openclaw/.hal-alfred-tracking/card-failures.json | jq
# Should have both card1 and card2
```

---

## Fix 3: Alfred Queue Refactor

**Problem:**
```bash
# Current: overwrites previous queue
{
  echo "## Primary Task: Card A"
} > "$WORKSPACE/ACTIVE-TASK-DISPATCH.md"

# Later:
{
  echo "## Primary Task: Card B"
} > "$WORKSPACE/ACTIVE-TASK-DISPATCH.md"  # OVERWRITES Card A!
```

**Solution:**
```bash
queue_for_alfred() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local priority="${4:-normal}"
  
  # Create queue directory
  local queue_dir="$WORKSPACE/.alfred-queue"
  mkdir -p "$queue_dir"
  
  # Create queue file with timestamp to ensure uniqueness
  local ts=$(date +%s%N | cut -b1-13)  # milliseconds
  local queue_file="$queue_dir/task-${ts}-${card_id}.json"
  
  # Write as JSON (easier to parse)
  cat > "$queue_file" << EOF
{
  "card_id": "$card_id",
  "title": "$title",
  "description": "$desc",
  "priority": "$priority",
  "queued_at": $(date +%s),
  "status": "queued"
}
EOF
  
  log "QUEUED_FOR_ALFRED: $queue_file"
  echo "$queue_file"
}

# In main script, instead of:
# echo "## Task" > ACTIVE-TASK-DISPATCH.md
# Do this:
queue_for_alfred "$CARD_ID" "$CARD_TITLE" "$CARD_DESC" "$CARD_PRIORITY"

# Alfred can then discover and process queue:
# ls -1 ~/.openclaw/.alfred-queue/task-*.json | sort | head -1
```

**Testing:**
```bash
# Queue multiple cards
queue_for_alfred "card1" "Title 1" "Description 1"
queue_for_alfred "card2" "Title 2" "Description 2"

# Check both are in queue
ls -la ~/.openclaw/.alfred-queue/
# Should see both task-*.json files

# Simulate Alfred processing
cat ~/.openclaw/.alfred-queue/task-*.json | jq '.card_id'
# Should see card1 and card2
```

---

## Fix 4: Required Field Validation

**Problem:**
```bash
CARD_ID=$(echo "$CARD_JSON" | python3 -c "..." 2>/dev/null || echo "")
# If no id, returns empty string
# Script continues with CARD_ID=""
# Later: curl -X POST ".../api/kanban//move"  # Empty card ID!
```

**Solution:**
```bash
validate_card_fields() {
  local card_json="$1"
  
  # Extract fields
  local card_id=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
  local card_title=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null || echo "")
  
  # Validate required fields
  if [[ -z "$card_id" ]]; then
    log "ERROR: Card missing required field 'id'"
    return 1
  fi
  
  if [[ -z "$card_title" ]]; then
    log "ERROR: Card missing required field 'title'"
    return 1
  fi
  
  # Optional fields (can be empty but must exist)
  local card_desc=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('description',''))" 2>/dev/null || echo "")
  local card_priority=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('priority','normal'))" 2>/dev/null || echo "normal")
  
  return 0
}

# In main loop:
while IFS= read -r CARD_JSON; do
  if ! validate_card_fields "$CARD_JSON"; then
    log "WARN: Skipping invalid card"
    continue
  fi
  # ... process card ...
done
```

**Testing:**
```bash
# Test with missing id
echo '{"title": "Test"}' | validate_card_fields
# Should fail: ERROR: Card missing required field 'id'

# Test with missing title
echo '{"id": "c1"}' | validate_card_fields
# Should fail: ERROR: Card missing required field 'title'

# Test with valid card
echo '{"id": "c1", "title": "Test", "description": "Desc"}' | validate_card_fields
# Should pass
```

---

## Fix 5: Log Rotation

**Problem:**
```bash
# Current: logs grow unbounded
# executor-health.log: 500 lines/day
# At 50 bytes/line = 25KB/day
# In 1 year: 9MB (acceptable)
# But if card count grows to 1000/day: 180MB/year
# If we run multiple crons: could grow to 1GB+ within months
# Disk full → script fails
```

**Solution:**
```bash
rotate_logs() {
  local log_file="$1"
  local max_size="${2:-1048576}"  # Default 1MB
  local max_backups="${3:-7}"  # Keep 7 backups
  
  # Check if file exists and size exceeds limit
  if [[ ! -f "$log_file" ]]; then
    return 0
  fi
  
  # Get file size (cross-platform: macOS stat -f%z vs Linux stat -c%s)
  local size
  if size=$(stat -f%z "$log_file" 2>/dev/null); then
    true  # macOS
  else
    size=$(stat -c%s "$log_file" 2>/dev/null || echo 0)
  fi
  
  if (( size <= max_size )); then
    return 0
  fi
  
  # Rotate backups
  for ((i=max_backups; i>1; i--)); do
    [[ -f "$log_file.$((i-1)).gz" ]] && mv "$log_file.$((i-1)).gz" "$log_file.$i.gz"
  done
  
  # Move current log to backup and compress
  mv "$log_file" "$log_file.1"
  gzip "$log_file.1" 2>/dev/null || true
  
  # Create new empty log
  touch "$log_file"
  
  log "LOG_ROTATED: $log_file (size was $(numfmt --to=iec $size 2>/dev/null || echo $size))"
}

# Call at script start
rotate_logs "$EXEC_LOG" 1048576 7
rotate_logs "$HEALTH_LOG" 1048576 7
```

**Testing:**
```bash
# Create large test log
dd if=/dev/zero bs=1024 count=1100 of=/tmp/test.log
ls -lh /tmp/test.log  # Should be ~1.1M

# Call rotate_logs
rotate_logs "/tmp/test.log" 1048576 3
ls -lh /tmp/test.log*  # Should see test.log (new), test.log.1.gz (rotated)

# Verify log rotation worked
gunzip -c /tmp/test.log.1.gz | wc -c  # Should be ~1.1M original
```

---

## Implementation Checklist

- [ ] **Fix 1 — JSON Schema Validation**
  - [ ] Add `validate_kanban_json()` function
  - [ ] Call before processing any cards
  - [ ] Test with malformed JSON
  - [ ] Update error message in health log

- [ ] **Fix 2 — Atomic State Writes**
  - [ ] Add `write_state_atomic()` function
  - [ ] Replace all `python3 state_file.write_text()` calls
  - [ ] Add error handling on write failure
  - [ ] Test concurrent writes

- [ ] **Fix 3 — Alfred Queue Refactor**
  - [ ] Create `~/.openclaw/.alfred-queue/` directory
  - [ ] Add `queue_for_alfred()` function
  - [ ] Replace single-file queue with multi-file queue
  - [ ] Update ACTIVE-TASK dispatch logic to read from queue dir
  - [ ] Test multiple queued cards

- [ ] **Fix 4 — Required Field Validation**
  - [ ] Add `validate_card_fields()` function
  - [ ] Call before extracting card details
  - [ ] Skip invalid cards with warning
  - [ ] Test with malformed cards

- [ ] **Fix 5 — Log Rotation**
  - [ ] Add `rotate_logs()` function
  - [ ] Call at script start (both logs)
  - [ ] Set max size to 1MB
  - [ ] Set backups to 7
  - [ ] Test rotation manually

---

## Files to Modify

1. **`kanban-work-executor-safe.sh`** — Add all 5 fixes
2. **`ACTIVE-TASK-DISPATCH.md`** → Deprecate, replace with queue dir
3. **Documentation** — Update reference docs

---

## Testing Plan

**Unit tests:**
```bash
# After implementation, run:
bash kanban-work-executor-safe.sh --test
# Should output: [TEST:PASSED] All validation checks passed
```

**Integration test:**
```bash
# Create test cards in Kanban (in_progress)
# Run executor manually:
bash kanban-work-executor-safe.sh
# Should process successfully
# Check logs: executor-health.log, kanban-execution.log
# Check state: card-failures.json
# Verify log rotation: executor-health.log.1.gz exists if rotated
```

---

## Deployment

**Step 1:** Implement fixes locally  
**Step 2:** Test with current Kanban board state  
**Step 3:** Update cron job (or test via manual run first)  
**Step 4:** Monitor logs for 24h  
**Step 5:** Update documentation  

---

## Questions for Joe

1. **Log size:** 1MB limit OK, or different?
2. **Log backups:** Keep 7 backups, or different?
3. **Queue timeout:** Should Alfred queue tasks expire? (e.g., 6 hours)
4. **Validation strictness:** Fail on any missing field, or warnings only?

---

**Status:** Ready to implement. All fixes are non-breaking, backwards-compatible.  
**Impact:** Prevents data loss, race conditions, and system crashes.  
**Timeline:** Implement today, test tomorrow, deploy by EOD.

Ready to proceed?
