# Cost Analysis - 2026-04-23

## Summary
- Available cost dataset: `data/project-pnl/cost_entries.csv`
- Latest cost entry date: **2026-02-04**
- Result: a true current-week versus prior-week comparison is **not possible** because the dataset is stale by roughly 11 weeks.

## What the available data shows
### Latest 7-day window in the file: 2026-01-29 to 2026-02-04
- Total cost: **$583.00**
- Entry count: **8**

### By project
- CoinUsUp: **$160.00**
- shared: **$120.00**
- SignalApp: **$115.00**
- EvenUsUp: **$113.00**
- AutomationConsulting: **$75.00**

### By category
- hosting: **$275.00**
- tools: **$195.00**
- api: **$113.00**

### By day
- 2026-02-01: **$350.00**
- 2026-02-02: **$40.00**
- 2026-02-03: **$73.00**
- 2026-02-04: **$120.00**

## Comparison to the prior 7-day window
### 2026-01-22 to 2026-01-28
- Total cost: **$0.00**
- Interpretation: this is not a meaningful baseline, it just indicates no older data exists in the file.

## Actionable findings
1. **The immediate problem is data freshness, not cost growth.** Any automation or dashboard relying on this file for weekly cost trend analysis will be misleading.
2. **Largest known spend bucket in the available data is hosting ($275),** followed by tools ($195). If Joe wants to reduce spend, hosting and shared-tool subscriptions are the first places worth auditing.
3. **SignalApp plus CoinUsUp account for $275 combined** in the available sample, so those projects deserve first-pass scrutiny once fresh data is available.

## Recommended fixes
- Refresh or rebuild the cost export feeding `data/project-pnl/cost_entries.csv`.
- Add a freshness check to any future cost report and fail loudly if the newest row is older than 7 days.
- Once fresh data exists, compare:
  - current 7 days vs previous 7 days
  - category deltas
  - project deltas
  - any one-off spikes above normal baseline

## Deliverable created
- Report: `reports/cost-analysis-2026-04-23.md`
- Helper script: `scripts/cost-analysis.py`
