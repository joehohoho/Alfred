# Alfred Dashboard

Token & cost tracking dashboard — pulls real usage from OpenClaw session logs.

## View
Open http://localhost:8765

## Start Server
```bash
cd ~/.openclaw/workspace/dashboard && node server.js
```
The Node.js server handles both static files and the credits management API.

## Sync Usage Data
```bash
cd ~/.openclaw/workspace/dashboard && node sync-usage.js
```
Parses all OpenClaw session logs and updates `stats.json` with accurate totals, including per-model breakdowns by period (today / this week / total).

## Features

### Credits Management
- View remaining credits, total credits, and average weekly spend
- **Add Credits** — enter an amount and click "+ Add" to top up your balance
- **Set Balance** — enter an amount and click "Set" to reset your balance to an exact number
- Credit history stored in `credits.json` with date and notes

### Model Usage Toggle
- Switch between **Today**, **This Week**, and **Total** views
- Per-model breakdown: Opus, Sonnet, Haiku, Local
- Tokens, cost, and session counts per period

### Other Metrics
- Context window usage (%)
- Current session cost & tokens
- Today's spend
- Daily average cost & tokens
- Full token breakdown (input/output/cache)

## Files
- `index.html` — Dashboard UI (single-page, no build step)
- `server.js` — Node.js server (static files + credits API)
- `stats.json` — Current stats (updated by sync-usage.js)
- `credits.json` — Credit balance ledger (updated via dashboard UI or API)
- `sync-usage.js` — Aggregates usage from session logs
- `usage.json` — Historical usage log (future)
- `sync-stats.sh` — Legacy bash sync script

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/credits` | Get current credit balance & history |
| POST | `/api/credits/add` | Add credits: `{"amount": 10}` |
| POST | `/api/credits/set` | Set total balance: `{"amount": 50}` |

## Pricing (Claude models)
- **Opus**: $15/$75 per M tokens (in/out)
- **Sonnet**: $3/$15 per M tokens
- **Haiku**: $0.25/$1.25 per M tokens
- Cache pricing varies by model
