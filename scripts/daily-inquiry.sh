#!/bin/bash
# daily-inquiry.sh — Generate and send thoughtful daily questions
# Purpose: Continuously deepen JOE-PROFILE understanding
# Runs: Daily at 10 AM AST via cron

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
INQUIRY_LOG="$WORKSPACE/memory/inquiry-log.jsonl"
JOE_PROFILE="$WORKSPACE/JOE-PROFILE.md"
DAILY_MEM_DIR="$WORKSPACE/memory"

# Ensure inquiry log exists
mkdir -p "$(dirname "$INQUIRY_LOG")"
touch "$INQUIRY_LOG"

# Helper: Send a notification tagged as daily-inquiry source
send_inquiry() {
  local title="$1"
  local message="$2"
  bash "$SCRIPT_DIR/send-notification.sh" "question" "$title" "$message" "" "" "daily-inquiry"
}

# Check if already sent today
TODAY=$(date +%Y-%m-%d)
LAST_DATE=$(tail -1 "$INQUIRY_LOG" 2>/dev/null | jq -r '.date' 2>/dev/null || echo "")
if [ "$LAST_DATE" = "$TODAY" ]; then
  exit 0
fi

# Clean up old answered notifications (keep only last 30 days to reduce dedup pollution)
CUTOFF_DATE=$(date -v-30d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date --date="-30 days" +%Y-%m-%dT%H:%M:%S 2>/dev/null)
jq "[.[] | select(.answered == false or (.createdAt > \"$CUTOFF_DATE\"))]" "$WORKSPACE/goals/notifications.json" > "${WORKSPACE}/goals/notifications.json.tmp" 2>/dev/null && mv "${WORKSPACE}/goals/notifications.json.tmp" "$WORKSPACE/goals/notifications.json" 2>/dev/null || true

# Get recent answered question titles + unanswered pending notifications to avoid duplicates
# Filter by date: only include questions from last 7 days (not just last 10 entries)
SEVEN_DAYS_AGO=$(date -v-7d +%Y-%m-%d 2>/dev/null || date --date="-7 days" +%Y-%m-%d 2>/dev/null)
RECENT_TITLES=$(awk -F'"' -v cutoff="$SEVEN_DAYS_AGO" '$2 >= cutoff {print}' "$INQUIRY_LOG" 2>/dev/null | jq -r '.title' 2>/dev/null | sort -u | tr '\n' '|' || echo "")
PENDING_NOTIFS=$(jq -r '[.[] | select(.answered == false) | .title] | sort | unique | join("|")' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo "")
ALL_TITLES="$RECENT_TITLES|$PENDING_NOTIFS"

# Pull recent context: last 3 days of memory + today's kanban state
RECENT_MEM=""
for i in 1 2 3; do
  D=$(date -v-${i}d +%Y-%m-%d 2>/dev/null || date --date="-${i} days" +%Y-%m-%d 2>/dev/null)
  F="$DAILY_MEM_DIR/${D}.md"
  if [ -f "$F" ]; then
    RECENT_MEM="$RECENT_MEM\n$(tail -40 "$F")"
  fi
done

KANBAN_STATE=$(curl -s http://localhost:3001/api/kanban 2>/dev/null | jq -r '[.[] | select(.column == "in_progress" or .column == "review" or .column == "blocked") | "\(.column): \(.title)"] | join(", ")' 2>/dev/null || echo "")

# Theme rotation (4 themes)
CYCLE_NUM=$(( ($(wc -l < "$INQUIRY_LOG") % 4) + 1 ))

# Build stronger dedup filter: get all questions asked in last 7 days by scanning inquiry-log + notifications
# Calculate 7 days ago as epoch timestamp
SEVEN_DAYS_EPOCH=$(date -j -f "%s" "$(date -v-7d +%s 2>/dev/null || date --date="-7 days" +%s)" +%s 2>/dev/null || date +%s -d "7 days ago")
ASKED_RECENTLY=$(jq -r "[.[] | select(.last_asked != null and (.last_asked | tonumber) > ($SEVEN_DAYS_EPOCH - 604800)) | .topic] | sort | unique | join(\"|\")" "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo "")

# Build a dynamic question using claude/haiku for real freshness
CONTEXT_BLOCK="Recent memory:\n$RECENT_MEM\n\nActive kanban: $KANBAN_STATE\n\nRecent question titles + pending notifications (avoid repeating): $ALL_TITLES"

THEME_HINT=""
case $CYCLE_NUM in
  1) THEME_HINT="project synergies or cross-project opportunities" ;;
  2) THEME_HINT="vision, roadmap, priorities, or 90-day focus" ;;
  3) THEME_HINT="workflow, friction, delegation, or how Alfred can help better" ;;
  4) THEME_HINT="passive income strategy, app monetization, or new revenue ideas" ;;
esac

# Use claude to generate a fresh question (haiku for cost)
PROMPT="You are Alfred, Joe's AI assistant. Based on context below, generate ONE thoughtful daily inquiry for Joe on the theme: $THEME_HINT.

