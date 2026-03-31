import type { PriceSeries } from '@/models/PriceData';
import { BacktestEngine, type BacktestResult, type Strategy, type RiskManagement } from './engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import { RSIExtremeStrategy } from '@/services/strategies/rsiExtremeStrategy';
import { TrendFollowingStrategy } from '@/services/strategies/trendFollowingStrategy';
import { SmartStrategy } from '@/services/strategies/smartStrategy';
import { getDataManager } from '@/services/data/DataManager';

// --- Types ---

export interface ParameterRange {
  min: number;
  max: number;
  step: number;
}

export interface OptimizedParams {
  params: Record<string, number>;
  risk: RiskManagement;
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
  refinementPasses: number;
}

// --- Strategy parameter ranges (coarse grid) ---

const STRATEGY_RANGES: Record<string, Record<string, ParameterRange>> = {
  SMA_RSI_IMPROVED: {
    shortPeriod: { min: 5, max: 20, step: 3 },
    longPeriod: { min: 15, max: 50, step: 5 },
    rsiPeriod: { min: 10, max: 20, step: 3 },
  },
  MACD: {
    fastPeriod: { min: 8, max: 16, step: 2 },
    slowPeriod: { min: 20, max: 30, step: 2 },
    signalPeriod: { min: 7, max: 12, step: 2 },
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
  SMART: {
    trendSma: { min: 30, max: 60, step: 10 },
    pullbackSma: { min: 10, max: 30, step: 5 },
    adxThreshold: { min: 15, max: 30, step: 5 },
  },
};

// --- Risk management parameter ranges ---

// Risk combos are pre-defined profiles instead of grid search (much faster)
const RISK_PROFILES: RiskManagement[] = [
  { stopLossPercent: 5, trailingStopPercent: 3, takeProfitPercent: 10, maxHoldDays: 14 },  // Tight
  { stopLossPercent: 8, trailingStopPercent: 5, takeProfitPercent: 15, maxHoldDays: 21 },  // Moderate
  { stopLossPercent: 12, trailingStopPercent: 7, takeProfitPercent: 20, maxHoldDays: 30 }, // Wide
  { stopLossPercent: 5, trailingStopPercent: 4, takeProfitPercent: 20, maxHoldDays: 30 },  // Tight stop, wide target
  { stopLossPercent: 10, trailingStopPercent: 3, takeProfitPercent: 8, maxHoldDays: 10 },  // Quick scalp
];

// --- Strategy factory ---

function createStrategy(stratKey: string, params: Record<string, number>): Strategy {
  switch (stratKey) {
    case 'SMA_RSI_IMPROVED': return new SMARSIImprovedStrategy(params);
    case 'MACD': return new MACDStrategy(params);
    case 'BOLLINGER_BANDS': return new BollingerStrategy(params);
    case 'RSI_EXTREME': return new RSIExtremeStrategy(params);
    case 'TREND_FOLLOWING': return new TrendFollowingStrategy(params);
    case 'SMART': return new SmartStrategy(params);
    default: throw new Error(`Unknown strategy: ${stratKey}`);
  }
}

// --- Grid generation ---

function generateRange(range: ParameterRange): number[] {
  const values: number[] = [];
  for (let v = range.min; v <= range.max + range.step * 0.01; v += range.step) {
    values.push(Math.round(v * 100) / 100);
  }
  return values;
}

function generateCombinations(ranges: Record<string, ParameterRange>): Record<string, number>[] {
  const keys = Object.keys(ranges);
  const valueArrays = keys.map((k) => generateRange(ranges[k]));
  const combos: Record<string, number>[] = [];
  const recurse = (idx: number, current: Record<string, number>) => {
    if (idx === keys.length) { combos.push({ ...current }); return; }
    for (const val of valueArrays[idx]) {
      current[keys[idx]] = val;
      recurse(idx + 1, current);
    }
  };
  recurse(0, {});
  return combos;
}

function isValidCombo(stratKey: string, params: Record<string, number>): boolean {
  if (stratKey === 'SMA_RSI_IMPROVED' && params.shortPeriod >= params.longPeriod) return false;
  if (stratKey === 'MACD' && params.fastPeriod >= params.slowPeriod) return false;
  if (stratKey === 'RSI_EXTREME' && params.buyThreshold >= params.sellThreshold) return false;
  return true;
}

// --- Composite score (heavily penalizes losses, rewards consistency) ---

function compositeScore(result: BacktestResult): number {
  if (result.totalTrades < 2) return -999;
  const pnlScore = result.totalPnLPercent / 100;
  const winScore = result.winRate / 100;
  const sharpeScore = Math.min(result.sharpeRatio, 3) / 3; // cap at 3
  const drawdownPenalty = Math.max(0, result.maxDrawdown - 10) / 100; // penalty for >10% drawdown
  const tradePenalty = result.totalTrades < 3 ? -0.5 : 0;

  return (
    pnlScore * 0.35 +
    winScore * 0.25 +
    sharpeScore * 0.25 +
    tradePenalty -
    drawdownPenalty * 0.15
  );
}

// --- Slice price series ---

function sliceSeries(series: PriceSeries, startPct: number, endPct: number): PriceSeries {
  const total = series.points.length;
  return { ...series, points: series.points.slice(Math.floor(total * startPct), Math.floor(total * endPct)) };
}

// --- Phase 1: Coarse grid search (strategy + risk params together) ---

function runCombinedSearch(
  series: PriceSeries,
  stratKey: string,
  stratRanges: Record<string, ParameterRange>,
  investment: number,
): { results: OptimizedParams[]; totalTested: number } {
  const stratCombos = generateCombinations(stratRanges);
  const scored: OptimizedParams[] = [];
  let totalTested = 0;

  for (const stratParams of stratCombos) {
    if (!isValidCombo(stratKey, stratParams)) continue;

    for (const risk of RISK_PROFILES) {
      totalTested++;
      try {
        const strategy = createStrategy(stratKey, stratParams);
        const engine = new BacktestEngine(investment, risk);
        const result = engine.backtest(series, strategy);

        if (result.totalTrades < 2) continue;
        const score = compositeScore(result);

        scored.push({
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
        });
      } catch { /* skip */ }
    }
  }

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  return { results: scored.slice(0, 30), totalTested };
}

// --- Phase 2: Fine-tuning around best params ---

function refineBest(
  series: PriceSeries,
  stratKey: string,
  best: OptimizedParams,
  investment: number,
): OptimizedParams[] {
  const fineRanges: Record<string, ParameterRange> = {};

  // Create fine grid around best strategy params
  for (const [key, val] of Object.entries(best.params)) {
    const origRange = STRATEGY_RANGES[stratKey]?.[key];
    if (!origRange) continue;
    const fineStep = Math.max(1, Math.floor(origRange.step / 2));
    fineRanges[key] = {
      min: Math.max(origRange.min, val - origRange.step),
      max: Math.min(origRange.max, val + origRange.step),
      step: origRange.step <= 1 ? 1 : fineStep,
    };
  }

  const stratCombos = generateCombinations(fineRanges);
  const scored: OptimizedParams[] = [];

  // Use all risk profiles for fine-tuning (only 5 profiles, manageable)
  for (const stratParams of stratCombos) {
    if (!isValidCombo(stratKey, stratParams)) continue;
    for (const risk of RISK_PROFILES) {
      try {
        const strategy = createStrategy(stratKey, stratParams);
        const engine = new BacktestEngine(investment, risk);
        const result = engine.backtest(series, strategy);

        if (result.totalTrades < 2) continue;
        const score = compositeScore(result);

        scored.push({
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
        });
      } catch { /* skip */ }
    }
  }

  scored.sort((a, b) => b.compositeScore - a.compositeScore);
  return scored.slice(0, 10);
}

// --- Walk-forward validation ---

function walkForwardValidate(
  series: PriceSeries,
  stratKey: string,
  candidates: OptimizedParams[],
  investment: number,
): OptimizedParams[] {
  const validationSeries = sliceSeries(series, 0.7, 1.0);
  const validated: OptimizedParams[] = [];

  for (const candidate of candidates) {
    try {
      const strategy = createStrategy(stratKey, candidate.params);
      const engine = new BacktestEngine(investment, candidate.risk);
      const valResult = engine.backtest(validationSeries, strategy);

      if (valResult.totalPnLPercent > -3 && valResult.totalTrades >= 1) {
        // Allow slightly negative (-3%) in validation since markets vary
        validated.push({
          ...candidate,
          // Update score with blend of training + validation
          compositeScore: Math.round((candidate.compositeScore * 0.6 + compositeScore(valResult) * 0.4) * 1000) / 1000,
        });
      }
    } catch { /* skip */ }
    if (validated.length >= 5) break;
  }

  validated.sort((a, b) => b.compositeScore - a.compositeScore);
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
  const ranges = STRATEGY_RANGES[stratKey];
  if (!ranges) {
    throw new Error(`No parameter ranges for: ${stratKey}. Available: ${Object.keys(STRATEGY_RANGES).join(', ')}`);
  }

  const dataManager = getDataManager();
  const series = await dataManager.fetch(symbol.toUpperCase(), days);

  // Phase 1: Coarse combined search on training set (first 70%)
  const trainingSeries = sliceSeries(series, 0, 0.7);
  const { results: coarseResults, totalTested: coarseTested } = runCombinedSearch(
    trainingSeries, stratKey, ranges, investment
  );

  if (coarseResults.length === 0) {
    return {
      symbol, strategy: stratKey, days,
      topParams: [],
      walkForwardValidated: false,
      optimizedAt: new Date().toISOString(),
      totalCombinationsTested: coarseTested,
      refinementPasses: 0,
    };
  }

  // Phase 2: Fine-tune top 3 candidates on full training set
  let refined: OptimizedParams[] = [];
  for (const candidate of coarseResults.slice(0, 3)) {
    const fineResults = refineBest(trainingSeries, stratKey, candidate, investment);
    refined.push(...fineResults);
  }
  refined.sort((a, b) => b.compositeScore - a.compositeScore);
  refined = refined.slice(0, 15);

  // Phase 3: Walk-forward validation on full series
  const allCandidates = [...refined, ...coarseResults.slice(0, 5)];
  // Deduplicate
  const seen = new Set<string>();
  const unique = allCandidates.filter(c => {
    const key = JSON.stringify(c.params) + JSON.stringify(c.risk);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const validated = walkForwardValidate(series, stratKey, unique, investment);
  const isValidated = validated.length > 0;
  const topParams = isValidated ? validated : refined.slice(0, 5);

  return {
    symbol,
    strategy: stratKey,
    days,
    topParams: topParams.slice(0, 5),
    walkForwardValidated: isValidated,
    optimizedAt: new Date().toISOString(),
    totalCombinationsTested: coarseTested + refined.length,
    refinementPasses: 2,
  };
}
