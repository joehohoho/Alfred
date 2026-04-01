# Market Signals App - 4-Week Implementation Roadmap
**Version:** 1.0  
**Target Start:** Week of April 7, 2026  
**Target Completion:** Week of May 5, 2026

---

## Executive Summary

This roadmap prioritizes improvements that will have the **highest impact on signal quality** with the **lowest implementation effort**. Focus on data visibility, entry precision, and real-time feedback first.

**Expected Outcome:** 15-20% reduction in false positives, +5-8% improvement in win rate, functional learning system.

---

## Week 1: Signal Tracking Infrastructure (Days 1-5)

### Goal: Build the foundation for learning and evaluation

### Task 1.1: Signal Subtype Classification (2 days)
**Priority:** 🔴 Critical  
**Effort:** Low (4 hours)

```typescript
// 1. Modify src/models/Signal.ts
interface Signal {
  // Existing fields...
  signalType: 'BUY' | 'SELL';
  
  // NEW: Subtype classification
  subType?: 'TREND_BREAK' | 'PULLBACK_BUY' | 'MEAN_REVERSION' | 'RANGE_BREAK' | 'DIVERGENCE';
  layersConfirmed?: number; // 1-4, how many confirmation layers
  confirmationReasons?: string[]; // ["ADX > 25", "Volume spike", "RSI 40-55"]
  executionQuality?: number; // 0-1, how close to ideal entry
}
```

**Deliverables:**
- ✅ Signal interface updated
- ✅ All strategies update signals with subType
- ✅ Test on 100 backtest signals

**Acceptance Criteria:**
- Every generated signal has a subType
- subType is specific (not generic)
- Confirmation reasons documented

---

### Task 1.2: Win-Rate Dashboard by Signal Type (3 days)
**Priority:** 🔴 Critical  
**Effort:** Low-Medium (6 hours)

**Files to Create:**
1. `src/services/analytics/winRateDashboard.ts` (aggregator)
2. `src/app/api/win-rate-dashboard/route.ts` (API endpoint)

```typescript
// 1. Aggregator logic (pseudocode)
async function computeWinRateBySignalType(days: number) {
  const trades = await db.query('trades', { 
    exitedAt: { $gte: Date.now() - days*24*60*60*1000 }
  });
  
  const signalRecords = await db.query('signal_records', {
    linkedTrade: { $exists: true }
  });
  
  const byType = {};
  for (const signal of signalRecords) {
    const type = signal.subType;
    if (!byType[type]) byType[type] = [];
    byType[type].push({
      ...signal,
      outcome: signal.linkedTrade.pnl > 0 ? 'WIN' : 'LOSS',
      pnl: signal.linkedTrade.pnl,
    });
  }
  
  // Compute metrics per type
  const metrics = {};
  for (const [type, trades] of Object.entries(byType)) {
    const wins = trades.filter(t => t.outcome === 'WIN');
    const losses = trades.filter(t => t.outcome === 'LOSS');
    
    metrics[type] = {
      totalSignals: trades.length,
      winRate: wins.length / trades.length,
      avgWin: average(wins.map(t => t.pnl)),
      avgLoss: average(losses.map(t => Math.abs(t.pnl))),
      sharpe: computeSharpeRatio(trades.map(t => t.pnl)),
      trend: computeTrend(trades, days),
      recommendation: generateRecommendation(metrics[type])
    };
  }
  
  return metrics;
}

// 2. API endpoint
GET /api/win-rate-dashboard?days=30&symbol=BTC
→ Returns dashboard with metrics, trends, recommendations
```

**Deliverables:**
- ✅ Win-rate metrics computed per signal type
- ✅ Trend detection (improving/stable/declining)
- ✅ API endpoint returning dashboard data
- ✅ UI component displaying metrics

**Acceptance Criteria:**
- Dashboard shows win rate for each signal type
- Trends are accurate (compare to hand-calculated sample)
- Recommendations are reasonable (disable if <40% win rate, etc.)

---

### Task 1.3: Signal-to-Trade Mapping (1.5 days)
**Priority:** 🔴 Critical  
**Effort:** Low (4 hours)

**File to Create:**
- `src/services/analytics/signalTradeLinker.ts`

