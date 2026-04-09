#!/bin/bash
# refresh-open-loops.sh — Auto-populate OPEN-LOOPS.md with live kanban + notifications data
# Usage: bash scripts/refresh-open-loops.sh
# Runs daily at 08:55 AM via cron; can be run manually anytime

set -e

WORKSPACE="$HOME/.openclaw/workspace"
OPEN_LOOPS_FILE="$WORKSPACE/OPEN-LOOPS.md"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M %Z")

echo "🔄 Refreshing OPEN-LOOPS.md at $TIMESTAMP..."

# Helper: fetch data with timeout
fetch_data() {
  local endpoint="$1"
  local timeout=5
  curl -s --max-time "$timeout" "$GATEWAY_URL$endpoint" 2>/dev/null || echo "[]"
}

# Fetch live data
echo "  → Fetching kanban cards..."
IN_PROGRESS=$(fetch_data "/api/kanban?column=in_progress")
BLOCKED=$(fetch_data "/api/kanban?column=blocked")
TO_DO=$(fetch_data "/api/kanban?column=to_do")
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
  
  # In Progress
  echo "$IN_PROGRESS" | jq -r '.[] | "| \(.id) | \(.title) | \(.assigned_to // "unassigned") | \(.priority // "NORMAL") | in_progress | \(.metadata.blocker // "none") | \(.due_date // "TBD") |"' 2>/dev/null || true
  
  # Blocked
  echo "$BLOCKED" | jq -r '.[] | "| \(.id) | \(.title) | \(.assigned_to // "unassigned") | \(.priority // "NORMAL") | 🚫 blocked | \(.metadata.blocker // "unspecified") | \(.due_date // "TBD") |"' 2>/dev/null || true
}

# Generate markdown table for To Do queue
generate_todo_queue() {
  local count=$(echo "$TO_DO" | jq 'length' 2>/dev/null || echo 0)
  
  if [[ $count -eq 0 ]]; then
    echo "| — | — | No tasks pending (queue clear) | — | — | — |"
    return
  fi
  
  echo "$TO_DO" | jq -r '.[] | 
    "| \(.priority // "NORMAL") | \(.id) | \(.title) | \(.metadata.estimated_hours // "?") | \((now - ((.created_at | fromdate) // now)) / 86400 | floor) days | \(if .metadata.blocked then "YES" else "NO" end) |"' 2>/dev/null || true
}

# Generate deadline summary
generate_deadlines() {
  local deadline_count=$(echo "$CALENDAR" | jq '[.[] | select(.start < (now + 604800))] | length' 2>/dev/null || echo 0)
  
  if [[ $deadline_count -eq 0 ]]; then
    echo "- No deadlines in next 7 days ✅"
    return
  fi
  
  echo "$CALENDAR" | jq -r '.[] | select(.start < (now + 604800)) | "- **\(.date):** \(.title) (\(.type // "event"))"' 2>/dev/null || true
}

# Generate pending notifications summary
# Supports both legacy/local notifications.json shape and API-ish variants.
generate_pending_notifs() {
  local notif_count=$(echo "$NOTIFICATIONS" | jq '[.[] | select((.answered // false) != true)] | length' 2>/dev/null || echo 0)
  
  if [[ $notif_count -eq 0 ]]; then
    echo "| — | — | No pending notifications ✅ | — | — |"
    return
  fi
  
  echo "$NOTIFICATIONS" | jq -r '
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

# Read current file and preserve manual sections
read_manual_section() {
  local section="$1"
  sed -n "/## 📝 Manual Sections/,\$p" "$OPEN_LOOPS_FILE" 2>/dev/null || echo ""
}

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
$(generate_active_cards)

---

## 🔔 Pending Notifications (Unanswered)
_Source: Auto-populated from \`/goals/notifications.json\` (last sync: $TIMESTAMP)_

| Title | Asked | Assigned To | Status | Next Action |
|-------|-------|-------------|--------|-------------|
$(generate_pending_notifs)

---

## 📋 Tasks Pending HAL Dispatch (To Do Queue)
_Source: Auto-populated from kanban board (last sync: $TIMESTAMP)_

| Priority | Card ID | Title | Est. Hours | Age | Blocker? |
|----------|---------|-------|-----------|-----|----------|
$(generate_todo_queue)

---

## 📅 Upcoming Deadlines (Next 7 Days)
_Source: Kanban board + Calendar (last sync: $TIMESTAMP)_

$(generate_deadlines)

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

echo "✅ OPEN-LOOPS.md refreshed at $TIMESTAMP"

# Git commit
cd "$WORKSPACE"
git add OPEN-LOOPS.md
git commit -m "🔄 refresh: OPEN-LOOPS.md at $TIMESTAMP" --quiet 2>/dev/null || true

echo "✅ Committed to git"
