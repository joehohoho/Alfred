#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$WORKSPACE_DIR/reports/scorecard"
AUDIT_LOG="$WORKSPACE_DIR/tracking/evidence-gate-audit.log"
WEBHOOK="https://discord.com/api/webhooks/1476450612634976400/t9JQhSuFs-76n602WkzkgK4uMoq-H6q7w60l_vl3wN2dTOqhix82dMDY5rVMpR2QDdNw"

mkdir -p "$REPORT_DIR"

KANBAN_JSON=$(curl -s --max-time 15 http://localhost:3001/api/kanban || echo '{}')
CRON_JSON=$(curl -s --max-time 15 http://localhost:3001/api/cron || echo '{}')

TMP_KANBAN=$(mktemp)
TMP_CRON=$(mktemp)
TMP_MD=$(mktemp)
printf '%s' "$KANBAN_JSON" > "$TMP_KANBAN"
printf '%s' "$CRON_JSON" > "$TMP_CRON"

python3 - "$TMP_KANBAN" "$TMP_CRON" "$AUDIT_LOG" > "$TMP_MD" <<'PY'
import json, sys, os
from datetime import datetime, timezone, timedelta

kanban_path, cron_path, audit_log = sys.argv[1:4]

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def parse_dt(s):
    if not s or not isinstance(s, str):
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return None

def rag_reliability(v):
    return 'GREEN' if v >= 95 else ('YELLOW' if v >= 80 else 'RED')

def rag_autonomy(v):
    return 'GREEN' if v <= 20 else ('YELLOW' if v <= 40 else 'RED')

def rag_quality(v):
    return 'GREEN' if v >= 80 else ('YELLOW' if v >= 50 else 'RED')

def rag_capacity(v):
    return 'GREEN' if v <= 3 else ('YELLOW' if v <= 6 else 'RED')

kanban = load_json(kanban_path)
cron = load_json(cron_path)
now = datetime.now(timezone.utc)
week_ago = now - timedelta(days=7)

columns = kanban.get('columns', {}) if isinstance(kanban, dict) else {}
all_cards = []
for col, cards in (columns or {}).items():
    if isinstance(cards, list):
        for c in cards:
            if isinstance(c, dict):
                c['_column'] = col
                all_cards.append(c)

# Capacity metrics
wip_count = len(columns.get('in_progress', [])) if isinstance(columns.get('in_progress', []), list) else 0
done_cards = columns.get('done', []) if isinstance(columns.get('done', []), list) else []
throughput_7d = 0
cycle_hours = []
for c in done_cards:
    upd = parse_dt(c.get('updatedAt'))
    cre = parse_dt(c.get('createdAt'))
    if upd and upd >= week_ago:
        throughput_7d += 1
        if cre:
            cycle_hours.append((upd - cre).total_seconds()/3600)
avg_cycle = sum(cycle_hours)/len(cycle_hours) if cycle_hours else None

# Reliability
jobs = cron.get('jobs', []) if isinstance(cron, dict) else []
total_runs = 0
success_runs = 0
error_jobs = 0
for j in jobs:
    st = (j or {}).get('state', {}) or {}
    last = st.get('lastStatus') or st.get('lastRunStatus')
    if last in ('ok', 'error', 'timeout', 'failed'):
        total_runs += 1
        if last == 'ok':
            success_runs += 1
    if last and last != 'ok':
        error_jobs += 1
job_success = (success_runs / total_runs * 100.0) if total_runs else 0.0

incident_count = 0
blocker_count = 0
for c in all_cards:
    comments = c.get('comments') or []
    has_incident = False
    for cm in comments:
        txt = (cm.get('text') or '').lower()
        cdt = parse_dt(cm.get('createdAt'))
        if cdt and cdt >= week_ago and ('blocker' in txt or 'error' in txt):
            has_incident = True
            if 'blocker' in txt:
                blocker_count += 1
    if has_incident:
        incident_count += 1
mttr = None

# Autonomy
completions = throughput_7d
auto_completions = 0
for c in done_cards:
    upd = parse_dt(c.get('updatedAt'))
    if not (upd and upd >= week_ago):
        continue
    comments = c.get('comments') or []
    escalated = any(('decision' in (cm.get('text') or '').lower()) or ('escalat' in (cm.get('text') or '').lower()) for cm in comments)
    actor_comment = any((cm.get('author') or '').lower() in ('alfred','hal') for cm in comments)
    if actor_comment and not escalated:
        auto_completions += 1

autonomous_rate = (auto_completions / completions * 100.0) if completions else 0.0

escalation_count = 0
reason_counts = {}
for c in all_cards:
    for cm in (c.get('comments') or []):
        txt = (cm.get('text') or '').lower()
        cdt = parse_dt(cm.get('createdAt'))
        if cdt and cdt >= week_ago and ('decision' in txt or 'escalat' in txt or 'question' in txt):
            escalation_count += 1
            if 'approval' in txt:
                k='approval'
            elif 'blocker' in txt or 'blocked' in txt:
                k='blocker'
            elif 'scope' in txt:
                k='scope'
            else:
                k='other'
            reason_counts[k] = reason_counts.get(k, 0) + 1
escalation_rate = (escalation_count / completions * 100.0) if completions else 0.0

# Quality
pass_review = 0
block_review = 0
if os.path.exists(audit_log):
    with open(audit_log, 'r', encoding='utf-8') as f:
        for line in f:
            if '| GATE:PASS |' in line and 'col=review' in line:
                pass_review += 1
            elif '| GATE:BLOCK |' in line and 'col=review' in line:
                block_review += 1

review_transitions = pass_review + block_review
if review_transitions == 0:
    evidence_rate = 65.0  # default YELLOW first week
    evidence_note = 'defaulted (first-week baseline)'
else:
    evidence_rate = pass_review / review_transitions * 100.0
    evidence_note = 'measured from gate log'

reopen_count = 0
for c in all_cards:
    for cm in (c.get('comments') or []):
        txt = (cm.get('text') or '').lower()
        cdt = parse_dt(cm.get('createdAt'))
        if cdt and cdt >= week_ago and ('back to in_progress' in txt or 'moved to in_progress' in txt or 'reopen' in txt):
            reopen_count += 1
            break
reopen_rate = (reopen_count / completions) if completions else 0.0

regression_count = 0
for c in all_cards:
    tags = [str(t).lower() for t in (c.get('tags') or [])]
    upd = parse_dt(c.get('updatedAt'))
    if 'regression' in tags and upd and upd >= week_ago:
        regression_count += 1

# Cost placeholders
weekly_spend = 0.0
cost_per_task = (weekly_spend / completions) if completions else 0.0
tier_dist = "local 0% / haiku 0% / sonnet 0% / opus 0%"

# RAGs
r_reliability = rag_reliability(job_success)
r_autonomy = rag_autonomy(escalation_rate)
r_quality = rag_quality(evidence_rate)
r_capacity = rag_capacity(wip_count)
order = {'RED': 3, 'YELLOW': 2, 'GREEN': 1}
overall = max([r_reliability, r_autonomy, r_quality, r_capacity], key=lambda x: order[x])

risks = []
if r_reliability != 'GREEN':
    risks.append(f"Reliability {r_reliability}: cron success {job_success:.1f}%")
if r_autonomy != 'GREEN':
    risks.append(f"Autonomy {r_autonomy}: escalation rate {escalation_rate:.1f}%")
if r_quality != 'GREEN':
    risks.append(f"Quality {r_quality}: evidence compliance {evidence_rate:.1f}%")
if r_capacity != 'GREEN':
    risks.append(f"Capacity {r_capacity}: WIP {wip_count}")
if not risks:
    risks = ["No red/yellow metrics detected."]

wins = []
if r_reliability == 'GREEN':
    wins.append(f"Reliability GREEN at {job_success:.1f}%")
if r_autonomy == 'GREEN':
    wins.append(f"Autonomy GREEN with escalation {escalation_rate:.1f}%")
if r_quality == 'GREEN':
    wins.append(f"Quality GREEN at {evidence_rate:.1f}% evidence compliance")
if r_capacity == 'GREEN':
    wins.append(f"Capacity GREEN with WIP {wip_count}")
if throughput_7d > 0:
    wins.append(f"Throughput: {throughput_7d} cards completed this week")
if not wins:
    wins = ["Baseline captured; no GREEN metrics yet."]

actions = []
if r_reliability != 'GREEN':
    actions.append(("Reliability", "Review failing cron jobs and delivery routing", "Alfred", "This week"))
if r_autonomy != 'GREEN':
    actions.append(("Autonomy", "Reduce decision escalations via tighter handoff criteria", "Alfred", "This week"))
if r_quality != 'GREEN':
    actions.append(("Quality", "Enforce EVIDENCE block before review transitions", "Alfred/HAL", "Immediate"))
if r_capacity != 'GREEN':
    actions.append(("Capacity", "Reduce WIP by finishing in-progress cards before intake", "Alfred", "This week"))
if not actions:
    actions.append(("Ops", "Maintain current operating cadence", "Alfred", "Weekly"))

top_reasons = sorted(reason_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]

now_s = now.strftime('%Y-%m-%d %H:%M UTC')
print(f"# Weekly Ops Scorecard ({now_s})")
print()
print(f"## Overall Health (RAG): **{overall}**")
print()
print("## Reliability")
print(f"- RAG: **{r_reliability}**")
print(f"- Cron success % (7d): **{job_success:.1f}%** ({success_runs}/{total_runs})")
print(f"- Error jobs (latest): **{error_jobs}**")
print(f"- Incident count: **{incident_count}**")
print(f"- MTTR: **{'n/a' if mttr is None else f'{mttr:.1f}h'}**")
print()
print("## Autonomy")
print(f"- RAG: **{r_autonomy}**")
print(f"- Autonomous completion rate: **{autonomous_rate:.1f}%** ({auto_completions}/{completions})")
print(f"- Escalation rate: **{escalation_rate:.1f}%** ({escalation_count}/{completions})")
if top_reasons:
    print("- Escalation reasons (top 3): " + ", ".join([f"{k}({v})" for k, v in top_reasons]))
else:
    print("- Escalation reasons (top 3): none detected")
print()
print("## Quality")
print(f"- RAG: **{r_quality}**")
print(f"- Evidence compliance rate: **{evidence_rate:.1f}%** ({evidence_note})")
print(f"- Reopen rate: **{reopen_rate:.2f}** ({reopen_count}/{completions})")
print(f"- Blockers: **{blocker_count}**")
print(f"- Regression count: **{regression_count}**")
print()
print("## Cost / Capacity")
print(f"- Capacity RAG: **{r_capacity}**")
print(f"- Current WIP: **{wip_count}**")
print(f"- Weekly throughput: **{throughput_7d}**")
print(f"- Average cycle time: **{'n/a' if avg_cycle is None else f'{avg_cycle:.1f}h'}**")
print(f"- Weekly API spend: **${weekly_spend:.2f}**")
print(f"- Cost per completed task: **${cost_per_task:.2f}**")
print(f"- Model tier distribution: **{tier_dist}**")
print()
print("## Top 3 Risks")
for i, r in enumerate(risks[:3], start=1):
    print(f"{i}. {r}")
print()
print("## Top 3 Wins")
for i, w in enumerate(wins[:3], start=1):
    print(f"{i}. {w}")
print()
print("## Action Items")
print("| Area | Action | Owner | ETA |")
print("|---|---|---|---|")
for area, action, owner, eta in actions:
    print(f"| {area} | {action} | {owner} | {eta} |")
PY

DATE_TAG=$(date +"%Y%m%d")
OUT_FILE="$REPORT_DIR/${DATE_TAG}.md"
cp "$TMP_MD" "$OUT_FILE"
ln -sfn "$OUT_FILE" "$REPORT_DIR/latest.md"

SUMMARY="Weekly Ops Scorecard generated (${DATE_TAG}). Full report attached."
curl -s -X POST \
  -F "content=$SUMMARY" \
  -F "file=@$OUT_FILE" \
  "$WEBHOOK" >/dev/null || true

echo "Scorecard written: $OUT_FILE"
echo "Latest symlink: $REPORT_DIR/latest.md"

rm -f "$TMP_KANBAN" "$TMP_CRON" "$TMP_MD"