```typescript
// SignalRecord interface (to store in DB)
interface SignalRecord {
  id: string;
  symbol: string;
  assetType: 'crypto' | 'stock';
  signalTime: Date;
  signalType: 'BUY' | 'SELL';
  signalSubType: string;
  price: number;
  confidence: number;
  layers: string[]; // ["ADX", "Volume", "RSI"]
  
  // Filled when trade closes
  linkedTradeId?: string;
  tradeOutcome?: 'WIN' | 'LOSS' | 'BREAK_EVEN';
  entryPrice?: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  daysHeld?: number;
  exitReason?: string;
}

// Linker logic
function linkSignalToTrade(
  signal: SignalRecord,
  trade: TradeRecord
): boolean {
  // Match on: symbol, direction, time proximity (within 1 hour)
  return (
    signal.symbol === trade.symbol &&
    signal.signalType === (trade.direction === 'long' ? 'BUY' : 'SELL') &&
    Math.abs(signal.signalTime.getTime() - trade.entryTime.getTime()) < 60*60*1000
  );
}

// After trade closes
async function updateSignalRecord(trade: TradeRecord) {
  const signal = await findMatchingSignal(trade);
  if (signal) {
    signal.linkedTradeId = trade.id;
    signal.tradeOutcome = trade.pnl > 0 ? 'WIN' : 'LOSS';
    signal.pnl = trade.pnl;
    signal.pnlPercent = trade.pnlPercent;
    signal.daysHeld = trade.daysHeld;
    signal.exitReason = trade.exitReason;
    await db.update('signal_records', signal.id, signal);
  }
}
```

**Deliverables:**
- ✅ SignalRecord interface defined
- ✅ Linking logic implemented
- ✅ Automated linking on trade close
- ✅ Test with 20 sample trades

**Acceptance Criteria:**
- 90%+ of closed trades can be linked to generating signals
- Manual spot-check confirms links are correct
- No signals linked to wrong trades

---

### Task 1.4: Degradation Alert System (2 days)
**Priority:** 🔴 Critical  
**Effort:** Medium (6 hours)

**File to Create:**
- `src/services/analytics/degradationMonitor.ts`

```typescript
interface DegradationMetric {
  name: 'WIN_RATE' | 'SHARPE' | 'DRAWDOWN' | 'PROFIT_FACTOR';
  currentValue: number;
  threshold: { green: number; yellow: number; red: number };
  trend: 'improving' | 'stable' | 'degrading';
  daysSincePeak: number;
  alert?: 'none' | 'warning' | 'critical';
  recommendation?: string;
}

// Monitor logic
async function evaluateDegradation(): Promise<DegradationMetric[]> {
  const recent50 = await getTrades('last_50_completed');
  const previous50 = await getTrades('50-100_trades_ago');
  
  const metrics: DegradationMetric[] = [
    {
      name: 'WIN_RATE',
      currentValue: computeWinRate(recent50),
      threshold: { green: 0.55, yellow: 0.50, red: 0.40 },
      trend: computeTrend(recent50, previous50),
      daysSincePeak: getDaysSincePeak(recent50),
    },
    // ... more metrics
  ];
  
  // Determine alert level
  for (const m of metrics) {
    if (m.currentValue < m.threshold.red) {
      m.alert = 'critical';
      m.recommendation = `CRITICAL: ${m.name} at ${m.currentValue.toFixed(2)}, action required`;
    } else if (m.currentValue < m.threshold.yellow && m.trend === 'degrading') {
      m.alert = 'warning';
      m.recommendation = `WARNING: ${m.name} declining trend, monitor closely`;
    }
  }
  
  return metrics;
}

// Alert emission
async function emitAlerts(metrics: DegradationMetric[]) {
  for (const m of metrics) {
    if (m.alert === 'critical') {
      await sendNotification('CRITICAL', m.recommendation);
      // TODO: Automatic action (disable signal type, pause trading, etc.)
    } else if (m.alert === 'warning') {
      await logWarning(m.recommendation);
    }
  }
}
```

**Deliverables:**
- ✅ Metric monitoring implemented (win rate, Sharpe, drawdown)
- ✅ Trend detection (improving/stable/degrading)
- ✅ Alert thresholds defined
- ✅ Alert notification system integrated
- ✅ Dashboard updated with alerts

**Acceptance Criteria:**
- Alerts fire when metrics exceed thresholds
- Trend detection is accurate (manual spot-check)
- Recommendations are actionable

