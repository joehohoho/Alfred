import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Breakout Strategy
 *
 * Detects consolidation ranges (tight price channels) and trades confirmed
 * breakouts with volume confirmation. Unlike SMA crossovers that whipsaw in
 * range-bound markets, this waits for genuine price expansion.
 *
 * Entry conditions:
 *   1. Price has been consolidating (range < threshold% over lookback)
 *   2. Close breaks above/below the consolidation boundary
 *   3. Volume exceeds average by a configurable multiplier
 *   4. Candle closes in the direction of breakout (false breakout filter)
 *   5. ADX > threshold (trend strength developing)
 *   6. RSI in a non-exhausted zone
 *
 * Signal strength: Proportional to volume surge + distance beyond boundary.
 */
export class BreakoutStrategy extends BaseStrategy {
  private readonly consolidationPeriod: number;
  private readonly rangeThresholdPct: number;
  private readonly volumeMultiplier: number;
  private readonly adxPeriod: number;
  private readonly adxThreshold: number;
  private readonly rsiPeriod: number;

  constructor(params?: Record<string, number>) {
    const p = params ?? {};
    super('BREAKOUT', {
      consolidationPeriod: p.consolidationPeriod ?? 20,
      rangeThresholdPct: p.rangeThresholdPct ?? 8,
      volumeMultiplier: p.volumeMultiplier ?? 1.5,
      adxPeriod: p.adxPeriod ?? 14,
      adxThreshold: p.adxThreshold ?? 20,
      rsiPeriod: p.rsiPeriod ?? 14,
    });
    this.consolidationPeriod = p.consolidationPeriod ?? 20;
    this.rangeThresholdPct = p.rangeThresholdPct ?? 8;
    this.volumeMultiplier = p.volumeMultiplier ?? 1.5;
    this.adxPeriod = p.adxPeriod ?? 14;
    this.adxThreshold = p.adxThreshold ?? 20;
    this.rsiPeriod = p.rsiPeriod ?? 14;
  }

  // ---- Indicator calculations (self-contained) ----

  /**
   * ADX (Average Directional Index) — trend strength 0-100.
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): number[] {
    const len = highs.length;
    const adx: number[] = new Array(len).fill(NaN);
    if (len < period * 2 + 1) return adx;

    const tr: number[] = [0];
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];

    for (let i = 1; i < len; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];

      tr.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      ));
      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    }

    // Wilder's smoothing
    let smoothTR = 0;
    let smoothPlusDM = 0;
    let smoothMinusDM = 0;
    for (let i = 1; i <= period; i++) {
      smoothTR += tr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
    }

    const dx: number[] = [];
    for (let i = period; i < len; i++) {
      if (i > period) {
        smoothTR = smoothTR - smoothTR / period + tr[i];
        smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
        smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
      }
      const plusDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
      const minusDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
      const diSum = plusDI + minusDI;
      dx.push(diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100);
    }

    if (dx.length < period) return adx;

    let adxSum = 0;
    for (let i = 0; i < period; i++) adxSum += dx[i];
    let prevADX = adxSum / period;
    adx[period * 2 - 1] = prevADX;

    for (let i = period; i < dx.length; i++) {
      prevADX = (prevADX * (period - 1) + dx[i]) / period;
      adx[period + i] = prevADX;
    }

    return adx;
  }

  /**
   * Average volume over a rolling window.
   */
  private calculateAvgVolume(volumes: number[], period: number): number[] {
    const avg: number[] = new Array(volumes.length).fill(NaN);
    let sum = 0;
    for (let i = 0; i < volumes.length; i++) {
      sum += volumes[i];
      if (i >= period) sum -= volumes[i - period];
      if (i >= period - 1) avg[i] = sum / period;
    }
    return avg;
  }

  // ---- Signal generation ----

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    const closes = points.map((p) => p.close);
    const highs = points.map((p) => p.high ?? p.close);
    const lows = points.map((p) => p.low ?? p.close);
    const volumes = points.map((p) => p.volume ?? 0);
    const len = closes.length;

    const minBars = Math.max(this.consolidationPeriod + 5, this.adxPeriod * 2 + 2, this.rsiPeriod + 2);
    if (len < minBars) return [];

