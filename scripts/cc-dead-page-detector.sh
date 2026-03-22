#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TELEMETRY="$WORKSPACE_DIR/data/cc-telemetry.json"
REPORT_DIR="$WORKSPACE_DIR/reports"
DATE_TAG=$(date +"%Y%m%d")
REPORT="$REPORT_DIR/cc-dead-page-report-${DATE_TAG}.md"
WEBHOOK="https://discord.com/api/webhooks/1476450612634976400/t9JQhSuFs-76n602WkzkgK4uMoq-H6q7w60l_vl3wN2dTOqhix82dMDY5rVMpR2QDdNw"

mkdir -p "$REPORT_DIR"

if [[ ! -f "$TELEMETRY" ]]; then
  echo "ERROR: telemetry file missing: $TELEMETRY" >&2
  exit 1
fi

CANDIDATES_JSON=$(jq -c '
  .pages
  | to_entries
  | map(select((.value.api_hits_7d == 0) and (.value.value_score < 5) and (.value.strategic_tag != "critical")))
' "$TELEMETRY")

COUNT=$(echo "$CANDIDATES_JSON" | jq 'length')
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

{
  echo "# Command Center Dead Page Detector Report"
  echo
  echo "- Generated: $NOW_ISO"
  echo "- Source telemetry: \
\`data/cc-telemetry.json\`"
  echo "- Candidate rule: api_hits_7d == 0 AND value_score < 5 AND strategic_tag != critical"
  echo
  if [[ "$COUNT" -eq 0 ]]; then
    echo "## Result"
    echo
    echo "No deprecation candidates detected."
  else
    echo "## Deprecation Candidates"
    echo
    echo "| Page key | api_hits_7d | value_score | status | strategic_tag |"
    echo "|---|---:|---:|---|---|"
    echo "$CANDIDATES_JSON" | jq -r '.[] | "| \(.key) | \(.value.api_hits_7d) | \(.value.value_score) | \(.value.status) | \(.value.strategic_tag) |"'
  fi
  echo
  echo "## Safety"
  echo
  echo "This report is advisory only. No pages/features were removed."
} > "$REPORT"

if [[ "$COUNT" -eq 0 ]]; then
  SUMMARY="CC Dead-Page Detector (${DATE_TAG}): no deprecation candidates found. Report: ${REPORT##$WORKSPACE_DIR/}"
else
  LIST=$(echo "$CANDIDATES_JSON" | jq -r 'map(.key) | join(", ")')
  SUMMARY="CC Dead-Page Detector (${DATE_TAG}): ${COUNT} deprecation candidate(s): ${LIST}. Report: ${REPORT##$WORKSPACE_DIR/}"
fi

curl -s -X POST -H "Content-Type: application/json" \
  -d "$(jq -nc --arg content "$SUMMARY" '{content:$content}')" \
  "$WEBHOOK" >/dev/null || true

echo "$SUMMARY"
echo "Report written: $REPORT"