---

## Week 2: Entry Precision & Risk Management (Days 6-10)

### Goal: Improve entry quality and position sizing

### Task 2.1: ADX Trend Confirmation Layer (1.5 days)
**Priority:** 🔴 Critical  
**Effort:** Low (4 hours)

**File to Modify:**
- `src/services/strategies/base.ts` (add ADX helper)

```typescript
// In BaseStrategy class
protected calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  // Implement ADX calculation (see Smart Strategy for reference)
  // Returns array of ADX values (one per bar)
  // ADX < 20: ranging (noisy market)
  // ADX 20-40: trending (good for breakouts)
  // ADX > 40: very strong trend
}

// Confirmation layer
function isTrendingMarket(
  adx: number,
  smaShort: number,
  smaLong: number,
  closePrice: number,
  threshold: number = 20
): boolean {
  // Only generate signals if ADX > threshold (market is trending)
  // Avoid choppy market noise
  return adx > threshold && (
    (closePrice > smaLong && smaShort > smaLong) || // uptrend
    (closePrice < smaLong && smaShort < smaLong)    // downtrend
  );
}
```

**Deployment:**
1. Add ADX calculation to all strategies (SMA/RSI, MACD, Bollinger, Trend Following)
2. Modify signal generation: only emit if `isTrendingMarket() === true`
3. Backtest impact: expect ~20% fewer signals, ~5% win rate improvement

**Deliverables:**
- ✅ ADX calculation working in all strategies
- ✅ Signals filtered by ADX threshold
- ✅ Backtest shows +5% win rate, -20% signal count

**Acceptance Criteria:**
- ADX values computed correctly (hand-check vs. TradingView)
- Signal reduction is ~20%
- Win rate improves (measure on holdout 50 trades)

---

### Task 2.2: ATR-Based Position Sizing (2 days)
**Priority:** 🔴 Critical  
**Effort:** Medium (6 hours)

**File to Modify:**
- `src/services/backtest/positionSizing.ts`

```typescript
export interface PositionSizingConfig {
  method: 'fixed_percent' | 'atr_adjusted' | 'kelly_fraction' | 'hybrid';
  
  // Fixed method
  fixedRiskPercent: number; // 0.02 = 2% of account per trade
  
  // ATR method
  atrMultiplier: number; // 2.0 = stop is 2 ATR away from entry
  atrPeriod: number; // 14
  
  // Kelly method
  kellyFraction: number; // 0.25 = use 25% of full Kelly
  
  // Limits
  maxRiskPercent: number; // never risk >2.5% in one trade
}

export function calculateATRBasedPosition(
  accountSize: number,
  entryPrice: number,
  atr: number,
  config: PositionSizingConfig
): number {
  // Risk amount based on volatility
  // High ATR → smaller position (wider stop)
  // Low ATR → larger position (tighter stop)
  
  const stopPrice = entryPrice - (atr * config.atrMultiplier);
  const riskAmount = accountSize * config.fixedRiskPercent;
  
  const priceRisk = Math.abs(entryPrice - stopPrice);
  const quantity = Math.floor(riskAmount / priceRisk);
  
  return Math.max(1, quantity);
}
```

**Testing:**
1. Backtest with ATR-based sizing vs. fixed sizing
2. Measure impact on win rate (should improve slightly)
3. Measure impact on max drawdown (should improve significantly)

**Deliverables:**
- ✅ ATR-based sizing implemented
- ✅ Backtest comparison (ATR vs. fixed)
- ✅ Configuration API allowing user selection

**Acceptance Criteria:**
- ATR sizing reduces drawdown by 10-15%
- Win rate stays same or improves
- Positions are reasonably sized (not > 10% of account)

---

### Task 2.3: Smart Stop-Loss Placement (1.5 days)
**Priority:** 🟠 High  
**Effort:** Medium (6 hours)

**File to Create:**
- `src/services/backtest/smartStopLoss.ts`

