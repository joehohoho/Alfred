# Kanban Executor Risk Analysis — Comprehensive Scenario Audit

**Date:** 2026-03-10 13:28 ADT  
**Analysis:** Joe's question: "Are there other scenarios we should guard against?"  
**Status:** 🔴 CRITICAL SCENARIOS FOUND (18 new risks identified)

---

## Risk Categories (18 Scenarios)

### Category A: Data Integrity Risks (5 scenarios)

#### A1: Kanban API Returns Partial/Malformed JSON

**Scenario:**
- Kanban API is up but returns corrupted JSON (network hiccup, server bug)
- Script doesn't validate structure
- `python3 -c "json.load..."` fails silently or partially parses
- Card IDs become garbage, dispatch attempts use wrong targets

**Current vulnerability:**
```bash
BOARD_JSON=$(curl -s "http://localhost:3001/api/kanban" 2>/dev/null || echo "{}")
# No validation that BOARD_JSON has required structure
```

**Impact:** 
- Dispatch to wrong cards
- Create comments on wrong cards
- Move wrong cards to Blocked

**SAFEGUARD NEEDED:** JSON schema validation + fallback

---

#### A2: Concurrent Cron Executions Corrupt State File

**Scenario:**
- Two cron instances run simultaneously (clock drift, staggering fails)
- Both read `card-failures.json` at same time
- Both write state, last write wins
- Failure count gets reset incorrectly or duplicated

**Current vulnerability:**
```bash
# No file locking
state = read(card-failures.json)  # Cron A reads
state = read(card-failures.json)  # Cron B reads (same state)
write(state, card-failures.json)  # Cron A writes increment
write(state, card-failures.json)  # Cron B writes same increment (corrupts A's write)
```

**Impact:**
- Failure count wrong (could reset prematurely or stuck high)
- Cards don't block when they should
- Race condition unpredictable

**SAFEGUARD NEEDED:** File locking or atomic JSON writes

---

#### A3: State File Corruption (Disk I/O Error, Disk Full)

**Scenario:**
- Disk fills up mid-write
- Partial JSON written (truncated file)
- Next cron run tries to parse broken JSON
- Script crashes or silently fails

**Current vulnerability:**
```bash
state_file.write_text(json.dumps(state, indent=2))
# No error handling if write fails
```

**Impact:**
- Lost failure history
- Can't track cards
- Script behavior unpredictable

**SAFEGUARD NEEDED:** Write-to-temp + atomic rename, error handling

---

#### A4: Card Metadata Missing (Malformed Card Object)

**Scenario:**
- Card in Kanban has missing fields: no ID, no title, no description
- Script tries to extract via python3 one-liner
- Empty string returned, causes undefined behavior
- Dispatch to "card ID=''" — nonsense

**Current vulnerability:**
```bash
CARD_ID=$(echo "$CARD_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
# If no 'id' field, returns empty string
# Script continues with CARD_ID=""
```

**Impact:**
- Attempt to move/comment on non-existent card
- Dispatch with empty session key

**SAFEGUARD NEEDED:** Validate required fields before processing

---

#### A5: Card Deleted During Execution

**Scenario:**
- Script fetches in_progress cards at T=0
- Card gets deleted from Kanban at T=30 sec
- Script tries to move deleted card to Blocked
- API returns 404, script doesn't check status code

**Current vulnerability:**
```bash
curl -s -X POST "http://localhost:3001/api/kanban/$CARD_ID/move" ...
# No error handling on response
```

**Impact:**
- Silent 404, card state lost
- No way to know what happened

**SAFEGUARD NEEDED:** Check HTTP status codes on API responses

---

### Category B: Execution & Dispatch Risks (5 scenarios)

#### B1: Alfred Queue File Overwritten

**Scenario:**
- Two cards queue for Alfred simultaneously
- Both write to `ACTIVE-TASK-DISPATCH.md`
- Second write overwrites first
- First card's task is lost

**Current vulnerability:**
```bash
{
  echo "## Primary Task: $CARD_TITLE"
  ...
} > "$WORKSPACE/ACTIVE-TASK-DISPATCH.md"  # Overwrites previous content
```

