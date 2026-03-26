import type { PriceSeries } from '@/models/PriceData';
import { BacktestEngine, type BacktestResult, type Strategy } from './engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import { RSIExtremeStrategy } from '@/services/strategies/rsiExtremeStrategy';
import { TrendFollowingStrategy } from '@/services/strategies/trendFollowingStrategy';
import { getDataManager } from '@/services/data/DataManager';
import { trackPerformance } from './performanceTracker';

// --- Types ---

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
}

export interface OptimizedParams {
  params: Record<string, number>;
  metrics: {
    totalPnlPercent: number;
    winRate: number;
    sharpeRatio: number;
    totalTrades: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  compositeScore: number;
}

export interface OptimizationResult {
  symbol: string;
  strategy: string;
  days: number;
  topParams: OptimizedParams[];
  walkForwardValidated: boolean;
  optimizedAt: string;
  totalCombinationsTested: number;
}

// --- Parameter ranges per strategy (coarse grid) ---

const PARAM_RANGES: Record<string, Record<string, ParameterRange>> = {
  SMA_RSI_IMPROVED: {
    shortPeriod: { min: 5, max: 20, step: 3 },
    longPeriod: { min: 15, max: 50, step: 5 },
    rsiPeriod: { min: 10, max: 20, step: 3 },
  },
  MACD: {
    fastPeriod: { min: 8, max: 16, step: 3 },
    slowPeriod: { min: 20, max: 30, step: 3 },
    signalPeriod: { min: 7, max: 12, step: 3 },
  },
  BOLLINGER_BANDS: {
    period: { min: 15, max: 30, step: 3 },
    stdDevs: { min: 1.5, max: 3.0, step: 0.5 },
  },
  RSI_EXTREME: {
    rsiPeriod: { min: 10, max: 20, step: 3 },
    buyThreshold: { min: 20, max: 35, step: 5 },
    sellThreshold: { min: 65, max: 80, step: 5 },
  },
  TREND_FOLLOWING: {
    hmaPeriod: { min: 14, max: 30, step: 4 },
    adxPeriod: { min: 10, max: 20, step: 3 },
    adxThreshold: { min: 20, max: 35, step: 5 },
  },
};

// --- Strategy factory ---

function createStrategy(stratKey: string, params: Record<string, number>): Strategy {
  switch (stratKey) {
    case 'SMA_RSI_IMPROVED':
      return new SMARSIImprovedStrategy(params);
    case 'MACD':
      return new MACDStrategy(params);
    case 'BOLLINGER_BANDS':
      return new BollingerStrategy(params);
    case 'RSI_EXTREME':
      return new RSIExtremeStrategy(params);
    case 'TREND_FOLLOWING':
      return new TrendFollowingStrategy(params);
    default:
      throw new Error(`Unknown strategy for optimization: ${stratKey}`);
  }
}

// --- Grid generation ---

function generateRange(range: ParameterRange): number[] {
  const values: number[] = [];
  for (let v = range.min; v <= range.max + range.step * 0.01; v += range.step) {
    values.push(Math.round(v * 100) / 100); // avoid float drift
  }
  return values;
}

function generateCombinations(ranges: Record<string, ParameterRange>): Record<string, number>[] {
  const keys = Object.keys(ranges);
  const valueArrays = keys.map((k) => generateRange(ranges[k]));
  const combos: Record<string, number>[] = [];

  const recurse = (idx: number, current: Record<string, number>) => {
    if (idx === keys.length) {
      combos.push({ ...current });
      return;
    }
    for (const val of valueArrays[idx]) {
      current[keys[idx]] = val;
      recurse(idx + 1, current);
    }
  };

  recurse(0, {});
  return combos;
}

// --- Composite score ---

function compositeScore(result: BacktestResult): number {
  return (
    result.sharpeRatio * 0.4 +
    (result.winRate / 100) * 0.3 + // winRate is already 0-100 from engine
    (result.totalPnLPercent / 100) * 0.3
  );
}

// --- Slice a PriceSeries by percentage ---

function sliceSeries(series: PriceSeries, startPct: number, endPct: number): PriceSeries {
  const total = series.points.length;
  const startIdx = Math.floor(total * startPct);
  const endIdx = Math.floor(total * endPct);
  return {
    ...series,
    points: series.points.slice(startIdx, endIdx),
  };
}

// --- Core optimization logic ---

function runGridSearch(
  series: PriceSeries,
  stratKey: string,
  ranges: Record<string, ParameterRange>,
  investment: number = 10000
): { results: OptimizedParams[]; totalTested: number } {
  const combos = generateCombinations(ranges);
  const engine = new BacktestEngine(investment);
  const scored: OptimizedParams[] = [];

  for (const params of combos) {
    // Validate: for SMA_RSI, shortPeriod must be < longPeriod
    if (stratKey === 'SMA_RSI_IMPROVED' && params.shortPeriod >= params.longPeriod) continue;
    // For MACD, fastPeriod must be < slowPeriod
    if (stratKey === 'MACD' && params.fastPeriod >= params.slowPeriod) continue;
    // For RSI_EXTREME, buyThreshold must be < sellThreshold
    if (stratKey === 'RSI_EXTREME' && params.buyThreshold >= params.sellThreshold) continue;

    try {
      const strategy = createStrategy(stratKey, params);
      const result = engine.backtest(series, strategy);

      // Only consider combos with >= 3 trades
      if (result.totalTrades < 3) continue;

      const score = compositeScore(result);

      scored.push({
        params,
        metrics: {
          totalPnlPercent: result.totalPnLPercent,
          winRate: result.winRate,
          sharpeRatio: result.sharpeRatio,
          totalTrades: result.totalTrades,
          profitFactor: result.profitFactor,
          maxDrawdown: result.maxDrawdown,
        },
        compositeScore: Math.round(score * 1000) / 1000,
      });
    } catch {
      // Skip invalid param combos that throw
    }
  }

  // Rank by composite score descending
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  return { results: scored.slice(0, 20), totalTested: combos.length };
}

// --- Walk-forward validation ---

function walkForwardValidate(
  series: PriceSeries,
  stratKey: string,
  candidates: OptimizedParams[],
  investment: number = 10000
): OptimizedParams[] {
  // Training: first 70%, validation: last 30%
  const validationSeries = sliceSeries(series, 0.7, 1.0);
  const engine = new BacktestEngine(investment);
  const validated: OptimizedParams[] = [];

  for (const candidate of candidates) {
    try {
      const strategy = createStrategy(stratKey, candidate.params);
      const valResult = engine.backtest(validationSeries, strategy);

      // Must be profitable in validation period too
      if (valResult.totalPnLPercent > 0 && valResult.totalTrades >= 1) {
        validated.push(candidate);
      }
    } catch {
      // skip
    }

    if (validated.length >= 5) break;
  }

  return validated;
}

// --- Main exported function ---

export async function optimizeStrategy(
  symbol: string,
  strategy: string,
  days: number,
  investment: number = 10000
): Promise<OptimizationResult> {
  const stratKey = strategy.toUpperCase().replace(/[\s-]/g, '_');

  const ranges = PARAM_RANGES[stratKey];
  if (!ranges) {
    throw new Error(
      `No parameter ranges defined for strategy: ${stratKey}. Available: ${Object.keys(PARAM_RANGES).join(', ')}`
    );
  }

  // Fetch price data
  const dataManager = getDataManager();
  const series = await dataManager.fetch(symbol.toUpperCase(), days);

  // Phase 1: Grid search on training set (first 70%)
  const trainingSeries = sliceSeries(series, 0, 0.7);
  const { results: trainResults, totalTested } = runGridSearch(trainingSeries, stratKey, ranges, investment);

  if (trainResults.length === 0) {
    return {
      symbol,
      strategy: stratKey,
      days,
      topParams: [],
      walkForwardValidated: false,
      optimizedAt: new Date().toISOString(),
      totalCombinationsTested: totalTested,
    };
  }

  // Phase 2: Walk-forward validation
  const validated = walkForwardValidate(series, stratKey, trainResults, investment);

  // If walk-forward found validated params, use those. Otherwise fall back to training-only top 5.
  const topParams = validated.length > 0 ? validated.slice(0, 5) : trainResults.slice(0, 5);

  // Track the best result for performance history
  if (topParams.length > 0) {
    const best = topParams[0];
    trackPerformance({
      symbol,
      strategy: stratKey,
      params: best.params,
      days,
      pnlPercent: best.metrics.totalPnlPercent,
      winRate: best.metrics.winRate,
      sharpe: best.metrics.sharpeRatio,
      trades: best.metrics.totalTrades,
    });
  }

  return {
    symbol,
    strategy: stratKey,
    days,
    topParams,
    walkForwardValidated: validated.length > 0,
    optimizedAt: new Date().toISOString(),
    totalCombinationsTested: totalTested,
  };
}