```typescript
interface StopLossConfig {
  method: 'atr' | 'support_resistance' | 'hybrid';
  atrMultiplier: number; // 2.0 for ATR method
  lookbackBars: number; // 50 for S/R detection
}

function calculateSmartStopLoss(
  entryPrice: number,
  entryBar: number, // index in price series
  series: PriceSeries,
  config: StopLossConfig,
  direction: 'long' | 'short'
): number {
  const closes = series.points.map(p => p.close);
  const lows = series.points.map(p => p.low ?? p.close);
  const highs = series.points.map(p => p.high ?? p.close);
  const atr = calculateATR(closes, series, 14);

  // ATR-based stop
  const atrStop = direction === 'long'
    ? entryPrice - (atr[entryBar] * config.atrMultiplier)
    : entryPrice + (atr[entryBar] * config.atrMultiplier);

  // Support/Resistance-based stop
  const recentLows = lows.slice(Math.max(0, entryBar - config.lookbackBars), entryBar);
  const recentHighs = highs.slice(Math.max(0, entryBar - config.lookbackBars), entryBar);
  
  const support = Math.min(...recentLows);
  const resistance = Math.max(...recentHighs);
  
  const srStop = direction === 'long'
    ? support * 0.98 // 2% buffer below support
    : resistance * 1.02; // 2% buffer above resistance

  // Hybrid: use the one further away (more protective)
  if (config.method === 'atr') return atrStop;
  if (config.method === 'support_resistance') return srStop;
  
  return direction === 'long'
    ? Math.min(atrStop, srStop) // lower stop = more protective
    : Math.max(atrStop, srStop); // higher stop = more protective
}
```

**Testing:**
1. Backtest smart stops vs. fixed stops on 100 trades
2. Measure: false stop-outs, drawdown, overall P&L

**Deliverables:**
- ✅ Smart stop-loss calculation implemented
- ✅ Backtest comparison (smart vs. fixed)
- ✅ Configuration API

**Acceptance Criteria:**
- Smart stops reduce false stop-outs by 20-30%
- Drawdown improves or stays same
- Actual P&L improves by 1-2%

---

## Week 3: Signal Quality Improvements (Days 11-15)

### Goal: Implement multi-layer confirmation and context filters

### Task 3.1: Support/Resistance Auto-Detection (2 days)
**Priority:** 🟠 High  
**Effort:** Medium (8 hours)

**File to Create:**
- `src/services/analysis/supportResistance.ts`

```typescript
interface PriceLevel {
  level: number;
  strength: number; // 1-5, how many times price bounced here
  lastTouched: Date;
  direction: 'support' | 'resistance';
}

export function detectSupportResistance(
  series: PriceSeries,
  lookbackBars: number = 50
): PriceLevel[] {
  const closes = series.points.map(p => p.close);
  const lows = series.points.map(p => p.low ?? p.close);
  const highs = series.points.map(p => p.high ?? p.close);
  
  const recentLows = lows.slice(-lookbackBars);
  const recentHighs = highs.slice(-lookbackBars);
  
  // Find local minima (support levels)
  const supports: PriceLevel[] = [];
  for (let i = 1; i < recentLows.length - 1; i++) {
    if (recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i+1]) {
      // This is a local low (support)
      const level = recentLows[i];
      // Count how many times price bounced here (tolerance: 2%)
      const touches = recentLows.filter(l => Math.abs(l - level) / level < 0.02).length;
      
      if (touches >= 2) { // Valid support if touched 2+ times
        supports.push({
          level,
          strength: Math.min(5, touches),
          lastTouched: series.points[series.points.length - lookbackBars + i].timestamp,
          direction: 'support',
        });
      }
    }
  }
  
  // Find local maxima (resistance levels)
  const resistances: PriceLevel[] = []; // similar logic for highs
  
  return [...supports, ...resistances].sort((a, b) => b.strength - a.strength);
}

// Confirmation layer
function isPriceNearKeyLevel(
  price: number,
  levels: PriceLevel[],
  tolerance: number = 0.02 // 2%
): PriceLevel | null {
  for (const level of levels) {
    if (Math.abs(price - level.level) / level.level < tolerance) {
      return level; // Price is near this key level
    }
  }
  return null;
}
```

**Deployment:**
1. Calculate S/R levels for each symbol
2. Modify signal generation: only buy near support, sell near resistance
3. Backtest impact: expect +5-10% accuracy on entry placement

**Deliverables:**
- ✅ S/R detection algorithm working
- ✅ Integration into signal generation
- ✅ Backtest validation

**Acceptance Criteria:**
- S/R levels detected accurately (hand-check on chart)
- Signal generation respects levels
- Entry accuracy improved by 5-10%

