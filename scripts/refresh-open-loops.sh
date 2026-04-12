#!/bin/bash
# refresh-open-loops.sh — Auto-populate OPEN-LOOPS.md with live kanban + notifications data
# Usage: bash scripts/refresh-open-loops.sh
# Runs daily at 08:55 AM via cron; can be run manually anytime

set -e

WORKSPACE="$HOME/.openclaw/workspace"
OPEN_LOOPS_FILE="$WORKSPACE/OPEN-LOOPS.md"
OPEN_LOOPS_BACKUP="$OPEN_LOOPS_FILE.bak"
AUDIT_LOG="$WORKSPACE/.hal-alfred-tracking/open-loops-audit.log"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M %Z")
TIMESTAMP_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
MAX_STALENESS_HOURS=24

echo "🔄 Refreshing OPEN-LOOPS.md at $TIMESTAMP..."

# Helper: Log audit events
log_audit() {
  local event="$1"
  local message="$2"
  mkdir -p "$(dirname "$AUDIT_LOG")"
  echo "$TIMESTAMP_ISO | $event | $message" >> "$AUDIT_LOG"
  echo "  ⚠️  [$event] $message" >&2
}

# Helper: Validate OPEN-LOOPS.md schema
validate_open_loops_schema() {
  local file="$1"
  
  # Check: file exists and is non-empty
  if [[ ! -f "$file" ]] || [[ ! -s "$file" ]]; then
    echo "INVALID: File missing or empty"
    return 1
  fi
  
  # Check: no "null" entries in active-card table (catch null | null | and single nulls)
  if grep -E "\| null \|" "$file" | grep -q "Active Kanban"; then
    echo "INVALID: Found null card rows in Active Kanban Cards table"
    return 1
  fi
  
  # More robust: check if there are null pipe patterns after the Active Cards header
  # Extract just the Active Kanban Cards section and validate it
  local active_section=$(sed -n '/## 📊 Active Kanban Cards/,/## 🔔 Pending Notifications/p' "$file" 2>/dev/null)
  if echo "$active_section" | grep -E "\| null \|" > /dev/null; then
    echo "INVALID: Found null values in Active Kanban Cards table"
    return 1
  fi
  
  # Check: At least one valid card ID pattern OR a "No active cards" fallback
  if ! echo "$active_section" | grep -qE "\|[[:space:]]*[a-zA-Z0-9_-].*\|" && \
     ! echo "$active_section" | grep -q "No active cards"; then
    echo "INVALID: Active Kanban Cards section has no valid rows"
    return 1
  fi
  
  echo "VALID"
  return 0
}

# Helper: Check file staleness
check_staleness() {
  local file="$1"
  
  if [[ ! -f "$file" ]]; then
    return 0  # file doesn't exist, not stale
  fi
  
  local last_mod last_mod_epoch now age_hours
  
  # Get modification time (platform-agnostic)
  if [[ "$(uname)" == "Darwin" ]]; then
    last_mod_epoch=$(stat -f %m "$file" 2>/dev/null || echo "0")
  else
    last_mod_epoch=$(stat -c %Y "$file" 2>/dev/null || echo "0")
  fi
  
  now=$(date +%s)
  local age_seconds=$((now - last_mod_epoch))
  age_hours=$((age_seconds / 3600))
  
  if [[ $age_hours -gt $MAX_STALENESS_HOURS ]]; then
    echo "STALE: File is $age_hours hours old (max: $MAX_STALENESS_HOURS)"
    return 1
  fi
  
  echo "FRESH"
  return 0
}

# Helper: Restore from backup
restore_from_backup() {
  if [[ -f "$OPEN_LOOPS_BACKUP" ]]; then
    cp "$OPEN_LOOPS_BACKUP" "$OPEN_LOOPS_FILE"
    log_audit "FALLBACK_APPLIED" "Restored $OPEN_LOOPS_FILE from backup due to schema violation"
    return 0
  else
    log_audit "FALLBACK_FAILED" "No backup available; file may be corrupted"
    return 1
  fi
}

