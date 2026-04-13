import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Smart Regime-Aware Strategy
 *
 * Key innovation: detect market regime FIRST, then only trade when conditions
 * are favorable. Sits in cash during choppy/uncertain markets instead of
 * generating losing signals.
 *
 * Regimes:
 *   UPTREND   - Buy pullbacks to 20-SMA when RSI is in sweet spot (40-55)
 *   DOWNTREND - Sell bounces to 20-SMA when RSI is in sweet spot (50-65)
 *   RANGING   - Mean-revert between Bollinger Bands with RSI confirmation
 *   CHOPPY    - NO signals. Sit in cash. This is the edge.
 */
export class SmartStrategy extends BaseStrategy {
  private readonly trendSma: number;
  private readonly pullbackSma: number;
  private readonly adxThreshold: number;

  constructor(params: { trendSma?: number; pullbackSma?: number; adxThreshold?: number } = {}) {
    super('SMART', {
      trendSma: params.trendSma ?? 50,
      pullbackSma: params.pullbackSma ?? 20,
      adxThreshold: params.adxThreshold ?? 20,
    });
    this.trendSma = params.trendSma ?? 50;
    this.pullbackSma = params.pullbackSma ?? 20;
    this.adxThreshold = params.adxThreshold ?? 20;
  }

  /**
   * Calculate ADX (Average Directional Index) — measures trend strength.
   * Returns array of ADX values (NaN for insufficient data).
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
  ): number[] {
    const len = highs.length;
    const adx: number[] = new Array(len).fill(NaN);

    if (len < period * 2 + 1) return adx;

    // True Range, +DM, -DM
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

    // Smoothed TR, +DM, -DM using Wilder's smoothing
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
      const dxVal = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;
      dx.push(dxVal);
    }

    // Smooth DX into ADX
    if (dx.length < period) return adx;

    let adxSum = 0;
    for (let i = 0; i < period; i++) {
      adxSum += dx[i];
    }
    let prevADX = adxSum / period;
    adx[period * 2 - 1] = prevADX;

    for (let i = period; i < dx.length; i++) {
      prevADX = (prevADX * (period - 1) + dx[i]) / period;
      adx[period + i] = prevADX;
    }

    return adx;
  }

  /**
   * Calculate ATR (Average True Range) — measures volatility.
   */
  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number = 14,
  ): number[] {
    const len = highs.length;
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
    for (let i = 0; i < period; i++) {
      sum += tr[i];
    }
    atr[period - 1] = sum / period;

    // Wilder's smoothing
    for (let i = period; i < len; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }

    return atr;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    const closes = points.map((p) => p.close);
    const highs = points.map((p) => p.high ?? p.close);
    const lows = points.map((p) => p.low ?? p.close);
    const len = closes.length;

    // Need at least trendSma + 10 lookback for regime slope check
    const minBars = Math.max(this.trendSma + 10, 50);
    if (len < minBars) return [];

    // Compute all indicators
    const trendSmaArr = this.calculateSMA(closes, this.trendSma);
    const pullbackSmaArr = this.calculateSMA(closes, this.pullbackSma);
    const rsi = this.calculateRSI(closes, 14);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const adx = this.calculateADX(highs, lows, closes, 14);
    const atr = this.calculateATR(highs, lows, closes, 14);

    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < len; i++) {
      const close = closes[i];
      const prevClose = closes[i - 1];
      const trend = trendSmaArr[i];
      const pullback = pullbackSmaArr[i];
      const prevPullback = pullbackSmaArr[i - 1];
      const currRSI = rsi[i];
      const prevRSI = rsi[i - 1];
      const currADX = adx[i];
      const upperBand = bb.upper[i];
      const lowerBand = bb.lower[i];
      const currATR = atr[i];

      // Skip if any critical indicator is NaN
      if (
        isNaN(trend) || isNaN(pullback) || isNaN(prevPullback) ||
        isNaN(currRSI) || isNaN(upperBand) || isNaN(lowerBand)
      ) {
        continue;
      }

      // --- Regime classification ---
      const slopeIdx = i - 10;
      const trendSlope = slopeIdx >= 0 && !isNaN(trendSmaArr[slopeIdx])
        ? trendSmaArr[i] - trendSmaArr[slopeIdx]
        : 0;

      const isUptrend = close > trend && trendSlope > 0;
      const isDowntrend = close < trend && trendSlope < 0;
      const adxValid = !isNaN(currADX);
      const isRanging = adxValid && currADX < this.adxThreshold &&
        close > lowerBand && close < upperBand;

      // CHOPPY = none of the above -> skip entirely (the edge)
      if (!isUptrend && !isDowntrend && !isRanging) {
        continue;
      }

      let signalType: 'BUY' | 'SELL' | null = null;
      let confirmingFactors = 0;

      // --- UPTREND: buy pullbacks to 20-SMA ---
      if (isUptrend) {
        // Price touches or crosses 20-SMA from above
        const touchedPullback =
          (prevClose > prevPullback && close <= pullback) || // crossed below
          (close >= pullback * 0.99 && close <= pullback * 1.01); // within 1%

        if (touchedPullback) confirmingFactors++;
        if (currRSI >= 40 && currRSI <= 55) confirmingFactors++;
        if (trendSlope > 0) confirmingFactors++;
        if (adxValid && currADX > 25) confirmingFactors++; // strong trend
        if (!isNaN(currATR) && currATR > 0 && (close - lowerBand) > currATR) confirmingFactors++; // not overextended down

        if (touchedPullback && currRSI >= 40 && currRSI <= 55) {
          signalType = 'BUY';
        }
      }

      // --- DOWNTREND: multiple short entry methods ---
      if (isDowntrend && !signalType) {
        // Method 1: Classic pullback to SMA (price bounced up to 20-SMA)
        const touchedPullback =
          (prevClose < prevPullback && close >= pullback) || // crossed above
          (close >= pullback * 0.99 && close <= pullback * 1.01); // within 1%

        // Method 2: Price falling through SMA (breakdown confirmation)
        const fallingThroughSMA = prevClose >= pullback && close < pullback;

        // Method 3: Overbought bounce in downtrend (RSI popped up then rolling over)
        const overboughtInDowntrend = currRSI >= 55 && prevRSI > currRSI; // RSI turning down from elevated

        // Method 4: Continued downtrend — price below both SMAs and making lower lows
        const persistentBear = close < pullback && close < trend &&
          i >= 3 && closes[i] < closes[i - 3]; // price lower than 3 bars ago

        if (touchedPullback) confirmingFactors++;
        if (fallingThroughSMA) confirmingFactors++;
        if (overboughtInDowntrend) confirmingFactors++;
        if (trendSlope < 0) confirmingFactors++;
        if (adxValid && currADX > 25) confirmingFactors++;

        // Short on any of these conditions with RSI confirmation
        if ((touchedPullback || fallingThroughSMA || overboughtInDowntrend) && currRSI >= 40 && currRSI <= 75) {
          signalType = 'SELL';
        }
        // Persistent bear — short even without a bounce, if trend is strong
        else if (persistentBear && adxValid && currADX > 30 && currRSI >= 35 && currRSI <= 60) {
          signalType = 'SELL';
          confirmingFactors++; // strong trend confirmation
        }
      }

      // --- RANGING: mean reversion at Bollinger Bands ---
      if (isRanging && !signalType) {
        const nearLowerBand = close < lowerBand * 1.01;
        const nearUpperBand = close > upperBand * 0.99;

        if (nearLowerBand && currRSI < 35) {
          signalType = 'BUY';
          confirmingFactors++;
          if (currRSI < 30) confirmingFactors++; // deeply oversold
          if (close < lowerBand) confirmingFactors++; // below band
          if (adxValid && currADX < 15) confirmingFactors++; // very range-bound
          if (!isNaN(currATR) && currATR > 0) confirmingFactors++; // vol present
        }

        if (nearUpperBand && currRSI > 65 && !signalType) {
          signalType = 'SELL';
          confirmingFactors++;
          if (currRSI > 70) confirmingFactors++;
          if (close > upperBand) confirmingFactors++;
          if (adxValid && currADX < 15) confirmingFactors++;
          if (!isNaN(currATR) && currATR > 0) confirmingFactors++;
        }
      }

      // --- Emit signal if strength passes threshold ---
      if (signalType) {
        const strength = Math.min(1, confirmingFactors * 0.2);
        if (strength >= 0.4) {
          signals.push({
            time: points[i].timestamp,
            type: signalType,
            price: close,
            strength,
          });
        }
      }
    }

    return signals;
  }
}
