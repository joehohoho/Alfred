#!/bin/bash
# daily-inquiry.sh — Generate and send thoughtful daily questions
# Purpose: Continuously deepen JOE-PROFILE understanding
# Runs: Daily at 10 AM AST via cron
#
# DEDUP STRATEGY (2026-03-19 rewrite):
#   1. Read ALL previous questions from notifications.json (source=daily-inquiry)
#   2. Extract titles + Joe's answers
#   3. Topics Joe has CLOSED (answered "no", "already answered", etc.) are permanently blocked
#   4. Topics Joe has answered are on a 30-day cooldown (not 7-day)
#   5. The LLM prompt includes the full history so it can avoid semantic duplicates
#   6. Fallback pool uses permanent block list + 30-day cooldown per topic

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
INQUIRY_LOG="$WORKSPACE/memory/inquiry-log.jsonl"
JOE_PROFILE="$WORKSPACE/JOE-PROFILE.md"
NOTIFICATIONS="$WORKSPACE/goals/notifications.json"
TRACKING_FILE="$WORKSPACE/memory/question-tracking.json"
DAILY_MEM_DIR="$WORKSPACE/memory"

# Ensure inquiry log exists
mkdir -p "$(dirname "$INQUIRY_LOG")"
touch "$INQUIRY_LOG"

# Helper: Send a notification tagged as daily-inquiry source
send_inquiry() {
  local title="$1"
  local message="$2"
  local dedup_key="daily-inquiry:$(date +%Y-%m-%d):$title"
  POLICY_DEDUP_KEY="$dedup_key" \
  POLICY_DEDUP_WINDOW_SEC=86400 \
  POLICY_AUDIT_ONLY="${POLICY_AUDIT_ONLY:-0}" \
  bash "$SCRIPT_DIR/send-notification.sh" "question" "$title" "$message" "" "" "daily-inquiry"
}

# Check if already sent today
TODAY=$(date +%Y-%m-%d)
LAST_DATE=$(tail -1 "$INQUIRY_LOG" 2>/dev/null | jq -r '.date' 2>/dev/null || echo "")
if [ "$LAST_DATE" = "$TODAY" ]; then
  exit 0
fi

