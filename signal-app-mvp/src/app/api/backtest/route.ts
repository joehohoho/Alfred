import { NextResponse } from 'next/server';
import { getDataManager } from '@/services/data/DataManager';
import { BacktestEngine } from '@/services/backtest/engine';
import type { Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import { RSIExtremeStrategy } from '@/services/strategies/rsiExtremeStrategy';
import { TrendFollowingStrategy } from '@/services/strategies/trendFollowingStrategy';
import { StrategyRegistry as EnsembleRegistry } from '@/services/strategies/registry';

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

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const body = await request.json();
    const { symbol, strategy: strategyName, days = 90, shortPeriod, longPeriod, ...extraParams } = body;

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Missing required field: symbol' }, { status: 400 });
    }

    // Build strategy params from body
    const params: Record<string, number> = { ...extraParams };
    if (shortPeriod != null) params.shortPeriod = Number(shortPeriod);
    if (longPeriod != null) params.longPeriod = Number(longPeriod);

    // Resolve strategy
    const stratKey = (strategyName || 'ENSEMBLE').toUpperCase().replace(/[\s-]/g, '_');
    const strategyFactory = STRATEGY_MAP[stratKey];
    if (!strategyFactory) {
      return NextResponse.json(
        { error: `Unknown strategy: ${strategyName}. Available: ${Object.keys(STRATEGY_MAP).join(', ')}` },
        { status: 400 }
      );
    }

    const strategyInstance = strategyFactory(Object.keys(params).length > 0 ? params : undefined);

    // Fetch real price data
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol.toUpperCase(), Number(days) || 90);

    // Run backtest
    const engine = new BacktestEngine();
    const result = engine.backtest(priceSeries, strategyInstance);

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
      sma9: isNaN(sma9Values[i]) ? null : Number(sma9Values[i].toFixed(2)),
      sma21: isNaN(sma21Values[i]) ? null : Number(sma21Values[i].toFixed(2)),
    }));

    // Generate signal markers for the chart
    const allSignals = strategyInstance.generateSignals(priceSeries);
    const signalMarkers = allSignals
      .filter((s) => s.type === 'BUY' || s.type === 'SELL')
      .map((s) => ({
        date: s.time instanceof Date
          ? s.time.toISOString().split('T')[0]
          : new Date(s.time as unknown as string).toISOString().split('T')[0],
        price: Number(s.price.toFixed(2)),
        type: s.type as 'BUY' | 'SELL',
        strength: Number(s.strength.toFixed(2)),
      }));

    return NextResponse.json({
      symbol: result.symbol,
      strategy: result.strategyName,
      days: Number(days) || 90,
      status: 'success',
      metrics: {
        winRate: `${result.winRate}%`,
        profitFactor: result.profitFactor,
        sharpeRatio: result.sharpeRatio,
        maxDrawdown: `${result.maxDrawdown}%`,
        totalPnL: result.totalPnL,
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
      })),
      priceData,
      signals: signalMarkers,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('aborted') || message.includes('abort')) {
      return NextResponse.json({ error: 'Backtest timed out after 30 seconds' }, { status: 504 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
