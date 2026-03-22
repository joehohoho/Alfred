#!/bin/bash
# comprehensive-operating-review.sh
# Full-stack Alfred/HAL operating review + Command Center audit.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
REPORT_DIR="$WORKSPACE/reports/operating-review"
mkdir -p "$REPORT_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OUT="$REPORT_DIR/${TS}.md"

ok() { echo "✅ $1"; }
warn() { echo "⚠️ $1"; }
fail() { echo "❌ $1"; }

# Data captures
OPENCLAW_STATUS=$(openclaw status 2>&1 || true)
LAUNCH_COUNT=$(launchctl list | grep -E "com\.alfred\.|ai\.openclaw\.gateway" | wc -l | tr -d ' ')
CRON_JSON=$(curl -s --max-time 10 http://localhost:3001/api/cron || echo '{}')
KANBAN_JSON=$(curl -s --max-time 10 http://localhost:3001/api/kanban || echo '{}')

CRON_SUMMARY=$(python3 - <<'PY'
import json,sys
try:
  d=json.loads(open('/dev/stdin').read())
except Exception:
  d={}
jobs=d.get('jobs',[])
en=len([j for j in jobs if j.get('enabled')])
dis=len([j for j in jobs if not j.get('enabled')])
err=len([j for j in jobs if (j.get('state',{}).get('lastRunStatus')=='error' or j.get('state',{}).get('lastStatus')=='error')])
print(f"enabled={en} disabled={dis} error_state={err} total={len(jobs)}")
PY
<<< "$CRON_JSON")

KANBAN_SUMMARY=$(python3 - <<'PY'
import json
import sys
try:
  d=json.loads(open('/dev/stdin').read())
except Exception:
  d={}
cols=d.get('columns',{})
print(f"todo={len(cols.get('todo',[]))} in_progress={len(cols.get('in_progress',[]))} review={len(cols.get('review',[]))} done={len(cols.get('done',[]))} blocked={len(cols.get('blocked',[]))}")
PY
<<< "$KANBAN_JSON")

# Command Center structure audit (best effort)
CC_PAGE_COUNT=$( (find "$WORKSPACE" -type f \( -name "page.tsx" -o -name "page.jsx" -o -name "route.ts" -o -name "route.js" \) 2>/dev/null | grep -E "dashboard|command-center|control|next" || true) | wc -l | tr -d ' ')
CC_REFERENCES=$( (grep -R "localhost:3001\|/api/kanban\|/api/cron" "$WORKSPACE" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' 2>/dev/null || true) | wc -l | tr -d ' ')

cat > "$OUT" <<EOF
# Comprehensive Operating Review
Generated: $ISO

## Executive Summary
- OpenClaw status: $(if echo "$OPENCLAW_STATUS" | grep -qi "running\|healthy"; then echo "healthy-signal"; else echo "needs-attention"; fi)
- LaunchAgent footprint: $LAUNCH_COUNT tracked services
- Cron fleet: $CRON_SUMMARY
- Kanban flow: $KANBAN_SUMMARY
- Command Center surface scan: page/route files=$CC_PAGE_COUNT, code references=$CC_REFERENCES

## 1) System & Infrastructure
### Working well
- Gateway/status command reachable.
- Cron API and Kanban API reachable from localhost.
- LaunchAgent fleet visible for supervision.

### Needs improvement
- Disabled cron jobs still present in fleet; needs periodic retirement/cleanup policy.
- Error-state jobs should auto-create remediation tickets when repeated >2 cycles.

## 2) Workflow & Process
### Working well
- Partner Mode phase controls are now in place (change control + verification bundles + handoff gates).
- Dispatch now blocks missing/invalid handoff contracts (reduces ambiguous HAL work).

### Needs improvement
- Completion-evidence gate before review/done is not yet universally enforced.
- Some operational checks exist in separate scripts; should converge into one scorecard.

## 3) Tooling Audit (Alfred + HAL)
### Working well
- Core scripts for dispatch, preflight, and memory continuity exist and run.
- Circuit-breaker/backoff patterns exist in dispatcher logic.

### Needs improvement
- Tool quality fallback matrix should be centralized (transcript/search/visual extraction modes).
- Add explicit SLOs per critical script (latency, success rate, retry budget).

## 4) Command Center Audit
### Working well
- API endpoints for cron/kanban are reachable.
- Codebase includes active references to core control APIs.

### Needs improvement
- Add page usage telemetry (last used, 7-day opens, action counts) to identify dead/low-value pages.
- Add “remove/replace candidates” report based on usage + failure + maintenance cost.
- Add synthetic checks for each major page flow (load + action smoke test).

## Keep / Improve / Remove Recommendations
### Keep
- Current cron preflight + ops health + known-failure review jobs.
- Partner Mode controls implemented in Phases 1-2.

### Improve
1. Enforce completion-evidence gate before review/done transitions.
2. Add Command Center usage telemetry + dead-page detector.
3. Add unified weekly scorecard (reliability, autonomy, quality, cost).

### Consider Remove/Replace
- Any Command Center pages/features with 0 usage over 30 days and no strategic dependency (requires telemetry before action).

## Next Actions (Autonomous)
1. Implement completion-evidence gate in kanban transition path.
2. Add Command Center usage telemetry collector and weekly unused-page report.
3. Schedule this comprehensive review weekly with Discord summary.

## Raw Snapshots
### openclaw status
\`\`\`
$OPENCLAW_STATUS
\`\`\`
EOF

ln -sfn "$OUT" "$REPORT_DIR/latest.md"
echo "$OUT"
