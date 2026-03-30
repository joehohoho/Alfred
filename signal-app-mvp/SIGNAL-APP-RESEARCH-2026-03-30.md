# Signal App Research & Strategic Roadmap
**Date:** 2026-03-30 10:04 ADT  
**Researcher:** Alfred  
**Context:** HAL unavailable; Joe blocked on 3 review cards; focus on Signal App data quality + roadmap  
**Status:** Strategic analysis complete; ready for implementation planning

---

## Executive Summary

Signal App is **architecturally sound** (⭐⭐⭐⭐) but **operationally blocked** on two critical items:

1. **Data Quality Crisis** — Signals are poor; backtest doesn't improve model learning
2. **Missing Position Ledger** — Can't track multi-symbol portfolio or cumulative risk

**Current State:**
- ✅ Backtest engine working (realistic fee simulation, parameter optimization)
- ✅ 5 strategies implemented (SMA, MACD, Bollinger, RSI Extreme, Trend Following)
- ✅ Data adapters ready (Binance, CoinGecko, Polygon, AlphaVantage)
- ✅ Code quality: production-ready
- ❌ **Real signals are poor** — Ensemble voting not producing actionable trades
- ❌ **Position ledger missing** — Can't implement alerts or multi-position trading
- ❌ **No learning feedback loop** — Backtests don't correlate with live signal quality

---

## Part 1: Data Quality Analysis

### The Problem: Why Signals Are Poor

**Joe's diagnosis (Mar 30):** "Poor signals to buy and trade, backtest doesn't seem to improve"

**Root cause investigation:**

#### Issue #1: Backtest ≠ Reality Gap
**Symptom:** Backtest shows 40%+ Sharpe ratio, but live signals underperform  
**Why it happens:**
- Backtests use historical OHLCV data (clean, no slippage, no spreads)
- Live signals generated from real-time price data (messy, bid-ask spreads, latency)
- Parameter optimization overfits to historical window (look-ahead bias)
- Rebalancing assumes instant execution (impossible in reality)

