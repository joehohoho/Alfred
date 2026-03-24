# Market Signals App - Rebuild Plan & Implementation Strategy

**Status:** In Progress (started 2026-03-23 22:30 ADT)  
**Objective:** Transform the app from static signal generation → adaptive learning system that improves over time  
**Timeline:** 2 weeks (intensive), 4 days/week development

---

## Why Rebuild (Not Incremental Fixes)?

The current architecture has **fundamental limits** that incremental patching can't overcome:

1. **No learning loop** — Signals generated but never validated against outcomes
2. **Static parameters** — SMA(9,21), RSI(14) hardcoded, never tuned
3. **Insufficient data** — 30 days for crypto, too short for pattern recognition
4. **No multi-strategy system** — Can't compare what works best
5. **No feedback mechanism** — App never improves, just repeats same strategy forever

**Result of incremental approach:** 5-10x more signals, but still no learning. App stays static.

**Result of rebuild:** True adaptive system that improves weekly, actually learns from outcomes, can switch strategies, optimizes parameters automatically.

---

## Architecture (New)

```
Market Signals App V2 (Adaptive Learning System)
┌─────────────────────────────────────────────────┐
│ DATA LAYER                                       │
│ - Extended historical data (2+ years daily + 1h)│
│ - Cached price feeds (reduces API calls)         │
│ - Trade outcome tracking (validation)            │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ STRATEGY LAYER                                   │
│ - BaseStrategy (abstract)                        │
│ - SMA+RSI (improved, parametric)                │
│ - MACD + histogram divergence                   │
│ - Bollinger Bands + momentum                    │
│ - RSI extremes (independent)                    │
│ - Trend following (HMA + ADX)                   │
│ - Ensemble (multi-strategy voting)              │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ BACKTEST ENGINE                                  │
│ - Replay historical data                         │
│ - Simulate realistic fees (0.1% per trade)      │
│ - Calculate: P&L, win rate, Sharpe, drawdown   │
│ - Parameter optimization (grid search)           │
│ - Out-of-sample validation                      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ SIGNAL GENERATION                                │
│ - Evaluate all strategies in parallel            │
│ - Weight by recent historical accuracy           │
│ - Rank signals (primary + alternates)           │
│ - Confidence = (strength × historical accuracy) │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│ FEEDBACK & LEARNING                             │
│ - Track outcomes (entry → exit prices)          │
│ - Calculate realized P&L per signal             │
│ - Weekly re-evaluation (which strategies work?) │
│ - Parameter auto-tuning (adjust based on data)  │
│ - Performance dashboard (visibility)            │
└─────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Data Infrastructure (Days 1-2)
**Goal:** Establish data foundation for backtesting

**Tasks:**
1. **Create `DataManager` class**
   - Unified interface for fetching price data
   - Support multiple sources: Binance, CoinGecko, Alpha Vantage, Polygon.io
   - Caching layer (SQLite/JSON) to reduce API calls
   - Historical data: 2 years daily + 1 year intraday (1h candles)

2. **Extend `PriceData` model**
   - Add `timeframe` field (1h, 4h, daily, weekly)
   - Add `volume` field (needed for volume-based strategies)
   - Add `fetchedAt` timestamp (track data freshness)

3. **Asset registry**
   - Top 20 cryptos (by market cap + liquidity)
   - Top 50 stocks (S&P 500 sample, high volume)
   - Quality filters: min $1M daily volume (stocks), min 100M market cap (crypto)

4. **Database schema**
   - `price_data` table (indexed by symbol, timeframe, date)
   - `signals_generated` table (tracks all generated signals + confidence)
   - `trades_executed` table (outcome tracking: entry → exit)
   - `strategy_performance` table (weekly metrics per strategy per asset)

**Files to create/modify:**
- `src/services/data/DataManager.ts` (new)
- `src/services/data/sources/` (new directory with source adapters)
- `src/models/PriceData.ts` (extend)
- `src/db/schema.ts` (new)

---

### Phase 2: Strategy Framework & Implementations (Days 2-5)
**Goal:** Build 5+ strategies + parameter optimization

**Tasks:**
1. **Implement 5 core strategies:**
   - ✅ SMA+RSI (improved, parametric) — already done in `smaRsiImproved.ts`
   - ✅ MACD divergence — already done in `macdStrategy.ts`
   - ✅ Bollinger Bands — already done in `bollingerStrategy.ts`
   - NEW: RSI extremes (independent of SMA)
   - NEW: Trend following (HMA + ADX crossover)
   - NEW: Volume-weighted momentum

2. **Create `StrategyRegistry`**
   - Store all strategy implementations
   - Track real-time performance (win rate, Sharpe)
   - Auto-select best performer per asset
   - Enable A/B testing

3. **Implement `ParameterOptimizer`**
   - Grid search over parameter ranges
   - Parallel evaluation (speed up via Worker threads)
   - Rank by Sharpe ratio (risk-adjusted returns)
   - Return top N configurations with validation

4. **Implement `OutOfSampleValidator`**
   - Train/test split (80/20 or rolling window)
   - Detect overfitting
   - Validate generalization (does it work on unseen data?)

**Files to create/modify:**
- `src/services/strategies/rsiExtremeStrategy.ts` (new)
- `src/services/strategies/trendFollowingStrategy.ts` (new)
- `src/services/strategies/volumeStrategy.ts` (new)
- `src/services/strategies/registry.ts` (create/extend)
- `src/services/backtest/optimizer.ts` (enhance)
- `src/services/backtest/validator.ts` (new)

---

### Phase 3: Adaptive Signal Generation (Days 4-7)
**Goal:** Implement multi-strategy voting + confidence calculation

**Tasks:**
1. **Create `AdaptiveSignalGenerator`**
   - Evaluate all strategies in parallel
   - Collect signals + confidence scores
   - Weight by recent historical accuracy (last 90 days)
   - Merge overlapping signals (within 1 day)
   - Return ranked output (primary + alternates)

2. **Confidence calculation (improved)**
   - `final_confidence = strategy_signal_strength × strategy_historical_accuracy`
   - Example: MACD signal (strength 0.8) × strategy accuracy (75%) = 0.60 confidence
   - Accounts for both indicator strength AND whether that strategy works for this asset

3. **Multi-timeframe alignment**
   - Generate signals on daily + weekly
   - Require alignment (both bullish = stronger)
   - Boost confidence when multiple timeframes agree

4. **Signal enrichment**
   - Add `suggested_stop_loss` (based on recent volatility)
   - Add `suggested_take_profit` (based on risk/reward ratio)
   - Add `timeframe` field (daily, weekly, intraday)
   - Add `source_strategies` list (which strategies generated this?)
   - Add `historical_accuracy` field (how often does this signal combo work?)

**Files to create/modify:**
- `src/services/signals/AdaptiveSignalGenerator.ts` (new)
- `src/models/Signal.ts` (extend with new fields)
- `src/services/signals/confidenceCalculator.ts` (new)

---

### Phase 4: Feedback Loop & Learning (Days 6-10)
**Goal:** Implement outcome tracking + auto-tuning

**Tasks:**
1. **Create `SignalTracker`**
   - Link generated signals to actual trades
   - Track: entry price, exit price, entry date, exit date, realized P&L
   - Calculate accuracy metrics (% of signals that were profitable, avg return per signal)
   - Group by strategy + asset (identify which works where)

2. **Performance dashboard (API)**
   - `GET /api/performance/strategy/{symbol}` — Weekly metrics for strategy X on asset Y
   - `GET /api/performance/compare` — Rank all strategies by Sharpe ratio
   - `GET /api/signals/accuracy` — Historical accuracy per signal type
   - Show: win rate, profit factor, max drawdown, Sharpe ratio, returns

3. **Weekly auto-evaluation cron job**
   - Run backtest on last 90 days for all strategies
   - Calculate best parameters for that period
   - Update `strategy_performance` table
   - Deploy top 3 parameter sets for next week
   - A/B test which performs best

4. **Parameter auto-tuning**
   - Every Sunday: re-optimize all strategies on last 90 days
   - Update `current_params` for each strategy
   - If new params significantly better (Sharpe +20%), use them for next week
   - Log parameter changes (audit trail)

**Files to create/modify:**
- `src/services/tracking/SignalTracker.ts` (new)
- `src/app/api/performance/route.ts` (new)
- `src/services/learning/autoTuner.ts` (new)
- Cron job: `scripts/weekly-auto-tune.sh` (new)

---

### Phase 5: UI & Deployment (Days 9-14)
**Goal:** Surface learning metrics + make system visible

**Tasks:**
1. **Dashboard pages**
   - Strategy performance leaderboard (which strategy is winning?)
   - Asset performance breakdown (which signals work well for BTC vs AAPL?)
   - Signal accuracy metrics (confidence vs actual outcomes)
   - Historical signals + outcomes (log of all signals with results)

2. **Configuration UI**
   - Enable/disable strategies per asset
   - Adjust confidence thresholds
   - View current parameter sets
   - Trigger manual backtests/optimization

3. **Alert system**
   - High-confidence signals only (>0.65)
   - Multi-strategy consensus (requires 2+ strategies)
   - Display source strategies + historical accuracy
   - Send to Discord/email when signal quality is high

4. **Deployment**
   - Docker build + push
   - Environment config (data sources, API keys)
   - Database migrations
   - Health checks (data freshness, model accuracy)

**Files to create/modify:**
- `src/app/dashboard/page.tsx` (enhance)
- `src/app/performance/page.tsx` (new)
- `src/components/StrategyLeaderboard.tsx` (new)
- `src/components/SignalAccuracy.tsx` (new)
- Deployment configs (Dockerfile, env)

---

## Key Decisions (Awaiting Joe Input)

1. **Timeframe preference:** Daily signals only, or include 4h/1h intraday?
2. **Asset focus:** Crypto only, stocks only, or both?
3. **Risk tolerance:** What's acceptable max drawdown? (20%, 30%, 50%?)
4. **Trading style:** Day trading (exit in hours), swing (days), position (weeks/months)?
5. **Deployment:** Self-hosted (this Mac), cloud (AWS/Heroku), or hybrid?

**Assumption for now:** Both crypto + stocks, daily + 4h signals, 30% max drawdown, swing trading (2-30 days), self-hosted on Mac.

---

## Success Criteria

**Phase 1 Complete (Data):**
- Can fetch 2+ years of daily data + 1 year of 1h candles for 20 cryptos + 50 stocks
- Database schema working, no API errors
- Backtest engine can replay 90 days without crashing

**Phase 2 Complete (Strategies):**
- 5+ strategies implemented, each generates >5 signals per 90-day period
- Parameter optimizer runs in <2 min for 100 combinations
- Best params vary by asset (proof that optimization works)

**Phase 3 Complete (Adaptive):**
- Multi-timeframe alignment works (daily + weekly agree on 60%+ of signals)
- Confidence scores correlate with actual accuracy (higher confidence = more wins)
- Signal volume increases 3-5x while quality improves

**Phase 4 Complete (Learning):**
- Weekly auto-tuning runs successfully (cron job)
- Parameters adjust week-to-week based on backtest results
- Dashboard shows clear improvement trends (win rate, Sharpe ratio increasing)

**Phase 5 Complete (Deployment):**
- UI surfaces all key metrics clearly
- High-confidence signals generate alerts
- System running stable 1+ week with continuous improvements

---

## Development Notes

### Code Quality
- TypeScript strict mode (no `any` types)
- Unit tests for each strategy (verify signals generate correctly)
- Integration tests (backtest engine validates trade logic)
- Error handling (graceful fallback if API fails)

### Performance Targets
- Backtest 90 days of data in <500ms
- Generate signals for 20 assets in <2s
- Dashboard loads in <1s
- Weekly auto-tune completes in <5 min

### Data Quality
- Handle gaps in price data (weekends, holidays)
- Validate data freshness (alerts if >24h stale)
- Detect data corruption (prices jumping >20%)
- Log all API failures + retries

---

## Risk Mitigation

**Risk: Parameter optimization overfits to past data**
→ Use out-of-sample validation, rolling window backtests, Sharpe ratio (not just win rate)

**Risk: Strategies degrade over time (market regime change)**
→ Weekly re-optimization, monitor Sharpe ratio trend, alert if declining

**Risk: API failures cause missing data**
→ Cache data locally, fallback to older data if API down, alerts on data staleness

**Risk: System generates too many false signals**
→ High confidence thresholds (>0.65), multi-strategy consensus, manual review during first week

---

## What "Impressive" Looks Like

✅ **Week 1:** System running, 20+ signals generated daily, 60%+ confidence scores  
✅ **Week 2:** Backtest shows 55%+ win rate, Sharpe >1.0, parameters auto-tuning working  
✅ **Week 3:** Dashboard shows clear trends: win rate improving, drawdown stable, strategies ranking different per asset  
✅ **Week 4:** System claims 70%+ accuracy on a subset of assets; user can see which strategies work where  

**Real impressive:** System learns from its mistakes, improves over time, doesn't need manual tuning, surfaces insights about what works.

---

## Files Checklist (Track Progress)

### Phase 1: Data Infrastructure
- [ ] `src/services/data/DataManager.ts`
- [ ] `src/services/data/sources/binanceAdapter.ts`
- [ ] `src/services/data/sources/coingeckoAdapter.ts`
- [ ] `src/services/data/sources/polygonAdapter.ts`
- [ ] `src/db/schema.ts`
- [ ] Database migration script

### Phase 2: Strategies
- [ ] `src/services/strategies/rsiExtremeStrategy.ts`
- [ ] `src/services/strategies/trendFollowingStrategy.ts`
- [ ] `src/services/strategies/volumeStrategy.ts`
- [ ] `src/services/strategies/registry.ts` (enhanced)
- [ ] `src/services/backtest/validator.ts`
- [ ] Unit tests for each strategy

### Phase 3: Adaptive Signal Generation
- [ ] `src/services/signals/AdaptiveSignalGenerator.ts`
- [ ] `src/services/signals/confidenceCalculator.ts`
- [ ] `src/models/Signal.ts` (extended)
- [ ] Integration tests

### Phase 4: Learning & Feedback
- [ ] `src/services/tracking/SignalTracker.ts`
- [ ] `src/app/api/performance/route.ts`
- [ ] `src/services/learning/autoTuner.ts`
- [ ] Cron job: `scripts/weekly-auto-tune.sh`
- [ ] Database tables: signals_generated, trades_executed, strategy_performance

### Phase 5: UI & Deployment
- [ ] Dashboard enhancements (strategy leaderboard, performance metrics)
- [ ] `src/app/performance/page.tsx`
- [ ] Component: `StrategyLeaderboard.tsx`
- [ ] Component: `SignalAccuracy.tsx`
- [ ] Docker build + deployment
- [ ] Health checks + monitoring

---

## Next Immediate Steps

1. ✅ **Analysis complete** — documented all issues
2. 🟡 **Architecture designed** — blueprint ready
3. 🟡 **Start Phase 1** — implement DataManager + sources
4. 🟡 **Parallel: Test current strategies** — verify backtest engine works
5. 🟡 **Document API** — detail what signals will return (fields, structure)

---

## Questions for Joe (When Ready)

1. Should we migrate to a proper backend (Node/Express) or keep Next.js API routes?
2. Preferred deployment: self-hosted on Mac mini, cloud, or both?
3. Should high-confidence signals trigger automatic trades, or just alerts?
4. Risk tolerance for parameter optimization: accept 10% worse Sharpe if win rate +15%?
5. Timeline: 2 intensive weeks, or spread 4 weeks with lighter daily load?

---

## Commit Message Template

```
[Market Signals] <Phase>: <Change>

<Detailed description of what changed and why>

Files: <changed files>
Tests: <added test coverage>
Metrics: <performance impact if relevant>
```

Example:
```
[Market Signals] Phase 1: Implement DataManager with Binance + CoinGecko adapters

- Added DataManager class with unified interface for price fetching
- Implemented Binance 1h/4h candle fetching with caching
- Implemented CoinGecko daily data fetching
- Added SQLite caching layer to reduce API calls by 80%
- Extended PriceData model with volume + timeframe fields

Files: src/services/data/DataManager.ts, src/services/data/sources/*, src/models/PriceData.ts
Tests: 12 new tests, all passing
Metrics: API calls reduced 80%, backtest speed +40%
```

---

**Status:** Ready to begin Phase 1  
**Last updated:** 2026-03-23 22:30 ADT
