import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';

export interface FilterOptions {
  /** Enable trend filter (price vs 50-SMA). Default: true */
  trendFilter?: boolean;
  /** SMA period for trend filter. Default: 50 */
  trendSmaPeriod?: number;

  /** Enable volume confirmation. Default: true */
  volumeFilter?: boolean;
  /** Volume SMA period. Default: 20 */
  volumeSmaPeriod?: number;

  /** Enable momentum (RSI) confirmation. Default: true */
  momentumFilter?: boolean;
  /** RSI period. Default: 14 */
  rsiPeriod?: number;
  /** RSI overbought threshold (skip BUY above this). Default: 75 */
  rsiOverbought?: number;
  /** RSI oversold threshold (skip SELL below this). Default: 25 */
  rsiOversold?: number;

  /** Enable consecutive signal filter. Default: true */
  consecutiveFilter?: boolean;
  /** Minimum days between same-direction signals. Default: 3 */
  consecutiveDays?: number;

  /** Enable ATR-based dynamic stops. Default: true */
  atrStops?: boolean;
  /** ATR period. Default: 14 */
  atrPeriod?: number;
  /** ATR multiplier for stop-loss distance. Default: 2 */
  atrMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<FilterOptions> = {
  trendFilter: true,
  trendSmaPeriod: 50,
  volumeFilter: true,
  volumeSmaPeriod: 20,
  momentumFilter: true,
  rsiPeriod: 14,
  rsiOverbought: 75,
  rsiOversold: 25,
  consecutiveFilter: true,
  consecutiveDays: 3,
  atrStops: true,
  atrPeriod: 14,
  atrMultiplier: 2,
};

// ---- Indicator helpers (self-contained, no external deps) ----

function computeSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      result.push(sum / period);
    }
  }
  return result;
}

function computeRSI(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return result;

  // Seed with simple average
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  // Smoothed (Wilder's) for subsequent values
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rsI);
  }
  return result;
}

function computeATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number[] {
  const length = closes.length;
  const tr: number[] = new Array(length).fill(NaN);

  for (let i = 0; i < length; i++) {
    if (i === 0) {
      tr[i] = highs[i] - lows[i];
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr[i] = Math.max(hl, hc, lc);
    }
  }

  const atr: number[] = new Array(length).fill(NaN);
  if (length < period) return atr;

  // First ATR is simple average of first `period` TRs
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;

  // Smoothed (Wilder's) for subsequent
  for (let i = period; i < length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// ---- Build date-indexed lookup from PriceSeries ----

interface IndexedDay {
  index: number;
  close: number;
  volume: number | undefined;
  high: number;
  low: number;
}

function buildDateIndex(series: PriceSeries): Map<string, IndexedDay> {
  const map = new Map<string, IndexedDay>();
  for (let i = 0; i < series.points.length; i++) {
    const p = series.points[i];
    const ts = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp as unknown as string);
    const key = ts.toISOString().split('T')[0];
    map.set(key, {
      index: i,
      close: p.close,
      volume: p.volume,
      high: p.high ?? p.close,
      low: p.low ?? p.close,
    });
  }
  return map;
}

// ---- Main filter function ----

/**
 * Post-processing filter that removes low-quality signals based on market context.
 *
 * Sits between raw strategy signal generation and the backtest trade loop.
 * Applies trend, volume, momentum, consecutive-signal, and ATR-based filters.
 *
 * Signals that pass through may have an enriched `atrStop` attached (accessible
 * via a type assertion or the `filteredMeta` property on the returned objects).
 */
export function filterSignals(
  series: PriceSeries,
  signals: SignalWithStrength[],
  options?: FilterOptions,
): SignalWithStrength[] {
  const opts: Required<FilterOptions> = { ...DEFAULT_OPTIONS, ...options };

  if (signals.length === 0 || series.points.length === 0) return signals;

  // Pre-compute indicators across the full price series
  const closes = series.points.map((p) => p.close);
  const highs = series.points.map((p) => p.high ?? p.close);
  const lows = series.points.map((p) => p.low ?? p.close);
  const volumes = series.points.map((p) => p.volume);

  const trendSma = opts.trendFilter ? computeSMA(closes, opts.trendSmaPeriod) : [];
  const rsi = opts.momentumFilter ? computeRSI(closes, opts.rsiPeriod) : [];
  const volumeSma = opts.volumeFilter ? computeSMA(
    volumes.map((v) => v ?? 0),
    opts.volumeSmaPeriod,
  ) : [];
  const atr = opts.atrStops ? computeATR(highs, lows, closes, opts.atrPeriod) : [];

  const dateIndex = buildDateIndex(series);

  // Track last signal for consecutive filter
  let lastSignalType: 'BUY' | 'SELL' | null = null;
  let lastSignalTime = 0;

  const filtered: SignalWithStrength[] = [];

  for (const signal of signals) {
    const signalTime = signal.time instanceof Date ? signal.time : new Date(signal.time as unknown as string);
    const dateKey = signalTime.toISOString().split('T')[0];
    const day = dateIndex.get(dateKey);

    if (!day) {
      // No price data for this signal day — let it through (safe default)
      filtered.push(signal);
      continue;
    }

    const idx = day.index;

    // --- 1. Trend filter ---
    if (opts.trendFilter && !isNaN(trendSma[idx])) {
      if (signal.type === 'BUY' && day.close < trendSma[idx]) continue;
      if (signal.type === 'SELL' && day.close > trendSma[idx]) continue;
    }

    // --- 2. Volume confirmation ---
    if (opts.volumeFilter && day.volume != null && !isNaN(volumeSma[idx])) {
      if (day.volume < volumeSma[idx]) continue;
    }

    // --- 3. Momentum (RSI) confirmation ---
    if (opts.momentumFilter && !isNaN(rsi[idx])) {
      if (signal.type === 'BUY' && rsi[idx] > opts.rsiOverbought) continue;
      if (signal.type === 'SELL' && rsi[idx] < opts.rsiOversold) continue;
    }

    // --- 4. Consecutive signal filter ---
    if (opts.consecutiveFilter && lastSignalType === signal.type) {
      const daysBetween = (signalTime.getTime() - lastSignalTime) / (1000 * 60 * 60 * 24);
      if (daysBetween <= opts.consecutiveDays) continue;
    }

    // --- 5. ATR-based dynamic stop enrichment ---
    // We attach the computed stop to a slightly extended copy so the engine can
    // use it later. The signal itself still passes through; the stop is metadata.
    let enrichedSignal = signal;
    if (opts.atrStops && !isNaN(atr[idx]) && signal.type === 'BUY') {
      const stopPrice = signal.price - opts.atrMultiplier * atr[idx];
      enrichedSignal = {
        ...signal,
        // Store ATR stop as dynamic stop-loss suggestion
        // BacktestEngine can read this via (signal as any).atrStop
        ...({ atrStop: stopPrice, atrValue: atr[idx] } as Record<string, number>),
      };
    }

    // Update tracking for consecutive filter
    if (signal.type === 'BUY' || signal.type === 'SELL') {
      lastSignalType = signal.type;
      lastSignalTime = signalTime.getTime();
    }

    filtered.push(enrichedSignal);
  }

  return filtered;
}
