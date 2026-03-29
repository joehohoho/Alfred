import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getDataManager } from '@/services/data/DataManager';
import { BacktestEngine, type RiskManagement } from '@/services/backtest/engine';
import type { Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import { RSIExtremeStrategy } from '@/services/strategies/rsiExtremeStrategy';
import { TrendFollowingStrategy } from '@/services/strategies/trendFollowingStrategy';
import { StrategyRegistry as EnsembleRegistry } from '@/services/strategies/registry';
import { optimizeStrategy } from '@/services/backtest/ParameterOptimizer';
import { trackPerformance } from '@/services/backtest/performanceTracker';
import {
  analyzeTrades as analyzeTradePatterns,
  getLearnedPatterns,
  mergePatterns,
  savePatterns,
} from '@/services/learning/tradeAnalyzer';

/** Simple SMA calculator for chart overlay */
function calculateSMAArray(values: number[], period: number): number[] {
  const smas: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      smas.push(NaN);
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smas.push(sum / period);
    }
  }
  return smas;
}

const STRATEGY_MAP: Record<string, (params?: Record<string, number>) => Strategy> = {
  SMA_RSI_IMPROVED: (params) => new SMARSIImprovedStrategy(
    params ?? { shortPeriod: 9, longPeriod: 21 }
  ),
  MACD: (params) => new MACDStrategy(
    params ?? { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
  ),
  BOLLINGER_BANDS: (params) => new BollingerStrategy(
    params ?? { period: 20, stdDevs: 2 }
  ),
  RSI_EXTREME: (params) => new RSIExtremeStrategy(
    params ?? { rsiPeriod: 14, buyThreshold: 30, sellThreshold: 70 }
  ),
  TREND_FOLLOWING: (params) => new TrendFollowingStrategy(
    params ?? { hmaPeriod: 20, adxPeriod: 14, adxThreshold: 25 }
  ),
  ENSEMBLE: () => new EnsembleRegistry(),
};

// --- Optimal params cache ---

const DATA_DIR = path.join(process.cwd(), 'data');
const OPTIMAL_PARAMS_FILE = path.join(DATA_DIR, 'optimal-params.json');
const CACHE_TTL_DAYS = 7;

interface CachedOptimalParams {
  params: Record<string, number>;
  risk?: Record<string, number>;
  compositeScore: number;
  optimizedAt: string;
  metrics: {
    totalPnlPercent: number;
    winRate: number;
    sharpeRatio: number;
    totalTrades: number;
  };
}

function readOptimalParamsCache(): Record<string, CachedOptimalParams> {
  try {
    if (fs.existsSync(OPTIMAL_PARAMS_FILE)) {
      return JSON.parse(fs.readFileSync(OPTIMAL_PARAMS_FILE, 'utf-8'));
    }
  } catch {
    // corrupted
  }
  return {};
}

function writeOptimalParamsCache(cache: Record<string, CachedOptimalParams>) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(OPTIMAL_PARAMS_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function getCachedParams(symbol: string, stratKey: string): CachedOptimalParams | null {
  const cache = readOptimalParamsCache();
  const key = `${symbol}:${stratKey}`;
  const entry = cache[key];
  if (!entry) return null;

  // Check TTL
  const age = Date.now() - new Date(entry.optimizedAt).getTime();
  const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (age > ttlMs) return null;

  return entry;
}

function setCachedParams(symbol: string, stratKey: string, entry: CachedOptimalParams) {
  const cache = readOptimalParamsCache();
  cache[`${symbol}:${stratKey}`] = entry;
  writeOptimalParamsCache(cache);
}

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s for optimization

  try {
    const body = await request.json();
    const {
      symbol,
      strategy: strategyName,
      days = 90,
      investment = 10000,
      stopLoss = 8,
      trailingStop = 5,
      takeProfit = 15,
      maxHoldDays = 30,
      optimize = false,
      skipLearnedFilter = false,
      shortPeriod,
      longPeriod,
      ...extraParams
    } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Missing required field: symbol' }, { status: 400 });
    }

    const stratKey = (strategyName || 'ENSEMBLE').toUpperCase().replace(/[\s-]/g, '_');
    const strategyFactory = STRATEGY_MAP[stratKey];
    if (!strategyFactory) {
      return NextResponse.json(
        { error: `Unknown strategy: ${strategyName}. Available: ${Object.keys(STRATEGY_MAP).join(', ')}` },
        { status: 400 }
      );
    }

    // --- Optimization path ---
    if (optimize && stratKey !== 'ENSEMBLE') {
      try {
        const optResult = await optimizeStrategy(symbol.toUpperCase(), stratKey, Number(days) || 90, Number(investment) || 10000);

        if (optResult.topParams.length === 0) {
          return NextResponse.json({
            symbol: symbol.toUpperCase(),
            strategy: stratKey,
            days: Number(days) || 90,
            status: 'success',
            optimized: true,
            message: 'No profitable parameter combinations found',
            totalCombinationsTested: optResult.totalCombinationsTested,
          });
        }

        const best = optResult.topParams[0];

        // Run full backtest with BOTH optimized and default params on the FULL dataset
        const dataManager = getDataManager();
        const priceSeries = await dataManager.fetch(symbol.toUpperCase(), Number(days) || 90);
        const riskSettings = best.risk || { stopLossPercent: Number(stopLoss) || 8, trailingStopPercent: Number(trailingStop) || 5, takeProfitPercent: Number(takeProfit) || 15, maxHoldDays: Number(maxHoldDays) || 30 };

        const optimizedStrategy = strategyFactory(best.params);
        const engine = new BacktestEngine(Number(investment) || 10000, riskSettings);
        const optimizedResult = engine.backtest(priceSeries, optimizedStrategy);

        const defaultStrategy = strategyFactory(undefined);
        const defaultRisk = { stopLossPercent: Number(stopLoss) || 8, trailingStopPercent: Number(trailingStop) || 5, takeProfitPercent: Number(takeProfit) || 15, maxHoldDays: Number(maxHoldDays) || 30 };
        const defaultEngine = new BacktestEngine(Number(investment) || 10000, defaultRisk);
        const defaultResult = defaultEngine.backtest(priceSeries, defaultStrategy);

        // CRITICAL: Only use optimized params if they ACTUALLY beat defaults on the full dataset
        // If defaults are better, return defaults as the "winner" and don't cache bad params
        const useOptimized = optimizedResult.totalPnL > defaultResult.totalPnL;
        const winnerResult = useOptimized ? optimizedResult : defaultResult;
        const winnerStrategy = useOptimized ? optimizedStrategy : defaultStrategy;
        const winnerParams = useOptimized ? best.params : undefined;

        // Only cache if optimized actually wins
        if (useOptimized) {
          setCachedParams(symbol.toUpperCase(), stratKey, {
            params: best.params,
            risk: best.risk as any,
            compositeScore: best.compositeScore,
            optimizedAt: optResult.optimizedAt,
            metrics: {
              totalPnlPercent: optimizedResult.totalPnLPercent,
              winRate: optimizedResult.winRate,
              sharpeRatio: optimizedResult.sharpeRatio,
              totalTrades: optimizedResult.totalTrades,
            },
          });
        }

        // Track the WINNER's performance
        trackPerformance({
          symbol: symbol.toUpperCase(),
          strategy: stratKey,
          params: useOptimized ? best.params : {},
          days: Number(days) || 90,
          pnlPercent: winnerResult.totalPnLPercent,
          winRate: winnerResult.winRate,
          sharpe: winnerResult.sharpeRatio,
          trades: winnerResult.totalTrades,
        });

        // Learn from this backtest's trades
        try {
          const newPatterns = analyzeTradePatterns(symbol.toUpperCase(), winnerResult.trades, priceSeries);
          const existingPatterns = getLearnedPatterns(symbol.toUpperCase());
          const merged = existingPatterns ? mergePatterns(existingPatterns, newPatterns) : newPatterns;
          savePatterns(symbol.toUpperCase(), merged);
        } catch (learnErr) {
          console.error('[Backtest] Trade pattern learning failed (non-fatal):', learnErr);
        }

        clearTimeout(timeout);

        // Build chart data using the winner
        const closes = priceSeries.points.map((p) => p.close);
        const sma9Values = calculateSMAArray(closes, 9);
        const sma21Values = calculateSMAArray(closes, 21);
        const priceData = priceSeries.points.map((p, i) => ({
          date: p.timestamp instanceof Date
            ? p.timestamp.toISOString().split('T')[0]
            : new Date(p.timestamp as unknown as string).toISOString().split('T')[0],
          price: Number(p.close.toFixed(2)),
          sma9: isNaN(sma9Values[i]) ? undefined : Number(sma9Values[i].toFixed(2)),
          sma21: isNaN(sma21Values[i]) ? undefined : Number(sma21Values[i].toFixed(2)),
        }));

        let allSignals: any[] = [];
        try {
          allSignals = winnerStrategy.generateSignals(priceSeries);
        } catch { /* non-fatal */ }
        const signalMarkers = buildSignalMarkers(allSignals);

        return NextResponse.json({
          symbol: winnerResult.symbol,
          strategy: winnerResult.strategyName,
          days: Number(days) || 90,
          status: 'success',
          optimized: true,
          usedOptimizedParams: useOptimized,
          winner: useOptimized ? 'optimized' : 'defaults',
          walkForwardValidated: optResult.walkForwardValidated,
          optimalParams: useOptimized ? best.params : undefined,
          optimization: {
            totalCombinationsTested: optResult.totalCombinationsTested,
            topParams: optResult.topParams,
            optimizedAt: optResult.optimizedAt,
          },
          comparison: {
            defaultPnL: `$${defaultResult.totalPnL.toFixed(2)}`,
            defaultPnLPercent: defaultResult.totalPnLPercent,
            optimizedPnL: `$${optimizedResult.totalPnL.toFixed(2)}`,
            optimizedPnLPercent: optimizedResult.totalPnLPercent,
            improvement: `$${(optimizedResult.totalPnL - defaultResult.totalPnL).toFixed(2)}`,
            winnerNote: useOptimized
              ? 'Optimized params beat defaults — using optimized'
              : 'Default params performed better — using defaults (not caching worse params)',
          },
          metrics: {
            winRate: `${winnerResult.winRate}%`,
            profitFactor: winnerResult.profitFactor,
            sharpeRatio: winnerResult.sharpeRatio,
            maxDrawdown: `${winnerResult.maxDrawdown}%`,
            totalPnL: `$${winnerResult.totalPnL.toFixed(2)}`,
            totalPnLPercent: winnerResult.totalPnLPercent,
            totalTrades: winnerResult.totalTrades,
            winningTrades: winnerResult.winningTrades,
            losingTrades: winnerResult.losingTrades,
            avgWin: winnerResult.avgWin,
            avgLoss: winnerResult.avgLoss,
          },
          trades: winnerResult.trades.map((t, i) => ({
            id: i + 1,
            entry: t.entryPrice,
            entryTime: t.entryTime,
            exit: t.exitPrice,
            exitTime: t.exitTime,
            pnl: t.pnl,
            pnlPct: t.pnlPercent,
            daysHeld: t.daysHeld,
            fee: t.fee,
            exitReason: (t as any).exitReason,
          })),
          priceData,
          signals: signalMarkers,
        });
      } catch (optError) {
        clearTimeout(timeout);
        const msg = optError instanceof Error ? optError.message : String(optError);
        return NextResponse.json({ error: `Optimization failed: ${msg}` }, { status: 500 });
      }
    }

    // --- Normal backtest path ---

    // Build strategy params from body
    const params: Record<string, number> = { ...extraParams };
    if (shortPeriod != null) params.shortPeriod = Number(shortPeriod);
    if (longPeriod != null) params.longPeriod = Number(longPeriod);

    // Check for cached optimal params if no custom params provided and strategy is not ENSEMBLE
    let usedCachedParams = false;
    let cachedParamData: CachedOptimalParams | null = null;
    if (Object.keys(params).length === 0 && stratKey !== 'ENSEMBLE') {
      cachedParamData = getCachedParams(symbol.toUpperCase(), stratKey);
      if (cachedParamData) {
        Object.assign(params, cachedParamData.params);
        usedCachedParams = true;
      }
      // Apply cached risk params too
      if (cachedParamData?.risk) {
        Object.assign(extraParams, cachedParamData.risk);
      }
    }

    const strategyInstance = strategyFactory(Object.keys(params).length > 0 ? params : undefined);

    // Fetch real price data
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol.toUpperCase(), Number(days) || 90);

    // Run backtest with investment amount
    const engine = new BacktestEngine(Number(investment) || 10000, { stopLossPercent: Number(stopLoss) || 8, trailingStopPercent: Number(trailingStop) || 5, takeProfitPercent: Number(takeProfit) || 15, maxHoldDays: Number(maxHoldDays) || 30 });
    const result = engine.backtest(priceSeries, strategyInstance);

    // Track performance
    trackPerformance({
      symbol: symbol.toUpperCase(),
      strategy: stratKey,
      params: Object.keys(params).length > 0 ? params : {},
      days: Number(days) || 90,
      pnlPercent: result.totalPnLPercent,
      winRate: result.winRate,
      sharpe: result.sharpeRatio,
      trades: result.totalTrades,
    });

    // Learn from this backtest's trades
    try {
      const newPatterns = analyzeTradePatterns(symbol.toUpperCase(), result.trades, priceSeries);
      const existingPatterns = getLearnedPatterns(symbol.toUpperCase());
      const merged = existingPatterns ? mergePatterns(existingPatterns, newPatterns) : newPatterns;
      savePatterns(symbol.toUpperCase(), merged);
    } catch (learnErr) {
      console.error('[Backtest] Trade pattern learning failed (non-fatal):', learnErr);
    }

    clearTimeout(timeout);

    // Build price chart data from the raw series
    const closes = priceSeries.points.map((p) => p.close);
    const sma9Values = calculateSMAArray(closes, 9);
    const sma21Values = calculateSMAArray(closes, 21);

    const priceData = priceSeries.points.map((p, i) => ({
      date: p.timestamp instanceof Date
        ? p.timestamp.toISOString().split('T')[0]
        : new Date(p.timestamp as unknown as string).toISOString().split('T')[0],
      price: Number(p.close.toFixed(2)),
      sma9: isNaN(sma9Values[i]) ? undefined : Number(sma9Values[i].toFixed(2)),
      sma21: isNaN(sma21Values[i]) ? undefined : Number(sma21Values[i].toFixed(2)),
    }));

    // Generate signal markers for the chart (non-fatal)
    let allSignals: any[] = [];
    try {
      allSignals = strategyInstance.generateSignals(priceSeries);
    } catch (sigErr) {
      console.error('Signal generation for chart markers failed:', sigErr);
    }
    const signalMarkers = buildSignalMarkers(allSignals);

    return NextResponse.json({
      symbol: result.symbol,
      strategy: result.strategyName,
      days: Number(days) || 90,
      status: 'success',
      optimized: false,
      usedCachedParams,
      ...(usedCachedParams && cachedParamData ? {
        optimalParams: cachedParamData.params,
        cachedParamsAge: `${Math.round((Date.now() - new Date(cachedParamData.optimizedAt).getTime()) / (1000 * 60 * 60 * 24))}d`,
      } : {}),
      metrics: {
        winRate: `${result.winRate}%`,
        profitFactor: result.profitFactor,
        sharpeRatio: result.sharpeRatio,
        maxDrawdown: `${result.maxDrawdown}%`,
        totalPnL: `$${result.totalPnL.toFixed(2)}`,
        totalPnLPercent: result.totalPnLPercent,
        totalTrades: result.totalTrades,
        winningTrades: result.winningTrades,
        losingTrades: result.losingTrades,
        avgWin: result.avgWin,
        avgLoss: result.avgLoss,
      },
      trades: result.trades.map((t, i) => ({
        id: i + 1,
        entry: t.entryPrice,
        entryTime: t.entryTime,
        exit: t.exitPrice,
        exitTime: t.exitTime,
        pnl: t.pnl,
        pnlPct: t.pnlPercent,
        daysHeld: t.daysHeld,
        fee: t.fee,
            exitReason: (t as any).exitReason,
      })),
      priceData,
      signals: signalMarkers,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('aborted') || message.includes('abort')) {
      return NextResponse.json({ error: 'Backtest timed out after 60 seconds' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- Helper: Build signal markers for chart ---

function buildSignalMarkers(allSignals: any[]) {
  return allSignals
    .filter((s) => s.type === 'BUY' || s.type === 'SELL')
    .map((s) => {
      let dateStr: string;
      try {
        const t = s.time as any;
        if (t && typeof t.toISOString === 'function') {
          dateStr = t.toISOString().split('T')[0];
        } else if (t && typeof t.getTime === 'function') {
          dateStr = t.toISOString().split('T')[0];
        } else if (typeof t === 'number') {
          dateStr = new Date(t).toISOString().split('T')[0];
        } else if (typeof t === 'string') {
          dateStr = new Date(t).toISOString().split('T')[0];
        } else {
          dateStr = 'unknown';
        }
      } catch {
        dateStr = 'unknown';
      }
      return {
        date: dateStr,
        price: Number((s.price || 0).toFixed(2)),
        type: s.type as 'BUY' | 'SELL',
        strength: Number((s.strength || 0).toFixed(2)),
      };
    })
    .filter((s) => s.date !== 'unknown');
}
