#!/bin/bash
# ops-health-dashboard.sh — Unified Ops Health Report
# Covers: cron job status (7d), gateway uptime, LaunchAgents, token spend tier, HAL completion rate
#
# Usage:
#   ops-health-dashboard.sh              # full report to stdout
#   ops-health-dashboard.sh --discord    # post summary to Discord #alfred-logs
#   ops-health-dashboard.sh --json       # output JSON (for Command Center ingestion)
#
# Feeds into Command Center at http://localhost:3001

WORKSPACE="$HOME/.openclaw/workspace"
CRON_API="http://localhost:3001/api/cron"
KANBAN_API="http://localhost:3001/api/kanban"
HEALTH_API="http://localhost:3001/api/health"
DISCORD_CHANNEL="1476598143016505446"  # #alfred-logs

POST_DISCORD=false
OUTPUT_JSON=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --discord) POST_DISCORD=true ;;
    --json) OUTPUT_JSON=true ;;
  esac
  shift
done

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NOW_HUMAN=$(date "+%a %b %-d %Y %-I:%M %p %Z")

# ── 1. Gateway health ──
GW_RAW=$(curl -s --max-time 5 "$HEALTH_API" 2>/dev/null)
GW_STATUS=$(echo "$GW_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('gateway',{}).get('status','unknown'))" 2>/dev/null || echo "unknown")
GW_UPTIME=$(echo "$GW_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('gateway',{}).get('uptime','?'))" 2>/dev/null || echo "?")
GW_MEM=$(echo "$GW_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('gateway',{}).get('memory','?'))" 2>/dev/null || echo "?")
CTX_PCT=$(echo "$GW_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('heartbeat',{}).get('context_pct','?'))" 2>/dev/null || echo "?")
SYS_MEM=$(echo "$GW_RAW" | python3 -c "import json,sys; d=json.load(sys.stdin); s=d.get('system',{}); print(f\"{s.get('memoryPercent','?')}%\")" 2>/dev/null || echo "?")

# ── 2. LaunchAgent health ──
LA_TOTAL=$(launchctl list 2>/dev/null | grep -cE "com\.(alfred|openclaw|ollama)\." || echo 0)
LA_RUNNING=$(launchctl list 2>/dev/null | grep -E "com\.(alfred|openclaw|ollama)\." | awk '$1 ~ /^[0-9]+$/ {count++} END {print count+0}' || echo 0)
LA_STATUS="$LA_RUNNING/$LA_TOTAL running"