# Helper: Repair via kanban API fetch and regenerate
repair_from_api() {
  echo "  → Attempting API repair..."
  
  # Force-refetch all card data
  echo "    → Re-fetching from API..."
  KANBAN_RESPONSE=$(fetch_data "/api/kanban")
  IN_PROGRESS=$(echo "$KANBAN_RESPONSE" | jq '.columns.in_progress // []' 2>/dev/null || echo "[]")
  BLOCKED=$(echo "$KANBAN_RESPONSE" | jq '.columns.blocked // []' 2>/dev/null || echo "[]")
  TO_DO=$(echo "$KANBAN_RESPONSE" | jq '.columns.todo // []' 2>/dev/null || echo "[]")
  
  # Log repair attempt
  local in_p_count=$(echo "$IN_PROGRESS" | jq 'length' 2>/dev/null || echo "0")
  local blocked_count=$(echo "$BLOCKED" | jq 'length' 2>/dev/null || echo "0")
  log_audit "REPAIR_ATTEMPT" "Re-fetched from API: $in_p_count in_progress, $blocked_count blocked"
  
  if [[ $in_p_count -gt 0 ]] || [[ $blocked_count -gt 0 ]]; then
    echo "    ✅ API data retrieved successfully"
    return 0
  else
    log_audit "REPAIR_FAILED" "API returned empty data; using backup fallback"
    return 1
  fi
}

# Helper: Alert staleness via audit and Discord notification
alert_staleness() {
  local staleness_msg="$1"
  log_audit "STALENESS_ALERT" "$staleness_msg"
  
  # Send Discord notification if webhook is available
  if [[ -n "${DISCORD_WEBHOOK_ALERTS:-}" ]]; then
    curl -s -X POST "$DISCORD_WEBHOOK_ALERTS" \
      -H 'Content-Type: application/json' \
      -d "{
        \"content\": \"⚠️ **OPEN-LOOPS.md Staleness Warning**: $staleness_msg\",
        \"username\": \"Alfred\"
      }" 2>/dev/null || true
  fi
}

# Helper: fetch data with timeout
fetch_data() {
  local endpoint="$1"
  local timeout=5
  curl -s --max-time "$timeout" "$GATEWAY_URL$endpoint" 2>/dev/null || echo "{}"
}

# Fetch live data
echo "  → Fetching kanban cards..."
KANBAN_RESPONSE=$(fetch_data "/api/kanban")

# Extract columns from the response (API returns {columns: {...}, stats: {...}})
IN_PROGRESS=$(echo "$KANBAN_RESPONSE" | jq '.columns.in_progress // []' 2>/dev/null || echo "[]")
BLOCKED=$(echo "$KANBAN_RESPONSE" | jq '.columns.blocked // []' 2>/dev/null || echo "[]")
TO_DO=$(echo "$KANBAN_RESPONSE" | jq '.columns.todo // []' 2>/dev/null || echo "[]")

# Calendar endpoint (if available, otherwise fallback to empty)
CALENDAR=$(fetch_data "/api/calendar?days=7")

# Notifications source of truth is the local file. API field names have drifted before,
# so read the JSON directly and normalize it here for stable reporting.
if [[ -f "$WORKSPACE/goals/notifications.json" ]]; then
  NOTIFICATIONS=$(cat "$WORKSPACE/goals/notifications.json")
else
  NOTIFICATIONS="[]"
fi

