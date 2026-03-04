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
RECENT_TITLES=$(tail -10 "$INQUIRY_LOG" 2>/dev/null | jq -r '.title' 2>/dev/null | sort -u | tr '\n' '|' || echo "")
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
  # Fallback pool — these are backups, not the primary mechanism
  FALLBACKS=(
    "Consulting client: automation idea worth productizing?|You've been doing automation consulting work. Has any client problem come up repeatedly — something generic enough to turn into a product? Even a $49/mo niche SaaS. Worth investigating?"
    "What's the #1 thing slowing down Signal App right now?|Not looking for a full status update — just one honest sentence: what's the current bottleneck on Signal App? Is it data quality, time, a specific technical problem, or something else? Knowing this helps me prioritize overnight work."
    "Should Even Us Up get a monetization push or maintenance mode?|Even Us Up has been running. Is it growing on its own, or is it on life support? Should I look into monetization experiments (paid tier, integrations) or just keep the lights on?"
    "What's a tedious recurring task you still do manually?|You hired me to handle tedium. What's something you still do regularly that feels like it shouldn't need your attention? Even small things — I can probably automate or at least reduce the friction."
  )
  # Pick one not in recent titles or pending notifications
  for entry in "${FALLBACKS[@]}"; do
    FB_TITLE="${entry%%|*}"
    FB_BODY="${entry##*|}"
    if [[ "$ALL_TITLES" != *"$FB_TITLE"* ]]; then
      TITLE="$FB_TITLE"
      BODY="$FB_BODY"
      break
    fi
  done
fi

# Send if we have content
if [ -n "$TITLE" ] && [ -n "$BODY" ]; then
  send_inquiry "$TITLE" "$BODY"
  echo "{\"date\":\"$TODAY\",\"title\":\"$TITLE\",\"cycle\":$CYCLE_NUM}" >> "$INQUIRY_LOG"
fi
