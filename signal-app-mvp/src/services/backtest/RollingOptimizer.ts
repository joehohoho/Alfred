import type { PriceSeries } from '@/models/PriceData';
import { BacktestEngine, type BacktestResult } from './engine';
import { getDataManager } from '@/services/data/DataManager';
import {
  type OptimizedParams,
  STRATEGY_RANGES,
  RISK_PROFILES,
  createStrategy,
  generateCombinations,
  isValidCombo,
  compositeScore,
} from './ParameterOptimizer';

// --- Types ---

export type MarketRegime = 'BULL' | 'BEAR' | 'RANGE';

export interface WindowResult {
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  regime: MarketRegime;
  bestParams: OptimizedParams;
  outOfSamplePnl: number;
  outOfSampleWinRate: number;
}

export interface RollingOptResult {
  symbol: string;
  strategy: string;
  days: number;
  windows: WindowResult[];
  bestByRegime: Record<MarketRegime, OptimizedParams | null>;
  overallBest: OptimizedParams;
  avgOutOfSamplePnl: number;
  consistencyScore: number;
  totalWindowsTested: number;
}

// --- Constants ---

const TRAIN_DAYS = 90;
const TEST_DAYS = 30;
const SLIDE_DAYS = 30;
const BULL_THRESHOLD = 0.10;  // +10%
const BEAR_THRESHOLD = -0.10; // -10%

// --- Helpers ---

/** Detect market regime based on price change over the window */
function detectRegime(series: PriceSeries): MarketRegime {
  if (series.points.length < 2) return 'RANGE';
  const startPrice = series.points[0].close;
  const endPrice = series.points[series.points.length - 1].close;
  const change = (endPrice - startPrice) / startPrice;

  if (change > BULL_THRESHOLD) return 'BULL';
  if (change < BEAR_THRESHOLD) return 'BEAR';
  return 'RANGE';
}

/** Slice a PriceSeries by absolute point indices */
function sliceByIndex(series: PriceSeries, start: number, end: number): PriceSeries {
  return {
    ...series,
    points: series.points.slice(start, end),
  };
}

/** Run coarse grid search on a training window and return the best OptimizedParams */
function findBestInWindow(
  trainSeries: PriceSeries,
  stratKey: string,
  stratRanges: Record<string, import('./ParameterOptimizer').ParameterRange>,
  investment: number,
): OptimizedParams | null {
  const stratCombos = generateCombinations(stratRanges);
  let best: OptimizedParams | null = null;

  for (const stratParams of stratCombos) {
    if (!isValidCombo(stratKey, stratParams)) continue;

    for (const risk of RISK_PROFILES) {
      try {
        const strategy = createStrategy(stratKey, stratParams);
        const engine = new BacktestEngine(investment, risk);
        const result = engine.backtest(trainSeries, strategy);

        if (result.totalTrades < 2) continue;
        const score = compositeScore(result);

        if (!best || score > best.compositeScore) {
          best = {
            params: stratParams,
            risk,
            metrics: {
              totalPnlPercent: result.totalPnLPercent,
              winRate: result.winRate,
              sharpeRatio: result.sharpeRatio,
              totalTrades: result.totalTrades,
              profitFactor: result.profitFactor,
              maxDrawdown: result.maxDrawdown,
            },
            compositeScore: Math.round(score * 1000) / 1000,
          };
        }
      } catch {
        /* skip invalid combos */
      }
    }
  }

  return best;
}

/** Evaluate a set of params on the out-of-sample test window */
function evaluateOutOfSample(
  testSeries: PriceSeries,
  stratKey: string,
  params: OptimizedParams,
  investment: number,
): BacktestResult | null {
  try {
    const strategy = createStrategy(stratKey, params.params);
    const engine = new BacktestEngine(investment, params.risk);
    return engine.backtest(testSeries, strategy);
  } catch {
    return null;
  }
}

/** Format a Date as ISO date string (YYYY-MM-DD) */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// --- Main exported function ---

