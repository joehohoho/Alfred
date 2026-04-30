# Cost Analysis - 2026-04-30

## Bottom line
A true **this week vs last week** cost comparison is not currently possible because the P&L source data is stale.

- Cost data latest row: **2026-02-04** (**85 days old**)
- Time data latest row: **2026-02-08** (**81 days old**)
- Revenue + acquisition latest row: **2026-02-01** (**88 days old**)

The bigger issue is not spend growth yet — it's that the dashboard can silently imply "no cost" when the real problem is **missing current data**.

## What I checked
- Source ledger: `data/project-pnl/cost_entries.csv`
- Related ledgers: `time_entries.csv`, `revenue_entries.csv`, `acquisition_entries.csv`
- Dashboard output: `dashboard/project-pnl.json`
- Cost analysis helper: `scripts/cost-analysis.py`

## Latest available 7-day spend window in the file
Window: **2026-01-29 to 2026-02-04**

- Total spend: **$583.00**
- Entry count: **8**

### Spend by project
- CoinUsUp: **$160.00**
- shared: **$120.00**
- SignalApp: **$115.00**
- EvenUsUp: **$113.00**
- AutomationConsulting: **$75.00**

### Spend by category
- hosting: **$275.00**
- tools: **$195.00**
- api: **$113.00**

## Comparison to previous 7-day window
Window: **2026-01-22 to 2026-01-28**

- Total spend: **$0.00**

This is not a meaningful week-over-week baseline; it just shows the dataset does not extend far enough back.

## Useful findings
1. **Dashboard blind spot:** `dashboard/project-pnl.json` was showing current-month zeros without saying the source ledgers were stale.
2. **Known largest spend bucket:** hosting was the biggest category in the available sample at **$275**.
3. **Project scrutiny order:** CoinUsUp + SignalApp combine for **$275** in the available sample, so they are the first two worth auditing once fresh entries exist.

## Fix I applied
I updated `scripts/project-pnl.js` so `dashboard/project-pnl.json` now includes a `dataFreshness` block with:
- latest date per source
- age in days
- stale flag per source
- overall stale source list

That makes the dashboard output less misleading until the ledger is refreshed.

## Recommendation
- Refresh the P&L CSV ledgers before using weekly cost trends for decisions.
- Add a UI warning anywhere `dashboard/project-pnl.json` is rendered when `portfolio.dataFreshness.stale === true`.
- After fresh data is loaded, compare:
  - current 7 days vs previous 7 days
  - per-category delta
  - per-project delta
  - one-off spikes above baseline