# Generate markdown table for Active Kanban Cards
generate_active_cards() {
  local in_progress_count=$(echo "$IN_PROGRESS" | jq 'length' 2>/dev/null || echo 0)
  local blocked_count=$(echo "$BLOCKED" | jq 'length' 2>/dev/null || echo 0)
  
  if [[ $in_progress_count -eq 0 ]] && [[ $blocked_count -eq 0 ]]; then
    echo "| — | — | No active cards (all clear) | — | — | — | — |"
    return
  fi
  
  # In Progress (handle both old field names and new)
  echo "$IN_PROGRESS" | jq -r '.[] | 
    "| \(.id // "unknown") | \(.title // "(untitled)") | \(.assignedTo // .assigned_to // "unassigned") | \(.priority // "NORMAL") | in_progress | \(.metadata.blocker // "none") | \(.dueDate // .due_date // "TBD") |"' 2>/dev/null || true
  
  # Blocked (handle both old field names and new)
  echo "$BLOCKED" | jq -r '.[] | 
    "| \(.id // "unknown") | \(.title // "(untitled)") | \(.assignedTo // .assigned_to // "unassigned") | \(.priority // "NORMAL") | 🚫 blocked | \(.metadata.blocker // "unspecified") | \(.dueDate // .due_date // "TBD") |"' 2>/dev/null || true
}

# Generate markdown table for To Do queue
generate_todo_queue() {
  local count=$(echo "$TO_DO" | jq 'length' 2>/dev/null || echo 0)
  
  if [[ $count -eq 0 ]]; then
    echo "| — | — | No tasks pending (queue clear) | — | — | — |"
    return
  fi
  
  echo "$TO_DO" | jq -r '.[] | 
    "| \(.priority // "NORMAL") | \(.id // "unknown") | \(.title // "(untitled)") | \(.estimatedHours // .metadata.estimated_hours // "?") | \((now - ((.createdAt // .created_at | fromdate) // now)) / 86400 | floor) days | \(if (.metadata.blocked // false) then "YES" else "NO" end) |"' 2>/dev/null || true
}

# Generate deadline summary
generate_deadlines() {
  # Handle both array and object responses
  local calendar_array=$(echo "$CALENDAR" | jq 'if type == "array" then . elif type == "object" and has("events") then .events else [] end' 2>/dev/null || echo "[]")
  local deadline_count=$(echo "$calendar_array" | jq '[.[] | select(.start < (now + 604800))] | length' 2>/dev/null || echo 0)
  
  if [[ $deadline_count -eq 0 ]]; then
    echo "- No deadlines in next 7 days ✅"
    return
  fi
  
  echo "$calendar_array" | jq -r '.[] | select(.start < (now + 604800)) | "- **\(.date):** \(.title) (\(.type // "event"))"' 2>/dev/null || true
}

