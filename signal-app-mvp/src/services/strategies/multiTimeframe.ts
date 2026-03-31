import type { PriceSeries, PricePoint } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';

// ---- Types ----

export type TrendDirection = 'bullish' | 'bearish' | 'neutral';

export interface TimeframeConfluence {
  daily: TrendDirection;
  weekly: TrendDirection;
  monthly: TrendDirection;
  confluenceScore: number; // -1 (all bearish) to +1 (all bullish)
  recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
}

// ---- Resampling helpers ----

/**
 * Resample daily candles into weekly candles (Mon-Sun periods).
 * Each week's OHLCV is computed from the daily candles within that period.
 */
function resampleToWeekly(points: PricePoint[]): PricePoint[] {
  if (points.length === 0) return [];

  const weeks: PricePoint[][] = [];
  let currentWeek: PricePoint[] = [];

  for (const point of points) {
    const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp as unknown as string);
    const dayOfWeek = ts.getUTCDay(); // 0 = Sunday, 1 = Monday

    // Start a new week on Monday (or first point)
    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(point);
  }

  // Push the final partial week
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks.map(aggregateCandles);
}

/**
 * Resample daily candles into monthly candles (calendar months).
 */
function resampleToMonthly(points: PricePoint[]): PricePoint[] {
  if (points.length === 0) return [];

  const months: PricePoint[][] = [];
  let currentMonth: PricePoint[] = [];
  let currentKey = '';

  for (const point of points) {
    const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp as unknown as string);
    const key = `${ts.getUTCFullYear()}-${ts.getUTCMonth()}`;

    if (key !== currentKey && currentMonth.length > 0) {
      months.push(currentMonth);
      currentMonth = [];
    }
    currentKey = key;
    currentMonth.push(point);
  }

  if (currentMonth.length > 0) {
    months.push(currentMonth);
  }

  return months.map(aggregateCandles);
}

/**
 * Aggregate an array of daily candles into a single OHLCV candle.
 */
function aggregateCandles(candles: PricePoint[]): PricePoint {
  const open = candles[0].open ?? candles[0].close;
  const close = candles[candles.length - 1].close;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;

  for (const c of candles) {
    const h = c.high ?? c.close;
    const l = c.low ?? c.close;
    if (h > high) high = h;
    if (l < low) low = l;
    if (c.volume != null) volume += c.volume;
  }

  return {
    timestamp: candles[candles.length - 1].timestamp, // Use last date in the period
    open,
    high,
    low,
    close,
    volume: volume > 0 ? volume : undefined,
  };
}

// ---- SMA helper ----

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

// ---- Trend detection ----

/**
 * Determine trend direction for a set of candles:
 * - Bullish: close > 20-period SMA AND SMA is rising (slope positive over 5 periods)
 * - Bearish: close < 20-period SMA AND SMA is falling
 * - Neutral: neither condition met
 */
function detectTrend(candles: PricePoint[]): TrendDirection {
  if (candles.length < 20) return 'neutral'; // Not enough data

  const closes = candles.map((c) => c.close);
  const sma = computeSMA(closes, 20);

  const lastIdx = closes.length - 1;
  const lastClose = closes[lastIdx];
  const lastSma = sma[lastIdx];

  if (isNaN(lastSma)) return 'neutral';

  // Check SMA slope over the last 5 periods
  const slopeStart = lastIdx - 5;
  if (slopeStart < 0 || isNaN(sma[slopeStart])) return 'neutral';

  const smaRising = sma[lastIdx] > sma[slopeStart];
  const smaFalling = sma[lastIdx] < sma[slopeStart];

  if (lastClose > lastSma && smaRising) return 'bullish';
  if (lastClose < lastSma && smaFalling) return 'bearish';
  return 'neutral';
}

// ---- Confluence scoring ----

function computeConfluenceScore(
  daily: TrendDirection,
  weekly: TrendDirection,
  monthly: TrendDirection,
): number {
  const directions = [daily, weekly, monthly];
  const bullishCount = directions.filter((d) => d === 'bullish').length;
  const bearishCount = directions.filter((d) => d === 'bearish').length;
  const neutralCount = directions.filter((d) => d === 'neutral').length;

  // All same direction
  if (bullishCount === 3) return 1.0;
  if (bearishCount === 3) return -1.0;

  // Two aligned + one neutral
  if (bullishCount === 2 && neutralCount === 1) return 0.7;
  if (bearishCount === 2 && neutralCount === 1) return -0.7;

  // Two aligned + one opposing — moderate signal
  if (bullishCount === 2 && bearishCount === 1) return 0.5;
  if (bearishCount === 2 && bullishCount === 1) return -0.5;

  // Only daily aligned (one bullish or bearish, rest neutral)
  if (bullishCount === 1 && neutralCount === 2) {
    return daily === 'bullish' ? 0.3 : 0.1;
  }
  if (bearishCount === 1 && neutralCount === 2) {
    return daily === 'bearish' ? -0.3 : -0.1;
  }

  // All neutral
  return 0;
}

function scoreToRecommendation(
  score: number,
): 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' {
  if (score >= 0.8) return 'strong_buy';
  if (score >= 0.3) return 'buy';
  if (score <= -0.8) return 'strong_sell';
  if (score <= -0.3) return 'sell';
  return 'neutral';
}

// ---- Public API ----

/**
 * Compute multi-timeframe confluence from a daily PriceSeries.
 * Resamples daily data into weekly and monthly candles, then
 * determines trend direction for each timeframe.
 */
export function getMultiTimeframeConfluence(series: PriceSeries): TimeframeConfluence {
  const points = series.points;

  const daily = detectTrend(points);
  const weeklyCandles = resampleToWeekly(points);
  const monthlyCandles = resampleToMonthly(points);

  const weekly = detectTrend(weeklyCandles);
  const monthly = detectTrend(monthlyCandles);

  const confluenceScore = computeConfluenceScore(daily, weekly, monthly);
  const recommendation = scoreToRecommendation(confluenceScore);

  return { daily, weekly, monthly, confluenceScore, recommendation };
}

/**
 * Apply multi-timeframe confluence modifier to a signal's strength.
 *
 * - BUY signal: strength *= (1 + confluenceScore * 0.5)
 * - SELL signal: strength *= (1 - confluenceScore * 0.5)
 * - BUY with strongly bearish confluence (< -0.5): strength *= 0.3 (fighting the trend)
 * - SELL with strongly bullish confluence (> 0.5): strength *= 0.3 (fighting the trend)
 */
export function applyMultiTimeframeModifier(
  signal: SignalWithStrength,
  confluence: TimeframeConfluence,
): SignalWithStrength {
  if (signal.type === 'HOLD') return signal;

  let strength = signal.strength;
  const score = confluence.confluenceScore;

  if (signal.type === 'BUY') {
    // Fighting a strong bearish trend — almost block
    if (score < -0.5) {
      strength *= 0.3;
    } else {
      strength *= 1 + score * 0.5;
    }
  } else if (signal.type === 'SELL') {
    // Fighting a strong bullish trend — almost block
    if (score > 0.5) {
      strength *= 0.3;
    } else {
      strength *= 1 - score * 0.5;
    }
  }

  // Clamp strength to [0, 1]
  strength = Math.max(0, Math.min(1, strength));

  return { ...signal, strength };
}