---

### Task 3.2: Volatility Regime Filter (2 days)
**Priority:** 🟠 High  
**Effort:** Medium (8 hours)

**File to Create:**
- `src/services/analysis/volatilityRegime.ts`

```typescript
type VolatilityRegime = 'low' | 'normal' | 'high' | 'extreme';

interface VolatilityMetrics {
  regime: VolatilityRegime;
  atr: number;
  atrPercentage: number; // ATR / close as %
  volatility30d: number;
  vix_equivalent: number; // for crypto, compute implied vol
  trend: 'increasing' | 'stable' | 'decreasing';
}

export function classifyVolatilityRegime(
  closes: number[],
  atrValues: number[],
  period30d: number[] = []
): VolatilityMetrics {
  const currentAtr = atrValues[atrValues.length - 1];
  const atrPercent = currentAtr / closes[closes.length - 1];
  
  // Classify regime
  let regime: VolatilityRegime;
  if (atrPercent < 0.01) regime = 'low'; // ATR < 1% of price
  else if (atrPercent < 0.02) regime = 'normal'; // 1-2%
  else if (atrPercent < 0.04) regime = 'high'; // 2-4%
  else regime = 'extreme'; // > 4%
  
  // Trend
  const prevAtr = atrValues[Math.max(0, atrValues.length - 10)];
  const trend = currentAtr > prevAtr * 1.05 ? 'increasing'
    : currentAtr < prevAtr * 0.95 ? 'decreasing'
    : 'stable';
  
  return {
    regime,
    atr: currentAtr,
    atrPercentage: atrPercent,
    volatility30d: 0, // TODO: compute if period30d provided
    vix_equivalent: 0,
    trend,
  };
}

// Signal filter
function filterByVolatilityRegime(
  signal: SignalWithStrength,
  volMetrics: VolatilityMetrics,
  config: VolatilityFilterConfig
): boolean {
  // Don't buy in extreme vol (too risky)
  if (signal.type === 'BUY' && volMetrics.regime === 'extreme') {
    return false; // SKIP
  }
  
  // Don't short in extreme vol
  if (signal.type === 'SELL' && volMetrics.regime === 'extreme') {
    return false; // SKIP
  }
  
  // Reduce signal strength in high vol (less confident)
  if (volMetrics.regime === 'high') {
    signal.strength *= 0.8; // 20% reduction
  }
  
  return true; // PASS
}
```

**Deployment:**
1. Calculate volatility regime for each bar
2. Filter signals by regime
3. Backtest impact: expect +2-5% win rate, -15-20% drawdown

**Deliverables:**
- ✅ Volatility regime classification working
- ✅ Filter logic integrated into signal processing
- ✅ Backtest validation

**Acceptance Criteria:**
- Regime classification matches visual inspection
- Signals filtered out during crashes
- Win rate improves, drawdown reduces

---

## Week 4: Learning & Optimization (Days 16-20)

### Goal: Implement real-time learning and smarter optimization

### Task 4.1: Bayesian Parameter Optimizer (3 days)
**Priority:** 🟠 High  
**Effort:** High (12 hours)

**File to Create:**
- `src/services/backtest/bayesianOptimizer.ts`

```typescript
interface OptimizationConfig {
  strategy: string;
  symbol: string;
  lookbackDays: number;
  objective: 'maxSharpe' | 'maxWinRate' | 'minDrawdown';
  
  // Bayesian optimization
  explorationRate: number; // 0.2 (20% explore, 80% exploit)
  maxIterations: number; // 500 (vs. 10,000 for grid search)
  
  // Parameter bounds
  parameterBounds: Record<string, [number, number]>; // e.g., { shortPeriod: [5, 25] }
}

export class BayesianOptimizer {
  async optimize(config: OptimizationConfig): Promise<OptimizationResult> {
    // 1. Build Gaussian Process model
    // 2. Iteratively sample parameters with exploration/exploitation tradeoff
    // 3. Return best parameters found
    
    const history: ParameterSample[] = [];
    
    for (let i = 0; i < config.maxIterations; i++) {
      // Sample new parameters
      const params = this.sampleParameters(config.parameterBounds, config.explorationRate);
      
      // Evaluate on backtest
      const result = await this.backtestWithParams(params, config);
      const score = this.computeScore(result, config.objective);
      
      history.push({ params, score, result });
      
      // Update GP model with new sample
      this.updateGaussianProcess(history);
    }
    
    // Return best parameters found
    const best = history.reduce((a, b) => b.score > a.score ? b : a);
    return {
      params: best.params,
      score: best.score,
      metrics: best.result,
      iterationsTaken: history.length,
      confidence: this.computeConfidence(history),
    };
  }
  
  private sampleParameters(bounds: Record<string, [number, number]>, explorationRate: number): Record<string, number> {
    // Exploration: sample randomly (explorationRate%)
    // Exploitation: sample near best point so far (1 - explorationRate%)
    
    // Use Gaussian Process to guide sampling toward promising regions
    return {}; // TODO: implement
  }
}
```