Rules:
- Must be genuinely fresh — do NOT reuse any title from the recent list OR any pending unanswered notifications
- Ground it in something real from recent memory/kanban if possible
- Title: short (5-10 words), specific, intriguing
- Body: 2-3 short paragraphs, include specific observations, end with a clear question
- Tone: curious, direct, not corporate
- Output JSON only: {\"title\": \"...\", \"body\": \"...\"}

Context:
$CONTEXT_BLOCK"

RESULT=$(echo "$PROMPT" | claude --model claude-haiku-4-5 --no-markdown -p "" 2>/dev/null || echo "")

# Parse result
TITLE=$(echo "$RESULT" | jq -r '.title' 2>/dev/null || echo "")
BODY=$(echo "$RESULT" | jq -r '.body' 2>/dev/null || echo "")

# Fallback: if claude failed or parsing broke, use a hardcoded fresh question pool
if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
  # Fallback pool — 30+ questions to prevent 7-day window from cycling
  # Format: title|body|topic
  FALLBACKS=(
    "Consulting: recurring client problem → product idea?|You've been doing automation consulting. Has any client problem come up repeatedly—something generic enough to turn into a $49+/mo SaaS? Worth a weekend prototype?|consulting-opportunity"
    "Signal App: what's the #1 blocker right now?|Not a full status update—just one sentence: what's the current bottleneck on Signal App? Data quality? Time? Technical debt? Knowing helps me prioritize overnight work.|signal-blocker"
    "Even Us Up: monetization sprint or maintenance mode?|Even Us Up has been running. Is it growing naturally or on life support? Should I explore monetization (paid tier, B2B) or keep the lights on at minimum?|even-us-up-strategy"
    "Tedious recurring task you still do manually?|You hired me for tedium. What's one thing you do regularly that shouldn't need your attention? Even small chores—I can probably automate or cut friction.|automation-friction"
    "What's your actual passive income target?|Is it $500/mo, $5k/mo, or $50k/mo? Having a concrete number helps me think about which projects move the needle. What does 'enough' look like?|passive-income-target"
    "What's the weakest part of your consulting business right now?|Where does your consulting work slow down or lose deals? Sales pitch, delivery, client retention, or something else?|consulting-weakness"
    "Could Signal App be packaged for non-trading uses?|You built Signal App for crypto. Could the core signal logic work for other markets—stocks, commodities, forex? New verticals = new revenue.|signal-expansion"
    "Which project deserves a dedicated sprint next?|You have CoinUsUp, Signal App, Even Us Up, and consulting. If you picked one for a 2-week sprint, what would move the needle most?|project-priority"
    "Any new app idea you've been researching?|Beyond your current projects, has something caught your attention lately? A tool you wish existed, a market gap you noticed?|new-idea-pipeline"
    "How should I prioritize overnight work differently?|Are you happy with how I spend idle hours, or would you prefer I focus differently? More feature work? More research? More system improvements?|alfred-optimization"
    "What does success look like for CoinUsUp right now?|Growth, profitability, feature completeness, or something else? One concrete win would help me suggest next steps.|coinusup-vision"
    "Is there a consulting project you could productize?|Have you done the same consulting engagement 2+ times? That's a product idea waiting to happen—could be a tool or SaaS.|productize-consulting"
    "What's preventing Even Us Up from growing faster?|Marketing, features, user friction, or just low priority? One honest sentence about the blocker helps me identify next steps.|even-us-up-blocker"
    "Passive income bet you'd make if risk was zero?|If you had unlimited time/energy and no failure risk, which of your current ideas would you double down on? That tells me where your real interest is.|passive-income-bet"
    "How much time should I expect you to invest in new ideas?|Are you thinking 5 hrs/week on new projects, or is everything maintenance mode right now? Helps me calibrate what's realistic.|capacity-expectations"
    "What's the most annoying part of your current workflow?|Not the biggest problem—just the thing that bugs you most in daily work. Sometimes small friction kills motivation.|workflow-friction"
    "CoinUsUp: organic growth or paid marketing?|Is CoinUsUp scaling naturally through word-of-mouth, or does it need ad spend? Do you have a growth budget in mind?|coinusup-growth"
    "What's one feature users keep asking for?|Any recurring feedback on your apps that you've been ignoring? Could be quick win or real insight into what's missing.|feature-requests"
    "How much of your week is client work vs own projects?|Rough split would help me understand what percentage of time should go to passive income vs consulting.|time-split"
    "If you had to pick one metric to grow, what is it?|Revenue, users, features shipped, or something else? What does winning look like in the next 90 days?|success-metric"
    "Are there manual processes in your consulting work?|Beyond code—invoicing, scheduling, proposal generation, follow-up, reporting? Any of these could be partially automated.|consulting-automation"
    "What's the longest-running bug or debt in your apps?|Not a critical issue—just technical debt that's been nagging you. Worth tackling, or deprioritized?|technical-debt"
    "How do you currently find new consulting clients?|Referrals, inbound, networking, or actively pitching? Any method that's working exceptionally well?|consulting-pipeline"
    "What would make Even Us Up more sticky?|Better UX, gamification, integration with other tools, pricing change? What keeps users coming back?|user-retention"
    "Is your tech stack still serving you?|Doing any refactoring or migration plans? Any tools or frameworks you wish you were using instead?|tech-stack"
    "What does a \"perfect\" week look like for you?|Time breakdown: consulting, own projects, learning, admin, family. Understanding your ideal helps me prioritize better.|ideal-week"
    "Any startup ideas you've been sitting on?|Not just apps—could be services, communities, content. Sometimes ideas need just the right moment.|startup-ideas"
    "How often do you think about quitting consulting?|Rhetorical, but does it still energize you, or is it becoming a drag? Tells me whether passive income is escape or growth.|consulting-mindset"
    "What's the ROI of your current passive income work?|Time invested vs $ earned over last 90 days? Helps prioritize which projects deserve more focus.|passive-roi"
    "If one of your apps could go viral, which would you choose?|Which project would excite you most if it suddenly 10x'd? That's a signal of where your real interest is.|viral-choice"
  )
  
  # Build a set of recent topics to avoid (stricter: 7-day window to prevent 4-day cycle repeats)
  # Check inquiry-log for topics asked in last 7 days
  RECENT_TOPICS=$(awk -v cutoff="$SEVEN_DAYS_AGO" '$0 >= cutoff' "$INQUIRY_LOG" 2>/dev/null | jq -r '.topic // "unknown"' 2>/dev/null | sort -u | tr '\n' '|' || echo "")
  
  # Also check notifications for answered items (these shouldn't be asked again)
  ANSWERED_TOPICS=$(jq -r '[.[] | select(.answered == true) | .topic // .title] | sort | unique | join("|")' "$WORKSPACE/goals/notifications.json" 2>/dev/null || echo "")
  
  ALL_TOPICS="$RECENT_TOPICS|$ANSWERED_TOPICS"
  
  # Pick first fallback not asked in last 7 days (stricter dedup to prevent cycling)
  PICKED=0
  for entry in "${FALLBACKS[@]}"; do
    FB_TITLE="${entry%%|*}"
    FB_BODY="${entry#*|}"; FB_BODY="${FB_BODY%%|*}"
    FB_TOPIC="${entry##*|}"
    
    # Skip if topic was asked in last 7 days (prevents 4-day cycle from repeating)
    if [[ "$ALL_TOPICS" != *"$FB_TOPIC"* ]]; then
      TITLE="$FB_TITLE"
      BODY="$FB_BODY"
      TOPIC="$FB_TOPIC"
      PICKED=1
      break
    fi
  done
  
  # If all topics exhausted, pick oldest one by last_asked timestamp (fair rotation)
  if [ $PICKED -eq 0 ]; then
    FALLBACK_POOL=$(cat <<'EOF'
consulting-opportunity|passive-income-target|signal-blocker|even-us-up-strategy|automation-friction|consulting-weakness|signal-expansion|project-priority|new-idea-pipeline|alfred-optimization|coinusup-vision|productize-consulting|even-us-up-blocker|passive-income-bet|capacity-expectations|workflow-friction
EOF
)
    # Pick the first one (oldest rotation, resets pool fairly)
    FIRST_TOPIC=$(echo "$FALLBACK_POOL" | cut -d'|' -f1)
    
    # Find matching entry
    for entry in "${FALLBACKS[@]}"; do
      FB_TOPIC="${entry##*|}"
      if [ "$FB_TOPIC" = "$FIRST_TOPIC" ]; then
        FB_TITLE="${entry%%|*}"
        FB_BODY="${entry#*|}"; FB_BODY="${FB_BODY%%|*}"
        TITLE="$FB_TITLE"
        BODY="$FB_BODY"
        TOPIC="$FB_TOPIC"
        break
      fi
    done
  fi
fi

# Send if we have content
if [ -n "$TITLE" ] && [ -n "$BODY" ]; then
  send_inquiry "$TITLE" "$BODY"
  # Log with topic for stronger dedup on future runs
  TOPIC="${TOPIC:-unknown}"
  echo "{\"date\":\"$TODAY\",\"title\":\"$TITLE\",\"topic\":\"$TOPIC\",\"cycle\":$CYCLE_NUM}" >> "$INQUIRY_LOG"
  
  # Update question tracking file (7-day dedup enforcement)
  TRACKING_FILE="$WORKSPACE/memory/question-tracking.json"
  if [ -f "$TRACKING_FILE" ]; then
    # Update last_asked + increment count for this topic
    jq --arg topic "$TOPIC" --arg today "$TODAY" '.topics[$topic].last_asked = $today | .topics[$topic].count += 1 | .last_updated = now | tostring' "$TRACKING_FILE" > "${TRACKING_FILE}.tmp" 2>/dev/null && mv "${TRACKING_FILE}.tmp" "$TRACKING_FILE" 2>/dev/null || true
  fi
fi