# ── Step 1: Build comprehensive history from notifications.json ──
# Extract ALL daily-inquiry questions ever asked, with titles and answers
PREV_QUESTIONS=$(python3 -c "
import json, sys
try:
    with open('$NOTIFICATIONS', 'r') as f:
        notifs = json.load(f)
except:
    notifs = []

# Filter to daily-inquiry questions only
inquiries = [n for n in notifs if n.get('source') == 'daily-inquiry']

history_lines = []
closed_topics = []
for n in inquiries:
    title = n.get('title', '')
    answered = n.get('answered', False)
    answer = n.get('userAnswer', '').strip().lower() if n.get('userAnswer') else ''

    status = 'unanswered'
    if answered:
        # Detect if Joe closed this topic permanently
        close_signals = [
            'no', 'none', 'not worth', 'already answered', 'duplicate',
            'repeat', 'asked before', 'don\\'t keep asking', 'same question',
            'there is nothing', 'hasn\\'t been', 'i\\'ve already answered'
        ]
        is_closed = any(sig in answer for sig in close_signals)
        if is_closed:
            status = 'CLOSED'
            closed_topics.append(title)
        else:
            status = 'answered'

    history_lines.append(f'- [{status}] {title}')
    if answered and answer:
        # Truncate long answers
        short = answer[:150] + '...' if len(answer) > 150 else answer
        history_lines.append(f'  Joe said: {short}')

print('\\n'.join(history_lines))
" 2>/dev/null || echo "")

# ── Step 2: Build closed-topic list (permanently blocked) ──
CLOSED_TOPICS=$(python3 -c "
import json
try:
    with open('$NOTIFICATIONS', 'r') as f:
        notifs = json.load(f)
except:
    notifs = []

inquiries = [n for n in notifs if n.get('source') == 'daily-inquiry']
closed = set()
close_signals = [
    'no', 'none', 'not worth', 'already answered', 'duplicate',
    'repeat', 'asked before', 'don\\'t keep asking', 'same question',
    'there is nothing', 'hasn\\'t been', 'i\\'ve already answered'
]
for n in inquiries:
    answer = (n.get('userAnswer') or '').strip().lower()
    if n.get('answered') and any(sig in answer for sig in close_signals):
        closed.add(n.get('title', ''))
print('|'.join(closed))
" 2>/dev/null || echo "")

# ── Step 3: Build answered-within-30-days list (cooldown) ──
THIRTY_DAYS_AGO=$(date -v-30d +%Y-%m-%dT 2>/dev/null || date --date="-30 days" +%Y-%m-%dT 2>/dev/null)
RECENT_ANSWERED_TITLES=$(python3 -c "
import json
try:
    with open('$NOTIFICATIONS', 'r') as f:
        notifs = json.load(f)
except:
    notifs = []

cutoff = '$THIRTY_DAYS_AGO'
inquiries = [n for n in notifs if n.get('source') == 'daily-inquiry' and n.get('answered')]
recent = [n['title'] for n in inquiries if (n.get('answeredAt') or '') >= cutoff]
print('|'.join(recent))
" 2>/dev/null || echo "")

# ── Step 4: Get current kanban + recent memory context ──
RECENT_MEM=""
for i in 1 2 3; do
  D=$(date -v-${i}d +%Y-%m-%d 2>/dev/null || date --date="-${i} days" +%Y-%m-%d 2>/dev/null)
  F="$DAILY_MEM_DIR/${D}.md"
  if [ -f "$F" ]; then
    RECENT_MEM="$RECENT_MEM\n$(tail -40 "$F")"
  fi
done

KANBAN_STATE=$(curl -s http://localhost:3001/api/kanban 2>/dev/null | jq -r '[.[] | select(.column == "in_progress" or .column == "review" or .column == "blocked") | "\(.column): \(.title)"] | join(", ")' 2>/dev/null || echo "")

# ── Step 5: Theme rotation (4 themes) ──
CYCLE_NUM=$(( ($(wc -l < "$INQUIRY_LOG") % 4) + 1 ))
THEME_HINT=""
case $CYCLE_NUM in
  1) THEME_HINT="current in-progress work, active blockers, or technical challenges" ;;
  2) THEME_HINT="vision, roadmap, priorities, or 90-day focus" ;;
  3) THEME_HINT="workflow, friction, delegation, or how Alfred can help better" ;;
  4) THEME_HINT="passive income strategy, app monetization, or new revenue ideas" ;;
esac

# ── Step 6: Try LLM-generated question first ──
CONTEXT_BLOCK="Recent memory:\n$RECENT_MEM\n\nActive kanban: $KANBAN_STATE\n\nFull history of previous daily inquiry questions and Joe's responses:\n$PREV_QUESTIONS"

PROMPT="You are Alfred, Joe's AI assistant. Generate ONE thoughtful daily inquiry for Joe on the theme: $THEME_HINT.

