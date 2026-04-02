import type { PriceSeries } from '@/models/PriceData';
import type { Strategy, SignalWithStrength } from '@/services/backtest/engine';

// --- Public types ---

export interface BayesianEvidence {
  name: string;
  bullishLikelihood: number; // P(evidence | bullish) — 0 to 1
  bearishLikelihood: number; // P(evidence | bearish) — 0 to 1
}

export interface BayesianSignal {
  bullishProbability: number; // 0 to 1
  bearishProbability: number; // 0 to 1
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number; // 0 to 1 (how far past threshold)
  evidenceUsed: string[];
}

// --- Internal indicator helpers (self-contained) ---

function computeSMA(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result[i] = sum / period;
  }
  return result;
}

function computeRSI(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return result;

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
      tr[i] = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
    }
  }
  const atr: number[] = new Array(length).fill(NaN);
  if (length < period) return atr;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;
  for (let i = period; i < length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

function computeROC(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  for (let i = period; i < values.length; i++) {
    if (values[i - period] !== 0) {
      result[i] = ((values[i] - values[i - period]) / values[i - period]) * 100;
    }
  }
  return result;
}

// --- Evidence gathering ---

function gatherEvidence(
  series: PriceSeries,
  idx: number,
  closes: number[],
  highs: number[],
  lows: number[],
  sma: number[],
  roc: number[],
  rsi: number[],
  volumes: (number | undefined)[],
  volumeSma: number[],
  atr: number[],
  atrSma: number[],
): BayesianEvidence[] {
  const evidence: BayesianEvidence[] = [];

  // 1. Trend alignment (price vs SMA)
  if (!isNaN(sma[idx])) {
    if (closes[idx] >= sma[idx]) {
      evidence.push({ name: 'trend_above_sma', bullishLikelihood: 0.65, bearishLikelihood: 0.40 });
    } else {
      evidence.push({ name: 'trend_below_sma', bullishLikelihood: 0.35, bearishLikelihood: 0.60 });
    }
  }

  // 2. Momentum (ROC)
  if (!isNaN(roc[idx])) {
    if (roc[idx] > 5) {
      evidence.push({ name: 'momentum_positive', bullishLikelihood: 0.70, bearishLikelihood: 0.30 });
    } else if (roc[idx] < -5) {
      evidence.push({ name: 'momentum_negative', bullishLikelihood: 0.30, bearishLikelihood: 0.70 });
    } else {
      evidence.push({ name: 'momentum_neutral', bullishLikelihood: 0.50, bearishLikelihood: 0.50 });
    }
  }

  // 3. RSI state
  if (!isNaN(rsi[idx])) {
    if (rsi[idx] < 30) {
      evidence.push({ name: 'rsi_oversold', bullishLikelihood: 0.60, bearishLikelihood: 0.45 });
    } else if (rsi[idx] > 70) {
      evidence.push({ name: 'rsi_overbought', bullishLikelihood: 0.40, bearishLikelihood: 0.55 });
    } else {
      evidence.push({ name: 'rsi_neutral', bullishLikelihood: 0.50, bearishLikelihood: 0.50 });
    }
  }

  // 4. Volume confirmation
  if (volumes[idx] != null && !isNaN(volumeSma[idx]) && volumeSma[idx] > 0) {
    const vol = volumes[idx]!;
    if (vol > volumeSma[idx] * 1.5) {
      evidence.push({ name: 'volume_high', bullishLikelihood: 0.60, bearishLikelihood: 0.55 });
    } else if (vol < volumeSma[idx] * 0.5) {
      evidence.push({ name: 'volume_low', bullishLikelihood: 0.40, bearishLikelihood: 0.45 });
    }
    // Normal volume — no evidence (uninformative)
  }

  // 5. Volatility regime (ATR% relative to 30-day average ATR%)
  if (!isNaN(atr[idx]) && !isNaN(atrSma[idx]) && atrSma[idx] > 0 && closes[idx] > 0) {
    const atrPct = atr[idx] / closes[idx];
    const avgAtrPct = atrSma[idx] / closes[idx]; // approximate — uses SMA of ATR values
    if (atrPct < avgAtrPct) {
      evidence.push({ name: 'volatility_low', bullishLikelihood: 0.55, bearishLikelihood: 0.50 });
    } else if (atrPct > avgAtrPct * 1.5) {
      evidence.push({ name: 'volatility_high', bullishLikelihood: 0.45, bearishLikelihood: 0.60 });
    }
    // Normal volatility — no evidence
  }

  // 6. Price structure (higher highs/lows vs lower highs/lows over 10 bars)
  const lookback = 10;
  if (idx >= lookback) {
    let higherHighs = true;
    let higherLows = true;
    let lowerHighs = true;
    let lowerLows = true;

    // Compare the second half of the lookback window against the first half
    const mid = Math.floor(lookback / 2);
    const firstHalfHighMax = Math.max(...highs.slice(idx - lookback, idx - lookback + mid));
    const secondHalfHighMax = Math.max(...highs.slice(idx - mid, idx + 1));
    const firstHalfLowMin = Math.min(...lows.slice(idx - lookback, idx - lookback + mid));
    const secondHalfLowMin = Math.min(...lows.slice(idx - mid, idx + 1));

    higherHighs = secondHalfHighMax > firstHalfHighMax;
    higherLows = secondHalfLowMin > firstHalfLowMin;
    lowerHighs = secondHalfHighMax < firstHalfHighMax;
    lowerLows = secondHalfLowMin < firstHalfLowMin;

    if (higherHighs && higherLows) {
      evidence.push({ name: 'structure_uptrend', bullishLikelihood: 0.70, bearishLikelihood: 0.25 });
    } else if (lowerHighs && lowerLows) {
      evidence.push({ name: 'structure_downtrend', bullishLikelihood: 0.25, bearishLikelihood: 0.70 });
    }
    // Mixed structure — no evidence
  }

  return evidence;
}

// --- Bayesian update ---

function bayesianUpdate(evidence: BayesianEvidence[]): { bullish: number; bearish: number } {
  let priorBull = 0.5;
  let priorBear = 0.5;

  for (const e of evidence) {
    const numeratorBull = e.bullishLikelihood * priorBull;
    const numeratorBear = e.bearishLikelihood * priorBear;
    const normalizer = numeratorBull + numeratorBear;

    if (normalizer === 0) continue; // degenerate case

    priorBull = numeratorBull / normalizer;
    priorBear = numeratorBear / normalizer;
  }

  return { bullish: priorBull, bearish: priorBear };
}

// --- Standalone scoring function ---

/**
 * Computes a Bayesian probability score for a single bar in a price series.
 * Can be used standalone for signal enhancement or within the BayesianStrategy.
 */
export function computeBayesianScore(
  series: PriceSeries,
  idx: number,
  params?: Record<string, number>,
): BayesianSignal {
  const smaPeriod = params?.smaPeriod ?? 50;
  const rocPeriod = params?.rocPeriod ?? 20;
  const rsiPeriod = params?.rsiPeriod ?? 14;
  const atrPeriod = params?.atrPeriod ?? 14;
  const threshold = (params?.threshold ?? 70) / 100; // stored as int for optimizer

  const closes = series.points.map((p) => p.close);
  const highs = series.points.map((p) => p.high ?? p.close);
  const lows = series.points.map((p) => p.low ?? p.close);
  const volumes = series.points.map((p) => p.volume);

  const sma = computeSMA(closes, smaPeriod);
  const roc = computeROC(closes, rocPeriod);
  const rsi = computeRSI(closes, rsiPeriod);
  const volumeSma = computeSMA(
    volumes.map((v) => v ?? 0),
    20,
  );
  const atr = computeATR(highs, lows, closes, atrPeriod);
  const atrSma = computeSMA(
    atr.map((v) => (isNaN(v) ? 0 : v)),
    30,
  );

  const evidence = gatherEvidence(
    series, idx, closes, highs, lows,
    sma, roc, rsi, volumes, volumeSma, atr, atrSma,
  );

  const posterior = bayesianUpdate(evidence);

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  let strength = 0;

  if (posterior.bullish > threshold) {
    signal = 'BUY';
    strength = Math.min(1, (posterior.bullish - threshold) / (1 - threshold));
  } else if (posterior.bearish > threshold) {
    signal = 'SELL';
    strength = Math.min(1, (posterior.bearish - threshold) / (1 - threshold));
  }

  return {
    bullishProbability: posterior.bullish,
    bearishProbability: posterior.bearish,
    signal,
    strength,
    evidenceUsed: evidence.map((e) => e.name),
  };
}

// --- Strategy wrapper ---

/**
 * Bayesian inference strategy.
 *
 * Pre-computes all indicators once then scores each bar. Only emits a signal
 * when the posterior probability exceeds the configured threshold (default 0.70).
 */
export class BayesianStrategy implements Strategy {
  name = 'BAYESIAN';
  private readonly smaPeriod: number;
  private readonly rocPeriod: number;
  private readonly rsiPeriod: number;
  private readonly atrPeriod: number;
  private readonly threshold: number; // 0-1

  constructor(params?: Record<string, number>) {
    this.smaPeriod = params?.smaPeriod ?? 50;
    this.rocPeriod = params?.rocPeriod ?? 20;
    this.rsiPeriod = params?.rsiPeriod ?? 14;
    this.atrPeriod = params?.atrPeriod ?? 14;
    this.threshold = (params?.threshold ?? 70) / 100;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    if (points.length === 0) return [];

    // Pre-compute all indicators once across the full series
    const closes = points.map((p) => p.close);
    const highs = points.map((p) => p.high ?? p.close);
    const lows = points.map((p) => p.low ?? p.close);
    const volumes = points.map((p) => p.volume);

    const sma = computeSMA(closes, this.smaPeriod);
    const roc = computeROC(closes, this.rocPeriod);
    const rsi = computeRSI(closes, this.rsiPeriod);
    const volumeSma = computeSMA(
      volumes.map((v) => v ?? 0),
      20,
    );
    const atr = computeATR(highs, lows, closes, this.atrPeriod);
    const atrSma = computeSMA(
      atr.map((v) => (isNaN(v) ? 0 : v)),
      30,
    );

    // Minimum lookback: need all indicators to be warm
    const minIdx = Math.max(this.smaPeriod, this.rocPeriod, this.rsiPeriod, this.atrPeriod, 30, 10);

    const signals: SignalWithStrength[] = [];

    for (let i = minIdx; i < points.length; i++) {
      const evidence = gatherEvidence(
        series, i, closes, highs, lows,
        sma, roc, rsi, volumes, volumeSma, atr, atrSma,
      );

      const posterior = bayesianUpdate(evidence);

      let type: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let strength = 0;

      if (posterior.bullish > this.threshold) {
        type = 'BUY';
        strength = Math.min(1, (posterior.bullish - this.threshold) / (1 - this.threshold));
      } else if (posterior.bearish > this.threshold) {
        type = 'SELL';
        strength = Math.min(1, (posterior.bearish - this.threshold) / (1 - this.threshold));
      }

      if (type !== 'HOLD') {
        const ts = points[i].timestamp instanceof Date
          ? points[i].timestamp
          : new Date(points[i].timestamp as unknown as string);
        signals.push({
          time: ts,
          type,
          price: closes[i],
          strength,
        });
      }
    }

    return signals;
  }
}