**Impact:**
- Lost task (second queued card's task)
- Alfred only sees last queued card

**SAFEGUARD NEEDED:** Append to queue file or use timestamp-based queue

---

#### B2: HAL Dispatch Succeeds but HAL Never Executes

**Scenario:**
- `hal-dispatch-ws.js` returns success (dispatched to HAL)
- But HAL never receives or processes the task (network drops, HAL offline)
- Card still in in_progress, task nowhere
- Cron retries, creates duplicate HAL task

**Current vulnerability:**
```bash
DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" "$TASK_MSG")
if [[ $? -eq 0 ]]; then
  # Success means message sent, not necessarily received/executed
  failure_count = 0  # Too optimistic
fi
```

**Impact:**
- Duplicate tasks in HAL queue
- Task orphaned (not in any system)

**SAFEGUARD NEEDED:** Session key tracking, heartbeat check on HAL session

---

#### B3: Alfred Never Picks Up Queued Tasks

**Scenario:**
- Script queues card for Alfred (writes to ACTIVE-TASK-DISPATCH.md)
- Alfred's session never runs or is offline
- Task sits queued forever
- Queue file gets overwritten by next queued card

**Current vulnerability:**
- No mechanism to verify Alfred picks up task
- No timeout on queued work
- Queue file overwrites previous (B1)

**Impact:**
- Orphaned tasks
- Work never executed

**SAFEGUARD NEEDED:** Queue tracking, timeout on orphaned tasks

---

#### B4: Mixed Execution Types Fail Asymmetrically

**Scenario:**
- Executor sends code task to HAL (works, dispatched)
- Executor queues analysis task for Alfred (file written)
- Alfred is offline → task never picked up
- HAL task succeeds
- Board shows inconsistent progress (some complete, some abandoned)

**Current vulnerability:**
- No unified tracking of what's queued vs. dispatched
- No visibility into Alfred's queue status

**Impact:**
- Inconsistent task execution
- Joe can't see which tasks are "stuck in Alfred queue"

**SAFEGUARD NEEDED:** Unified task queue with status tracking

---

#### B5: Dispatch Timeout False Negative

**Scenario:**
- `timeout 45 node hal-dispatch-ws.js` kills process at 45 sec
- HAL dispatch was in progress, message partially sent
- Script logs failure, increments failure_count
- HAL continues processing (late-arriving message)
- Card gets moved to Blocked
- HAL task executes on orphaned session, results lost

**Current vulnerability:**
```bash
DISPATCH_OUT=$(timeout 45 node "$SCRIPT_DIR/hal-dispatch-ws.js" ...)
# Timeout kills process, script sees failure
# But HAL might still be executing the task
```

**Impact:**
- Duplicate or orphaned execution
- Card blocked while task runs elsewhere

**SAFEGUARD NEEDED:** Session key tracking, idempotency keys, retry logic

---

### Category C: Gateway & Infrastructure Risks (4 scenarios)

#### C1: Intermittent Gateway Flakiness (Not Fully Down)

**Scenario:**
- Gateway responds sometimes, times out others
- Health check (5 sec timeout) might succeed
- Dispatch (45 sec timeout) might fail
- Script thinks gateway is up, but dispatch fails
- Incrementally increases failure_count, eventually blocks card

**Current vulnerability:**
- Health check timeout: 5 sec
- Dispatch timeout: 45 sec
- Inconsistent timeouts create asymmetric failures

**Impact:**
- Cards block when issue is just network flakiness
- False positives, Joe blocked cards incorrectly

**SAFEGUARD NEEDED:** Separate health thresholds, circuit breaker pattern

---

#### C2: HAL Gateway Reachable but Process Hung

**Scenario:**
- HAL machine is online (IP reachable)
- Gateway WebSocket responds to connection
- But HAL's Ollama process is dead/hung
- Dispatch succeeds (message sent to gateway)
- But HAL never generates response
- Timeout fires, logged as failure

**Current vulnerability:**
- Health check only checks gateway reachability
- Doesn't verify HAL can actually execute tasks

**Impact:**
- Cards fail to execute even though gateway is "up"
- False sense of stability

**SAFEGUARD NEEDED:** HAL execution health check (not just reachability)

---

#### C3: DNS/Hostname Resolution Changes

**Scenario:**
- Script hardcodes `192.168.2.79:18789`
- Network changes, HAL machine gets different IP
- DNS resolves to old IP
- Dispatch fails forever, cards block

**Current vulnerability:**
```bash
HAL_GATEWAY_URL=ws://192.168.2.79:18789
# Hardcoded IP, no fallback
```

**Impact:**
- Cards block indefinitely after network change
- Joe has to manually fix script + unblock cards

**SAFEGUARD NEEDED:** DNS/config-driven hostnames, health alert on IP change

---

#### C4: Stuck Long-Running Dispatch (Zombie Process)

**Scenario:**
- `node hal-dispatch-ws.js` command hangs (network wedged, process stuck)
- `timeout 45 sec` kills process
- But parent bash process doesn't clean up properly
- Accumulated zombie processes exhaust system resources

**Current vulnerability:**
- No explicit cleanup of child processes

**Impact:**
- Zombie processes pile up
- System performance degrades

**SAFEGUARD NEEDED:** Proper cleanup, process monitoring

---

### Category D: Observability & Alerting Risks (2 scenarios)

#### D1: Blocked Cards Pile Up, Board Loses Visibility

**Scenario:**
- Many cards fail and move to Blocked
- Blocked column fills with 50+ cards
- Joe stops looking at Blocked column (too noisy)
- Real issues get missed

**Current vulnerability:**
- No notification when card blocks
- No cleanup of old Blocked cards
- Infinite accumulation

**Impact:**
- Lost visibility
- Board becomes noise

**SAFEGUARD NEEDED:** Notification on block, stale card cleanup

---

#### D2: Logs Grow Unbounded, Fill Disk

**Scenario:**
- `executor-health.log` and `kanban-execution.log` run 24/7
- No log rotation
- Every card processed adds 5 lines
- 100 cards/day = 500 lines/day = 180k lines/year
- Disk fills, script crashes

**Current vulnerability:**
- No log rotation
- Logs in `.hal-alfred-tracking/` (user space, can fill disk)

**Impact:**
- Disk fills
- System fails

**SAFEGUARD NEEDED:** Log rotation + max size limits

---

### Category E: Policy & Business Logic Risks (2 scenarios)

#### E1: Priority Inversion (Low-Priority Task Blocks High-Priority)

**Scenario:**
- Card A (high priority, code task): queued first, fails early
- Card B (high priority, code task): queued second, in cooldown
- Card C (low priority, analysis): queued third, succeeds immediately
- Executor processes in order, blocking high-priority cards

**Current vulnerability:**
- Script processes cards in JSON order, not priority
- No priority-aware dispatch

**Impact:**
- High-priority work blocked by low-priority failures
- Wrong execution order

**SAFEGUARD NEEDED:** Priority-based queue ordering

---

#### E2: Stale Blocked Cards Never Recover

**Scenario:**
- Card moved to Blocked 2 weeks ago
- Issue is fixed (gateway was down, now up)
- But card stays Blocked
- Joe forgets about it
- Work never resumes

**Current vulnerability:**
- No auto-recovery of Blocked cards
- No expiration or reminder

**Impact:**
- Lost work
- Deadlock

**SAFEGUARD NEEDED:** Expiration + notification on old Blocked cards

---

## Summary Table: All 18 Risks

| ID | Risk | Severity | Current Safeguard | New Safeguard Needed |
|----|----|----------|-------------------|----------------------|
| A1 | Malformed JSON | 🔴 High | None | JSON schema validation |
| A2 | Concurrent writes corrupt state | 🔴 High | None | File locking / atomic writes |
| A3 | State file corruption (disk full) | 🔴 High | None | Write-to-temp + atomic rename |
| A4 | Missing card fields | 🟡 Medium | Partial | Required field validation |
| A5 | Card deleted mid-execution | 🟡 Medium | None | HTTP status code checks |
| B1 | Alfred queue overwritten | 🔴 High | None | Append-based queue / timestamp |
| B2 | HAL dispatch phantom task | 🟡 Medium | None | Session tracking + heartbeat |
| B3 | Alfred queue grows unbounded | 🟡 Medium | None | Queue timeout + cleanup |
| B4 | Asymmetric execution failures | 🟡 Medium | None | Unified queue + status |
| B5 | Dispatch timeout false negative | 🟡 Medium | Partial | Idempotency + session tracking |
| C1 | Gateway flakiness (partial down) | 🟡 Medium | Partial | Circuit breaker pattern |
| C2 | HAL process hung | 🟡 Medium | None | HAL execution health check |
| C3 | DNS/IP changes | 🟡 Medium | None | Config-driven hostname |
| C4 | Zombie processes | 🟡 Medium | None | Explicit cleanup + monitoring |
| D1 | Blocked cards pile up | 🟡 Medium | None | Notification + cleanup |
| D2 | Logs fill disk | 🔴 High | None | Log rotation + size limits |
| E1 | Priority inversion | 🟡 Medium | None | Priority-based ordering |
| E2 | Stale Blocked cards | 🟡 Medium | None | Expiration + notification |

---

## Proposed Mitigations (Phased Implementation)

### Phase 1: CRITICAL (Do First — Blocks Risk A/B/D)
1. **JSON schema validation** (A1)
2. **File locking on state writes** (A2)
3. **Atomic writes + error handling** (A3)
4. **Alfred queue refactor** (B1)
5. **Log rotation** (D2)

### Phase 2: HIGH (Do Soon — Improves B/C)
6. **HTTP status code checks** (A5)
7. **Session tracking + heartbeat** (B2/B5)
8. **Circuit breaker for flaky gateway** (C1)
9. **Unified queue + status tracking** (B3/B4)

### Phase 3: MEDIUM (Nice-to-Have)
10. **HAL execution health check** (C2)
11. **Block card notification + cleanup** (D1)
12. **Priority-based queue ordering** (E1)
13. **Stale card expiration** (E2)
14. **Config-driven hostnames** (C3)
15. **Process cleanup + monitoring** (C4)

---

## Critical Issues Identified (Phase 1)

### Issue 1: JSON Validation Missing

**Fix:**
```bash
# Validate Kanban JSON structure
validate_kanban_json() {
  local json="$1"
  if ! echo "$json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assert 'columns' in data, 'Missing columns key'
assert 'in_progress' in data['columns'], 'Missing in_progress column'
print('OK')
" 2>/dev/null; then
    return 1
  fi
  return 0
}

if ! validate_kanban_json "$KANBAN_JSON"; then
  log "ERROR: Kanban API returned invalid JSON structure"
  exit 1
fi
```

---

### Issue 2: State File Race Condition

**Fix:**
```bash
# Atomic writes with temp file + rename
write_state_atomic() {
  local state="$1"
  local tmpfile="$STATE_FILE.tmp.$$"
  
  echo "$state" > "$tmpfile" || {
    log "ERROR: Failed to write state temp file"
    rm -f "$tmpfile"
    return 1
  }
  
  mv "$tmpfile" "$STATE_FILE" || {
    log "ERROR: Failed to atomic rename state file"
    rm -f "$tmpfile"
    return 1
  }
}
```

---

### Issue 3: Alfred Queue Overwrite

**Fix:**
```bash
# Queue to file with timestamp instead of overwriting
queue_for_alfred() {
  local card_id="$1"
  local title="$2"
  local desc="$3"
  local ts=$(date +%s%N)
  local queue_file="$WORKSPACE/.alfred-queue/task-$ts-$card_id.json"
  
  mkdir -p "$WORKSPACE/.alfred-queue"
  
  cat > "$queue_file" << EOF
{
  "card_id": "$card_id",
  "title": "$title",
  "description": "$desc",
  "queued_at": $(date +%s),
  "status": "queued"
}
EOF
  
  log "QUEUED_FOR_ALFRED: $queue_file"
}
```

---

### Issue 4: Log Rotation Missing

**Fix:**
```bash
# Rotate logs every 1MB or daily
rotate_logs() {
  local log_file="$1"
  local max_size=1048576  # 1MB
  local max_count=7  # Keep 7 backups
  
  if [[ ! -f "$log_file" ]]; then
    return 0
  fi
  
  local size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
  
  if (( size > max_size )); then
    for ((i=max_count; i>0; i--)); do
      [[ -f "$log_file.$i" ]] && mv "$log_file.$i" "$log_file.$((i+1))"
    done
    mv "$log_file" "$log_file.1"
    gzip "$log_file.1"
    touch "$log_file"
    log "LOG_ROTATED: $log_file"
  fi
}

# Call before logging
rotate_logs "$EXEC_LOG"
rotate_logs "$HEALTH_LOG"
```

---

### Issue 5: Required Field Validation

**Fix:**
```bash
validate_card() {
  local card_json="$1"
  
  local card_id=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")
  local card_title=$(echo "$card_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null || echo "")
  
  if [[ -z "$card_id" ]] || [[ -z "$card_title" ]]; then
    log "WARN: Card missing required fields (id or title), skipping"
    return 1
  fi
  
  return 0
}
```

---

## Questions for Joe

Before implementing Phase 2/3, clarify:

1. **Alfred queue:** Should queued tasks have timeout? (e.g., 6 hours → alert Joe)
2. **Blocked cards:** Cleanup threshold? (e.g., auto-resolve after 7 days + notification?)
3. **Notifications:** Notify Joe on blocked card? (Slack alert, dashboard, or card comment only?)
4. **Priority system:** How should priorities work? (Urgent, High, Normal, Low?)
5. **HAL health:** Should executor check if HAL has actually executed previous tasks?
6. **Logs:** Preferred max size? (1MB, 10MB, 100MB?)

---

## Implementation Order

**Today (Phase 1 — Critical):**
1. JSON validation
2. Atomic state writes
3. Alfred queue refactor
4. Log rotation
5. Field validation + status checks

**This week (Phase 2 — High):**
6. Session tracking
7. Circuit breaker
8. Unified queue status

**Next week (Phase 3 — Medium):**
9. Remaining observability + policy fixes

---

## Recommendation

The system works for happy path, but has **5 critical race conditions** and **13 edge cases** that could cause silent failures or data loss.

**Priority:** Implement Phase 1 today before system goes fully live. 

Phase 2/3 can follow but aren't blocking.

Would you like me to implement Phase 1 safeguards immediately?