export async function rollingOptimize(
  symbol: string,
  strategy: string,
  days: number,
  investment: number = 10000,
): Promise<RollingOptResult> {
  const stratKey = strategy.toUpperCase().replace(/[\s-]/g, '_');
  const ranges = STRATEGY_RANGES[stratKey];
  if (!ranges) {
    throw new Error(
      `No parameter ranges for: ${stratKey}. Available: ${Object.keys(STRATEGY_RANGES).join(', ')}`,
    );
  }

  const dataManager = getDataManager();
  const series = await dataManager.fetch(symbol.toUpperCase(), days);
  const totalPoints = series.points.length;

  // Each "day" in the series corresponds to one data point (daily data).
  // Build rolling windows: train TRAIN_DAYS, test TEST_DAYS, slide by SLIDE_DAYS.
  const windows: WindowResult[] = [];
  const regimeResults: Record<MarketRegime, { params: OptimizedParams; score: number }[]> = {
    BULL: [],
    BEAR: [],
    RANGE: [],
  };

  let windowStart = 0;

  while (windowStart + TRAIN_DAYS + TEST_DAYS <= totalPoints) {
    const trainStart = windowStart;
    const trainEnd = windowStart + TRAIN_DAYS;
    const testStart = trainEnd;
    const testEnd = Math.min(testStart + TEST_DAYS, totalPoints);

    const trainSeries = sliceByIndex(series, trainStart, trainEnd);
    const testSeries = sliceByIndex(series, testStart, testEnd);

    if (testSeries.points.length < 5) {
      // Not enough test data for meaningful evaluation
      windowStart += SLIDE_DAYS;
      continue;
    }

    // Detect regime on the training window
    const regime = detectRegime(trainSeries);

    // Run coarse grid search on training window
    const bestParams = findBestInWindow(trainSeries, stratKey, ranges, investment);

    if (bestParams) {
      // Evaluate purely on out-of-sample test window
      const oosResult = evaluateOutOfSample(testSeries, stratKey, bestParams, investment);

      if (oosResult) {
        const windowResult: WindowResult = {
          trainStart: toDateStr(trainSeries.points[0].timestamp),
          trainEnd: toDateStr(trainSeries.points[trainSeries.points.length - 1].timestamp),
          testStart: toDateStr(testSeries.points[0].timestamp),
          testEnd: toDateStr(testSeries.points[testSeries.points.length - 1].timestamp),
          regime,
          bestParams,
          outOfSamplePnl: Math.round(oosResult.totalPnLPercent * 100) / 100,
          outOfSampleWinRate: Math.round(oosResult.winRate * 100) / 100,
        };

        windows.push(windowResult);

        // Track per-regime results using out-of-sample composite score
        const oosScore = compositeScore(oosResult);
        regimeResults[regime].push({ params: bestParams, score: oosScore });
      }
    }

    windowStart += SLIDE_DAYS;
  }

  // Determine best params per regime
  const bestByRegime: Record<MarketRegime, OptimizedParams | null> = {
    BULL: null,
    BEAR: null,
    RANGE: null,
  };

  for (const regime of ['BULL', 'BEAR', 'RANGE'] as MarketRegime[]) {
    const entries = regimeResults[regime];
    if (entries.length === 0) continue;
    entries.sort((a, b) => b.score - a.score);
    bestByRegime[regime] = entries[0].params;
  }

  // Determine overall best: highest average out-of-sample score across all windows
  // Group windows by param signature, pick the signature with best average OOS PnL
  const paramGroups = new Map<string, { totalOosPnl: number; count: number; params: OptimizedParams }>();
  for (const w of windows) {
    const key = JSON.stringify(w.bestParams.params) + JSON.stringify(w.bestParams.risk);
    const existing = paramGroups.get(key);
    if (existing) {
      existing.totalOosPnl += w.outOfSamplePnl;
      existing.count++;
    } else {
      paramGroups.set(key, { totalOosPnl: w.outOfSamplePnl, count: 1, params: w.bestParams });
    }
  }

  let overallBest: OptimizedParams;
  if (paramGroups.size > 0) {
    // Pick the params with the best average OOS PnL, weighted slightly toward frequency
    let bestKey = '';
    let bestAvg = -Infinity;
    paramGroups.forEach((group, key) => {
      const avg = group.totalOosPnl / group.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestKey = key;
      }
    });
    overallBest = paramGroups.get(bestKey)!.params;
  } else if (windows.length > 0) {
    // Fallback: best single window
    overallBest = windows.reduce((best, w) =>
      w.outOfSamplePnl > best.outOfSamplePnl ? w : best
    ).bestParams;
  } else {
    // No valid windows at all — return empty placeholder
    overallBest = {
      params: {},
      risk: RISK_PROFILES[1], // moderate default
      metrics: {
        totalPnlPercent: 0,
        winRate: 0,
        sharpeRatio: 0,
        totalTrades: 0,
        profitFactor: 0,
        maxDrawdown: 0,
      },
      compositeScore: 0,
    };
  }

  // Compute aggregate stats
  const avgOutOfSamplePnl =
    windows.length > 0
      ? Math.round((windows.reduce((s, w) => s + w.outOfSamplePnl, 0) / windows.length) * 100) / 100
      : 0;

  const profitableWindows = windows.filter((w) => w.outOfSamplePnl > 0).length;
  const consistencyScore =
    windows.length > 0 ? Math.round((profitableWindows / windows.length) * 10000) / 100 : 0;

  return {
    symbol,
    strategy: stratKey,
    days,
    windows,
    bestByRegime,
    overallBest,
    avgOutOfSamplePnl,
    consistencyScore,
    totalWindowsTested: windows.length,
  };
}
