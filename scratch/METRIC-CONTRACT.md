# METRIC-CONTRACT

Defines the weekly operating metrics used by Alfred/HAL in Command Center reporting.

## Reliability

- **Job success rate** = `(successful cron runs / total cron runs) × 100`, rolling 7 days
- **Incident count** = `# of cards with "blocker" or "error" in comments this week`
- **MTTR (hours)** = `average hours from incident creation timestamp to resolved timestamp, this week`

## Autonomy

- **Autonomous completion rate** = `(cards moved to done by alfred/hal with no escalation) / total completions × 100`
- **Escalation rate** = `# of notifications to Joe requiring decision this week`
- **Escalation reasons** = `top 3 reason categories by frequency this week`

## Quality

- **Reopen rate** = `cards moved back from review/done to in_progress this week / total completions`
- **Evidence compliance rate** = `cards with valid evidence block before review transition / total review transitions` (measured via `tracking/evidence-gate-audit.log`)
- **Regression count** = `incidents tagged "regression" this week`

## Cost

- **Weekly API spend** = tracked via `session_status` and/or gateway logs (rolling calendar week)
- **Cost per completed task** = `weekly spend / completed task count`
- **Model tier distribution** = `% of calls per tier (local/haiku/sonnet/opus)`

## Capacity

- **Weekly throughput** = `cards moved to done this week`
- **Average cycle time (hours)** = `average time from todo → done for this week’s completions`
- **Current WIP** = `count of cards currently in in_progress`

## Baseline Snapshot Procedure

1. Run:
   ```bash
   bash /Users/hopenclaw/.openclaw/workspace/scripts/weekly-scorecard.sh
   ```
2. Verify output in `reports/scorecard/`.
3. Commit the generated scorecard file in `reports/scorecard/` using an ISO timestamped filename (created by the script), and keep `latest.md` pointed to the newest report.
