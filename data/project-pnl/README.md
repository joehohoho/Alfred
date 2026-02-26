# Project P&L Tracker

Automatic per-project unit economics generated from simple CSV ledgers.

## What it computes (monthly)
For each project:
- Dev time cost (`hours * dev_hourly_rate`)
- Direct costs (API, hosting, tools)
- Shared cost allocation (proportional to dev hours)
- Revenue
- Net profit
- Burn rate (`max(cost - revenue, 0)`)
- Revenue/hour
- CAC (`acquisition spend / new customers`)
- LTV (`(ARPU * gross margin) / monthly churn`)
- LTV:CAC ratio

Output file:
- `dashboard/project-pnl.json`

## Source files
- `projects.csv` — per-project assumptions
- `time_entries.csv` — dev time by date/project
- `cost_entries.csv` — direct + shared costs
- `revenue_entries.csv` — monthly revenue events
- `acquisition_entries.csv` — customer growth + paid spend

## Run
```bash
node scripts/project-pnl.js
```

## Real-time flow
If you append entries during the day and rerun the script, output updates instantly. For automation, run it from cron/LaunchAgent every 15-60 minutes.