    // Pre-compute indicators
    const rsi = this.calculateRSI(closes, this.rsiPeriod);
    const adx = this.calculateADX(highs, lows, closes, this.adxPeriod);
    const avgVol = this.calculateAvgVolume(volumes, this.consolidationPeriod);

    const signals: SignalWithStrength[] = [];

    for (let i = this.consolidationPeriod; i < len; i++) {
      const close = closes[i];
      const high = highs[i];
      const low = lows[i];
      const volume = volumes[i];
      const currRSI = rsi[i];
      const currADX = adx[i];
      const currAvgVol = avgVol[i];

      // Skip if critical indicators unavailable
      if (isNaN(currRSI)) continue;

      // ---- Step 1: Detect consolidation range ----
      let rangeHigh = -Infinity;
      let rangeLow = Infinity;
      for (let j = i - this.consolidationPeriod; j < i; j++) {
        if (highs[j] > rangeHigh) rangeHigh = highs[j];
        if (lows[j] < rangeLow) rangeLow = lows[j];
      }

      const rangeWidth = rangeHigh - rangeLow;
      const rangePct = rangeLow > 0 ? (rangeWidth / rangeLow) * 100 : Infinity;

      // Not in consolidation — skip
      if (rangePct > this.rangeThresholdPct) continue;

      // ---- Step 2: Volume confirmation ----
      const hasVolume = !isNaN(currAvgVol) && currAvgVol > 0;
      const volumeRatio = hasVolume ? volume / currAvgVol : 0;
      const volumeConfirmed = !hasVolume || volumeRatio >= this.volumeMultiplier;
      // If volume data exists but doesn't confirm, skip
      if (hasVolume && !volumeConfirmed) continue;

      // ---- Step 3: Breakout detection ----
      const candleRange = high - low;
      const candleBodyTop = Math.max(close, closes[i - 1] ?? close);
      const candleBodyBot = Math.min(close, closes[i - 1] ?? close);

      let signalType: 'BUY' | 'SELL' | null = null;

      // Upward breakout: close above consolidation high
      if (close > rangeHigh) {
        // False breakout filter: candle must close in top 25% of its range
        const closePosition = candleRange > 0 ? (close - low) / candleRange : 0.5;
        if (closePosition < 0.75) continue;

        // RSI check: 40-70 (not overbought)
        if (currRSI < 40 || currRSI > 70) continue;

        signalType = 'BUY';
      }

      // Downward breakout: close below consolidation low
      if (!signalType && close < rangeLow) {
        // False breakout filter: candle must close in bottom 25% of its range
        const closePosition = candleRange > 0 ? (close - low) / candleRange : 0.5;
        if (closePosition > 0.25) continue;

        // RSI check: 30-60 (not oversold)
        if (currRSI < 30 || currRSI > 60) continue;

        signalType = 'SELL';
      }

      if (!signalType) continue;

      // ---- Step 4: ADX confirmation (preferred, not required) ----
      const adxValid = !isNaN(currADX);
      let adxBonus = 0;
      if (adxValid && currADX >= this.adxThreshold) {
        adxBonus = 0.15; // Trend strength developing — boost confidence
      }

      // ---- Step 5: Signal strength ----
      // Based on: volume surge magnitude + distance beyond boundary
      const boundary = signalType === 'BUY' ? rangeHigh : rangeLow;
      const distanceBeyond = Math.abs(close - boundary);
      const distancePct = boundary > 0 ? (distanceBeyond / boundary) * 100 : 0;

      // Volume component: 1.5x = 0, 2.0x = 0.5 (linear scale from multiplier to 2x multiplier)
      const volStrength = hasVolume
        ? Math.min(1, Math.max(0, (volumeRatio - this.volumeMultiplier) / this.volumeMultiplier))
        : 0.25; // No volume data — moderate default

      // Distance component: 0% beyond = 0, 2% beyond = 1.0
      const distStrength = Math.min(1, distancePct / 2);

      // Combine: volume 40%, distance 40%, ADX bonus 20%
      const rawStrength = volStrength * 0.4 + distStrength * 0.4 + adxBonus + 0.2;
      const strength = Math.min(1, Math.max(0.1, rawStrength));

      // Only emit signals with meaningful strength
      if (strength >= 0.3) {
        signals.push({
          time: points[i].timestamp,
          type: signalType,
          price: close,
          strength: Math.round(strength * 100) / 100,
        });
      }
    }

    return signals;
  }
}