# ── 3. Cron job analysis ──
CRON_RAW=$(curl -s --max-time 10 "$CRON_API" 2>/dev/null)
CRON_STATS=$(echo "$CRON_RAW" | python3 -c "
import json, sys
data = json.load(sys.stdin)
jobs = data.get('jobs', [])
total = len(jobs)
enabled = sum(1 for j in jobs if j.get('enabled'))
disabled = total - enabled

# Jobs with missing delivery.to but announce mode (fragile)
fragile = [j['name'] for j in jobs
           if j.get('enabled')
           and j.get('delivery', {}).get('mode') == 'announce'
           and not j.get('delivery', {}).get('to')]

print(f'TOTAL={total}')
print(f'ENABLED={enabled}')
print(f'DISABLED={disabled}')
print(f'FRAGILE={len(fragile)}')
print('FRAGILE_NAMES=' + '|'.join(fragile[:5]))
" 2>/dev/null)

CRON_TOTAL=$(echo "$CRON_STATS" | grep TOTAL= | cut -d= -f2)
CRON_ENABLED=$(echo "$CRON_STATS" | grep ^ENABLED= | cut -d= -f2)
CRON_DISABLED=$(echo "$CRON_STATS" | grep DISABLED= | cut -d= -f2)
CRON_FRAGILE=$(echo "$CRON_STATS" | grep ^FRAGILE= | cut -d= -f2)
CRON_FRAGILE_NAMES=$(echo "$CRON_STATS" | grep FRAGILE_NAMES= | cut -d= -f2 | tr '|' '\n' | head -5)

# ── 4. Kanban board state ──
KANBAN_RAW=$(curl -s --max-time 10 "$KANBAN_API" 2>/dev/null)
KANBAN_STATS=$(echo "$KANBAN_RAW" | python3 -c "
import json, sys
from datetime import datetime, timezone
data = json.load(sys.stdin)
cols = data.get('columns', {})
now = datetime.now(timezone.utc)

for col, cards in cols.items():
    valid = [c for c in cards if c.get('id') and str(c.get('id','')).lower() not in ('null','none','')]
    null_ids = len(cards) - len(valid)
    print(f'{col.upper()}={len(valid)} null_ids={null_ids}')

    # Stale in_progress
    if col == 'in_progress':
        for c in valid:
            ts = c.get('updatedAt','')
            try:
                dt = datetime.fromisoformat(ts.replace('Z','+00:00'))
                hrs = (now - dt).total_seconds() / 3600
                if hrs > 12:
                    print(f'STALE_CARD={c[\"title\"][:40]}|{hrs:.0f}h')
            except: pass
" 2>/dev/null)

KANBAN_TODO=$(echo "$KANBAN_STATS" | grep ^TODO= | cut -d= -f2 | awk '{print $1}')
KANBAN_IP=$(echo "$KANBAN_STATS" | grep ^IN_PROGRESS= | cut -d= -f2 | awk '{print $1}')
KANBAN_REVIEW=$(echo "$KANBAN_STATS" | grep ^REVIEW= | cut -d= -f2 | awk '{print $1}')
KANBAN_NULL=$(echo "$KANBAN_STATS" | grep null_ids | awk -F= '{sum+=$2} END{print sum}')
STALE_CARDS=$(echo "$KANBAN_STATS" | grep STALE_CARD= | cut -d= -f2)

# ── 5. Git activity (proxy for nightly commit health) ──
GIT_24H=$(git -C "$WORKSPACE" log --oneline --since="24 hours ago" 2>/dev/null | wc -l | tr -d ' ')
GIT_7D=$(git -C "$WORKSPACE" log --oneline --since="7 days ago" 2>/dev/null | wc -l | tr -d ' ')

# ── 6. Token spend approximation from memory logs ──
SPEND_DATA=$(python3 -c "
import json, os, glob
from datetime import datetime, timedelta

workspace = os.path.expanduser('~/.openclaw/workspace')
efficiency_log = os.path.join(workspace, 'memory', 'heartbeat-efficiency.json')

entries = []
if os.path.exists(efficiency_log):
    with open(efficiency_log) as f:
        for line in f:
            try:
                entries.append(json.loads(line.strip()))
            except: pass

# Get last 7 days entries
cutoff = datetime.utcnow() - timedelta(days=7)
recent = []
for e in entries:
    try:
        ts = datetime.fromisoformat(e.get('timestamp','').replace('Z',''))
        if ts > cutoff:
            recent.append(e)
    except: pass

if recent:
    avg_cost = sum(e.get('cost_per_task_usd', 0) for e in recent) / len(recent)
    dist = {}
    for e in recent:
        for k,v in e.get('model_distribution', {}).items():
            dist[k] = dist.get(k, 0) + v
    # normalize
    total = sum(dist.values()) or 1
    pcts = {k: round(v/total*100) for k,v in dist.items()}
    print(f'AVG_COST_PER_TASK={avg_cost:.4f}')
    print('MODEL_DIST=' + json.dumps(pcts))
else:
    print('AVG_COST_PER_TASK=N/A')
    print('MODEL_DIST={}')
" 2>/dev/null)

SPEND_AVG=$(echo "$SPEND_DATA" | grep AVG_COST= | cut -d= -f2)
MODEL_DIST=$(echo "$SPEND_DATA" | grep MODEL_DIST= | cut -d= -f2-)

# ── OUTPUT ──

if [ "$OUTPUT_JSON" = true ]; then
  python3 -c "
import json
print(json.dumps({
  'timestamp': '$NOW',
  'gateway': {'status': '$GW_STATUS', 'uptime': '$GW_UPTIME', 'memory': '$GW_MEM'},
  'context_pct': '$CTX_PCT',
  'system_memory': '$SYS_MEM',
  'launchagents': {'running': $LA_RUNNING, 'total': $LA_TOTAL},
  'cron': {'total': ${CRON_TOTAL:-0}, 'enabled': ${CRON_ENABLED:-0}, 'disabled': ${CRON_DISABLED:-0}, 'fragile': ${CRON_FRAGILE:-0}},
  'kanban': {'todo': '${KANBAN_TODO:-?}', 'in_progress': '${KANBAN_IP:-?}', 'review': '${KANBAN_REVIEW:-?}', 'null_id_cards': ${KANBAN_NULL:-0}},
  'git_commits_24h': ${GIT_24H:-0},
  'git_commits_7d': ${GIT_7D:-0}
}, indent=2))
"
  exit 0
fi

# ── Human-readable report ──
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Alfred Ops Health Dashboard — $NOW_HUMAN"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Gateway"
echo "   Status:  $GW_STATUS | Uptime: $GW_UPTIME | Memory: $GW_MEM"
echo "   Context: ${CTX_PCT}% | System RAM: $SYS_MEM"
echo ""
echo "🚀 LaunchAgents"
echo "   $LA_STATUS"
echo ""
echo "⏰ Cron Jobs"
echo "   Total: $CRON_TOTAL | Enabled: $CRON_ENABLED | Disabled: $CRON_DISABLED"
if [ "${CRON_FRAGILE:-0}" -gt 0 ] 2>/dev/null; then
  echo "   ⚠ $CRON_FRAGILE job(s) with announce mode but NO delivery.to (auto-disable risk):"
  echo "$CRON_FRAGILE_NAMES" | sed 's/^/     - /'
else
  echo "   ✅ No fragile routing detected"
fi
echo ""
echo "📋 Kanban Board"
echo "   todo: ${KANBAN_TODO:-?} | in_progress: ${KANBAN_IP:-?} | review: ${KANBAN_REVIEW:-?}"
if [ -n "$KANBAN_NULL" ] && [ "$KANBAN_NULL" -gt 0 ] 2>/dev/null; then
  echo "   ⚠ $KANBAN_NULL card(s) with null/invalid IDs detected"
fi
if [ -n "$STALE_CARDS" ]; then
  echo "   ⚠ Stale in_progress cards (>12h):"
  echo "$STALE_CARDS" | sed 's/^/     - /'
else
  echo "   ✅ No stale in_progress cards"
fi
echo ""
echo "📝 Git Activity"
echo "   Last 24h: $GIT_24H commit(s) | Last 7d: $GIT_7D commit(s)"
if [ "${GIT_24H:-0}" -eq 0 ] 2>/dev/null; then
  echo "   ⚠ No commits in last 24h — nightly-git-commit may have failed"
fi
echo ""
echo "💰 Token Spend"
if [ -n "$SPEND_AVG" ] && [ "$SPEND_AVG" != "N/A" ]; then
  echo "   Avg cost/task (7d): \$$SPEND_AVG"
  echo "   Model distribution: $MODEL_DIST"
else
  echo "   No heartbeat efficiency log found (log to memory/heartbeat-efficiency.json to enable)"
fi
echo ""

# Recommendation guard check (ensures key implementations stay in place)
echo ""
echo "=== Recommendation Guard ==="
REC_GUARD_OUT="$(bash "$WORKSPACE/scripts/recommendations-guard.sh" 2>&1 || true)"
echo "$REC_GUARD_OUT"
REC_FAIL=0
echo "$REC_GUARD_OUT" | grep -q "FAIL" && REC_FAIL=1 || true

# Overall health verdict
ISSUES=0
[ "${CRON_FRAGILE:-0}" -gt 0 ] 2>/dev/null && ISSUES=$((ISSUES+1))
[ "${KANBAN_NULL:-0}" -gt 0 ] 2>/dev/null && ISSUES=$((ISSUES+1))
[ "${GIT_24H:-0}" -eq 0 ] 2>/dev/null && ISSUES=$((ISSUES+1))
[ "$GW_STATUS" != "online" ] && ISSUES=$((ISSUES+1))
[ "$REC_FAIL" -eq 1 ] && ISSUES=$((ISSUES+1))

if [ "$ISSUES" -eq 0 ]; then
  echo "✅ Overall: HEALTHY — no issues detected"
else
  echo "⚠️  Overall: $ISSUES issue(s) need attention (see above)"
fi

# ── Discord post ──
if [ "$POST_DISCORD" = true ]; then
  SUMMARY="**Alfred Ops Health — $NOW_HUMAN**
Gateway: $GW_STATUS (up $GW_UPTIME) | RAM: $SYS_MEM | Context: ${CTX_PCT}%
LaunchAgents: $LA_STATUS
Cron: $CRON_ENABLED/$CRON_TOTAL enabled$([ "${CRON_FRAGILE:-0}" -gt 0 ] && echo " ⚠ ${CRON_FRAGILE} fragile" || echo " ✅ clean routing")
Kanban: todo=${KANBAN_TODO:-?} ip=${KANBAN_IP:-?} review=${KANBAN_REVIEW:-?}$([ -n "$STALE_CARDS" ] && echo " ⚠ stale cards" || echo "")
Git (24h): $GIT_24H commits
Overall: $([ "$ISSUES" -eq 0 ] && echo "✅ HEALTHY" || echo "⚠️ $ISSUES issue(s)")"

  # Post via OpenClaw discord webhook
  WEBHOOK_URL="${DISCORD_WEBHOOK_HAL_COMPLETIONS:-}"
  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"content\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$SUMMARY")}" > /dev/null
    echo "✓ Posted to Discord"
  else
    echo "(Discord post skipped — DISCORD_WEBHOOK_HAL_COMPLETIONS not set)"
  fi
fi

exit 0