# Generate pending notifications summary
# Supports both legacy/local notifications.json shape and API-ish variants.
generate_pending_notifs() {
  # Handle both array and object responses
  local notifs_array=$(echo "$NOTIFICATIONS" | jq 'if type == "array" then . elif type == "object" and has("items") then .items else [] end' 2>/dev/null || echo "[]")
  local notif_count=$(echo "$notifs_array" | jq '[.[] | select((.answered // false) != true)] | length' 2>/dev/null || echo 0)
  
  if [[ $notif_count -eq 0 ]]; then
    echo "| — | — | No pending notifications ✅ | — | — |"
    return
  fi
  
  echo "$notifs_array" | jq -r '
    def clean: gsub("[\r\n]+"; " ") | gsub("\\|"; "/") | gsub("  +"; " ") | sub("^ "; "") | sub(" $"; "");
    def classify_owner($msg):
      ((.source // .sourceTag // "") | tostring) as $src
      | (((.title // "") + " " + $msg + " " + $src) | ascii_downcase) as $text
      | if (.waitingOn // "") != "" then .waitingOn
        elif ($text | test("waiting on you|you need to do|please reply|decision needed|what you need to do|what is the call|can you|could you|would you|should i|approve|provide|update|share with me|message me|reply with|just reply|your decision|need your decision|need your decisions|need your approval|scope clarification|clarification needed|what do you want|which option|a or b|stripe|dashboard|manual task|unblocks testing|only blocker|reply 'stripe config done'|reply 'skip trial for now'")) then "joe"
        elif ($src | test("(?i)^daily-inquiry$|daily-inquiry|review-escalation|manual|question|approval|blocker")) then "joe"
        elif ($text | test("\?|waiting on|blocked on|clarification|approval|approve|decision|reply|respond|provide|update|choose|pick|which|what\s+should|what is the call")) then "joe"
        elif (.assigned_to // "") != "" then .assigned_to
        else "alfred"
        end;
    [.[] | select((.answered // false) != true)]
    | sort_by(.createdAt // .created_at // "")
    | reverse
    | .[]
    | (.message // "") as $msg
    | (classify_owner($msg)) as $owner
    | (if (.status // "") != "" then .status elif (.answered // false) == true then "answered" else "awaiting-answer" end) as $status
    | (if (.next_action // "") != "" then .next_action elif $owner == "joe" then "review / respond" else "follow up" end) as $next
    | ((.title // .message // "(untitled)") | clean) as $title
    | "| \($title) | \((.createdAt // .created_at // "unknown") | tostring | clean) | \(($owner|tostring) | clean) | \(($status|tostring) | clean) | \(($next|tostring) | clean) |"
  ' 2>/dev/null || true
}

# Create backup before refresh
if [[ -f "$OPEN_LOOPS_FILE" ]]; then
  cp "$OPEN_LOOPS_FILE" "$OPEN_LOOPS_BACKUP"
fi

# Pre-generate tables to validate before writing
echo "  → Building OPEN-LOOPS.md content..."
ACTIVE_CARDS_TABLE=$(generate_active_cards)
TODO_QUEUE_TABLE=$(generate_todo_queue)
DEADLINES_CONTENT=$(generate_deadlines)
PENDING_NOTIFS_TABLE=$(generate_pending_notifs)

# Sanity check: ensure none of the tables contain null values
if echo "$ACTIVE_CARDS_TABLE" | grep -qE "\| null \|"; then
  log_audit "TABLE_GENERATION_FAILED" "Active cards table contains null values; triggering repair"
  if repair_from_api; then
    # Regenerate with fresh data
    ACTIVE_CARDS_TABLE=$(generate_active_cards)
  fi
fi

# Build new file with updated tables
cat > "$OPEN_LOOPS_FILE" << EOF
# Open Loops — Single Source of Truth

**Last updated:** $TIMESTAMP  
**Next sync:** $(date -u -v+1d +"%Y-%m-%d") 09:00 ADT (morning standup)  
**Auto-refresh:** Daily at 08:55 AM via \`scripts/refresh-open-loops.sh\`

---

## 🎯 Pending Questions for Joe
_Source: Command Center notifications (manual review + input)_

- [ ] **Passive Income Targets (Q2)**
  - Context: Market Signal Lab launch; need revenue targets
  - Questions: 
    - Specific target revenue: \$X/month?
    - Timeline: immediate (March) vs. Q2 (April-May)?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **App Growth Strategy (Priority)**
  - Context: CoinUsUp + Even Us Up competing for Q2 cycles
  - Questions:
    - Which app to prioritize for Q2 growth?
    - Resource allocation: HAL bandwidth vs. Alfred focus?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **Market Signal Lab Scope Clarification**
  - Context: Product roadmap + external user interest
  - Questions:
    - Ship as public product vs. keep as internal trading tool?
    - If public: pricing model + feature gates?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: NORMAL

---

## 📊 Active Kanban Cards (In Progress or Blocked)
_Source: Auto-populated by refresh script (last sync: $TIMESTAMP)_

| Card ID | Title | Owner | Priority | Status | Blocker | Due |
|---------|-------|-------|----------|--------|---------|-----|
$ACTIVE_CARDS_TABLE

---

## 🔔 Pending Notifications (Unanswered)
_Source: Auto-populated from \`/goals/notifications.json\` (last sync: $TIMESTAMP)_

| Title | Asked | Assigned To | Status | Next Action |
|-------|-------|-------------|--------|-------------|
$PENDING_NOTIFS_TABLE

---

## 📋 Tasks Pending HAL Dispatch (To Do Queue)
_Source: Auto-populated from kanban board (last sync: $TIMESTAMP)_

| Priority | Card ID | Title | Est. Hours | Age | Blocker? |
|----------|---------|-------|-----------|-----|----------|
$TODO_QUEUE_TABLE

---

## 📅 Upcoming Deadlines (Next 7 Days)
_Source: Kanban board + Calendar (last sync: $TIMESTAMP)_

$DEADLINES_CONTENT

---

## 🔄 Sync Protocol

**Morning Standup (09:00 AM ADT):**
1. Open this file
2. Review "Pending Questions" — any new answers from Joe overnight?
3. Review "Active Kanban Cards" — any blockers to unblock?
4. Review "Pending Notifications" — which ones need attention today?
5. Review "Tasks Pending HAL Dispatch" — pick top 3 for queue
6. Check "Upcoming Deadlines" — any urgent dates?

**Refresh Schedule:**
- Auto-refresh: 08:55 AM daily (runs \`scripts/refresh-open-loops.sh\`)
- Manual refresh: Anytime with \`bash scripts/refresh-open-loops.sh\`
- Git commit: Auto-committed after each refresh (timestamped)

---

## 📝 Manual Sections (Joe's Domain)

### Pending Questions
**Keep entries here manually** — Joe adds answers directly or via notifications.

When Joe answers, Alfred logs it to \`decisions/YYYY-MM.md\` and moves to "Decided" section. Questions not answered within 7 days are escalated via Command Center notification.

### Note Log
Use this for personal notes, reminders, or context that doesn't fit kanban cards:

- [Add as needed]

---

**Created:** 2026-03-09 | **By:** Alfred | **Status:** ✅ LIVE
EOF

# Validate the newly generated file
echo "  → Validating schema..."
if ! validation_result=$(validate_open_loops_schema "$OPEN_LOOPS_FILE"); then
  log_audit "VALIDATION_FAILED" "$validation_result"
  echo "  ⚠️  Schema validation failed: $validation_result"
  
  # Step 1: Try API repair
  if repair_from_api; then
    echo "  → Regenerating with repaired data..."
    # Regenerate with fresh data
    ACTIVE_CARDS_TABLE=$(generate_active_cards)
    TODO_QUEUE_TABLE=$(generate_todo_queue)
    DEADLINES_CONTENT=$(generate_deadlines)
    PENDING_NOTIFS_TABLE=$(generate_pending_notifs)
    
    # Write again with repaired data
    cat > "$OPEN_LOOPS_FILE" << EOF
# Open Loops — Single Source of Truth

**Last updated:** $TIMESTAMP  
**Next sync:** $(date -u -v+1d +"%Y-%m-%d") 09:00 ADT (morning standup)  
**Auto-refresh:** Daily at 08:55 AM via \`scripts/refresh-open-loops.sh\`

---

## 🎯 Pending Questions for Joe
_Source: Command Center notifications (manual review + input)_

- [ ] **Passive Income Targets (Q2)**
  - Context: Market Signal Lab launch; need revenue targets
  - Questions: 
    - Specific target revenue: \$X/month?
    - Timeline: immediate (March) vs. Q2 (April-May)?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **App Growth Strategy (Priority)**
  - Context: CoinUsUp + Even Us Up competing for Q2 cycles
  - Questions:
    - Which app to prioritize for Q2 growth?
    - Resource allocation: HAL bandwidth vs. Alfred focus?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: HIGH

- [ ] **Market Signal Lab Scope Clarification**
  - Context: Product roadmap + external user interest
  - Questions:
    - Ship as public product vs. keep as internal trading tool?
    - If public: pricing model + feature gates?
  - Assigned to: Alfred | Status: **AWAITING ANSWER** | Priority: NORMAL

---

## 📊 Active Kanban Cards (In Progress or Blocked)
_Source: Auto-populated by refresh script (last sync: $TIMESTAMP)_

| Card ID | Title | Owner | Priority | Status | Blocker | Due |
|---------|-------|-------|----------|--------|---------|-----|
$ACTIVE_CARDS_TABLE

---

## 🔔 Pending Notifications (Unanswered)
_Source: Auto-populated from \`/goals/notifications.json\` (last sync: $TIMESTAMP)_

| Title | Asked | Assigned To | Status | Next Action |
|-------|-------|-------------|--------|-------------|
$PENDING_NOTIFS_TABLE

---

## 📋 Tasks Pending HAL Dispatch (To Do Queue)
_Source: Auto-populated from kanban board (last sync: $TIMESTAMP)_

| Priority | Card ID | Title | Est. Hours | Age | Blocker? |
|----------|---------|-------|-----------|-----|----------|
$TODO_QUEUE_TABLE

---

## 📅 Upcoming Deadlines (Next 7 Days)
_Source: Kanban board + Calendar (last sync: $TIMESTAMP)_

$DEADLINES_CONTENT

---

## 🔄 Sync Protocol

**Morning Standup (09:00 AM ADT):**
1. Open this file
2. Review "Pending Questions" — any new answers from Joe overnight?
3. Review "Active Kanban Cards" — any blockers to unblock?
4. Review "Pending Notifications" — which ones need attention today?
5. Review "Tasks Pending HAL Dispatch" — pick top 3 for queue
6. Check "Upcoming Deadlines" — any urgent dates?

**Refresh Schedule:**
- Auto-refresh: 08:55 AM daily (runs \`scripts/refresh-open-loops.sh\`)
- Manual refresh: Anytime with \`bash scripts/refresh-open-loops.sh\`
- Git commit: Auto-committed after each refresh (timestamped)

---

## 📝 Manual Sections (Joe's Domain)

### Pending Questions
**Keep entries here manually** — Joe adds answers directly or via notifications.

When Joe answers, Alfred logs it to \`decisions/YYYY-MM.md\` and moves to "Decided" section. Questions not answered within 7 days are escalated via Command Center notification.

### Note Log
Use this for personal notes, reminders, or context that doesn't fit kanban cards:

- [Add as needed]

---

**Created:** 2026-03-09 | **By:** Alfred | **Status:** ✅ LIVE
EOF
  elif restore_from_backup; then
    # Step 2: Fall back to last-known-good backup
    echo "  → Restored from backup (API repair failed)"
  else
    # Step 3: Critical failure
    echo "❌ CRITICAL: Unable to refresh OPEN-LOOPS.md (repair failed, no backup)"
    log_audit "VALIDATION_CRITICAL" "All recovery attempts failed; manual intervention required"
    exit 1
  fi
  
  echo "  ✅ Recovery applied; file restored to valid state"
else
  echo "  → Validation: $validation_result"
fi

# Check staleness of generated file
echo "  → Checking staleness..."
if ! staleness_status=$(check_staleness "$OPEN_LOOPS_FILE"); then
  echo "⚠️  File staleness exceeded: $staleness_status"
  alert_staleness "$staleness_status"
else
  echo "  → Staleness: $staleness_status"
fi

# Clean up backup on success
rm -f "$OPEN_LOOPS_BACKUP"

echo "✅ OPEN-LOOPS.md refreshed at $TIMESTAMP"
log_audit "REFRESH_SUCCESS" "OPEN-LOOPS.md updated with valid kanban data"

# Git commit
cd "$WORKSPACE"
git add OPEN-LOOPS.md
git commit -m "🔄 refresh: OPEN-LOOPS.md at $TIMESTAMP" --quiet 2>/dev/null || true

echo "✅ Committed to git"
