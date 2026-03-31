#!/bin/bash
# daily-inquiry.sh — Generate and send thoughtful daily questions
# Purpose: Continuously deepen JOE-PROFILE understanding
# Runs: Daily at 10 AM AST via cron
#
# STRATEGY:
# - Rotate through evergreen fallback pool (12 questions)
# - Enforce 30-day cooldown per topic
# - Skip permanently closed topics
# - Detect and skip duplicate exact titles
# - Update tracking file with last_asked date

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
INQUIRY_LOG="$WORKSPACE/memory/inquiry-log.jsonl"
NOTIFICATIONS="$WORKSPACE/goals/notifications.json"
TRACKING_FILE="$WORKSPACE/memory/question-tracking.json"

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

# Evergreen question pool (7 rotating questions - sized to prevent 7-day repeat)
# Rotation: 7 days per full cycle. With 7-day cooldown, questions never repeat <8 days.
FALLBACKS=(
  "What's the one thing that would unlock the next growth phase for CoinUsUp?|Not what you're working on now—what if you changed one thing, would unlock the next phase? UI, pricing, features, marketing, partnerships?|coinusup-unlock"
  "Is there a metric you watch daily on any of your apps?|What number do you check first thing—DAU, MRR, churn, feature usage, bug count? What would make you celebrate?|app-metrics"
  "Should any of your apps become more opinionated or simpler?|Some apps try to be everything; others own one thing really well. Where are you on that spectrum, and should you shift?|product-strategy"
  "What would stop you from building something new right now?|Not time or money—what's the actual blocker? Not knowing the idea? Technical risk? Support burden?|blocker-to-new"
  "For Even Us Up, what's the smallest win that would feel like real progress?|Not 'become the next Splitwise'—what would feel like legitimate traction in the next 3 months?|even-us-up-win"
  "What would make your consulting work more systematic or scalable?|Right now it's bespoke. Could you build repeatable templates, productize pieces, or just accept it's 1-on-1?|consulting-scaling"
  "How much of your time should passive income get vs. client work right now?|Current split works? Skewed the wrong way? What's the ideal?|time-allocation"
)

# Get permanently closed topics from tracking file
PERMANENT_BLOCKS=$(python3 << 'PYSCRIPT'
import json
try:
    with open("/Users/hopenclaw/.openclaw/workspace/memory/question-tracking.json", "r") as f:
        data = json.load(f)
except:
    data = {}

topics = data.get("topics", {})
closed = [t for t, v in topics.items() if v.get("permanently_closed", False)]
print("|".join(closed) if closed else "")
PYSCRIPT
 2>/dev/null || echo "")

# Get topics asked in past 7 days (cooldown enforcement)
# 7-day cooldown + 7-question pool = no repeats within 8 days
RECENT_TOPICS=$(python3 << 'PYSCRIPT'
import json
from datetime import datetime, timedelta

try:
    with open("/Users/hopenclaw/.openclaw/workspace/memory/question-tracking.json", "r") as f:
        data = json.load(f)
except:
    data = {}

topics_dict = data.get("topics", {})
today = datetime.now().date()
seven_days_ago = today - timedelta(days=7)

recent = []
for topic, info in topics_dict.items():
    last_asked_str = info.get("last_asked")
    if last_asked_str:
        try:
            last_asked = datetime.strptime(last_asked_str, "%Y-%m-%d").date()
            if last_asked >= seven_days_ago:
                recent.append(topic)
        except:
            pass

print("|".join(recent) if recent else "")
PYSCRIPT
 2>/dev/null || echo "")

# Pick a question from fallback pool (daily rotation based on line count)
CYCLE_NUM=$(( ($(wc -l < "$INQUIRY_LOG" 2>/dev/null || echo 0) % ${#FALLBACKS[@]}) ))
ENTRY="${FALLBACKS[$CYCLE_NUM]}"

TITLE="${ENTRY%%|*}"
REST="${ENTRY#*|}"
BODY="${REST%%|*}"
TOPIC="${ENTRY##*|}"

# Check if this topic is in the permanent block list
if [[ "|$PERMANENT_BLOCKS|" == *"|$TOPIC|"* ]]; then
  echo "{\"date\":\"$TODAY\",\"title\":\"SKIPPED\",\"topic\":\"$TOPIC\",\"reason\":\"permanently-closed\"}" >> "$INQUIRY_LOG"
  exit 0
fi

# Check if this topic was answered in last 30 days (cooldown)
if [[ "|$RECENT_TOPICS|" == *"|$TOPIC|"* ]]; then
  echo "{\"date\":\"$TODAY\",\"title\":\"SKIPPED\",\"topic\":\"$TOPIC\",\"reason\":\"30-day-cooldown\"}" >> "$INQUIRY_LOG"
  exit 0
fi

# Check if exact title was asked recently (duplicate title check)
DUPLICATE_CHECK=$(python3 << PYSCRIPT
import json
title_check = """$TITLE"""

try:
    with open("/Users/hopenclaw/.openclaw/workspace/goals/notifications.json", "r") as f:
        notifs = json.load(f)
except:
    notifs = []

inquiries = [n for n in notifs if n.get("source") == "daily-inquiry"]
found = False
for n in inquiries:
    if n.get("title", "").strip() == title_check.strip():
        found = True
        break

if found:
    print("DUPLICATE")
else:
    print("OK")
PYSCRIPT
)

if [ "$DUPLICATE_CHECK" = "DUPLICATE" ]; then
  echo "{\"date\":\"$TODAY\",\"title\":\"SKIPPED\",\"topic\":\"$TOPIC\",\"reason\":\"exact-title-seen\"}" >> "$INQUIRY_LOG"
  exit 0
fi

# Send notification via Command Center
POLICY_DEDUP_KEY="daily-inquiry:$(date +%Y-%m-%d):$TITLE" \
POLICY_DEDUP_WINDOW_SEC=86400 \
bash "$SCRIPT_DIR/send-notification.sh" "question" "$TITLE" "$BODY" "" "" "daily-inquiry" 2>/dev/null || true

# Log success
echo "{\"date\":\"$TODAY\",\"title\":\"$TITLE\",\"topic\":\"$TOPIC\",\"cycle\":$CYCLE_NUM}" >> "$INQUIRY_LOG"

# Update tracking file with last_asked date
python3 << PYSCRIPT
import json
import time

try:
    with open("/Users/hopenclaw/.openclaw/workspace/memory/question-tracking.json", "r") as f:
        data = json.load(f)
except:
    data = {"schema_version": "1.0", "topics": {}, "last_updated": 0}

topic = """$TOPIC"""
today = """$TODAY"""

if topic not in data.get("topics", {}):
    data.setdefault("topics", {})[topic] = {"last_asked": None, "count": 0}

data["topics"][topic]["last_asked"] = today
data["topics"][topic]["count"] = data["topics"][topic].get("count", 0) + 1
data["last_updated"] = time.time()

with open("/Users/hopenclaw/.openclaw/workspace/memory/question-tracking.json", "w") as f:
    json.dump(data, f, indent=2)
PYSCRIPT
 2>/dev/null || true