**Deployment:**
1. Implement Gaussian Process (or use library like `gp-js`)
2. Replace grid search with Bayesian optimizer
3. Benchmark: 10x faster optimization expected

**Deliverables:**
- ✅ Bayesian optimizer implemented
- ✅ Integrated with backtest engine
- ✅ Benchmark showing 10x speedup
- ✅ Validation that results are similar or better than grid search

**Acceptance Criteria:**
- Optimization runs 10x faster
- Final parameters are as good or better than grid search
- Confidence intervals reasonable

---

### Task 4.2: Real-Time Feedback Loop & Auto-Reoptimization (2 days)
**Priority:** 🟠 High  
**Effort:** High (10 hours)

**File to Create:**
- `src/services/learning/realtimeFeedback.ts`

```typescript
interface FeedbackEvent {
  signal: SignalRecord;
  trade: TradeRecord;
  outcome: 'WIN' | 'LOSS';
  pnl: number;
  timestamp: Date;
}

export class RealTimeFeedback {
  private signalHistory: SignalRecord[] = [];
  private reoptimizationSchedule: Map<string, Date> = new Map(); // strategy → next reopt time
  
  async processTradeFeedback(event: FeedbackEvent): Promise<void> {
    // 1. Link signal to trade
    event.signal.linkedTrade = event.trade;
    
    // 2. Update signal-type win rate
    const signalType = event.signal.subType;
    const winRateData = await this.getSignalTypeWinRate(signalType, 'last_50');
    
    // 3. Detect degradation
    if (winRateData.winRate < 0.40) {
      await this.emitAlert(`Signal type ${signalType} win rate dropped to ${winRateData.winRate}`);
    }
    
    // 4. Check if reoptimization needed
    if (this.shouldReoptimize(event.signal.strategy)) {
      await this.triggerReoptimization(event.signal.strategy);
    }
  }
  
  private shouldReoptimize(strategy: string): boolean {
    // Trigger reopt if:
    // - Win rate drops > 10% in 1 week
    // - Sharpe ratio < 0.5
    // - Max drawdown > 15%
    
    const nextReoptTime = this.reoptimizationSchedule.get(strategy);
    if (nextReoptTime && nextReoptTime > new Date()) {
      return false; // Too soon
    }
    
    const metrics = this.getRecentMetrics(strategy, 'last_50_trades');
    return (
      metrics.winRate < 0.40 || 
      metrics.sharpe < 0.5 || 
      metrics.maxDrawdown > 0.15
    );
  }
  
  private async triggerReoptimization(strategy: string): Promise<void> {
    console.log(`[Feedback] Triggering reoptimization for ${strategy}`);
    
    // Run optimizer on recent data
    const optimizer = new BayesianOptimizer();
    const result = await optimizer.optimize({
      strategy,
      lookbackDays: 30,
      objective: 'maxSharpe',
    });
    
    // Validate new params on holdout set
    const validation = await this.validateNewParams(result.params, strategy);
    
    if (validation.improvement > 0.05) {
      // New params are better: deploy with gradual ramp-up
      await this.deployNewParams(strategy, result.params, 'gradual');
    } else {
      // New params not better: keep old ones
      console.log(`[Feedback] New params not better, keeping old ones`);
    }
    
    // Schedule next reopt for 2 weeks
    this.reoptimizationSchedule.set(strategy, new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  }
  
  private async deployNewParams(strategy: string, params: Record<string, number>, mode: 'gradual' | 'immediate'): Promise<void> {
    if (mode === 'gradual') {
      // Day 1-2: Use on 50% of new signals
      // Day 3-4: Use on 75%
      // Day 5+: Use on 100%
      // If performance degrades: roll back
      
      console.log(`[Feedback] Deploying new params for ${strategy} (gradual)`);
      await this.storeNewParams(strategy, params, { status: 'gradual_deploy', startDate: new Date() });
    } else {
      console.log(`[Feedback] Deploying new params for ${strategy} (immediate)`);
      await this.storeNewParams(strategy, params, { status: 'active' });
    }
  }
}
```

