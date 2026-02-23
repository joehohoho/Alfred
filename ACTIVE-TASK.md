# ACTIVE-TASK.md — Write-Ahead Task State

**Purpose:** Persist current task state so it survives context death. Updated BEFORE starting work and AS steps complete.

**Rule:** If this file has content, you have unfinished work. Read it on session start.

---

## Current Task

**Status:** in_progress
**Started:** 2026-02-23 15:46
**Last Updated:** 2026-02-23 15:46

### Objective
**Signal App — Fast Track Launch** (task_1771697313875_722f22e4)

Accelerate market signal detection app to live trading by early April. Three-phase timeline: architecture (Feb), UI/integration (Mar), beta/refinement (Apr).

### Plan
1. **Phase 1 (Feb 23-28):** Finalize architecture + data pipeline
   - Review current market-signal-lab design
   - Confirm data sources (Binance, crypto exchanges, macroeconomic indicators)
   - Validate ML feature set
   - Ensure backtesting framework ready
2. **Phase 2 (Mar):** Build UI + integrate market data + backtesting
   - Frontend (React) for signal dashboard
   - Real-time market data ingestion
   - Backtesting engine integration
   - Performance testing
3. **Phase 3 (Apr):** Beta + refinement
   - Beta user testing
   - Safety/edge case fixes
   - Go live with trading signals

### Progress

**[15:47] Codex OAuth Token Identified**
- Expiration: Feb 28, 3:42 PM (5 days)
- Status: Flagged as pending — Joe to refresh via `openclaw configure --section model`
- Impact: Codex (free code generation) becomes unavailable after 2026-02-28
- Mitigation: Escalate to Sonnet for code tasks if refresh misses deadline

**[15:49] Phase 1 Architecture Assessment COMPLETED**

✅ **Data Pipeline Status:**
- DuckDB store operational (2 tables: assets, candle_metadata)
- 33 assets ingested (BTC, ETH, alts, multi-currency pairs)
- Dual timeframe: 1d (2013-2015 historical) + 15m (live-ready)
- Latest data: Feb 10, 2026 (5 days stale for live signals)
- Data providers: Kraken (crypto), Yahoo Finance (equities) — both reliable

✅ **Backtesting Engine:**
- 3 strategies: SMA Crossover, RSI Mean Reversion, Donchian Breakout
- ADX regime filtering active (trending vs ranging detection)
- Multi-TF confirmation implemented
- Trailing stops: ATR-based + percentage-based
- ML module: walk-forward classifier, 30+ engineered features
- Test suite: 100% passing

✅ **Web UI (Port 8002):**
- FastAPI + Jinja2 dashboard
- Plotly charts for OHLCV + indicators
- Backtest interface with "Learn & Improve" ML training
- Slack integration ready (webhook configured but disabled)
- Server LaunchAgent active: com.alfred.market-signal-lab

⚠️ **Critical Gaps for Live Trading (Phase 1 Must-Fix):**
1. **Data freshness** — Feb 10 data is stale. Need real-time Kraken/Binance feed for live signals
2. **Live signal execution** — Backtesting → signals, but no execution/alert system integrated
3. **Paper trading UI** — Module exists but not in web dashboard
4. **Risk layer** — Position sizing configured but not tested at production scale

### Next Step
1. [TODO] Implement real-time data pipeline (Kraken WebSocket + Binance API)
2. [TODO] Build live signal execution + alert dispatcher (Slack + Command Center)
3. [TODO] Integrate paper trading UI for Feb beta
4. [TODO] Test full flow end-to-end (data → signal → alert → paper execution)

### Context Received
- ✅ **Passive Income Target** (Joe answered 15:47):
  - Monthly goal: $5,000-$10,000 initially, then grow
  - Revenue hierarchy: CoinUsUp (primary) → Signal App (secondary) → Even Us Up (tertiary)
  - Time allocation: 5-10 hrs/week maintenance, 10-20 hrs/week building
  - Definition of "passive": Least effort required, 5 hrs/week is reasonable
  
- ✅ **Market Signal Lab State:** Mature, production-ready architecture (reviewed 15:49)
  - 33 assets, dual timeframe (1d + 15m), DuckDB + Parquet storage
  - 3 strategies, ML classifier, web UI (port 8002)
  - Data current as of Feb 10, 2026

### Pending Questions
<!-- PENDING-Q-START -->
- **Refresh OpenAI Codex OAuth Token** (_alert_, Feb 23 17:50)
  ID: `notif_1771869055670_040cd81d` — The Codex OAuth token expires Feb 28 at 3:42 PM. Run: openclaw configure --section model → select openai-codex → re-auth OAuth flow. If not refreshed,...
<!-- PENDING-Q-END -->

---

## How to Use This File

**Before starting any multi-step task:**
```
Status: in_progress
Started: [timestamp]
Objective: [what you're doing and why]
Plan: [numbered steps]
Progress: [completed steps with results]
Next Step: [what to do next]
Context Needed: [files, decisions, or state the next session needs]
```

**After each step completes:** Update Progress and Next Step.

**When task is done:** Set Status to `idle`, clear all fields.

**On session start:** If Status is `in_progress`, resume from Next Step. **Also check Pending Questions** — if any exist, you sent questions to Joe that haven't been answered yet. Re-read the notification for full context before proceeding.
