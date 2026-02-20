#!/bin/bash
# daily-inquiry.sh — Generate and send thoughtful daily questions
# Purpose: Continuously deepen JOE-PROFILE understanding
# Runs: Daily at 10 AM AST via cron

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
INQUIRY_LOG="$WORKSPACE/memory/inquiry-log.jsonl"

# Ensure inquiry log exists
mkdir -p "$(dirname "$INQUIRY_LOG")"
touch "$INQUIRY_LOG"

# Helper: Send a notification
send_inquiry() {
  local title="$1"
  local message="$2"
  
  bash "$SCRIPT_DIR/send-notification.sh" "question" "$title" "$message"
}

# Daily inquiry cycle - rotate through themes
# Load last inquiry date from log to determine which theme to use
LAST_INQUIRY_DATE=$(tail -1 "$INQUIRY_LOG" 2>/dev/null | jq -r '.date' 2>/dev/null || echo "2026-01-01")
DAYS_SINCE_LAST=$(( ($(date +%s) - $(date -j -f "%Y-%m-%d" "$LAST_INQUIRY_DATE" +%s 2>/dev/null || echo 0)) / 86400 ))

# If we don't have a log entry yet (first run), set DAYS_SINCE_LAST to 999 to trigger a question
if [ "$DAYS_SINCE_LAST" -lt 1 ] && [ "$LAST_INQUIRY_DATE" != "2026-01-01" ]; then
  # It's the same day, don't send another
  exit 0
fi

# Generate question based on a rotating cycle
# Cycle: 1=Project Synergies, 2=Vision/Roadmap, 3=Workflow/Efficiency, 4=Passive Income Strategy
CYCLE_NUM=$(( ($(date +%d) % 4) + 1 ))

case $CYCLE_NUM in
  1)
    # Project Synergies Theme
    TITLE="What cross-project wins should I explore?"
    MESSAGE="I've noticed you're building multiple apps (CoinUsUp, Even Us Up, Signal App, automation consulting work). 

I see potential synergies:
- Both CoinUsUp and Signal App work with financial data → shared API infrastructure?
- Job Tracker's intelligence could inform consulting client pitches
- Command Center monitoring all apps' health and revenue metrics

Are any of these worth exploring? Or is there a different angle you'd want me to investigate about how these projects could work together?"
    ;;
  2)
    # Vision & Roadmap Theme
    TITLE="What's your vision for the next 3 months?"
    MESSAGE="From SOUL.md and USER.md, I know passive income through vibe coding is a core goal. Right now I see you juggling maintenance (CoinUsUp, Even Us Up) + growth (Signal App) + OpenClaw infrastructure + consulting.

Where should I focus energy to best support your goals? Is it:
- Growing revenue on an existing app?
- Shipping the Signal App faster?
- Building new passive income vehicles?
- Reducing toil on OpenClaw maintenance?
- Something else entirely?"
    ;;
  3)
    # Workflow & Efficiency Theme
    TITLE="Where am I still asking you questions I shouldn't?"
    MESSAGE="You've told me: 'be resourceful before asking' and 'I can't' isn't vocabulary. I'm genuinely trying to exhaust options before bothering you.

But I may still be creating friction. Are there specific types of questions where:
- I should just make the decision and tell you after?
- I'm missing context I could easily find myself?
- I'm asking the same thing in different ways?

I want notifications to be high-signal only."
    ;;
  4)
    # Passive Income & Growth Theme
    TITLE="What's your actual passive income target?"
    MESSAGE="You mention building passive income as goal #2 (after family). But I don't know the specifics:

- Revenue target per month? (gives me something to optimize toward)
- Which app should be the cash cow? (CoinUsUp, Even Us Up, Signal App, or something new?)
- How much of your week do you want to spend maintaining vs. building new?
- What's the definition of 'passive' — zero touch, or 5 hrs/week maintenance is fine?

This would help me make better recommendations about what to build and what to prioritize."
    ;;
esac

# Send the inquiry
send_inquiry "$TITLE" "$MESSAGE"

# Log it
echo "{\"date\":\"$(date +%Y-%m-%d)\",\"title\":\"$TITLE\",\"cycle\":$CYCLE_NUM}" >> "$INQUIRY_LOG"