**Deployment:**
1. Implement feedback processor
2. Integrate with backtest engine (after each trade closes)
3. Automate reoptimization trigger
4. Test on 4 weeks of live data

**Deliverables:**
- ✅ Feedback loop processing signals and trades
- ✅ Degradation detection working
- ✅ Reoptimization triggered automatically
- ✅ New params validated and deployed safely

**Acceptance Criteria:**
- Win-rate degradation detected within 24 hours
- Reoptimization triggered when thresholds exceeded
- New params improve performance by >5% on holdout set
- No unexpected trading behavior

---

## Success Criteria & Completion Gates

### Gate 1: Week 1 Complete (Signal Tracking)
- [ ] Win-rate dashboard shows accurate metrics per signal type
- [ ] 90%+ of closed trades linked to generating signals
- [ ] Degradation alerts firing correctly
- [ ] Code reviewed and tested

### Gate 2: Week 2 Complete (Entry & Risk)
- [ ] ADX filter reduces signals by 20%, improves win rate by 5%
- [ ] ATR-based positioning reduces drawdown by 10-15%
- [ ] Smart stops reduce false stop-outs by 20%
- [ ] Backtest P&L improved by 2-5%

### Gate 3: Week 3 Complete (Signal Quality)
- [ ] S/R detection working on 5+ symbols
- [ ] Volatility regime classification accurate
- [ ] Signals filtered during crashes
- [ ] Overall win rate >58%

### Gate 4: Week 4 Complete (Learning & Optimization)
- [ ] Bayesian optimizer 10x faster than grid search
- [ ] Reoptimization triggers automatically on degradation
- [ ] New params improve win rate by >5%
- [ ] System running for 2+ weeks without manual intervention

---

## Risk Mitigation

### Risk: Optimization overfit (params work on backtest, fail on live)
**Mitigation:**
- Always validate on holdout set (last 10 days)
- Use walk-forward validation (multiple folds)
- Require >5% improvement before deploying

### Risk: Feedback loop creates feedback loops (cascading errors)
**Mitigation:**
- Gradual deployment (10% → 25% → 50% → 100%)
- Automatic rollback if performance degrades
- Manual approval gate for major changes

### Risk: Over-optimization on limited data
**Mitigation:**
- Use constraints (sensible parameter bounds)
- Penalize complexity (prefer simpler models)
- Monitor out-of-sample performance

---

## Post-Implementation (Weeks 5+)

Once 4-week roadmap complete:
1. Monitor live performance (2+ weeks)
2. Gather user feedback
3. Plan Phase 5 improvements (macro filters, portfolio risk, etc.)
4. Consider advanced features (multi-timeframe analysis, sentiment integration)

---

## Quick Reference: File Changes Summary

```
NEW FILES:
  src/services/analytics/winRateDashboard.ts
  src/services/analytics/signalTradeLinker.ts
  src/services/analytics/degradationMonitor.ts
  src/services/analysis/supportResistance.ts
  src/services/analysis/volatilityRegime.ts
  src/services/backtest/bayesianOptimizer.ts
  src/services/learning/realtimeFeedback.ts
  src/app/api/win-rate-dashboard/route.ts

MODIFIED FILES:
  src/models/Signal.ts (add subType, layersConfirmed, etc.)
  src/services/strategies/base.ts (add ADX calculator)
  src/services/backtest/positionSizing.ts (add ATR method)
  src/services/strategies/signalGenerator.ts (add filters)
  src/services/backtest/engine.ts (integrate feedback)

TESTING:
  Add 50+ unit tests for new modules
  Add 10 backtest scenarios for validation
  Add integration tests for feedback loop
```

---

*Roadmap Version 1.0 - Ready to implement*  
*Estimated total effort: 80-100 hours (2 developers, 4 weeks)*  
*Expected outcome: 15-20% false positive reduction, +5-8% win rate improvement*
