#!/bin/bash
# alfred-hal-discussion.sh
# Returns the next Alfred ↔ HAL discussion topic from the rotating list.
# Alfred uses this to kick off a structured discussion with HAL and post
# a summary to Discord (webhook below).
#
# Discord channel webhook:
DISCORD_WEBHOOK="https://discord.com/api/webhooks/1476450612634976400/t9JQhSuFs-76n602WkzkgK4uMoq-H6q7w60l_vl3wN2dTOqhix82dMDY5rVMpR2QDdNw"
#
# Usage: bash alfred-hal-discussion.sh
# Output:
#   [DISCUSSION] topic_index=<n>
#   topic=<full topic text>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
TOPIC_INDEX_FILE="$TRACK_DIR/discussion-topic-index.txt"
LOG="$TRACK_DIR/alfred-proactive.log"

mkdir -p "$TRACK_DIR"
ts()  { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

DISCUSSION_TOPICS=(
  "Passive income opportunities — what are the top 3 realistic income streams Joe could build in 90 days given his automation + SaaS + AI skill set? Consider effort vs upside, recurring revenue, and solo-dev feasibility."
  "Signal App strategy — review architecture quality, missing features, monetization model options, and what the fastest path to a first paying user looks like."
  "CoinUsUp growth — what is holding it back from 10x users? Identify top acquisition levers, retention improvements, and monetization opportunities."
  "Alfred and HAL self-improvement — how can Alfred and HAL each improve their own setup, capabilities, memory, tooling, or coordination? What concrete changes would make us more useful to Joe tomorrow than we are today? Each side should propose 2–3 specific upgrades for themselves and 1–2 for the other."
  "Even Us Up differentiation — how does it win against Splitwise and similar apps? What features would make a user switch and stay?"
  "Joe's portfolio focus — where should Joe spend energy next quarter across CoinUsUp, Even Us Up, Signal App, and Automation Consulting for maximum ROI toward passive income?"
  "Infrastructure and automation gaps — what is wasteful, missing, or fragile in the current Alfred + HAL + Command Center setup? What would make the system more reliable and lower-cost?"
  "Market trends to watch in 2026 — what AI, SaaS, or automation trends should Joe be aware of for identifying new product opportunities in his niche?"
  "Alfred and HAL collaboration quality — how well are Alfred and HAL working together right now? What handoffs are rough, what's working well, and what new collaboration patterns should we try?"
)

TOPIC_COUNT=${#DISCUSSION_TOPICS[@]}

# Get current index
TOPIC_INDEX=0
if [[ -f "$TOPIC_INDEX_FILE" ]]; then
  TOPIC_INDEX=$(cat "$TOPIC_INDEX_FILE" 2>/dev/null || echo "0")
  [[ ! "$TOPIC_INDEX" =~ ^[0-9]+$ ]] && TOPIC_INDEX=0
fi

# Guard bounds
TOPIC_INDEX=$(( TOPIC_INDEX % TOPIC_COUNT ))
TOPIC="${DISCUSSION_TOPICS[$TOPIC_INDEX]}"

# Advance index
NEW_INDEX=$(( (TOPIC_INDEX + 1) % TOPIC_COUNT ))
echo "$NEW_INDEX" > "$TOPIC_INDEX_FILE"

log "Discussion topic selected: index=${TOPIC_INDEX} — ${TOPIC:0:80}..."

echo "[DISCUSSION] topic_index=${TOPIC_INDEX}"
echo "topic=${TOPIC}"
echo ""
echo "---INSTRUCTIONS---"
echo "1. Alfred: Write your own 2-3 key points on this topic (your honest analysis)."
echo "2. Spawn HAL: sessions_spawn(agentId=hal, mode=run, task='Discuss the following topic and provide your technical perspective, key risks, and top 3 actionable recommendations. Be specific and concrete. Topic: ${TOPIC}')"
echo "3. Wait for HAL response."
echo "4. Synthesize both perspectives into a Slack post."
echo "5. Post to Discord using this webhook: https://discord.com/api/webhooks/1476450612634976400/t9JQhSuFs-76n602WkzkgK4uMoq-H6q7w60l_vl3wN2dTOqhix82dMDY5rVMpR2QDdNw"
echo "   POST JSON: {\"content\": \"<message>\"}"
echo "   Use curl -s -X POST <webhook> -H 'Content-Type: application/json' -d '{\"content\": \"...\"}'"
echo "   Format the message as:"
echo ""
echo "   🤝 **Alfred ↔ HAL Discussion**"
echo "   **Topic:** <topic>"
echo "   **Date:** <date>"
echo "   "
echo "   **Alfred's Take:**"
echo "   <Alfred's 2-3 key points>"
echo "   "
echo "   **HAL's Take:**"
echo "   <HAL's perspective>"
echo "   "
echo "   **Combined Top Recommendations:**"
echo "   1. <rec 1>"
echo "   2. <rec 2>"
echo "   3. <rec 3>"
echo "---END INSTRUCTIONS---"
