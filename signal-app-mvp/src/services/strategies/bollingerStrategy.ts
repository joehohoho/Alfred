import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Bollinger Bands Strategy
 *
 * Signals:
 * - BUY: Price touches lower band (mean reversion) + momentum confirmation
 * - SELL: Price touches upper band + momentum confirmation
 *
 * Strength based on how far price penetrated the band
 */
export class BollingerStrategy extends BaseStrategy {
  private readonly period = this.params['period'] ?? 20;
  private readonly stdDevs = this.params['stdDevs'] ?? 2;
  private readonly rsiPeriod = this.params['rsiPeriod'] ?? 14;
  private readonly minRSI = this.params['minRSI'] ?? 30;
  private readonly maxRSI = this.params['maxRSI'] ?? 70;

  constructor(params: Record<string, number> = {}) {
    super('BOLLINGER_BANDS', params);
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);

    if (closes.length < this.period) {
      return [];
    }

    const { upper, lower, middle } = this.calculateBollingerBands(closes, this.period, this.stdDevs);
    const rsis = this.calculateRSI(closes, this.rsiPeriod);

    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < closes.length; i++) {
      const point = series.points[i];
      const close = closes[i];
      const prevClose = closes[i - 1];
      const lowerBand = lower[i];
      const middleBand = middle[i];
      const upperBand = upper[i];
      const rsi = rsis[i];

      if (isNaN(lowerBand) || isNaN(middleBand) || isNaN(upperBand)) continue;

      // BUY: Price touches/crosses below lower band + is not overbought + momentum building
      const touchesLower = prevClose > lowerBand && close <= lowerBand;
      const nearLower = close >= lowerBand && close < middleBand;

      if ((touchesLower || nearLower) && (isNaN(rsi) || rsi < this.maxRSI)) {
        // Strength: how deep below lower band (capped at 1.0)
        const penetration = Math.max(0, (lowerBand - close) / Math.max(Math.abs(lowerBand), 1));
        const strength = Math.min(1, 0.5 + penetration);
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: close,
          strength
        });
      }

      // SELL: Price touches/crosses above upper band + is not oversold + momentum deteriorating
      const touchesUpper = prevClose < upperBand && close >= upperBand;
      const nearUpper = close <= upperBand && close > middleBand;

      if ((touchesUpper || nearUpper) && (isNaN(rsi) || rsi > this.minRSI)) {
        // Strength: how high above upper band
        const penetration = Math.max(0, (close - upperBand) / Math.max(Math.abs(upperBand), 1));
        const strength = Math.min(1, 0.5 + penetration);
        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: close,
          strength
        });
      }

      // Mean reversion signals: price far from middle band
      // BUY if price below middle band moving up
      if (close < middleBand && prevClose <= close && close > (middle[i - 1] ?? middleBand)) {
        const distancePercent = (middleBand - close) / middleBand;
        const strength = Math.min(0.4, distancePercent); // Lower confidence
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: close,
          strength
        });
      }

      // SELL if price above middle band moving down
      if (close > middleBand && prevClose >= close && close < (middle[i - 1] ?? middleBand)) {
        const distancePercent = (close - middleBand) / middleBand;
        const strength = Math.min(0.4, distancePercent); // Lower confidence
        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: close,
          strength
        });
      }
    }

    return signals;
  }
}
