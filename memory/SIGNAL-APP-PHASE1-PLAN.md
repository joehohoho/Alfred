# Signal App Fast Track — Phase 1 Plan (Feb 23-28)

**Objective:** Finalize architecture + data pipeline for live trading signals by March.

**Status:** Architecture review complete. Ready to implement real-time layer.

---

## Current State (As of Feb 23, 2026)

### ✅ Existing (Mature, production-ready)
- DuckDB metadata + Parquet candle storage
- 33 assets ingested, dual timeframe (1d + 15m)
- 3 strategies (SMA, RSI, Donchian) with ADX regime filtering
- Event-driven backtesting engine + performance metrics
- ML module (walk-forward classifier, 30+ features)
- Web UI dashboard (FastAPI, Plotly charts, port 8002)
- Slack webhook integration (disabled)
- Paper trading module (exists, not in UI yet)

### ❌ Missing (Required for live signals)
1. **Real-time data pipeline** — Feb 10 data is stale. Need live market feeds.
2. **Live signal generation** — Cron job to evaluate strategies + dispatch alerts
3. **Signal dispatcher** — Route to Slack + Command Center
4. **Paper trading UI** — Integrate into dashboard
5. **Risk safety layer** — Dry-run validation + position sizing tests

---

## Phase 1 Deliverables (Feb 23-28)

### 1. Real-Time Data Pipeline

**Problem:** Current ingest is manual/batch. Need continuous updates for live trading.

**Solution:** Add WebSocket listener for market data

**Decision Required from Joe:**
- **Data source preference:** 
  - **A) Kraken only** — Already integrated, free REST API, but limited to ~720 candles history
  - **B) Binance only** — Higher liquidity, better spreads, lower fees, but new integration
  - **C) Both** — Redundancy + coverage, but more complexity
  - **Recommendation:** Start with **Kraken** (existing), add **Binance** by Mar if time permits

**Implementation (if Kraken):**
- Add Kraken WebSocket feed listener (`ws://ws.kraken.com`)
- Update DuckDB every 1m with new OHLCV candles
- Fallback to REST polling if WebSocket drops
- Cost: ~$0/day (Kraken free tier)

**Implementation (if Binance):**
- Add Binance WebSocket listener (`wss://stream.binance.com:9443/ws`)
- Parallel ingestion to separate table `candle_metadata_binance`
- Unified screener across both sources
- Cost: ~$0/day (Binance free tier for 1200+ requests/min)

**Effort estimate:** 
- Kraken: 2-3 hours (tested integration, minimal changes)
- Binance: 4-6 hours (new provider adapter, testing)
- Both: 6-8 hours (includes redundancy + fallback logic)

**Files to create/modify:**
- `src/data/providers/kraken_websocket.py` (new)
- `src/data/providers/binance_websocket.py` (new, optional)
- `src/data/ingest_realtime.py` (new, orchestrator)
- `config/config.yaml` (add WebSocket settings)
- `src/app/cli.py` (add `ingest-realtime` command)

---

### 2. Live Signal Generation + Dispatch

**Problem:** Backtesting generates signals but doesn't emit them live.

**Solution:** Create signal watcher that evaluates strategies every 5-15m

**Implementation:**
- New cron job: `signal-watcher.py` (runs every 15 min)
- Evaluates all strategies against latest candles
- Emits `SignalEvent` for BUY/SELL/HOLD
- Dispatcher routes to:
  - Slack channel #trading-signals (immediate)
  - Command Center notifications (persistent record)
  - Paper trading module (for dry-run execution)

**Signal format (Slack):**
```
📈 BUY: BTC-USD (SMA Crossover, 1d)
Strategy Score: 7.8/10 | Trend: Strong | Confidence: 82%
Entry: $45,230 | Stop: $43,890 | Target: $47,500
ML Model: Bullish (p=0.72)
```

**Effort estimate:** 4-6 hours (includes testing + safety checks)

**Files to create/modify:**
- `src/signals/live_watcher.py` (new)
- `src/signals/dispatcher.py` (new)
- `scripts/signal-watcher-cron.sh` (new)
- Integration with paper trading module

---

### 3. Paper Trading Integration

**Problem:** Paper trading module exists but isn't in web UI.

**Solution:** Add `/paper-trading` tab to dashboard

