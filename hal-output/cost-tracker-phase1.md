# HAL Output: Cost Tracker Phase 1

**Completed:** 2026-02-26  
**Kanban Card:** goal_1771922732218_7d7e1f7a  
**Status:** ✅ Complete — moving to review

---

## What Was Built

A complete **Cost-Per-Project P&L tracking system** at `/Users/hopenclaw/cost-tracker/` — Phase 1 of the real-time unit economics goal.

### Core Components

1. **SQLite Database Schema** (`schema.sql`)
   - `projects` table — project registry with Stripe product IDs, hosting provider
   - `cost_entries` table — manual + automated cost logging (categories: dev_time, api_spend, hosting, tools, other)
   - `revenue_entries` table — Stripe + manual revenue with MRR snapshot support
   - `project_metrics` view — monthly rollup: revenue, costs, gross profit, gross margin %, cost breakdown

2. **Project Mapping Config** (`projects.json`)
   - **CoinUsUp** mapped: Vercel hosting, Supabase backend, Stripe env var names, repo path
   - CoinUsUp uses Vercel (from vercel.json) + Supabase (from supabase/ folder + deps)
   - No Stripe product IDs found in source — need to add from Stripe dashboard manually
   - Even Us Up + Signal App stubbed for future phases

3. **CLI Tool** (`cost-tracker`)
   - `cost-tracker init` — init DB, seed projects from projects.json
   - `cost-tracker projects` — list all tracked projects
   - `cost-tracker log <project> <category> <amount> [--date] [--note]` — manual cost entry
   - `cost-tracker report <project> [--month YYYY-MM] [--all-time]` — P&L summary
   - `cost-tracker sync [project] [--dry-run] [--days N]` — pull Stripe revenue

4. **README** — full schema docs, migration path to Postgres, env var guide

---

## File Structure

```
/Users/hopenclaw/cost-tracker/
├── cost-tracker           # wrapper shell script (executable)
├── schema.sql             # DB schema (SQLite + PostgreSQL-compatible)
├── projects.json          # project mapping config
├── pyproject.toml         # Python package config
├── README.md              # full documentation
├── data/
│   └── cost_tracker.db    # SQLite DB (git-ignored)
├── .venv/                 # Python venv (git-ignored)
└── cost_tracker/
    ├── __init__.py
    ├── cli.py             # CLI entrypoint (click)
    ├── db.py              # DB connection + init
    ├── models.py          # constants + config helpers
    └── commands/
        ├── __init__.py
        ├── log.py         # cost-tracker log
        ├── report.py      # cost-tracker report
        └── sync.py        # cost-tracker sync (Stripe)
```

---

## How to Run

```bash
cd /Users/hopenclaw/cost-tracker

# First time setup
.venv/bin/pip install -e .  # (already done)
./cost-tracker init

# Log costs
./cost-tracker log coinusup hosting 20.00 --note "Vercel Pro"
./cost-tracker log coinusup tools 15.00 --note "Cursor AI (1/3)"

# Sync Stripe revenue
export STRIPE_SECRET_KEY=sk_live_...
./cost-tracker sync coinusup --dry-run  # preview first
./cost-tracker sync coinusup

# View P&L
./cost-tracker report coinusup
./cost-tracker report coinusup --all-time
```

Or from anywhere (add to PATH):
```bash
export PATH="/Users/hopenclaw/cost-tracker/.venv/bin:$PATH"
cost-tracker report coinusup
```

---

## CoinUsUp Discovery Notes

- **Hosting:** Vercel (vercel.json present, standard SPA deploy)
- **Backend:** Supabase (auth + database, free tier assumed)
- **Analytics:** Google Analytics (GA4 via gtag)
- **Stripe:** env vars `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` expected — **no product IDs found in source**. Joe needs to add Stripe product IDs from the Stripe dashboard to `projects.json`.
- **Repo:** `/Users/hopenclaw/.openclaw/workspace/CoinUsUp`

---

## Next Steps: Phase 2 (Git-Based Dev Time Tracking)

1. **git log parser** — scan commit timestamps per project repo
2. **session estimation** — group commits within N minutes as a "session"
3. **hourly rate config** — configurable shadow cost (default $50/hr)
4. **auto log** — `cost-tracker dev-sync <project>` writes `dev_time` entries from git history
5. **cron job** — nightly `dev-sync` for all projects
6. **revenue-per-commit metric** — correlate git activity with revenue changes

This would make dev time cost tracking fully automatic and zero-friction.

---

## Tested ✅

```
cost-tracker init        → seeded 3 projects
cost-tracker log         → 4 test entries for coinusup
cost-tracker report      → P&L table renders correctly
cost-tracker projects    → lists all 3 projects
```
