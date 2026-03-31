import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import {
  getActionableLosingPatterns,
  getActionableWinningPatterns,
  detectCurrentConditions,
} from '@/services/learning/tradeAnalyzer';

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

  /** Enable learned-pattern adaptive filter. Default: true */
  learnedFilter?: boolean;
  /** Skip the learned filter entirely (API bypass). Default: false */
  skipLearnedFilter?: boolean;
  /** Symbol for pattern lookup (needed for multi-symbol runs). */
  symbol?: string;
}

const DEFAULT_OPTIONS: Required<FilterOptions> = {
  trendFilter: true,
  trendSmaPeriod: 20,       // Changed from 50 to 20 — more responsive in volatile markets
  volumeFilter: false,       // Disabled by default — too many crypto signals happen on low volume
  volumeSmaPeriod: 20,
  momentumFilter: true,
  rsiPeriod: 14,
  rsiOverbought: 80,         // Relaxed from 75 — only block extreme overbought
  rsiOversold: 20,           // Relaxed from 25 — only block extreme oversold
  consecutiveFilter: true,
  consecutiveDays: 2,         // Reduced from 3 to 2 — allow faster re-entry
  atrStops: true,
  atrPeriod: 14,
  atrMultiplier: 2,
  learnedFilter: true,
  skipLearnedFilter: false,
  symbol: '',
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

  // Resolve symbol for learned-pattern lookup (prefer explicit option, fall back to series)
  const resolvedSymbol = opts.symbol || series.symbol || '';

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

    // --- Scoring-based filter (replaces hard blocks) ---
    // Each filter contributes a penalty score. Signal is blocked only if total penalty is too high.
    // This prevents over-filtering in volatile markets where individual conditions often flip.
    let penaltyScore = 0;
    const BLOCK_THRESHOLD = 3; // Need 3+ penalty points to block a signal

    // --- 1. Trend filter (penalty for counter-trend entries, not hard block) ---
    // Only penalize extreme counter-trend entries. Normal oscillation around SMA is fine.
    if (opts.trendFilter && !isNaN(trendSma[idx])) {
      if (signal.type === 'BUY' && day.close < trendSma[idx]) {
        const pctBelow = (trendSma[idx] - day.close) / trendSma[idx] * 100;
        if (pctBelow > 8) penaltyScore += 2;       // Way below trend — risky long
        else if (pctBelow > 5) penaltyScore += 1;  // Moderately below
        // Within 5% = no penalty (buying the dip near support is valid)
      }
      // For SELL/short signals: penalize shorting into deeply oversold conditions
      if (signal.type === 'SELL' && day.close < trendSma[idx]) {
        const pctBelow = (trendSma[idx] - day.close) / trendSma[idx] * 100;
        if (pctBelow > 8) penaltyScore += 2;       // Don't short into a crash (bounce coming)
        else if (pctBelow > 5) penaltyScore += 1;
        // Shorting near or above SMA = no penalty (that's the ideal short entry)
      }
    }

    // --- 2. Volume confirmation (penalty if enabled) ---
    if (opts.volumeFilter && day.volume != null && !isNaN(volumeSma[idx]) && volumeSma[idx] > 0) {
      if (day.volume < volumeSma[idx] * 0.5) penaltyScore += 1; // Only penalize very low volume
    }

    // --- 3. Momentum (RSI) — hard block only for extreme values ---
    if (opts.momentumFilter && !isNaN(rsi[idx])) {
      if (signal.type === 'BUY' && rsi[idx] > opts.rsiOverbought) penaltyScore += 2; // Extreme overbought
      if (signal.type === 'SELL' && rsi[idx] < opts.rsiOversold) penaltyScore += 2;  // Extreme oversold
      // Mild overbought/oversold gets a lighter penalty
      if (signal.type === 'BUY' && rsi[idx] > 70 && rsi[idx] <= opts.rsiOverbought) penaltyScore += 1;
      if (signal.type === 'SELL' && rsi[idx] < 30 && rsi[idx] >= opts.rsiOversold) penaltyScore += 1;
    }

    // --- 4. Consecutive signal filter (still hard block — prevents rapid re-entry after stop-loss) ---
    if (opts.consecutiveFilter && lastSignalType === signal.type) {
      const daysBetween = (signalTime.getTime() - lastSignalTime) / (1000 * 60 * 60 * 24);
      if (daysBetween <= opts.consecutiveDays) continue; // Hard block — always skip rapid re-entry
    }

    // Block BUY signals if penalty is too high
    // SELL signals are NEVER blocked by the scoring filter — they're essential for:
    // 1. Closing losing long positions (risk management)
    // 2. Entering short positions (profit in bearish markets)
    // The engine's risk management (stop-loss, trailing stop) handles bad short entries
    if (signal.type === 'BUY' && penaltyScore >= BLOCK_THRESHOLD) continue;

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

    // --- 6. Learned-pattern adaptive filter ---
    // Uses patterns discovered from previous backtests / paper trades.
    // Only applies to BUY signals — we want to avoid entering in conditions
    // that historically led to losses.
    let learnedFilterApplied = false;

    if (
      opts.learnedFilter &&
      !opts.skipLearnedFilter &&
      signal.type === 'BUY' &&
      resolvedSymbol
    ) {
      const losingPatterns = getActionableLosingPatterns(resolvedSymbol);
      const winningPatterns = getActionableWinningPatterns(resolvedSymbol);

      if (losingPatterns.length > 0) {
        const currentConditions = detectCurrentConditions(series, idx);
        const matchedLosing = losingPatterns.filter((p) =>
          currentConditions.includes(p.condition),
        );
        const matchedWinning = winningPatterns.filter((p) =>
          currentConditions.includes(p.condition),
        );

        // If 2+ high-confidence losing patterns match AND no winning pattern
        // also matches, block the signal.
        if (matchedLosing.length >= 2 && matchedWinning.length === 0) {
          learnedFilterApplied = true;
          continue; // BLOCK — too risky
        }

        // If 1 losing pattern matches but a winning pattern also matches,
        // let it through (conflicting signals).
        // If 0 losing patterns match, let it through.
        if (matchedLosing.length > 0) {
          learnedFilterApplied = true;
        }
      }
    }

    // Tag the signal with learned-filter metadata
    if (learnedFilterApplied) {
      enrichedSignal = {
        ...enrichedSignal,
        ...({ learnedFilterApplied: true } as Record<string, boolean>),
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