**Implementation:**
- REST API: `GET /api/paper/positions`, `POST /api/paper/execute`
- UI: Live position tracker, P&L graph, trade journal
- Auto-execute signals from signal watcher (if paper-trading enabled)
- Track win rate, Sharpe, max DD vs backtested metrics

**Effort estimate:** 3-4 hours (mostly UI work)

**Files to create/modify:**
- `src/api/endpoints/paper_trading.py` (new)
- `src/paper/trading.py` (integrate with dispatcher)
- `ui/templates/paper_trading.html` (new)
- Update Makefile and Dockerfile

---

### 4. Risk Safety Layer

**Problem:** Live trading needs circuit breakers + dry-run validation.

**Solution:** Multi-layer safeguards

**Checks (before executing signal):**
1. Position size ≤ configured max (default 10% portfolio)
2. Daily loss ≤ configured max (default 2%)
3. Total open positions ≤ configured max (default 5)
4. Asset not in cooldown (post-stop-loss lock)
5. Spread/slippage within tolerance
6. Dry-run mode (paper trading only, no real execution)

**Effort estimate:** 2-3 hours

**Files to create/modify:**
- `src/risk/circuit_breaker.py` (new)
- `src/signals/dispatcher.py` (integrate checks)
- `config/config.yaml` (risk parameters)

---

## Timeline (Feb 23-28)

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **Mon 24** | Real-time data pipeline (3-6h) | Kraken WebSocket listener + DuckDB sync |
| **Tue 25** | Live signal generation (4-6h) | Signal watcher + Slack/Command Center dispatch |
| **Wed 26** | Paper trading UI (3-4h) | Dashboard integration + position tracking |
| **Thu 27** | Risk safety layer (2-3h) | Circuit breakers + dry-run validation |
| **Fri 28** | Testing + refinement (2-3h) | End-to-end flow, edge cases, documentation |

**Total effort:** 16-24 hours (distributed over 5 days = 3.2-4.8 hours/day)

---

## Critical Decision Path

**Joe must decide by EOD Mon Feb 24:**

1. **Data source:** Kraken only, Binance only, or both?
2. **Paper trading scope:** Dry-run signals only, or auto-execute?
3. **Signal frequency:** Every 5m, 15m, or 1h?
4. **Risk tolerance:** Conservative (2% max daily loss) or aggressive (5%)?

**Recommendation:** Kraken + paper trading (auto-execute on signals) + 15m frequency + 2% daily risk max

---

## March Deliverables (Dependent)

Once Phase 1 complete:
- UI dashboards (signal strength, P&L, equity curve)
- Real-time market data visualization (Plotly + WebSocket updates)
- Backtesting integration (run tests against latest data)
- Performance tracking (vs. live signals vs. market benchmark)

---

## Contingencies

**If real-time data pipeline delays:**
- Fallback: Batch ingestion every 1h (via cron)
- Still achieves live signals, just with 1h lag
- Acceptable for daily + 4h strategies, not 15m

**If Binance integration needed:**
- Can add mid-March without blocking Phase 1 completion
- Kraken sufficient for beta

**If safety layer complexity grows:**
- MVP: Log all signals + manual approval flow (Joe reviews in Command Center)
- Auto-execute can wait until April

---

## Success Metrics (Phase 1)

✅ Live data streaming into DuckDB (real-time candles)
✅ Signals generated & dispatched every 15 minutes
✅ Paper trading tracking live P&L
✅ 7-day dry-run with 0 circuit breaker violations
✅ Risk layer documented + tested
✅ Ready for March UI + execution layer

---

## Files Affected (Summary)

**New:**
- `src/data/providers/kraken_websocket.py`
- `src/data/ingest_realtime.py`
- `src/signals/live_watcher.py`
- `src/signals/dispatcher.py`
- `src/risk/circuit_breaker.py`
- `src/api/endpoints/paper_trading.py`
- `ui/templates/paper_trading.html`
- `scripts/signal-watcher-cron.sh`

**Modified:**
- `config/config.yaml` (WebSocket settings + risk parameters)
- `src/app/cli.py` (new commands)
- `pyproject.toml` (dependencies)
- LaunchAgent for signal watcher

---

**Next Step:** Wait for Joe's decision on data source + parameters. Once decided, begin data pipeline implementation (Mon 24).

---

*Created: 2026-02-23 15:49 AST*
*Status: Ready for decision gate*