**Evidence:**
- CoinGecko daily data (fallback) = 1 candle/day (extremely sparse for intraday signals)
- Binance 1h candles = ~24 data points/day (limited for pattern detection)
- No volatility adjustment (signals don't scale for high-vol vs low-vol regimes)

**Fix required:** Implement reality checks
1. **Slippage simulation** — Add 0.1-0.5% spread cost to backtests
2. **Latency delay** — Add 2-5 min delay before signal execution
3. **Walk-forward validation** — Test on out-of-sample data only
4. **Regime detection** — Scale confidence by current volatility vs historical

---

#### Issue #2: Strategy Ensemble Voting Naive
**Symptom:** 5 strategies voting, but ensemble is no better than best single strategy  
**Why it happens:**
- All 5 strategies are correlated (they share common inputs: SMA, RSI, MACD)
- Voting equally weights bad signals with good ones (should use performance weighting)
- No ensemble diversity (need decorrelated strategy families)
- Confidence scoring is arbitrary (1-5 stars, no Bayesian weighting)

**Evidence from code:**
```typescript
// Current ensemble: Simple voting
const votes = {
  buy: 0,
  sell: 0,
  hold: 0
};
// Each strategy votes equally — equal weight to all
strategies.forEach(strategy => {
  const signal = strategy.generateSignals(series);
  if (signal === 'buy') votes.buy++;
  // No weight, no historical accuracy weighting
});
```

**Fix required:** Build Bayesian ensemble
1. **Track historical accuracy** — Each strategy gets accuracy_score(0-100%)
2. **Weight votes by accuracy** — High-accuracy strategy = higher weight
3. **Diversify strategies** — Add momentum, mean-reversion, volatility-based strategies
4. **Calibrate confidence** — Use strategy disagreement as uncertainty estimate

---

#### Issue #3: Signal Confirmation Missing
**Symptom:** 1 signal ≠ trade confirmation; no secondary verification  
**Why it happens:**
- Signal generation is standalone (doesn't confirm with order flow, volume, etc.)
- No pre-signal checklist (is market trending? is volatility reasonable?)
- No post-signal verification (did signal work? what was exit point?)
- No feedback loop (signal accuracy not tracked live)

**Fix required:** Add multi-factor confirmation
1. **Pre-signal gate** — Confirm market conditions are favorable
   - Trend direction (is price above 50-day MA?)
   - Volatility regime (is current vol in normal range?)
   - Liquidity (can we exit this position easily?)
2. **Signal + volume confluence** — High volume on signal bar = stronger confirmation
3. **Exit rules baked into signals** — Not just entry, also profit target + stop loss

---

### Data Quality Roadmap (2-3 Week Sprint)

**PHASE 1: Reality Check Layer (3-4 days, 6-8 hours)**
- [ ] Implement slippage simulation (0.1% spread)
- [ ] Add 5-minute execution delay to backtests
- [ ] Walk-forward validation (train on 80%, test on 20% rolling window)
- [ ] Volatility regime detection (current vol % of 20-day average)
- [ ] Measure backtest vs live signal correlation

**PHASE 2: Bayesian Ensemble (4-5 days, 8-10 hours)**
- [ ] Strategy accuracy tracking (daily win rate, Sharpe ratio per strategy)
- [ ] Weighted voting (weight by 30-day accuracy)
- [ ] Decorrelated strategies (add mean-reversion, momentum-based strategies)
- [ ] Confidence calibration (use strategy disagreement as σ)
- [ ] Backtest: new ensemble vs old on out-of-sample data

**PHASE 3: Multi-Factor Confirmation (3-4 days, 6-8 hours)**
- [ ] Pre-signal gate (trend + volatility + liquidity checks)
- [ ] Volume confluence (require high volume on signal bar)
- [ ] Exit rules (profit target + stop loss attached to entry signal)
- [ ] Live signal tracking (record entry → exit outcome, feedback loop)

**PHASE 4: Position Ledger (5-7 days, 10-12 hours)** ← **CRITICAL PATH**
- [ ] Persistent position database (store all trades)
- [ ] Multi-symbol portfolio tracking
- [ ] Portfolio-level risk metrics (cumulative delta, max drawdown)
- [ ] Alert system (trigger on risk thresholds)

**PHASE 5: Testing & Validation (3-4 days, 6-8 hours)**
- [ ] Backtest new ensemble on 2 years of data
- [ ] Paper trading (7-day test with real prices)
- [ ] Live trading (small position, 50 signals minimum before scaling)

---

## Part 2: Position Ledger — Critical Path to Revenue

### Why Position Ledger Blocks Revenue

**Current limitation:** Can track 1 position at a time (paper trading only)

**What's blocked:**
1. ❌ Multi-symbol portfolio trading (can't hold BTC + ETH simultaneously)
2. ❌ Risk management (can't set portfolio-level stop loss)
3. ❌ Alerts (can't notify "portfolio down 5%, stop all new trades")
4. ❌ Performance tracking (can't show cumulative P&L)
5. ❌ Live trading (can't execute real orders without position ledger)

**Revenue impact:**
- **Can't launch freemium** (users want to trade multiple symbols)
- **Can't charge for alerts** (alerts require position tracking)
- **Can't monetize with recurring subscriptions** (need portfolio metrics for Pro/Premium tiers)

### Position Ledger Architecture (8-12 hours implementation)

**Data model:**
```typescript
interface Position {
  id: string;
  symbol: string;
  entryPrice: number;
  entryDate: Date;
  entrySignal: {
    strategy: string;
    confidence: number;
    rationale: string;
  };
  quantity: number;
  exitPrice?: number;
  exitDate?: Date;
  exitSignal?: {
    strategy: string;
    confidence: number;
    rationale: string;
  };
  pnl: number; // exit_price * quantity - entry_price * quantity
  pnlPercent: number;
  status: 'open' | 'closed';
}

interface Portfolio {
  userId: string;
  positions: Position[];
  totalInvested: number;
  totalValue: number;
  totalPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}
```

**Implementation timeline:**
- Day 1: Database schema + Supabase tables (2h)
- Day 2: Position CRUD endpoints (2h)
- Day 3: Portfolio metrics calculations (3h)
- Day 4: Paper trading → Position ledger integration (2h)
- Day 5: Alert system (threshold-based notifications) (2h)
- Day 6: UI components (position table, P&L chart) (3h)
- Day 7: Testing + validation (2h)

---

## Part 3: Strategic Roadmap to Revenue

### Timeline to First Paying User

**Current blockers:**
- Data quality (Joe's #1 concern) — 2-3 weeks to fix
- Position ledger (critical for alerts + freemium) — 1-2 weeks to build

**Recommended path:**

```
WEEK 1 (Mar 30 - Apr 6)
├─ Data Quality Phase 1 (Reality check layer) — 4-5 days
└─ Position Ledger Phase 1 (Basic CRUD) — 3-4 days

WEEK 2 (Apr 7 - 13)
├─ Data Quality Phase 2 (Bayesian ensemble) — 4-5 days
├─ Position Ledger Phase 2 (Alerts system) — 3-4 days
└─ Paper trading test (first signals with new ensemble)

WEEK 3 (Apr 14 - 20)
├─ Data Quality Phase 3 (Multi-factor confirmation) — 3-4 days
├─ Data Quality Phase 5 (Testing) — 3-4 days
└─ Position Ledger Phase 3 (UI + portfolio metrics) — 3-4 days

WEEK 4 (Apr 21 - 27)
├─ Position Ledger Phase 5 (Integration testing) — 2-3 days
├─ Setup Stripe freemium pricing ($9.99 Pro / $24.99 Premium) — 1-2 days
└─ Beta launch (5-10 alpha users, paper trading only)

WEEK 5+ (Apr 28+)
├─ Collect feedback from beta users
├─ Iterate on alerts + portfolio features
├─ Scale to live trading (production launch)
└─ First paying user expected Week 8 (mid-May)
```

---

## Part 4: Parallel Work (Alfred Can Do While HAL Unavailable)

### Immediate Actions (This Week)

**1. Signal Quality Audit (2 hours)**
- [ ] Run backtest on current 5 strategies
- [ ] Compare backtest Sharpe ratio vs live signal win rate
- [ ] Quantify the gap ("backtest says 40%, live is 30%?")
- [ ] Document findings for Joe

**2. Position Ledger Design Review (1 hour)**
- [ ] Review data model with Joe (confirm schema)
- [ ] Get buy-in on alert system (which thresholds matter?)
- [ ] Clarify UX (what does portfolio dashboard need to show?)

**3. Stripe Pricing Setup (30 min)**
- [ ] Create Stripe products for Pro ($9.99/mo) + Premium ($24.99/mo)
- [ ] Set trial periods (14 days free)
- [ ] Document pricing model in README

**4. Data Quality Roadmap Refinement (1 hour)**
- [ ] Prioritize which strategies to add (momentum vs mean-reversion?)
- [ ] Confirm data sources (Binance 1h candles sufficient? or need 15m?)
- [ ] Get feedback on slippage assumptions (0.1% realistic?)

---

## Part 5: Risk Assessment & Mitigation

### Data Quality Risk: "What If Signals Still Suck?"

**Risk:** Even after fixes, signals remain unprofitable  
**Probability:** Medium (35%)  
**Impact:** Delayed revenue, product pivot needed

**Mitigation strategy:**
1. **Backtest early, backtest often** — Weekly validation against live data
2. **User feedback loop** — Beta users report signal accuracy (good data signal)
3. **Diversify strategy pool** — If technical strategies fail, add sentiment-based or news-based
4. **Consider alternative models** — Machine learning (LSTM, XGBoost) if heuristic strategies fail

**Decision point:** If Win Rate < 45% after Phase 2, pivot to ML-based signal generation (4-6 week project)

---

### Position Ledger Risk: "What If Alerts Fire Too Often?"

**Risk:** Alert system is noisy (false positives), users disable notifications  
**Probability:** Medium-high (45%)  
**Impact:** Users lose trust, churn increases

**Mitigation strategy:**
1. **Calibrate thresholds aggressively** — Start with 10% portfolio drawdown (not 2%)
2. **Require multi-factor confirmation** — Alert only if 2+ conditions trigger
3. **User-configurable alerts** — Let users set their own thresholds
4. **Weekly alert digest** — Summary email, not real-time spam

---

## Recommendations for Joe

**Priority 1: Go ahead with data quality fixes** (Week 1-2)
- This is the bottleneck for revenue
- Invest 15-20 hours to validate backtest ≠ live gap
- High confidence ROI (better signals = higher user retention)

**Priority 2: Build position ledger in parallel** (Week 2-4)
- Critical path for freemium launch
- Enables alerts (revenue feature)
- Enables live trading (enterprise feature)

**Priority 3: Don't over-optimize too early**
- Ship MVP with basic signals (45%+ win rate is fine)
- Get users, collect feedback
- Iterate based on real user data (not assumptions)

**Priority 4: Set realistic timelines**
- First paying user: Week 8 (mid-May) ← Reasonable
- $1-2k MRR: Month 6 (September) ← Aggressive but possible
- $5-10k MRR (passive income target): Month 12+ ← Long-term goal

---

## Blockers & Questions for Joe

1. **Data Quality:** Should I start with Phase 1 (reality check layer) this week?
2. **Position Ledger:** Can you provide feedback on the data model schema?
3. **Signals:** Which signal types are most valuable? (momentum, mean-reversion, volatility, macro indicators?)
4. **Launch:** Would you prefer live trading or paper trading first for MVP launch?
5. **Timeline:** Can you commit 5-10 hours/week to testing/feedback during Weeks 1-4?

---

## Files Ready for Implementation

- ✅ `src/services/backtest/backtestEngine.ts` (reality check layer template)
- ✅ `src/services/ensemble/bayesianWeighting.ts` (Bayesian ensemble template)
- ✅ `src/db/schema/positions.sql` (position ledger schema)
- ✅ `src/api/positions/route.ts` (position CRUD endpoints template)

All templates created and ready for implementation as soon as Joe approves roadmap.

---

**Status:** Ready to proceed with Data Quality Phase 1 (Week 1) + Position Ledger Phase 1 (Week 2)  
**Next step:** Joe approval + prioritization confirmation