CRITICAL DEDUP RULES — violating these wastes Joe's time and erodes trust:
1. Below is the COMPLETE history of every daily inquiry ever sent, with Joe's answers.
2. Do NOT ask any question that is semantically similar to a previous one — even if worded differently.
3. If Joe answered 'no', 'not worth it', 'already answered', or 'duplicate' — that topic is PERMANENTLY CLOSED. Never revisit it.
4. If Joe already provided a clear answer to a topic, do NOT re-ask unless there is NEW concrete information that changes the context.
5. Ground your question in something SPECIFIC from the recent memory or kanban — not generic prompts.
6. If you cannot think of a genuinely new question, output: {\"title\": \"SKIP\", \"body\": \"No fresh question today\"}

CLOSED TOPICS (never ask about these again):
- Consulting client problems / productizing consulting — Joe said NO multiple times
- Passive income target — Joe already answered (\$5-10k/month)
- Cross-project synergies — Joe said not worth following up
- What's your vision for next 3 months — Joe already answered
- Where am I asking questions I shouldn't — Joe already answered with clear rules

Format: Output JSON only: {\"title\": \"...\", \"body\": \"...\"}
Title: short (5-10 words), specific to current work, not a repeat.
Body: 2-3 short paragraphs grounded in recent activity. End with a clear question.

Context:
$CONTEXT_BLOCK"

RESULT=$(echo "$PROMPT" | claude --model claude-haiku-4-5 --no-markdown -p "" 2>/dev/null || echo "")

# Parse result
TITLE=$(echo "$RESULT" | jq -r '.title' 2>/dev/null || echo "")
BODY=$(echo "$RESULT" | jq -r '.body' 2>/dev/null || echo "")

# If LLM said SKIP, respect it
if [ "$TITLE" = "SKIP" ]; then
  echo "{\"date\":\"$TODAY\",\"title\":\"SKIPPED\",\"topic\":\"none\",\"cycle\":$CYCLE_NUM,\"reason\":\"no-fresh-question\"}" >> "$INQUIRY_LOG"
  exit 0
fi

# ── Step 7: Fallback pool with proper dedup ──
if [ -z "$TITLE" ] || [ -z "$BODY" ]; then
  # Fallback questions — focused on CURRENT work, not generic recurring prompts
  # Permanently retired topics removed from this pool
  FALLBACKS=(
    "Could Signal App be packaged for non-trading uses?|You built Signal App for crypto. Could the core signal logic work for other markets—stocks, commodities, forex? New verticals = new revenue.|signal-expansion"
    "Which project deserves a dedicated sprint next?|You have CoinUsUp, Signal App, Even Us Up, and consulting. If you picked one for a 2-week sprint, what would move the needle most?|project-priority"
    "Any new app idea you've been researching?|Beyond your current projects, has something caught your attention lately? A tool you wish existed, a market gap you noticed?|new-idea-pipeline"
    "How should I prioritize overnight work differently?|Are you happy with how I spend idle hours, or would you prefer I focus differently? More feature work? More research? More system improvements?|alfred-optimization"
    "What does success look like for CoinUsUp right now?|Growth, profitability, feature completeness, or something else? One concrete win would help me suggest next steps.|coinusup-vision"
    "What's preventing Even Us Up from growing faster?|Marketing, features, user friction, or just low priority? One honest sentence about the blocker helps me identify next steps.|even-us-up-blocker"
    "What's the most annoying part of your current workflow?|Not the biggest problem—just the thing that bugs you most in daily work. Sometimes small friction kills motivation.|workflow-friction"
    "CoinUsUp: organic growth or paid marketing?|Is CoinUsUp scaling naturally through word-of-mouth, or does it need ad spend? Do you have a growth budget in mind?|coinusup-growth"
    "What's one feature users keep asking for?|Any recurring feedback on your apps that you've been ignoring? Could be quick win or real insight into what's missing.|feature-requests"
    "What's the longest-running bug or debt in your apps?|Not a critical issue—just technical debt that's been nagging you. Worth tackling, or deprioritized?|technical-debt"
    "What would make Even Us Up more sticky?|Better UX, gamification, integration with other tools, pricing change? What keeps users coming back?|user-retention"
    "What does a perfect week look like for you?|Time breakdown: consulting, own projects, learning, admin, family. Understanding your ideal helps me prioritize better.|ideal-week"
    "If one of your apps could go viral, which would you choose?|Which project would excite you most if it suddenly 10x'd? That's a signal of where your real interest is.|viral-choice"
  )

  # Build block list: closed topics + answered within 30 days
  BLOCK_LIST="$CLOSED_TOPICS|$RECENT_ANSWERED_TITLES"

  # Also permanently block these topics based on Joe's explicit feedback
  PERMANENT_BLOCKS="consulting-opportunity|productize-consulting|passive-income-target|capacity-expectations|consulting-weakness|consulting-pipeline|consulting-automation|consulting-mindset|passive-roi"

  PICKED=0
  for entry in "${FALLBACKS[@]}"; do
    FB_TITLE="${entry%%|*}"
    FB_BODY="${entry#*|}"; FB_BODY="${FB_BODY%%|*}"
    FB_TOPIC="${entry##*|}"

    # Skip permanently blocked topics
    if [[ "|$PERMANENT_BLOCKS|" == *"|$FB_TOPIC|"* ]]; then
      continue
    fi

    # Skip if this exact title was asked recently (in block list)
    if [[ "$BLOCK_LIST" == *"$FB_TITLE"* ]]; then
      continue
    fi

    # Skip if topic was asked in last 30 days (check tracking file)
    TOPIC_LAST=$(python3 -c "
import json
try:
    with open('$TRACKING_FILE', 'r') as f:
        data = json.load(f)
    topics = data.get('topics', {})
    la = topics.get('$FB_TOPIC', {}).get('last_asked', '')
    print(la if la else '')
except:
    print('')
" 2>/dev/null || echo "")

    if [ -n "$TOPIC_LAST" ]; then
      DAYS_SINCE=$(python3 -c "
from datetime import datetime
try:
    last = datetime.strptime('$TOPIC_LAST', '%Y-%m-%d')
    now = datetime.strptime('$TODAY', '%Y-%m-%d')
    print((now - last).days)
except:
    print(999)
" 2>/dev/null || echo "999")
      if [ "$DAYS_SINCE" -lt 30 ]; then
        continue
      fi
    fi

    TITLE="$FB_TITLE"
    BODY="$FB_BODY"
    TOPIC="$FB_TOPIC"
    PICKED=1
    break
  done

  # If ALL fallbacks exhausted, skip today rather than repeat
  if [ $PICKED -eq 0 ]; then
    echo "{\"date\":\"$TODAY\",\"title\":\"SKIPPED\",\"topic\":\"none\",\"cycle\":$CYCLE_NUM,\"reason\":\"all-topics-exhausted-or-blocked\"}" >> "$INQUIRY_LOG"
    exit 0
  fi
fi

# ── Step 8: Final safety check — reject if title matches a recent notification ──
DUPLICATE_CHECK=$(python3 -c "
import json
try:
    with open('$NOTIFICATIONS', 'r') as f:
        notifs = json.load(f)
except:
    notifs = []

title = '''$TITLE'''
inquiries = [n for n in notifs if n.get('source') == 'daily-inquiry']
for n in inquiries:
    if n.get('title', '').strip() == title.strip():
        print('DUPLICATE')
        break
else:
    print('OK')
" 2>/dev/null || echo "OK")

if [ "$DUPLICATE_CHECK" = "DUPLICATE" ]; then
  echo "{\"date\":\"$TODAY\",\"title\":\"BLOCKED:$TITLE\",\"topic\":\"${TOPIC:-unknown}\",\"cycle\":$CYCLE_NUM,\"reason\":\"exact-title-duplicate\"}" >> "$INQUIRY_LOG"
  exit 0
fi

# ── Step 9: Send and log ──
if [ -n "$TITLE" ] && [ -n "$BODY" ]; then
  send_inquiry "$TITLE" "$BODY"
  TOPIC="${TOPIC:-llm-generated}"
  echo "{\"date\":\"$TODAY\",\"title\":\"$TITLE\",\"topic\":\"$TOPIC\",\"cycle\":$CYCLE_NUM}" >> "$INQUIRY_LOG"

  # Update question tracking file
  if [ -f "$TRACKING_FILE" ]; then
    python3 -c "
import json, time
try:
    with open('$TRACKING_FILE', 'r') as f:
        data = json.load(f)
except:
    data = {'schema_version': '1.0', 'topics': {}, 'last_updated': 0}

topic = '$TOPIC'
if topic not in data.get('topics', {}):
    data.setdefault('topics', {})[topic] = {'last_asked': None, 'count': 0}

data['topics'][topic]['last_asked'] = '$TODAY'
data['topics'][topic]['count'] = data['topics'][topic].get('count', 0) + 1
data['last_updated'] = time.time()

with open('$TRACKING_FILE', 'w') as f:
    json.dump(data, f, indent=2)
" 2>/dev/null || true
  fi
fi
