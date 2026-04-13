#!/bin/bash
# daily-inquiry-v2.sh — Generate and send daily questions with semantic deduplication
# Purpose: Continuously deepen JOE-PROFILE understanding without duplicate fatigue
# Runs: Daily at 10 AM AST via cron
#
# IMPROVEMENTS OVER V1:
# - Semantic deduplication (not just exact title matching)
# - 7-14 day smart cooldown windows
# - Escalation logic for new evidence/context
# - Dedup metrics in Command Center
# - Stale question handling

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
INQUIRY_LOG="$WORKSPACE/memory/inquiry-log.jsonl"
NOTIFICATIONS="$WORKSPACE/goals/notifications.json"
TRACKING_FILE="$WORKSPACE/memory/question-tracking.json"
DEDUP_ENGINE="$SCRIPT_DIR/notification-dedup-engine.js"

# Ensure inquiry log exists
mkdir -p "$(dirname "$INQUIRY_LOG")"
touch "$INQUIRY_LOG"

# Check if already sent a SUCCESSFUL inquiry today
TODAY=$(date +%Y-%m-%d)
LAST_ENTRY=$(tail -1 "$INQUIRY_LOG" 2>/dev/null | jq -r '.' 2>/dev/null || echo "")
LAST_DATE=$(echo "$LAST_ENTRY" | jq -r '.date' 2>/dev/null || echo "")
LAST_TITLE=$(echo "$LAST_ENTRY" | jq -r '.title' 2>/dev/null || echo "")

# If last entry is today AND it's not a BLOCKED/SKIPPED entry, we already sent one
if [ "$LAST_DATE" = "$TODAY" ] && [[ "$LAST_TITLE" != "BLOCKED:"* ]] && [[ "$LAST_TITLE" != "SKIPPED"* ]]; then
  exit 0
fi

# Evergreen question pool (7 rotating questions)
# These are sized to prevent repeat within ~8 days (7 questions + 7-day cooldown)
FALLBACKS=(
  "What's the one thing that would unlock the next growth phase for CoinUsUp?|Not what you're working on now—what if you changed one thing, would unlock the next phase? UI, pricing, features, marketing, partnerships?|coinusup-growth"
  "Is there a metric you watch daily on any of your apps?|What number do you check first thing—DAU, MRR, churn, feature usage, bug count? What would make you celebrate?|app-metrics"
  "Should any of your apps become more opinionated or simpler?|Some apps try to be everything; others own one thing really well. Where are you on that spectrum, and should you shift?|product-philosophy"
  "What would stop you from building something new right now?|Not time or money—what's the actual blocker? Not knowing the idea? Technical risk? Support burden?|blocker-to-new"
  "For Even Us Up, what's the smallest win that would feel like real progress?|Not 'become the next Splitwise'—what would feel like legitimate traction in the next 3 months?|even-us-up"
  "What would make your consulting work more systematic or scalable?|Right now it's bespoke. Could you build repeatable templates, productize pieces, or just accept it's 1-on-1?|consulting-scaling"
  "How much of your time should passive income get vs. client work right now?|Current split works? Skewed the wrong way? What's the ideal?|time-allocation"
)

# Pick a question from fallback pool (daily rotation based on line count)
CYCLE_NUM=$(( ($(wc -l < "$INQUIRY_LOG" 2>/dev/null || echo 0) % ${#FALLBACKS[@]}) ))
ENTRY="${FALLBACKS[$CYCLE_NUM]}"

TITLE="${ENTRY%%|*}"
REST="${ENTRY#*|}"
BODY="${REST%%|*}"
TOPIC="${ENTRY##*|}"

# ===== SEMANTIC DEDUPLICATION CHECK =====
# Run the dedup engine to check if this question should be suppressed
DEDUP_RESULT=$(node "$DEDUP_ENGINE" check --title "$TITLE" --body "$BODY" --source "daily-inquiry" --json 2>/dev/null || echo "{}")
SUPPRESSED=$(echo "$DEDUP_RESULT" | jq -r '.suppressed // false' 2>/dev/null)
SUPPRESS_REASON=$(echo "$DEDUP_RESULT" | jq -r '.reason // "unknown"' 2>/dev/null)
TOPIC_KEY=$(echo "$DEDUP_RESULT" | jq -r '.topic // ""' 2>/dev/null)

if [ "$SUPPRESSED" = "true" ]; then
  DAYS_REMAINING=$(echo "$DEDUP_RESULT" | jq -r '.days_remaining // "?"' 2>/dev/null)
  echo "{\"date\":\"$TODAY\",\"title\":\"SUPPRESSED\",\"topic\":\"$TOPIC_KEY\",\"reason\":\"$SUPPRESS_REASON\",\"days_remaining\":$DAYS_REMAINING}" >> "$INQUIRY_LOG"
  
  # Log suppression to Discord (optional, for visibility)
  # bash "$SCRIPT_DIR/send-notification.sh" alert "Daily Inquiry Suppressed" "Topic: $TOPIC_KEY\nReason: $SUPPRESS_REASON\nDays remaining: $DAYS_REMAINING" "" "" "daily-inquiry-dedup" 2>/dev/null || true
  
  exit 0
fi

# ===== SEND NOTIFICATION =====
# Question passed dedup check. Send it.
POLICY_DEDUP_KEY="daily-inquiry:$(date +%Y-%m-%d):$TOPIC" \
POLICY_DEDUP_WINDOW_SEC=86400 \
bash "$SCRIPT_DIR/send-notification.sh" "question" "$TITLE" "$BODY" "" "" "daily-inquiry" 2>/dev/null || true

# Log success
echo "{\"date\":\"$TODAY\",\"title\":\"$TITLE\",\"topic\":\"$TOPIC\",\"cycle\":$CYCLE_NUM,\"semantic_topic\":\"$TOPIC_KEY\"}" >> "$INQUIRY_LOG"

# Update tracking file with last_asked date (legacy, kept for compatibility)
python3 << PYSCRIPT
import json
import time

try:
    with open("$WORKSPACE/memory/question-tracking.json", "r") as f:
        data = json.load(f)
except:
    data = {"schema_version": "1.0", "topics": {}, "last_updated": 0}

topic = "$TOPIC"
today = "$TODAY"

if topic not in data.get("topics", {}):
    data.setdefault("topics", {})[topic] = {"last_asked": None, "count": 0}

data["topics"][topic]["last_asked"] = today
data["topics"][topic]["count"] = data["topics"][topic].get("count", 0) + 1
data["last_updated"] = time.time()

with open("$WORKSPACE/memory/question-tracking.json", "w") as f:
    json.dump(data, f, indent=2)
PYSCRIPT
 2>/dev/null || true
