import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Trend Following Strategy (HMA + ADX)
 * 
 * Uses Hull Moving Average (HMA) + Average Directional Index (ADX)
 * - HMA: Faster response to price changes than SMA
 * - ADX: Measures trend strength (higher = stronger trend)
 * 
 * Signals:
 * - BUY: Price crosses above HMA + ADX > threshold (strong uptrend)
 * - SELL: Price crosses below HMA + ADX > threshold (strong downtrend)
 * 
 * Good for: Trending markets, medium-term position trades
 */
export class TrendFollowingStrategy extends BaseStrategy {
  private readonly hmaPeriod = this.params['hmaPeriod'] ?? 20;
  private readonly adxPeriod = this.params['adxPeriod'] ?? 14;
  private readonly adxThreshold = this.params['adxThreshold'] ?? 25; // Trend strength threshold
  private readonly rsiPeriod = this.params['rsiPeriod'] ?? 14;

  constructor(params: Record<string, number> = {}) {
    super('TREND_FOLLOWING', params);
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);
    const highs = series.points.map((p) => p.high ?? p.close);
    const lows = series.points.map((p) => p.low ?? p.close);

    if (closes.length < Math.max(this.hmaPeriod, this.adxPeriod) + 1) {
      return [];
    }

    const hmas = this.calculateHMA(closes, this.hmaPeriod);
    const { adx, plusDI, minusDI } = this.calculateADX(highs, lows, closes, this.adxPeriod);
    const rsis = this.calculateRSI(closes, this.rsiPeriod);

    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < closes.length; i++) {
      const point = series.points[i];
      const close = closes[i];
      const prevClose = closes[i - 1];
      const hma = hmas[i];
      const prevHMA = hmas[i - 1];
      const currADX = adx[i];
      const currPlusDI = plusDI[i];
      const currMinusDI = minusDI[i];
      const rsi = rsis[i];

      if (isNaN(hma) || isNaN(currADX)) continue;

      // BUY: Price crosses above HMA + ADX strong + not overbought
      const buyCross = prevClose <= prevHMA && close > hma;
      const trendingUp = currADX >= this.adxThreshold && currPlusDI > currMinusDI;
      const notOverbought = isNaN(rsi) || rsi < 80;

      if (buyCross && trendingUp && notOverbought) {
        // Strength: combination of ADX strength and crossover distance
        const adxStrength = Math.min(1, (currADX - this.adxThreshold) / 30); // 0 to 1
        const crossDistance = Math.min(1, Math.abs(close - hma) / (prevHMA || 1));
        const strength = Math.min(1, (adxStrength * 0.6 + crossDistance * 0.4));

        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: close,
          strength: Math.max(0.5, strength)
        });
      }

      // SELL: Price crosses below HMA + ADX strong + not oversold
      const sellCross = prevClose >= prevHMA && close < hma;
      const trendingDown = currADX >= this.adxThreshold && currMinusDI > currPlusDI;
      const notOversold = isNaN(rsi) || rsi > 20;

      if (sellCross && trendingDown && notOversold) {
        // Strength: combination of ADX strength and crossover distance
        const adxStrength = Math.min(1, (currADX - this.adxThreshold) / 30);
        const crossDistance = Math.min(1, Math.abs(close - hma) / (prevHMA || 1));
        const strength = Math.min(1, (adxStrength * 0.6 + crossDistance * 0.4));

        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: close,
          strength: Math.max(0.5, strength)
        });
      }
    }

    return signals;
  }

  /**
   * Hull Moving Average (faster response than SMA)
   */
  private calculateHMA(values: number[], period: number): number[] {
    const hmas: number[] = [];
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));

    // Calculate half-period and sqrt-period SMAs
    const halfSMA = this.calculateSMA(values, halfPeriod);
    const sqrtSMA = this.calculateSMA(values, sqrtPeriod);

    for (let i = 0; i < values.length; i++) {
      if (isNaN(halfSMA[i]) || isNaN(sqrtSMA[i])) {
        hmas.push(NaN);
      } else {
        // HMA = SMA(2 * SMA(n/2) - SMA(n), sqrt(n))
        const raw = 2 * halfSMA[i] - this.calculateSMA(values, period)[i];
        if (!isNaN(raw)) {
          hmas.push(raw);
        } else {
          hmas.push(NaN);
        }
      }
    }

    return hmas;
  }

  /**
   * Average Directional Index (measures trend strength)
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): { adx: number[]; plusDI: number[]; minusDI: number[] } {
    const adxValues: number[] = [];
    const plusDIValues: number[] = [];
    const minusDIValues: number[] = [];

    const trueRanges: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    // Calculate True Range, +DM, -DM
    for (let i = 0; i < highs.length; i++) {
      if (i === 0) {
        trueRanges.push(NaN);
        plusDMs.push(NaN);
        minusDMs.push(NaN);
      } else {
        const tr = Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1])
        );
        trueRanges.push(tr);

        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];

        let plusDM = 0;
        let minusDM = 0;

        if (upMove > downMove && upMove > 0) {
          plusDM = upMove;
        }
        if (downMove > upMove && downMove > 0) {
          minusDM = downMove;
        }

        plusDMs.push(plusDM);
        minusDMs.push(minusDM);
      }
    }

    // Calculate +DI, -DI, ADX
    for (let i = 0; i < trueRanges.length; i++) {
      if (i < period - 1) {
        adxValues.push(NaN);
        plusDIValues.push(NaN);
        minusDIValues.push(NaN);
      } else {
        // Sum for the period
        let sumTR = 0;
        let sumPlusDM = 0;
        let sumMinusDM = 0;

        for (let j = i - period + 1; j <= i; j++) {
          sumTR += trueRanges[j];
          sumPlusDM += plusDMs[j];
          sumMinusDM += minusDMs[j];
        }

        const plusDI = (sumPlusDM / sumTR) * 100;
        const minusDI = (sumMinusDM / sumTR) * 100;
        const diDiff = Math.abs(plusDI - minusDI);
        const diSum = plusDI + minusDI;

        const di = diSum === 0 ? 0 : (diDiff / diSum) * 100;

        // ADX is EMA of DI (simplified)
        let adx = di;
        if (i > period) {
          const prevADX = adxValues[i - 1];
          if (!isNaN(prevADX)) {
            const smoothing = 2 / (period + 1);
            adx = prevADX * (1 - smoothing) + di * smoothing;
          }
        }

        adxValues.push(adx);
        plusDIValues.push(plusDI);
        minusDIValues.push(minusDI);
      }
    }

    return { adx: adxValues, plusDI: plusDIValues, minusDI: minusDIValues };
  }
}
