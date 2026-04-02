import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Mean Reversion Strategy
 *
 * Exploits the structural tendency of crypto markets to oscillate around a mean.
 * Instead of chasing trends (which lagging indicators do poorly), it bets on
 * reversion when price has deviated too far from the mean.
 *
 * Entry logic:
 *   BUY  when z-score < -entryZScore (oversold bounce expected)
 *   SELL when z-score > +entryZScore (overbought pullback expected)
 *
 * Confirmation filters (avoid catching falling knives):
 *   - RSI turning: RSI was extreme but is now reversing direction
 *   - Volume elevated: >1.2x average volume confirms capitulation
 *   - ATR filter: skip if ATR% > maxAtrPct (crash in progress)
 *
 * Signal strength: linear interpolation from z-score magnitude
 *   |z| = entryZScore  -> 0.5
 *   |z| = entryZScore+1 -> 0.8
 *   |z| >= entryZScore+2 -> 1.0
 */
export class MeanReversionStrategy extends BaseStrategy {
  private readonly lookbackPeriod: number;
  private readonly entryZScore: number;
  private readonly rsiPeriod: number;
  private readonly requireRsiTurn: boolean;
  private readonly volumeConfirm: boolean;
  private readonly maxAtrPct: number;

  constructor(params?: Record<string, number>) {
    const resolved = {
      lookbackPeriod: params?.lookbackPeriod ?? 20,
      entryZScore: params?.entryZScore ?? 2.0,
      rsiPeriod: params?.rsiPeriod ?? 14,
      requireRsiTurn: params?.requireRsiTurn ?? 1,   // 1 = true, 0 = false
      volumeConfirm: params?.volumeConfirm ?? 1,     // 1 = true, 0 = false
      maxAtrPct: params?.maxAtrPct ?? 6,
    };
    super('MEAN_REVERSION', resolved);
    this.lookbackPeriod = resolved.lookbackPeriod;
    this.entryZScore = resolved.entryZScore;
    this.rsiPeriod = resolved.rsiPeriod;
    this.requireRsiTurn = resolved.requireRsiTurn >= 1;
    this.volumeConfirm = resolved.volumeConfirm >= 1;
    this.maxAtrPct = resolved.maxAtrPct;
  }

  // --- Internal indicator helpers (self-contained) ---

  /**
   * Z-score: (price - SMA) / stdDev over lookback window
   */
  private computeZScores(closes: number[], period: number): number[] {
    const len = closes.length;
    const zScores: number[] = new Array(len).fill(NaN);

    for (let i = period - 1; i < len; i++) {
      const window = closes.slice(i - period + 1, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / period;
      const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
      const stdDev = Math.sqrt(variance);
      zScores[i] = stdDev > 0 ? (closes[i] - mean) / stdDev : 0;
    }

    return zScores;
  }

  /**
   * ATR (Average True Range) using Wilder's smoothing
   */
  private computeATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
  ): number[] {
    const len = closes.length;
    const atr: number[] = new Array(len).fill(NaN);
    if (len < period + 1) return atr;

    // True Range
    const tr: number[] = [highs[0] - lows[0]];
    for (let i = 1; i < len; i++) {
      tr.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      ));
    }

    // First ATR = simple average
    let sum = 0;
    for (let i = 0; i < period; i++) sum += tr[i];
    atr[period - 1] = sum / period;

    // Wilder's smoothing
    for (let i = period; i < len; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
  }

  /**
   * Volume SMA for comparison
   */
  private computeVolumeSMA(volumes: number[], period: number): number[] {
    const len = volumes.length;
    const sma: number[] = new Array(len).fill(NaN);

    for (let i = period - 1; i < len; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += volumes[j];
      sma[i] = sum / period;
    }

    return sma;
  }

  /**
   * Map z-score magnitude to signal strength [0, 1].
   * |z| = entryZScore   -> 0.5
   * |z| = entryZScore+1 -> 0.8
   * |z| >= entryZScore+2 -> 1.0
   * Linear interpolation between anchor points.
   */
  private zScoreToStrength(absZ: number): number {
    const base = this.entryZScore;
    if (absZ <= base) return 0.5;
    if (absZ >= base + 2) return 1.0;
    // Linear from 0.5 at base to 1.0 at base+2
    return 0.5 + ((absZ - base) / 2) * 0.5;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    const closes = points.map((p) => p.close);
    const highs = points.map((p) => p.high ?? p.close);
    const lows = points.map((p) => p.low ?? p.close);
    const volumes = points.map((p) => p.volume ?? 0);
    const len = closes.length;

    // Need enough data for all indicators
    const minBars = Math.max(this.lookbackPeriod, this.rsiPeriod) + 2;
    if (len < minBars) return [];

    // Compute indicators
    const zScores = this.computeZScores(closes, this.lookbackPeriod);
    const rsi = this.calculateRSI(closes, this.rsiPeriod);
    const atr = this.computeATR(highs, lows, closes, 14);
    const volumeSma = this.computeVolumeSMA(volumes, this.lookbackPeriod);

    const signals: SignalWithStrength[] = [];

    for (let i = 2; i < len; i++) {
      const z = zScores[i];
      const currRSI = rsi[i];
      const prevRSI = rsi[i - 1];
      const currATR = atr[i];
      const close = closes[i];
      const vol = volumes[i];
      const avgVol = volumeSma[i];

      // Skip if critical indicators unavailable
      if (isNaN(z) || isNaN(currRSI) || isNaN(prevRSI)) continue;

      // ATR filter: skip if volatility is too extreme (crash in progress)
      if (!isNaN(currATR) && close > 0) {
        const atrPct = (currATR / close) * 100;
        if (atrPct > this.maxAtrPct) continue;
      }

      const absZ = Math.abs(z);

      // --- BUY signal: z-score below -entryZScore (oversold) ---
      if (z < -this.entryZScore) {
        // RSI turn confirmation: RSI was below 30 but is now rising
        if (this.requireRsiTurn) {
          const rsiTurning = prevRSI < 30 && currRSI > prevRSI;
          if (!rsiTurning) continue;
        }

        // Volume confirmation: volume > 1.2x average
        if (this.volumeConfirm && !isNaN(avgVol) && avgVol > 0) {
          if (vol < avgVol * 1.2) continue;
        }

        const strength = this.zScoreToStrength(absZ);
        signals.push({
          time: points[i].timestamp,
          type: 'BUY',
          price: close,
          strength,
        });
      }

      // --- SELL signal: z-score above +entryZScore (overbought) ---
      else if (z > this.entryZScore) {
        // RSI turn confirmation: RSI was above 70 but is now falling
        if (this.requireRsiTurn) {
          const rsiTurning = prevRSI > 70 && currRSI < prevRSI;
          if (!rsiTurning) continue;
        }

        // Volume confirmation: volume > 1.2x average
        if (this.volumeConfirm && !isNaN(avgVol) && avgVol > 0) {
          if (vol < avgVol * 1.2) continue;
        }

        const strength = this.zScoreToStrength(absZ);
        signals.push({
          time: points[i].timestamp,
          type: 'SELL',
          price: close,
          strength,
        });
      }
    }

    return signals;
  }
}
